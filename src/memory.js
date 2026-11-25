// memory.js —— 记忆读写：mem_write / mem_search 的纯逻辑（不碰宿主）。
//
// 写：sniffSecret → 重要度分档（0.9 自动 pin）→ 落库。向量不在写路径上
//     （异步补算挂在外层），402 失败不丢词条。
// 查：词面覆盖 + 余弦相似 + 时间/重要度加权 → 精排可选 → 命中即 touchHeat。
//     embed 挂了自动降级纯关键词（memory-tiers 实测可用），留底表永远兜底。

import { sniffSecret } from './secrets.js'
import { touch, keepOf, halfLifeOf, sweepLifecycle, CURVE } from './heat.js'
import { findDuplicates } from './dup.js'
import { withTransaction } from './db.js'

/** 检索参数：每库一张表覆盖默认值（生活放宽、工作收紧）。 */
export const SEARCH_DEFAULTS = Object.freeze({
  limit: 6,             // 输出上限（memory-tiers semanticExtra 跑过的值）
  minSem: 0.58,         // 语义闸：bge-m3 实测相关 ≥0.62 / 无关 ≤0.52，取中间偏保守
  minCoverage: 0.3,     // 词面闸（无向量时唯一闸）：关键词命中三成以上
  minScore: 0.55,       // 综合分兜底闸
  wSem: 0.55,           // 语义相似权重
  wCov: 0.20,           // 词面覆盖权重（替代稀疏向量）
  wRecency: 0.10,       // 新近度
  wImp: 0.08,           // 重要度
  wPinned: 0.05,        // pin 加成
  wKeep: 0.05,          // 留存率加成：快忘的排后面，让新的先上
})

/** 写一条记忆。返回结构化结果，render 在工具层拼。
 *
 * @param {object} db
 * @param {object} args  text / importance / force / supersedes
 * @param {{now?:number, anchor?:{sid:string,fromTs:number,toTs:number}|null}} opts
 *   anchor 由调用方机械填（会话 id + 这一轮的起止时间），模型碰不到。
 */
/** 来源类型归一：只有三种，别的都按「你说的」算。 */
function normalizeFrom(v) {
  const s = String(v ?? '').toLowerCase()
  if (s === 'user' || s === 'said' || s === 'explicit') return 'user'
  if (s === 'self' || s === 'agent' || s === 'inferred') return 'self'
  if (s === 'env' || s === 'environment' || s === 'observed') return 'env'
  // 认不出来就记「不明」。宁可是空白，也别替他编一句没说过的话。
  return 'unknown'
}

