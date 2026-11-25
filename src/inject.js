// inject.js —— 记忆注入：这一轮可能用得上的旧事，自动带到眼前。
//
// 【和工具的关系】mem_search 是「她想查就查」，注入是「不用她开口」。
//
// 【现成方案里挑了哪一个】
//   dsh-memory-tiers 的「预取 + TTL」：
//     收到主人消息的那一刻先起一次检索（不等它回来），
//     组装提示词时读已经落地的结果；结果带 TTL，免得把隔夜的话题塞进这一轮。
//   好处是**零阻塞**——embedding 要一次网络请求，放在组装路径上会拖慢每一轮。
//
// 【三条闸门】
//   1. 相关度：检索双闸（sem ≥ 0.58 或词面覆盖 ≥ 0.3）只是**候选**，
//      注入还要过更严的一道，而且是**两档**：这句在要回忆（问句 / 记得、以前、上次）
//      门槛放低；陈述句门槛抬高；用户在复述记忆本身（回声）直接不注入。
//   2. 排序：检索自己的综合分（语义 / 词面 / 新近 / 重要 / 热度 / pin），取头部。
//   3. 预算：最多 6 条、合计 800 字，超了从尾部砍。
//
// 【一条用户消息只注入一次】注入过就把 pending 清掉：工具轮里同一轮会组装好几次，
//   不清的话同一条记忆会被重复塞进去，白烧 token。

import { bigramsOf } from './dup.js'

/** 注入窗口：条数、字数、缓存多久算过期。面板做成设置项后再挪到配置里。 */
export const RECALL = ({
  limit: 3,
  maxChars: 800,
  ttlMs: 3 * 60_000,
  perLineChars: 120,
  // ---- 注入闸：用「是不是在问」判，不用「有多像」判 ----
  //
  // 【为什么不用精排分做阈值】2026-11-25 拿工作库 40 条真实消息实测：
  //   topRel（reranker 原始分）40 条全是 0.000，一条不例外。
  //   原因不是模型坏了——精排分对 query 长度极陡：同一对文档，
  //     q="上次说的工作要求是什么"(11字) → 0.317
  //     q="接着精排的就行 然后你看看社区成熟的方案…"(35字) → 0.00096
  //   真实对话是复合句、多意图、带指代，跟一条干净的记忆永远对不齐。
  //   顺带排除掉的另外两个信号：
  //     topSem（余弦）0.47~0.75 全挤在一起，分不开「该想起」和「不该想起」；
  //     topCov（字面覆盖）中位 0.054、最高 0.25，连 0.3 的闸都够不着。
  //   社区五家（memory-hub / mneme / sage-mem / auto-memory / whale-pal）
  //   也都不拿相关性分数当阈值——要么全带，要么词面粗筛，要么让模型自己搜。
  //
  // 【改成什么】只看这句是不是在要回忆（问句 / 记得、以前、上次…）：
  //   在要回忆 → 精排只负责**排序**取前几条，不设分数线；
  //   不在要回忆 → 要求精排分很高（实测长句达不到，等于只有很短的具体问题才过）。
  //   这正是 dsh-auto-memory 拟合出的权重方向：mark(+1.64) ≫ denseTop(−0.30)，
  //   「这是不是一个问题」比「它有多像」重要一个量级。
  minRel: 0.62,          // 无标记句：精排分要够高才注入
  // 无精排（没配 embedKey，或这次精排请求失败）时退回复合分。
  // 复合分实测常态在 0.5~0.7，原来的 0.75 等于降级即静默，一条都带不出来。
  minScore: 0.62,        // 无精排时，无标记句的兜底分（跟 minRel 同档，口径一致）
  minScoreMarked: 0.42,  // 无精排时，有标记句的兜底分（= minScore - 0.2）
  minChars: 8,           // 无标记且短于这个长度：「继续」「嗯」「好」这类，直接跳过
  echoContainment: 0.7,  // 回声：query 的字面有多少被 top1 覆盖
  echoRel: 0.95,         // 且语义上也高度重复（两臂 OR，缺一不判）
})

