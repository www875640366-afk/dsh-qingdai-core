// tools.js —— 三个模型工具的定义与执行（纯逻辑，不碰宿主）。
//
// 三个工具，多一个都不加：
//   mem_write   写记忆节点（importance 分档，0.9 自动 pin）
//   mem_search  查记忆节点（向量 + 词面；embed 挂了降级关键词）
//   raw_memory  查留底原话（记忆的出处、纠错真值）
//
// 治理四件套（health/scan/confirm/promote）收进面板按钮，不进模型工具面——
// 模型日常只需要「记、查、翻原文」。
//
// render 铁律（照 wake tools.js）：
//   1. 必须把正文带出来，不许只报条数
//   2. 没内容时明确说，不许返回空字符串假装成功

import { memWrite as memWriteLocal, memSearch as memSearchLocal, SEARCH_DEFAULTS } from './memory.js'
import { queryEvents as queryEventsLocal } from './turn.js'

/** mem_write：写一条记忆节点。anchor 是出处（会话 + 这一轮的起止），由调用方机械填。 */
export function runMemWrite(deps, args = {}) {
  const { db, now, anchor } = deps
  return memWriteLocal(db, args, { now, anchor })
}

/** mem_search：查记忆节点。有精排就精排（融合分），没有就纯余弦双闸。 */
export async function runMemSearch(deps, args = {}) {
  const { db, vectors, cosine, queryVec, now, rerank, cfg } = deps
  const limit = Math.max(1, Math.min(20, Number(args.limit) || 6))
  // 有精排时放宽粗排闸：粗排只是噪音底，判定交给 reranker
  const gate = rerank ? { ...SEARCH_DEFAULTS, ...(cfg || {}), minSem: 0.5 } : cfg
  const base = memSearchLocal(db, { ...args, limit: limit * 2 }, { now, vectors, cosine, queryVec, cfg: gate })
  if (!base?.ok || !base.hits?.length || typeof rerank !== 'function') return base

  try {
    const rs = await rerank(String(args.query ?? ''), base.hits.map((h) => h.text))
    if (Array.isArray(rs) && rs.length) {
      const rel = new Map(rs.map((x) => [Number(x.index), Number(x.score) || 0]))
      const minRel = 0.02   // reranker 原始分的纯噪音硬底
      const fused = base.hits
        .map((h, i) => ({ ...h, rel: rel.has(i) ? rel.get(i) : 0 }))
        .filter((h) => h.rel >= minRel)
        .map((h) => ({ ...h, score: Number((0.55 * h.rel + 0.45 * h.score).toFixed(3)), confidence: h.rel }))
        .sort((a, b) => b.score - a.score)
      if (fused.length) {
        const out = { ok: true, hits: fused.slice(0, limit), reranked: true }
        out.advice = adviceOf(fused[0].rel)
        return out
      }
      // 精排把结果全滤光：通常是对不上（或模型降级）——退回粗排，但标注
      return { ...base, hits: base.hits.slice(0, limit), reranked: false, degradedRerank: true }
    }
  } catch { /* 精排失败退回粗排分 */ }
  return { ...base, hits: base.hits.slice(0, limit) }
}