export function memWrite(db, args = {}, { now = Date.now(), anchor = null } = {}) {
  const text = String(args.text ?? '').trim()
  if (!text) return { ok: false, reason: 'text 不能为空' }
  if (text.length > 2000) return { ok: false, reason: '太长了（上限 2000 字）——长内容该进文件夹或留底表' }

  const secret = sniffSecret(text)
  if (secret.verdict === 'hard') return { ok: false, reason: '内容含明确的密钥，拒绝写入' }
  if (secret.verdict === 'soft' && args.force !== true) {
    return { ok: false, needsConfirm: true, reason: '疑似密钥：请先问主人，同意后带 force:true 重发' }
  }

  // 查重：撞了就返回已有的，让调用方决定（force 强制写 / supersedes 替代旧的）
  if (args.force !== true) {
    const dups = findDuplicates(db, text)
    if (dups.length) {
      const reason = `已经记过了（${dups[0].by === 'entity' ? '同名实体' : `字面相似 ${dups[0].score.toFixed(2)}`}）。`
        + '同一件事不用重写；情况变了要更新，就带 supersedes:[旧 id] 写新的一条。'
      // 拦下来这件事本身要留痕：模型自己 force 重发就绕过去了，人得知道它被拦过。
      const pendingId = recordConflict(db, {
        text, importance: clampImportance(args.importance), against: dups[0], reason, at: now,
      })
      return {
        ok: false,
        duplicate: true,
        existing: dups,
        pendingId,
        reason,
      }
    }
  }

  const importance = clampImportance(args.importance)
  // 一律不自动钉。核心档是人工裁决的结果——模型只能提请求，进待办等人点头。
  // （旧版是 importance >= 0.9 直接 pinned，等于把「永不遗忘」交给模型打分。）
  const pinned = 0
  const pinRequest = args.requestPin === true
    ? String(args.pinReason ?? '模型请求钉住这条').trim().slice(0, 200) || '模型请求钉住这条'
    : null
  // 来源类型：你亲口说的 / 我自己归纳的 / 环境里看到的。模型不传就当是你说过的。
  const from = normalizeFrom(args.from)
  const sources = anchor ? JSON.stringify({ ...anchor, from }) : JSON.stringify({ from })

  const superseded = []
  const info = withTransaction(db, () => {
    // 先写新的，拿到 id，才能让被替代的旧条记得「被谁替了」（面板做新旧对照要用）。
    const res = db.prepare(
      `INSERT INTO memories (text, importance, pinned, pinRequest, pinRequestAt,
                             heat, repeatStrength, createdAt, lastMentionedAt, lastTouchedAt, sources)
       VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?)`,
    ).run(text, importance, pinned, pinRequest, pinRequest ? now : null, now, now, now, sources)
    const newId = Number(res.lastInsertRowid)
    for (const raw of normalizeIds(args.supersedes)) {
      const old = db.prepare('SELECT id FROM memories WHERE id = ? AND superseded = 0').get(raw)
      if (!old) continue
      db.prepare('UPDATE memories SET superseded = 1, supersededBy = ? WHERE id = ?').run(newId, raw)
      superseded.push(raw)
    }
    return res
  })
  return {
    ok: true,
    id: Number(info.lastInsertRowid),
    importance,
    pinned,
    pinRequest: Boolean(pinRequest),
    superseded,
    vectorPending: true,
  }
}

/**
 * 查记忆。queryVec 缺省 null → 纯关键词降级。
 * vectors: Map(id → Float32Array)；cosine 由外层注入。
 *
 * 【这里不记账】检索只是「候选」。命中不等于被用上——被注入闸门挡掉的那些
 * 一个字都没进上下文。要等调用方确认真的用了（搜索被模型采用 / 注入真落地），
 * 再调 markUsed 记账。
 */
export function memSearch(db, args = {}, { now = Date.now(), vectors = null, cosine = null, queryVec = null, cfg = SEARCH_DEFAULTS } = {}) {
  const query = String(args.query ?? '').trim()
  if (!query) return { ok: false, reason: 'query 不能为空' }
  // 调用方传的条数优先：注入要 3 条、工具要 limit*2 给精排当候选。
  // 以前这里只认 cfg.limit（默认 6），所以面板和注入调的条数全是空的。
  const limit = Math.max(1, Math.min(50, Number(args.limit) || Number(cfg.limit) || 6))

  const pool = db.prepare(
    `SELECT id, text, importance, pinned, accessCount, createdAt, lastTouchedAt,
            lastMentionedAt, sources
     FROM memories WHERE superseded = 0`,
  ).all()
  if (!pool.length) return { ok: true, hits: [], text: '库里还没有记忆。' }

  const keywords = keywordsOf(query)
  const qVec = queryVec && cosine ? queryVec : null
  const scored = []
  for (const it of pool) {
    const cov = coverageOf(query, keywords, it.text)
    const v = vectors ? vectors.get(String(it.id)) : null
    const sem = qVec && v ? cosine(qVec, v) : 0
    // 双闸：语义够近，或关键词命中够多。两个都不够 → 宁可空也不给不相关的结果。
    if (!(sem >= cfg.minSem || cov >= cfg.minCoverage)) continue

    const ageDay = Math.max(0, (now - (Number(it.lastTouchedAt) || Number(it.lastMentionedAt) || Number(it.createdAt) || now)) / 86_400_000)
    const recency = Math.max(0, 1 - ageDay / 180)
    const imp = Number(it.importance) || 0.3
    const keep = keepOf(it, now)
    const score = (qVec ? cfg.wSem * sem : cfg.wCov * cov * 2.5)   // 无向量时词面权重放大
      + cfg.wCov * cov
      + cfg.wRecency * recency
      + cfg.wImp * imp
      + (Number(it.pinned) ? cfg.wPinned : 0)
      + cfg.wKeep * keep
    scored.push({ it, score, sem, cov })
  }
  scored.sort((a, b) => b.score - a.score)
  const hits = scored.slice(0, limit).filter((x) => x.score >= cfg.minScore)

  return {
    ok: true,
    hits: hits.map((h) => ({
      id: h.it.id,
      text: h.it.text,
      importance: h.it.importance,
      pinned: Boolean(h.it.pinned),
      when: new Date(Number(h.it.createdAt)).toISOString().slice(0, 10),
      sources: h.it.sources,
      score: Number(h.score.toFixed(3)),
      degraded: !qVec,   // true = 这次是纯关键词降级结果
    })),
    text: hits.length ? undefined : '没有命中的旧记忆。',
  }
}

