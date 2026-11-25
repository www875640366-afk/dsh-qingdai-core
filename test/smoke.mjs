// smoke.mjs —— mock 宿主冒烟测试：整条装配链跑通（临时脚本，跑完即删）。
// 不起真 DSH，只给 createApp 一个假 ctx，验证工具注册/路由/留底/检索。

import assert from 'node:assert'
import { rmSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createApp } from '../src/index.js'

// 用 fileURLToPath 而不是 URL.pathname：后者返回的是 URL 编码路径，
// 仓库路径里有中文时会被编成 %E6%8F%92%E4%BB%B6，临时库就建到那个假目录里去了。
const TMP = fileURLToPath(new URL('./tmp-smoke/', import.meta.url))
rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })

const QINGDAI = 'session-21ed5b01-8f38-470e-b2e3-7d3ee79929f5'
const WORK = 'session-work-1'

function mockCtx() {
  const tools = []
  const handlers = new Map()
  const routes = new Map()
  const ctx = {
    webServer: { register: ({ path, handler }) => { routes.set(path, handler); return () => {} } },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    tools: { register: (spec) => tools.push(spec) },
    on(event, fn) {
      const list = handlers.get(event) ?? []
      list.push(fn)
      handlers.set(event, list)
    },
    inject(names, cb) { try { cb({ get: () => null }) } catch { /* 忽略 */ } },
    get() { return null },
    effect(fn) { try { fn() } catch { /* 忽略 */ } },
    agents: { get: () => null, resume: async () => null },
  }
  return { ctx, tools, handlers, routes }
}

const { ctx, tools, handlers, routes } = mockCtx()
createApp(ctx, {
  dataDir: TMP,
  wakeSessions: [QINGDAI],
  embedKey: '',            // 关掉云端，纯关键词
  enabled: false,          // 不开主动开口
})

let passed = 0
const t = async (name, fn) => { await fn(); passed++; console.log(`  ok  ${name}`) }
const call = async (spec, args, sid) => spec.execute(args, sid ? { agent: { session: { id: sid } } } : {})

console.log('== 装配 ==')
await t('工具注册齐全', () => {
  const names = tools.map((x) => x.name).sort()
  for (const n of ['mem_write', 'mem_search', 'raw_memory', 'core', 'meme']) {
    assert.ok(names.includes(n), `缺工具 ${n}（现有 ${names.join(',')}）`)
  }
})
await t('routing.json 已写', () => {
  const p = join(TMP, 'routing.json')
  assert.ok(existsSync(p), 'routing.json 不存在')
  const data = JSON.parse(readFileSync(p, 'utf8'))
  assert.deepStrictEqual(data.sessions, [QINGDAI])
})

const memWrite = tools.find((x) => x.name === 'mem_write')
const memSearch = tools.find((x) => x.name === 'mem_search')
const rawMemory = tools.find((x) => x.name === 'raw_memory')

console.log('== 库路由 ==')
await t('生活会话写进 qingdai 库（0.9 也不自动 pin）', async () => {
  const r = await call(memWrite, { text: '对方的生日是 3 月 21 日，杭州人', importance: 0.9 }, QINGDAI)
  assert.ok(r.ok, JSON.stringify(r))
  assert.strictEqual(r.pinned, 0, '永不遗忘只能由人点头，模型自己钉不住')
  const db = new DatabaseSync(join(TMP, 'qingdai', 'qingdai.db'))
  const row = db.prepare('SELECT text, importance, pinned FROM memories').get()
  db.close()
  assert.ok(row?.text.includes('生日'))
  assert.strictEqual(row.pinned, 0)
})