/** 去重存储：{ get(sid), set(sid,{ids,gen}), clear(sid?) }。
 *  **clear 的语义统一成**：传 sid 删那一个；不传就全清。两套实现必须一致，
 *  不然默认 store 下「全清」会静默变成删掉 key 'undefined'。
 *  默认走内存（测试和没接库时用）；index.js 会接一个落库的版本，
 *  这样插件重启也不会把上午带过的再带一遍。 */
const memStore = (() => {
  const rows = new Map()   // sid → { ids, gen }
  return {
    get: (sid) => rows.get(String(sid)) ?? null,
    set: (sid, v) => { rows.set(String(sid), v) },
    clear: (sid) => {
      if (sid === undefined || sid === null || sid === '') rows.clear()
      else rows.delete(String(sid))
    },
  }
})()

let store = memStore

/** 接一个持久化的存储。ini 时调一次。 */
export function useRecallStore(next) {
  store = next && typeof next.get === 'function' ? next : memStore
}

/** 某会话当前代次：压缩一次 +1，用来判断「那些记忆还在不在上文里」。 */
function genOfSid(id) {
  const r = store.get(String(id ?? ''))
  return Number(r?.gen) || 0
}

/** 压缩发生：上下文里的旧内容没了，去重记录作废，下次该带就带。
 *  传 sid 只清那一个会话；不传就全清（拿不到会话时的兜底）。
 *  注意 clear 之后再 bump：记录本身要留一条带新代次的，不然代次无从比较。 */
export function clearRecallDedupe(sid) {
  const k = String(sid ?? '')
  if (!k) {
    store.clear()
    return
  }
  const gen = genOfSid(k) + 1
  store.set(k, { ids: [], gen })
}

/** 面板改过的值：没配就用上面的默认。每次预取前抬一次，所有用 RECALL 的地方自动跟上。 */
export function tuneRecall(cfg = {}) {
  const n = (v, lo, hi, d) => {
    const x = Number(v)
    return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d
  }
  RECALL.limit = Math.round(n(cfg.recallLimit, 1, 20, 3))
  RECALL.maxChars = Math.round(n(cfg.recallMaxChars, 100, 4000, 800))
  // 面板只有一个「相关门槛」，它管的是**无标记句**那一档。
  // 有标记的句子不设分数线：精排只排序（理由见上面 RECALL 的实测注释）。
  RECALL.minRel = n(cfg.recallMinRel, 0, 1, 0.62)
  RECALL.minScore = n(cfg.recallMinScore, 0, 1, 0.62)
  RECALL.minScoreMarked = Math.max(0.1, Math.round((RECALL.minScore - 0.2) * 100) / 100)
  return RECALL
}

/** 召回标记：问句，或明确在打听以前的事。有它说明「该想起来」。
 *  中文问句经常不带问号（「你记得我生日是哪天」），所以疑问词也算。 */
const RECALL_MARK = /[？?吗呢]|记得|记不记得|还记得|以前|上次|之前|那次|说过|提过|那个事|有没有|想想|想起来|忘记|忘了|记不清|哪[天个里]|什么|谁|多少|几号|几点|怎么|为什么/

/** 这句话是不是在要回忆。 */
export function hasRecallMark(query) {
  return RECALL_MARK.test(String(query ?? ''))
}

/**
 * 回声：用户把一条记忆本身复述了一遍（「我的生日是某月某日」），
 * 此时那条记忆的相似度必然高，但注入纯属重复。
 *
 * 两臂都成立才算：字面包含够高 **且** 语义够近。
 * 只用一个臂会误杀——dsh-auto-memory 实测「只用字面包含」判不准（回声组包含度
 * 中位数 0.293 反而低于激活组 0.462，因为提问天然会带上目标的词）。
 * 有问号/回忆词的一律不算回声（那是在打听，不是复述）。
 */
export function echoOf(query, top) {
  const q = String(query ?? '').trim()
  if (!q || hasRecallMark(q)) return false
  const text = String(top?.text ?? '')
  if (!text) return false
  const rel = Number(top?.rel)
  if (!Number.isFinite(rel) || rel < RECALL.echoRel) return false
  const a = bigramsOf(q)
  const b = bigramsOf(text)
  if (!a.size || !b.size) return false
  let inter = 0
  for (const x of a) if (b.has(x)) inter += 1
  return inter / a.size >= RECALL.echoContainment
}

