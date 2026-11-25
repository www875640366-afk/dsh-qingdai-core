// api.js —— 面板 HTTP 边界：认证、路由。
//
// 前缀 /dsh-qingdai-core
//
// 只读：GET  /api/state        现在什么情况（白名单、门、今天开了几次）
// 写：  POST /api/settings/self  改配置（白名单、睡觉时间、频率…）
//       POST /api/wake          手动触发一次判定（调试用）

const PREFIX = '/dsh-qingdai-core'
const MAX_BODY = 64 * 1024

export function registerApi(ctx, log, deps = {}) {
  let web = null
  let connection = null
  try { web = ctx?.webServer ?? ctx?.get?.('webServer') ?? null } catch { web = null }
  try { connection = ctx?.connection ?? ctx?.get?.('connection') ?? null } catch { connection = null }

  if (!web?.register) {
    // 服务可能还没就绪（apply 早于它）。等一会儿再看，别直接放弃——
    // 直接放弃的后果是面板一直 404，日志里什么都看不出来。
    log('warn', '面板路由暂缓：webServer 还没就绪，1 秒后重试')
    const retry = setTimeout(() => {
      try { registerApi(ctx, log, deps) } catch (e) {
        log('warn', `面板路由重试失败：${e?.message ?? e}`)
      }
    }, 1000)
    if (typeof retry.unref === 'function') retry.unref()
    return
  }

  const registerNow = () => {
    const off = web.register({
      kind: 'prefix',
      path: PREFIX,
      handler: (req, res) => handle(req, res, connection, deps),
    })
    return typeof off === 'function' ? off : undefined
  }

  try {
    if (typeof ctx?.effect === 'function') {
      ctx.effect(registerNow, 'qingdai-wake: panel routes')
    } else {
      const off = registerNow()
      if (typeof off === 'function') deps.disposers?.push?.(off)
    }
    log('info', '面板路由已挂')
  } catch (e) {
    log('warn', `面板路由注册失败：${e?.message ?? e}`)
  }
}

