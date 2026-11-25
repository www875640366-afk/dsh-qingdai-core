// vector.js —— 嵌入与检索的向量层（siliconflow bge-m3，签名 api:BAAI/bge-m3 dim1024）。
//
// 【为什么向量不在写路径上】mem_write 只落词条（vectorPending:true），
//   向量由 flushPending() 按 vec_state 补算：402 / 网络挂 → 词条不丢，下次谁触发谁接着补。
//   memory-tiers 的血泪：写路径耦合云端 API，API 挂一次 graveyard 陪葬 554 条。
//
// 【签名】沿用 memory-tiers 的口径：embedSignature = 'api:BAAI/bge-m3'。
//   换模型 = 全部向量作废重算，meta 里记签名，不匹配就拒绝混用（VEC_STALE）。
//
// 存储：每库一张 vectors 表（id → BLOB float32），meta 存 sig/dim/count。

import { writeFileSync, renameSync, readFileSync } from 'node:fs'

export const DEFAULT_EMBED_MODEL = 'BAAI/bge-m3'
export const DEFAULT_RERANK_MODEL = 'BAAI/bge-reranker-v2-m3'
export const DEFAULT_BASE_URL = 'https://api.siliconflow.cn'
export const DEFAULT_EMBED_PATH = '/v1/embeddings'
export const DEFAULT_RERANK_PATH = '/v1/rerank'

/** 向量签名：换了嵌入模型，老向量就不在同一空间了，必须全库重算。 */
export const signatureOf = (model) => `api:${String(model || DEFAULT_EMBED_MODEL)}`
/** 老名字留给已有代码/测试。 */
export const EMBED_SIGNATURE = signatureOf(DEFAULT_EMBED_MODEL)
export const EMBED_DIM = 1024
const TEXT_SLICE = 512        // 超长文本截断再嵌入（memory-tiers 同款）
const BATCH = 32

/** meta 表读写（meta 在 db.js 的 SCHEMA 里，每库都有）。 */
export function readMeta(db) {
  const rows = db.prepare('SELECT key, value FROM meta').all()
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

function writeMeta(db, key, value) {
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, String(value))
}

/**
 * 打开库时核对签名：不匹配就清空 vectors 表（文件留着，词条不受影响）。
 * @returns {{stale:boolean, sig?:string}}
 */
export function checkSignature(db, want = EMBED_SIGNATURE) {
  const sig = readMeta(db).vec_sig ?? ''
  if (sig && sig !== want) {
    db.exec('DELETE FROM vectors')
    writeMeta(db, 'vec_sig', '')
    writeMeta(db, 'vec_count', '0')
    // 换了模型：所有词条作废重算（状态清回待补）
    try { db.exec('UPDATE memories SET vec_state = NULL, vec_attempts = 0') } catch { /* 老库没这列 */ }
    return { stale: true, sig }
  }
  return { stale: false, sig }
}

/** 调一次嵌入 API。返回 {ok, vectors}；失败给 reason（不抛，调用方自己决定重试）。 */
/** 地址或路径二选一：baseUrl 已经带了 /embeddings（或 /embed）就不再拼。 */
function endpointOf(baseUrl, path, tail) {
  const base = String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
  if (new RegExp(`/${tail}/?$`, 'i').test(base)) return base
  return base + (path || (tail === 'rerank' ? DEFAULT_RERANK_PATH : DEFAULT_EMBED_PATH))
}

