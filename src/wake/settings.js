// settings.js —— 面板里的设置：读写宿主配置。
//
// 只改本插件自己那一段（cordis.patch.yml 里 dsh-qingdai-core）。
// 通用做法：configEditor.entries() 找条目 → configuration() 读出当前值
// → edit(entry, fn) 写回。
//
// 铁律：只允许改下面白名单里的字段。面板不该有能力改任意配置。

const SELF_ID = 'dsh-qingdai-core'

/** 本插件自己的配置条目。 */
export function findSelfEntry(configEditor) {
  try {
    const entries = configEditor?.entries?.() || []
    return entries.find((e) => String(e?.options?.name || '') === SELF_ID) || null
  } catch { return null }
}

function readConfigOf(configEditor, entry) {
  try {
    const rows = configEditor?.configuration?.() || []
    const row = rows.find((r) => r.entry === entry)
    return { ...(row?.inherited || {}), ...(row?.override || {}) }
  } catch { return {} }
}

/** 配置的默认值。这里是唯一一处，index.js 也读它。 */
export const DEFAULTS = {
  // 称呼：运行时提示词、工具描述里用它，别在代码里写死。
  // ownerName = 对面那个人叫什么（提示词里「X 上次说话是…」）
  // selfName  = 她自己叫什么（「X 的核心」）
  ownerName: '主人',
  selfName: '我',
  // 私人空间目录名（相对工作区）。留空 = 不提示这个目录。
  privateDir: '',
  wakeSessions: [],        // 白名单：哪些会话会被主动开口（也是唯一能被开口影响的会话）
  quietStart: 23,
  quietEnd: 9,
  silentMinutes: 360,
  wakePerDay: 6,
  enabled: true,
  fishWorld: true,
  wakeCheckMinutes: 10,
  originDate: '2026-10-29',     // 她的生日；存在天数从这天算
  workDenyTools: null,     // null = 用内置默认清单
  // 向量层（siliconflow：bge-m3 嵌入 + bge-reranker 精排，共用这一套）
  embedKey: '',
  embedBaseUrl: 'https://api.siliconflow.cn',
  embedModel: 'BAAI/bge-m3',
  embedPath: '/v1/embeddings',
  rerankBaseUrl: '',
  rerankKey: '',
  rerankModel: 'BAAI/bge-reranker-v2-m3',
  rerankPath: '/v1/rerank',
  // 记忆注入（自动回忆）
  recallEnabled: true,
  recallLimit: 3,
  recallMaxChars: 800,
  recallMinRel: 0.62,
  workRawKeepDays: 180,
  // 鱼的世界（主动开口时的小世界生成）
  fishWorldKey: '',
  fishWorldBaseUrl: '',
}

/** 读本插件当前生效配置。 */
export function readSelfConfig(configEditor) {
  const entry = findSelfEntry(configEditor)
  if (!entry) return null
  const cfg = readConfigOf(configEditor, entry)
  return {
    ownerName: String(cfg.ownerName ?? DEFAULTS.ownerName ?? '').trim() || DEFAULTS.ownerName,
    selfName: String(cfg.selfName ?? DEFAULTS.selfName ?? '').trim() || DEFAULTS.selfName,
    privateDir: String(cfg.privateDir ?? DEFAULTS.privateDir ?? '').trim(),
    wakeSessions: Array.isArray(cfg.wakeSessions) ? cfg.wakeSessions.map(String) : [],
    quietStart: num(cfg.quietStart, DEFAULTS.quietStart),
    quietEnd: num(cfg.quietEnd, DEFAULTS.quietEnd),
    silentMinutes: num(cfg.silentMinutes, DEFAULTS.silentMinutes),
    wakePerDay: num(cfg.wakePerDay, DEFAULTS.wakePerDay),
    enabled: cfg.enabled !== false,
    fishWorld: cfg.fishWorld !== false,
    wakeCheckMinutes: num(cfg.wakeCheckMinutes, DEFAULTS.wakeCheckMinutes),
    originDate: String(cfg.originDate ?? DEFAULTS.originDate ?? ''),
    workDenyTools: Array.isArray(cfg.workDenyTools) ? cfg.workDenyTools.map(String) : null,
    dataDir: cfg.dataDir ? String(cfg.dataDir) : null,
    embedKey: String(cfg.embedKey ?? DEFAULTS.embedKey ?? ''),
    embedBaseUrl: String(cfg.embedBaseUrl ?? DEFAULTS.embedBaseUrl ?? ''),
    embedModel: String(cfg.embedModel ?? DEFAULTS.embedModel ?? ''),
    embedPath: String(cfg.embedPath ?? DEFAULTS.embedPath ?? ''),
    rerankBaseUrl: String(cfg.rerankBaseUrl ?? DEFAULTS.rerankBaseUrl ?? ''),
    rerankKey: String(cfg.rerankKey ?? DEFAULTS.rerankKey ?? ''),
    rerankModel: String(cfg.rerankModel ?? DEFAULTS.rerankModel ?? ''),
    rerankPath: String(cfg.rerankPath ?? DEFAULTS.rerankPath ?? ''),
    recallEnabled: cfg.recallEnabled !== false,
    recallLimit: Number(cfg.recallLimit ?? DEFAULTS.recallLimit ?? 3),
    recallMaxChars: Number(cfg.recallMaxChars ?? DEFAULTS.recallMaxChars ?? 800),
    recallMinRel: Number(cfg.recallMinRel ?? DEFAULTS.recallMinRel ?? 0.62),
    workRawKeepDays: Number(cfg.workRawKeepDays ?? DEFAULTS.workRawKeepDays ?? 180),
    fishWorldKey: String(cfg.fishWorldKey ?? DEFAULTS.fishWorldKey ?? ''),
    fishWorldBaseUrl: String(cfg.fishWorldBaseUrl ?? DEFAULTS.fishWorldBaseUrl ?? ''),
  }
}