function handle(req, res, connection, deps = {}) {
  const send = (code, body) => {
    const buf = Buffer.from(JSON.stringify(body), 'utf8')
    res.writeHead(code, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': buf.length,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    })
    res.end(buf)
  }

  // 认证：宿主有 connection 就必须过，没有就放行（本地开发）
  if (connection?.admit) {
    const admission = connection.admit(req)
    const denied = admission && typeof admission === 'object' && 'rejection' in admission
      ? admission.rejection
      : null
    if (denied) return send(denied, { ok: false, error: denied === 401 ? 'unauthorized' : 'forbidden' })
  }

  let url
  try { url = new URL(req.url || '/', 'http://qingdai-wake.local') } catch { return send(400, { ok: false, error: 'bad url' }) }
  const method = req.method || 'GET'
  const full = url.pathname.replace(/\/$/, '')
  // 宿主用 prefix 注册时，有的实现会把前缀去掉再交过来。两种都认。
  const path = full.startsWith(PREFIX) ? (full.slice(PREFIX.length) || '/') : full

  const writable = method === 'POST' && (
    path === '/api/settings/self'
    || path === '/api/restore'
    || path === '/api/unreplace'
    || path === '/api/forget'
    || path === '/api/conflicts/resolve'
    || path === '/api/raw/purge'
    || path === '/api/pin/approve'
    || path === '/api/pin/reject'
    || path === '/api/unpin'
    || path === '/api/wake'
  )
  if (method !== 'GET' && !writable) return send(405, { ok: false, error: '只读', path, method })

  const bodyOf = () => (deps.readJson ? deps.readJson(req) : Promise.resolve({}))

  try {
    if (path === '/api/state') {
      const store = deps.store
      const cfg = deps.getCfg?.() ?? {}
      const state = store?.get?.() ?? {}
      return send(200, {
        ok: true,
        stateFile: deps.stateFile ?? null,
        dataDir: deps.dataDir ?? null,
        state: {
          lastTalkAt: Number(state.lastTalkAt) || 0,
          lastProactiveAt: Number(state.lastProactiveAt) || 0,
          originDate: cfg.originDate ?? '',
          originAt: Number(deps.originAt?.()) || 0,
          createdAt: Number(state.createdAt) || 0,
          wakeCount: state.wakeCount ?? {},
          wakeLog: Array.isArray(state.wakeLog) ? state.wakeLog.slice(0, 10) : [],
        },
        config: {
          wakeSessions: cfg.wakeSessions ?? [],
          quietStart: cfg.quietStart,
          quietEnd: cfg.quietEnd,
          silentMinutes: cfg.silentMinutes,
          wakePerDay: cfg.wakePerDay,
          enabled: cfg.enabled !== false,
          fishWorld: cfg.fishWorld !== false,
          wakeCheckMinutes: cfg.wakeCheckMinutes,
          // 没配过（null）就把默认清单摊开：面板上看到的就是现在真正被禁的
          workDenyTools: Array.isArray(cfg.workDenyTools) ? cfg.workDenyTools : (deps.denyDefaults ?? []),
          originDate: cfg.originDate ?? '',
          embedBaseUrl: cfg.embedBaseUrl ?? '',
          embedKey: cfg.embedKey ?? '',
          embedModel: cfg.embedModel ?? '',
          embedPath: cfg.embedPath ?? '',
          rerankBaseUrl: cfg.rerankBaseUrl ?? '',
          rerankKey: cfg.rerankKey ?? '',
          rerankModel: cfg.rerankModel ?? '',
          rerankPath: cfg.rerankPath ?? '',
          recallEnabled: cfg.recallEnabled !== false,
          recallLimit: cfg.recallLimit ?? 3,
          recallMaxChars: cfg.recallMaxChars ?? 800,
          recallMinRel: cfg.recallMinRel ?? 0.62,
          workRawKeepDays: cfg.workRawKeepDays ?? 180,
          fishWorldKey: cfg.fishWorldKey ?? '',
          fishWorldBaseUrl: cfg.fishWorldBaseUrl ?? '',
        },
        worldTools: deps.worldTools ?? [],
        toolGroups: deps.toolGroups ?? [],
        core: deps.core?.() ?? null,
        coreHistory: deps.coreHistory?.() ?? [],
        compaction: deps.compaction?.() ?? null,
        models: deps.modelCatalogue?.() ?? [],
        restartKeys: deps.restartKeys ?? [],
        diag: deps.diag?.() ?? null,
        memory: deps.memory?.() ?? null,
        editable: Boolean(deps.configEditor?.()),
      })
    }


    if (path === '/api/settings/self' && method === 'POST') {
      const editor = deps.configEditor?.()
      if (!editor) return send(500, { ok: false, error: '拿不到 configEditor，改不了配置' })
      return bodyOf().then(async (patch) => {
        // 压缩字段走 compaction-basic 条目，其余走本插件条目：一次 POST 分开处理
        const compKeys = deps.compactionKeys ?? []
        const selfPatch = {}
        const compPatch = {}
        for (const [k, v] of Object.entries(patch ?? {})) {
          if (compKeys.includes(k)) compPatch[k] = v
          else selfPatch[k] = v
        }
        const out = { ok: true, reloaded: false }
        if (Object.keys(selfPatch).length) {
          out.self = await deps.settings.saveSelfConfig(editor, selfPatch)
          out.reloaded = deps.reloadConfig?.() ?? false
          // 白名单改了：工具面要按新的白名单重算一次
          if (Array.isArray(selfPatch.wakeSessions)) {
            try { deps.remount?.() } catch { /* 重算失败不影响保存 */ }
          }
        }
        if (Object.keys(compPatch).length) {
          out.compaction = await deps.settings.saveCompactionConfig(editor, compPatch)
        }
        out.restartRequired = Boolean(deps.needsRestart?.({ ...selfPatch, ...compPatch }));
        return send(200, out)
      }).catch((e) => send(400, { ok: false, error: String(e?.message ?? e) }))
    }

    if (path === '/api/memories') {
      const side = url.searchParams.get('side') === 'work' ? 'work' : 'qingdai'
      const q = url.searchParams.get('q') || ''
      const limit = Number(url.searchParams.get('limit')) || 100
      const offset = Number(url.searchParams.get('offset')) || 0
      const all = url.searchParams.get('all') === '1'
      try {
        const rows = deps.mem?.list?.(side, { limit, offset, q, showSuperseded: all }) ?? []
        let stats = null
        try { stats = deps.mem?.stats?.(side) ?? null } catch { stats = null }
        return send(200, { ok: true, side, rows, stats })
      } catch (e) { return send(500, { ok: false, error: String(e?.message ?? e) }) }
    }

    if (path === '/api/graveyard') {
      const side = url.searchParams.get('side') === 'work' ? 'work' : 'qingdai'
      try {
        const rows = deps.mem?.graveyard?.(side, { limit: Number(url.searchParams.get('limit')) || 100 }) ?? []
        return send(200, { ok: true, side, rows })
      } catch (e) { return send(500, { ok: false, error: String(e?.message ?? e) }) }
    }

    if (path === '/api/checkup') {
      const side = url.searchParams.get('side') === 'work' ? 'work' : 'qingdai'
      try {
        const r = deps.mem?.checkup?.(side) ?? { rows: [], summary: {} }
        return send(200, { ok: true, side, ...r })
      } catch (e) { return send(500, { ok: false, error: String(e?.message ?? e) }) }
    }


    if (path === '/api/pending') {
      const side = url.searchParams.get('side') === 'work' ? 'work' : 'qingdai'
      try {
        const r = deps.mem?.pending?.(side, { limit: Number(url.searchParams.get('limit')) || 50 }) ?? { replaced: [], forgotten: [] }
        return send(200, { ok: true, side, ...r })
      } catch (e) { return send(500, { ok: false, error: String(e?.message ?? e) }) }
    }

    if (path === '/api/conflicts/resolve' && method === 'POST') {
      return bodyOf().then((body) => {
        const side = body?.side === 'work' ? 'work' : 'qingdai'
        const action = String(body?.action ?? '')
        if (!['replace', 'keep', 'drop'].includes(action)) {
          return send(400, { ok: false, error: 'action 只能是 replace / keep / drop' })
        }
        const r = deps.mem?.resolveConflict?.(side, { id: body?.id, action })
        return send(200, { ok: Boolean(r?.ok), side, result: r ?? null })
      }).catch((e) => send(400, { ok: false, error: String(e?.message ?? e) }))
    }

    if (path === '/api/forget' && method === 'POST') {
      return bodyOf().then((body) => {
        const side = body?.side === 'work' ? 'work' : 'qingdai'
        const r = deps.mem?.forget?.(side, body?.id)
        return send(200, { ok: Boolean(r?.ok), side, result: r ?? null })
      }).catch((e) => send(400, { ok: false, error: String(e?.message ?? e) }))
    }

    if (path === '/api/unreplace' && method === 'POST') {
      return bodyOf().then((body) => {
        const side = body?.side === 'work' ? 'work' : 'qingdai'
        const r = deps.mem?.unsupersede?.(side, body?.id)
        return send(200, { ok: Boolean(r?.ok), side, result: r ?? null })
      }).catch((e) => send(400, { ok: false, error: String(e?.message ?? e) }))
    }

    if (path === '/api/restore' && method === 'POST') {
      return bodyOf().then((body) => {
        const side = body?.side === 'work' ? 'work' : 'qingdai'
        const r = deps.mem?.restore?.(side, body?.id)
        return send(200, { ok: Boolean(r?.ok), side, result: r ?? null })
      }).catch((e) => send(400, { ok: false, error: String(e?.message ?? e) }))
    }

    // ---- 这一轮注入了几条：dock 上显示「记忆 · 3条注入」 ----
    if (path === '/api/last-inject' && method === 'GET') {
      try {
        // 只算当前会话所属那个库：生活会话不该看到工作库的注入
        const sid = url.searchParams.get('sid') || ''
        const wake = deps.getCfg?.()?.wakeSessions ?? []
        const side = sid && wake.includes(sid) ? 'qingdai' : 'work'
        const b = deps.mem?.lastInjectBatch?.(side)
        return send(200, { ok: true, side, at: b?.at ?? 0, count: b?.n ?? 0 })
      } catch (e) {
        return send(200, { ok: false, at: 0, count: 0, error: String(e?.message ?? e) })
      }
    }

    // ---- 最近注入：她这阵子自动带进上下文的记忆 ----
    if (path === '/api/recent-inject' && method === 'GET') {
      const side = url.searchParams.get('side') === 'work' ? 'work' : 'qingdai'
      const limit = Number(url.searchParams.get('limit')) || 10
      try {
        return send(200, { ok: true, side, rows: deps.mem?.recentInjected?.(side, limit) ?? [] })
      } catch (e) {
        return send(200, { ok: false, side, rows: [], error: String(e?.message ?? e) })
      }
    }

    // ---- 原文库 ----
    if (path === '/api/raw' && method === 'GET') {
      const side = url.searchParams.get('side') === 'work' ? 'work' : 'qingdai'
      const opts = {
        q: String(url.searchParams.get('q') ?? '').slice(0, 100),
        sid: String(url.searchParams.get('sid') ?? '').slice(0, 100),
        year: Number(url.searchParams.get('year')) || 0,
        month: Number(url.searchParams.get('month')) || 0,
        limit: Number(url.searchParams.get('limit')) || 50,
        offset: Number(url.searchParams.get('offset')) || 0,
      }
      const r = deps.mem?.raw?.(side, opts)
      return send(200, { ok: Boolean(r?.ok), side, ...(r ?? {}) })
    }

    if (path === '/api/raw/months' && method === 'GET') {
      const side = url.searchParams.get('side') === 'work' ? 'work' : 'qingdai'
      return send(200, { ok: true, side, months: deps.mem?.rawMonths?.(side) ?? [] })
    }

    if (path === '/api/raw/sessions' && method === 'GET') {
      const side = url.searchParams.get('side') === 'work' ? 'work' : 'qingdai'
      return send(200, { side, ...(deps.mem?.rawSessions?.(side) ?? { ok: false }) })
    }

    if (path === '/api/raw/purge' && method === 'POST') {
      return bodyOf().then((body) => {
        const side = body?.side === 'work' ? 'work' : 'qingdai'
        const r = deps.mem?.purgeRaw?.(side, body?.sids)
        return send(200, { ok: Boolean(r?.ok), side, result: r ?? null })
      }).catch((e) => send(400, { ok: false, error: String(e?.message ?? e) }))
    }

    // 钉子审批：模型只能请求，点头的权力在人这边。
    if (path === '/api/pin/approve' && method === 'POST') {
      return bodyOf().then((body) => {
        const side = body?.side === 'work' ? 'work' : 'qingdai'
        const r = deps.mem?.approvePin?.(side, body?.id)
        return send(200, { ok: Boolean(r?.ok), side, result: r ?? null })
      }).catch((e) => send(400, { ok: false, error: String(e?.message ?? e) }))
    }

    if (path === '/api/pin/reject' && method === 'POST') {
      return bodyOf().then((body) => {
        const side = body?.side === 'work' ? 'work' : 'qingdai'
        const r = deps.mem?.rejectPin?.(side, body?.id)
        return send(200, { ok: Boolean(r?.ok), side, result: r ?? null })
      }).catch((e) => send(400, { ok: false, error: String(e?.message ?? e) }))
    }

    if (path === '/api/unpin' && method === 'POST') {
      return bodyOf().then((body) => {
        const side = body?.side === 'work' ? 'work' : 'qingdai'
        const r = deps.mem?.unpin?.(side, body?.id)
        return send(200, { ok: Boolean(r?.ok), side, result: r ?? null })
      }).catch((e) => send(400, { ok: false, error: String(e?.message ?? e) }))
    }

    if (path === '/api/wake' && method === 'POST') {
      // 手动跑一次判定。返回没关系，看日志就知道走到哪道门。
      Promise.resolve().then(() => deps.onWake?.()).catch(() => {})
      return send(200, { ok: true, queued: true })
    }

    return send(404, { ok: false, error: '没有这个接口', path, raw: req.url })
  } catch (error) {
    return send(500, { ok: false, error: String(error?.message ?? error) })
  }
}

/** 读 JSON 请求体，上限 16 KiB。 */
export function readJson(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    const timer = setTimeout(() => { cleanup(); reject(new Error('读取请求超时')) }, 8000)
    const cleanup = () => { clearTimeout(timer); req.off?.('data', onData); req.off?.('end', onEnd); req.off?.('error', onError) }
    const onData = (c) => {
      size += c.length
      if (size > limit) { cleanup(); reject(new Error('请求体太大')); req.destroy?.(); return }
      chunks.push(c)
    }
    const onEnd = () => {
      cleanup()
      try {
        const text = Buffer.concat(chunks).toString('utf8').trim()
        resolve(text ? JSON.parse(text) : {})
      } catch { reject(new Error('不是合法 JSON')) }
    }
    const onError = (e) => { cleanup(); reject(e) }
    req.on?.('data', onData)
    req.once?.('end', onEnd)
    req.once?.('error', onError)
  })
}

export { MAX_BODY, PREFIX }
