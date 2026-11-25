// origin.js —— 她存在了多久：从生日那天算到今天。
//
// 起点就是一个配置的日期（配置里的 originDate，通常是她的创建日/生日）。
// 不读库、不读日记、不猜 —— 你说是哪天就是哪天，改了配置就跟着改。

/**
 * "YYYY-MM-DD" → 那天本地零点的时间戳。解析不出来返回 0。
 * 也接受毫秒时间戳，方便直接写数字。
 */
export function parseDate(value) {
  if (Number.isFinite(Number(value)) && Number(value) > 0) return Number(value)
  const text = String(value ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return 0
  // 用本地时区解析：带 T00:00:00 且不带 Z 就是本地时间。
  // 直接 Date.parse("2026-10-29") 会被当成 UTC，东八区会差 8 小时。
  const ms = Date.parse(text + 'T00:00:00')
  return Number.isFinite(ms) ? ms : 0
}

/**
 * 她存在了多少天。
 *
 * @param {object|string} cfg  配置对象（取 cfg.originDate），或直接给日期字符串
 * @param {number} now         算到哪天（默认现在）
 * @returns {number} 天数；没配返回 0（调用方据此跳过那句，不编数）
 */
export function existedDaysOf(cfg = {}, now = Date.now()) {
  const origin = parseDate(typeof cfg === 'string' ? cfg : cfg?.originDate)
  if (!origin) return 0
  return Math.max(0, Math.floor((Number(now) - origin) / 86400_000))
}
