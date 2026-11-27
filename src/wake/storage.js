// storage.js —— 状态落盘：一张 JSON 文件，原子的写。
//
// 不引数据库：这里只存几件小事（上次说话、上次开口、今天开了几次），
// 一个 JSON 够用，出问题还能直接打开看。
//
// 写盘一律「先写临时文件再改名」：中途断电/崩，文件要么是旧的、要么是新的，
// 不会留下半截内容把整份状态读坏。

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** 默认状态文件路径。 */
export function statePath(dataDir) {
  return join(String(dataDir ?? '.'), 'wake-state.json')
}

/** 空状态。字段和默认值都在这一处，别处不许再写一遍。 */
export function emptyState() {
  return {
    version: 1,
    lastTalkAt: 0,        // 主人最后一次真说话（毫秒）
    lastProactiveAt: 0,   // 上次叫醒（毫秒）
    wakeCount: {},        // 日期 → 当天开了几次（{'2026-11-23': 2}）
    wakeLog: [],          // 最近开的口 [{ at, n }]，n = 当天第几次，新的在前
  }
}

/** 读状态。文件不在、读坏、不是对象，一律给空状态，不抛。 */
export function readState(file) {
  try {
    const raw = readFileSync(file, 'utf8')
    const obj = JSON.parse(raw)
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return emptyState()
    // 合并默认值：老文件缺字段也能用
    const base = emptyState()
    return {
      ...base,
      ...obj,
      wakeCount: obj.wakeCount && typeof obj.wakeCount === 'object' ? obj.wakeCount : {},
      wakeLog: Array.isArray(obj.wakeLog) ? obj.wakeLog.filter((x) => Number(x?.at) > 0) : [],
    }
  } catch {
    return emptyState()
  }
}

/** 写状态。失败返回 false，不抛。 */
export function writeState(file, state) {
  try {
    mkdirSync(dirname(file), { recursive: true })
    const tmp = file + '.tmp'
    writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8')
    renameSync(tmp, file)
    return true
  } catch {
    return false
  }
}

/** 内存 + 文件的小封装，读写都走它。
 *
 *  **按 mtime 判定文件有没有被别处改过**：只在第一次读进来会导致第二个实例写的状态
 *  于是第二个实例写的状态这个实例再也看不见（双开时两套 5 分钟栅格就是这么来的）。
 *  现在每次 get 顺手 stat 一下，文件时间戳变了就重读；单实例下 stat 成本是微秒级。
 *  写完之后要把时间戳同步成新值，否则下一次 get 会白读一遍。
 */
export function createStore(file) {
  let cache = null
  let loaded = false
  let stamp = ''

  // mtime + size 一起比：只比 mtime 不行，同一毫秒内连写两次时间戳相同，
  // 后写的那份就看不见了（测试里就是这么暴露出来的）。
  const fileStamp = () => {
    try {
      const st = statSync(file)
      return `${st.mtimeMs}:${st.size}`
    } catch { return '0:0' }
  }

  const ensure = () => {
    const now = fileStamp()
    if (!loaded || now !== stamp) {
      cache = readState(file)
      loaded = true
      stamp = now
    }
    return cache
  }

  return {
    file,
    get() { return ensure() },
    /** 改完自己落盘。fn 直接改传入的对象，别返回新对象。 */
    update(fn) {
      const state = ensure()
      try { fn(state) } catch { /* 改坏了也照存，别把整个状态弄丢 */ }
      writeState(file, state)
      stamp = fileStamp()   // 自己写的，记下新时间戳，别让下次 get 重读
      return state
    },
    exists() { return existsSync(file) },
  }
}

/**
 * 今天开了几次 / 记一次。
 * 按本地日期切，跨天自动清零（不用定时器去清）。
 * dayKey 本身在 heat.js（那边也按同一种日期格式分桶），这里只转出去，别再写第二份。
 */
// import 供本文件内部使用；同时再导出，供外部从 storage 取 dayKey。
import { dayKey } from '../heat.js'
export { dayKey }

export function wakeCountToday(state, now = Date.now()) {
  const n = Number(state?.wakeCount?.[dayKey(now)] ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function bumpWakeCount(state, now = Date.now()) {
  const key = dayKey(now)
  // 只留今天和昨天：老的不清会一直长
  const keep = new Set([key])
  const y = new Date(now - 86400_000)
  keep.add(`${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`)
  const next = {}
  for (const [k, v] of Object.entries(state.wakeCount ?? {})) {
    if (keep.has(k)) next[k] = v
  }
  const n = (Number(next[key]) || 0) + 1
  next[key] = n
  state.wakeCount = next
  // 每次开口留一条，新的在前；只留 50 条（面板只显示 10 条）
  state.wakeLog = [{ at: now, n }, ...(Array.isArray(state.wakeLog) ? state.wakeLog : [])].slice(0, 50)
  return n
}