/**
 * 记一次「被想起」——只有真的到了眼前才算。
 *
 * @param {object} db
 * @param {number[]} ids 真被用上的记忆 id
 * @param {{now?:number, via?:'search'|'inject'}} opts
 *   via=search 模型主动搜到的；via=inject 自动召回过了闸门真注进去的
 * @returns {number} 实际记了几条
 */
/**
 * 最近被自动带进上下文的记忆：注入是「不请自来」，得让人能回头看它带了什么。
 * 只读 lastInjectedAt，跟搜索（lastSearchedAt）分开。
 */
export function recentInjected(db, { limit = 10 } = {}) {
  const n = Math.max(1, Math.min(50, Number(limit) || 10))
  return db.prepare(
    `SELECT id, text, importance, lastInjectedAt FROM memories
     WHERE superseded = 0 AND lastInjectedAt IS NOT NULL
     ORDER BY lastInjectedAt DESC LIMIT ?`,
  ).all(n).map((r) => ({
    id: Number(r.id),
    text: String(r.text ?? ''),
    importance: Number(r.importance) || 0.3,
    at: Number(r.lastInjectedAt) || 0,
  }))
}

/**
 * 最近一次注入带了几条：dock 上显示「记忆 · 3条注入」。
 * 用时间窗近似「这一轮」——注入是每轮主人开口时跑的，3 分钟内最多一波。
 */
export function countInjectedSince(db, since) {
  const t = Number(since) || 0
  const r = db.prepare(
    'SELECT COUNT(*) AS n FROM memories WHERE superseded = 0 AND lastInjectedAt >= ?',
  ).get(t)
  return Number(r?.n) || 0
}

/**
 * 最后一次注入：一批注入共用同一个时间戳，所以「同时间戳的条数」就是那轮带了几条。
 * dock 用它判断「这一轮有没有注入」——时间戳变了才亮，没变就暗着。
 */
export function lastInjectBatch(db) {
  const r = db.prepare(
    `SELECT lastInjectedAt AS at, COUNT(*) AS n FROM memories
     WHERE superseded = 0 AND lastInjectedAt IS NOT NULL
     GROUP BY lastInjectedAt ORDER BY lastInjectedAt DESC LIMIT 1`,
  ).get()
  return { at: Number(r?.at) || 0, n: Number(r?.n) || 0 }
}

export function markUsed(db, ids, { now = Date.now(), via = 'search' } = {}) {
  const clean = [...new Set((Array.isArray(ids) ? ids : [ids])
    .map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0))]
  if (!clean.length) return 0
  // 这两列必须取出来：UPDATE 是整行覆盖式的，取不到就会把上一次
  // 「搜索记的时间」和「注入记的时间」互相抹成 NULL——面板的注入数会因此归零。
  const get = db.prepare(
    `SELECT id, accessCount, createdAt, lastTouchedAt, lastMentionedAt, lastSearchedAt, lastInjectedAt
     FROM memories WHERE id = ? AND superseded = 0`,
  )
  const put = db.prepare(
    `UPDATE memories SET lastTouchedAt = ?, lastMentionedAt = ?, lastSearchedAt = ?, lastInjectedAt = ?,
                         accessCount = ? WHERE id = ?`,
  )
  let n = 0
  for (const id of clean) {
    const row = get.get(id)
    if (!row) continue
    const it = { ...row }
    touch(it, now, { via })
    put.run(it.lastTouchedAt, it.lastMentionedAt, it.lastSearchedAt ?? null, it.lastInjectedAt ?? null, it.accessCount, id)
    n++
  }
  return n
}