await t('工作会话写进 work 库，不串库', async () => {
  const r = await call(memWrite, { text: '压缩插件会顶掉官方 compaction-basic 行' }, WORK)
  assert.ok(r.ok, JSON.stringify(r))
  const w = new DatabaseSync(join(TMP, 'work', 'work.db'))
  const row = w.prepare('SELECT text FROM memories').get()
  w.close()
  assert.ok(row?.text.includes('compaction-basic'))
  const q = new DatabaseSync(join(TMP, 'qingdai', 'qingdai.db'))
  const leak = q.prepare(`SELECT 1 FROM memories WHERE text LIKE '%compaction%'`).get()
  q.close()
  assert.ok(!leak, '生活库串进了工作记忆！')
})

await t('缺 sid 拒写', async () => {
  const r = await call(memWrite, { text: '不该落库' }, null)
  assert.ok(!r.ok && /会话/.test(r.reason ?? ''), JSON.stringify(r))
})

console.log('== 检索 ==')
await t('mem_search 命中 + render 带正文', async () => {
  const r = await call(memSearch, { query: '对方生日是什么时候' }, QINGDAI)
  assert.ok(r.ok && r.hits.length >= 1, JSON.stringify(r).slice(0, 200))
  assert.ok(r.hits[0].text.includes('生日'))
  const text = memSearch.output.render({}, r)[0].text
  assert.ok(text.includes('生日'), 'render 必须带正文')
})

console.log('== 留底 ==')
const SESSION = { id: QINGDAI }
const ownerEv = {
  type: 'user/message', seq: 42, time: 4200,
  data: { content: [{ type: 'text', text: '周末想去看电影' }], source: { kind: 'qingdai-wx' }, role: 'user' },
}
const botEv = {
  type: 'assistant/message', seq: 43, time: 4300,
  data: { message: { content: [{ type: 'text', text: '好呀，看你想看的' }] }, turn: 1, step: 1 },
}
await t('session/event 触发留底', async () => {
  const list = handlers.get('session/event') ?? []
  assert.ok(list.length >= 1, '没挂 session/event')
  for (const fn of list) {
    for (const ev of [ownerEv, botEv]) {
      try { await fn(SESSION, ev) } catch { /* 忽略 */ }
    }
  }
  const db = new DatabaseSync(join(TMP, 'qingdai', 'qingdai.db'))
  const rows = db.prepare('SELECT role, text, seq FROM events ORDER BY id').all()
  db.close()
  assert.ok(rows.length >= 2, `留底条数 ${rows.length}`)
  assert.strictEqual(rows[0].role, 'user')
  assert.ok(rows[0].text.includes('电影'))
  assert.strictEqual(rows[0].seq, 42)
})

console.log('== raw_memory ==')
await t('按 seq 查回原话', async () => {
  const r = await call(rawMemory, { fromSeq: 42, toSeq: 43 }, QINGDAI)
  assert.ok(r.ok && r.rows.length >= 2, JSON.stringify(r).slice(0, 200))
  const text = rawMemory.output.render({}, r)[0].text
  assert.ok(text.includes('电影'), 'render 必须带正文')
})

console.log('== 记忆注入 ==')
await t('用户开口 → 预取 → pre-step 带出旧事', async () => {
  const query = '对方生日是哪天'
  // 模拟用户说话（会触发预取；embedKey 为空，走关键词降级）
  for (const fn of handlers.get('session/event') ?? []) {
    try {
      await fn({ id: QINGDAI }, {
        type: 'user/message', seq: 5001, time: Date.now(),
        data: { content: [{ type: 'text', text: query }], source: { kind: 'user' }, role: 'user' },
      })
    } catch { /* 忽略 */ }
  }
  await new Promise((r) => setTimeout(r, 300))   // 等异步预取落地

  const pre = handlers.get('agent/pre-step') ?? []
  assert.ok(pre.length >= 1, '没挂 agent/pre-step')
  let injected = null
  for (const fn of pre) {
    const decide = async () => ({
      kind: 'enter',
      messages: [{ id: 'u1', role: 'user', content: [{ type: 'text', text: query }] }],
    })
    const d = await fn({ agent: { session: { id: QINGDAI } } }, decide)
    const hit = d?.messages?.find((m) => m?.source?.kind === 'qingdai-recall')
    if (hit) injected = hit
  }
  assert.ok(injected, '没注入任何旧事')
  const body = injected.content.map((b) => b.text).join('\n')
  assert.ok(body.includes('生日'), `注入内容要带正文：${body.slice(0, 120)}`)

  // 同一轮再组装一次：不许重复塞
  let twice = null
  for (const fn of pre) {
    const decide = async () => ({ kind: 'enter', messages: [] })
    const d = await fn({ agent: { session: { id: QINGDAI } } }, decide)
    const hit = d?.messages?.find((m) => m?.source?.kind === 'qingdai-recall')
    if (hit) twice = hit
  }
  assert.strictEqual(twice, null, '同一轮不许重复注入')
})

