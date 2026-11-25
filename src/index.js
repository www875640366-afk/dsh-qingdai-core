// index.js —— 主插件入口：只做启动、串联、卸载。逻辑都在各模块里。
//
// 三件事（对应三合一）：
//   1. 主动开口   —— wake/ 整套搬入（白名单唯一源 = wakeSessions）
//   2. 双库记忆   —— mem_write / mem_search / raw_memory，按会话路由
//   3. 压缩联动   —— compaction/end 监听（清注入去重代次，压缩后记忆可重新带出）
//
// 模块分工：
//   db.js        双库建库建表
//   routing.js   会话 → 库（wakeSessions → qingdai / 其余 → work）
//   heat.js      遗忘曲线（一条线，一个阈值；五档全在同一条曲线上）
//   memory.js    mem_write / mem_search 纯逻辑
//   turn.js      每轮留底（events 表，永不删）
//   vector.js    嵌入 + 精排（siliconflow bge-m3）
//   extract.js   压缩时提炼记忆节点（LLM + 规则兜底）
//   secrets.js   密钥嗅探
//   tools.js     三个模型工具的定义
//   wake/        主动开口（session/mount/allowlist/core/meme/…）
//
// 【白名单唯一源】wakeSessions（wake/settings.js 管）。记忆路由与主动开口共用它，
//   避免两份名单漂移（moodmem-v2 时代跨插件读白名单的坑）。
// 【sid 拿不到 → 拒写不猜库】写错方向比读不到更糟。