/**
 * 面板恢复：graveyard → memories。
 *
 * 【捡回来不满血】只回到 50% 留存率（相当于「半辈子以前想起过」）。
 * 一条被曲线淘汰、又没人钉住的记忆，本来就不是什么要紧事——捡回来多半是补漏，
 * 不该拿一份完整寿命。满血的话，删了捡、捡了删可以无限续命，台账就白设了。
 *
 * 50% 折算成时间就是「距上次想起 ln2 个半衰期」：
 *   普通档 96 天半衰期 → 捡回来还剩 49 天
 *   0.9 档 168 天半衰期 → 捡回来还剩 86 天
 */
/**
 * 从台账恢复一条。
 *
 * 整段包在事务里：插 memories、删台账、标向量待补三步要么全成要么全不成。
 * 不包的话中途抛错会留下「台账还在 + 活跃池已插入」，再点一次恢复就多一条重复记忆。
 */
export function restoreFromGraveyard(db, graveyardId, { now = Date.now(), at = 0.5 } = {}) {
  return withTransaction(db, () => restoreFromGraveyardInner(db, graveyardId, { now, at }))
}

function restoreFromGraveyardInner(db, graveyardId, { now, at }) {
  const n = Number(graveyardId)
  let row = db.prepare('SELECT * FROM graveyard WHERE id = ?').get(n)
  if (!row) {
    // 面板上的「撤销」给的是原记忆 id，不是台账 id：退一步按 originalId 找最新那条
    row = db.prepare('SELECT * FROM graveyard WHERE originalId = ? ORDER BY at DESC LIMIT 1').get(n)
  }
  if (!row) return { ok: false, reason: '台账里没有这条' }

  // 有整行快照就原样放回去：分数、钉住、时间戳都不打折。
  // 「捡回来不等于满血复活」那套只用于没有快照的老台账记录。
  if (row.snapshot) {
    let snap = null
    try { snap = JSON.parse(String(row.snapshot)) } catch { snap = null }
    if (snap && typeof snap === 'object') {
      const cols = db.prepare("PRAGMA table_info('memories')").all().map((c) => c.name)
      // id 也带回去：撤销后 id 不变，卡片上「再删一次」才找得到这条
      // （AUTOINCREMENT 不复用号，删掉的号空着，插回去不会撞）
      const keep = Object.keys(snap).filter((k) => cols.includes(k))
      const sql = `INSERT INTO memories (${keep.join(', ')}) VALUES (${keep.map(() => '?').join(', ')})`
      let info
      try {
        info = db.prepare(sql).run(...keep.map((k) => snap[k] ?? null))
      } catch (e) {
        // 万一原号被占了，退回不指定 id 插
        const without = keep.filter((k) => k !== 'id')
        info = db.prepare(`INSERT INTO memories (${without.join(', ')}) VALUES (${without.map(() => '?').join(', ')})`)
          .run(...without.map((k) => snap[k] ?? null))
      }
      db.prepare('DELETE FROM graveyard WHERE id = ?').run(row.id)
      // 老向量删掉了，标成待补：恢复不该让检索永远漏掉它
      try { db.prepare('UPDATE memories SET vec_state = NULL, vec_attempts = 0 WHERE id = ?').run(Number(info.lastInsertRowid)) } catch { /* 没这列就算了 */ }
      return { ok: true, id: Number(info.lastInsertRowid), restored: true }
    }
  }

  const imp = Number(row.importance) || 0.3
  // 台账里没存 accessCount，按「没被想起过」算半衰期——本来就该偏保守
  const half = halfLifeOf({ importance: imp, accessCount: 0 })
  const back = Math.min(1, Math.max(0.31, Number(at) || 0.5))
  const idle = -Math.log(back)          // at=0.5 → ln2
  const touchedAt = Math.round(now - idle * half * 86_400_000)
  const tx = db.prepare(
    `INSERT INTO memories (text, importance, pinned, heat, repeatStrength, createdAt,
                           lastMentionedAt, lastTouchedAt, cold, sources)
     VALUES (?, ?, 0, 1, 1, ?, ?, ?, 0, ?)`,
  )
  // createdAt 保原始（它还是一条旧事），使用时间往回推——捡回来不等于满血复活。
  const info = tx.run(row.text, imp, Number(row.at) || now, touchedAt, touchedAt, null)
  db.prepare('DELETE FROM graveyard WHERE id = ?').run(row.id)
  return { ok: true, id: Number(info.lastInsertRowid), keep: back }
}

