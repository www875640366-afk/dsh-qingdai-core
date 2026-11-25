// session.js —— 会话判定：这个会话算不算"自己的"。
//
// 唯一权威是配置里的白名单（wakeSessions）。
// 白名单里列着的会话能被主动开口；其余一律算工作会话，
// 由 allowlist.js 把鱼的世界工具收窄掉。
//
// 不由内容猜、不由来源猜、不看目录名——就认配置里那几条。

/**
 * 这个会话在不在白名单里。
 *
 * @param {string} sid            会话 id
 * @param {{wakeSessions?: string[]}} cfg
 */
export function isWakeSession(sid, cfg = {}) {
  const id = String(sid ?? '').trim()
  if (!id) return false
  const list = Array.isArray(cfg.wakeSessions) ? cfg.wakeSessions : []
  return list.some((x) => String(x).trim() === id)
}

/**
 * 该往哪个会话投提示词。
 *
 * 只投白名单第一个——那是她平时跟他说话的地方。
 * 白名单为空就是"不开口"，不是"全部都开口"。
 *
 * @param {{wakeSessions?: string[]}} cfg
 * @returns {string} 会话 id，空串表示无处可投
 */
export function targetSession(cfg = {}) {
  const list = Array.isArray(cfg.wakeSessions) ? cfg.wakeSessions : []
  for (const sid of list) {
    const id = String(sid ?? '').trim()
    if (id) return id
  }
  return ''
}

/**
 * 从会话快照里找主人最后说话的时间。
 *
 * 跳过宿主注入（叫醒词、时间上下文等），只认真人。
 * 这是旧插件踩出来的坑：宿主塞的东西也是 role:'user'，
 * 按 role 判断会把系统注入全记成"主人说的话"（实测一天 151 条）。
 *
 * @param {object} session
 * @returns {number} 毫秒时间戳；没找到返回 0
 */
export function lastTalkAtOf(session) {
  try {
    const events = typeof session?.snapshotEvents === 'function' ? session.snapshotEvents() || [] : []
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const ev = events[i]
      // 主人说的、或者她自己回的，都算「刚聊完」——不然她回完话、他还没打字的空当，
      // 插件会以为「很久没聊」把人叫醒一次（实测 37 分钟就醒了一回）。
      const isOwner = ev?.type === 'user/message' && eventText(ev) && OWNER_SOURCES.has(eventSource(ev))
      const isHer = ev?.type === 'assistant/message'
      if (!isOwner && !isHer) continue
      // 时间戳字段名要对：宿主的事件形状是 `{type, seq, time, data}`，
      // 顶层的 `time` 才是毫秒时间戳。以前只认 ts/at/data.ts，全落空 →
      // 每条都被当成「没有时间戳」跳过 → 返回 0 → lastTalkAt 再也不更新，
      // 「多久没聊」那道闸一直用着几天前的旧值。2026-11-25 10:20 主人在
      // 会话里说了话，10:24 / 10:29 还是照常把她叫醒，就是这么来的。
      const ts = Number(ev?.ts ?? ev?.at ?? ev?.time ?? ev?.data?.ts ?? ev?.data?.time)
      if (Number.isFinite(ts) && ts > 0) return ts
      // 这条没有时间戳：**跳过，继续往前找**。
      // 以前这里是 return Date.now()——拿不到时间就把「现在」当成「上次说话」，
      // 于是「多久没聊」那道闸门永远判成刚聊过，主动开口再也不会触发。
      continue
    }
    return 0
  } catch {
    return 0
  }
}

/** 主人真实说话的来源。宿主注入的那些不在这里。 */
// 直接复用 turn.js 那份：微信桥投送用的 kind 有新旧好几个名字（wechat-bridge 是现行，
// wechat / qingdai-wx 是旧名）。两份各写一份的后果是「加了新 kind 只改了一处」，
// 漏的那边就永远认不出来源，主动开口会以为「很久没聊」而叫醒她。
import { OWNER_SOURCES } from '../turn.js'

/**
 * 她这个会话现在是不是还有一轮没跑完。
 *
 * 「上一轮开口还没说完，下一轮又投一条」就是这么来的：判定门只看时间差，
 * 不知道她手边正忙着调工具。宿主把「开着的 turn」记在 turnBoundary 投影里
 * （dsh-agent/lib/index.js:486 的 turnBoundaryOf），openTurnStartSeq 不是 null
 * 就是这轮还没收尾。
 *
 * 探测不到一律当「不忙」：宁可多叫一次，也不能因为拿不到状态就永远不开口。
 *
 * @param {object} ctx  宿主 ctx
 * @param {string} sid  会话 id
 * @returns {boolean}
 */
export function isBusySession(ctx, sid) {
  try {
    const agent = ctx?.agents?.get?.(sid)
    if (!agent) return false // 不在内存里 = 没在跑
    const session = agent.session ?? agent.agent?.session
    if (!session) return false
    const boundary = ctx?.agents?.turnBoundaryOf?.(session)
    if (!boundary) return false
    return boundary.openTurnStartSeq !== null && boundary.openTurnStartSeq !== undefined
  } catch {
    return false
  }
}

function payloadOf(ev) {
  return ev?.payload ?? ev?.data ?? {}
}

function eventText(ev) {
  const p = payloadOf(ev)
  const m = p?.message ?? p
  const content = m?.content
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    return content.filter((b) => b?.type === 'text').map((b) => b.text || '').join('\n').trim()
  }
  return ''
}

function eventSource(ev) {
  const p = payloadOf(ev)
  const m = p?.message ?? p
  return String(m?.source?.kind ?? p?.source?.kind ?? 'user')
}