console.log('== 体检接口 ==')
await t('GET /api/checkup 五档全在一条线上，加总对得上', async () => {
  const r = await hit('/api/checkup?side=qingdai')
  assert.strictEqual(r.code, 200)
  assert.ok(Array.isArray(r.body.rows), 'rows 要是数组')
  const s = r.body.summary
  assert.strictEqual(typeof s.total, 'number')
  for (const x of r.body.rows.slice(0, 3)) {
    assert.strictEqual(typeof x.keep, 'number', 'keep 要是数字')
    assert.ok(x.keep > 0 && x.keep <= 1, `留存率必须锁在 (0,1]：${x.keep}`)
    assert.strictEqual(typeof x.idle, 'number')
    assert.ok(x.halfLife > 0, `半衰期要正的：${x.halfLife}`)
    assert.ok(['core', 'important', 'normal', 'fading', 'gone'].includes(x.state), `状态不认识：${x.state}`)
  }
  assert.strictEqual(
    s.core + s.important + s.normal + s.fading, s.total,
    `四档加总 ${s.core}+${s.important}+${s.normal}+${s.fading} ≠ ${s.total}（gone 在最近删除里，不算在主列表）`,
  )
})

console.log('== 记忆列表接口 ==')
await t('GET /api/memories 带五档统计，加起来等于总数', async () => {
  const r = await hit('/api/memories?side=qingdai')
  assert.strictEqual(r.code, 200)
  assert.ok(Array.isArray(r.body.rows), 'rows 要是数组')
  assert.ok(r.body.stats, 'stats 要有（面板顶部那条彩色分段靠它）')
  const s = r.body.stats
  for (const k of ['total', 'core', 'important', 'normal', 'fading', 'gone', 'pendingPin', 'vectors', 'graveyard', 'conflicts']) {
    assert.strictEqual(typeof s[k], 'number', `stats.${k} 要是数字，实际 ${typeof s[k]}`)
  }
  assert.strictEqual(
    s.core + s.important + s.normal + s.fading + s.gone, s.total,
    `五档加起来 ${s.core}+${s.important}+${s.normal}+${s.fading}+${s.gone} 该等于 ${s.total}`,
  )
})

await t('列表每条都带剩余天数与档位', async () => {
  const r = await hit('/api/memories?side=qingdai')
  const row = r.body.rows[0]
  assert.ok(row, '至少有一条')
  assert.strictEqual(typeof row.daysLeft, 'number', '要有剩余天数')
  assert.ok(row.daysLeft >= 0, `剩余天数不能是负的：${row.daysLeft}`)
  assert.ok(['core', 'important', 'normal', 'fading', 'gone'].includes(row.tier), `档位不认识：${row.tier}`)
  assert.ok(typeof row.tierLabel === 'string' && row.tierLabel.length > 0, '要有中文档位名')
})

