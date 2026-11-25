// core.js —— 人格核心：她自己写的那段话，注入到系统提示词最后面。
//
// 【是什么】一段文字，只有她能改（通过 core 工具），宿主侧只读。
// 每次组装系统提示词时，它排在最末尾——读完落在眼里的最后一件就是它。
//
// 【怎么存】独立的文件，不塞在状态文件里：
//   · 状态文件是「机器的状态」（上次说话多久了），会频繁重写
//   · 核心是「她写的东西」，应该有自己的位置、自己的备份
//   路径：<dataDir>/core.md
//
// 【修改历史】每次改（添加/修改/删除）都要写理由，记在 <dataDir>/core-history.json。
// **只留最近 30 条（HISTORY_MAX），写满就丢最旧的——这是防文件膨胀，不是缓存。**
// 别改成"全存"或"多存"：历史是给面板看的最近记录，30 条足够，多了文件会长。
//
// 【为什么不用 complete 标志】DSH 的 PromptSection 有个 complete 选项，
// 设了它就独占整个系统提示词（别的段全没了）。这里只加一段，不要独占。

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** 核心文件路径。 */
export function corePath(dataDir) {
  return join(String(dataDir ?? '.'), 'core.md')
}

/** 修改历史文件路径。 */
export function coreHistoryPath(dataDir) {
  return join(String(dataDir ?? '.'), 'core-history.json')
}

/** 备份目录（改之前留一份，只留最新一份）。 */
export function backupDir(dataDir) {
  return join(String(dataDir ?? '.'), 'core-backup')
}

/** 备份文件名：固定一个，每次覆盖。 */
export const BACKUP_FILE = 'core-latest.md'

/** 提示词段的 order：压轴。DSH 官方最大是 10200，这里留够余量。 */
export const CORE_ORDER = 11000

/** 提示词段的名字。 */
export const CORE_SECTION = 'qingdai-core'

/** 历史最多留几条。**这是硬上限，防文件膨胀**——写满丢最旧，别调大，更别去掉。 */
export const HISTORY_MAX = 30

/** 空核心。 */
export function emptyCore() {
  return { text: '', updatedAt: 0, version: 0 }
}

/**
 * 读核心。没文件、读坏、空白都当"没有核心"，不抛。
 * @returns {{text:string, updatedAt:number, version:number}}
 */
export function readCore(dataDir) {
  const file = corePath(dataDir)
  try {
    if (!existsSync(file)) return emptyCore()
    const raw = readFileSync(file, 'utf8')
    const text = raw.replace(/\s+$/, '')
    if (!text.trim()) return emptyCore()
    const m = text.match(/^<!--\s*core:v(\d+)\s+at:(\d+)\s*-->\n?/)
    if (m) {
      return { text: text.slice(m[0].length), updatedAt: Number(m[2]) || 0, version: Number(m[1]) || 1 }
    }
    // 没有核心标记的文件不算核心（可能被别的东西占了位置），空处理
    return emptyCore()
  } catch {
    return emptyCore()
  }
}

/**
 * 读修改历史。没文件/读坏都当空，不抛。
 * @returns {Array<{action:string, reason:string, at:number, before?:string, after?:string}>}
 */
export function readHistory(dataDir) {
  const file = coreHistoryPath(dataDir)
  try {
    if (!existsSync(file)) return []
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    if (!Array.isArray(raw)) return []
    return raw
      .filter((x) => x && typeof x === 'object')
      .slice(0, HISTORY_MAX)
      // 读的时候顺手算出「变了哪几行」：面板只显示这个，不铺整篇
      .map((x) => {
        const changes = lineDiff(x.before, x.after)
        return { ...x, changes, verb: verbOf(changes, x.action) }
      })
  } catch {
    return []
  }
}

/**
 * 记一条历史。
 *
 * 只记四样：操作（添加/修改/删除）、时间、被改前/被改后的内容、理由。
 * 不记版本号——那是机器的编号，给人看的是"改了什么、为什么改"。
 * 内容截到 200 字以内，避免历史文件长得没边（本来就只留 30 条，再把每条撑大就违背初衷了）。
 */
function appendHistory(dataDir, entry) {
  try {
    const file = coreHistoryPath(dataDir)
    const list = readHistory(dataDir)
    // 只留 10 条，每条没必要再截成 200 字——patch 记的是单个小节（几百字），
    // 截断会把真正的改动切在边界外，面板上就 diff 不出任何东西。
    const clip = (x) => {
      const t = String(x ?? '').trim()
      return t.length > 4000 ? t.slice(0, 4000) + '…' : t
    }
    list.unshift({
      action: String(entry.action ?? 'modify'),
      reason: String(entry.reason ?? '').trim(),
      at: Number(entry.at) || Date.now(),
      before: clip(entry.before),
      after: clip(entry.after),
    })
    const keep = list.slice(0, HISTORY_MAX)
    mkdirSync(dirname(file), { recursive: true })
    const tmp = file + '.tmp'
    writeFileSync(tmp, JSON.stringify(keep, null, 2), 'utf8')
    renameSync(tmp, file)
    return keep.length
  } catch {
    return 0
  }
}