/** 出处：sources 里存的是 {sid,fromTs,toTs}，给模型看的是「哪一天哪一刻」。 */
function whereOf(sources) {
  if (!sources) return ''
  try {
    const o = JSON.parse(String(sources))
    if (o && Number.isFinite(Number(o.fromTs))) {
      const d = new Date(Number(o.fromTs))
      const p = (n) => String(n).padStart(2, '0')
      return ` · 出处 ${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
    }
  } catch { /* 老格式（seq 数组）不显示 */ }
  return ''
}

/** 置信提示（旧插件同款分档）：告诉模型敢不敢直接用。 */
function adviceOf(relMax) {
  if (relMax >= 0.5) return '相关度较高，可以直接用。'
  if (relMax >= 0.1) return '相关度中等，用之前自己核一下是不是真的在说这件事。'
  return '相关度偏低（可能只是字面擦边），不确定就换关键词再搜一次。'
}

/**
 * raw_memory：查留底原话。
 *
 * 库由路由决定（参数里没有库）。两个库都跨会话——会话同一时间只会有一个，
 * 按时间排就是真实先后。sid 仍然存着（去重、溯源用），但不参与查询过滤。
 */
export function runRawMemory(deps, args = {}) {
  const { db, sid, crossSession = false } = deps
  return queryEventsLocal(db, { sid, ...args, crossSession })
}

/**
 * 工具参数 → JSON Schema。**两处注册共用这一份**（记忆工具 / 开口工具）。
 *
 * 两处参数形状必须一致：
 *   记忆那处认 items 不认 enum，简写参数一律没有必填；
 *   开口那处认 enum 不认 items，简写参数必填第一个。
 * 两套并存意味着「同样的 params 写法，走哪条路得到不同的 schema」，迟早出错。
 *
 * 两种写法都认：
 *   简写  { action: 'string' }                                 → 老写法，约定第一个必填
 *   完整  { text: { type, description, required, enum, items } }
 */
export function paramsToSchema(params = {}) {
  const defs = Object.entries(params ?? {})
  const isObj = (t) => Boolean(t) && typeof t === 'object'
  return {
    type: 'object',
    properties: Object.fromEntries(defs.map(([k, t]) => {
      if (!isObj(t)) return [k, { type: t }]
      const prop = { type: t.type ?? 'string' }
      if (t.description) prop.description = t.description
      if (Array.isArray(t.enum) && t.enum.length) prop.enum = t.enum
      if (t.items) prop.items = t.items
      return [k, prop]
    })),
    // 只要有一个参数写成完整形式，就整体按 required:true 算（可以是空的）；
    // 全是简写的老工具，仍旧第一个必填。
    required: defs.some(([, t]) => isObj(t))
      ? defs.filter(([, t]) => isObj(t) && t.required).map(([k]) => k)
      : defs.map(([k]) => k).slice(0, 1),
  }
}

/**
 * 三个工具的定义。
 *
 * 描述里要提「谁」的地方由调用方传进来：开源出去别人用的是自己的关系，
 * 代码里不该写死某个人的称呼。
 */
export function buildTools({ ownerName = '主人', selfName = '我' } = {}) {
  const OWNER = String(ownerName ?? '').trim() || '主人'
  const SELF = String(selfName ?? '').trim() || '我'
  return [
  {
    name: 'mem_write',
    description: [
      '把一件值得记住的事写进记忆库。主动记，不用等主人开口。',
      '',
      '守门一问：以后的我，会不会因为记得这条而做得更好？会，才记。',
      '',
      '记什么：',
      `- 私人对话（和${OWNER}）：影响后续相处、承诺兑现、对方感受或边界判断的稳定事实、约定和关键表达。`
        + `按「下次是否要据此调整说法或做法」判断，不限定类型。`,
      '- 工作会话：影响后续决策与协作的背景、已定决策及原因、已验证的坑与解法、被明确纠正过的做法。'
        + '按「下次是否要据此少走弯路」判断，不限定类型。',
      '',
      '不记：排查过程、工具调试、临时进度、仅本次会话有用的状态、自己未被采纳的提议、',
      '无依据猜测、随手能重读的内容。',
      '',
      '怎么写：',
      '- 主语明确：谁、什么事。换了会话也要看得懂（别写「那个漏洞修了」）',
      '- 相对时间换成具体日期；定不了就保留原来的精度，别编',
      '- 情况变了，写清新状态和变化原因，旧条用 supersedes:[旧 id] 作废',
      '- 别在回复里说「我记下了」——记就是记了，不用报',
      '',
      'importance 三档（只决定掉多快，不决定「永不遗忘」）：',
      '  0.9 核心：半衰期最长（约 200 天），但**照样会过期**。不会自动钉住。',
      '  0.6 重要：默认档，衰减慢（约 160 天）。',
      '  0.3 普通：会随时间被淡忘（约 116 天，进 graveyard 可恢复，不是删）。',
      '',
      '想让某条**永远不忘**的唯一办法：带 requestPin:true 提请求，进待办让主人点头。',
      '你不能自己钉。请求被同意后这条会冻结，不再随时间掉；被拒绝就按正常曲线走。',
      '只在「这条丢了就真出事」时才提——不可重来的承诺、日期、边界。',
      '',
      '写之前先 mem_search 查一下。撞车了会被拦下，把已有的那几条列给你——',
      '同一件事就别重写。含密钥的内容会被拒（明确的直接拒，疑似的要带 force:true 再来）。',
    ].join('\n'),
    params: {
      text: { type: 'string', description: '记忆内容，一句话说清。别写长文（上限 2000 字）', required: true },
      importance: { type: 'number', description: '重要度 0.9 / 0.6（默认）/ 0.3。只影响衰减快慢' },
      supersedes: { type: 'array', items: { type: 'number' }, description: '要作废的旧记忆 id（情况变了时用）。旧的标 superseded，不是删' },
      force: { type: 'boolean', description: '确认不是重复 / 疑似密钥已问过主人，带 true 强写' },
      from: { type: 'string', enum: ['user', 'self', 'env'], description: '这条怎么来的：user=他亲口说的（默认）、self=你自己归纳的、env=从环境/文件里看到的' },
      requestPin: { type: 'boolean', description: '请求把这条钉住（永不遗忘）。会进待办由主人裁决，不是立刻生效' },
      pinReason: { type: 'string', description: '想钉住它的理由，一句话。主人要凭这个点头' },
      suggest: { type: 'string', enum: ['agree', 'reject'], description: '你的处理建议：被查重拦下 / 改了口进待办时一起给出。agree=用新写的替掉旧的，reject=不写、留旧的' },
      suggestReason: { type: 'string', description: '为什么这么建议，一两句。主人凭这个决定，别写空话' },
    },
    run: runMemWrite,
    render: (r) => {
      if (!r) return '没写进去：没有结果。'
      if (!r.ok) {
        if (r.duplicate) {
          const lines = [`没写进去：${r.reason}`, '已有的：']
          for (const h of r.existing ?? []) {
            lines.push(`  #${h.id} ${h.text}`)
          }
          lines.push(r.hasSuggestion ? '已把我的建议一起放进待办，等主人裁决。' : '待办里还没建议——下次被拦时带 suggest 一并给出。')
          return lines.join('\n')
        }
        if (r.needsConfirm) return `先问${OWNER}：${r.reason}`
        return `没写进去：${r.reason ?? '不知道哪儿不对'}`
      }
      const tier = r.importance >= 0.9 ? '核心档' : r.importance >= 0.6 ? '重要' : '普通'
      const gone = r.superseded?.length ? ` · 已作废 #${r.superseded.join(' #')}` : ''
      const ask = r.pinRequest ? ' · 已请求钉住，等主人点头' : ''
      // 不写「记住了」这类可以原话复述的字眼——模型容易跟着在回复里说「我记下了」
      return `#${r.id} 已写入（${tier}）${gone}${ask}`
    },
  },
  {
    name: 'mem_search',
    description: [
      '在记忆库里找旧事。用户提到过去、旧约定、以前说过的某件事时调用。',
      '',
      '返回命中的记忆节点（带日期和出处 seq）。要原话就用 raw_memory 按 seq 翻。',
      '向量服务挂了会降级成关键词检索，结果里会标「降级」。',
    ].join('\n'),
    params: {
      query: { type: 'string', description: '要找什么，用自然的说法', required: true },
      limit: { type: 'number', description: '最多回几条，默认 6' },
    },
    run: runMemSearch,
    render: (r) => {
      if (!r) return '没有结果。'
      if (!r.ok) return `没查成：${r?.reason ?? '不知道哪儿不对'}`
      if (!r.hits?.length) return r.text || '没有命中的旧记忆。'
      const lines = r.hits.map((h, i) => {
        const pin = h.pinned ? ' · 核心' : ''
        const rel = Number.isFinite(h.rel) ? ` · 相关 ${h.rel.toFixed(2)}` : ''
        const src = whereOf(h.sources)
        return `${i + 1}. [${h.when}${pin}${rel}] ${h.text}${src}`
      })
      if (r.advice) lines.push(`\n${r.advice}`)
      else if (r.hits[0]?.degraded) lines.push('\n（本次是关键词降级检索）')
      return lines.join('\n')
    },
  },
  {
    name: 'raw_memory',
    description: [
      '查留底原话——记忆节点的出处。',
      '',
      'mem_search 看到某条记忆带「出处 seq」时，用它按 seq 翻回当时的原话。',
      '也支持关键词、时间范围。留底永不删，多久以前的都能查。',
      '整库按时间翻，不分会话（结果带会话短标识）。',
    ].join('\n'),
    params: {
      fromSeq: { type: 'number', description: '起始 seq（含）' },
      toSeq: { type: 'number', description: '结束 seq（含）' },
      keyword: { type: 'string', description: '关键词（子串匹配）' },
      limit: { type: 'number', description: '最多回几条，默认 20' },
    },
    run: runRawMemory,
    render: (r) => {
      if (!r) return '没有结果。'
      if (!r.ok) return `没查成：${r.reason ?? '不知道哪儿不对'}`
      if (!r.rows?.length) return '留底里没有符合条件的记录。'
      // 只有结果里真的混了多个会话才打前缀——一个会话时打上去全是同一串，纯噪音
      const multi = new Set(r.rows.map((x) => String(x.sid ?? ''))).size > 1
      return r.rows.map((x) => {
        const who = x.role === 'user' ? OWNER : SELF
        const seq = x.seq != null ? `#${x.seq}` : ''
        const conv = multi && x.sid ? `[${String(x.sid).slice(0, 8)}] ` : ''
        return `${conv}${seq} ${who}：${String(x.text).slice(0, 300)}`
      }).join('\n')
    },
  },
  ]
}

/** 默认称呼下的工具表（老调用点/测试直接用这个）。 */
export const TOOLS = buildTools()
