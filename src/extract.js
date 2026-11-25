// extract.js —— 压缩时提炼记忆节点：从「这次要压掉的原文」里挑出值得长期记住的事。
//
// 【为什么挂在压缩上】压缩 = 一段对话告一段落，天然是「该定格了」的时刻。
//   提炼源用 input.messages（引擎正要压的内容），不依赖事件 seq：
//   这是最接近原文的输入，跨 realm 也能拿到。
//
// 【两条路】
//   1. LLM 提炼（主路）：一次调用，输出 JSON 节点数组
//   2. 规则兜底（LLM 不可用时）：日期/约定/承诺/喜好类句式，importance 0.6
//   两条都不阻塞压缩：提炼失败只写台账，摘要照常落地。
//
// 【去重】同库 text 完全相同的已存在 → 跳过（重复写会把热度和库容量刷坏）。

import { memWrite } from './memory.js'
import { dbPlanFor } from './routing.js'
import { openDb } from './db.js'
import { appendFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

const MAX_TRANSCRIPT_CHARS = 12_000   // 给 LLM 的原文上限（压缩输入本身已受预算约束）
const MAX_NODES = 8

const EXTRACT_PROMPT = `你是记忆提炼器。下面是即将被压缩的对话原文。请挑出「值得长期记住的节点」。

值得记：约定/承诺、生日/纪念日/重要日期、关系里重要的话、重要决定、教训/规矩、主人的偏好与底线。
不要记：过程细节、工具调用、技术排查步骤、寒暄、当时的心情。
重复的只挑一条。没有值得记的就输出 []。

只输出 JSON 数组，每个元素：{"text": "一句话，主语明确", "importance": 0.9 或 0.6 或 0.3}
0.9 = 核心（生日、定名日、永久约定）；0.6 = 重要；0.3 = 普通。

对话原文：
`

/** 把消息列表拼成纯文本（role: text 一行一句）。 */
export function transcriptOf(messages = []) {
  const lines = []
  for (const m of messages) {
    const role = m?.role ?? '?'
    const content = m?.content
    let text = ''
    if (typeof content === 'string') text = content
    else if (Array.isArray(content)) text = content.filter((b) => b?.type === 'text').map((b) => b.text ?? '').join('\n')
    text = String(text ?? '').trim()
    if (!text) continue
    if (role === 'system') continue          // 系统提示词不是对话
    lines.push(`${role === 'user' ? '用户' : role === 'assistant' ? '助手' : role}：${text}`)
  }
  const joined = lines.join('\n')
  return joined.length > MAX_TRANSCRIPT_CHARS ? joined.slice(-MAX_TRANSCRIPT_CHARS) : joined
}

/** 用引擎 realm 的 ctx.llm 跑一次提炼。失败返回 {ok:false, reason}。 */
export async function extractWithLlm(ctx, { messages, provider, model, signal }) {
  const transcript = transcriptOf(messages)
  if (!transcript.trim()) return { ok: false, reason: 'no-transcript' }
  try {
    const chunks = []
    const stream = ctx.llm.stream({
      provider,
      model,
      messages: [{ role: 'user', content: [{ type: 'text', text: EXTRACT_PROMPT + transcript }] }],
      maxTokens: 1024,
      purpose: 'memory-extract',
      ...(signal ? { signal } : {}),
    })
    for await (const chunk of stream) chunks.push(chunk)
    const text = collectText(chunks)
    const nodes = parseNodes(text)
    return { ok: true, nodes }
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) }
  }
}

/** 从流式块里把文本拼出来。兼容 {type:'text', text} 与字符串增量。 */
function collectText(chunks) {
  const out = []
  for (const c of chunks) {
    if (typeof c === 'string') { out.push(c); continue }
    if (c?.type === 'text' && typeof c.text === 'string') { out.push(c.text); continue }
    if (c?.type === 'text-delta' && typeof c.text === 'string') { out.push(c.text); continue }
    if (c?.text) { out.push(String(c.text)); continue }
    if (c?.delta?.text) out.push(String(c.delta.text))
  }
  return out.join('')
}