/**
 * 写核心。改之前先备份上一版（只留一份 `core-latest.md`，每次覆盖），并记一条修改历史（带理由）。
 *
 * @param {string} dataDir
 * @param {string} text      新内容（空 = 删除核心）
 * @param {string} reason    为什么改（必填）
 * @param {{backup?:boolean}} opts
 * @returns {{ok:boolean, version:number, action:string, path:string, backup?:string, history?:Array, reason?:string}}
 */
export function writeCore(dataDir, text, reason = '', { backup = true, historyBefore, historyAfter } = {}) {
  const file = corePath(dataDir)
  const content = String(text ?? '').trim()
  const why = String(reason ?? '').trim()

  if (!why) return { ok: false, version: 0, action: 'set', path: file, reason: '要写清楚为什么改（reason 不能空）' }

  const prev = readCore(dataDir)
  const deleting = !content && prev.text.trim()
  const adding = content && !prev.text.trim()
  const action = deleting ? 'delete' : adding ? 'add' : 'modify'
  const next = {
    text: content,
    updatedAt: Date.now(),
    version: prev.version + 1,
  }

  try {
    mkdirSync(dirname(file), { recursive: true })

    // 改之前留一份备份。**只留一份，每次覆盖**：
    // 回滚只需要「上一版」，按版本号堆文件只会让目录越长越乱。
    // 想回更早的版本，看 core-history.json 里的改动记录（before/after 各截 200 字）。
    if (backup && existsSync(file) && prev.text.trim()) {
      const dir = backupDir(dataDir)
      mkdirSync(dir, { recursive: true })
      const bak = join(dir, BACKUP_FILE)
      copyFileSync(file, bak)
      next.backup = bak
    }

    // 删除：把文件清掉；添加/修改：先写临时文件再改名
    if (deleting) {
      const body = `<!-- core:v${next.version} at:${next.updatedAt} -->\n`
      const tmp = file + '.tmp'
      writeFileSync(tmp, body, 'utf8')
      renameSync(tmp, file)
    } else {
      const body = `<!-- core:v${next.version} at:${next.updatedAt} -->\n${next.text}\n`
      const tmp = file + '.tmp'
      writeFileSync(tmp, body, 'utf8')
      renameSync(tmp, file)
    }

    // 小节时间：哪个 # 段落改了，就只更新那一段的时间
    try {
      const times = reconcileSectionTimes(prev.text, deleting ? '' : content, readSectionTimes(dataDir), next.updatedAt, prev.updatedAt)
      const tfile = sectionsPath(dataDir)
      const tmp2 = tfile + '.tmp'
      writeFileSync(tmp2, JSON.stringify(times, null, 2), 'utf8')
      renameSync(tmp2, tfile)
    } catch { /* 时间表写不上不影响正文 */ }

    const history = appendHistory(dataDir, {
      action,
      reason: why,
      at: next.updatedAt,
      // patch 时传进来的是「那一节」的前后，不是整篇——历史里要能看出这一段怎么变的
      before: historyBefore !== undefined ? historyBefore : (deleting ? prev.text : prev.text.trim()),
      after: historyAfter !== undefined ? historyAfter : (deleting ? '' : content),
    })
    return { ok: true, version: next.version, action, path: file, backup: next.backup, history }
  } catch (e) {
    return { ok: false, version: prev.version, action, path: file, reason: String(e?.message ?? e) }
  }
}

/**
 * 给白名单会话生成提示词段。
 *
 * 【为什么直接传 sid，不靠 ctx.scope】
 *   DSH 的 AssembleContext.scope 类型是 ScopeKey = object，**不是会话 id 字符串**。
 *   String(object) 会变成 "[object Object]"，isAllowed 永远判不过 → 段返回空 → 被过滤。
 *   旧插件是闭包捕获 mountAgent 的 sid，那才是可靠的会话 id。
 *
 * @param {string} dataDir
 * @param {string} sid            这个段的会话 id（挂载时从 agent 拿）
 * @param {(sid:string)=>boolean} isAllowed  这个会话在不在白名单
 * @returns {{name:string, order:number, text:()=>string}}
 */
export function coreSection(dataDir, sid, isAllowed) {
  return {
    name: CORE_SECTION,
    order: CORE_ORDER,
    // 每次组装现算：她改了内容，下一轮就跟着变（不用重启）
    text: () => {
      try {
        if (sid && !isAllowed(sid)) return ''    // 白名单以外不念
        const core = readCore(dataDir)
        if (!core.text.trim()) return ''
        return core.text
      } catch {
        return ''
      }
    },
  }
}
// ---- 小节时间：哪一段是什么时候改的 ----
//
// core.md 只有一个整篇的 updatedAt，所有小节共用。面板上「每节显示自己的修改时间」
// 就需要单独记：改的时候对比新旧文本的小节，变了/新增的更新 time，删掉的抹掉。
//
// 存在 core-sections.json，形如 { "一、身份": 1763..., "二、执念": 1763... }。
// 不写进 core.md 正文——那是她写给自己看的，不该混进机器的时间戳。