console.log('== 钉子审批 ==')
await t('模型请求钉住 → 进待办；同意前不算核心', async () => {
  const w = await call(memWrite, {
    text: '对方说 2027 年春节一起回杭州', importance: 0.9, requestPin: true, pinReason: '不可重来的约定',
  }, QINGDAI)
  assert.ok(w.ok, JSON.stringify(w))
  assert.strictEqual(w.pinRequest, true)
  const p = await hit('/api/pending?side=qingdai')
  const req = (p.body.pinRequests ?? []).find((x) => x.id === w.id)
  assert.ok(req, '请求要出现在待办里')
  assert.strictEqual(req.reason, '不可重来的约定')
  const mem = await hit('/api/memories?side=qingdai')
  const row = mem.body.rows.find((x) => x.id === w.id)
  assert.strictEqual(row.tier, 'important', '没点头之前不许算核心')
})

await t('同意 → 冻结成核心；解钉 → 回到曲线且不立刻没', async () => {
  const w = await call(memWrite, { text: '临时测试的一条要钉的', importance: 0.3, requestPin: true }, QINGDAI)
  const ap = await hit('/api/pin/approve', { method: 'POST', body: { side: 'qingdai', id: w.id } })
  assert.ok(ap.body.ok, JSON.stringify(ap.body))
  assert.ok(ap.body.result.frozenKeep > 0, '要有冻结值')
  let mem = await hit('/api/memories?side=qingdai')
  let row = mem.body.rows.find((x) => x.id === w.id)
  assert.strictEqual(row.tier, 'core', '点头之后才是核心')
  assert.strictEqual(row.daysLeft, null, '核心不算剩余天数（冻住了）')
  const un = await hit('/api/unpin', { method: 'POST', body: { side: 'qingdai', id: w.id } })
  assert.ok(un.body.ok, JSON.stringify(un.body))
  mem = await hit('/api/memories?side=qingdai')
  row = mem.body.rows.find((x) => x.id === w.id)
  assert.notStrictEqual(row.tier, 'core')
  assert.ok(row.daysLeft > 0, `解钉后必须还有寿命，实际 ${row.daysLeft} 天`)
})

await t('不同意 → 请求作废，按正常曲线走', async () => {
  const w = await call(memWrite, { text: '这条会被拒绝钉住', importance: 0.6, requestPin: true }, QINGDAI)
  const rj = await hit('/api/pin/reject', { method: 'POST', body: { side: 'qingdai', id: w.id } })
  assert.ok(rj.body.ok, JSON.stringify(rj.body))
  const p = await hit('/api/pending?side=qingdai')
  assert.ok(!(p.body.pinRequests ?? []).some((x) => x.id === w.id), '拒了就离开待办')
  const mem = await hit('/api/memories?side=qingdai')
  const row = mem.body.rows.find((x) => x.id === w.id)
  assert.ok(row, '记忆本身还在')
  assert.notStrictEqual(row.tier, 'core')
})

await t('最近删除每条都带剩余天数，过期的不再出现', async () => {
  const r = await hit('/api/graveyard?side=qingdai')
  assert.strictEqual(r.code, 200)
  assert.ok(Array.isArray(r.body.rows))
  for (const g of r.body.rows) {
    assert.strictEqual(typeof g.daysLeft, 'number', '要带剩余天数')
    assert.ok(g.daysLeft >= 0 && g.daysLeft <= 14, `剩余天数该在 0~14 之间：${g.daysLeft}`)
    assert.ok(g.expiresAt > g.at, '到期时间要比删除时间晚')
  }
})

console.log('== 原文库 ==')
await t('生活会话：raw_memory 也跨会话', async () => {
  const r = await call(rawMemory, { limit: 5 }, QINGDAI)
  assert.ok(r.ok, JSON.stringify(r))
  assert.strictEqual(r.crossSession, true, '生活库也不隔离了')
})
await t('工作会话：raw_memory 跨会话，结果带会话短标识', async () => {
  const r = await call(rawMemory, { limit: 5 }, WORK)
  assert.ok(r.ok, JSON.stringify(r))
  assert.strictEqual(r.crossSession, true, '工作库应该跨会话')
})