export async function embedTexts(texts, { apiKey, baseUrl, model, path, fetchImpl, timeoutMs = 20_000, expectDim } = {}) {
  const key = String(apiKey ?? process.env.SILICONFLOW_KEY ?? process.env.SILICONFLOW_API_KEY ?? '').trim()
  if (!key) return { ok: false, reason: 'no-key' }
  const doFetch = fetchImpl ?? globalThis.fetch
  if (typeof doFetch !== 'function') return { ok: false, reason: 'no-fetch' }
  const url = endpointOf(baseUrl, path, 'embeddings|embed')
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const res = await doFetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: String(model || DEFAULT_EMBED_MODEL), input: texts.map((t) => String(t).slice(0, TEXT_SLICE)) }),
      signal: controller?.signal,
    })
    if (!res.ok) return { ok: false, reason: `http-${res.status}`, retriable: res.status === 429 || res.status === 402 }
    const data = await res.json()
    const list = data?.data
    if (!Array.isArray(list) || list.length !== texts.length) return { ok: false, reason: 'bad-shape' }
    const out = list.map((x) => Float32Array.from(x?.embedding ?? []))
    const dim = out[0]?.length ?? 0
    if (!dim) return { ok: false, reason: 'empty-vector' }
    if (out.some((x) => x.length !== dim)) return { ok: false, reason: 'dim-mismatch' }
    // 维度跟着模型走：库里记过旧维度就按旧的校验，换了模型会在这里被拦下
    if (expectDim && dim !== expectDim) return { ok: false, reason: 'dim-changed', dim }
    return { ok: true, vectors: out, dim }
  } catch (e) {
    return { ok: false, reason: e?.name === 'AbortError' ? 'timeout' : 'network' }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * 向量补算状态：要不要补是「查出来」的，不是「记下来」的。
 *
 *   vec_state     NULL / 'pending' 待补 · 'synced' 已补 · 'failed' 试满次数放弃
 *   vec_attempts  连续失败次数，到上限标 failed，免得一条坏数据把后面的堵死
 *
 * 【为什么不用队列】队列要记「哪几条缺」，那就得管上限、管重启、管对账。
 * 【为什么不用 id 水位】水位押在「id 顺序就是处理顺序」上，撤销替代会把老 id
 *   复活回来，水位一越过就永远补不到它。状态跟着行走，跟顺序无关。
 */
const VEC_PENDING_SQL = `vec_state IS NULL OR (vec_state <> 'synced' AND vec_state <> 'failed')`

/** 还有几条待人补（面板 / 日志用）。 */
export function pendingVectorCount(db) {
  try {
    return Number(db.prepare(
      `SELECT COUNT(*) AS n FROM memories WHERE superseded = 0 AND (${VEC_PENDING_SQL})`,
    ).get()?.n ?? 0)
  } catch { return 0 }
}

/**
 * 从待补里捞一批补上。
 * 成功 → synced；失败 → attempts+1，满了标 failed 不再重试。
 * @returns {{ok:boolean, done:number, failed:number, reason?:string}}
 */
export async function flushPending(db, opts = {}) {
  const batch = Math.max(1, Math.min(64, Number(opts.batch) || BATCH))
  const maxAttempts = Number.isInteger(opts.maxAttempts) ? opts.maxAttempts : 3

  const rows = db.prepare(
    `SELECT id, text FROM memories
     WHERE superseded = 0
       AND (${VEC_PENDING_SQL})
       AND COALESCE(vec_attempts, 0) < ?
     ORDER BY id ASC LIMIT ?`,
  ).all(maxAttempts, batch)
  // 换了嵌入模型：老向量跟新模型不在同一空间，混着用会搜出错东西。
  // 每次补算都核对签名，对不上就清空重来（下次触发从头补）。
  const wantSig = String(opts.signature || signatureOf(opts.model))
  const curSig = readMeta(db).vec_sig ?? ''
  if (curSig && curSig !== wantSig) {
    try {
      db.exec('DELETE FROM vectors')
      db.exec('UPDATE memories SET vec_state = NULL, vec_attempts = 0')
      writeMeta(db, 'vec_sig', '')
      writeMeta(db, 'vec_count', '0')
      writeMeta(db, 'vec_dim', '')
    } catch { /* 清不动下次再试 */ }
    return { ok: false, done: 0, failed: 0, reason: `换了嵌入模型（${curSig} → ${wantSig}），已清空待重算` }
  }

  if (!rows.length) return { ok: true, done: 0, failed: 0 }

  // 库里记过维度就按它校验：换了嵌入模型（维度不同）会被 embedTexts 拦成 dim-changed
  const knownDim = Number(readMeta(db).vec_dim) || 0
  const res = await embedTexts(rows.map((r) => r.text), { ...opts, expectDim: knownDim || undefined })
  if (!res.ok) {
    // 维度变了：说明换了模型，老向量空间作废，清空重算（这次不算失败，下次从头补）
    if (res.reason === 'dim-changed') {
      try {
        db.exec('DELETE FROM vectors')
        db.exec('UPDATE memories SET vec_state = NULL, vec_attempts = 0')
        writeMeta(db, 'vec_sig', '')
        writeMeta(db, 'vec_count', '0')
        writeMeta(db, 'vec_dim', String(res.dim ?? ''))
      } catch { /* 清不动就下次再试 */ }
      return { ok: false, done: 0, failed: 0, reason: `维度变了（${knownDim} → ${res.dim}），已清空待重算` }
    }
    bumpAttempts(db, rows.map((r) => r.id), maxAttempts)
    return { ok: false, done: 0, failed: rows.length, reason: res.reason }
  }

  const upVec = db.prepare('INSERT OR REPLACE INTO vectors (id, vec) VALUES (?, ?)')
  const markOk = db.prepare("UPDATE memories SET vec_state = 'synced', vec_attempts = 0 WHERE id = ?")
  db.exec('BEGIN IMMEDIATE')
  try {
    for (let i = 0; i < rows.length; i++) upVec.run(rows[i].id, Buffer.from(res.vectors[i].buffer))
    for (const r of rows) markOk.run(r.id)
    db.exec('COMMIT')
  } catch (e) {
    try { db.exec('ROLLBACK') } catch { /* 同上 */ }
    return { ok: false, done: 0, failed: rows.length, reason: String(e?.message ?? e) }
  }
  writeMeta(db, 'vec_sig', String(opts.signature || signatureOf(opts.model)))
  writeMeta(db, 'vec_count', String(db.prepare('SELECT COUNT(*) AS n FROM vectors').get().n))
  if (res.dim) writeMeta(db, 'vec_dim', String(res.dim))
  return { ok: true, done: rows.length, failed: 0 }
}

/** 记一次失败；到上限就标 failed，别让它一直占着队头。 */
function bumpAttempts(db, ids, maxAttempts) {
  try {
    const bump = db.prepare(
      `UPDATE memories
          SET vec_attempts = COALESCE(vec_attempts, 0) + 1,
              vec_state = CASE WHEN COALESCE(vec_attempts, 0) + 1 >= ? THEN 'failed' ELSE NULL END
        WHERE id = ?`,
    )
    for (const id of ids) bump.run(maxAttempts, id)
  } catch { /* 记不上就算了，下次还会重试 */ }
}


/** 全部向量读进内存：Map(id → Float32Array)。千级条目全量载入没问题。 */
export function loadVectors(db) {
  const out = new Map()
  for (const row of db.prepare('SELECT id, vec FROM vectors').all()) {
    try {
      const buf = Buffer.from(row.vec)
      out.set(String(row.id), new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4))
    } catch { /* 单条坏了不连累别人 */ }
  }
  return out
}

