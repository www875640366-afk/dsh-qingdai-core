// turn.js —— 每轮留底：把对话原文写进自己库的 events 表（抄 v2 turn.js 口径）。
//
// 为什么要有：宿主只把会话存在自己的 sessions/ 里，压缩后原文就不可靠了。
// 回捞、溯源（memories.sources 指回 seq）、裁剪安全线校验，全靠这张表。
// **永不自动删**。
//
// 【按消息事件记单条，不按「轮」重取快照】
//   宿主每产生一条消息就发一次 session/event。工具轮里 assistant/message
//   会一步一条（turn 1 step 1..N 全是 assistant/message），如果每次触发都
//   从会话快照重取「最后一条主人消息 + 最后一条回复」，同一段原文会被
//   反复写进去（实测 27 对内容完全相同的记录）。
//   现在：来一条事件记一条消息，seq 用消息事件自己的 seq，
//   表上 (sid, seq, role) 唯一索引兜底，重复触发写不进去。
//
// 【来源过滤——v2 用 151 条误记换来的口径】
//   宿主往会话里塞的东西（time-context / runtime-context / system-reminder /
//   wake 词 / 压缩提示）都是 role:'user'，但说话的不是主人。
//   只认 OWNER_SOURCES 里的来源；工作会话再收紧到只有 'user'。


/**
 * 主人真实说话的来源。宿主注入的不在这里。
 *
 * `wechat-bridge` 是微信桥（dsh-qingdai-wx-v2）自己投送时用的 kind
 * （lib/turn-guard.mjs 里的 BRIDGE_SOURCE_KIND）；`wechat` / `qingdai-wx` 是它认的旧名。
 * **漏掉 wechat-bridge 的后果**：用户从微信发的话一条都进不了留底，只留下助手的回复——
 * 实测生活库就是这么只剩 assistant 的。
 */
export const OWNER_SOURCES = new Set(['user', 'qingdai-wx', 'wechat-bridge', 'wechat'])

/**
 * 太短的消息跳过。**只跳单字**（「嗯」「好」这种连上下文都没有的），
 * 别再抬高：实测 4 字会把「重启了」这种真实的话也挡在留底外面，
 * 而留底的意义就是「原话全在」。
 */
const MIN_TEXT = 2

function payloadOf(ev) { return ev?.data ?? ev?.payload ?? {} }
function messageOf(ev) { const p = payloadOf(ev); return p?.message ?? p }

export function eventText(ev) {
  const m = messageOf(ev)
  const content = m?.content
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    // assistant 的 content 里有 reasoning 块，只取 text
    return content.filter((b) => b?.type === 'text').map((b) => b.text || '').join('\n').trim()
  }
  return ''
}

function eventSource(ev) {
  const m = messageOf(ev)
  return String(m?.source?.kind ?? payloadOf(ev)?.source?.kind ?? 'user')
}

/** 消息事件自己的 seq（事件流序号，溯源用）。 */
function eventSeq(ev) {
  const n = Number(ev?.seq ?? ev?.data?.seq ?? ev?.payload?.seq)
  return Number.isFinite(n) ? n : null
}

/**
 * 把一条消息事件写进留底表。index.js 在 session/event 里逐条调。
 *
 * @param {object} db
 * @param {object} session
 * @param {object} event  session/event 的第二个参数
 * @param {{anySource?:boolean}} opts 工作会话传 false（只认 'user' 来源）
 * @returns {{ok:boolean, reason?:string, written?:boolean, dup?:boolean, id?:number, ownerSpoke?:boolean}}
 */
/**
 * 最近被拒的来源（诊断用）。只看得到「为什么这条没记下来」，
 * 不参与任何判断——排查完就该是空的。
 */
export const rejectedSources = new Map()

