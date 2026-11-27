// gates.js —— 判定门：到点了，该不该叫醒她。
//
// 【顺序就是流程】按主人定的顺序一道一道过，任何一道不过就到此为止：
//   0. 总开关
//   1. 是不是睡觉时间            —— 睡着就不打扰
//   2. 一天开了几次              —— 到上限就停
//   3. 多久没聊天                —— 刚聊过就别凑上去
//   4. 上一轮说完了没            —— 还在跑就别再投一条
// 全过 → 叫醒。没全过 → 安静待着，不算失败。
//
// 【没有攒劲】这里不攒任何数值，不看情绪，不看"想不想"。
// 只看时间和频率，判定完就直接出结果——每次到点都是独立的一次判断。

/**
 * 某个时刻在不在睡觉时段。
 * 支持跨零点（比如 23 睡、9 醒）。
 */
export function isQuietHour(now, quietStart = 23, quietEnd = 9) {
  const hour = new Date(now).getHours()
  const start = Number(quietStart)
  const end = Number(quietEnd)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false
  if (start === end) return false                 // 起睡同一时刻 = 不设免打扰
  return start > end
    ? hour >= start || hour < end                  // 跨零点
    : hour >= start && hour < end
}

/**
 * 过门。顺序就是流程，任何一道不过就停。
 *
 * 【为什么没有「两次间隔」】这是刻意的，不是漏了。
 *   每 wakeCheckMinutes 分钟本来就只判一次，加上「多久没聊」和「一天几次」，
 *   频率已经在自然的节奏里被框住了。再多一道「上次开口刚过 N 分钟」，
 *   只会出现「该开口的时机到了、但闸门说还要等」这种没有意义的状态。
 *   要降频改 wakeCheckMinutes 或 wakePerDay，别加闸门。
 *
 * @param {object} p
 * @param {number} p.now
 * @param {boolean} p.enabled          总开关
 * @param {number} p.quietStart        几点睡
 * @param {number} p.quietEnd          几点醒
 * @param {number} p.silentMinutes     多久没聊才可能开口
 * @param {number} p.wakePerDay        一天最多开几次
 * @param {number} p.todayCount        今天已经开了几次
 * @param {number} p.lastTalkAt        主人上次真说话（0 = 没记过）
 * @param {boolean} p.busy             她上一轮是不是还没跑完
 * @returns {{open:boolean, blocked:string|null, reason:string}}
 *   blocked 是给日志和面板看的机器名，reason 是给人看的一句话。
 */
export function gates({
  now = Date.now(),
  enabled = true,
  quietStart = 23,
  quietEnd = 9,
  silentMinutes = 360,
  wakePerDay = 6,
  todayCount = 0,
  lastTalkAt = 0,
  busy = false,
} = {}) {
  const blocked = (name, reason) => ({ open: false, blocked: name, reason })

  // 0) 总开关
  if (enabled === false) return blocked('disabled', '主动开口关着')

  // 1) 睡觉时间
  if (isQuietHour(now, quietStart, quietEnd)) {
    return blocked('quiet', `${quietStart}–${quietEnd} 点是睡觉时间`)
  }

  // 2) 今天开够了
  const cap = Number(wakePerDay) > 0 ? Number(wakePerDay) : 6
  if (Number(todayCount) >= cap) return blocked('daily-cap', `今天已经开了 ${todayCount} 次（上限 ${cap}）`)

  // 3) 多久没聊
  const silent = Number(silentMinutes) > 0 ? Number(silentMinutes) : 360
  const talk = Number(lastTalkAt) || 0
  // 0 = 从来没记到主人在说话。这种情况要**跳过**判定，
  // 于是插件刚装好、5 秒后的 boot wake 就可能立刻开口。没记录不是「聊完了」，
  // 是「还不知道」，这种时候宁可安静：面板上点一下就能手动触发。
  if (talk <= 0) return blocked('no-talk-record', '还没记到主人在说话，先不主动开口')
  if (now - talk < silent * 60_000) {
    const gapMin = Math.max(0, Math.round((now - talk) / 60_000))
    return blocked('chatting', `刚聊过（${gapMin} 分钟前），还没到 ${silent} 分钟`)
  }

  // 4) 上一轮还没说完
  // 以前没有这道：判定门只看「多久没聊」，不知道她手边正忙着调工具。
  // 于是 10:04 刚醒、还在 world_go / world_now 一路跑，10:09 判定门又全过，
  // 又投一条「[自己醒的]」进去，堆在队列里，最后被 cancel 掉。
  // 主人看到的就是「上一轮还没回复正文，下一轮照样触发」。
  if (busy) return blocked('busy', '上一轮还在跑，等它收尾再叫')

  return { open: true, blocked: null, reason: '过门了' }
}