/**
 * 这一轮该不该注入，以及为什么。
 *
 * 顺序就是优先级：先看有没有候选，再看是不是在复述，再看是不是在问，
 * 最后才轮到「有多像」。精排分只在**无标记**那一档当门槛用；
 * 有标记时它只负责把最相关的几条排到前面。
 *
 * @param {string} query 主人这一句
 * @param {{hits?:Array}} result searchMemory 的返回
 * @returns {{inject:boolean, why:string}}
 */
export function decideInject(query, result) {
  const hits = Array.isArray(result?.hits) ? result.hits : []
  if (!hits.length) return { inject: false, why: 'no-hit' }
  if (echoOf(query, hits[0])) return { inject: false, why: 'echo' }

  const marked = hasRecallMark(query)

  // 无标记的短句（「继续」「好的」「嗯」「改吧」）不是在要回忆，只是在下指令。
  // 这类话实测占了对话的一大半，每一句都去捞旧事纯属烧 token。
  if (!marked && String(query ?? '').trim().length < RECALL.minChars) {
    return { inject: false, why: 'too-short' }
  }

  const rels = hits.map((h) => Number(h?.rel)).filter((n) => Number.isFinite(n))
  if (rels.length) {
    // 有标记：有候选就带，精排已经把它认为最相关的排在最前面了，不再卡分数线。
    if (marked) return { inject: true, why: 'marked' }
    return Math.max(...rels) >= RECALL.minRel
      ? { inject: true, why: 'relevant' }
      : { inject: false, why: 'low-rel' }
  }

  // 没配 embedKey 时没有精排，退回复合分。
  const scores = hits.map((h) => Number(h?.score)).filter((n) => Number.isFinite(n))
  const need = marked ? RECALL.minScoreMarked : RECALL.minScore
  return scores.length && Math.max(...scores) >= need
    ? { inject: true, why: marked ? 'marked' : 'relevant' }
    : { inject: false, why: 'low-score' }
}

/**
 * 造一个召回器。search 由外面的装配层给（它才知道怎么 embed、怎么精排）。
 *
 * @param {{
 *   search:(sid:string, query:string, limit:number)=>Promise<{ok:boolean, hits?:Array}>,
 *   markUsed?:(sid:string, ids:number[], via:string)=>void,
 * }} deps
 *   markUsed 只在**真的会注入**的时候调，且只报 buildRecall 挑中的那几条。
 */