/** 解析 LLM 输出的 JSON 节点数组。容忍代码围栏与前后废话。 */
export function parseNodes(text) {
  let t = String(text ?? '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) t = fence[1].trim()
  const start = t.indexOf('[')
  const end = t.lastIndexOf(']')
  if (start >= 0 && end > start) t = t.slice(start, end + 1)
  try {
    const arr = JSON.parse(t)
    if (!Array.isArray(arr)) return []
    return arr
      .map((x) => ({
        text: String(x?.text ?? '').trim(),
        importance: clampImp(x?.importance),
      }))
      .filter((x) => x.text.length >= 4)
      .slice(0, MAX_NODES)
  } catch {
    return []
  }
}

function clampImp(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0.6
  return n >= 0.8 ? 0.9 : n >= 0.45 ? 0.6 : 0.3
}

/** 规则兜底：没有 LLM 时，至少把主人说的日期/承诺/偏好类句子捞出来。 */
export function heuristicNodes(messages = []) {
  const transcript = transcriptOf(messages)
  // 只从用户说的话里挑（助手的回应是复述，不重复入库），并剥掉角色前缀
  const ownerLines = transcript.split('\n').filter((l) => l.startsWith('主人：')).map((l) => l.slice(3))
  const sentences = ownerLines.join('\n').split(/[。！？!?；;]/).map((s) => s.trim()).filter((s) => s.length >= 6)
  const pick = []
  const rules = [
    /约定|答应|承诺|保证|说好|以后我们|永远|一辈子/,
    /生日|纪念日|定名|农历|周年/,
    /喜欢|讨厌|害怕|底线|不许|别再/,
    /教训|记住|下次不要|规矩/,
  ]
  for (const s of sentences) {
    if (pick.length >= 3) break
    if (rules.some((re) => re.test(s))) pick.push(s.slice(0, 200))
  }
  return pick.map((text) => ({ text, importance: 0.6 }))
}

/** 写节点进对应库（按会话路由）。返回 {written, skipped, reason?}。 */
export function writeNodes(dataDir, sid, sessions, nodes, anchor = null) {
  const plan = dbPlanFor(sid, dataDir, sessions)
  if (!plan.ok) return { written: 0, skipped: 0, reason: plan.reason }
  const db = openDb(plan.db)
  let written = 0
  let skipped = 0
  const exists = db.prepare('SELECT 1 FROM memories WHERE text = ? AND superseded = 0')
  for (const n of nodes) {
    if (exists.get(n.text)) { skipped++; continue }
    // anchor 是这批留底的区间（不是模型填的），撞重复的节点会被 memWrite 挡下来
    const r = memWrite(db, n, { anchor })
    if (r.ok) written++
    else skipped++
  }
  return { written, skipped, side: plan.side }
}

/** 台账：提炼结果落一行 JSONL，排障用。永不删。 */
export function auditExtract(dataDir, row) {
  try {
    const file = join(dataDir, 'extract.log')
    mkdirSync(dirname(file), { recursive: true })
    appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), ...row }) + '\n', 'utf8')
  } catch { /* 记不上不影响 */ }
}

/**
 * 完整流程：提炼 + 落库 + 台账。引擎与监听两条路都调它。
 * 永不抛——压缩不能被提炼拖死。
 */
export async function runExtraction(ctx, { messages, sid, dataDir, sessions, provider, model, signal, source, anchor = null }) {
  if (!sid) {
    auditExtract(dataDir, { source, ok: false, reason: 'no-sid' })
    return { ok: false, reason: 'no-sid' }
  }
  let nodes = []
  let via = 'llm'
  try {
    const r = await extractWithLlm(ctx, { messages, provider, model, signal })
    if (r.ok) nodes = r.nodes
    else {
      via = 'heuristic'
      nodes = heuristicNodes(messages)
      auditExtract(dataDir, { source, ok: false, reason: r.reason, via })
    }
  } catch (e) {
    via = 'heuristic'
    nodes = heuristicNodes(messages)
    auditExtract(dataDir, { source, ok: false, reason: String(e?.message ?? e), via })
  }
  if (!nodes.length) return { ok: true, written: 0, via }
  const res = writeNodes(dataDir, sid, sessions, nodes, anchor)
  auditExtract(dataDir, { source, ok: true, via, nodes: nodes.length, ...res })
  return { ok: true, via, ...res }
}

// ---- 从留底表提炼（压缩后兜底路径：不依赖引擎接管） ----

/**
 * 取某会话自 marker 之后的新留底，拼成 messages 数组。
 * marker 存该库 meta 表的 `extract_ts:<sid>`（毫秒）。
 * 【为什么按会话分开】水位是库级的会有漏：同库两个会话，一个提炼完推进水位，
 *   另一个会话还没提炼的那段就永远够不着了。
 * @returns {{messages:Array, fromTs:number, toTs:number, count:number}}
 */
export function eventsSinceMarker(db, sid, now = Date.now()) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(markerKey(sid))
  const fromTs = Number(row?.value) || 0
  const rows = db.prepare(
    'SELECT role, text, ts FROM events WHERE sid = ? AND ts > ? ORDER BY ts ASC, id ASC LIMIT 400',
  ).all(String(sid), fromTs)
  const messages = rows.map((r) => ({ role: r.role === 'assistant' ? 'assistant' : 'user', content: [{ type: 'text', text: r.text }] }))
  const toTs = rows.length ? Number(rows[rows.length - 1].ts) : fromTs
  return { messages, fromTs, toTs, count: rows.length }
}

function markerKey(sid) { return `extract_ts:${String(sid ?? '')}` }

/** 推进 marker（提炼成功后调，避免重复提炼同一段）。 */
export function setExtractMarker(db, sid, ts) {
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(markerKey(sid), String(Number(ts) || 0))
}

/**
 * 压缩后从留底表提炼。压缩已经把历史压走，但我们的留底是全的——
 * 这是「压缩时重要节点不丢」的真正保障。
 */
export async function extractFromEvents(ctx, { db, sid, dataDir, sessions, provider, model, source = 'post-compact' }) {
  try {
    const got = eventsSinceMarker(db, sid)
    if (!got.count) {
      auditExtract(dataDir, { source, ok: true, skipped: 'no-new-events', sid })
      return { ok: true, written: 0, count: 0 }
    }
    const anchor = { sid: String(sid), fromTs: got.fromTs || got.toTs, toTs: got.toTs }
    const res = await runExtraction(ctx, {
      messages: got.messages, sid, dataDir, sessions, provider, model, source, anchor,
    })
    if (res.ok) setExtractMarker(db, sid, got.toTs)
    auditExtract(dataDir, { source, ok: res.ok, written: res.written ?? 0, events: got.count, via: res.via })
    return { ...res, count: got.count }
  } catch (e) {
    auditExtract(dataDir, { source, ok: false, reason: String(e?.message ?? e) })
    return { ok: false, reason: String(e?.message ?? e) }
  }
}