console.log('== 原文库接口 ==')
await t('GET /api/raw 原始原文按时间倒序，带体量', async () => {
  const r = await hit('/api/raw?side=work&limit=3')
  assert.strictEqual(r.code, 200)
  assert.strictEqual(r.body.ok, true)
  assert.ok(Array.isArray(r.body.rows))
  assert.strictEqual(typeof r.body.total, 'number')
  assert.ok(r.body.rows.length <= 3)
  for (let i = 1; i < r.body.rows.length; i++) {
    assert.ok(r.body.rows[i - 1].ts >= r.body.rows[i].ts, '要按时间倒序（最近的在上）')
  }
  assert.ok(r.body.stats && typeof r.body.stats.count === 'number', '要带体量')
  assert.ok(r.body.stats.bytes >= 0)
})

await t('GET /api/raw 关键词搜索', async () => {
  const all = await hit('/api/raw?side=work&limit=50')
  const word = String(all.body.rows?.[0]?.text ?? '').slice(0, 4)
  if (!word) return
  const r = await hit('/api/raw?side=work&q=' + encodeURIComponent(word))
  assert.ok(r.body.total >= 1, `搜「${word}」该有结果`)
  assert.ok(r.body.rows.every((x) => x.text.includes(word)), '搜出来的都得含关键词')
})

await t('GET /api/raw/sessions 按会话分组 + 孤儿判断', async () => {
  const r = await hit('/api/raw/sessions?side=work')
  assert.strictEqual(r.code, 200)
  assert.ok(Array.isArray(r.body.rows))
  assert.strictEqual(typeof r.body.canJudge, 'boolean')
  for (const row of r.body.rows) {
    assert.ok(row.sid, '每行要有 sid')
    assert.strictEqual(typeof row.count, 'number')
    // 扫不到会话目录时必须给 null，不许判成孤儿
    if (r.body.canJudge) assert.strictEqual(typeof row.alive, 'boolean')
    else assert.strictEqual(row.alive, null, '扫不到目录时不能判死活')
  }
  if (!r.body.canJudge) assert.strictEqual(r.body.orphanCount, 0, '扫不到目录时孤儿数必须是 0')
})

await t('POST /api/raw/purge 只删指定会话的原文', async () => {
  const before = await hit('/api/raw?side=work&limit=1')
  const r = await hit('/api/raw/purge', { method: 'POST', body: { side: 'work', sids: ['不存在的会话'] } })
  assert.strictEqual(r.code, 200)
  assert.strictEqual(r.body.result.deleted, 0, '不存在的会话删 0 条')
  const after = await hit('/api/raw?side=work&limit=1')
  assert.strictEqual(after.body.total, before.body.total, '没动到别的会话')
})

console.log('== 待定接口 ==')
/** 直接调面板路由的 handler，验的是「HTTP 边界 → deps.mem → 库」整条接线。 */
function hit(pathname, { method = 'GET', body } = {}) {
  return new Promise((resolve, reject) => {
    const handler = routes.get('/dsh-qingdai-core')
    if (!handler) return reject(new Error('面板路由没挂上'))
    const payload = body === undefined ? '' : JSON.stringify(body)
    const res = {
      code: 0,
      writeHead(code) { this.code = code },
      end(buf) { resolve({ code: this.code, body: JSON.parse(String(buf)) }) },
    }
    const req = {
      url: '/dsh-qingdai-core' + pathname,
      method,
      on(ev, fn) { if (ev === 'data' && payload) setTimeout(() => fn(Buffer.from(payload)), 0) },
      once(ev, fn) { if (ev === 'end') setTimeout(fn, 0) },
      off() {},
      destroy() {},
    }
    try { handler(req, res) } catch (e) { reject(e) }
  })
}

await t('GET /api/pending 两类都返回数组', async () => {
  const r = await hit('/api/pending?side=qingdai')
  assert.strictEqual(r.code, 200)
  assert.ok(Array.isArray(r.body.replaced), 'replaced 要是数组')
  assert.ok(Array.isArray(r.body.forgotten), 'forgotten 要是数组')
})