export function createRecaller({ search, markUsed, getCfg } = {}) {
  /** sid → { query, text, at, pending } */
  const cache = new Map()


  /**
   * 收到主人消息时调，不 await 结果（调用方 void 它即可）。
   * 同一句话 3 分钟内不重复检索。
   */
  async function prefetch(sid, query) {
    try { const c = typeof getCfg === 'function' ? (getCfg() || {}) : {}; if (c.recallEnabled === false) return } catch { /* 读不到配置按开启 */ }
    const id = String(sid ?? '')
    const q = String(query ?? '').trim()
    if (!id || !q || typeof search !== 'function') return
    try { if (typeof getCfg === 'function') tuneRecall(getCfg() || {}) } catch { /* 配置读不到就用默认 */ }
    const hit = cache.get(id)
    if (hit && hit.query === q && Date.now() - hit.at < RECALL.ttlMs) {
      // 同一句话重说：复用上次的结果，但 at 要推到现在——
      // 不推的话 take 里的 TTL 过期判断会拿旧时间戳，刚 revive 就判过期，文本永远交不出去
      hit.at = Date.now()
      hit.pending = Boolean(hit.text)
      return
    }
    try {
      const r = await search(id, q.slice(0, 300), RECALL.limit)
      // 跨轮去重：刚带过的那几条还在上文里，再塞一遍纯属浪费 token。
      // 不调模型，比 id 就行。「还在不在」由压缩代次决定，不看时间。
      // 去重看代次：同一代里这些记忆一直在上下文里，压缩过一代就全部作废。
      const sent = store.get(id)
      const done = new Set((sent?.ids ?? []).map(Number))
      if (done.size && Array.isArray(r?.hits)) {
        r.hits = r.hits.filter((h) => !done.has(Number(h?.id)))
      }
      // 两道闸依次过：先判该不该注入，再按预算裁出真正要进上下文的几条。
      // 被任何一道挡掉的都不记账——它们一个字都没进上下文。
      const recall = decideInject(q, r).inject ? buildRecall(r.hits) : { text: '', ids: [] }
      // **只算不记**：真正进了上下文才算注入。组装可能失败、pre-step 可能不 enter、
      // 这一批可能一次都没被 take —— 那样记账会让它们被永久去重掉，同时虚增计数。
      cache.set(id, {
        query: q, text: recall.text, ids: recall.ids, at: Date.now(), pending: Boolean(recall.text),
      })
    } catch {
      cache.set(id, { query: q, text: '', at: Date.now(), pending: false })
    }
  }

  /**
   * 组装提示词时调：吐出这一轮要注入的文本，并把「待注入」清掉。
   * 没有就返回空串（宿主会把空段过滤掉）。
   */
  function take(sid) {
    const id = String(sid ?? '')
    const hit = cache.get(id)
    if (!hit || !hit.pending || !hit.text) return ''
    if (Date.now() - hit.at > RECALL.ttlMs) { hit.pending = false; return '' }
    hit.pending = false
    // 到这一步文本才真的进上下文：去重记录和记账都在这里做，一次性消费
    const ids = Array.isArray(hit.ids) ? hit.ids.map(Number).filter((n) => Number.isInteger(n)) : []
    if (ids.length) {
      try {
        const sent = store.get(id)
        const gen = Number(sent?.gen) || 0
        const keep = new Set([...(sent?.ids ?? []).map(Number), ...ids])
        store.set(id, { ids: [...keep], gen })
      } catch { /* 存不下不影响交付 */ }
      if (typeof markUsed === 'function') {
        try { markUsed(id, ids, 'inject') } catch { /* 记账失败不能挡注入 */ }
      }
    }
    return hit.text
  }

  /** 面板要看「这一轮带了什么进来」。 */
  function peek(sid) {
    const hit = cache.get(String(sid ?? ''))
    if (!hit || Date.now() - hit.at > RECALL.ttlMs) return null
    return { query: hit.query, text: hit.text, at: hit.at, pending: hit.pending }
  }

  return { prefetch, take, peek }
}

/**
 * 把命中的旧事拼成注入块，同时报出「哪几条真的进去了」。
 *
 * ids 是给记账用的：没进上下文的那几条不能算被想起，否则光靠检索候选
 * 就能把烂记忆喂成长生不老。
 *
 * @returns {{text:string, ids:number[]}}
 */
export function buildRecall(hits = []) {
  const list = (Array.isArray(hits) ? hits : []).filter((h) => h && h.text)
  if (!list.length) return { text: '', ids: [] }

  const header = [
    '[系统] 下面几条是以前记下的旧事，可能和这轮有关，也可能不相关。',
    '用得上的就用，不确定就先 raw_memory 翻原文核对，别直接当事实讲。',
  ].join('\n')
  // 预算算总算：头部占掉的字数从正文本里扣，别让「上限 800」变成 800 再加说明
  let budget = RECALL.maxChars - header.length - 1

  const lines = []
  const ids = []
  for (const h of list.slice(0, RECALL.limit)) {
    let body = String(h.text).replace(/\s+/g, ' ').trim()
    if (body.length > RECALL.perLineChars) body = `${body.slice(0, RECALL.perLineChars)}…`
    const line = `- ${h.when ? `${h.when} ` : ''}${body}`
    if (line.length + 1 > budget) break
    lines.push(line)
    if (h.id != null) ids.push(Number(h.id))
    budget -= line.length + 1
  }
  if (!lines.length) return { text: '', ids: [] }

  return { text: [header, ...lines].join('\n'), ids }
}

/** 只要文本的旧接口。 */
export function renderRecall(hits = []) {
  return buildRecall(hits).text
}