export function recordEvent(db, session, event, opts = {}) {
  const type = event?.type
  if (type !== 'user/message' && type !== 'assistant/message') return { ok: false, reason: '非消息事件' }
  const sid = String(session?.id ?? session?.header?.id ?? '')
  if (!sid) return { ok: false, reason: '缺会话 id' }

  const role = type === 'user/message' ? 'user' : 'assistant'
  const source = role === 'user' ? eventSource(event) : 'assistant'
  let ownerSpoke = false

  if (role === 'user') {
    const allow = opts.anySource === false ? source === 'user' : OWNER_SOURCES.has(source)
    if (!allow) {
      // 记一笔「哪个来源被拒了」：来源写错（比如界面用了新 kind）时，
      // 表现就是「她说的话没进留底」，没这个只能瞎猜。
      const key = `${source || '(空)'}`
      rejectedSources.set(key, (rejectedSources.get(key) || 0) + 1)
      return { ok: false, reason: `不是主人说的（${source}）` }
    }
    ownerSpoke = true
  }

  const text = eventText(event).slice(0, 20_000)
  if (text.length < MIN_TEXT) return { ok: false, reason: '消息太短' }

  const ts = Number(event?.time ?? event?.data?.time) || Date.now()
  const seq = eventSeq(event)
  const info = db.prepare(
    'INSERT OR IGNORE INTO events (sid, seq, ts, role, text, source) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(sid, seq, ts, role, text, source)
  const written = Number(info.changes) > 0
  return { ok: true, written, dup: !written, id: written ? Number(info.lastInsertRowid) : null, ownerSpoke }
}


/** 查原文：raw_memory 的底座。全部条件可选，sid 必填。 */
export function queryEvents(db, { sid, crossSession = false, fromSeq, toSeq, fromTs, toTs, keyword, limit = 20 } = {}) {
  const id = String(sid ?? '').trim()
  // crossSession：整个库一起查，不按会话隔离。工作库用这个——
  // 同一个人在不同工作会话里说过的事，翻原文时就该能互相看见。
  if (!id && !crossSession) return { ok: false, reason: 'sid 必填（留底表默认按会话隔离）' }
  const where = []
  const args = []
  if (!crossSession) { where.push('sid = ?'); args.push(id) }
  if (Number.isFinite(Number(fromSeq))) { where.push('seq >= ?'); args.push(Number(fromSeq)) }
  if (Number.isFinite(Number(toSeq))) { where.push('seq <= ?'); args.push(Number(toSeq)) }
  if (Number.isFinite(Number(fromTs))) { where.push('ts >= ?'); args.push(Number(fromTs)) }
  if (Number.isFinite(Number(toTs))) { where.push('ts <= ?'); args.push(Number(toTs)) }
  if (keyword) {
    // LIKE 的通配符要转义，不然搜一个 % 就把整表捞出来
    where.push("text LIKE ? ESCAPE '\\'")
    args.push('%' + String(keyword).replace(/[%_\\]/g, (c) => '\\' + c) + '%')
  }
  const rows = db.prepare(
    `SELECT id, sid, seq, ts, role, text, source FROM events
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ts ASC, id ASC LIMIT ?`,
  ).all(...args, Math.max(1, Math.min(100, Number(limit) || 20)))
  return { ok: true, count: rows.length, rows, crossSession: Boolean(crossSession) }
}

/** 裁剪安全线：这段 seq 区间是否全部已在留底表（查不到就不裁——prune.js 的铁律）。 */
export function seqRangeCovered(db, sid, fromSeq, toSeq) {
  const a = Number(fromSeq)
  const b = Number(toSeq)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return { ok: false, reason: 'seq 区间不合法' }
  const row = db.prepare(
    'SELECT COUNT(DISTINCT seq) AS d FROM events WHERE sid = ? AND seq >= ? AND seq <= ?',
  ).get(String(sid), a, b)
  const expected = b - a + 1
  // 区间内每个 seq 必须都有留底（一条消息一个 seq）
  return { ok: Number(row?.d ?? 0) >= expected, covered: Number(row?.d ?? 0), expected }
}