/** 余弦相似度（0-1 语义层用）。 */
export function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (!na || !nb) return 0
  return dot / Math.sqrt(na * nb)
}

/**
 * 精排：rerank API。失败返回 null（调用方退回粗排分，memory-tiers 同款）。
 */
export async function rerank(query, docs, { apiKey, baseUrl, model, path, fetchImpl, timeoutMs = 20_000 } = {}) {
  const key = String(apiKey ?? process.env.SILICONFLOW_KEY ?? process.env.SILICONFLOW_API_KEY ?? '').trim()
  if (!key) return null
  const doFetch = fetchImpl ?? globalThis.fetch
  if (typeof doFetch !== 'function') return null
  const url = endpointOf(baseUrl, path, 'rerank')
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const res = await doFetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: String(model || DEFAULT_RERANK_MODEL), query: String(query), documents: docs }),
      signal: controller?.signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data?.results ?? []).map((x) => ({ index: Number(x.index), score: Number(x.relevance_score) }))
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** 导出留底/迁移用：整库向量备份成 JSON（id → base64）。 */
export function dumpVectors(db, file) {
  const out = {}
  for (const row of db.prepare('SELECT id, vec FROM vectors').all()) {
    out[String(row.id)] = Buffer.from(row.vec).toString('base64')
  }
  const tmp = file + '.tmp'
  writeFileSync(tmp, JSON.stringify({ sig: EMBED_SIGNATURE, dim: EMBED_DIM, count: Object.keys(out).length, vectors: out }), 'utf8')
  renameSync(tmp, file)
  return { ok: true, count: Object.keys(out).length, file }
}

/** 从 JSON 备份恢复（迁移/回滚用）。签名不匹配拒绝。 */
export function restoreVectors(db, file) {
  let data
  try { data = JSON.parse(readFileSync(file, 'utf8')) } catch (e) { return { ok: false, reason: String(e?.message ?? e) } }
  if (data?.sig !== EMBED_SIGNATURE) return { ok: false, reason: `VEC_STALE ${data?.sig} → ${EMBED_SIGNATURE}` }
  if (Number(data?.dim) !== EMBED_DIM) return { ok: false, reason: `dim 不匹配：${data?.dim} → ${EMBED_DIM}` }
  const up = db.prepare('INSERT OR REPLACE INTO vectors (id, vec) VALUES (?, ?)')
  db.exec('BEGIN IMMEDIATE')
  try {
    for (const [id, b64] of Object.entries(data.vectors ?? {})) {
      const buf = Buffer.from(String(b64), 'base64')
      if (buf.length === EMBED_DIM * 4) up.run(Number(id), buf)
    }
    db.exec('COMMIT')
  } catch (e) {
    try { db.exec('ROLLBACK') } catch { /* 同上 */ }
    return { ok: false, reason: String(e?.message ?? e) }
  }
  writeMeta(db, 'vec_sig', EMBED_SIGNATURE)
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM vectors').get()
  writeMeta(db, 'vec_count', String(n))
  return { ok: true, count: Number(n) }
}
