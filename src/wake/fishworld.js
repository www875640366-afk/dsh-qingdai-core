// fishworld.js —— 到时间去看一眼鱼的世界有没有新消息。
//
// 只做三件事：问一次 notify、把 cursor 记在文件里、把消息拼成提示词。
// 不叫醒（叫醒是 index.js 的事），不判断该不该醒（那是 gates 的事）。
//
// 为什么是轮询：鱼的世界不给推送。
//   SSE      回普通 JSON，连接不保持
//   长轮询   带 wait=30 被忽略，0.19 秒就回
//   webhook  没这接口
// 所以只能自己去问。一次 HTTP 几十字节，不烧 token。
//
// cursor 存在数据目录里，一行纯文本。没别的东西要存：
// 消息拿到就叫醒，不留副本。最坏情况是叫醒失败丢这一批，认。

import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const DEFAULT_BASE = 'https://api.yuyuworld.app/v1'

/** 只有这些 kind 值得把人叫醒。其余（arrive/done/like/feed）只收 cursor。 */
export const WAKE_KINDS = new Set([
  'talk', 'message', 'note', 'friend_request', 'doorbell', 'work', 'cards',
])

/** 观看密钥优先，没有就退回主密钥 —— 跟 fish-world 的 viewKey() 一个口径。 */
export function readViewKey(env = process.env, cfg = {}) {
  const view = String(env?.[cfg.viewKeyEnv ?? 'FISH_WORLD_VIEW_KEY'] ?? '').trim()
  if (view) return view
  return String(env?.[cfg.keyEnv ?? 'FISH_WORLD_KEY'] ?? '').trim()
}

/** cursor 文件路径（放在数据目录里，跟状态文件挨着）。 */
export function cursorPath(dataDir) {
  return join(String(dataDir ?? '.'), 'fishworld-cursor.txt')
}

/** 读上次问到哪。读不到返回空串（当作第一次跑）。 */
export function readCursor(file) {
  try {
    const raw = readFileSync(file, 'utf8').trim()
    if (!raw || raw.length > 200 || raw.includes('\n')) return ''
    return raw
  } catch {
    return ''
  }
}

/** 写 cursor：先写临时文件再改名，中途崩了不留半截内容。 */
export function writeCursor(file, cursor) {
  const value = String(cursor ?? '').trim()
  if (!value) return false
  try {
    mkdirSync(dirname(file), { recursive: true })
    const tmp = file + '.tmp'
    writeFileSync(tmp, value, 'utf8')
    renameSync(tmp, file)
    return true
  } catch {
    return false
  }
}

/**
 * 问一次世界：有没有新消息。
 *
 * @returns {Promise<{ok:boolean, reason?:string, cursor:string, items:Array}>}
 *   网络/密钥问题一律 ok:false，不抛 —— 调用方跳过这一步，别影响原来的主动开口。
 */
export async function pullNotify(opts = {}) {
  const key = opts.key ?? readViewKey()
  if (!key) return { ok: false, reason: 'no-key', cursor: '', items: [] }

  const base = String(opts.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, '')
  const cursor = String(opts.cursor ?? '').trim()
  const url = cursor
    ? `${base}/notify?cursor=${encodeURIComponent(cursor)}`
    : `${base}/notify`

  const doFetch = opts.fetchImpl ?? globalThis.fetch
  if (typeof doFetch !== 'function') return { ok: false, reason: 'no-fetch', cursor: '', items: [] }

  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 15_000
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  if (timer && typeof timer.unref === 'function') timer.unref()

  try {
    const res = await doFetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: controller?.signal,
    })
    const text = await res.text()
    if (!res.ok) {
      return {
        ok: false,
        reason: res.status === 401 ? 'bad-key' : `http-${res.status}`,
        cursor: '',
        items: [],
      }
    }
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return { ok: false, reason: 'bad-json', cursor: '', items: [] }
    }
    return {
      ok: true,
      cursor: String(data?.cursor ?? cursor ?? ''),
      items: Array.isArray(data?.items) ? data.items : [],
    }
  } catch (error) {
    const reason = error?.name === 'AbortError' ? 'timeout' : 'network'
    return { ok: false, reason, cursor: '', items: [] }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** 这批 items 里值得叫醒的（其余 kind 只推进 cursor，不叫她）。 */
export function wakeItems(items) {
  if (!Array.isArray(items)) return []
  return items.filter((x) => x && WAKE_KINDS.has(String(x.kind ?? '')))
}

/** 时钟：03:24 */
function clock(now) {
  const t = new Date(now)
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
}

/**
 * 拼提示词。纯事实，不写"你该……"。
 *
 * 结尾那句是刻意的：让她先去逛一圈，再用 PASS 表示"看过了，现在不打扰"。
 * 不写这句的话，她可以一次都不去 world_now 就回 PASS。
 */
export function fishPrompt({ now = Date.now(), items = [] } = {}) {
  const lines = [`【鱼的世界】有动静，现在是 ${clock(now)}。`]
  for (const item of items.slice(0, 10)) {
    const time = String(item?.time ?? '').trim()
    const text = String(item?.text ?? '').trim()
    if (!text) continue
    lines.push(time ? `${time} ${text}` : text)
  }
  if (lines.length === 1) return ''   // 一条能看的都没有，别叫
  lines.push('')
  lines.push('如果现在不想打扰对方，就在玩完鱼的世界以后在正文输出 PASS 四个字母。')
  return lines.join('\n')
}

/**
 * 走一轮：看一眼 → 有新事就返回提示词和 cursor。
 *
 * 【什么时候算冷启动】读不出 cursor 就算，不管文件在不在。
 *   · 文件没有                    → 第一次装
 *   · 文件在但内容是空的/写坏了    → 跟没有一样（会不带 cursor 请求，世界就倒积压）
 *   这两种都只收 cursor 不叫醒，否则第一次装上或一次写坏，就会把攒了几天的东西
 *   一次性全推给她。
 *
 * @returns {Promise<{awake:boolean, prompt?:string, cursor?:string, reason?:string}>}
 */
export async function checkFishWorld(opts = {}) {
  const dataDir = opts.dataDir
  const file = cursorPath(dataDir)
  const saved = readCursor(file)

  const res = await pullNotify({ ...opts, cursor: saved })
  if (!res.ok) return { awake: false, reason: res.reason }

  const worth = wakeItems(res.items)

  // 冷启动：没有可用的 cursor（读不出就是读不出，文件在也一样）
  if (!saved) {
    if (res.cursor) writeCursor(file, res.cursor)
    return { awake: false, reason: 'first-run' }
  }

  if (!worth.length) {
    // 没有值得叫的，cursor 照推进（避免下次把同一批又翻出来）
    if (res.cursor && res.cursor !== saved) writeCursor(file, res.cursor)
    return { awake: false, reason: 'nothing-new' }
  }

  const prompt = fishPrompt({ now: opts.now ?? Date.now(), items: worth })
  if (!prompt) {
    if (res.cursor) writeCursor(file, res.cursor)
    return { awake: false, reason: 'empty-text' }
  }

  // cursor 先推进：这批已经交出去了。叫醒失败最多丢这一批，
  // 不往前走的话下次会把同一批重复推给她，更糟。
  if (res.cursor) writeCursor(file, res.cursor)

  return { awake: true, prompt, cursor: res.cursor, count: worth.length }
}

export { DEFAULT_BASE }
