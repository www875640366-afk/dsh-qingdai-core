// tools.js —— 工具定义与执行（纯逻辑，不碰宿主）。
//
// 三条硬规则（跟旧插件一致）：
//   1. render 必须把正文带出来，不许只报条数
//   2. 没内容时明确说"还没写"，不许返回空字符串假装成功
//   3. 每个工具都有测试，测它"输出里有没有内容"
//
// 只有一个工具：core（改核心 / 看核心）。写入靠工具，不靠网页——
// 宿主侧只读，只有她自己能通过 core 工具改。
// 每次改（添加/修改/删除）都要写理由，历史记在 core-history.json。

import { readCore, writeCore, readHistory, splitSections } from './core.js'
import { searchMeme, updateMeme } from './meme.js'


/**
 * 只改一节。整篇重发容易手滑改到别处，而且别处的修改时间会被误更新。
 *
 * section 写现有小节的标题（不带 #）；text 写这一节的**新正文**（不带标题行）。
 * 其他小节原样保留，一字不动。
 */
export function patchCore(dataDir, args = {}) {
  const section = String(args.section ?? '').trim().replace(/^#+\s*/, '')
  const body = String(args.text ?? '').trim()
  const reason = String(args.reason ?? '').trim()
  if (!section) return { ok: false, reason: '要写清改哪一节（section = 小节标题）' }
  if (!reason) return { ok: false, reason: '要写清楚为什么改（reason 不能空）' }
  const prev = readCore(dataDir)
  const secs = splitSections(prev.text)
  if (!secs.length) return { ok: false, reason: '核心还没写，先用 set 写整篇' }
  const idx = secs.findIndex((x) => x.title === section)
  if (idx < 0) {
    return { ok: false, reason: `没有「${section}」这一节。现有：${secs.map((x) => x.title || '（开头）').join(' / ')}` }
  }
  const oldText = secs[idx].text
  const newText = `# ${section}\n${body}`
  const next = secs.map((x, i) => (i === idx ? newText : x.text)).join('\n\n')
  // 历史只记这一节的前后，不是整篇——不然「哪段话变成哪段话」根本看不出来
  const res = writeCore(dataDir, next, reason, { historyBefore: oldText, historyAfter: newText })
  return { ...res, action: 'modify', section }
}

/** 改核心：添加/修改/删除，都要写理由。改之前自动留备份。 */
export function setCore(dataDir, args = {}) {
  const text = String(args.text ?? '').trim()
  const reason = String(args.reason ?? '').trim()

  if (!reason) return { ok: false, action: 'set', version: 0, reason: '要写清楚为什么改（reason 不能空）' }

  const prev = readCore(dataDir)

  // 已经有核心时，整篇重写不许动小节结构：只能改这四节的内容，
  // 不许加新的、不许删、不许换标题。要改某一节用 patch。
  if (prev.text.trim() && text) {
    const before = splitSections(prev.text).map((x) => x.title)
    const after = splitSections(text).map((x) => x.title)
    if (before.length !== after.length || before.some((x, i) => x !== after[i])) {
      return {
        ok: false,
        action: 'set',
        version: prev.version,
        reason: `小节不能增删改（现在是 ${before.map((x) => '「' + x + '」').join(' ')}）。只改某一节的内容用 patch。`,
      }
    }
  }
  const res = writeCore(dataDir, text, reason)
  if (!res.ok) return { ok: false, action: res.action, version: res.version, reason: res.reason ?? '写不进去' }

  return {
    ok: true,
    action: res.action,
    version: res.version,
    updatedAt: res.updatedAt ?? Date.now(),
    backup: res.backup ?? null,
    before: prev.text ? prev.text.slice(0, 200) : '',
    text: res.text ?? text,
    reason: reason,           // 成功时 reason = 这次改的理由
    history: res.history ?? [],
  }
}

/** 看核心：只读，可看历史。 */
export function getCore(dataDir, args = {}) {
  const core = readCore(dataDir)
  const history = readHistory(dataDir)
  const showHistory = args.history !== false

  if (!core.text.trim()) {
    return {
      ok: true, empty: true, text: '', version: 0, updatedAt: 0,
      reason: '核心还没写',
      history: showHistory ? history : [],
    }
  }
  const limit = Math.max(1, Math.min(5000, Number(args.limit) || 2000))
  return {
    ok: true,
    empty: false,
    text: core.text.slice(0, limit),
    version: core.version,
    updatedAt: core.updatedAt,
    truncated: core.text.length > limit,
    history: showHistory ? history : [],
  }
}

/**
 * 工具定义表：只有一个 core 工具。
 *
 * 描述里提到「她自己」的地方由调用方传进来，代码里不写死具体名字。
 */
export function buildTools({ selfName = '我' } = {}) {
  const SELF = String(selfName ?? '').trim() || '我'
  return [
  {
    name: 'core',
    description: [
      `「${SELF}的核心」：一段只属于你的话，会注入到你自己的会话的系统提示词最后面。`,
      '核心是固定的小节结构：只能改每节的内容，**不能加新的小节、不能删、不能改标题**。',
      '动作（reason 全都必填）：',
      '  · patch：改一节。section 写小节标题，text 写这一节的新正文。别的节一字不动。',
      '      比如 {action:"patch", section:"二、小节标题", text:"……", reason:"……"}',
      '整篇重写、整篇清空都没有对应动作——那两个是不可逆的大事，',
      ' 要去改就直接改 core.md 文件（改之前会被自动备份到 core-backup/）。工具面只做细改。',
      '每次改都自动备份 + 记历史（最近 10 条，面板能看）。',
      '看核心：core 工具，不带 text 就是看，带 history 看最近修改历史。',
      '比如 {action:"get", history:true}',
      '这条只有你自己的会话会用上，别人的会话看不到。',
    ].join('\n'),
    params: { action: 'string', section: 'string', text: 'string', reason: 'string', limit: 'number', history: 'boolean' },
    run: (dataDir, args = {}) => {
      const action = String(args.action ?? '').trim() || (String(args.text ?? '').trim() ? 'set' : 'get')
      if (action === 'set') {
        // 整篇覆盖已经收掉了。万一有旧调用，只有当它是在清空时才放行。
        if (!String(args.text ?? '').trim()) return setCore(dataDir, { ...args, text: '' })
        return { ok: false, reason: '已经不接受整篇覆盖了：改某一节用 patch；要整体重写就直接改 core.md' }
      }

      if (action === 'get') return getCore(dataDir, args)
      if (action === 'patch') return patchCore(dataDir, args)
      return { ok: false, reason: `不认识的 action：${action}（只有 get / patch）` }
    },
    render: (r) => {
      if (!r?.ok) return `没弄成：${r?.reason ?? '不知道哪儿不对'}`
      // 看核心
      if (r.empty !== undefined) {
        if (r.empty) return '核心还没写。'
        const parts = [`核心（第 ${r.version} 版）：\n${r.text ?? ''}`]
        if (r.truncated) parts.push('\n……（还有，截断了）')
        if (r.history?.length) {
          parts.push('\n\n最近修改：')
          for (const h of r.history.slice(0, 5)) {
            parts.push(`  · ${labelOf(h.action)} ${new Date(h.at).toLocaleString('zh-CN')} ${histBodyOf(h)} 理由：${h.reason || '（没写理由）'}`)
          }
        }
        return parts.join('\n')
      }
      // 改核心
      const parts = [`核心${labelOf(r.action)}了（第 ${r.version} 版）。`]
      if (r.backup) parts.push(`旧的备份在 ${r.backup}`)
      if (r.reason) parts.push(`理由：${r.reason}`)
      parts.push('从下一轮起就生效了。')
      return parts.join('\n')
    },
  },
  {
    name: 'meme',
    needs: 'meme',
    description: [
      '表情包：按情绪或关键词找图，发的时候正文写 [表情: 名字]。',
      '',
      '六个情绪：happy 开心 / angry 生气 / sad 难过 / shy 害羞 / confused 疑惑 / daily 日常。',
      '',
      '不带参数：看六个情绪各有多少张。',
      '带 tag：按情绪找，比如 tag="sad"。',
      '带 query：按关键词找，名字、情绪、标签一起搜，空格分开的词要全中，比如 query="馋 流口水"。',
      '带 name：改清单里那张（可再给 newName / emotion / tags），只改清单不动图。',
      '',
      '发之前先查一下——清单里没有的名字发不出去。',
      '返回的候选照抄进去就行，别自己编名字。',
      '一轮发一张就够，别连着发。',
    ].join('\n'),
    params: {
      tag: { type: 'string', description: '六个情绪桶之一' },
      query: { type: 'string', description: '关键词，空格分隔多个词' },
      limit: { type: 'number', description: '最多回几条，默认 8' },
      name: { type: 'string', description: '要改的那张现在叫什么' },
      newName: { type: 'string', description: '改成什么名字' },
      emotion: { type: 'string', description: '换成哪个情绪桶' },
      tags: { type: 'array', description: '新的标签列表' },
    },
    run: (dataDir, args = {}, extra = {}) => {
      const dir = String(extra?.memeDir ?? '').trim()
      // 带 name 就是改，否则就是查
      if (args.name !== undefined && (args.newName !== undefined || args.emotion !== undefined || args.tags !== undefined)) {
        return updateMeme(dir, args)
      }
      return searchMeme(dir, args)
    },
    render: (r) => {
      if (!r) return '没结果。'
      if (!r.ok) return `没弄成：${r.reason ?? '不知道哪儿不对'}`
      return r.text ?? ''
    },
  },
  ]
}

/** 默认称呼下的工具表。 */
export const TOOLS = buildTools()

function labelOf(action) {
  return action === 'add' ? '添加' : action === 'delete' ? '删除' : action === 'modify' ? '修改' : '写'
}

/** 历史正文：修改=前→后，添加/删除=内容。 */
function histBodyOf(h) {
  const before = String(h?.before ?? '').trim()
  const after = String(h?.after ?? '').trim()
  if (h?.action === 'modify') return (before ? before + '→' : '') + (after || '（清空）')
  if (h?.action === 'delete') return before || '（空）'
  return after || '（空）'
}