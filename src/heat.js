// heat.js —— 遗忘曲线：一条线，一个阈值。
//
// 留存率 = e^(-闲置天数 / 半衰期)
// 半衰期 = 基准 × (1 + 重要度系数×重要度 + 访问系数×被想起次数/封顶)
//
// 【为什么只留一条曲线】两条尺子量纲要一致：
//   keep < 25% 走淘汰（只管重要度 <0.6），180 天没访问走 cold（不删）——
//   两条尺子量纲差 7 倍，26 天就把 keep 打穿了，熬到 180 天的那条早被判成 fading，cold 永远是 0。
//   一条留存率曲线的性质：
//     · importance 只决定掉多快，不决定走哪条路
//     · 没有第二套「冷冻」开关
//     · 留存率天然锁在 (0,1]，不做加法累积（否则会累到 3.x，显示「还剩 340%」）
//
// 【永不遗忘只有一条路】人点头钉住（pinned）。模型只能请求，不能自己钉。
//   钉住 = 冻结，留存率按下不值不动；解钉 = 时间基准重置到现在，满血重来，
//   所以解钉不会「钉着的时候没掉，一解开立刻过线」。

const DAY = 86_400_000
const HOUR = 3_600_000

/** 曲线参数。阈值一处定义，别处不许再写数字。 */
export const CURVE = Object.freeze({
  halfLifeBase: 60,        // 基准半衰期（天）：中性记忆闲置这么久剩 37%
  kImportance: 2.0,        // 重要度对半衰期的拉伸（importance 0~1，0.3/0.6/0.9）
  kAccess: 1.5,            // 被想起次数对半衰期的拉伸
  accessCap: 10,           // 次数封顶，防「提多了就永不忘」
  retainForget: 0.3,       // 留存率跌破它 → 搬进最近删除（软删，可恢复）
  protectHours: 24,        // 新记忆保护期，刚写的当天不淘汰
  // 五档：按「还能活多久」切，不按重要度切——重要度只影响掉多快，档位是同一条线上的位置。
  tierImportantDays: 150,
  tierNormalDays: 60,
  // 台账反悔窗口：进最近删除满这么多天还没被捡走，就物理删掉。
  // 留窗口防手滑，到期就清防膨胀——原文还在 events 留底表里，真要找还能翻回去。
  graveyardDays: 14,
})

/** 这五档的显示名。UI 和统计都从这里取，别在别处写死。 */
export const TIERS = Object.freeze({
  core: '核心',
  important: '重要',
  normal: '正常',
  fading: '快忘了',
  gone: '被遗忘',
})

/** 该条目当前半衰期（天）。只随重要度与被想起次数变长，不随时间动。 */
export function halfLifeOf(item, cfg = CURVE) {
  const imp = Math.min(1, Math.max(0, Number(item?.importance) || 0.3))
  const acc = Math.min(Math.max(0, Number(item?.accessCount) || 0), cfg.accessCap)
  return cfg.halfLifeBase * (1 + cfg.kImportance * imp + cfg.kAccess * (acc / cfg.accessCap))
}

/**
 * 最后一次被用到是什么时候。写入、被搜、被注入都算。
 *
 * createdAt 只在两个使用时间都缺的时候兜底——不能参与取最大，
 * 否则「刚写好、但上次被想起是两天前」会被 createdAt 拉回今天，同一天判定就永远成立。
 */
export function lastUsedAt(item) {
  const used = Math.max(
    Number(item?.lastTouchedAt) || 0,
    Number(item?.lastMentionedAt) || 0,
  )
  return used || Number(item?.createdAt) || 0
}

/** 当前留存率（纯读，0~1）。已钉住的不参与——调用方要看冻结值就读 frozenKeep。 */
export function keepOf(item, now = Date.now(), cfg = CURVE) {
  const last = lastUsedAt(item) || now
  const idle = Math.max(0, (now - last) / DAY)
  return Math.exp(-idle / halfLifeOf(item, cfg))
}

/** 还能活多少天：留存率掉到遗忘阈值还要多久。已经过线返回 0。 */
export function daysLeftOf(item, now = Date.now(), cfg = CURVE) {
  const k = keepOf(item, now, cfg)
  if (!(k > cfg.retainForget)) return 0
  const half = halfLifeOf(item, cfg)
  return half * Math.log(k / cfg.retainForget)
}