/**
 * 记一条待审冲突。同一条新文本撞同一条旧记忆只留一条待审，免得模型重试几次就刷屏。
 * 表不存在（老库还没迁）时静默放过——记录冲突失败不能让正常写入也失败。
 */
function recordConflict(db, { text, importance, against, reason, at }) {
  try {
    const againstId = against?.id == null ? null : Number(against.id)
    const dup = db.prepare(
      "SELECT id FROM conflicts WHERE state = 'open' AND againstId IS ? AND text = ?",
    ).get(againstId, text)
    if (dup) return Number(dup.id)
    const r = db.prepare(
      `INSERT INTO conflicts (text, importance, againstId, against, reason, at, state)
       VALUES (?, ?, ?, ?, ?, ?, 'open')`,
    ).run(text, Number.isFinite(Number(importance)) ? Number(importance) : 0.6, againstId, String(against?.text ?? ''), reason, at)
    return Number(r.lastInsertRowid)
  } catch {
    return null
  }
}

/** 待审清单（state='open' 的）。 */
export function openConflicts(db, { limit = 50 } = {}) {
  try {
    return db.prepare(
      `SELECT c.id, c.text, c.importance, c.againstId, c.against, c.reason, c.at,
              m.id AS liveId, m.text AS liveText, m.superseded AS liveSuperseded
       FROM conflicts c
       LEFT JOIN memories m ON m.id = c.againstId
       WHERE c.state = 'open'
       ORDER BY c.at DESC LIMIT ?`,
    ).all(Math.max(1, Math.min(200, Number(limit) || 50))).map((r) => ({
      id: Number(r.id),
      text: String(r.text ?? ''),
      importance: Number(r.importance) || 0.6,
      againstId: r.againstId == null ? null : Number(r.againstId),
      // 旧条还在就取实时的，不在了（被替代/删了）退回快照
      againstText: r.liveText != null && !Number(r.liveSuperseded) ? String(r.liveText) : String(r.against ?? ''),
      againstGone: r.liveId == null || Boolean(Number(r.liveSuperseded)),
      reason: String(r.reason ?? ''),
      at: Number(r.at) || 0,
    }))
  } catch {
    return []
  }
}

/**
 * 处理一条待审冲突。
 *   replace 用这条替代旧的那条（旧的进「已被替代」，面板还能撤销）
 *   keep    两条都留（旧的不动，新的照写）
 *   drop    算了，不写
 *
 * 走 force 写：这条本来就是被查重拦下来的，再查一遍还是会被拦。
 */
export function resolveConflict(db, { id, action, now = Date.now() } = {}) {
  let row
  try {
    row = db.prepare('SELECT id, text, importance, againstId, state FROM conflicts WHERE id = ?').get(Number(id))
  } catch { return { ok: false, reason: '库还没迁到这一版' } }
  if (!row) return { ok: false, reason: '没有这条待审' }
  if (row.state !== 'open') return { ok: false, reason: '这条已经处理过了' }

  if (action === 'drop') {
    db.prepare("UPDATE conflicts SET state = 'dropped' WHERE id = ?").run(Number(row.id))
    return { ok: true, dropped: true }
  }
  if (action !== 'replace' && action !== 'keep') return { ok: false, reason: '不认识的处理方式' }

  const supersedes = action === 'replace' && row.againstId != null ? [Number(row.againstId)] : []
  const wrote = memWrite(db, {
    text: row.text,
    importance: Number(row.importance) || 0.6,
    force: true,
    supersedes,
  }, { now })
  if (!wrote.ok) return { ok: false, reason: wrote.reason }

  // 同一条旧记忆可能被撞过好几次：余下没处理的待审一并结掉，不然它们会一直挂在面板上
  if (row.againstId != null) {
    db.prepare(
      "UPDATE conflicts SET state = 'resolved' WHERE state = 'open' AND againstId = ?",
    ).run(Number(row.againstId))
  }
  db.prepare("UPDATE conflicts SET state = 'resolved' WHERE id = ?").run(Number(row.id))
  return { ok: true, id: wrote.id, superseded: wrote.superseded, action }
}