await t('被替代的会出现在待定里，且带替代它的原文', async () => {
  const write = tools.find((x) => x.name === 'mem_write')
  const a = await call(write, { text: '面板主色是深海蓝 #4E6E90', importance: 0.6 }, QINGDAI)
  const b = await call(write, { text: '面板主色改成月白，深海蓝只留强调', importance: 0.6, supersedes: [a.id] }, QINGDAI)
  assert.ok(a.ok && b.ok, `写入失败：${a.reason ?? b.reason ?? ''}`)

  const r = await hit('/api/pending?side=qingdai')
  const item = r.body.replaced.find((x) => x.id === a.id)
  assert.ok(item, `待定里没有 #${a.id}：${JSON.stringify(r.body.replaced.map((x) => x.id))}`)
  assert.strictEqual(item.keeperId, b.id, '要记下是 #' + b.id + ' 替的')
  assert.ok(item.keeperText.includes('月白'), '要给出替代它的原文')
})

await t('POST /api/unreplace 撤销替代，旧的回来新的下去', async () => {
  const list = await hit('/api/pending?side=qingdai')
  const item = list.body.replaced.find((x) => x.keeperText?.includes('月白'))
  assert.ok(item, '先要有可撤销的一条')

  const r = await hit('/api/unreplace', { method: 'POST', body: { side: 'qingdai', id: item.id } })
  assert.strictEqual(r.code, 200)
  assert.ok(r.body.ok, `撤销失败：${r.body.result?.reason ?? ''}`)

  const after = await hit('/api/pending?side=qingdai')
  assert.ok(!after.body.replaced.some((x) => x.id === item.id), '撤销后不该还在待定里')

  // 旧的回到活跃列表，替它的那条不见了
  const live = await hit('/api/memories?side=qingdai')
  assert.ok(live.body.rows.some((x) => x.id === item.id), '旧的该回到记忆里')
  assert.ok(!live.body.rows.some((x) => x.id === item.keeperId), '替它的那条该下去')
})

await t('POST /api/unreplace 对没被替代的要拒', async () => {
  const live = await hit('/api/memories?side=qingdai')
  const any = live.body.rows[0]
  const r = await hit('/api/unreplace', { method: 'POST', body: { side: 'qingdai', id: any.id } })
  assert.strictEqual(r.body.ok, false, '不该让它成功')
})

await t('POST /api/forget：搬进台账，能捡回来', async () => {
  const write = tools.find((x) => x.name === 'mem_write')
  const a = await call(write, { text: '面板上的删除按钮要真能删', importance: 0.6 }, QINGDAI)
  assert.ok(a.ok, '先写一条')

  const r = await hit('/api/forget', { method: 'POST', body: { side: 'qingdai', id: a.id } })
  assert.strictEqual(r.code, 200)
  assert.ok(r.body.ok, '删除失败：' + (r.body.result?.reason ?? ''))

  const live = await hit('/api/memories?side=qingdai')
  assert.ok(!live.body.rows.some((x) => x.id === a.id), '删掉的不能再出现在活跃列表')

  const grave = await hit('/api/graveyard?side=qingdai')
  const g = grave.body.rows.find((x) => x.originalId === a.id)
  assert.ok(g, '应该进台账')

  const back = await hit('/api/restore', { method: 'POST', body: { side: 'qingdai', id: g.id } })
  assert.ok(back.body.ok, '捡回来失败')
  const live2 = await hit('/api/memories?side=qingdai')
  assert.ok(live2.body.rows.some((x) => x.text.includes('删除按钮要真能删')), '捡回来后该回来')
})

await t('POST /api/forget：删不存在的要拒', async () => {
  const r = await hit('/api/forget', { method: 'POST', body: { side: 'qingdai', id: 999999 } })
  assert.strictEqual(r.body.ok, false)
})