import { mkdirSync, writeFileSync, renameSync, appendFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { openDb } from './db.js'
import { dbPlanFor, sidFrom, DB_NAMES, DB_DIRS } from './routing.js'
import { TOOLS as MEM_TOOLS, buildTools as buildMemTools } from './tools.js'
import { runMemWrite, runMemSearch, runRawMemory, paramsToSchema } from './tools.js'
import { flushPending, loadVectors, embedTexts, cosine, rerank as rerankApi, signatureOf } from './vector.js'
// extractFromEvents 保留但不自动调：它能从留底里补提炼一批节点，
// 只在「模型长期不写、要手动补」时用（scripts 或面板按钮）。
import { recordEvent, eventText, OWNER_SOURCES } from './turn.js'
import { createRecaller, useRecallStore, clearRecallDedupe } from './inject.js'
import { sweep, restoreFromGraveyard, unsupersede, openConflicts, resolveConflict as resolveConflictIn, forgetMemory, markUsed, purgeGraveyard, recentInjected, countInjectedSince, lastInjectBatch } from './memory.js'
import { keepOf, daysLeftOf, halfLifeOf, tierOf, frozenKeepOf, TIERS, CURVE } from './heat.js'
import { liveSessions, rawStats, rawBySession, listEvents, orphanSessions, purgeSessions, pruneEvents, rawMonths } from './raw.js'

// ---- wake 搬入的模块 ----
import { createStore, statePath } from './wake/storage.js'
import { createMounter } from './wake/mount.js'
import { createWaker } from './wake/waker.js'
import { WORLD_TOOLS, TOOL_GROUPS, defaultDeny } from './wake/allowlist.js'
import { TOOLS as WAKE_TOOLS, buildTools as buildWakeTools } from './wake/tools.js'
import { registerTools } from './wake/register.js'
import { isWakeSession } from './wake/session.js'
import { readCore, readHistory, readSectionTimes, splitSections } from './wake/core.js'
import { readSelfConfig, saveSelfConfig, findSelfEntry, readCompactionConfig, saveCompactionConfig, readModelCatalogue, needsRestart, COMPACTION_KEYS, RESTART_KEYS, DEFAULTS, num } from './wake/settings.js'
import { registerApi, readJson } from './wake/api.js'

export function createApp(ctx, config = {}) {
  // 插件自己的日志也要落一份文件：宿主的 logger 不进 DSH 的日志目录，
  // 「注入到底有没有发生」「哪条消息被跳过」这种问题在控制台里翻不到。
  // 路径跟着 dataDir 走，超过 1MB 就滚成 core.log.old（只留一份，别涨）。
  const logFile = config.dataDir ? join(config.dataDir, 'core.log') : null
  const fileLog = (level, args) => {
    if (!logFile) return
    try {
      mkdirSync(dirname(logFile), { recursive: true })
      if (existsSync(logFile) && statSync(logFile).size > 1024 * 1024) {
        renameSync(logFile, `${logFile}.old`)
      }
      appendFileSync(logFile, `${new Date().toISOString()} ${level} ${args.map(String).join(' ')}\n`, 'utf8')
    } catch { /* 记不上不影响主流程 */ }
  }
  const log = (...a) => { try { ctx?.logger?.info?.(...a) } catch { /* 没 logger 算了 */ } finally { fileLog('INFO', a) } }
  const warn = (...a) => { try { ctx?.logger?.warn?.(...a) } catch { /* 同上 */ } finally { fileLog('WARN', a) } }

  let cfg = {
    dataDir: config.dataDir ?? null,
    // 称呼：提示词和工具描述里用它，代码里不写死具体名字
    ownerName: String(config.ownerName ?? '').trim() || DEFAULTS.ownerName,
    selfName: String(config.selfName ?? '').trim() || DEFAULTS.selfName,
    privateDir: String(config.privateDir ?? '').trim(),
    wakeSessions: Array.isArray(config.wakeSessions) ? config.wakeSessions.map(String) : [],
    quietStart: num(config.quietStart, DEFAULTS.quietStart),
    quietEnd: num(config.quietEnd, DEFAULTS.quietEnd),
    silentMinutes: num(config.silentMinutes, DEFAULTS.silentMinutes),
    wakePerDay: num(config.wakePerDay, DEFAULTS.wakePerDay),
    enabled: config.enabled !== false,
    fishWorld: config.fishWorld !== false,
    wakeCheckMinutes: num(config.wakeCheckMinutes, DEFAULTS.wakeCheckMinutes),
    originDate: String(config.originDate ?? DEFAULTS.originDate ?? ''),
    workDenyTools: Array.isArray(config.workDenyTools) ? config.workDenyTools.map(String) : null,
    fishWorldKey: config.fishWorldKey || '',
    fishWorldBaseUrl: config.fishWorldBaseUrl || '',
    memeDir: String(config.memeDir ?? '').trim(),
    // 记忆层
    embedKey: config.embedKey || process.env.SILICONFLOW_KEY || process.env.SILICONFLOW_API_KEY || '',
    embedBaseUrl: config.embedBaseUrl || 'https://api.siliconflow.cn',
    embedModel: config.embedModel || 'BAAI/bge-m3',
    embedPath: config.embedPath || '/v1/embeddings',
    // 精排留空就沿用嵌入那一套（同一家服务通常一起给）
    rerankBaseUrl: config.rerankBaseUrl || '',
    rerankKey: config.rerankKey || '',
    rerankModel: config.rerankModel || 'BAAI/bge-reranker-v2-m3',
    rerankPath: config.rerankPath || '/v1/rerank',
  }
  const getCfg = () => cfg

  // configEditor：面板改配置用。apply 阶段抓，异步回调里再取会失活。
  let configEditorRef = null
  try {
    if (typeof ctx.inject === 'function') {
      ctx.inject(['configEditor'], (tctx) => {
        configEditorRef = tctx?.get?.('configEditor') ?? null
      })
    }
  } catch { /* 没有就不挂设置编辑 */ }
  const getConfigEditor = () => {
    if (configEditorRef) return configEditorRef
    try { configEditorRef = ctx.get?.('configEditor') ?? null } catch { configEditorRef = null }
    return configEditorRef
  }

  // llm 服务：宿主运行时的模型目录。读它才拿得到「全部」provider
  // （our-free-model 之类不是 llm-pi-ai 配的，读配置文件看不到）。
  let llmRef = null
  try {
    if (typeof ctx.inject === 'function') {
      ctx.inject(['llm'], (tctx) => { llmRef = tctx?.get?.('llm') ?? null })
    }
  } catch { /* 没有就退回读配置 */ }
  const getLlm = () => {
    if (llmRef) return llmRef
    try { llmRef = ctx.get?.('llm') ?? null } catch { llmRef = null }
    return llmRef
  }

  // 模型目录：listModels 是异步的，而面板路由是同步响应，
  // 所以缓存起来后台刷新——面板永远拿现成的，不会因为等模型列表卡住。
  let modelCache = []
  let modelCacheAt = 0
  let modelRefreshing = false
  const refreshModels = async () => {
    if (modelRefreshing) return
    modelRefreshing = true
    try {
      const llm = getLlm()
      if (!llm || typeof llm.listProviders !== 'function') return
      const out = []
      for (const info of llm.listProviders() ?? []) {
        const provider = String(info?.id ?? info?.provider ?? '')
        if (!provider) continue
        let models = []
        try { models = typeof llm.listModels === 'function' ? await llm.listModels(provider) : [] } catch { models = [] }
        const list = (Array.isArray(models) ? models : [])
          .filter((m) => m && typeof m.id === 'string' && m.id)
          .map((m) => ({ id: m.id, name: typeof m.name === 'string' && m.name ? m.name : m.id }))
        out.push({ provider, name: String(info?.name ?? provider), models: list })
      }
      if (out.length) { modelCache = out; modelCacheAt = Date.now() }
    } catch { /* 拿不到就退回读配置 */ } finally {
      modelRefreshing = false
    }
  }

  /** 同步给面板用：有缓存给缓存（过 60 秒后台刷），没缓存先读配置文件顶着。 */
  const modelCatalogue = () => {
    if (Date.now() - modelCacheAt > 60_000) void refreshModels()
    if (modelCache.length) return modelCache
    try { return readModelCatalogue(getConfigEditor()) } catch { return [] }
  }

  const dataDir = cfg.dataDir ?? defaultDataDir()
  const stateFile = statePath(dataDir)
  const store = createStore(stateFile)

  // ---- 路由快照：引擎在别的 realm 读它（避免跨 realm 拿配置） ----
  const writeRouting = () => {
    try {
      const file = join(dataDir, 'routing.json')
      const tmp = file + '.tmp'
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(tmp, JSON.stringify({ sessions: cfg.wakeSessions, dataDir, updatedAt: Date.now() }, null, 1), 'utf8')
      renameSync(tmp, file)
    } catch { /* 写不上不影响本进程；引擎读不到会退空表 → 全落 work 库 */ }
  }
  writeRouting()

  /** 重读自己的配置（面板保存后调，不用重启；restrict 除外）。 */
  const reloadConfig = () => {
    try {
      const next = readSelfConfig(getConfigEditor())
      if (!next) return false
      const wakeSessions = next.wakeSessions ?? cfg.wakeSessions
      const sessionsChanged = JSON.stringify(wakeSessions) !== JSON.stringify(cfg.wakeSessions)
      cfg = { ...cfg, ...next, wakeSessions }
      if (sessionsChanged) writeRouting()
      // 改了检查间隔：重建定时器，不用重启
      try { armWakeTimer() } catch { /* 定时器还没起来 */ }
      // 换了向量 key / 地址：状态不动，直接补一把（有缺才会发请求）
      try { kickVectors() } catch { /* 向量模块还没起来 */ }
      log('配置已重载')
      return true
    } catch (e) {
      warn(`配置重载失败：${e?.message ?? e}`)
      return false
    }
  }

  // ---- 库连接（按需开；路由每次现算） ----
  const dbFor = (sid) => {
    const plan = dbPlanFor(sid, dataDir, cfg.wakeSessions)
    if (!plan.ok) return plan
    return { ...plan, db: openDb(plan.db) }
  }
  const memoryDir = dataDir

  // ---- 工具注册：记忆三件（所有会话）+ 核心/表情（仅白名单） ----
  try {
    const registrar = ctx?.tools ?? null
    if (registrar) {
      registerMemoryTools(registrar, { dbFor, getCfg, dataDir: memoryDir, log,
        tools: buildMemTools({ ownerName: cfg.ownerName, selfName: cfg.selfName }),
        // 补向量的函数定义在后面，包一层延迟取
        scheduleVectorFlush: () => { try { kickVectors() } catch { /* 还没建好 */ } } })
      registerTools(registrar, {
        tools: buildWakeTools({ selfName: cfg.selfName }),
        dataDir,
        isAllowed: (sid) => isWakeSession(sid, cfg),
        getMemeDir: () => cfg.memeDir,
      })
      log(`工具已注册：${MEM_TOOLS.map((t) => t.name).join('、')}、${WAKE_TOOLS.map((t) => t.name).join('、')}`)
    } else {
      log('宿主没有工具服务，工具层未挂')
    }
  } catch (e) {
    warn(`工具注册失败：${e?.message ?? e}`)
  }

  // ---- 按会话挂（核心段注入 + 工具面收窄 + 说话时间） ----
  const mounter = createMounter({ ctx, store, getCfg, dataDir, log })
  try {
    mounter.mountAll()
    try {
      ctx.on('agent/created', ({ agent } = {}) => { try { mounter.mountAgent(agent) } catch { /* 忽略 */ } })
      ctx.on('agent/disposed', ({ agent } = {}) => {
        const sid = String(agent?.session?.id ?? '')
        if (sid) mounter.forget?.(sid)
      })
    } catch { /* 没有这个事件算了 */ }
  } catch (e) {
    warn(`挂载失败：${e?.message ?? e}`)
  }

  // ---- 记忆注入：这一轮可能用得上的旧事，自动带到眼前 ----
  //
  // 路数照 dsh-memory-tiers：主人一开口就异步预取（不阻塞这一轮），
  // 组装提示词时读已经落地的结果；注入过就清掉，同一轮不重复塞。
  // 位置必须在消息区（context() 或 pre-step），**不许进 systemPrompt.section**——
  // 系统段每轮变，整个历史前缀的缓存就废了（wake.js:40 的老教训）。
  /**
   * 注入去重落到库上：重启后不用把上午带过的再带一遍。
   * 表很小（一会话一行），30 天没动的顺手清掉。
   */
  const recallStore = {
    get(sid) {
      try {
        const plan = dbFor(String(sid ?? ''))
        if (!plan.ok) return null
        const row = plan.db.prepare('SELECT ids, gen FROM recall_sent WHERE sid = ?').get(String(sid))
        if (!row) return null
        return { ids: String(row.ids ?? '').split(',').filter(Boolean).map(Number), gen: Number(row.gen) || 0 }
      } catch { return null }
    },
    set(sid, { ids, gen }) {
      try {
        const plan = dbFor(String(sid ?? ''))
        if (!plan.ok) return
        plan.db.prepare(
          'INSERT INTO recall_sent (sid, ids, gen, at) VALUES (?,?,?,?) ON CONFLICT(sid) DO UPDATE SET ids=excluded.ids, gen=excluded.gen, at=excluded.at',
        ).run(String(sid), (ids ?? []).join(','), Number(gen) || 0, Date.now())
        plan.db.prepare('DELETE FROM recall_sent WHERE at < ?').run(Date.now() - 30 * 86_400_000)
      } catch { /* 存不下就退回内存那套 */ }
    },
    clear() {
      try {
        for (const side of ['qingdai', 'work']) {
          openDb(sideDbPath(dataDir, side)).prepare('DELETE FROM recall_sent').run()
        }
      } catch { /* 清不掉不影响 */ }
    },
  }
  useRecallStore(recallStore)

  /**
   * 工作库原文按天清：默认 180 天。生活库的原文不动——那是陪伴记录。
   * 启动时跑一次就够，原文每天长几千字节，不需要更频繁。
   */
  const pruneWorkRaw = () => {
    try {
      const days = Number(getCfg()?.workRawKeepDays ?? 180)
      if (!(days > 0)) return 0
      const db = openDb(sideDbPath(dataDir, 'work'))
      return pruneEvents(db, { keepDays: days })
    } catch { return 0 }
  }
  try { pruneWorkRaw() } catch { /* 清不掉不影响启动 */ }

  const recaller = createRecaller({
    getCfg,
    search: async (sid, query, limit) => {
      const plan = dbFor(sid)
      if (!plan.ok) return { ok: false, reason: plan.reason }
      // 这里不记账：注入要过闸、要按预算裁，由 recaller 回调 markUsed 报「真进去了的」
      return await searchMemory(plan.db, query, { limit, cfg: getCfg() })
    },
    markUsed: (sid, ids, via) => {
      const plan = dbFor(sid)
      if (!plan.ok) return
      markUsed(plan.db, ids, { via })
    },
  })
  const recallMounted = new Set()

  const attachRecall = (agent) => {
    try {
      const sid = String(agent?.session?.id ?? agent?.session?.header?.id ?? '')
      if (!sid) return
      const sp = agent?.ctx?.systemPrompt
      if (!sp || typeof sp.context !== 'function') return   // 退回 pre-step（见下）
      if (recallMounted.has(sid)) return
      // 插件被重复加载时（实测重启期间会加载两次），同名 context 已经在 scope 里，
      // 宿主会抛 "already registered"。这时**复用已有的那个**——
      // 但读的是当前这个 recaller 实例，所以旧闭包不会把新数据吃掉。
      const spec = {
        name: 'qingdai-recall',
        order: 90,
        text: () => {
          const t = recaller.take(sid)
          if (t) log(`注入旧事 ${t.length} 字（${sid.slice(0, 12)}）`)
          return t
        },
        interpolate: false,
      }
      try {
        sp.context(spec)
        recallMounted.add(sid)
        log(`记忆注入已挂（${sid.slice(0, 12)}）`)
      } catch (e) {
        const msg = String(e?.message ?? e)
        if (/already registered/.test(msg)) {
          recallMounted.add(sid)
          log(`记忆注入复用已有 context（${sid.slice(0, 12)}）`)
        } else {
          warn(`记忆注入挂不上：${msg}`)
        }
      }
    } catch (e) { warn(`记忆注入挂不上：${e?.message ?? e}`) }
  }

  try {
    ctx.on('agent/created', ({ agent } = {}) => { try { attachRecall(agent) } catch { /* 忽略 */ } })
    ctx.on('agent/disposed', ({ agent } = {}) => {
      const sid = String(agent?.session?.id ?? '')
      if (sid) recallMounted.delete(sid)
    })
    // 启动时补挂一遍（会话懒加载，这里通常扫不到几个）
    for (const a of (ctx?.agents?.list?.() ?? [])) { try { attachRecall(a) } catch { /* 忽略 */ } }
  } catch (e) { warn(`记忆注入监听挂不上：${e?.message ?? e}`) }

  // 宿主没有 systemPrompt.context() 时的退路：在 pre-step 里往消息末尾加一条。
  // 和 context() 同时挂也不会重复——recaller.take 是消费式的，先拿到的那个独占。
  try {
    ctx.on('agent/pre-step', async (payload, next) => {
      // next() 留在 try 外：它是宿主的决策链，它抛错就该往上抛。
      // 里面那个 try 管的是我们自己的注入，那才允许失败不影响这一轮。
      const decision = await next()
      try {
        if (decision?.kind !== 'enter' || !Array.isArray(decision.messages)) return decision
        const sid = String(payload?.agent?.session?.id ?? payload?.agent?.sessionId ?? payload?.sessionId ?? '')
        if (!sid) return decision
        const text = recaller.take(sid)
        if (!text) return decision
        log(`注入旧事 ${text.length} 字（${sid.slice(0, 12)}）`)
        return {
          ...decision,
          messages: [...decision.messages, {
            id: `qingdai-recall-${Date.now()}`,
            role: 'user',
            content: [{ type: 'text', text }],
            source: { kind: 'qingdai-recall' },
          }],
        }
      } catch { return decision }
    })
  } catch { /* 没有这个事件就算了，context() 那条路还在 */ }

  // 主人一开口就预取（不 await：embedding 是一次网络请求，别拖慢这一轮）
  try {
    ctx.on('session/event', (session, event) => {
      try {
        if (event?.type !== 'user/message') return
        const sid = String(session?.id ?? session?.header?.id ?? '')
        if (!sid) return
        const src = String(event?.data?.source?.kind ?? event?.payload?.source?.kind ?? '')
        if (src && !OWNER_SOURCES.has(src)) return   // 宿主注入的提醒不算，别拿它去检索
        const text = eventText(event)
        if (!text || text.length < 2) return
        void recaller.prefetch(sid, text)
      } catch { /* 预取失败不影响这一轮 */ }
    }, { global: true })
  } catch (e) { warn(`记忆预取挂不上：${e?.message ?? e}`) }

  // ---- 留底：每条消息事件记一条（不按轮重取快照，见 turn.js 头注释） ----
  try {
    const seenSkip = new Set()
    const onSessionEvent = (session, event) => {
      try {
        const type = event?.type
        if (type !== 'user/message' && type !== 'assistant/message') return
        const sid = String(session?.id ?? session?.header?.id ?? '')
        if (!sid) return
        const plan = dbPlanFor(sid, dataDir, cfg.wakeSessions)
        if (!plan.ok) return
        const db = openDb(plan.db)
        const anySource = plan.side === 'qingdai'   // 生活会话宽松，工作会话严
        const r = recordEvent(db, session, event, { anySource })
        // 每种跳过原因只记一次（宿主注入的提醒每轮都有，全记会刷屏）。
        // 但「哪个来源被拒了」必须留痕——来源写错的表现就是「她说的话没进留底」，
        // 没有这行只能瞎猜。
        if (!r.ok) {
          const why = String(r.reason ?? '')
          if (!seenSkip.has(why)) { seenSkip.add(why); log(`留底跳过：${why}`) }
        }
      } catch (e) {
        warn(`留底异常：${e?.message ?? e}`)
      }
    }
    ctx.on('session/event', onSessionEvent, { global: true })
  } catch (e) {
    warn(`留底监听挂不上：${e?.message ?? e}`)
  }

  // ---- 压缩联动：压缩结束只做一件事——提醒上下文断过、可以补记 ----
  //
  // 【为什么不在压缩后自动提炼】自动提炼和「模型自己写」天然打架：
  //   同一件事被模型写一遍、又被提炼器抽一遍，措辞不同就是两条；
  //   而模型自己在场、有完整上下文，判断比事后从留底里猜准得多。
  //   所以提炼不自动跑，只保留压缩后的提醒——把「记不记」交还给模型。
  //   （dsh-plastic-memory 同款取舍：它压根没有自动提炼，全靠模型自己在对话里写。）
  // 【为什么提醒放压缩后】压缩前注入会被一起压掉；压缩后注入能确保模型读到。
  // 【extract.js 现状】批量提炼的函数还在（extractFromEvents），但没有调用点：
  //   要接手动补提炼，就在面板加一个按钮调它。别接回自动路径。
  try {
    ctx.on('session/event', async (session, event) => {
      if (event?.type !== 'compaction/end') return
      const sid = String(session?.id ?? session?.header?.id ?? '')
      if (!sid) return
      // 压缩把上下文里的旧内容拿走了：注入去重跟着作废，被压走的那几条该重新带。
      // 这里做一次，不依赖引擎那条路走不走得通。
      try { clearRecallDedupe(sid) } catch { /* 清不掉不影响提醒 */ }
      try {
        const agent = ctx?.agents?.get?.(sid) ?? null
        const inner = agent?.followup ? agent : agent?.agent
        if (inner?.followup) {
          await inner.followup({
            id: `qingdai-compacted-${Date.now()}`,
            role: 'user',
            content: [{
              type: 'text',
              text: '[系统] 刚才上下文被压缩过一段，早前的话在留底里。想找回原话可以用 raw_memory 查。'
                + '如果刚才有没来得及记下的事，现在用 mem_write 补一条。',
            }],
            source: { kind: 'qingdai-compact-note' },
          })
        }
      } catch { /* 注入失败不影响会话 */ }
    }, { global: true })
  } catch (e) {
    warn(`压缩监听挂不上：${e?.message ?? e}`)
  }

  // ---- 向量补算：状态列 + 懒触发，一个定时器都不开 ----
  //
  // 待补 = vec_state 不是 synced/failed 且 superseded=0。查出来补，补完标 synced。
  // 失败 +1 次，满 3 次标 failed 不再试——一条坏数据不许把后面的堵死。
  // 没有队列、没有水位：要不要补跟 id 顺序无关，复活老条目也漏不了。
  let vecRunning = false
  let vecDirty = false

  /** 一个库补到没有待办为止（一次最多 20 批，防呆）。 */
  const drainOneDb = async (side) => {
    const batch = 16
    let total = 0
    try {
      const db = openDb(sideDbPath(dataDir, side))
      for (let i = 0; i < 20; i++) {
        const r = await flushPending(db, {
          apiKey: cfg.embedKey, baseUrl: cfg.embedBaseUrl,
          model: cfg.embedModel, path: cfg.embedPath,
          signature: signatureOf(cfg.embedModel),
          batch,
        })
        total += r.done
        if (!r.ok) {
          if (r.reason) log(`向量 ${side} 没成：${r.reason}`)
          // 换了模型/维度变了：这一轮只是把老向量清了，接着下一轮用新模型重算
          if (String(r.reason || '').includes('已清空待重算')) continue
          return total
        }
        if (r.done < batch) return total
      }
    } catch (e) {
      log(`向量 ${side} 出错：${e?.message ?? e}`)
    }
    return total
  }

  const drainVectors = async () => {
    if (!cfg.embedKey) return
    if (vecRunning) { vecDirty = true; return }
    vecRunning = true
    try {
      do {
        vecDirty = false
        for (const side of ['qingdai', 'work']) {
          const n = await drainOneDb(side)
          if (n) log(`向量 ${side}：+${n}`)
        }
      } while (vecDirty)   // 跑的时候又写了新记忆：接着补一轮
    } finally {
      vecRunning = false
    }
  }

  /** 有动静就补一把。不 await、不排队。 */
  const kickVectors = () => { try { void drainVectors() } catch { /* 忽略 */ } }

  // 启动补一次（状态在库里，重启不会漏）
  kickVectors()
  // 模型目录预热：llm 服务可能晚一拍就绪，等 5 秒拉一次，面板打开时就是全量
  try { const t = setTimeout(() => { void refreshModels() }, 5000); if (typeof t.unref === 'function') t.unref() } catch { /* 忽略 */ }

  // ---- 生命周期惰性扫（不用定时器：开关机各扫一次） ----
  try {
    setTimeout(() => {
      for (const side of ['qingdai', 'work']) {
        try {
          const db = openDb(sideDbPath(dataDir, side))
          const r = sweep(db)
          if (r.forgotten || r.purged) log(`生命周期 ${side}：曲线淘汰 ${r.forgotten} / 台账到期清 ${r.purged}`)
        } catch { /* 单库失败不影响别库 */ }
      }
    }, 12_000).unref?.()
  } catch { /* 忽略 */ }

  // ---- 主动开口 ----
  const waker = createWaker({ ctx, store, getCfg, dataDir, log, warn })
  // 间隔可重建：面板改「检查间隔」后 reloadConfig 会重排，不用重启
  let wakeTimer = null
  const armWakeTimer = () => {
    if (wakeTimer !== null) { try { clearInterval(wakeTimer) } catch { /* 已经清过 */ } }
    wakeTimer = setInterval(() => { void waker.tryWake() }, Math.max(1, cfg.wakeCheckMinutes) * 60_000)
    if (typeof wakeTimer.unref === 'function') wakeTimer.unref()
  }
  armWakeTimer()
  try { ctx.effect?.(() => () => { if (wakeTimer !== null) clearInterval(wakeTimer) }, 'qingdai-core: wake timer') } catch { /* 没 effect 算了 */ }
  // boot wake：插件加载 5 秒后补一次检查。
  // 【为什么带冷却】重启 ≠ 想说话。以前每次重载（改配置、重启 DSH、插件热挂）都无条件
  // 试一次，只要「够久没聊」那道闸开着就直接再投一条。2026-11-25 10:33 和 10:34 连着
  // 两次重启，就各投了一条，微信那边连着收到两条「[自己醒的]」。
  // 冷却只挡「刚开过口又赶上重启」这一种，定时器照常，不干预正常节奏。
  const BOOT_WAKE_COOLDOWN_MS = 10 * 60_000
  const bootTimer = setTimeout(() => {
    const last = Number(store.get()?.lastProactiveAt) || 0
    const gap = Date.now() - last
    if (last > 0 && gap < BOOT_WAKE_COOLDOWN_MS) {
      log(`重启不补开口：${Math.max(1, Math.round(gap / 60_000))} 分钟前刚开过口`)
      return
    }
    void waker.tryWake()
  }, 5000)
  if (typeof bootTimer.unref === 'function') bootTimer.unref()
  try { ctx.effect?.(() => () => clearTimeout(bootTimer), 'qingdai-core: boot wake') } catch { /* 同上 */ }

  // ---- 面板路由 ----
  try {
    registerApi(ctx, warn, {
      store,
      settings: { readSelfConfig, saveSelfConfig, findSelfEntry, saveCompactionConfig },
      compaction: () => { try { return readCompactionConfig(getConfigEditor()) } catch { return null } },
      compactionKeys: COMPACTION_KEYS,
      restartKeys: RESTART_KEYS,
      needsRestart,
      modelCatalogue,
      configEditor: getConfigEditor,
      reloadConfig,
      readJson,
      getCfg,
      mem: {
        /** 某一侧的记忆列表。side: qingdai | work */
        list(side, { limit = 100, offset = 0, q = '', showSuperseded = false } = {}) {
          const db = openDb(sideDbPath(dataDir, side))
          const where = []
          const args = []
          if (!showSuperseded) where.push('superseded = 0')
          if (q) { where.push('text LIKE ?'); args.push(`%${q}%`) }
          const rows = db.prepare(
            `SELECT id, text, importance, pinned, frozenKeep, pinRequest, accessCount,
                    createdAt, lastTouchedAt, lastMentionedAt, superseded, sources
             FROM memories ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
             ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
          ).all(...args, Math.max(1, Math.min(500, Number(limit) || 100)), Math.max(0, Number(offset) || 0))
          const now = Date.now()
          const DAY = 86_400_000
          return rows.map((r) => {
            const last = Number(r.lastTouchedAt) || Number(r.lastMentionedAt) || Number(r.createdAt) || now
            // 钉住的读冻结值，其余读曲线——两边不各说各话
            const keep = Number(r.pinned) ? frozenKeepOf(r, now, CURVE) : keepOf(r, now, CURVE)
            const daysLeft = Number(r.pinned) ? null : Math.round(daysLeftOf(r, now, CURVE))
            return {
              id: Number(r.id),
              text: String(r.text ?? ''),
              importance: Number(r.importance) || 0.3,
              pinned: Boolean(r.pinned),
              frozenKeep: r.frozenKeep == null ? null : Number(r.frozenKeep),
              pinRequest: r.pinRequest == null ? null : String(r.pinRequest),
              accessCount: Number(r.accessCount) || 0,
              createdAt: Number(r.createdAt) || 0,
              lastTouchedAt: last,
              superseded: Boolean(r.superseded),
              sources: r.sources ? safeJson(r.sources) : null,
              keep: Math.round(keep * 1000) / 1000,
              daysLeft,
              halfLife: Math.round(halfLifeOf(r, CURVE) * 10) / 10,
              tier: tierOf(r, now, CURVE),
              tierLabel: TIERS[tierOf(r, now, CURVE)] ?? '',
              idleDays: Math.floor((now - last) / DAY),
            }
          })
        },
        /** 原文库：翻原文。两个库都按时间倒序，不按会话隔离。 */
        raw(side, opts = {}) {
          const db = openDb(sideDbPath(dataDir, side))
          return { ...listEvents(db, opts), stats: rawStats(db) }
        },
        /**
         * 遗忘台账（最近删除）。进满 14 天没被捡走的，读之前顺手清掉。
         * 每条都带剩余天数——窗口是有限的，得让人看见。
         */
        graveyard(side, { limit = 100 } = {}) {
          const db = openDb(sideDbPath(dataDir, side))
          purgeGraveyard(db)
          const now = Date.now()
          const DAY = 86_400_000
          const grace = CURVE.graveyardDays ?? 14
          return db.prepare(
            'SELECT id, originalId, text, importance, heat, reason, at FROM graveyard ORDER BY at DESC LIMIT ?',
          ).all(Math.max(1, Math.min(500, Number(limit) || 100))).map((r) => {
            const at = Number(r.at) || 0
            const expiresAt = at + grace * DAY
            return {
              id: Number(r.id),
              originalId: r.originalId == null ? null : Number(r.originalId),
              text: String(r.text ?? ''),
              importance: Number(r.importance) || 0.3,
              reason: String(r.reason ?? ''),
              at,
              expiresAt,
              daysLeft: Math.max(0, Math.ceil((expiresAt - now) / DAY)),
            }
          })
        },
        /** 最近被自动注入的：面板上给人看「她这阵子都带了什么」。 */
        lastInjectBatch(side) {
          const db = openDb(sideDbPath(dataDir, side))
          return lastInjectBatch(db)
        },
        countInjected(side, since) {
          const db = openDb(sideDbPath(dataDir, side))
          return countInjectedSince(db, since)
        },
        recentInjected(side, limit) {
          const db = openDb(sideDbPath(dataDir, side))
          return recentInjected(db, { limit })
        },
        /** 原文有哪些年月：原文页按年/月翻的时候用。 */
        rawMonths(side) {
          const db = openDb(sideDbPath(dataDir, side))
          return rawMonths(db)
        },
        /** 原文库按会话分组：给「原文」页的会话维度用。扫不到会话目录时 canJudge=false。 */
        rawSessions(side) {
          const db = openDb(sideDbPath(dataDir, side))
          // 会话存档在 $DSH_HOME/sessions/<桶>/<session-id>/，不在插件自己的 dataDir 下。
          // 以前这里拼的是 join(dataDir,'sessions')——那个目录根本不存在，扫出来永远空集，
          // 于是一条活跃会话都被判成「已死」，孤儿数 = 全会话数，点一次「清孤儿」就清空整个库。
          let live = null
          try { live = liveSessions(sessionsRoot()) } catch { live = null }
          // 扫到一个会话都没有时不能声称「能判孤儿」：空集说明的是目录不对或环境还没跑起来，
          // 不是「所有会话都死了」。拿空集去判，就是上面那个清空库的事故。
          const canJudge = Boolean(live && live.size > 0)
          const rows = rawBySession(db).map((r) => ({
            ...r,
            alive: canJudge ? live.has(String(r.sid)) : null,
          }))
          const orphan = canJudge ? orphanSessions(db, live) : { ok: true, rows: [], count: 0, bytes: 0 }
          // orphanSessions 返回的是对象 {ok, rows, bytes, count}，不是数组。
          // 以前写成 orphan.length —— 永远 undefined，面板上「清孤儿会话」显示 0 个且按钮置灰。
          const orphanCount = Array.isArray(orphan?.rows) ? orphan.rows.length : 0
          return { ok: true, rows, canJudge, orphanCount, orphan }
        },
        /** 丢掉某些会话的留底原文。 */
        purgeRaw(side, sids) {
          const db = openDb(sideDbPath(dataDir, side))
          return purgeSessions(db, Array.isArray(sids) ? sids : [])
        },
        /** 手动删一条：搬进台账，不物理删。 */
        forget(side, id) {
          const db = openDb(sideDbPath(dataDir, side))
          return forgetMemory(db, Number(id))
        },
        /** 从台账恢复一条。 */
        restore(side, graveyardId) {
          const db = openDb(sideDbPath(dataDir, side))
          return restoreFromGraveyard(db, Number(graveyardId))
        },
        /**
         * 体检：把遗忘曲线一直在算的东西摆出来。
         * 不调模型——留存率、半衰期、还能活几天本来每轮都在算，只是从来没给人看过。
         *
         * 五档全在同一条曲线上，按「还能活多久」切：
         *   核心（人钉住的，冻结）/ 重要 >150天 / 正常 60~150天 / 快忘了 <60天 / 被遗忘（已在最近删除）
         */
        checkup(side) {
          const db = openDb(sideDbPath(dataDir, side))
          const now = Date.now()
          const DAY = 86_400_000
          const rows = db.prepare(
            `SELECT id, text, importance, pinned, frozenKeep, accessCount, createdAt,
                    lastTouchedAt, lastMentionedAt
             FROM memories WHERE superseded = 0 ORDER BY createdAt DESC`,
          ).all()
          const out = rows.map((r) => {
            const item = { ...r, lastTouchedAt: Number(r.lastTouchedAt) || Number(r.lastMentionedAt) || Number(r.createdAt) || now }
            const tier = tierOf(item, now, CURVE)
            const keep = Number(r.pinned) ? frozenKeepOf(item, now, CURVE) : keepOf(item, now, CURVE)
            const daysLeft = Number(r.pinned) ? null : Math.round(daysLeftOf(item, now, CURVE))
            return {
              id: Number(r.id),
              text: String(r.text ?? ''),
              importance: Number(r.importance) || 0.3,
              pinned: Boolean(r.pinned),
              keep: Math.round(keep * 1000) / 1000,
              daysLeft,
              halfLife: Math.round(halfLifeOf(item, CURVE) * 10) / 10,
              idle: Math.floor((now - item.lastTouchedAt) / DAY),
              accessCount: Number(r.accessCount) || 0,
              tier,
              state: tier,   // 老字段名，面板还在读
            }
          })
          const n = (s) => out.filter((x) => x.tier === s).length
          const grave = db.prepare('SELECT COUNT(*) AS n FROM graveyard').get()?.n ?? 0
          return {
            rows: out,
            summary: {
              total: out.length,
              core: n('core'),
              important: n('important'),
              normal: n('normal'),
              fading: n('fading'),
              gone: Number(grave) || 0,   // 过线的都在最近删除里
            },
            tiers: TIERS,
          }
        },
        /** 一侧的分级分布（面板顶部那条彩色分段用）。五档全在同一条曲线上。 */
        stats(side) {
          const db = openDb(sideDbPath(dataDir, side))
          const one = (sql) => {
            try { return Number(db.prepare(sql).get()?.n) || 0 } catch { return 0 }
          }
          const now = Date.now()
          const rows = db.prepare(
            `SELECT id, importance, pinned, frozenKeep, accessCount, createdAt,
                    lastTouchedAt, lastMentionedAt
             FROM memories WHERE superseded = 0`,
          ).all()
          const count = { core: 0, important: 0, normal: 0, fading: 0, gone: 0 }
          for (const r of rows) count[tierOf(r, now, CURVE)]++
          return {
            total: rows.length,
            core: count.core,
            important: count.important,
            normal: count.normal,
            fading: count.fading,
            gone: count.gone,
            // 老字段名留着：面板的分级条还在按它们取数
            mid: count.important,
            low: count.normal + count.fading,
            cold: 0,
            pinned: count.core,
            pendingPin: one('SELECT COUNT(*) AS n FROM memories WHERE superseded = 0 AND pinRequest IS NOT NULL AND pinned = 0'),
            vectors: one('SELECT COUNT(*) AS n FROM vectors'),
            events: one('SELECT COUNT(*) AS n FROM events'),
            graveyard: one('SELECT COUNT(*) AS n FROM graveyard'),
            conflicts: one("SELECT COUNT(*) AS n FROM conflicts WHERE state = 'open'"),
            tiers: TIERS,
          }
        },
        /**
         * 待决定：三类要人拍板的事。
         *   替代 —— 这条被后来的记忆压下去了，可能压错（旧的是对的）
         *   遗忘 —— 掉进台账了，可以捡回来
         *   钉住 —— 模型想把这条永久保下来。这是「永不遗忘」的唯一入口，必须人点头。
         * 都是「已经发生、可逆」的动作，所以能拿来让人点头。
         */
        pending(side, { limit = 50 } = {}) {
          const db = openDb(sideDbPath(dataDir, side))
          const lim = Math.max(1, Math.min(200, Number(limit) || 50))
          const rows = db.prepare(
            `SELECT m.id, m.text, m.importance, m.createdAt, m.supersededBy,
                    k.id AS keeperId, k.text AS keeperText, k.createdAt AS keeperAt
             FROM memories m
             LEFT JOIN memories k ON k.id = m.supersededBy
             WHERE m.superseded = 1
             ORDER BY m.createdAt DESC LIMIT ?`,
          ).all(lim)
          return {
            replaced: rows.map((r) => ({
              id: Number(r.id),
              text: String(r.text ?? ''),
              importance: Number(r.importance) || 0.6,
              createdAt: Number(r.createdAt) || 0,
              keeperId: r.keeperId == null ? null : Number(r.keeperId),
              keeperText: r.keeperText == null ? null : String(r.keeperText),
              keeperAt: r.keeperAt == null ? null : Number(r.keeperAt),
            })),
            conflicts: openConflicts(db, { limit: lim }),
            pinRequests: db.prepare(
              `SELECT id, text, importance, pinRequest, pinRequestAt, createdAt
               FROM memories
               WHERE pinRequest IS NOT NULL AND superseded = 0 AND pinned = 0
               ORDER BY pinRequestAt DESC LIMIT ?`,
            ).all(lim).map((r) => ({
              id: Number(r.id),
              text: String(r.text ?? ''),
              importance: Number(r.importance) || 0.3,
              reason: String(r.pinRequest ?? ''),
              at: Number(r.pinRequestAt) || Number(r.createdAt) || 0,
            })),
            // 已经钉住的：给个能解开的地方。老库里按 0.9 自动钉的那些也从这里下。
            pinned: db.prepare(
              `SELECT id, text, importance, frozenKeep, createdAt
               FROM memories WHERE pinned = 1 AND superseded = 0
               ORDER BY createdAt DESC LIMIT ?`,
            ).all(lim).map((r) => ({
              id: Number(r.id),
              text: String(r.text ?? ''),
              importance: Number(r.importance) || 0.3,
              frozenKeep: Math.round((Number(r.frozenKeep) || 1) * 1000) / 1000,
              at: Number(r.createdAt) || 0,
            })),
            forgotten: db.prepare(
              'SELECT id, originalId, text, importance, heat, reason, at FROM graveyard ORDER BY at DESC LIMIT ?',
            ).all(lim).map((r) => ({
              id: Number(r.id),
              originalId: r.originalId == null ? null : Number(r.originalId),
              text: String(r.text ?? ''),
              importance: Number(r.importance) || 0.3,
              reason: String(r.reason ?? ''),
              at: Number(r.at) || 0,
            })),
          }
        },
        /** 处理一条待审冲突：replace 替代旧的 / keep 两条都留 / drop 算了。 */
        resolveConflict(side, { id, action }) {
          const db = openDb(sideDbPath(dataDir, side))
          return resolveConflictIn(db, { id: Number(id), action: String(action ?? '') })
        },
        /** 撤销一次替代（旧的回来，替它的那条下去）。 */
        unsupersede(side, id) {
          const db = openDb(sideDbPath(dataDir, side))
          return unsupersede(db, Number(id))
        },
        /**
         * 钉子审批：同意 → 冻结，这条从此不按曲线走。
         *
         * 冻结点记的是**现在**的留存率，不是 1.0——它已经活了多久就是多久，
         * 钉住只保证「不再掉」，不是退回满血。
         */
        approvePin(side, id) {
          const db = openDb(sideDbPath(dataDir, side))
          const row = db.prepare(
            `SELECT id, importance, accessCount, createdAt, lastTouchedAt, lastMentionedAt
             FROM memories WHERE id = ? AND superseded = 0`,
          ).get(Number(id))
          if (!row) return { ok: false, reason: '库里没有这条' }
          const frozen = keepOf(row, Date.now(), CURVE)
          db.prepare(
            'UPDATE memories SET pinned = 1, frozenKeep = ?, pinRequest = NULL, pinRequestAt = NULL WHERE id = ?',
          ).run(frozen, row.id)
          return { ok: true, id: Number(row.id), frozenKeep: Math.round(frozen * 1000) / 1000 }
        },
        /** 不同意：请求作废，这条按正常曲线走，别的一个字都不改。 */
        rejectPin(side, id) {
          const db = openDb(sideDbPath(dataDir, side))
          const r = db.prepare(
            'UPDATE memories SET pinRequest = NULL, pinRequestAt = NULL WHERE id = ? AND pinRequest IS NOT NULL',
          ).run(Number(id))
          return { ok: Number(r.changes) > 0, id: Number(id) }
        },
        /**
         * 解钉：回到曲线上。时间基准重置到现在（等于刚被想起一次）。
         * 不重置的话，钉着的时候冻住、一解开立刻过线，等于变相删了它。
         */
        unpin(side, id) {
          const db = openDb(sideDbPath(dataDir, side))
          const now = Date.now()
          const n = Number(id)
          const r = db.prepare(
            'UPDATE memories SET pinned = 0, frozenKeep = NULL, lastTouchedAt = ?, lastMentionedAt = ? WHERE id = ? AND pinned = 1',
          ).run(now, now, n)
          // changes 带出去：前端失败时能直接把「改了 0 行」摆出来，不用猜
          return { ok: Number(r.changes) > 0, id: n, side, changes: Number(r.changes) }
        },
      },
      remount: () => mounter.remountAll?.(),
      worldTools: WORLD_TOOLS,
      toolGroups: TOOL_GROUPS,
      denyDefaults: defaultDeny(),
      core: () => {
        // 每节自带的修改时间一起给出去，面板上每条才显示得对
        const core = readCore(dataDir)
        const times = readSectionTimes(dataDir)
        const sections = splitSections(core.text).map((x) => ({
          title: x.title,
          text: x.text,
          at: Number(times[x.title]) || core.updatedAt || 0,
        }))
        return { ...core, sections }
      },
      coreHistory: () => readHistory(dataDir),
      diag: () => mounter.diag(),
      originAt: () => Date.parse(String(cfg.originDate || '') + 'T00:00:00') || 0,
      dataDir,
      stateFile,
      onWake: () => { void waker.tryWake() },
      // 记忆层状态（面板展示用）
      memory: () => {
        const out = {}
        for (const side of ['qingdai', 'work']) {
          try {
            const db = openDb(sideDbPath(dataDir, side))
            out[side] = db.prepare('SELECT COUNT(*) AS n FROM memories WHERE superseded = 0').get().n
            // v4 起没有 cold 那一档了（一条线，过线就直接进最近删除）
            out[side + 'Cold'] = 0
            out[side + 'Pinned'] = db.prepare('SELECT COUNT(*) AS n FROM memories WHERE superseded = 0 AND pinned = 1').get().n
            out[side + 'PinPending'] = db.prepare('SELECT COUNT(*) AS n FROM memories WHERE superseded = 0 AND pinRequest IS NOT NULL AND pinned = 0').get().n
            out[side + 'Grave'] = db.prepare('SELECT COUNT(*) AS n FROM graveyard').get().n
            out[side + 'Events'] = db.prepare('SELECT COUNT(*) AS n FROM events').get().n
            const { n: vecs } = db.prepare('SELECT COUNT(*) AS n FROM vectors').get()
            out[side + 'Vectors'] = vecs
          } catch { out[side] = 0 }
        }
        return out
      },
    })
  } catch (e) {
    warn(`面板路由挂载失败：${e?.message ?? e}`)
  }

  return {
    store,
    tryWake: waker.tryWake,
    mountAgent: mounter.mountAgent,
  }
}

// ---- 记忆工具注册：execute 里按会话路由，参数不暴露库 ----
/**
 * 出处锚：这条记忆是哪个会话的哪一段产生的。
 * 模型上下文里没有时间戳也没有 seq，任何由模型填的区间都是编的——只能这里算。
 * 「这一段」= 该会话最近一条主人消息的时间点 → 现在。
 */
/** 一侧（生活/工作）的库文件路径。面板和统计共用这一处，别再各写一遍三元表达式。 */
/**
 * 一侧（生活/工作）的库文件路径。面板和统计共用这一处，别再各写一遍三元表达式。
 *
 * 【磁盘名 vs 内部标识】磁盘上生活库叫 life/life.db（更通用，开源出去别人也好懂），
 * 但内部 side 值、API 参数、面板选项卡仍用 'qingdai'（历史兼容，改它牵连太广且没收益）。
 * 这里就是两者的唯一映射点。
 */
function sideDbPath(dataDir, side) {
  const s = side === 'work' ? 'work' : 'qingdai'
  return join(dataDir, DB_DIRS[s], DB_NAMES[s])
}

/** sources 里存的是 JSON；解析失败就当没有（老数据是 seq 数组，显示不出来也不该报错）。 */
function safeJson(v) {
  try { return JSON.parse(String(v)) } catch { return null }
}

function anchorFor(db, sid, now = Date.now()) {
  const id = String(sid ?? '')
  try {
    const row = db.prepare(
      "SELECT ts FROM events WHERE sid = ? AND role = 'user' ORDER BY ts DESC LIMIT 1",
    ).get(id)
    const fromTs = Number(row?.ts)
    return { sid: id, fromTs: Number.isFinite(fromTs) ? Math.min(fromTs, now) : now, toTs: now }
  } catch {
    return { sid: id, fromTs: now, toTs: now }
  }
}

/**
 * 一次检索：embed → 双闸 → 精排融合。
 * 工具（mem_search）和注入共用这一条路——两处标准必须一致，
 * 否则「她查到的」和「自动带进来的」会是两套口径。
 *
 * 【不在这里记账】记账由调用方决定（见 mark 参数）：
 * 注入那条路要过两道闸、还要按预算裁，只有真进上下文的才算被想起。
 */
async function searchMemory(db, query, { limit, cfg, mark = false } = {}) {
  const q = String(query ?? '').trim()
  const vectors = loadVectors(db)
  let queryVec = null
  try {
    if (q && cfg?.embedKey) {
      const e = await embedTexts([q], { apiKey: cfg.embedKey, baseUrl: cfg.embedBaseUrl, model: cfg.embedModel, path: cfg.embedPath })
      if (e.ok) queryVec = e.vectors[0]
    }
  } catch { /* 降级关键词 */ }
  const doRerank = Boolean(cfg?.embedKey) && cfg?.rerankEnabled !== false
  const args = { query: q }
  if (limit != null) args.limit = limit
  const out = runMemSearch({
    db, vectors, cosine, queryVec,
    rerank: doRerank
      ? (qs, docs) => rerankApi(qs, docs, {
          apiKey: cfg.rerankKey || cfg.embedKey,
          baseUrl: cfg.rerankBaseUrl || cfg.embedBaseUrl,
          model: cfg.rerankModel,
          path: cfg.rerankPath,
        })
      : null,
  }, args)
  // 工具路径：命中的就是模型真的看到的，直接记。
  if (mark && out?.ok && out.hits?.length) {
    try { markUsed(db, out.hits.map((h) => h.id), { via: 'search' }) } catch { /* 记账失败不挡检索 */ }
  }
  return out
}

function registerMemoryTools(registrar, { dbFor, getCfg, dataDir, log, scheduleVectorFlush, tools }) {
  for (const tool of (tools ?? MEM_TOOLS)) {
    const spec = {
      name: tool.name,
      description: tool.description,
      parameters: paramsToSchema(tool.params),
      output: {
        schema: { type: 'object', additionalProperties: true },
        render: (_args, value) => [{ type: 'text', text: tool.render(value) }],
      },
      async execute(args, exec) {
        try {
          const sid = sidFrom(exec?.agent ?? exec)
          const plan = dbFor(sid)
          if (!plan.ok) return { ok: false, reason: plan.reason }
          const db = plan.db
          if (tool.name === 'mem_write') {
            const anchor = anchorFor(db, sid)
            const r = runMemWrite({ db, anchor }, args ?? {})
            // 真写进去了才补向量；撞重复 / 被拦下的不算
            if (r && r.ok === true && !r.duplicate) scheduleVectorFlush?.()
            return r
          }
          if (tool.name === 'mem_search') {
            // mark=true：模型主动搜到并拿到的，就是「真的到眼前了」，照实记账
            return await searchMemory(db, args?.query, { limit: args?.limit, cfg: getCfg(), mark: true })
          }
          if (tool.name === 'raw_memory') {
            // 两个库都不按会话隔离：会话同一时间只会有一个，按时间排下来就是先后顺序。
            // sid 仍然存着（去重和溯源要用），但不再参与查询过滤。
            return runRawMemory({ db, sid, crossSession: true }, args ?? {})
          }
          return { ok: false, reason: `未知工具 ${tool.name}` }
        } catch (error) {
          return { ok: false, reason: String(error?.message ?? error) }
        }
      },
    }
    try {
      if (typeof registrar.register === 'function') registrar.register(spec)
      else if (typeof registrar.registerTool === 'function') registrar.registerTool(spec)
      else if (typeof registrar.define === 'function') registrar.define(spec)
      else if (typeof registrar === 'function') registrar(spec)
    } catch (e) {
      log(`工具 ${tool.name} 注册失败：${e?.message ?? e}`)
    }
  }
}


/** 状态与库目录：$DSH_HOME/storages/qingdai-core */
/** 会话存档根目录：$DSH_HOME/sessions/<桶>/<session-id>/。判孤儿就看这里的目录还在不在。 */
function sessionsRoot() {
  try {
    const home = process.env.DSH_HOME || ''
    if (home) return `${home.replace(/[\\/]+$/, '')}/sessions`
  } catch { /* 忽略 */ }
  return `${process.cwd()}/sessions`
}

function defaultDataDir() {
  try {
    const home = process.env.DSH_HOME || ''
    if (home) return `${home.replace(/[\\/]+$/, '')}/storages/qingdai-core`
  } catch { /* 忽略 */ }
  return `${process.cwd()}/storages/qingdai-core`
}

/**
 * 宿主入口。DSH 认的是 { name, inject, apply } 这个形状。
 */
export default {
  name: 'dsh-qingdai-core',
  // agents 必须声明：deliverWake 要 ctx.agents.get/resume。
  inject: ['tools', 'webServer', 'connection', 'agents'],
  apply(ctx, config) {
    try {
      createApp(ctx, config ?? {})
    } catch (error) {
      try { ctx.logger?.error?.(`dsh-qingdai-core: 启动失败 ${error?.message ?? error}`) } catch { /* 没 logger */ }
      throw error
    }
  },
}