/**
 * 改本插件配置。
 * 只允许改白名单里的字段，其余一律拒。
 */
export async function saveSelfConfig(configEditor, patch = {}) {
  const entry = findSelfEntry(configEditor)
  if (!entry) throw new Error('找不到本插件的配置条目（cordis.patch.yml 里没有 dsh-qingdai-core）')
  const next = {}

  // 称呼与私人目录：都只是文案，长度设上限防止把整段提示词塞进配置。
  for (const key of ['ownerName', 'selfName']) {
    if (patch[key] === undefined) continue
    const v = String(patch[key] ?? '').trim()
    if (!v) throw new Error(`${key} 不能为空`)
    if (v.length > 24) throw new Error(`${key} 最多 24 字`)
    next[key] = v
  }
  if (patch.privateDir !== undefined) {
    const v = String(patch.privateDir ?? '').trim()
    if (v.length > 120) throw new Error('privateDir 最多 120 字')
    next.privateDir = v
  }

  if (patch.wakeSessions !== undefined) {
    if (!Array.isArray(patch.wakeSessions)) throw new Error('wakeSessions 必须是数组')
    const clean = patch.wakeSessions
      .map((s) => String(s ?? '').trim())
      .filter((s) => /^session-[0-9a-z-]+$/i.test(s) || /^[\w.-]{6,}$/.test(s))
    if (clean.length > 20) throw new Error('白名单最多 20 条')
    next.wakeSessions = [...new Set(clean)]
  }
  for (const key of ['quietStart', 'quietEnd']) {
    if (patch[key] !== undefined) {
      const n = Number(patch[key])
      if (!Number.isInteger(n) || n < 0 || n > 23) throw new Error(`${key} 必须是 0~23 的整数`)
      next[key] = n
    }
  }
  if (patch.silentMinutes !== undefined) {
    const n = Number(patch.silentMinutes)
    if (!Number.isFinite(n) || n < 5 || n > 4320) throw new Error('silentMinutes 必须是 5~4320 分钟')
    next.silentMinutes = Math.round(n)
  }
  if (patch.wakePerDay !== undefined) {
    const n = Number(patch.wakePerDay)
    if (!Number.isInteger(n) || n < 1 || n > 24) throw new Error('wakePerDay 必须是 1~24 的整数')
    next.wakePerDay = n
  }
  if (patch.wakeCheckMinutes !== undefined) {
    const n = Number(patch.wakeCheckMinutes)
    if (!Number.isInteger(n) || n < 1 || n > 120) throw new Error('wakeCheckMinutes 必须是 1~120 的整数')
    next.wakeCheckMinutes = n
  }
  if (patch.recallEnabled !== undefined) next.recallEnabled = patch.recallEnabled !== false
  for (const [key, lo, hi] of [['recallLimit', 1, 20], ['recallMaxChars', 100, 4000]]) {
    if (patch[key] === undefined) continue
    const n = Number(patch[key])
    if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`${key} 必须是 ${lo}~${hi} 的整数`)
    next[key] = n
  }
  if (patch.workRawKeepDays !== undefined) {
    const n = Number(patch.workRawKeepDays)
    if (!Number.isInteger(n) || n < 0 || n > 3650) throw new Error('workRawKeepDays 必须是 0~3650 的整数（0 = 不删）')
    next.workRawKeepDays = n
  }
  if (patch.recallMinRel !== undefined) {
    const n = Number(patch.recallMinRel)
    if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error('recallMinRel 必须是 0~1')
    next.recallMinRel = n
  }
  if (patch.originDate !== undefined) {
    const v = String(patch.originDate ?? '').trim()
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('originDate 必须是 YYYY-MM-DD')
    if (v) {
      const ms = Date.parse(v + 'T00:00:00')
      if (!Number.isFinite(ms)) throw new Error('originDate 不是有效日期：' + v)
      if (ms > Date.now() + 86400_000) throw new Error('originDate 不能是未来')
    }
    next.originDate = v
  }
  if (patch.enabled !== undefined) next.enabled = Boolean(patch.enabled)
  if (patch.fishWorld !== undefined) next.fishWorld = Boolean(patch.fishWorld)
  if (patch.workDenyTools !== undefined) {
    if (!Array.isArray(patch.workDenyTools)) throw new Error('workDenyTools 必须是数组')
    if (patch.workDenyTools.length > 40) throw new Error('workDenyTools 最多 40 条')
    next.workDenyTools = patch.workDenyTools.map((x) => String(x ?? '').trim()).filter(Boolean)
  }
  // ---- 向量层 / 鱼的世界 ----
  for (const key of ['embedKey', 'fishWorldKey', 'rerankKey']) {
    if (patch[key] === undefined) continue
    const v = String(patch[key] ?? '').trim()
    if (v.length > 300) throw new Error(`${key} 太长（上限 300 字）`)
    if (v && !/^[\w.~+/=-]{8,}$/.test(v)) throw new Error(`${key} 不像一个 key`)
    next[key] = v
  }
  for (const key of ['embedBaseUrl', 'fishWorldBaseUrl', 'rerankBaseUrl']) {
    if (patch[key] === undefined) continue
    const v = String(patch[key] ?? '').trim().replace(/\/+$/, '')
    if (v && !/^https?:\/\/[^\s]+$/.test(v)) throw new Error(`${key} 必须是 http(s) 地址`)
    next[key] = v
  }
  if (!Object.keys(next).length) throw new Error('没有可改的字段')

  await configEditor.edit(entry, (current) => ({ ...(current || {}), ...next }))
  return readSelfConfig(configEditor)
}