/**
 * 手动删一条：搬进台账（软删，随时能捡回来），连向量一起清掉。
 * 不是物理删除——陪伴场景删记忆是雷区，台账就是兜底。
 */
export function forgetMemory(db, id, { now = Date.now(), reason = '\u624b\u52a8\u5220\u9664' } = {}) {
  const row = db.prepare('SELECT * FROM memories WHERE id = ?').get(Number(id))
  if (!row) return { ok: false, reason: '\u5e93\u91cc\u6ca1\u6709\u8fd9\u6761' }
  // 整行存一份：撤销要原样放回去，不能把分数和新鲜度打回默认值
  const snapshot = JSON.stringify(row)
  return withTransaction(db, () => {
    db.prepare(
      'INSERT INTO graveyard (originalId, text, importance, heat, reason, at, snapshot) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(Number(row.id), row.text, row.importance, Number(row.heat) || 0, reason, now, snapshot)
    db.prepare('DELETE FROM vectors WHERE id = ?').run(Number(row.id))
    db.prepare('DELETE FROM memories WHERE id = ?').run(Number(row.id))
    return { ok: true, id: Number(row.id) }
  })
}

/** 面板撤销替代：把一条被替代的记忆放回活跃池，并把替代它的那条重新压下去。 */
export function unsupersede(db, id) {
  const row = db.prepare('SELECT id, superseded, supersededBy FROM memories WHERE id = ?').get(Number(id))
  if (!row) return { ok: false, reason: '库里没有这条' }
  if (!Number(row.superseded)) return { ok: false, reason: '这条没被替代' }
  return withTransaction(db, () => {
    // 双向：旧的回来，替它的那条走。不然两条同时活着，又变成「同一件事两份」。
    const keeper = row.supersededBy == null ? null : Number(row.supersededBy)
    db.prepare('UPDATE memories SET superseded = 0, supersededBy = NULL WHERE id = ?').run(Number(row.id))
    if (keeper && keeper !== Number(row.id)) {
      db.prepare('UPDATE memories SET superseded = 1 WHERE id = ? AND superseded = 0').run(keeper)
    }
    return { ok: true, id: Number(row.id), replacedBack: keeper }
  })
}

/**
 * 台账清理：进最近删除满 graveyardDays 天还没被捡走，就真的删掉。
 *
 * 【为什么要有到期】台账不是仓库。只进不出的回收站会一直涨，而且越积越多
 * 就没人在里面找了。留 14 天是给手滑留的反悔窗口，够长了。
 *
 * 【删了还能找回来吗】记忆节点没了，但原始对话在 events 留底表里**永不删**，
 * raw_memory 还能按关键词/seq 翻出当时的原话。所以这是「忘了」，不是「没了」。
 *
 * @returns {number} 这次清掉几条
 */
export function purgeGraveyard(db, now = Date.now()) {
  const cutoff = now - (CURVE.graveyardDays ?? 14) * 86_400_000
  try {
    const r = db.prepare('DELETE FROM graveyard WHERE at < ?').run(cutoff)
    return Number(r.changes) || 0
  } catch {
    return 0
  }
}

/** 收工扫一遍生命周期（开关机时调，不用定时器）。 */
/**
 * 清一轮：过线的搬进台账，台账里到期的真删。
 *
 * 包在事务里——sweepLifecycle 内部一条记忆要 bury → dropVec → del 三步，
 * 中途失败会留下「已 bury 但没进台账」，软删只进一次台账的保证就破了。
 */
export function sweep(db, now = Date.now()) {
  return withTransaction(db, () => {
    const out = sweepLifecycle(db, now)
    out.purged = purgeGraveyard(db, now)
    return out
  })
}
function clampImportance(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0.6
  return Math.min(1, Math.max(0, Math.round(n * 10) / 10))
}

/** 旧条替代清单：只收正整数 id，去重，最多 8 个（防一次拖垮一堆）。 */
function normalizeIds(v) {
  if (v == null) return []
  const arr = Array.isArray(v) ? v : [v]
  const clean = arr.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0)
  return [...new Set(clean)].slice(0, 8)
}

