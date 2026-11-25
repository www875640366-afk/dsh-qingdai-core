// dup.js —— 写入前查重：挡住「同一件事写两遍」和「说法不同但撞车」。
//
// 【为什么在写入时挡】事后合并有两个毛病：合并错了没法查、合并前那段时间两条并存。
//   写入时拦一下只要一次内存比对，代价几乎为零；拦不住再谈别的。
//   （dsh-plastic-memory 同款思路：create 前查重，命中就返回候选让人/模型决定）
//
// 【两轴级联，不是两轴恒开】
//   实体是强信号：两条记忆点了同一个专名（项目名、文件名、API 名）就算撞。
//   纯中文散文常常提不出任何实体（「对方喜欢喝美式」里没有专名），
//   这时才落 bigram Dice 轴。两轴同时开会把「同主题不同事实」误判成重复。
//
// 【不做 NER】中文人名/地名的识别不上（要词性标注），只抓能确定是专名的：
//   拉丁串、书名号/引号里的内容。抓不到就当它没有实体，走 Dice。
//   宁可漏判也不误判——误判会让重要的事写不进去。

/** Dice 阈值：照 dsh-plastic-memory 的 DUPLICATE_SIMILARITY_THRESHOLD。 */
export const DUPLICATE_SIMILARITY = 0.6

/**
 * 实体重合时的字面下限。
 *
 * 【为什么实体轴不能单独用】实体重合只说明「说的是同一个项目」，
 * 不等于「说的是同一件事」。实测踩过：
 *   A「dsh-qingdai-core 的记忆注入走 systemPrompt.context()…」
 *   B「dsh-qingdai-core 上线实测：mem_search 首次调用报 value is not lossless JSON…」
 *   共用实体 dsh-qingdai-core，字面 Dice 只有 0.233 —— 完全是两件事，却被拦下。
 * 真重复长这样：「对方喜欢喝美式咖啡」vs「对方喜欢喝美式」，Dice 0.857。
 * 所以实体重合时再加一道 0.35 的字面下限，两个条件都满足才算撞车。
 */
const ENTITY_DICE_MIN = 0.35

/** 实体清单最多比几个，防长文爆炸。 */
const MAX_ENTITIES = 12

const PUNCT = /[\s\p{P}\p{S}]/gu

/** 从一段文本里抽"能确定是专名"的东西（小写化）。 */
export function entitiesOf(text) {
  const out = new Set()
  const s = String(text ?? '')
  // 拉丁串：API 名、文件名、库名、英文缩写
  for (const m of s.matchAll(/[A-Za-z][A-Za-z0-9_.-]{2,}/g)) out.add(m[0].toLowerCase())
  // 书名号 / 引号里的内容：《某本书》「某个名字」"dsh-qingdai-core"
  for (const m of s.matchAll(/[《「『"'“]([^》」』"'”]{2,20})[》」』"'”]/g)) {
    const v = m[1].trim().toLowerCase()
    if (v) out.add(v)
  }
  return [...out].slice(0, MAX_ENTITIES)
}

/** 字二元组（去掉空白、标点、符号）。 */
export function bigramsOf(text) {
  const t = String(text ?? '').replace(PUNCT, '')
  const set = new Set()
  for (let i = 0; i < t.length - 1; i += 1) set.add(t.slice(i, i + 2))
  return set
}

/** Dice 系数：2|A∩B| / (|A|+|B|)。 */
export function diceOf(a, b) {
  const sa = a instanceof Set ? a : bigramsOf(a)
  const sb = b instanceof Set ? b : bigramsOf(b)
  if (!sa.size || !sb.size) return 0
  let inter = 0
  for (const x of sa) if (sb.has(x)) inter += 1
  return (2 * inter) / (sa.size + sb.size)
}

/**
 * 两条记忆像不像同一件事。
 *
 * @returns {{hit:boolean, by:'entity'|'dice'|null, score:number, shared:string[]}}
 */
/** 把共有实体从文本里拿掉（大小写不敏感），免得专名本身把字面相似度撑高。 */
function stripWords(text, words) {
  let s = String(text ?? '')
  for (const w of words) {
    if (!w) continue
    const lower = s.toLowerCase()
    const at = lower.indexOf(w)
    if (at < 0) continue
    s = s.slice(0, at) + ' ' + s.slice(at + w.length)
  }
  return s
}

/**
 * 两条记忆像不像同一件事。
 *
 * 实体轴额外有两个约束（实测踩出来的）：
 *   1. 字面也不能差太远（ENTITY_DICE_MIN）——同一项目下的两件事共用项目名是常态
 *   2. 字面相似度要在**剥掉共有实体之后**算——「dsh-qingdai-core」这种长专名
 *      在小句子里占太多字符，不剥的话随便两句话都能到 0.6
 *
 * @returns {{hit:boolean, by:'entity'|'dice'|null, score:number, shared:string[]}}
 */
export function similarityOf(a, b) {
  const ea = entitiesOf(a)
  const eb = entitiesOf(b)
  const shared = ea.length && eb.length ? ea.filter((x) => eb.includes(x)) : []
  if (shared.length) {
    const dice = diceOf(stripWords(a, shared), stripWords(b, shared))
    return dice >= ENTITY_DICE_MIN
      ? { hit: true, by: 'entity', score: dice, shared }
      : { hit: false, by: null, score: dice, shared }
  }
  const dice = diceOf(a, b)
  return dice >= DUPLICATE_SIMILARITY
    ? { hit: true, by: 'dice', score: dice, shared: [] }
    : { hit: false, by: null, score: dice, shared: [] }
}

/**
 * 在库里找和 text 撞车的已存在记忆。只看在用的（superseded=0）。
 *
 * @param {object} db
 * @param {string} text
 * @param {{limit?:number}} opts
 * @returns {Array<{id:number, text:string, importance:number, score:number, by:string, shared:string[]}>}
 */
export function findDuplicates(db, text, { limit = 3 } = {}) {
  const pool = db.prepare(
    'SELECT id, text, importance FROM memories WHERE superseded = 0',
  ).all()
  const hits = []
  for (const it of pool) {
    const r = similarityOf(text, it.text)
    if (!r.hit) continue
    hits.push({ id: Number(it.id), text: it.text, importance: Number(it.importance), score: r.score, by: r.by, shared: r.shared })
  }
  hits.sort((x, y) => y.score - x.score)
  return hits.slice(0, Math.max(1, limit))
}