export function num(v, def) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

// ---- 压缩引擎（compaction-basic） ----
//
// 阈值 / 保留比例 / 预留 tokens / 摘要模型都在 profile 的 compaction-basic 条目里，
// 不在本插件条目下。这里单独开一条读写通道，只放行下面 5 个字段——
// 压缩错了会丢上下文，别的一律不让改。

/** 允许面板改的压缩字段。 */
export const COMPACTION_KEYS = [
  'thresholdRatio', 'retainRatio', 'headroomTokens', 'summarizationProvider', 'summarizationModel',
]

export function findCompactionEntry(configEditor) {
  try {
    const entries = configEditor?.entries?.() || []
    return entries.find((e) => {
      const name = String(e?.options?.name ?? '')
      const id = String(e?.options?.id ?? e?.id ?? '')
      return /compaction/i.test(name) || /compaction/i.test(id)
    }) || null
  } catch { return null }
}

/** 读压缩引擎当前配置。找不到条目给 null（面板显示「没接管」）。 */
export function readCompactionConfig(configEditor) {
  const entry = findCompactionEntry(configEditor)
  if (!entry) return null
  const cfg = readConfigOf(configEditor, entry)
  return {
    thresholdRatio: num(cfg.thresholdRatio, 0.8),
    retainRatio: num(cfg.retainRatio, 0.2),
    headroomTokens: num(cfg.headroomTokens, 65536),
    summarizationProvider: String(cfg.summarizationProvider ?? ''),
    summarizationModel: String(cfg.summarizationModel ?? ''),
  }
}

