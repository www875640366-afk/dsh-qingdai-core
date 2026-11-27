// db.js —— 双库建库建表（node:sqlite 内置，零外部依赖）。
//
// 两个物理库：life/life.db（白名单会话）/ work/work.db（其余会话）。
// side 值统一用 life，磁盘库 life/life.db。路径映射见 routing.js 的 DB_DIRS/DB_NAMES。
// 路由在 routing.js，这里只管「给一个路径，开出一张结构正确的库」。
//
// 【为什么不用全局单连接】v2 的老规矩：谁要库，谁 openDb(path)。
//   这里折中一层：按路径缓存连接（同路径复用，不同库各开各的），
//   工具执行是同步短事务，复用比每轮 open/close 便宜，也不会跨库串线。
//
// 【为什么 WAL】压缩引擎（异步提炼）和工具（同步读写）可能同时碰同一个库，
//   WAL 允许读写并发；busy_timeout 防写锁撞车直接抛 SQLITE_BUSY。

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

/** 库结构版本。改表结构时 +1，并在 ensureSchema 里写迁移。 */
export const SCHEMA_VERSION = 4

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- 记忆节点表。无 kind 分类（向量精排时代分类是冗余），importance 只决定掉多快。
--
-- 【一条线】留存率 = e^(-闲置天数/半衰期)，跌破阈值就搬进 graveyard。
--   没有「按重要度免死」——0.9 也照样过线，除非人点头钉住。
--
-- heat / repeatStrength / cold 是 v3 之前那套双轨的遗留列：
--   新代码一律不读不写，留着只是因为 SQLite 删列麻烦，也更安全（不丢老数据）。
--
-- pinned 现在是**人审批过**的冻结标记（模型只能写 pinRequest 请求）。
--   frozenKeep 记钉住那一刻的留存率，之后不随时间掉。
CREATE TABLE IF NOT EXISTS memories (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  text           TEXT NOT NULL,
  importance     REAL NOT NULL DEFAULT 0.6,
  pinned         INTEGER NOT NULL DEFAULT 0,
  frozenKeep     REAL,
  pinRequest     TEXT,
  pinRequestAt   INTEGER,
  heat           REAL NOT NULL DEFAULT 1,
  repeatStrength REAL NOT NULL DEFAULT 1,
  createdAt      INTEGER NOT NULL,
  lastMentionedAt INTEGER,
  lastTouchedAt  INTEGER,
  lastSearchedAt INTEGER,
  lastInjectedAt INTEGER,
  lastAccessAt   INTEGER,
  accessCount    INTEGER NOT NULL DEFAULT 0,
  cold           INTEGER NOT NULL DEFAULT 0,
  superseded     INTEGER NOT NULL DEFAULT 0,
  supersededBy   INTEGER,
  sources        TEXT
);
CREATE INDEX IF NOT EXISTS idx_mem_active ON memories(superseded, cold);
CREATE INDEX IF NOT EXISTS idx_mem_created ON memories(createdAt);

