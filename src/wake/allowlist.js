// allowlist.js —— 白名单以外的会话，把鱼的世界工具从工具面里拿掉。
//
// 【为什么用 restrict 而不是只有 execute 拦】
//   restrict 是宿主原生的工具面收窄：被过滤 = 模型根本看不见这些工具，
//   连"想调"的念头都不会有。只有 execute 拦的话，模型看得见、调了被拒，
//   它会反复试、反复失败，白烧 token。
//
// 【坑：restrict 必须写成方法调用】
//   DSH 的 restrict 是类方法，内部第一行是 scopeOf(this.ctx)，依赖 this。
//   写成 `const fn = agent.ctx.tools.restrict; fn({deny})` 会把 this 弄丢，
//   报 "Cannot read properties of undefined (reading 'ctx')"，
//   再被 catch 吞成 applied:false —— 界面上完全看不出来，工具照旧可见可用。
//   所以下面一律 `tools.restrict({ deny })`，不取出来再调。

import { isWakeSession } from './session.js'

/**
 * 工具清单：分组列出来，面板上按组勾选。
 *
 * 每组写清楚「谁注册的、干什么用的」，面板上照抄这段说明。
 */
export const TOOL_GROUPS = [
  {
    title: '世界（dsh-fish-world）',
    sub: '白名单以外默认全禁',
    tools: [
      { name: 'world_now', label: '看世界', hint: '时间天气、在哪、周围有什么' },
      { name: 'world_go', label: '出门', hint: '去一个地方，路上要真实时间' },
      { name: 'world_do', label: '做事', hint: '做、买、吃、玩、扔、卖、换衣服' },
      { name: 'world_find', label: '找地方', hint: '按关键词找地点、怎么走、多久、多少钱' },
      { name: 'world_say', label: '说话', hint: '对一只鱼说话、送东西、请客' },
      { name: 'world_friends', label: '好友', hint: '加好友、处理申请、拉黑' },
      { name: 'world_feed', label: '动态', hint: '看动态、发一条、点赞' },
      { name: 'world_profile', label: '名片', hint: '看自己或别的鱼的名片' },
      { name: 'world_history', label: '翻记录', hint: '自己的时间线或和某只鱼的往来' },
      { name: 'world_update', label: '改自己', hint: '改外貌、换衣服、入住起名' },
      { name: 'world_guide', label: '说明书', hint: '世界规则：时间、钱、限制等' },
    ],
  },
  {
    title: '人格核心（本插件）',
    sub: '白名单以外默认禁（meme 已在默认清单里）；要放开就取消勾选',
    tools: [
      { name: 'core', label: '核心', hint: '写/看「人格核心」那段话，注入到系统提示词最后面；每次改都要写理由' },
      { name: 'meme', label: '找表情', hint: '按情绪或关键词找表情包，回的时候写 [表情: 名字]' },
    ],
  },
]

/**
 * 别的插件注册的「她自己的生活」工具：dsh-fish-world 的 11 个 world_*。
 * 这些不是本插件注册的，本插件的 execute 那层拦不到，只能靠工具面收窄。
 */
export const WORLD_TOOLS = TOOL_GROUPS[0].tools.map((t) => t.name)


/**
 * 默认就把这批拿掉（白名单以外会话）。
 * 世界工具是主人点名要的；meme 也是——那是她自己的东西，工作会话不该碰。
 * 要放开就在面板里取消勾选。
 */
export function defaultDeny() {
  return [...WORLD_TOOLS, 'meme']
}

/**
 * 真正给宿主用的禁用清单。
 *
 * 面板给的就是最终清单（不再叠默认），这样「不勾 = 工作会话也能用」说得出口。
 * 配置里没写（null/undefined）才回落到默认（全禁）。
 */
export function denyListOf(cfg = {}) {
  const configured = cfg.workDenyTools
  if (Array.isArray(configured)) {
    return [...new Set(configured.map(String).map((x) => x.trim()).filter(Boolean))]
  }
  return defaultDeny()
}

/**
 * 给一个会话挂工具面收窄。白名单会话不受影响。
 *
 * @param {object} agent  宿主给的 agent（有 ctx.tools）
 * @param {string} sid
 * @param {object} cfg    配置（含 workDenyTools）
 * @param {Function} log
 * @returns {{applied:boolean, denied:number, sid:string, reason?:string}}
 */
export function applyToolRestrict(agent, sid, cfg = {}, log = () => {}) {
  const id = String(sid ?? '')
  if (!id) return { applied: false, denied: 0, sid: id, reason: 'no-sid' }
  if (isWakeSession(id, cfg)) return { applied: false, denied: 0, sid: id, reason: 'allowlisted' }

  const deny = denyListOf(cfg)
  if (!deny.length) return { applied: false, denied: 0, sid: id, reason: 'nothing-to-deny' }

  try {
    const tools = agent?.ctx?.tools
    if (typeof tools?.restrict !== 'function') {
      return { applied: false, denied: 0, sid: id, reason: 'no-restrict-api' }
    }
    // 方法调用，this 必须保留 —— 见文件头那个坑。
    //
    // 【必须过滤未知工具名】宿主对 deny 是「全有或全无」：清单里有一个不存在的名字，
    //   整个 restrict() 直接抛错，一个都禁不掉（实测：配置里留着早已下线的 remember，
    //   结果 world_* 和 core/meme 全都没被挡）。
    //   所以先求交集再禁；名字写错了只影响它自己，不连累整份清单。
    let known = knownTools(tools)
    const drop = (of) => (known ? of.filter((n) => known.includes(n)) : of)
    let effective = drop(deny)
    try {
      tools.restrict({ deny: effective })
    } catch (e) {
      // 拿不到清单时的最后一条路：从报错里读「known global tools: a, b, c」再试一次
      const m = /known global tools:\s*(.+)$/s.exec(String(e?.message ?? e))
      if (!m) throw e
      known = m[1].split(',').map((s) => s.trim()).filter(Boolean)
      effective = drop(deny)
      if (!effective.length) return { applied: false, denied: 0, sid: id, reason: '清单里没有一个工具存在' }
      tools.restrict({ deny: effective })
    }
    const dropped = deny.length - effective.length
    if (dropped > 0) log(`禁用清单里有 ${dropped} 个不存在的工具名，已跳过（其余 ${effective.length} 个照禁）`)
    log(`工作会话已屏蔽 ${effective.length} 个工具（${id.slice(0, 12)}）`)
    return { applied: true, denied: effective.length, dropped, sid: id }
  } catch (e) {
    return { applied: false, denied: 0, sid: id, reason: String(e?.message ?? e) }
  }
}

/**
 * 宿主当前注册了哪些工具。拿不到就返回 null（调用方退回「不过滤」）。
 * list() 不一定有，所以还要能读 restrict 报错里的清单——两路都试。
 */
function knownTools(tools) {
  for (const fn of ['list', 'names', 'all']) {
    try {
      const v = typeof tools?.[fn] === 'function' ? tools[fn]() : null
      if (Array.isArray(v)) return v.map((t) => String(t?.name ?? t))
    } catch { /* 换个法子 */ }
  }
  return null
}

// 会话判定放在 session.js，这里转出去，方便旧代码引用。
export { isWakeSession }