console.log('== 待审冲突接口 ==')
await t('被查重拦下 → 出现在 /api/pending 的 conflicts 里', async () => {
  const write = tools.find((x) => x.name === 'mem_write')
  const a = await call(write, { text: '面板每屏最多显示 20 条记忆，多了要翻页', importance: 0.6 }, WORK)
  assert.ok(a.ok, '第一条该写进去')
  const b = await call(write, { text: '面板每屏最多显示 20 条记忆，多了翻页', importance: 0.6 }, WORK)
  assert.ok(!b.ok && b.pendingId > 0, '第二条该被拦并留待审')

  const r = await hit('/api/pending?side=work')
  assert.strictEqual(r.code, 200)
  assert.ok(Array.isArray(r.body.conflicts), 'conflicts 要是数组')
  const item = r.body.conflicts.find((x) => x.id === b.pendingId)
  assert.ok(item, '待审里没有 #' + b.pendingId)
  assert.strictEqual(item.againstId, a.id)
  assert.ok(item.againstText.includes('20 条'), '要给出现有那条原文')
  assert.strictEqual(item.againstGone, false)
})

await t('POST resolve(replace)：B 替掉 A', async () => {
  const list = await hit('/api/pending?side=work')
  const item = list.body.conflicts.find((x) => x.againstText?.includes('20 条'))
  assert.ok(item, '先要有待审')

  const r = await hit('/api/conflicts/resolve', { method: 'POST', body: { side: 'work', id: item.id, action: 'replace' } })
  assert.strictEqual(r.code, 200)
  assert.ok(r.body.ok, '处理失败：' + (r.body.result?.reason ?? ''))

  const after = await hit('/api/pending?side=work')
  assert.ok(!after.body.conflicts.some((x) => x.id === item.id), '处理完不该还在待审里')

  const replaced = await hit('/api/pending?side=work')
  assert.ok(replaced.body.replaced.some((x) => x.id === item.againstId), '旧的该进「被替代」')
})

await t('POST resolve(keep)：两条都留', async () => {
  const write = tools.find((x) => x.name === 'mem_write')
  await call(write, { text: '工具命名必须准确反映功能，避免误导' }, WORK)
  const b = await call(write, { text: '工具命名必须准确反映功能' }, WORK)
  assert.ok(!b.ok && b.pendingId > 0, '该被拦')

  const r = await hit('/api/conflicts/resolve', { method: 'POST', body: { side: 'work', id: b.pendingId, action: 'keep' } })
  assert.ok(r.body.ok, '处理失败：' + (r.body.result?.reason ?? ''))

  const live = await hit('/api/memories?side=work')
  const hitText = live.body.rows.filter((x) => x.text.includes('工具命名'))
  assert.strictEqual(hitText.length, 2, '两条都该活着')
})

await t('POST resolve(drop)：不写', async () => {
  const write = tools.find((x) => x.name === 'mem_write')
  await call(write, { text: '前缀缓存不能破坏' }, WORK)
  const b = await call(write, { text: '前缀缓存不能破坏掉' }, WORK)
  assert.ok(!b.ok && b.pendingId > 0, '该被拦')

  const before = (await hit('/api/memories?side=work')).body.rows.length
  const r = await hit('/api/conflicts/resolve', { method: 'POST', body: { side: 'work', id: b.pendingId, action: 'drop' } })
  assert.ok(r.body.ok)
  const after = (await hit('/api/memories?side=work')).body.rows.length
  assert.strictEqual(after, before, 'drop 不该写进新记忆')
})

await t('action 不认识要 400', async () => {
  const r = await hit('/api/conflicts/resolve', { method: 'POST', body: { side: 'work', id: 1, action: '瞎写' } })
  assert.strictEqual(r.code, 400)
  assert.ok(!r.body.ok)
})

console.log(`\n全部 ${passed} 项通过`)