-- 向量：id → float32 BLOB（bge-m3 dim1024）。签名在 meta.vec_sig，不匹配即清表。
-- 注入去重：哪个会话、哪些记忆已经带进上下文了。
-- 一条会话一行，十几到几十字节；压缩时按代次作废，30 天没动的自动清。
CREATE TABLE IF NOT EXISTS recall_sent (
  sid  TEXT PRIMARY KEY,
  ids  TEXT NOT NULL,          -- 逗号分隔的记忆 id
  gen  INTEGER NOT NULL DEFAULT 0,
  at   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vectors (
  id  INTEGER PRIMARY KEY,
  vec BLOB NOT NULL
);

-- 遗忘台账：被淘汰的记忆搬到这里（软删除），面板可以捡回来。
-- 陪伴场景删记忆是雷区，所以先落台账、给人 14 天反悔期（CURVE.graveyardDays），
-- 过了才真删——那时已经是「明确不要了」。手动删的也走这条路。
CREATE TABLE IF NOT EXISTS graveyard (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  originalId INTEGER,
  text       TEXT NOT NULL,
  importance REAL,
  heat       REAL,
  reason     TEXT NOT NULL,
  at         INTEGER NOT NULL
);

-- 待办账本：所有待办条目唯一的一张表，处理建议是它的一个字段。
-- 【为什么统一成一张】待办如果分表存，建议只能另开一张表按 decisionId 挂，
--   待办处理掉之后建议行会永远留着、越积越多，还得额外写清理去擦。
--   「待办即账本条目、建议是条目字段」，条目结清即收走。
--
-- kind: conflict（写新内容二选一）/ pin（钉住审批）/ write（疑似密钥待写审批）
-- payload: 各 kind 自己的字段，JSON
-- suggestion: 处理建议 JSON，字段级，不单独存表
-- state: open / resolved（同意）/ dropped（拒绝）
CREATE TABLE IF NOT EXISTS decisions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL,
  payload    TEXT NOT NULL,
  suggestion TEXT,
  state      TEXT NOT NULL DEFAULT 'open',
  at         INTEGER NOT NULL,
  settledAt  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_decisions_state ON decisions(state, at);

-- 留底表：每轮对话原文（发生过什么），与记忆层（值得记住什么）并行。
-- 默认长期保留：记忆节点靠 sources 指回这里的 seq，是溯源与纠错的唯一真值。
-- 保留多久由配置定（workRawKeepDays，只作用于工作库；0 = 不删），生活库不自动清。
CREATE TABLE IF NOT EXISTS events (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  sid    TEXT NOT NULL,
  seq    INTEGER,
  ts     INTEGER NOT NULL,
  role   TEXT NOT NULL,
  text   TEXT NOT NULL,
  source TEXT
);

-- 按时间翻原文（按年/按月筛）要走这个索引
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
-- 同一会话同一 seq 同一角色只存一条：消息事件会被反复触发（工具轮里
-- assistant/message 一步一条），没有这条唯一约束就会把同一条原文写很多遍。
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_uniq ON events(sid, seq, role);
`

/** 连接缓存：同路径复用。测试要隔离就 closeDb() 清空。 */
const cache = new Map()

/**
 * 打开（或复用）一个库连接。目录不存在会自动建。
 * @param {string} file 库文件绝对路径
 */
export function openDb(file) {
  const key = String(file ?? '').trim()
  if (!key) throw new Error('db: 缺库文件路径')
  const hit = cache.get(key)
  if (hit) return hit
  mkdirSync(dirname(key), { recursive: true })
  const db = new DatabaseSync(key)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA busy_timeout = 3000')
  ensureSchema(db)
  cache.set(key, db)
  return db
}

/** 建表 + 记结构版本。CREATE IF NOT EXISTS 就是迁移：老库缺表补表。 */
function ensureSchema(db) {
  db.exec(SCHEMA)
  // v2：被替代时记下「被谁替代」。CREATE IF NOT EXISTS 不会给老表补列，得自己补。
  addColumn(db, 'memories', 'supersededBy', 'INTEGER')
  // v5：向量补算状态。NULL/pending = 待补，synced = 已补，failed = 放弃（试满次数）。
  // 不搞队列也不搞水位：要不要补是查出来的，跟 id 顺序无关，复活老条目也不会漏。
  addColumn(db, 'memories', 'vec_state', 'TEXT')
  addColumn(db, 'memories', 'vec_attempts', 'INTEGER')
  // 老库已经有向量的行直接标 synced，别让第一次启动把全库重嵌一遍（白花钱）
  try {
    db.exec(`UPDATE memories SET vec_state = 'synced'
             WHERE vec_state IS NULL AND id IN (SELECT id FROM vectors)`)
  } catch { /* 没有 vectors 表就跳过 */ }
  // 只收录待补的行：补齐之后索引是空的，查询 O(1) 返回空，跟表多大无关。
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_mem_vec_pending ON memories(id)
             WHERE vec_state IS NULL OR (vec_state <> 'synced' AND vec_state <> 'failed')`)
  } catch { /* 老库建不上就算了，退化成普通扫描 */ }

  // v4：一条线的遗忘曲线 + 钉住审批。老库这三列没有，补上后回填。
  addColumn(db, 'memories', 'frozenKeep', 'REAL')
  addColumn(db, 'memories', 'pinRequest', 'TEXT')
  // 台账存整行快照：撤销时原样放回去（分数、新鲜度、钉住状态都不打折）
  addColumn(db, 'graveyard', 'snapshot', 'TEXT')
  addColumn(db, 'memories', 'pinRequestAt', 'INTEGER')
  addColumn(db, 'memories', 'lastTouchedAt', 'INTEGER')
  addColumn(db, 'memories', 'lastSearchedAt', 'INTEGER')
  addColumn(db, 'memories', 'lastInjectedAt', 'INTEGER')
  // 老库的「最后被用到」只有 lastMentionedAt（还是被 heat 那套加过的），拿它当基准。
  // 只填 NULL 的，幂等；新写入自己会写 lastTouchedAt。
  try {
    db.exec(`UPDATE memories SET lastTouchedAt = COALESCE(lastMentionedAt, lastAccessAt, createdAt)
             WHERE lastTouchedAt IS NULL`)
  } catch { /* 老库表结构怪就算了 */ }
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version')
  if (!row) {
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('schema_version', String(SCHEMA_VERSION))
  } else if (Number(row.value) < SCHEMA_VERSION) {
    db.prepare('UPDATE meta SET value = ? WHERE key = ?').run(String(SCHEMA_VERSION), 'schema_version')
  }
}

/** 补一列（幂等）。迁移只加不删，老数据该是 NULL 就是 NULL。 */
function addColumn(db, table, column, type) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all()
    if (!cols.some((c) => String(c?.name) === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
    }
  } catch { /* 补不上就算了：缺列时读取侧自己兜底 */ }
}

/** 同步短事务：BEGIN IMMEDIATE 防写写并发，出错回滚再抛。 */
const inTx = new WeakSet()

/**
 * 包一个事务。
 *
 * 已经在事务里就直接执行——SQLite 不支持嵌套 BEGIN，不防的话
 * 「sweep 里调 forgetMemory」这种组合会抛 cannot start a transaction within a transaction。
 * 外层的事务负责提交，内层当普通调用。
 */
export function withTransaction(db, fn) {
  if (inTx.has(db)) return fn()
  inTx.add(db)
  try {
    db.exec('BEGIN IMMEDIATE')
    const value = fn()
    db.exec('COMMIT')
    return value
  } catch (e) {
    try { db.exec('ROLLBACK') } catch { /* 已经回滚了就算了 */ }
    throw e
  } finally {
    inTx.delete(db)
  }
}

/** 关掉指定库（或全部）。测试隔离、换库文件时用。 */
export function closeDb(file = null) {
  if (file === null) {
    for (const db of cache.values()) { try { db.close() } catch { /* 关不上算了 */ } }
    cache.clear()
    return
  }
  const key = String(file)
  const db = cache.get(key)
  if (db) {
    try { db.close() } catch { /* 同上 */ }
    cache.delete(key)
  }
}