/**
 * 一条记忆落在哪一档。五档都在同一条曲线上，只有核心是例外（人钉住的，冻结）。
 * @returns {'core'|'important'|'normal'|'fading'|'gone'}
 */
export function tierOf(item, now = Date.now(), cfg = CURVE) {
  if (Number(item?.pinned)) return 'core'
  const k = keepOf(item, now, cfg)
  if (!(k > cfg.retainForget)) return 'gone'
  const days = daysLeftOf(item, now, cfg)
  if (days > cfg.tierImportantDays) return 'important'
  if (days > cfg.tierNormalDays) return 'normal'
  return 'fading'
}

/** 核心档的显示留存率：钉住那一刻冻住的，不随时间掉。缺值就补一个当前值。 */
export function frozenKeepOf(item, now = Date.now(), cfg = CURVE) {
  const f = Number(item?.frozenKeep)
  if (Number.isFinite(f) && f > 0) return Math.min(1, f)
  return keepOf(item, now, cfg)
}

/** 本地日期键（YYYY-MM-DD）。 */
export function dayKey(now = Date.now()) {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 记一次「被想起」。同一天只加一次次数——一天提 20 遍 ≠ 记牢 20 倍。
 *
 * 【谁算被想起】只看「有没有真的到眼前」：
 *   · 模型主动 mem_search 并且命中了        → via: 'search'
 *   · 自动召回过了注入闸门、真的进了上下文   → via: 'inject'
 *   检索命中但被注入闸门挡掉的**不算**——它一个字都没进上下文。
 *
 * 就地改传入对象，调用方负责落库。
 * @returns {number} 累计被想起次数
 */
export function touch(item, now = Date.now(), { via = 'search' } = {}) {
  if (!item) return 0
  const last = lastUsedAt(item)
  const sameDay = last > 0 && dayKey(now) === dayKey(last)
  item.lastTouchedAt = Math.max(last, now)
  item.lastMentionedAt = item.lastTouchedAt   // 老字段跟着走，别处还在读它
  if (via === 'inject') item.lastInjectedAt = now
  else item.lastSearchedAt = now
  if (!sameDay) item.accessCount = (Number(item.accessCount) || 0) + 1
  return Number(item.accessCount) || 0
}

/**
 * 写入/检索后惰性跑一遍生命周期（不用定时器）。
 *   1. 钉住的：补齐冻结值，之后不再动
 *   2. 没过保护期的新记忆：跳过
 *   3. 留存率过线 → 搬进最近删除（软删，可随时捡回来）
 *
 * @returns {{forgotten:number, frozen:number}} 各动作条数
 */
export function sweepLifecycle(db, now = Date.now(), cfg = CURVE) {
  const out = { forgotten: 0, frozen: 0 }
  const rows = db.prepare(
    `SELECT id, text, importance, pinned, frozenKeep, accessCount, createdAt,
            lastTouchedAt, lastMentionedAt
     FROM memories WHERE superseded = 0`,
  ).all()
  const bury = db.prepare(
    'INSERT INTO graveyard (originalId, text, importance, heat, reason, at) VALUES (?, ?, ?, ?, ?, ?)',
  )
  const dropVec = db.prepare('DELETE FROM vectors WHERE id = ?')
  const del = db.prepare('DELETE FROM memories WHERE id = ?')
  const freeze = db.prepare('UPDATE memories SET frozenKeep = ? WHERE id = ?')

  for (const it of rows) {
    if (Number(it.pinned)) {
      // 老数据钉住时没存冻结值：用现在的留存率补一次，从此不动
      if (!(Number(it.frozenKeep) > 0)) {
        freeze.run(keepOf(it, now, cfg), it.id)
        out.frozen++
      }
      continue
    }
    if (now - (Number(it.createdAt) || now) < cfg.protectHours * HOUR) continue
    const keep = keepOf(it, now, cfg)
    if (keep >= cfg.retainForget) continue
    bury.run(it.id, it.text, Number(it.importance) || 0.3, keep, '遗忘曲线过线（留存率低于阈值）', now)
    dropVec.run(it.id)
    del.run(it.id)
    out.forgotten++
  }
  return out
}