/** 写压缩引擎配置。只认白名单字段，比例关系要自洽。 */
export async function saveCompactionConfig(configEditor, patch = {}) {
  const entry = findCompactionEntry(configEditor)
  if (!entry) throw new Error('找不到压缩引擎条目（compaction-basic）')
  const cur = readCompactionConfig(configEditor) ?? {}
  const next = {}

  for (const key of ['thresholdRatio', 'retainRatio']) {
    if (patch[key] === undefined) continue
    const n = Number(patch[key])
    if (!Number.isFinite(n) || n < 0.05 || n > 0.95) throw new Error(`${key} 必须是 0.05~0.95`)
    next[key] = Math.round(n * 1000) / 1000
  }
  const th = next.thresholdRatio ?? cur.thresholdRatio ?? 0.8
  const rt = next.retainRatio ?? cur.retainRatio ?? 0.2
  // 保留比例必须比阈值小：相等等于刚压完立刻又到线，会连续触发
  if (!(rt < th)) throw new Error('保留比例必须小于触发阈值（不然刚压完又该压了）')

  if (patch.headroomTokens !== undefined) {
    const n = Number(patch.headroomTokens)
    if (!Number.isInteger(n) || n < 1024 || n > 1_000_000) throw new Error('headroomTokens 必须是 1024~1000000 的整数')
    next.headroomTokens = n
  }
  // 服务商和模型成对：要么都填，要么都空（空 = 跟随会话，官方原生支持）
  const askProv = patch.summarizationProvider !== undefined
  const askModel = patch.summarizationModel !== undefined
  if (askProv || askModel) {
    const prov = askProv ? String(patch.summarizationProvider ?? '').trim() : String(cur.summarizationProvider ?? '').trim()
    const mod = askModel ? String(patch.summarizationModel ?? '').trim() : String(cur.summarizationModel ?? '').trim()
    if (Boolean(prov) !== Boolean(mod)) throw new Error('服务商和模型要么都填，要么都空（跟随会话）')
    if (askProv) next.summarizationProvider = prov
    if (askModel) next.summarizationModel = mod
  }
  if (!Object.keys(next).length) throw new Error('没有可改的字段')

  await configEditor.edit(entry, (current) => ({ ...(current || {}), ...next }))
  return readCompactionConfig(configEditor)
}

/**
 * 可选的摘要模型清单：[{ provider, name, models: [{ id, name }] }]。
 * 从宿主 llm 插件（llm-pi-ai）的 providers 配置里读，本机就有，不调外部接口。
 * 读不到给空数组——面板就退化成「跟随会话 + 手填」。
 */
export function readModelCatalogue(configEditor) {
  try {
    const entries = configEditor?.entries?.() || []
    const entry = entries.find((e) => /llm-pi-ai|llm-provider/i.test(String(e?.options?.name ?? '')))
    if (!entry) return []
    const cfg = readConfigOf(configEditor, entry)
    const providers = cfg?.providers && typeof cfg.providers === 'object' ? cfg.providers : {}
    const out = []
    for (const [key, p] of Object.entries(providers)) {
      const models = Array.isArray(p?.models) ? p.models : []
      if (!models.length) continue
      const list = models
        .map((m) => ({ id: String(m?.id ?? m?.name ?? ''), name: String(m?.name ?? m?.id ?? '') }))
        .filter((m) => m.id)
      if (!list.length) continue
      out.push({ provider: key, name: String(p?.displayName ?? key), models: list })
    }
    return out
  } catch { return [] }
}

/**
 * 改了这一组字段要重启 DSH 才吃满（面板保存后要提示）。
 *
 * - workDenyTools：收窄工具面发生在会话挂载时，正在跑的会话要重新挂
 *   （保存后我们会顺手 remount 一次，但已加载的 agent 不一定吃到）
 * - 压缩那几个：配置属于 compaction-basic 条目，引擎构造时读一次
 */
// workRawKeepDays 要重启才生效：清理只在启动时跑一次（pruneWorkRaw）
export const RESTART_KEYS = ['workDenyTools', 'workRawKeepDays', ...COMPACTION_KEYS];

/** 这次保存会不会要求重启。 */
export function needsRestart(patch = {}) {
  return Object.keys(patch ?? {}).some((k) => RESTART_KEYS.includes(k));
}
