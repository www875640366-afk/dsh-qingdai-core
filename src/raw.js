// raw.js —— 原文库（events）：翻、按会话看、认孤儿、清孤儿。
//
// 【和记忆的区别】记忆节点是「值得记住什么」，原文是「当时到底怎么说的」。
// 原文默认长期保留——记忆节点的 sources 指回这里的 seq，删早了就溯源断了。
// 实际保留多久由 workRawKeepDays 定（工作库按天清，0 = 不删）；生活库不自动删。
//
// 【什么时候会删】
//   1. 孤儿会话：会话目录都没了（$DSH_HOME/sessions/<桶>/<sid>/ 不在了），
//      那些原文除了占地方没别的用处，对应记忆的溯源本来也翻不到。
//   2. 工作库超过 workRawKeepDays 的：启动时按天清，0 = 不删。
//   3. 面板上手动清。
//
// 【生活会话不自动删】换会话要保连续性；只要会话还在，默认一条不动。
//   真的删掉生活会话时才清，跟工作会话一个规则。

import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 扫一遍会话目录，返回「还活着的 sid」集合。
 * 目录形状：<sessionsRoot>/<桶目录>/<session-id>/…
 * 扫不到就返回空集——**空集代表「不知道」，调用方不要拿它当「全是孤儿」**。
 */
export function liveSessions(sessionsRoot) {
  const out = new Set()
  if (!sessionsRoot || !existsSync(sessionsRoot)) return out
  try {
    for (const bucket of readdirSync(sessionsRoot, { withFileTypes: true })) {
      if (!bucket.isDirectory()) continue
      const dir = join(sessionsRoot, bucket.name)
      for (const sess of readdirSync(dir, { withFileTypes: true })) {
        if (sess.isDirectory()) out.add(sess.name)
      }
    }
  } catch { /* 读不动就当扫不到 */ }
  return out
}

/** 一侧原文库的体量：条数、正文字节、最早最晚时间。 */
export function rawStats(db) {
  const one = (sql) => {
    try { return db.prepare(sql).get() ?? {} } catch { return {} }
  }
  const r = one('SELECT COUNT(*) AS n, SUM(LENGTH(text)) AS b, MIN(ts) AS a, MAX(ts) AS b2 FROM events')
  return {
    count: Number(r.n) || 0,
    bytes: Number(r.b) || 0,
    firstAt: Number(r.a) || 0,
    lastAt: Number(r.b2) || 0,
  }
}

/** 按会话分组：每个 sid 有多少条、多大、时间跨度。 */
export function rawBySession(db) {
  try {
    return db.prepare(
      `SELECT sid, COUNT(*) AS n, SUM(LENGTH(text)) AS b, MIN(ts) AS a, MAX(ts) AS b2
       FROM events GROUP BY sid ORDER BY MAX(ts) DESC`,
    ).all().map((r) => ({
      sid: String(r.sid ?? ''),
      count: Number(r.n) || 0,
      bytes: Number(r.b) || 0,
      firstAt: Number(r.a) || 0,
      lastAt: Number(r.b2) || 0,
    }))
  } catch {
    return []
  }
}

/**
 * 翻原文。按时间倒序（最近的在上）。
 * @param {{q?:string, sid?:string, limit?:number, offset?:number}} opts
 */
export function listEvents(db, { q = '', sid = '', year = 0, month = 0, limit = 50, offset = 0 } = {}) {
  const where = []
  const args = []
  if (sid) { where.push('sid = ?'); args.push(String(sid)) }
  if (q) {
    // LIKE 的通配符要转义，不然搜一个 % 就把整表捞出来
    where.push("text LIKE ? ESCAPE '\\'")
    args.push('%' + String(q).replace(/[%_\\]/g, (c) => '\\' + c) + '%')
  }
  // 按年月筛：原文永久保留，靠时间范围翻，不靠删
  const y = Number(year) || 0
  const m = Number(month) || 0
  if (y >= 1970 && y <= 9999) {
    if (m >= 1 && m <= 12) {
      const from = new Date(y, m - 1, 1).getTime()
      const to = new Date(y, m, 1).getTime()
      where.push('ts >= ? AND ts < ?'); args.push(from, to)
    } else {
      const from = new Date(y, 0, 1).getTime()
      const to = new Date(y + 1, 0, 1).getTime()
      where.push('ts >= ? AND ts < ?'); args.push(from, to)
    }
  }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : ''
  const lim = Math.max(1, Math.min(200, Number(limit) || 50))
  const off = Math.max(0, Number(offset) || 0)
  try {
    const total = Number(db.prepare(`SELECT COUNT(*) AS n FROM events ${clause}`).get(...args)?.n) || 0
    const rows = db.prepare(
      `SELECT id, sid, seq, ts, role, text FROM events ${clause}
       ORDER BY ts DESC, id DESC LIMIT ? OFFSET ?`,
    ).all(...args, lim, off).map((r) => ({
      id: Number(r.id),
      sid: String(r.sid ?? ''),
      seq: r.seq == null ? null : Number(r.seq),
      ts: Number(r.ts) || 0,
      role: String(r.role ?? ''),
      // 列表里只给个摘要，点开才要全文——一屏塞几千字的原文没法看
      text: String(r.text ?? ''),
    }))
    return { ok: true, total, rows, limit: lim, offset: off }
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e), rows: [], total: 0 }
  }
}

