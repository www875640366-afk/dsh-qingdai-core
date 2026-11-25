// mount.js —— 按会话挂东西：白名单判定 + 工具面收窄 + 记「主人最后说话」。
//
// 只在会话挂载那一刻做一次。改配置要重启才生效，因为 restrict 不可撤销
// （宿主那边限制是叠加的，没有「解除」这个动作）。
//
// 【为什么只在 agent/created 时挂】
//   插件启动时 agents.list() 通常是空的（会话是懒加载的），
//   所以真正干活的是 agent/created 事件。启动扫一次只是兜底。

import { applyToolRestrict } from './allowlist.js'
import { isWakeSession, lastTalkAtOf } from './session.js'
import { coreSection } from './core.js'

/**
 * 创建一个挂载器。
 *
 * @param {object} opts
 * @param {object} opts.store        状态存储（记 lastTalkAt 用）
 * @param {Function} opts.getCfg      取当前配置
 * @param {Function} opts.log
 * @returns {{mountAgent:Function, mountAll:Function, forget:Function, remountAll:Function, diag:Function}}
 */
export function createMounter({ ctx, store, getCfg, dataDir, log = () => {} }) {
  const mounted = new Set()
  const diag = []          // 诊断：每次收窄的结果，面板和状态文件都能看

  const record = (entry) => {
    try {
      diag.push(entry)
      if (diag.length > 50) diag.shift()
      store.update((s) => { s.diag = diag.slice(-20) })
    } catch { /* 诊断记不上不影响 */ }
  }

  /**
   * 挂一个会话。
   * @param {object} agent 宿主给的 agent
   */
  const mountAgent = (agent) => {
    const sid = String(agent?.session?.id ?? agent?.session?.header?.id ?? '')
    if (!sid) return

    // 「刚聊过」的时间：挂载时先算一次，之后每来一条消息都更新一次。
    //   只在挂载时算是不够的（实测：她 08:43 回完话，记的还是 08:12）——
    //   挂载只发生一次，后面的新消息它看不到。
    //
    // 【只认白名单会话】这里量的是「跟主人多久没聊」，不是「这个进程多久没干活」。
    //   工作会话里跟模型说一天话，不该把她的主动开口一直顶回去——
    //   以前没有这道判断，任何会话的消息都会刷新 lastTalkAt，于是「刚聊过」
    //   永远成立，主动开口永远不触发。
    const touchTalk = () => {
      try {
        if (!isWakeSession(sid, getCfg())) return
        const ts = lastTalkAtOf(agent.session)
        if (ts > 0) {
          const cur = Number(store.get().lastTalkAt) || 0
          if (ts > cur) store.update((s) => { s.lastTalkAt = ts })
        }
      } catch { /* 取不到不影响别的 */ }
    }
    touchTalk()
    // 会话里每来一条消息（主人说的、她回的）都刷新一次
    try {
      agent.ctx?.on?.('session/event', () => touchTalk())
    } catch { /* 挂不上就算了，下次挂载还会再算 */ }

    if (mounted.has(sid)) return
    mounted.add(sid)

    // ---- 人格核心：注入到系统提示词最后面 ----
    //
    // 挂在 agent 上（不是全局）：这样才知道是哪个会话。
    // order 压轴（11000 > DSH 官方最大 10200），读完落在眼里的最后一件就是它。
    // text 是函数：每次组装现算，她改了内容下一轮就跟着变，不用重启。
    try {
      const sp = agent?.ctx?.systemPrompt ?? null
      if (sp && typeof sp.section === 'function') {
        sp.section(coreSection(dataDir, sid, (s) => isWakeSession(s, getCfg())))
      } else {
        log(`核心段挂不上（${sid.slice(0, 12)}）：这个会话没有 systemPrompt`)
      }
    } catch (e) {
      // 插件被重复加载时同名段已在 scope 里，宿主会抛 "already registered"。
      // 这是正常的（第一次已经挂上了），不当失败——日志里刷成红字反而遮住真问题。
      const msg = String(e?.message ?? e)
      if (!/already registered/.test(msg)) log(`核心段挂不上（${sid.slice(0, 12)}）：${msg}`)
    }

    const r = applyToolRestrict(agent, sid, getCfg(), log)
    record({ at: Date.now(), sid, applied: r.applied, denied: r.denied, reason: r.reason ?? null })
    if (r.applied) {
      log(`工具面收窄：${sid.slice(0, 12)} 禁 ${r.denied} 个`)
    } else if (r.reason && r.reason !== 'allowlisted') {
      log(`工具面收窄跳过（${sid.slice(0, 12)}）：${r.reason}`)
    }
  }

  /**
   * 扫一遍现存的会话。
   * 启动时通常扫不到几个（会话懒加载），真正的活靠 agent/created。
   */
  const mountAll = () => {
    const info = { at: Date.now(), phase: 'mountAll' }
    try {
      const svc = ctx?.agents ?? ctx?.get?.('agents') ?? null
      info.hasSvc = Boolean(svc)
      const agents = svc?.list?.() ?? []
      info.agentCount = agents.length
      info.sids = agents.map((a) => String(a?.session?.id ?? a?.session?.header?.id ?? '?'))
      for (const a of agents) {
        try { mountAgent(a) } catch (e) { info.err = String(e?.message ?? e) }
      }
    } catch (e) {
      info.fatal = String(e?.message ?? e)
    }
    try {
      store.update((s) => {
        if (!Array.isArray(s.bootDiag)) s.bootDiag = []
        s.bootDiag.push(info)
        if (s.bootDiag.length > 10) s.bootDiag.shift()
      })
    } catch { /* 记不上不影响 */ }
    return info
  }

  return {
    mountAgent,
    mountAll,
    /** 会话没了就从名单里去掉，下次再出现会重新挂。 */
    forget: (sid) => { mounted.delete(String(sid ?? '')) },
    /** 白名单改了：清空名单重扫一遍。 */
    remountAll: () => { mounted.clear(); return mountAll() },
    diag: () => ({ entries: [...diag], mountedCount: mounted.size }),
  }
}
