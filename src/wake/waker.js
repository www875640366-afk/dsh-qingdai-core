// waker.js —— 一次主动回合：看鱼的世界 → 过判定门 → 投提示词。
//
// 流程是固定的，顺序不能乱：
//
//   1. 先看鱼的世界有没有新消息
//        有 → 拼【鱼的世界】提示词注入，这一轮结束（不往下走）
//        没有/连不上/没密钥 → 安静地继续往下
//   2. 过判定门（gates）：总开关 → 睡觉时间 → 今天几次 → 多久没聊 → 上一轮跑完了没
//        任何一道不过 → 安静待着，不算失败
//   3. 全过 → 拼 [自己醒的] 提示词注入
//
// 【为什么先看鱼的世界】外面有人找她，比她自己攒劲更重要。
// 面板上「鱼的世界」开关关掉就整段跳过，直接走原来的流程。
//
// 【鱼的世界不占开口配额】它叫醒后不写 lastProactiveAt、不占 wakeCount。
// 有人找她 ≠ 她自己想说话，两件事分开算。它自己的节流在 cursor 上。

import { checkFishWorld } from './fishworld.js'
import { gates } from './gates.js'
import { wakePrompt, deliverWake } from './wake.js'
import { existedDaysOf } from './origin.js'
import { wakeCountToday, bumpWakeCount } from './storage.js'
import { targetSession, isBusySession } from './session.js'

/**
 * 创建一个叫醒器。
 *
 * @param {object} opts
 * @param {object} opts.ctx         宿主 ctx（要 agents、logger）
 * @param {object} opts.store       状态存储
 * @param {object} opts.getCfg      取当前配置
 * @param {string} opts.dataDir     状态与 cursor 所在目录
 * @param {Function} opts.log
 * @param {Function} opts.warn
 */
export function createWaker({ ctx, store, getCfg, dataDir, log = () => {}, warn = () => {} }) {
  let inFlight = null
  let lastFailAt = 0

  const run = async () => {
    const cfg = getCfg()
    const now = Date.now()

    // 白名单为空：谁都不叫。这是「只影响白名单」的硬边界。
    const sid = targetSession(cfg)
    if (!sid) return { acted: false, reason: 'no-target' }

    // 上一轮还没跑完就什么都别投 —— 鱼的世界那条也算。
    // 判定门里也有一道（gates 的第 4 道），但鱼的世界走在判定门之前，
    // 光靠那道拦不住它，所以这里先挡一次。
    if (isBusySession(ctx, sid)) {
      log('没开口：上一轮还在跑')
      return { acted: false, reason: 'busy' }
    }

    // ---- 第一步：鱼的世界 ----
    const fishCooling = lastFailAt > 0 && now - lastFailAt < 10 * 60_000
    if (cfg.fishWorld !== false && !fishCooling) {
      try {
        const fish = await checkFishWorld({
          dataDir,
          now,
          key: cfg.fishWorldKey || undefined,
          baseUrl: cfg.fishWorldBaseUrl || undefined,
        })
        if (fish.awake && fish.prompt) {
          const sent = await deliverWake(ctx, sid, fish.prompt, (lvl, msg) => {
            if (lvl === 'warn') warn(msg)
          })
          if (sent.ok) {
            lastFailAt = 0
            // 【刻意不写 lastProactiveAt、不占 wakeCount】
            log(`鱼的世界：有 ${fish.count ?? 0} 条动静，已叫醒`)
          } else {
            lastFailAt = now
            warn(`鱼的世界投递失败：${sent.reason}`)
          }
          return { acted: true, kind: 'fish', count: fish.count ?? 0 }
        }
        if (fish.reason && fish.reason !== 'nothing-new' && fish.reason !== 'first-run') {
          warn(`鱼的世界没看成：${fish.reason}`)
        }
      } catch (e) {
        warn(`鱼的世界检查异常：${e?.message ?? e}`)
      }
    }

    // ---- 第二步：过判定门 ----
    const state = store.get()
    const gate = gates({
      now,
      enabled: cfg.enabled,
      quietStart: cfg.quietStart,
      quietEnd: cfg.quietEnd,
      silentMinutes: cfg.silentMinutes,
      wakePerDay: cfg.wakePerDay,
      todayCount: wakeCountToday(state, now),
      lastTalkAt: Number(state.lastTalkAt) || 0,
      busy: isBusySession(ctx, sid),
    })
    if (!gate.open) {
      log(`没开口：${gate.reason}`)
      return { acted: false, reason: gate.blocked }
    }

    // ---- 第三步：投提示词 ----
    const prompt = wakePrompt({
      now,
      lastTalkAt: Number(state.lastTalkAt) || 0,
      existedDays: existedDaysOf(cfg, now),
      ownerName: cfg.ownerName,
      privateDir: cfg.privateDir,
    })
    const sent = await deliverWake(ctx, sid, prompt, (lvl, msg) => {
      if (lvl === 'warn') warn(msg)
    })
    if (!sent.ok) {
      lastFailAt = now
      warn(`主动投递失败：${sent.reason}`)
      return { acted: false, reason: 'deliver-failed' }
    }

    lastFailAt = 0
    store.update((s) => {
      s.lastProactiveAt = now
      bumpWakeCount(s, now)
    })
    log(`主动开口：醒了，已投递（今天第 ${wakeCountToday(store.get(), now)} 次）`)
    return { acted: true, kind: 'wake' }
  }

  /**
   * 跑一轮。并发调用只跑一个，第二个等第一个的结果。
   *
   * 【坑】不能写成 `inFlight = (async () => {...})()`：
   *   IIFE 若同步跑到 finally，null 会先写进去，随后外层又用 Promise 覆盖，
   *   inFlight 永远为真，之后每一轮都被挡掉 —— 插件看着正常却再也不开口。
   *   所以先存局部 run，再赋值，最后 await。
   */
  const tryWake = async () => {
    if (inFlight) return inFlight
    const cfg = getCfg()
    if (cfg.enabled === false) return
    // 退避只作用于「鱼的世界」那一步，见 run() 里的判断。
    // 以前在这里整体 return，结果鱼那边投递失败一次，正常的主动开口也被连带停 10 分钟。

    const promise = (async () => {
      try {
        return await run()
      } catch (e) {
        warn(`主动回合异常：${e?.message ?? e}`)
        return { acted: false, reason: 'error' }
      }
    })()

    inFlight = promise
    try {
      return await promise
    } finally {
      if (inFlight === promise) inFlight = null
    }
  }

  return { tryWake }
}