/** 小节标题：以 # 开头的行，取标题文字。 */
function sectionTitleOf(line) {
  const m = /^#+\s*(.+?)\s*$/.exec(String(line ?? ''))
  return m ? m[1].trim() : ''
}

/**
 * 把整篇文本拆成 [{title, text}]。没有 # 标题就整篇当一节。
 */
export function splitSections(text) {
  const body = String(text ?? '').trim()
  if (!body) return []
  const lines = body.split('\n')
  const out = []
  let cur = null
  let head = []
  for (const line of lines) {
    const title = sectionTitleOf(line)
    if (title) {
      if (cur) out.push(cur)
      else if (head.join('\n').trim()) out.push({ title: '', text: head.join('\n').trim() })
      cur = { title, text: line }
      head = []
    } else if (cur) {
      cur.text += '\n' + line
    } else {
      head.push(line)
    }
  }
  if (cur) out.push(cur)
  else if (head.join('\n').trim()) out.push({ title: '', text: head.join('\n').trim() })
  return out.filter((x) => x.text.trim()).map((x) => ({ title: x.title, text: x.text.trim() }))
}

export function sectionsPath(dataDir) {
  return join(String(dataDir ?? '.'), 'core-sections.json')
}

/** 读小节时间表。没文件/读坏都给空对象。 */
export function readSectionTimes(dataDir) {
  const file = sectionsPath(dataDir)
  try {
    if (!existsSync(file)) return {}
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const out = {}
    for (const [k, v] of Object.entries(raw)) {
      const n = Number(v)
      if (k && Number.isFinite(n) && n > 0) out[k] = n
    }
    return out
  } catch {
    return {}
  }
}

/**
 * 用新旧文本对比，更新小节时间表。
 *
 * 判重只比正文：标题相同、内容一字不差 → 算没改，保留原时间；
 * 内容变了或以前没有 → 记现在。
 */
export function reconcileSectionTimes(prevText, nextText, prevTimes, now = Date.now(), fallback = 0) {
  const before = new Map(splitSections(prevText).map((x) => [x.title, x.text]))
  const next = {}
  for (const s of splitSections(nextText)) {
    const old = before.get(s.title)
    // 内容没变：优先用记过的时间，没有就退回整篇的旧时间（不然第一次改会把所有节都盖成现在）
    if (old !== void 0 && old === s.text) {
      next[s.title] = Number(prevTimes?.[s.title]) || Number(fallback) || now
    } else {
      next[s.title] = now
    }
  }
  return next
}

// ---- 行级差异：历史里只显示真正变了的那几行 ----
//
// 一条历史可能来自整篇重发（before/after 是整篇），也可能来自 patch（是那一节）。
// 不管哪种，这里都按行比出「加了什么 / 删了什么 / 哪行改成了哪行」，
// 面板上就不用把没变的几百字全铺出来。

/**
 * 按行做 LCS 对比。
 * @returns {Array<{kind:'add'|'del'|'mod', before?:string, after?:string}>}
 */
function verbOf(changes, fallbackAction) {
  const kinds = new Set(changes.map((c) => c.kind))
  if (kinds.size === 1 && kinds.has('add')) return '添加'
  if (kinds.size === 1 && kinds.has('del')) return '删除'
  if (kinds.size > 0) return '修改'
  return fallbackAction === 'add' ? '添加' : fallbackAction === 'delete' ? '删除' : '修改'
}

export function lineDiff(before, after) {
  const a = String(before ?? '').split('\n')
  const b = String(after ?? '').split('\n')
  const n = a.length
  const m = b.length
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out = []
  let del = []
  let add = []
  const flush = () => {
    const k = Math.min(del.length, add.length)
    for (let x = 0; x < k; x++) out.push({ kind: 'mod', before: del[x], after: add[x] })
    for (let x = k; x < del.length; x++) out.push({ kind: 'del', before: del[x] })
    for (let x = k; x < add.length; x++) out.push({ kind: 'add', after: add[x] })
    del = []
    add = []
  }
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) { flush(); i++; j++ } else if (dp[i + 1][j] >= dp[i][j + 1]) { del.push(a[i++]) } else { add.push(b[j++]) }
  }
  while (i < n) del.push(a[i++])
  while (j < m) add.push(b[j++])
  flush()
  // 纯空白行不值得单独列出来
  return out.filter((x) => String(x.before ?? x.after ?? '').trim() !== '')
}
