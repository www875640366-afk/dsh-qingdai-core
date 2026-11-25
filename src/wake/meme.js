// meme.js —— 表情包清单的查询与改写（纯逻辑，不碰宿主）。
//
// 清单在配置项 memeDir 指向的目录里的 `表情清单.json`，每条形如：
//   { file, displayName, emotion, tags: [], w, h, ... }
//
// emotion 只放六个桶之一（跟 dsh-meme 对齐）：happy / angry / sad / shy / confused / daily
// 细一点的描述放 tags，搜的时候两边都看。

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** 六个情绪桶。顺序固定，面板和工具都按这个列。 */
export const BUCKETS = [
  { key: 'happy', label: '开心' },
  { key: 'angry', label: '生气' },
  { key: 'sad', label: '难过' },
  { key: 'shy', label: '害羞' },
  { key: 'confused', label: '疑惑' },
  { key: 'daily', label: '日常' },
]

const BUCKET_KEYS = BUCKETS.map((b) => b.key)
const LABEL_OF = Object.fromEntries(BUCKETS.map((b) => [b.key, b.label]))

/** 清单文件的默认位置（相对小屋）。 */
export function defaultManifest(dir) {
  return join(dir, '表情清单.json')
}

export function readManifest(dir) {
  const p = dir ? defaultManifest(dir) : ''
  if (!p) return { ok: false, items: [], reason: '没配表情清单目录' }
  try {
    const raw = readFileSync(p, 'utf8')
    const items = JSON.parse(raw)
    if (!Array.isArray(items)) return { ok: false, items: [], reason: '清单不是数组' }
    return { ok: true, items, path: p }
  } catch (e) {
    return { ok: false, items: [], reason: `清单读不出来：${e?.message ?? e}` }
  }
}

export function writeManifest(dir, items) {
  const p = defaultManifest(dir)
  try {
    writeFileSync(p, JSON.stringify(items, null, 2) + '\n', 'utf8')
    return { ok: true, count: items.length, path: p }
  } catch (e) {
    return { ok: false, reason: `清单写不进去：${e?.message ?? e}` }
  }
}

/** 一条是不是能用的（有名字、不是乱码）。 */
function usable(x) {
  const n = String(x?.displayName ?? '')
  return Boolean(n) && !/memecub|^DM_/i.test(n)
}

/** 把一条拼成给人看的一行。 */
export function renderOne(x) {
  const tags = Array.isArray(x?.tags) ? x.tags.filter(Boolean) : []
  const label = LABEL_OF[x?.emotion] ?? String(x?.emotion ?? '')
  return `[表情: ${x?.displayName ?? '?'}] ${label}${tags.length ? ' · ' + tags.join(' ') : ''}`
}

/** 名字、情绪、标签里有没有这个词。 */
function matches(x, q) {
  const needle = String(q ?? '').trim().toLowerCase()
  if (!needle) return true
  const hay = [
    x?.displayName,
    x?.emotion,
    LABEL_OF[x?.emotion],
    Array.isArray(x?.tags) ? x.tags.join(' ') : '',
  ].filter(Boolean).join(' ').toLowerCase()
  // 空格分开的词要求全中（「馋 流口水」能搜到、只中一个不行）
  return needle.split(/\s+/).every((w) => hay.includes(w))
}

/**
 * 查表情。
 *
 * @param {string} dir            表情包目录（放清单的那个）
 * @param {object} args
 * @param {string} [args.tag]     六个桶之一
 * @param {string} [args.query]   关键词（名字/情绪/标签）
 * @param {number} [args.limit]   最多回几条，默认 8
 * @returns {object}
 */
export function searchMeme(dir, args = {}) {
  const got = readManifest(dir)
  if (!got.ok) return { ok: false, reason: got.reason }

  const pool = got.items.filter(usable)
  const tag = String(args.tag ?? '').trim().toLowerCase()
  const query = String(args.query ?? '').trim()

  // 不带条件：列六个桶，让她知道能怎么问
  if (!tag && !query) {
    const lines = BUCKETS.map((b) => {
      const n = pool.filter((x) => x.emotion === b.key).length
      return `  ${b.label}（${b.key}）：${n} 张`
    })
    return {
      ok: true,
      mode: 'buckets',
      total: pool.length,
      text: `表情一共 ${pool.length} 张，按情绪分：\n${lines.join('\n')}\n\n搜法：tag="sad" 按情绪；query="委屈" 按关键词。`,
    }
  }

  if (tag && !BUCKET_KEYS.includes(tag)) {
    return { ok: false, reason: `没有「${tag}」这个情绪。能用的：${BUCKET_KEYS.join(' / ')}` }
  }

  const hits = pool.filter((x) => (!tag || x.emotion === tag) && matches(x, query))
  const limit = Number(args.limit) > 0 ? Math.floor(Number(args.limit)) : 8
  const shown = hits.slice(0, limit)

  if (!hits.length) {
    return { ok: true, mode: 'none', hits: [], text: `没找到。换个词试试，或者不带条件看有哪些情绪。` }
  }

  const lines = shown.map((x) => renderOne(x))
  const more = hits.length > shown.length ? `\n……还有 ${hits.length - shown.length} 张没列` : ''
  return {
    ok: true,
    mode: tag ? 'tag' : 'query',
    hits: shown.map((x) => ({ file: x.file, name: x.displayName, emotion: x.emotion, tags: x.tags })),
    total: hits.length,
    text: `找到 ${hits.length} 张：\n${lines.join('\n')}${more}\n\n回的时候把 [表情: 名字] 原样写进正文。`,
  }
}

/**
 * 改一条（起名字 / 改情绪 / 换标签）。
 * 只改清单，不动文件。
 */
export function updateMeme(dir, args = {}) {
  const name = String(args.name ?? '').trim()
  if (!name) return { ok: false, reason: '要指定改哪一张（name 填它的名字）' }

  const got = readManifest(dir)
  if (!got.ok) return { ok: false, reason: got.reason }

  const target = got.items.find((x) => String(x.displayName ?? '') === name)
  if (!target) return { ok: false, reason: `清单里没有叫「${name}」的` }

  const before = { displayName: target.displayName, emotion: target.emotion, tags: [...(target.tags ?? [])] }

  if (args.newName !== undefined) {
    const nn = String(args.newName ?? '').trim()
    if (!nn) return { ok: false, reason: '新名字不能是空的' }
    const dup = got.items.find((x) => x !== target && String(x.displayName ?? '') === nn)
    if (dup) return { ok: false, reason: `已经有叫「${nn}」的了` }
    target.displayName = nn
  }
  if (args.emotion !== undefined) {
    const e = String(args.emotion ?? '').trim().toLowerCase()
    if (!BUCKET_KEYS.includes(e)) return { ok: false, reason: `没有「${e}」这个情绪。能用的：${BUCKET_KEYS.join(' / ')}` }
    target.emotion = e
  }
  if (args.tags !== undefined) {
    const list = Array.isArray(args.tags) ? args.tags : String(args.tags ?? '').split(/[,，\s]+/)
    target.tags = list.map((t) => String(t ?? '').trim()).filter(Boolean)
  }

  const wrote = writeManifest(dir, got.items)
  if (!wrote.ok) return { ok: false, reason: wrote.reason }

  return {
    ok: true,
    name: target.displayName,
    before,
    after: { displayName: target.displayName, emotion: target.emotion, tags: target.tags },
    text: `改好了：${renderOne(target)}`,
  }
}