/**
 * 找孤儿会话：库里有原文、但会话目录已经不在了的 sid。
 *
 * 【live 为空集时一律当作「不知道」】扫不到 sessions 目录（权限、路径变、
 * 隔离环境）时不能把所有会话都判成孤儿——那等于一键清空原文库。
 *
 * @param {Set<string>} live liveSessions() 的结果
 */
export function orphanSessions(db, live) {
  if (!(live instanceof Set) || live.size === 0) {
    return { ok: false, reason: '扫不到会话目录，不判断孤儿（防误删）', rows: [] }
  }
  const rows = rawBySession(db).filter((r) => r.sid && !live.has(r.sid))
  return { ok: true, rows, bytes: rows.reduce((n, r) => n + r.bytes, 0), count: rows.reduce((n, r) => n + r.count, 0) }
}

/**
 * 删完要 VACUUM，不然 SQLite 只是把页标成空闲，文件一点没瘦。
 * 库小的时候是毫秒级；大了就慢，所以失败不影响删除本身。
 */
function vacuumQuietly(db) {
  try { db.exec('VACUUM'); return true } catch { return false }
}

/**
 * 清掉指定会话的原文。
 *
 * 【删完记得 VACUUM】SQLite 的 DELETE 只把页放进 freelist，文件大小不变。
 * decant 的文档把这条写得很直白：删了不 vacuum，磁盘上还是那么大。
 *
 * @param {string[]} sids
 * @returns {{ok:boolean, deleted:number, sessions:number, vacuumed:boolean}}
 */
/**
 * 原文有哪些年月：前端做「按年/按月」的选择器用。
 * 只返回有原文的年月，空月份不占位置。
 */
export function rawMonths(db) {
  try {
    const rows = db.prepare(
      "SELECT strftime('%Y', ts/1000, 'unixepoch', 'localtime') AS y, " +
      "strftime('%m', ts/1000, 'unixepoch', 'localtime') AS m, COUNT(*) AS n " +
      'FROM events GROUP BY y, m ORDER BY y DESC, m DESC',
    ).all()
    return rows.map((r) => ({ year: Number(r.y), month: Number(r.m), count: Number(r.n) }))
      .filter((x) => x.year > 1970)
  } catch { return [] }
}

/**
 * 按天清原文。原文是给「压缩后溯源」用的，太久远的压不到、也翻不到。
 *
 * 只工作在**工作库**上调——生活库的原文是陪伴记录，不按天数删。
 *
 * @returns {number} 删了几条
 */
export function pruneEvents(db, { keepDays = 180, now = Date.now() } = {}) {
  const days = Number(keepDays) || 0
  if (!(days > 0)) return 0
  const cut = now - days * 86_400_000
  try {
    const r = db.prepare('DELETE FROM events WHERE ts < ?').run(cut)
    return Number(r.changes) || 0
  } catch { return 0 }
}

export function purgeSessions(db, sids) {
  const clean = [...new Set((Array.isArray(sids) ? sids : [sids])
    .map((x) => String(x ?? '').trim()).filter(Boolean))]
  if (!clean.length) return { ok: false, reason: '没指定会话', deleted: 0, sessions: 0 }
  const del = db.prepare('DELETE FROM events WHERE sid = ?')
  let deleted = 0
  let sessions = 0
  for (const sid of clean) {
    const r = del.run(sid)
    const n = Number(r.changes) || 0
    if (n > 0) { deleted += n; sessions++ }
  }
  const vacuumed = deleted > 0 ? vacuumQuietly(db) : false
  return { ok: true, deleted, sessions, vacuumed }
}
