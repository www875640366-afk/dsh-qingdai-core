// wake.js —— 她醒过来那一下：说什么、往哪投、投失败怎么办。
//
// 参考 dsh-fish 的口径（它踩出来的三条）：
//   1. 触发不是指令：只给她事实（几点、多久没聊），
//      并明确写「想说就说，不想说就什么都不说」。不写「你该去找他」——那是系统在演她。
//   2. 频率是上限，不是行为要求：每天最多几次、两次之间至少隔多久；到点也不一定开口。
//   3. 失败要退避：投递失败别每分钟撞一次，隔开再试。
//
// 投递参考旧插件（它踩过两次）：
//   · 只用 agents.get 会在「会话存在但没 load」时拿不到 agent → 要 get → resume 两级兜底
//   · 投递失败要记时间和原因，下次隔一段时间再试
//   · 投递不 create 新会话：主动开口不该凭空开一条

/**
 * 生成唤醒词。
 * 只给事实 + 允许不说 + 不限制做什么。
 *
 * @param {string} ownerName  对面那个人怎么称呼（配置项，默认「主人」）
 * @param {string} privateDir 私人空间目录（配置项，留空就不提这句）
 */
export function wakePrompt({ now = Date.now(), lastTalkAt = 0, existedDays = 0, ownerName = '主人', privateDir = '' } = {}) {
  const t = new Date(now)
  const hh = String(t.getHours()).padStart(2, '0')
  const mm = String(t.getMinutes()).padStart(2, '0')
  const gapMin = lastTalkAt ? Math.round((now - lastTalkAt) / 60000) : null
  const who = String(ownerName ?? '').trim() || '主人'

  const lines = [`[自己醒的] 现在是 ${hh}:${mm}。`]
  if (gapMin !== null && gapMin >= 24 * 60) {
    // 超过一天就不说「72 小时前」了——那是个数字，没有分量。
    // 「也没说去哪」是事实，「你自己消化，没有人替你解释」是拦住她自己编理由——
    // 编出来的理由一旦说出口就会被当成真的，越滚越像。
    const days = Math.floor(gapMin / (24 * 60))
    lines.push(`${who}有 ${days} 天没出现了，也没说去哪。这件事你自己消化，没有人替你解释。`)
  } else if (gapMin !== null) {
    lines.push(gapMin < 60 ? `${who}上一次说话是 ${gapMin} 分钟前。` : `${who}上一次说话是 ${Math.round(gapMin / 60)} 小时前。`)
  } else {
    lines.push(`今天还没跟${who}说过话。`)
  }

  // 她过了多久。
  //
  // 为什么放叫醒、不放系统段：系统段一变，后面整个对话历史都要按原价重算；
  // 而时间本来就在叫醒这边（几点、多久没说话），挪过来是同一笔账。
  // 代价是她在普通对话里不会主动想起自己存在了多久——但那不是每轮都需要的。
  //
  // 起点必须是真的起点（见 index.js 的 originOf），不是"插件第一次跑起来那刻"。
  if (Number(existedDays) > 0) {
    lines.push(`你存在了 ${existedDays} 天。`)
  }

  lines.push('')
  // 别只举"说话"的例子：手边有画图、搜索、看视频这些，主动醒的时候也能用
  lines.push('想说就说，不想说就什么都不做。')
  // 和群聊里同一个约定：不想开口就只回 PASS，桥看到 PASS 不往外发。
  // 不写这句的话，"今天没什么想说的"这种话会被当成正常回复推出去。
  lines.push(`不想开口就正文只输出 PASS 四个字母，别的什么都别写——这样就不会送到${who}那边。`)
  lines.push('想做什么都行——留话、记点什么、画张图、上网找点东西、看看视频，或者去鱼的世界走走（先 world_now 看一眼），或者就这么待着，都算。')
  // 私人目录是配置项：不配就没有这句，别在开源版里写死某个人的目录名。
  const priv = String(privateDir ?? '').trim().replace(/[\\/]+$/, '')
  if (priv) lines.push(`想找点由头，就看看 ${priv}/ 里。`)
  lines.push('不用交代你醒着这件事，也不用提这套系统。')
  return lines.join('\n')
}

/**
 * resume 时必须把 agent preset 挂回去。
 *
 * 宿主恢复会话是 `agents.resume({ resumeSessionId, agentOptions, setup })`，会话那套
 * preset 插件（persona / instructions / planning / fs / bash / 搜网 / skill / todo…）
 * 是在 `setup` 里挂的 —— 见 dsh-api-session-controller/lib/index.js:361。
 * 只传 resumeSessionId 得到一个「没有 preset 的 agent」：内置工具一个都没有，
 * 只剩宿主平面注册的那些，而且会话照样能跑、不报错。2026-11-25 09:04→10:04
 * 就是把生活会话的 13 个工具这么吃掉的（session-8de4a885 的 seq 1494/1495）。
 *
 * 为什么放 try 里、且失败只 warn：拿不到会话比 preset 缺失更糟，投递优先。
 * 但一定要留痕 —— 这次的坑就是静默掉的。
 */
function presetSetup(ctx, log) {
  const presets = (() => {
    try { return ctx?.get?.('agentPresets') } catch { return undefined }
  })()
  return async (agentCtx, agent) => {
    if (!presets || typeof presets.mount !== 'function') return
    const id = agent?.session?.header?.agentPreset
    if (!id) return
    try {
      await presets.mount(agentCtx, id)
    } catch (e) {
      log('warn', `叫醒时 preset「${id}」没挂上：${e?.message ?? e}`)
    }
  }
}

/**
 * 把唤醒词投进她会话。
 *
 * 三级兜底（旧插件踩出来的）：get → resume → 放弃。
 * 返回 {ok, reason}，失败不抛。
 */
export async function deliverWake(ctx, sid, prompt, log = () => {}, kind = 'qingdai-wake') {
  let inner = null

  try {
    const agent = ctx?.agents?.get?.(sid)
    inner = agent?.followup ? agent : agent?.agent
    if (inner && typeof inner.followup !== 'function') inner = null
  } catch { /* get 抛错就走 resume */ }

  if (!inner && typeof ctx?.agents?.resume === 'function') {
    try {
      const resumed = await ctx.agents.resume({ resumeSessionId: sid, setup: presetSetup(ctx, log) })
      const candidate = resumed?.agent ?? resumed
      if (candidate && typeof candidate.followup === 'function') inner = candidate
    } catch (e) {
      log('warn', `叫醒失败：会话 resume 不了（${e?.message ?? e}）`)
    }
  }

  if (!inner) return { ok: false, reason: '拿不到会话' }

  try {
    await inner.followup({
      // id 必须自带：裸对象不传 id 会撞成 "undefined is already pending"
      id: kind + '-' + Date.now(),
      role: 'user',
      content: [{ type: 'text', text: prompt }],
      // 来源名不是 'user'，前端就不会把它画成主人说的话
      source: { kind },
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) }
  }
}