const STOPWORDS = new Set(`
的 了 是 在 我 你 他 她 它 和 与 就 也 都 而 及 或 还 要 会 能 可以
这 那 这个 那个 这些 那些 这样 那样 什么 怎么 为什么 哪里 哪些 哪个
我们 你们 他们 自己 一个 一种 一样 时候 东西 事情 地方
记得 知道 觉得 想 说 看 听 来 去 上 下 里 外 前 后
今天 昨天 明天 现在 最近 刚才 一会 一下 一点 一些
好像 是不是 有关于 关于 因为 所以 但是 不过 然后 如果 虽然
到底 真的 其实 就是 还是 只是 那么 这么 应该 需要 想要 看看
有没有 没有 不是 而且 已经 曾经 呢 吗 吧 啊 呀 哦 嘛 啦
`.split(/\s+/).filter(Boolean))

/** 分词 + 停用词过滤（锚词规则的底座：口水词永远不当锚）。 */
/** 中文无空格，滑窗切词（v2 retrieval.js 同思路：碎片 IDF 低带不偏）。 */
export function keywordsOf(query) {
  const out = new Set()
  for (const chunk of String(query ?? '').split(/[\s,，。；;！!？?、]+/)) {
    const raw = chunk.trim().toLowerCase()
    if (!raw) continue
    if (/^[a-z0-9_-]+$/i.test(raw)) {
      if (raw.length >= 2 && !STOPWORDS.has(raw)) out.add(raw)   // 西文整词
      continue
    }
    // 中文：先把整词级停用词剥掉（记忆/今天/好像…），再对剩下的段滑窗
    const stripped = stripStopwords(raw)
    for (let n = 4; n >= 2; n--) {
      for (let i = 0; i + n <= stripped.length; i++) {
        const w = stripped.slice(i, i + n)
        if (STOPWORDS.has(w)) continue
        if (/[\u4e00-\u9fff]/.test(w)) out.add(w)
      }
    }
  }
  return out
}

/** 把已知的整词停用词从串里剔除（按出现顺序贪婪匹配）。 */
function stripStopwords(s) {
  const words = [...STOPWORDS].filter((w) => w.length >= 2).sort((a, b) => b.length - a.length)
  let out = s
  for (const w of words) out = out.split(w).join(' ')
  return out
}

/** 词面覆盖：命中的关键词覆盖了查询里多少「实字」（字符级，比 n-gram 计数准）。 */
function coverageOf(query, keywords, text) {
  const hay = String(text ?? '').toLowerCase()
  const q = String(query ?? '').toLowerCase()
  if (!q) return 0
  const mark = new Array(q.length).fill(false)
  for (const k of keywords) {
    if (!k || !hay.includes(k)) continue
    let idx = q.indexOf(k)
    while (idx >= 0) {
      for (let i = idx; i < idx + k.length; i++) mark[i] = true
      idx = q.indexOf(k, idx + 1)
    }
  }
  // 分母只算实字：跳过空白/标点/单字虚词，避免口水词稀释
  const SKIP = new Set('的了是在我你他她它和与就也都而及或还要会能可以这那')
  let denom = 0
  let num = 0
  for (let i = 0; i < q.length; i++) {
    const ch = q[i]
    if (/[\s，。；、?!？!：:]/.test(ch) || SKIP.has(ch)) continue
    denom++
    if (mark[i]) num++
  }
  return denom ? num / denom : 0
}
