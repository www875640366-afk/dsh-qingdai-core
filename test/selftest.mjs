// selftest.mjs —— 地基模块自测（临时脚本，跑完即删）。
// 用内存库隔离，不碰生产库。node --experimental-sqlite 或 DSH 运行时均可跑。

import assert from 'node:assert'
import { rmSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { openDb, withTransaction, closeDb } from '../src/db.js'
import { dbPlanFor, isQingdaiSession, sidFrom } from '../src/routing.js'
import { halfLifeOf, keepOf, daysLeftOf, tierOf, touch, sweepLifecycle, dayKey, CURVE, TIERS } from '../src/heat.js'
import { sniffSecret } from '../src/secrets.js'
import { memWrite, memSearch, markUsed, forgetMemory, restoreFromGraveyard, recentInjected, unsupersede, openDecisions, resolveDecision, keywordsOf, sweep, purgeGraveyard } from '../src/memory.js'
import { recordEvent, queryEvents, seqRangeCovered } from '../src/turn.js'
import { cosine, checkSignature, loadVectors, flushPending, pendingVectorCount, embedTexts, rerank, signatureOf, readMeta, EMBED_DIM } from '../src/vector.js'
import { runMemSearch } from '../src/tools.js'
import { applyToolRestrict, denyListOf } from '../src/wake/allowlist.js'
import { readCompactionConfig, saveCompactionConfig, readSelfConfig, saveSelfConfig, readModelCatalogue, needsRestart, RESTART_KEYS, DEFAULTS } from '../src/wake/settings.js'
import { createRecaller, buildRecall, RECALL } from '../src/inject.js'

// 用 fileURLToPath 而不是 URL.pathname：后者返回的是 URL 编码路径，
// 仓库路径里有中文时会被编成 %E6%8F%92%E4%BB%B6，临时库就建到那个假目录里去了。
const TMP = fileURLToPath(new URL('./tmp-selftest/', import.meta.url))
rmSync(TMP, { recursive: true, force: true })   // 每次从干净目录开始，防跨轮残留
mkdirSync(TMP, { recursive: true })
let passed = 0
const t = async (name, fn) => { await fn(); passed++; console.log(`  ok  ${name}`) }

console.log('== db.js ==')
const dbFile = TMP + 'test-qingdai.db'
const db = openDb(dbFile)
await t('建表齐全', () => {
  for (const tb of ['meta', 'memories', 'graveyard', 'events', 'vectors']) {
    const row = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tb)
    assert.ok(row, `缺表 ${tb}`)
  }
})
await t('同路径复用连接', () => {
  const again = openDb(dbFile)
  assert.strictEqual(again, db)
})
await t('withTransaction 回滚', () => {
  try {
    withTransaction(db, () => {
      db.prepare('INSERT INTO events (sid, seq, ts, role, text) VALUES (?, ?, ?, ?, ?)').run('s', 1, 1, 'user', 'x')
      throw new Error('boom')
    })
  } catch { /* 预期 */ }
  const n = db.prepare('SELECT COUNT(*) AS n FROM events').get().n
  assert.strictEqual(n, 0, '回滚后不应有数据')
})

console.log('== routing.js ==')
await t('白名单→qingdai / 其余→work / 无sid拒绝', () => {
  const dir = TMP
  const sessions = ['session-21ed5b01']
  const a = dbPlanFor('session-21ed5b01', dir, sessions)
  assert.strictEqual(a.side, 'life')
  const b = dbPlanFor('session-other', dir, sessions)
  assert.strictEqual(b.side, 'work')
  const c = dbPlanFor('', dir, sessions)
  assert.strictEqual(c.ok, false, '空 sid 必须拒绝')
})
await t('sidFrom 多级兜底', () => {
  assert.strictEqual(sidFrom({ session: { id: 'a' } }), 'a')
  assert.strictEqual(sidFrom({ agent: { session: { header: { id: 'b' } } } }), 'b')
  assert.strictEqual(sidFrom({ sessionId: 'c' }), 'c')
  assert.strictEqual(sidFrom({}), '')
})

console.log('== heat.js ==')
const DAY = 86_400_000
await t('半衰期随重要度和被想起次数变长，次数封顶', () => {
  const base = halfLifeOf({ importance: 0.3, accessCount: 0 })
  assert.ok(Math.abs(base - CURVE.halfLifeBase * (1 + CURVE.kImportance * 0.3)) < 1e-9, `重要度 0.3 的半衰期 ${base}`)
  const heavy = halfLifeOf({ importance: 0.9, accessCount: 0 })
  assert.ok(heavy > base, `重要度高的要更长：${heavy} vs ${base}`)
  const used = halfLifeOf({ importance: 0.3, accessCount: CURVE.accessCap })
  assert.ok(used > base, '被想起多次的要更长')
  const over = halfLifeOf({ importance: 0.3, accessCount: 99 })
  assert.ok(Math.abs(over - used) < 1e-9, '次数封顶后不再变长')
})
await t('留存率天然锁在 (0,1]，不做加法累积', () => {
  const now = Date.now()
  const fresh = { importance: 0.3, accessCount: 0, createdAt: now, lastTouchedAt: now }
  assert.ok(Math.abs(keepOf(fresh, now) - 1) < 1e-9, '刚写的就是 1.0')
  // 旧版这里会累加到 3.x，显示「还剩 340%」
  const hammered = { importance: 0.3, accessCount: 50, createdAt: now, lastTouchedAt: now }
  assert.ok(keepOf(hammered, now) <= 1, `再被想起也不会超过 1：${keepOf(hammered, now)}`)
})
await t('留存率按 e 指数掉，不是半衰', () => {
  const now = Date.now()
  const idle = 96
  const it = { importance: 0.3, accessCount: 0, createdAt: now - idle * DAY, lastTouchedAt: now - idle * DAY }
  const expect = Math.exp(-idle / halfLifeOf(it))
  assert.ok(Math.abs(keepOf(it, now) - expect) < 1e-9, `keep=${keepOf(it, now)} 应=${expect}`)
})
await t('五档全在一条线上：按剩余天数切', () => {
  const now = Date.now()
  const at = (idleDays, { imp = 0.3, acc = 0 } = {}) => ({
    importance: imp, accessCount: acc, createdAt: now - idleDays * DAY, lastTouchedAt: now - idleDays * DAY,
  })
  assert.strictEqual(tierOf({ pinned: 1 }, now), 'core', '钉住的永远是核心')
  // 重要度只决定掉多快，不直接决定档位——档位看的是「还剩几天」
  assert.strictEqual(tierOf(at(0), now), 'normal', '刚写的落在正常档')
  assert.strictEqual(tierOf(at(0, { imp: 0.9 }), now), 'important', '刚写的落在重要档')
  assert.strictEqual(tierOf(at(45), now), 'normal', '45 天落正常')
  assert.strictEqual(tierOf(at(90), now), 'fading', '90 天落快忘了')
  assert.strictEqual(tierOf(at(400), now), 'gone', '过线是被遗忘')
  // 档位随剩余天数单调下滑，不会跳档
  const seq = [0, 45, 90].map((d) => tierOf(at(d), now))
  assert.deepStrictEqual(seq, ['normal', 'normal', 'fading'])
  assert.deepStrictEqual(Object.keys(TIERS), ['core', 'important', 'normal', 'fading', 'gone'])
})
await t('剩余天数跟着留存率走，过线归零', () => {
  const now = Date.now()
  const it = { importance: 0.3, accessCount: 0, createdAt: now, lastTouchedAt: now }
  const d0 = daysLeftOf(it, now)
  assert.ok(Math.abs(d0 - halfLifeOf(it) * Math.log(1 / CURVE.retainForget)) < 1e-6, `刚写的能活 ${d0} 天`)
  const dead = { importance: 0.3, accessCount: 0, createdAt: now - 400 * DAY, lastTouchedAt: now - 400 * DAY }
  assert.strictEqual(daysLeftOf(dead, now), 0, '过线了就是 0')
})
await t('同一天重复想起只加一次次数，隔天加一次', () => {
  const now = Date.now()
  const it = { importance: 0.3, accessCount: 2, createdAt: now, lastTouchedAt: now }
  touch(it, now + 60_000)
  assert.strictEqual(it.accessCount, 2, '同一天不加')
  touch(it, now + 2 * DAY)
  assert.strictEqual(it.accessCount, 3, '隔天加一次')
  assert.ok(it.lastTouchedAt > now, '时间戳要往前走')
  assert.strictEqual(dayKey(new Date(2026, 0, 5).getTime()), '2026-01-05')
})
await t('sweepLifecycle：过线进 graveyard；钉住的不动且补冻结值', () => {
  const d2 = openDb(TMP + 'test-sweep.db')
  d2.exec('DELETE FROM memories'); d2.exec('DELETE FROM graveyard')
  const ins = d2.prepare(`INSERT INTO memories (text, importance, pinned, accessCount, createdAt, lastTouchedAt)
    VALUES (?, ?, ?, 0, ?, ?)`)
  const old = Date.now() - 400 * DAY
  const trivial = ins.run('随手记的琐事', 0.3, 0, old, old).lastInsertRowid
  const core = ins.run('对方生日 3 月 21', 0.9, 1, old, old).lastInsertRowid
  const res = sweepLifecycle(d2)
  assert.strictEqual(res.forgotten, 1, `淘汰 1 条（实际 ${res.forgotten}）`)
  const g = d2.prepare('SELECT * FROM graveyard').all()
  assert.strictEqual(g.length, 1)
  assert.ok(g[0].text.includes('琐事'))
  assert.strictEqual(d2.prepare('SELECT COUNT(*) AS n FROM memories WHERE id = ?').get(trivial).n, 0)
  const coreRow = d2.prepare('SELECT pinned, frozenKeep FROM memories WHERE id = ?').get(core)
  assert.ok(coreRow, '钉住的必须还在')
  assert.ok(coreRow.frozenKeep > 0, '钉住的要补上冻结值，不然解钉时没依据')
})
await t('台账到期：满 14 天没人捡就物理清掉', () => {
  const d4 = openDb(TMP + 'test-sweep.db')
  d4.exec('DELETE FROM memories'); d4.exec('DELETE FROM graveyard')
  const ins = d4.prepare('INSERT INTO graveyard (originalId, text, importance, heat, reason, at) VALUES (1, ?, 0.3, 0, ?, ?)')
  ins.run('很久以前删的', '测试', Date.now() - 15 * DAY)
  ins.run('前天刚删的', '测试', Date.now() - 2 * DAY)
  const r = sweep(d4)
  assert.strictEqual(r.purged, 1, `该清 1 条，实际 ${r.purged}`)
  const left = d4.prepare('SELECT text FROM graveyard').all()
  assert.strictEqual(left.length, 1)
  assert.ok(left[0].text.includes('前天'), '没到期的那条要留着')
})
await t('台账没到期的不许动', () => {
  const d5 = openDb(TMP + 'test-sweep.db')
  d5.exec('DELETE FROM graveyard')
  d5.prepare('INSERT INTO graveyard (originalId, text, importance, heat, reason, at) VALUES (1, ?, 0.3, 0, ?, ?)')
    .run('十三天前删的', '测试', Date.now() - 13 * DAY)
  assert.strictEqual(sweep(d5).purged, 0)
  assert.strictEqual(d5.prepare('SELECT COUNT(*) AS n FROM graveyard').get().n, 1)
})
await t('保护期：刚写的不过线', () => {
  const d3 = openDb(TMP + 'test-sweep.db')
  d3.exec('DELETE FROM memories'); d3.exec('DELETE FROM graveyard')
  // 重要度 0、刚写：按曲线算还远没到阈值，但即便是极端参数也该被保护期挡住
  d3.prepare('INSERT INTO memories (text, importance, pinned, accessCount, createdAt, lastTouchedAt) VALUES (?, 0.3, 0, 0, ?, ?)')
    .run('刚写的', Date.now(), Date.now())
  const r = sweepLifecycle(d3)
  assert.strictEqual(r.forgotten, 0, '保护期内不淘汰')
})

console.log('== secrets.js ==')
await t('明确密钥拒；普通文本过', () => {
  assert.strictEqual(sniffSecret('我的 key 是 sk-abc123def456789012345').verdict, 'hard')
  assert.strictEqual(sniffSecret('-----BEGIN RSA PRIVATE KEY-----').verdict, 'hard')
  assert.strictEqual(sniffSecret('对方的生日是 3 月 21 日').verdict, 'clean')
  assert.strictEqual(sniffSecret('api key 已配置好，在面板里').verdict, 'clean')
})

console.log('== memory.js ==')
await t('memWrite：分档，但不自动 pin', () => {
  db.exec('DELETE FROM memories')
  const a = memWrite(db, { text: '对方的生日是 3 月 21 日，杭州人', importance: 0.9 })
  assert.ok(a.ok)
  assert.strictEqual(a.pinned, 0, '0.9 也不许自动钉——永不遗忘得人点头')
  const b = memWrite(db, { text: '微信桥的 hook 进程要 poke 才暴露句柄', importance: 0.6 })
  assert.ok(b.ok && b.pinned === 0 && b.importance === 0.6)
  const c = memWrite(db, { text: 'key 是 sk-abc123def456789012345' })
  assert.ok(!c.ok && !c.needsConfirm, '硬密钥直接拒')
  const d = memWrite(db, { text: '硅基流动的 api key 在面板配（a1B2c3D4e5F6g7H8i9J0k1L2）' })
  assert.ok(!d.ok && d.needsConfirm, '疑似密钥要确认')
  const e = memWrite(db, {})
  assert.ok(!e.ok)
})
await t('memWrite：requestPin 只落请求，不落钉子', () => {
  const r = memWrite(db, { text: '对方说 2027 年春节一起回杭州', importance: 0.9, requestPin: true, pinReason: '不可重来的约定' })
  assert.ok(r.ok)
  assert.strictEqual(r.pinRequest, true)
  const row = db.prepare('SELECT pinned FROM memories WHERE id = ?').get(r.id)
  assert.strictEqual(Number(row.pinned), 0, '请求不能直接变成钉子')
  // 请求本身进账本，等主人点头
  const list = openDecisions(db).filter((d) => d.kind === 'pin')
  const mine = list.find((d) => d.payload.memoryId === r.id)
  assert.ok(mine !== void 0, '钉住请求该开一条账本条目')
  assert.strictEqual(mine.payload.reason, '不可重来的约定')
})
await t('memSearch：关键词降级可用，且不再偷偷记账', () => {
  const before = db.prepare('SELECT accessCount FROM memories WHERE text LIKE ?').get('%生日%')
  const r = memSearch(db, { query: '对方的生日是什么时候' })
  assert.ok(r.ok && r.hits.length >= 1, `命中 ${r.hits?.length}`)
  assert.strictEqual(r.hits[0].degraded, true, '无向量时是降级模式')
  assert.ok(r.hits[0].text.includes('生日'))
  const after = db.prepare('SELECT accessCount FROM memories WHERE text LIKE ?').get('%生日%')
  assert.strictEqual(after.accessCount, before.accessCount, '检索命中不等于被想起，不许记账')
})
await t('停用词不当锚', () => {
  const kws = keywordsOf('记得 今天 好像 说过 生日')
  assert.ok(!kws.has('记得') && !kws.has('今天'), '口水词被滤掉')
  assert.ok(kws.has('生日'), '实词保留')
})
await t('markUsed：记账同日去重，两条时间戳分开记', () => {
  const row = db.prepare('SELECT id FROM memories WHERE text LIKE ?').get('%hook%')
  const now = Date.now()
  // 假装它上次被想起是两天前，这样今天这次才算「新的一天」
  const twoAgo = now - 2 * DAY
  db.prepare('UPDATE memories SET lastTouchedAt = ?, lastMentionedAt = ?, accessCount = 0 WHERE id = ?')
    .run(twoAgo, twoAgo, row.id)
  markUsed(db, [row.id], { now, via: 'search' })
  const once = db.prepare('SELECT accessCount, lastSearchedAt FROM memories WHERE id = ?').get(row.id)
  assert.strictEqual(once.accessCount, 1, '隔了一天该 +1')
  assert.ok(once.lastSearchedAt > 0, '搜索时间戳要落库')
  markUsed(db, [row.id], { now: now + 1000, via: 'inject' })
  const twice = db.prepare('SELECT accessCount, lastInjectedAt FROM memories WHERE id = ?').get(row.id)
  assert.strictEqual(twice.accessCount, 1, '同一天不重复计数')
  assert.ok(twice.lastInjectedAt > 0, '注入时间戳要落库')
})
await t('graveyard 恢复：捡回来只回 50%，不满血', () => {
  const d2 = openDb(TMP + 'test-sweep.db')
  d2.exec('DELETE FROM memories'); d2.exec('DELETE FROM graveyard')
  d2.prepare('INSERT INTO graveyard (originalId, text, importance, heat, reason, at) VALUES (1, ?, 0.3, 0.01, ?, ?)')
    .run('随手记的琐事', '测试淘汰', Date.now() - 400 * DAY)
  const g = d2.prepare('SELECT id FROM graveyard LIMIT 1').get()
  const res = restoreFromGraveyard(d2, g.id)
  assert.ok(res.ok, `恢复失败：${res.reason ?? ''}`)
  const back = d2.prepare('SELECT text, importance, accessCount, lastTouchedAt FROM memories WHERE id = ?').get(res.id)
  assert.ok(back && back.text.includes('琐事'))
  const now = Date.now()
  const keep = keepOf({ importance: back.importance, accessCount: back.accessCount, lastTouchedAt: back.lastTouchedAt }, now)
  assert.ok(Math.abs(keep - 0.5) < 0.01, `捡回来该是 50% 留存率，实际 ${(keep * 100).toFixed(1)}%`)
  // 50% 换成天数：重要度 0.3 是 96 天半衰期 → 约 49 天。不至于当场又没，也不给满命续。
  const left = daysLeftOf({ importance: back.importance, accessCount: 0, lastTouchedAt: back.lastTouchedAt }, now)
  assert.ok(left > 40 && left < 55, `捡回来该剩约 49 天，实际 ${left.toFixed(0)} 天`)
})
await t('supersedes：不立即改库，先进待办；同意后才替代', () => {
  db.exec('DELETE FROM memories')
  db.exec('DELETE FROM decisions')
  const a = memWrite(db, { text: '面板主题色是深海蓝 #4E6E90', importance: 0.6 })
  assert.ok(a.ok)
  const b = memWrite(db, { text: '面板主题色改成月白，深海蓝只留作强调', importance: 0.6, supersedes: [a.id] })
  assert.ok(!b.ok && b.pending, '改了口该进待办，不立即生效')
  const list = openDecisions(db)
  assert.strictEqual(list.length, 1)
  assert.strictEqual(list[0].kind, 'conflict')
  assert.strictEqual(list[0].payload.againstId, a.id)
  // 裁决前旧条仍是活跃的
  assert.strictEqual(db.prepare('SELECT superseded FROM memories WHERE id = ?').get(a.id).superseded, 0)
  const r = resolveDecision(db, { id: list[0].id, action: 'agree' })
  assert.ok(r.ok, `裁决失败：${r.reason ?? ''}`)
  // 旧的搬进台账（最近删除），14 天内能捡回来——不是标个状态就两头都不见了
  const gone = db.prepare('SELECT id FROM memories WHERE id = ?').get(a.id)
  assert.strictEqual(gone, undefined, '旧条该从活跃记忆里移走')
  const grave = db.prepare('SELECT originalId FROM graveyard WHERE originalId = ?').get(a.id)
  assert.ok(grave !== undefined, '旧条该进最近删除')
  const fresh = db.prepare('SELECT text FROM memories WHERE id = ?').get(r.memoryId)
  assert.ok(String(fresh.text).includes('月白'), '新的那条该写进库')
})
await t('unsupersede：撤销替代，两条不会同时活着', () => {
  // 自己造一份老数据：新版同意后是搬进台账，不再产生 superseded，这个函数只给老库兜底
  const now2 = Date.now()
  const ins2 = db.prepare('INSERT INTO memories (text, importance, createdAt, lastMentionedAt) VALUES (?, ?, ?, ?)')
  const keeper0 = Number(ins2.run('撤销测试：替它的那条', 0.6, now2, now2).lastInsertRowid)
  const old0 = Number(ins2.run('撤销测试：被替的那条', 0.6, now2, now2).lastInsertRowid)
  db.prepare('UPDATE memories SET superseded = 1, supersededBy = ? WHERE id = ?').run(keeper0, old0)
  const rows = [{ id: old0 }]
  const oldId = rows[0].id
  const keeper = db.prepare('SELECT supersededBy FROM memories WHERE id = ?').get(oldId).supersededBy
  const r = unsupersede(db, oldId)
  assert.ok(r.ok, `撤销失败：${r.reason ?? ''}`)
  const back = db.prepare('SELECT superseded, supersededBy FROM memories WHERE id = ?').get(oldId)
  assert.strictEqual(back.superseded, 0, '旧的该回到活跃池')
  assert.strictEqual(back.supersededBy, null)
  const k = db.prepare('SELECT superseded FROM memories WHERE id = ?').get(keeper)
  assert.strictEqual(k.superseded, 1, '替它的那条该下去，不能两条同时活着')
  assert.ok(!unsupersede(db, oldId).ok, '没被替代的再撤销一次要拒')
})
await t('pending：替代与遗忘两类分开给', () => {
  db.exec('DELETE FROM memories')
  // 直接造关系，不过查重：这条测的是面板那条 SQL 能不能 join 出「谁替了谁」
  const now = Date.now()
  const ins = db.prepare('INSERT INTO memories (text, importance, createdAt, lastMentionedAt) VALUES (?, ?, ?, ?)')
  const a = Number(ins.run('记忆注入上限是 6 条', 0.6, now, now).lastInsertRowid)
  const b = Number(ins.run('记忆注入上限调到 8 条', 0.6, now + 1, now).lastInsertRowid)
  db.prepare('UPDATE memories SET superseded = 1, supersededBy = ? WHERE id = ?').run(b, a)
  const rows = db.prepare(
    `SELECT m.id, m.text, k.id AS keeperId, k.text AS keeperText
     FROM memories m LEFT JOIN memories k ON k.id = m.supersededBy
     WHERE m.superseded = 1 ORDER BY m.createdAt DESC`,
  ).all()
  const hit = rows.find((x) => x.id === a)
  assert.ok(hit, '被替代的要在待定里')
  assert.strictEqual(hit.keeperId, b)
  assert.ok(hit.keeperText.includes('8 条'), '要能给出替代它的那条原文')
  assert.strictEqual(rows.length, 1, '活跃的那条不该混进来')
})

console.log('== 待办账本（decisions）==')
await t('被查重拦住时开一条账本条目', () => {
  db.exec('DELETE FROM memories')
  db.exec('DELETE FROM decisions')
  const a = memWrite(db, { text: '面板每屏最多显示 20 条记忆，多了要翻页' })
  assert.ok(a.ok, '第一条该写进去')
  const b = memWrite(db, { text: '面板每屏最多显示 20 条记忆，多了翻页' })
  assert.ok(!b.ok && b.duplicate, '第二条该被拦')
  assert.ok(b.decisionId > 0, '拦下时要有账本条目 id')
  const list = openDecisions(db)
  assert.strictEqual(list.length, 1)
  assert.strictEqual(list[0].kind, 'conflict')
  assert.strictEqual(list[0].payload.againstId, a.id)
  assert.ok(String(list[0].payload.againstText).includes('20 条'), '要存下撞上的那条原文')
})

await t('同一条重复撞不刷屏', () => {
  const before = openDecisions(db).length
  memWrite(db, { text: '面板每屏最多显示 20 条记忆，多了翻页' })
  memWrite(db, { text: '面板每屏最多显示 20 条记忆，多了翻页' })
  assert.strictEqual(openDecisions(db).length, before, '重试两次不该多出两条待办')
})

await t('同意：写新的，旧条进最近删除，条目结清', () => {
  const item = openDecisions(db)[0]
  const r = resolveDecision(db, { id: item.id, action: 'agree' })
  assert.ok(r.ok, '处理失败：' + (r.reason ?? ''))
  assert.strictEqual(r.kind, 'conflict')
  assert.strictEqual(openDecisions(db).length, 0, '处理完该从待办里消失')
  const a = db.prepare('SELECT id FROM memories WHERE id = ?').get(item.payload.againstId)
  assert.strictEqual(a, undefined, '旧条该从活跃记忆里移走')
  const g = db.prepare('SELECT originalId FROM graveyard WHERE originalId = ?').get(item.payload.againstId)
  assert.ok(g !== undefined, '旧条该进最近删除（14 天内能捡回来）')
})

await t('拒绝：不写，旧的不动', () => {
  db.exec('DELETE FROM memories')
  db.exec('DELETE FROM decisions')
  memWrite(db, { text: '前缀缓存不能破坏' })
  const b = memWrite(db, { text: '前缀缓存不能破坏掉' })
  assert.ok(!b.ok && b.decisionId > 0, '该被拦')
  const r = resolveDecision(db, { id: b.decisionId, action: 'reject' })
  assert.ok(r.ok)
  assert.strictEqual(db.prepare('SELECT COUNT(*) AS n FROM memories').get().n, 1, '只该有原来那条')
  assert.strictEqual(openDecisions(db).length, 0)
  assert.ok(!resolveDecision(db, { id: b.decisionId, action: 'reject' }).ok, '处理过的不能再处理')
})

await t('force 写入不产生待办', () => {
  db.exec('DELETE FROM memories')
  db.exec('DELETE FROM decisions')
  memWrite(db, { text: '面板用深海蓝作强调色' })
  const f = memWrite(db, { text: '面板用深海蓝作强调色吧', force: true })
  assert.ok(f.ok, 'force 该写进去')
  assert.strictEqual(openDecisions(db).length, 0, 'force 是明确决定，不该再挂待办')
})

await t('疑似密钥进账本，同意后才写库', () => {
  db.exec('DELETE FROM memories')
  db.exec('DELETE FROM decisions')
  const a = memWrite(db, { text: '服务商的 api_key 是 abcdefghijklmnopqrstuvwxyz0123' })
  assert.ok(!a.ok && a.needsConfirm, '疑似密钥该拦下')
  assert.strictEqual(db.prepare('SELECT COUNT(*) AS n FROM memories').get().n, 0, '拦下时不该落库')
  const list = openDecisions(db)
  assert.strictEqual(list.length, 1)
  assert.strictEqual(list[0].kind, 'write')
  const r = resolveDecision(db, { id: a.decisionId, action: 'agree' })
  assert.ok(r.ok, '同意失败：' + (r.reason ?? ''))
  assert.strictEqual(db.prepare('SELECT COUNT(*) AS n FROM memories').get().n, 1, '同意后才该写进去')
  assert.strictEqual(openDecisions(db).length, 0)
})

await t('钉住请求进账本，同意后 pinned=1', () => {
  db.exec('DELETE FROM memories')
  db.exec('DELETE FROM decisions')
  const a = memWrite(db, { text: '这条是插件行为准则，改插件都得照着来', requestPin: true, pinReason: '每次都要用' })
  assert.ok(a.ok, '记忆本身该写进去')
  const list = openDecisions(db)
  assert.strictEqual(list.length, 1)
  assert.strictEqual(list[0].kind, 'pin')
  const r = resolveDecision(db, { id: list[0].id, action: 'agree' })
  assert.ok(r.ok)
  assert.strictEqual(db.prepare('SELECT pinned FROM memories WHERE id = ?').get(a.id).pinned, 1, '同意后该钉住')
})

console.log('== 查重与出处（dup.js）==')
await t('实体撞车：同项目同一件事要拦', () => {
  db.exec('DELETE FROM memories')
  const a = memWrite(db, { text: 'dsh-qingdai-core 的向量模型用 bge-m3' })
  assert.ok(a.ok, '第一条应写进去')
  const b = memWrite(db, { text: 'dsh-qingdai-core 用的向量模型是 bge-m3' })
  assert.ok(!b.ok && b.duplicate, `同一件事换个说法要被拦：${JSON.stringify(b).slice(0, 120)}`)
  assert.ok(b.existing.length >= 1 && b.existing[0].id === a.id)
})
await t('实体撞车：同项目不同事实要放行', () => {
  db.exec('DELETE FROM memories')
  const a = memWrite(db, { text: 'dsh-qingdai-core 的向量模型用 bge-m3' })
  assert.ok(a.ok, '第一条应写进去')
  const b = memWrite(db, { text: 'dsh-qingdai-core 上线实测：mem_search 首次调用报 value is not lossless JSON，已修' })
  const c = memWrite(db, { text: 'dsh-qingdai-core 的记忆注入走 systemPrompt.context()，不破坏前缀缓存' })
  assert.ok(b.ok, `同一个项目的另一件事不该被拦：${JSON.stringify(b).slice(0, 120)}`)
  assert.ok(c.ok, `第三件也该写进去：${JSON.stringify(c).slice(0, 120)}`)
})
await t('字面撞车：换说法也拦', () => {
  db.exec('DELETE FROM memories')
  memWrite(db, { text: '对方喜欢喝美式咖啡' })
  const r = memWrite(db, { text: '对方喜欢喝美式' })
  assert.ok(!r.ok && r.duplicate, `应拦下：${JSON.stringify(r).slice(0, 120)}`)
})
await t('无关两条不误判', () => {
  db.exec('DELETE FROM memories')
  const a = memWrite(db, { text: '对方的生日是 3 月 21 日' })
  const b = memWrite(db, { text: '微信桥要 poke 才暴露句柄' })
  assert.ok(a.ok && b.ok, '两条无关的都要写进去')
})
await t('force 跳过查重', () => {
  db.exec('DELETE FROM memories')
  memWrite(db, { text: '对方喜欢喝美式咖啡' })
  const r = memWrite(db, { text: '对方喜欢喝美式', force: true })
  assert.ok(r.ok, `force 应强写：${JSON.stringify(r).slice(0, 120)}`)
})
await t('supersedes：进待办，同意后才替代旧的', () => {
  db.exec('DELETE FROM memories')
  db.exec('DELETE FROM decisions')
  const a = memWrite(db, { text: '对方喝美式咖啡' })
  const b = memWrite(db, { text: '对方改喝拿铁了（原来喝美式）', supersedes: [a.id] })
  assert.ok(!b.ok && b.pending, JSON.stringify(b).slice(0, 120))
  const r = resolveDecision(db, { id: b.decisionId, action: 'agree' })
  assert.ok(r.ok)
  const gone = db.prepare('SELECT id FROM memories WHERE id = ?').get(a.id)
  assert.strictEqual(gone, undefined, '同意后旧条该从活跃记忆里移走')
  const grave = db.prepare('SELECT originalId FROM graveyard WHERE originalId = ?').get(a.id)
  assert.ok(grave !== undefined, '同意后旧条必须进最近删除')
})
await t('出处锚：写入时机械填区间', () => {
  db.exec('DELETE FROM memories')
  const anchor = { sid: 's-anchor', fromTs: 1000, toTs: 2000 }
  const r = memWrite(db, { text: '带出处的记忆' }, { anchor })
  const row = db.prepare('SELECT sources FROM memories WHERE id = ?').get(r.id)
  const o = JSON.parse(row.sources)
  assert.strictEqual(o.sid, 's-anchor')
  assert.strictEqual(o.fromTs, 1000)
  assert.strictEqual(o.toTs, 2000)
})

console.log('== 工具收窄（wake/allowlist.js）==')
await t('未知工具名不连累整份清单', () => {
  const calls = []
  const tools = {
    list: () => [{ name: 'world_now' }, { name: 'core' }, { name: 'meme' }],
    restrict: (o) => calls.push(o),
  }
  const r = applyToolRestrict({ ctx: { tools } }, 'session-work-x', {
    workDenyTools: ['remember', 'world_now', 'core', 'meme'],
  })
  assert.ok(r.applied, JSON.stringify(r))
  assert.strictEqual(r.denied, 3, `应禁 3 个，实际 ${r.denied}`)
  assert.strictEqual(r.dropped, 1, 'remember 应被跳过')
  assert.deepStrictEqual(calls[0].deny, ['world_now', 'core', 'meme'])
})
await t('拿不到工具清单时从报错里过滤', () => {
  const calls = []
  const known = ['world_now', 'core', 'meme']
  const tools = {
    restrict: (o) => {
      const bad = o.deny.filter((n) => !known.includes(n))
      if (bad.length) {
        throw new Error(`tools.restrict() names unknown global tool "${bad[0]}"; known global tools: ${known.join(', ')}`)
      }
      calls.push(o)
    },
  }
  const r = applyToolRestrict({ ctx: { tools } }, 'session-work-y', {
    workDenyTools: ['remember', 'world_now', 'core'],
  })
  assert.ok(r.applied, JSON.stringify(r))
  assert.deepStrictEqual(calls[0].deny, ['world_now', 'core'])
})
await t('白名单会话不收窄', () => {
  const r = applyToolRestrict({ ctx: { tools: { restrict: () => { throw new Error('不该被调用') } } } },
    'session-life', { wakeSessions: ['session-life'] })
  assert.ok(!r.applied && r.reason === 'allowlisted')
})

console.log('== 记忆注入（inject.js）==')
await t('注入块：标明来源 + 最多 6 条 + 总量 ≤800 字', () => {
  const hits = Array.from({ length: 10 }, (_, i) => ({ when: '2026-11-01', text: `第 ${i + 1} 条旧事，说的是以前发生过的事情` }))
  const text = buildRecall(hits).text
  assert.ok(text.includes('[系统]'), '要标明是系统给的')
  const lines = (text.match(/^- /gm) || []).length
  assert.ok(lines >= 1 && lines <= 6, `条数 ${lines}`)
  assert.ok(text.length <= RECALL.maxChars, `总量 ${text.length} 超了`)
})
await t('注入块：超预算砍尾部', () => {
  const hits = Array.from({ length: 6 }, () => ({ when: '2026-11-01', text: '事'.repeat(200) }))
  const text = buildRecall(hits).text
  assert.ok(text.length <= RECALL.maxChars, `总量 ${text.length} 超了`)
  const lines = (text.match(/^- /gm) || []).length
  assert.ok(lines >= 1 && lines < 6, `应按预算砍到 ${lines} 条`)
})
await t('没有命中就一个字都不注入', () => {
  assert.strictEqual(buildRecall([]).text, '')
  assert.strictEqual(buildRecall(null).text, '')
  assert.strictEqual(buildRecall([{ text: '' }]).text, '')
})
await t('召回器：预取一次只注入一次', async () => {
  let calls = 0
  const rec = createRecaller({
    search: async () => { calls += 1; return { ok: true, hits: [{ when: '2026-11-01', text: '对方的生日是 3 月 21 日', rel: 0.9 }] } },
  })
  await rec.prefetch('s1', '对方生日是哪天')
  const a = rec.take('s1')
  const b = rec.take('s1')
  assert.ok(a.includes('生日'), '第一次要拿到')
  assert.strictEqual(b, '', '同一轮不许重复塞')
  assert.strictEqual(calls, 1)
})
await t('召回器：同一句话复用缓存不重复检索', async () => {
  let calls = 0
  const rec = createRecaller({
    search: async () => { calls += 1; return { ok: true, hits: [{ when: '2026-11-01', text: '一件旧事', rel: 0.8 }] } },
  })
  const q = '你还记得同一句话吗'
  await rec.prefetch('s2', q)
  rec.take('s2')
  await rec.prefetch('s2', q)
  assert.strictEqual(calls, 1, 'TTL 内同一句应复用')
  assert.ok(rec.take('s2'), '复用缓存后还能注入一次')
})
await t('召回器：检索为空则永不注入', async () => {
  const rec = createRecaller({ search: async () => ({ ok: true, hits: [] }) })
  await rec.prefetch('s3', '对不上的问题')
  assert.strictEqual(rec.take('s3'), '')
})
await t('注入闸：相关度不够就一个字都不注入', async () => {
  const mk = (hit) => createRecaller({ search: async () => ({ ok: true, hits: [hit] }) })
  const low = mk({ when: '2026-11-01', text: '一条擦边的旧事', rel: 0.3 })
  await low.prefetch('g1', '随便聊聊')
  assert.strictEqual(low.take('g1'), '', 'rel 0.3 不该注入')
  const high = mk({ when: '2026-11-01', text: '对方的生日是 3 月 21 日', rel: 0.92 })
  await high.prefetch('g2', '对方生日是哪天')
  assert.ok(high.take('g2').includes('生日'), 'rel 0.92 该注入')
  const noRel = mk({ when: '2026-11-01', text: '一条降级命中的旧事', score: 0.6 })
  await noRel.prefetch('g3', '随便聊聊')
  assert.strictEqual(noRel.take('g3'), '', '无精排时 score 0.6 不该注入')
  const noRelOK = mk({ when: '2026-11-01', text: '对方的生日是 3 月 21 日', score: 0.85 })
  await noRelOK.prefetch('g4', '对方生日是哪天')
  assert.ok(noRelOK.take('g4').includes('生日'), '无精排时 score 0.85 该注入')
})
await t('注入闸：回声不注入（用户在复述记忆本身）', async () => {
  const rec = createRecaller({
    search: async () => ({
      ok: true,
      hits: [{ when: '2026-11-01', text: '对方的生日是 3 月 21 日，杭州人', rel: 0.96 }],
    }),
  })
  await rec.prefetch('e1', '对方的生日是 3 月 21 日')
  assert.strictEqual(rec.take('e1'), '', '陈述复述不该把原条再塞回来')
  // 同一句话加个问号就变成「在打听」，要放行
  const ask = createRecaller({
    search: async () => ({
      ok: true,
      hits: [{ when: '2026-11-01', text: '对方的生日是 3 月 21 日，杭州人', rel: 0.96 }],
    }),
  })
  await ask.prefetch('e2', '对方的生日是 3 月 21 日吗？')
  assert.ok(ask.take('e2').includes('生日'), '问句不算回声，要注入')
})
await t('注入闸：召回标记降门槛', async () => {
  const mk = (hit) => createRecaller({ search: async () => ({ ok: true, hits: [hit] }) })
  const plain = mk({ when: '2026-11-01', text: '对方说过想去看海', rel: 0.45 })
  await plain.prefetch('m1', '今天天气不错')
  assert.strictEqual(plain.take('m1'), '', '无标记时 0.45 不够')
  const marked = mk({ when: '2026-11-01', text: '对方说过想去看海', rel: 0.45 })
  await marked.prefetch('m2', '你还记得我以前说过什么吗？')
  assert.ok(marked.take('m2').includes('看海'), '有召回标记时 0.45 该放行')
})

console.log('== turn.js ==')
await t('留底：逐条消息记单条', () => {
  db.exec('DELETE FROM events')
  const session = { id: 'session-21ed5b01' }
  const u = recordEvent(db, session, {
    type: 'user/message', seq: 100, time: 1000,
    data: { content: [{ type: 'text', text: '今天天气怎么样' }], source: { kind: 'user' }, role: 'user' },
  })
  const a = recordEvent(db, session, {
    type: 'assistant/message', seq: 101, time: 1001,
    data: { message: { content: [{ type: 'text', text: '多云 5°C' }] }, turn: 1, step: 1 },
  })
  assert.ok(u.ok && u.written, `user 没写进去：${u.reason ?? ''}`)
  assert.ok(a.ok && a.written, `assistant 没写进去：${a.reason ?? ''}`)
  const n = db.prepare('SELECT COUNT(*) AS n FROM events').get().n
  assert.strictEqual(n, 2, `应只写 2 条，实际 ${n}`)
})
await t('同一事件重复触发不重复写', () => {
  const before = db.prepare('SELECT COUNT(*) AS n FROM events').get().n
  const session = { id: 'session-21ed5b01' }
  const ev = {
    type: 'assistant/message', seq: 101, time: 1001,
    data: { message: { content: [{ type: 'text', text: '多云 5°C' }] }, turn: 1, step: 1 },
  }
  const r1 = recordEvent(db, session, ev)
  const r2 = recordEvent(db, session, ev)
  assert.ok(r1.dup && r2.dup, '同 seq 必须判重')
  const after = db.prepare('SELECT COUNT(*) AS n FROM events').get().n
  assert.strictEqual(after, before, '重复触发不许加行')
})
await t('助手只取正文不取思考块', () => {
  db.exec('DELETE FROM events')
  const r = recordEvent(db, { id: 's-think' }, {
    type: 'assistant/message', seq: 7, time: 7,
    data: { message: { content: [{ type: 'reasoning', text: '内心戏' }, { type: 'text', text: '给用户的回答' }] } },
  })
  const row = db.prepare('SELECT text FROM events WHERE id = ?').get(r.id)
  assert.ok(!row.text.includes('内心戏'), '思考块不该进留底')
  assert.ok(row.text.includes('给用户的回答'))
})
await t('来源过滤：宿主注入不是用户', () => {
  db.exec('DELETE FROM events')
  const session = { id: 'session-21ed5b01' }
  const bad = recordEvent(db, session, {
    type: 'user/message', seq: 200, time: 2000,
    data: { content: [{ type: 'text', text: '[runtime-context] 一堆系统话' }], source: { kind: 'runtime-context' }, role: 'user' },
  })
  assert.ok(!bad.ok, '系统注入必须拒')
  const good = recordEvent(db, session, {
    type: 'user/message', seq: 201, time: 2001,
    data: { content: [{ type: 'text', text: '那晚饭吃什么' }], source: { kind: 'user' }, role: 'user' },
  })
  assert.ok(good.ok && good.written, '用户消息要记')
  const row = db.prepare('SELECT text FROM events WHERE id = ?').get(good.id)
  assert.ok(row.text.includes('晚饭'))
})
await t('来源过滤：微信桥投送的消息算用户说的', () => {
  db.exec('DELETE FROM events')
  for (const kind of ['wechat-bridge', 'wechat', 'qingdai-wx', 'user']) {
    const r = recordEvent(db, { id: 'session-21ed5b01' }, {
      type: 'user/message', seq: 400 + kind.length, time: 4000,
      data: { content: [{ type: 'text', text: `从 ${kind} 来的话` }], source: { kind }, role: 'user' },
    })
    assert.ok(r.ok && r.written, `${kind} 应被认成用户说的：${r.reason ?? ''}`)
  }
  const n = db.prepare('SELECT COUNT(*) AS n FROM events').get().n
  assert.strictEqual(n, 4, `应记 4 条，实际 ${n}`)
})
await t('工作会话：来源不对不记', () => {
  const r = recordEvent(db, { id: 'session-work' }, {
    type: 'user/message', seq: 300, time: 3000,
    data: { content: [{ type: 'text', text: '子代理灌的内容' }], source: { kind: 'subagent' }, role: 'user' },
  }, { anySource: false })
  assert.ok(!r.ok, '来源不对必须拒')
})
await t('seqRangeCovered：安全线校验', () => {
  db.exec('DELETE FROM events')
  const ins = db.prepare('INSERT INTO events (sid, seq, ts, role, text) VALUES (?, ?, ?, ?, ?)')
  ins.run('s1', 10, 1, 'user', 'a'); ins.run('s1', 11, 2, 'assistant', 'b')
  const okCase = seqRangeCovered(db, 's1', 10, 11)
  assert.ok(okCase.ok)
  const badCase = seqRangeCovered(db, 's1', 10, 15)
  assert.ok(!badCase.ok, '区间缺口必须查出来')
})
await t('queryEvents 默认按 sid 隔离', () => {
  const r = queryEvents(db, { sid: 's1' })
  assert.ok(r.ok && r.count === 2)
  const other = queryEvents(db, { sid: 's2' })
  assert.ok(other.ok && other.count === 0, '别的会话查不到')
})
await t('queryEvents 跨会话：不传 sid 也能查整库', () => {
  db.prepare('INSERT INTO events (sid, seq, ts, role, text) VALUES (?, ?, ?, ?, ?)')
    .run('s2', 20, 3, 'user', '另一个工作会话说的事')
  const only = queryEvents(db, { sid: 's1', keyword: '另一个' })
  assert.strictEqual(only.count, 0, '隔离模式查不到别的会话')
  const all = queryEvents(db, { crossSession: true, keyword: '另一个' })
  assert.ok(all.ok, all.reason)
  assert.strictEqual(all.count, 1, `跨会话该看到 s2 那条，实际 ${all.count}`)
  assert.strictEqual(all.crossSession, true)
  // 不加 crossSession 又不给 sid：拒绝，不能悄悄变成全库
  const bad = queryEvents(db, {})
  assert.ok(!bad.ok, '没 sid 又没说跨会话都要拒')
})

console.log('== vector.js（离线部分）==')
await t('签名校验 + cosine', () => {
  const sig = checkSignature(db)
  assert.ok(!sig.stale)
  const a = new Float32Array([1, 0, 0])
  const b = new Float32Array([1, 0, 0])
  const c = new Float32Array([0, 1, 0])
  assert.ok(Math.abs(cosine(a, b) - 1) < 1e-6)
  assert.ok(Math.abs(cosine(a, c)) < 1e-6)
  const vecs = loadVectors(db)
  assert.ok(vecs instanceof Map)
})


// ---- 追加：检索双闸 + LLM 提炼路径 ----
console.log('== 检索双闸（校准后）==')
await t('语义够近才命中；无关一律空', () => {
  const d3 = openDb(TMP + 'test-gate.db')
  d3.exec('DELETE FROM memories')
  const now = Date.now()
  const ins = d3.prepare('INSERT INTO memories (text, importance, pinned, heat, createdAt, lastMentionedAt) VALUES (?, ?, 0, 1, ?, ?)')
  const rel = { id: Number(ins.run('对方的生日是 3 月 21', 0.9, now, now).lastInsertRowid) }
  const irr = { id: Number(ins.run('工作要求：先解决已发现问题', 0.9, now, now).lastInsertRowid) }
  // 假向量：查询与 rel 相近（cos≈1），与 irr 无关（cos≈0）
  const qv = new Float32Array([1, 0, 0])
  const vecs = new Map([[String(rel.id), new Float32Array([1, 0, 0])], [String(irr.id), new Float32Array([0, 1, 0])]])
  const r1 = memSearch(d3, { query: '对方生日是哪天' }, { vectors: vecs, cosine, queryVec: qv })
  assert.ok(r1.hits.length >= 1, '相关条目应命中')
  assert.ok(r1.hits.every((h) => h.text.includes('生日')), `不该带无关条目：${r1.hits.map((h) => h.text).join('|')}`)
  // 纯无关查询（词面也不命中）：必须空
  const r2 = memSearch(d3, { query: '压缩引擎怎么接管' }, { vectors: vecs, cosine, queryVec: new Float32Array([0, 0, 1]) })
  assert.strictEqual(r2.hits.length, 0, '双闸都不过必须返回空')
})

console.log('== 精排融合 ==')
await t('mock rerank：按 rel 重排 + 融合分', async () => {
  const d5 = openDb(TMP + 'test-rr.db')
  d5.exec('DELETE FROM memories')
  const now = Date.now()
  const ins = d5.prepare('INSERT INTO memories (text, importance, pinned, heat, createdAt, lastMentionedAt) VALUES (?, 0.6, 0, 1, ?, ?)')
  const a = Number(ins.run('对方说见面第一站吃巷口那家面', now, now).lastInsertRowid)
  const b = Number(ins.run('别的事情跟见面没关系', now, now).lastInsertRowid)
  const qv = new Float32Array([1, 0, 0])
  const vecs = new Map([[String(a), new Float32Array([1, 0, 0])], [String(b), new Float32Array([0.9, 0.1, 0])]])
  // 精排把 b 排低
  const mockRerank = async (_q, docs) => docs.map((t, i) => ({ index: i, score: /面/.test(t) ? 0.9 : 0.05 }))
  const r = await runMemSearch({ db: d5, vectors: vecs, cosine, queryVec: qv, rerank: mockRerank }, { query: '见面吃什么' })
  assert.ok(r.reranked === true, '应走精排')
  assert.ok(r.hits[0].text.includes('面'), `精排后第一应是面：${r.hits[0].text}`)
  assert.ok(r.hits[0].rel >= 0.9)
  assert.ok(r.hits[0].score > 0.4, `融合分应显著：${r.hits[0].score}`)
  assert.ok(r.advice?.includes('较高'), 'relMax 0.9 应给高置信提示')
})

// ---- 追加：压缩 / 向量配置 ----
console.log('== 压缩与向量配置 ==')
const mkEditor = (initial = {}) => {
  const entry = { options: { name: '@deepseek-ai/dsh-compaction-basic', id: 'compaction-basic' } }
  const self = { options: { name: 'dsh-qingdai-core' } }
  const store = { thresholdRatio: 0.8, retainRatio: 0.2, headroomTokens: 65536,
    summarizationProvider: 'amd', summarizationModel: 'DeepSeek-V4-Flash', ...initial }
  const selfStore = { dataDir: 'D:/x' }
  return {
    entry, self, store, selfStore,
    entries: () => [self, entry],
    configuration: () => [
      { entry: self, inherited: {}, override: { ...selfStore } },
      { entry, inherited: {}, override: { ...store } },
    ],
    edit: async (e, fn) => {
      if (e === entry) Object.assign(store, fn({ ...store }))
      else if (e === self) Object.assign(selfStore, fn({ ...selfStore }))
      else throw new Error('改错条目')
    },
  }
}

await t('读压缩配置：五个字段都在', () => {
  const ed = mkEditor()
  const c = readCompactionConfig(ed)
  assert.strictEqual(c.thresholdRatio, 0.8)
  assert.strictEqual(c.retainRatio, 0.2)
  assert.strictEqual(c.headroomTokens, 65536)
  assert.strictEqual(c.summarizationProvider, 'amd')
  assert.strictEqual(c.summarizationModel, 'DeepSeek-V4-Flash')
})

await t('改压缩阈值只动 compaction 条目', async () => {
  const ed = mkEditor()
  await saveCompactionConfig(ed, { thresholdRatio: 0.7 })
  assert.strictEqual(ed.store.thresholdRatio, 0.7)
  assert.strictEqual(ed.selfStore.dataDir, 'D:/x')
})

await t('保留比例必须小于阈值', async () => {
  const ed = mkEditor()
  await assert.rejects(() => saveCompactionConfig(ed, { retainRatio: 0.85 }), /保留比例必须小于触发阈值/)
})

await t('压缩字段越界 / 非整数 / 白名单外都要拒', async () => {
  const ed = mkEditor()
  await assert.rejects(() => saveCompactionConfig(ed, { thresholdRatio: 2 }), /0\.05~0\.95/)
  await assert.rejects(() => saveCompactionConfig(ed, { headroomTokens: 1.5 }), /整数/)
  await assert.rejects(() => saveCompactionConfig(ed, { evil: 1 }), /没有可改的字段/)
})

await t('找不到压缩引擎条目给 null，不抛', () => {
  const none = { entries: () => [], configuration: () => [], edit: async () => {} }
  assert.strictEqual(readCompactionConfig(none), null)
})

await t('向量 key / 地址：能清空、能写、格式不对要拒', async () => {
  const ed = mkEditor()
  const saved = await saveSelfConfig(ed, { embedKey: 'sk-abcdefgh12345678', embedBaseUrl: 'https://api.siliconflow.cn/' })
  assert.strictEqual(saved.embedKey, 'sk-abcdefgh12345678')
  assert.strictEqual(saved.embedBaseUrl, 'https://api.siliconflow.cn', '末尾斜杠要去掉')
  const cleared = await saveSelfConfig(ed, { embedKey: '' })
  assert.strictEqual(cleared.embedKey, '', '空串要能存进去（= 不用向量）')
  await assert.rejects(() => saveSelfConfig(ed, { embedBaseUrl: 'ftp://x' }), /http\(s\)/)
  await assert.rejects(() => saveSelfConfig(ed, { embedKey: 'short' }), /不像一个 key/)
})

await t('默认值齐全', () => {
  assert.strictEqual(DEFAULTS.embedBaseUrl, 'https://api.siliconflow.cn')
  assert.strictEqual(DEFAULTS.embedKey, '')
})

// ---- 追加：向量补算状态 ----
console.log('== 向量补算（状态列） ==')
const mkEmbed = () => {
  const seen = []
  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(init.body)
    seen.push(body.input)
    return {
      ok: true,
      json: async () => ({ data: body.input.map(() => ({ embedding: Array.from({ length: EMBED_DIM }, (_, i) => (i === 0 ? 1 : 0)) })) }),
    }
  }
  return { seen, fetchImpl }
}
const vecDb = () => {
  const d = openDb(TMP + 'test-vec.db')
  d.exec('DELETE FROM memories'); d.exec('DELETE FROM vectors')
  d.prepare("DELETE FROM meta WHERE key IN ('vec_sig','vec_count')").run()
  return d
}
const addMem = (d, text, sup = 0) => Number(d.prepare(
  'INSERT INTO memories (text, importance, pinned, heat, createdAt, lastMentionedAt, superseded) VALUES (?, 0.6, 0, 1, ?, ?, ?)',
).run(text, Date.now(), Date.now(), sup).lastInsertRowid)
const stateOf = (d, id) => d.prepare('SELECT vec_state, vec_attempts FROM memories WHERE id = ?').get(id)

await t('新写入天然待补，补完标 synced', async () => {
  const d = vecDb()
  const a = addMem(d, 'A件事'); const b = addMem(d, 'B件事')
  assert.strictEqual(pendingVectorCount(d), 2)
  const { seen, fetchImpl } = mkEmbed()
  const r = await flushPending(d, { apiKey: 'sk-test123456', fetchImpl })
  assert.strictEqual(r.ok, true)
  assert.deepStrictEqual(seen[0].sort(), ['A件事', 'B件事'])
  assert.strictEqual(stateOf(d, a).vec_state, 'synced')
  assert.strictEqual(stateOf(d, b).vec_state, 'synced')
  assert.strictEqual(pendingVectorCount(d), 0)
})

await t('补过的不再进请求', async () => {
  const d = openDb(TMP + 'test-vec.db')
  const { seen, fetchImpl } = mkEmbed()
  const r = await flushPending(d, { apiKey: 'sk-test123456', fetchImpl })
  assert.strictEqual(r.done, 0)
  assert.strictEqual(seen.length, 0, '全 synced 时一条请求都不该发')
})

await t('新写一条只补这一条', async () => {
  const d = openDb(TMP + 'test-vec.db')
  addMem(d, 'C新写的')
  const { seen, fetchImpl } = mkEmbed()
  const r = await flushPending(d, { apiKey: 'sk-test123456', fetchImpl })
  assert.strictEqual(r.done, 1)
  assert.deepStrictEqual(seen[0], ['C新写的'], '老的不该重发')
})

await t('失败累加次数，满 3 次标 failed 不再重试', async () => {
  const d = openDb(TMP + 'test-vec.db')
  const e = addMem(d, 'D一直失败')
  const bad = async () => ({ ok: false, status: 400, json: async () => ({}) })
  for (let i = 1; i <= 3; i++) {
    const r = await flushPending(d, { apiKey: 'sk-test123456', fetchImpl: bad })
    assert.strictEqual(r.ok, false)
    assert.strictEqual(stateOf(d, e).vec_attempts, i)
  }
  assert.strictEqual(stateOf(d, e).vec_state, 'failed', '满 3 次要标 failed')
  assert.strictEqual(pendingVectorCount(d), 0, 'failed 不再算待补')
})

await t('坏数据不挡后面：新条目照常补', async () => {
  const d = openDb(TMP + 'test-vec.db')
  addMem(d, 'E新写的')
  const { seen, fetchImpl } = mkEmbed()
  const r = await flushPending(d, { apiKey: 'sk-test123456', fetchImpl })
  assert.strictEqual(r.done, 1)
  assert.deepStrictEqual(seen[0], ['E新写的'])
})

await t('撤销替代复活老条目：没补过的自动被扫到', async () => {
  const d = openDb(TMP + 'test-vec.db')
  // 造一条「被替代时还没补过」的记忆
  const old = addMem(d, 'F老记忆')
  d.prepare('UPDATE memories SET superseded = 1 WHERE id = ?').run(old)
  assert.strictEqual(pendingVectorCount(d), 0, '被替代的不算待补')
  // 复活它
  d.prepare("UPDATE memories SET superseded = 0, vec_state = NULL WHERE id = ?").run(old)
  assert.strictEqual(pendingVectorCount(d), 1)
  const { seen, fetchImpl } = mkEmbed()
  await flushPending(d, { apiKey: 'sk-test123456', fetchImpl })
  assert.deepStrictEqual(seen[0], ['F老记忆'], '复活的老条目要被补上')
})

await t('换模型签名 → 状态清回待补，全库重算', async () => {
  const d = openDb(TMP + 'test-vec.db')
  d.prepare("UPDATE meta SET value = 'api:other-model' WHERE key = 'vec_sig'").run()
  const sig = checkSignature(d)
  assert.strictEqual(sig.stale, true)
  assert.ok(pendingVectorCount(d) > 0, '签名变了所有词条要重回待补')
  assert.strictEqual(Number(d.prepare('SELECT COUNT(*) AS n FROM vectors').get().n), 0)
})

closeDb()
await t('模型清单：从 llm 配置读 provider 和 model', () => {
  const llmEntry = { options: { name: '@deepseek-ai/dsh-llm-pi-ai' } }
  const ed = {
    entries: () => [llmEntry],
    configuration: () => [{ entry: llmEntry, inherited: {}, override: { providers: {
      bigmodel: { displayName: 'GLM', models: [{ id: 'glm-4.7-flash', name: 'glm-4.7-flash' }] },
      nvidia: { models: [{ id: 'nv-x', name: 'NV X' }] },
      empty: { displayName: '空', models: [] },
    } } }],
  }
  const cat = readModelCatalogue(ed)
  assert.strictEqual(cat.length, 2, '没 models 的 provider 要跳过')
  assert.strictEqual(cat[0].provider, 'bigmodel')
  assert.strictEqual(cat[0].name, 'GLM')
  assert.strictEqual(cat.find((x) => x.provider === 'nvidia').name, 'nvidia', '没 displayName 就用 key')
  assert.deepStrictEqual(cat[1].models, [{ id: 'nv-x', name: 'NV X' }])
})

await t('模型清单读不到给空数组，不抛', () => {
  assert.deepStrictEqual(readModelCatalogue({ entries: () => [] }), [])
  assert.deepStrictEqual(readModelCatalogue(null), [])
})

await t('摘要模型成对：都空 = 跟随会话，一个空要拦', async () => {
  const ed = mkEditor()
  // 先把两个都清空
  await saveCompactionConfig(ed, { summarizationProvider: '', summarizationModel: '' })
  assert.strictEqual(ed.store.summarizationProvider, '')
  assert.strictEqual(ed.store.summarizationModel, '')
  // 再填回具体模型
  await saveCompactionConfig(ed, { summarizationProvider: 'bigmodel', summarizationModel: 'glm-4.7-flash' })
  assert.strictEqual(ed.store.summarizationProvider, 'bigmodel')
  // 只把 provider 清空、model 留着 → 不成对，要拦
  await assert.rejects(() => saveCompactionConfig(ed, { summarizationProvider: '' }), /要么都填，要么都空/)
})

await t('重启判定：热项不报，重启项和混改都报', () => {
  assert.strictEqual(needsRestart({ wakePerDay: 8 }), false)
  assert.strictEqual(needsRestart({ quietStart: 22, quietEnd: 7 }), false)
  assert.strictEqual(needsRestart({ embedKey: 'sk-abcdefgh' }), false)
  assert.strictEqual(needsRestart({ wakeCheckMinutes: 3 }), false, '定时器现在会重建')
  assert.strictEqual(needsRestart({ workDenyTools: ['bash'] }), true)
  assert.strictEqual(needsRestart({ thresholdRatio: 0.7 }), true, '压缩配置属外部条目')
  assert.strictEqual(needsRestart({ wakePerDay: 8, workDenyTools: ['bash'] }), true, '混改有重启项就报')
  assert.strictEqual(needsRestart({ wakePerDay: 8, quietStart: 22 }), false)
  assert.ok(RESTART_KEYS.includes('summarizationModel'))
})

// ---- 追加：嵌入 / 精排分开配 ----
console.log('== 嵌入与精排的接口配置 ==')
const mkApi = (dim = EMBED_DIM) => {
  const seen = []
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body)
    seen.push({ url: String(url), model: body.model })
    if (String(url).includes('/rerank')) {
      return { ok: true, json: async () => ({ results: [{ index: 0, relevance_score: 0.9 }] }) }
    }
    return { ok: true, json: async () => ({ data: body.input.map(() => ({ embedding: Array.from({ length: dim }, (_, i) => (i === 0 ? 1 : 0)) })) }) }
  }
  return { seen, fetchImpl }
}

await t('默认走硅基流动的 /v1/embeddings', async () => {
  const { seen, fetchImpl } = mkApi()
  await embedTexts(['x'], { apiKey: 'sk-test123456', fetchImpl })
  assert.strictEqual(seen[0].url, 'https://api.siliconflow.cn/v1/embeddings')
  assert.strictEqual(seen[0].model, 'BAAI/bge-m3')
})

await t('模型和路径都能改（切本地服务用）', async () => {
  const { seen, fetchImpl } = mkApi()
  await embedTexts(['x'], { apiKey: 'sk-test123456', baseUrl: 'http://127.0.0.1:8080', model: 'local/bge', path: '/embed', fetchImpl })
  assert.strictEqual(seen[0].url, 'http://127.0.0.1:8080/embed')
  assert.strictEqual(seen[0].model, 'local/bge')
})

await t('地址本身带 /embeddings 就不再拼路径', async () => {
  const { seen, fetchImpl } = mkApi()
  await embedTexts(['x'], { apiKey: 'sk-test123456', baseUrl: 'http://127.0.0.1:8080/v1/embeddings', path: '/embed', fetchImpl })
  assert.strictEqual(seen[0].url, 'http://127.0.0.1:8080/v1/embeddings')
})

await t('精排可以用完全不同的地址和模型', async () => {
  const { seen, fetchImpl } = mkApi()
  await rerank('q', ['a'], { apiKey: 'sk-test123456', baseUrl: 'http://127.0.0.1:9000', model: 'local/reranker', path: '/rerank', fetchImpl })
  assert.strictEqual(seen[0].url, 'http://127.0.0.1:9000/rerank')
  assert.strictEqual(seen[0].model, 'local/reranker')
})

await t('签名跟着模型走', () => {
  assert.strictEqual(signatureOf('model/a'), 'api:model/a')
  assert.strictEqual(signatureOf(''), 'api:BAAI/bge-m3', '空值用默认模型')
})

await t('换了嵌入模型：老向量作废重算（哪怕维度一样）', async () => {
  const d = openDb(TMP + 'test-swap.db')
  d.exec('DELETE FROM memories'); d.exec('DELETE FROM vectors')
  d.prepare("DELETE FROM meta WHERE key LIKE 'vec_%'").run()
  const now = Date.now()
  d.prepare('INSERT INTO memories (text, createdAt, vec_state) VALUES (?, ?, NULL)').run('甲', now)
  const a = mkApi()
  await flushPending(d, { apiKey: 'sk-test123456', model: 'model/a', fetchImpl: a.fetchImpl })
  assert.strictEqual(readMeta(d).vec_sig, 'api:model/a')
  assert.strictEqual(Number(d.prepare('SELECT COUNT(*) AS n FROM vectors').get().n), 1)

  d.prepare('INSERT INTO memories (text, createdAt, vec_state) VALUES (?, ?, NULL)').run('乙', now)
  const b = mkApi()
  const r = await flushPending(d, { apiKey: 'sk-test123456', model: 'model/b', fetchImpl: b.fetchImpl })
  assert.strictEqual(r.ok, false)
  assert.match(String(r.reason), /换了嵌入模型/)
  assert.strictEqual(Number(d.prepare('SELECT COUNT(*) AS n FROM vectors').get().n), 0, '老向量要清空')
  assert.strictEqual(b.seen.length, 0, '这一轮不该发请求，只清空')

  const r2 = await flushPending(d, { apiKey: 'sk-test123456', model: 'model/b', fetchImpl: mkApi().fetchImpl })
  assert.strictEqual(r2.ok, true)
  assert.strictEqual(readMeta(d).vec_sig, 'api:model/b')
})

await t('维度变了也清空重算', async () => {
  const d = openDb(TMP + 'test-swap2.db')
  d.exec('DELETE FROM memories'); d.exec('DELETE FROM vectors')
  d.prepare("DELETE FROM meta WHERE key LIKE 'vec_%'").run()
  d.prepare('INSERT INTO memories (text, createdAt, vec_state) VALUES (?, ?, NULL)').run('甲', Date.now())
  await flushPending(d, { apiKey: 'sk-test123456', model: 'same/model', fetchImpl: mkApi(EMBED_DIM).fetchImpl })
  assert.strictEqual(readMeta(d).vec_dim, String(EMBED_DIM))
  // 要有待补的行才会真的去调接口，才能发现维度不对
  d.prepare('INSERT INTO memories (text, createdAt, vec_state) VALUES (?, ?, NULL)').run('乙', Date.now())
  const r = await flushPending(d, { apiKey: 'sk-test123456', model: 'same/model', fetchImpl: mkApi(8).fetchImpl })
  assert.strictEqual(r.ok, false)
  assert.match(String(r.reason), /维度变了/)
  assert.strictEqual(Number(d.prepare('SELECT COUNT(*) AS n FROM vectors').get().n), 0)
})

// ---- 追加：撤销要原样放回去 ----
console.log('== 删除与撤销 ==')

await t('撤销后分数、新鲜度、钉住状态都不打折', async () => {
  const d = openDb(TMP + 'test-undo.db')
  d.exec('DELETE FROM memories'); d.exec('DELETE FROM graveyard')
  const now = Date.now()
  const id = Number(d.prepare(
    'INSERT INTO memories (text, importance, heat, repeatStrength, pinned, createdAt, lastTouchedAt, lastMentionedAt, cold) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run('原始记忆', 0.9, 3.5, 2.5, 1, now - 86400000 * 30, now - 86400000 * 5, now - 86400000 * 2, 1).lastInsertRowid)
  const before = d.prepare('SELECT * FROM memories WHERE id = ?').get(id)
  forgetMemory(d, id)
  const r = restoreFromGraveyard(d, id)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.restored, true, '应该走整行快照那条路')
  const after = d.prepare('SELECT * FROM memories WHERE id = ?').get(r.id)
  for (const k of ['importance', 'heat', 'repeatStrength', 'pinned', 'cold', 'createdAt', 'lastTouchedAt', 'lastMentionedAt']) {
    assert.strictEqual(String(after[k]), String(before[k]), `${k} 应该原样回来`)
  }
  assert.strictEqual(after.vec_state, null, '恢复的记忆要重新补向量')
  closeDb(TMP + 'test-undo.db')
})

await t('撤销认原记忆 id，也认台账 id', async () => {
  const d = openDb(TMP + 'test-undo2.db')
  d.exec('DELETE FROM memories'); d.exec('DELETE FROM graveyard')
  const id = Number(d.prepare('INSERT INTO memories (text, importance, createdAt) VALUES (?,?,?)').run('甲', 0.6, Date.now()).lastInsertRowid)
  forgetMemory(d, id)
  assert.strictEqual(restoreFromGraveyard(d, id).ok, true, '按原 id')
  const id2 = Number(d.prepare('INSERT INTO memories (text, importance, createdAt) VALUES (?,?,?)').run('乙', 0.6, Date.now()).lastInsertRowid)
  forgetMemory(d, id2)
  const gid = d.prepare('SELECT id FROM graveyard ORDER BY id DESC LIMIT 1').get().id
  assert.strictEqual(restoreFromGraveyard(d, gid).ok, true, '按台账 id')
  assert.strictEqual(restoreFromGraveyard(d, 99999).ok, false, '不存在的 id 要报错')
  closeDb(TMP + 'test-undo2.db')
})

// ---- 追加：注入参数与最近注入 ----
console.log('== 记忆注入 ==')

await t('门槛越界会被夹回边界', async () => {
  const { tuneRecall, RECALL } = await import('../src/inject.js')
  tuneRecall({ recallLimit: 999, recallMaxChars: 1, recallMinRel: -5 })
  assert.strictEqual(RECALL.limit, 20)
  assert.strictEqual(RECALL.maxChars, 100)
  assert.strictEqual(RECALL.minRel, 0)
  tuneRecall({})
  assert.strictEqual(RECALL.limit, 3)
  assert.strictEqual(RECALL.maxChars, 800)
  assert.strictEqual(RECALL.minRel, 0.62)
})

await t('有标记就注入，不拿精排分卡（实测长句 rerank 恒 0）', async () => {
  const { tuneRecall, decideInject, RECALL } = await import('../src/inject.js')
  tuneRecall({})
  // 真实长句的精排分实测恒为 0.000：拿它当门槛等于一条都带不出来。
  const flat = { hits: [{ id: 1, rel: 0.0009, text: '工作要求：工具命名必须准确' }] }
  assert.strictEqual(decideInject('你还记得之前说的插件工具命名吗', flat).inject, true, '在要回忆就该带')
  assert.strictEqual(decideInject('你还记得之前说的插件工具命名吗', flat).why, 'marked')
  // 无标记的长句仍要过主门槛
  assert.strictEqual(decideInject('帮我把这个文件删了然后重新装一遍', flat).inject, false, '不在要回忆就别带')
  assert.strictEqual(decideInject('帮我把这个文件删了然后重新装一遍', flat).why, 'low-rel')
  // 无标记的短句直接跳过，分数再高也不看
  assert.strictEqual(decideInject('继续', { hits: [{ id: 1, rel: 0.9, text: 'x' }] }).why, 'too-short')
  // 无标记但精排分够高 → 带
  assert.strictEqual(decideInject('插件工具命名的事', { hits: [{ id: 1, rel: 0.9, text: 'x' }] }).inject, true)
  // 主门槛仍然跟面板走，但它只管无标记那一档
  tuneRecall({ recallMinRel: 0.8 })
  assert.strictEqual(RECALL.minRel, 0.8, '面板调的主门槛要生效')
  assert.strictEqual(decideInject('插件工具命名的事', { hits: [{ id: 1, rel: 0.7, text: 'x' }] }).inject, false, '主门槛管无标记句')
  tuneRecall({})
})

await t('最近注入只认注入，不混搜索', async () => {
  const d = openDb(TMP + 'test-recent.db')
  d.exec('DELETE FROM memories')
  const now = Date.now()
  const a = Number(d.prepare('INSERT INTO memories (text, importance, createdAt) VALUES (?,?,?)').run('注入过的', 0.6, now).lastInsertRowid)
  const b = Number(d.prepare('INSERT INTO memories (text, importance, createdAt) VALUES (?,?,?)').run('只搜过', 0.6, now).lastInsertRowid)
  markUsed(d, [a], { via: 'inject', now })
  markUsed(d, [b], { via: 'search', now })
  const rows = recentInjected(d, { limit: 10 })
  assert.strictEqual(rows.length, 1, '搜过的不能算注入')
  assert.strictEqual(rows[0].id, a)
  closeDb(TMP + 'test-recent.db')
})

await t('跨轮去重：带过的不再带', async () => {
  const { createRecaller } = await import('../src/inject.js')
  const rec = createRecaller({
    search: async () => ({ ok: true, hits: [
      { id: 1, rel: 0.9, text: '第一条旧事' },
      { id: 2, rel: 0.85, text: '第二条旧事' },
    ] }),
    markUsed: () => {},
    getCfg: () => ({}),
  })
  await rec.prefetch('s1', '你还记得什么')
  const first = rec.take('s1')
  assert.ok(first.includes('第一条旧事'), '第一次应该带出来')

  // 换一句话问，检索结果还是那两条 → 不该再带
  await rec.prefetch('s1', '你还记得哪些旧事')
  const second = rec.take('s1')
  assert.strictEqual(second, '', '带过的不该重复注入')
})

await t('去重按会话隔离，压缩只清自己那个', async () => {
  const { createRecaller, clearRecallDedupe } = await import('../src/inject.js')
  const rec = createRecaller({
    search: async () => ({ ok: true, hits: [{ id: 1, rel: 0.9, text: '同一条旧事' }] }),
    markUsed: () => {}, getCfg: () => ({}),
  })
  await rec.prefetch('A', '你还记得那件事吗'); assert.ok(rec.take('A').length > 0, 'A 第一次该带')
  await rec.prefetch('B', '你还记得那件事吗'); assert.ok(rec.take('B').length > 0, 'B 第一次该带')
  clearRecallDedupe('A')                                  // 只压 A
  await rec.prefetch('B', '你还记得另一件事吗'); assert.strictEqual(rec.take('B'), '', 'A 压缩不该影响 B')
  await rec.prefetch('A', '你还记得另一件事吗'); assert.ok(rec.take('A').length > 0, 'A 压缩后该重新带')
})

await t('每个设置项都能单独保存（别嵌错层级）', async () => {
  const { saveSelfConfig } = await import('../src/wake/settings.js')
  const mk = () => {
    const store = { dsh: { 'dsh-qingdai-core': { config: { enabled: true } } } }
    return {
      read: () => store,
      update: (fn) => { store.dsh['dsh-qingdai-core'].config = fn(store.dsh['dsh-qingdai-core'].config) },
      entries: () => [{ options: { name: 'dsh-qingdai-core' }, entry: 'e1' }],
      configuration: () => [{ entry: 'e1', inherited: store.dsh['dsh-qingdai-core'].config, override: {} }],
      edit: async (e, fn) => { store.dsh['dsh-qingdai-core'].config = fn(store.dsh['dsh-qingdai-core'].config) },
    }
  }
  const one = async (patch, why) => {
    try { await saveSelfConfig(mk(), patch); return true } catch (e) { throw new Error(why + '：' + e.message) }
  }
  await one({ workRawKeepDays: 365 }, '原文天数单独保存不了')
  await one({ recallMinRel: 0.7 }, '注入门槛单独保存不了')
  await one({ recallLimit: 4 }, '注入条数单独保存不了')
  await one({ recallEnabled: false }, '注入开关单独保存不了')
  await one({ wakeSessions: ['session-abc123456'] }, '白名单单独保存不了')
  await one({ originDate: '2026-10-29' }, '起始日期单独保存不了')
})

await t('工具参数→schema：两种写法都认，enum/items 都不丢', async () => {
  const { paramsToSchema } = await import('../src/tools.js')
  const a = paramsToSchema({
    text: { type: 'string', description: '内容', required: true },
    mode: { type: 'string', enum: ['a', 'b'] },
    ids: { type: 'array', items: { type: 'number' } },
  })
  assert.strictEqual(a.properties.text.description, '内容')
  assert.deepStrictEqual(a.properties.mode.enum, ['a', 'b'], 'enum 不能丢')
  assert.deepStrictEqual(a.properties.ids.items, { type: 'number' }, 'items 不能丢')
  assert.deepStrictEqual(a.required, ['text'])

  const b = paramsToSchema({ action: 'string', text: 'string' })
  assert.deepStrictEqual(b.required, ['action'], '简写约定第一个必填')
  assert.strictEqual(b.properties.action.type, 'string')

  assert.deepStrictEqual(paramsToSchema(), { type: 'object', properties: {}, required: [] })
})

// ---- 开口闸门 ----
await t('开口闸门：从没记到说过话时不开口', async () => {
  const { gates } = await import('../src/wake/gates.js')
  const now = Date.now()
  const base = { now, quietStart: 0, quietEnd: 0, silentMinutes: 30, wakePerDay: 10, todayCount: 0 }
  // 没记录 = 「还不知道」，不是「聊完了」。以前这里会跳过闸门直接放行，
  // 插件刚装好、5 秒后的 boot wake 就可能立刻开口。
  const r = gates({ ...base, lastTalkAt: 0 })
  assert.strictEqual(r.open, false, '没记录时不能开口')
  assert.strictEqual(r.blocked, 'no-talk-record')
  assert.strictEqual(gates({ ...base, lastTalkAt: now - 5 * 60_000 }).blocked, 'chatting', '刚聊过要拦')
  assert.strictEqual(gates({ ...base, lastTalkAt: now - 60 * 60_000 }).open, true, '久没聊要放行')
})

await t('开口闸门：上一轮还没跑完时不再投一条', async () => {
  const { gates } = await import('../src/wake/gates.js')
  const now = Date.now()
  // 10:04 醒、还在调工具，10:09 判定门又全过 → 又投一条，最后被 cancel。
  const base = { now, quietStart: 0, quietEnd: 0, silentMinutes: 30, wakePerDay: 10, todayCount: 0, lastTalkAt: now - 60 * 60_000 }
  const r = gates({ ...base, busy: true })
  assert.strictEqual(r.open, false, '忙着就不能再叫')
  assert.strictEqual(r.blocked, 'busy')
  assert.strictEqual(gates({ ...base, busy: false }).open, true, '不忙就正常放行')
  // 忙不该盖住更早的闸门：刚聊过还是报 chatting。
  assert.strictEqual(gates({ ...base, lastTalkAt: now - 60_000, busy: true }).blocked, 'chatting')
})

await t('忙不忙：拿得到 turn 状态才判，拿不到当不忙', async () => {
  const { isBusySession } = await import('../src/wake/session.js')
  assert.strictEqual(isBusySession(undefined, 'x'), false, '没有 ctx 不能抛')
  assert.strictEqual(isBusySession({ agents: { get: () => undefined } }, 'x'), false, '会话不在内存里 = 没在跑')
  const ctxBusy = { agents: { get: () => ({ session: {} }), turnBoundaryOf: () => ({ openTurnStartSeq: 3, lastTurn: 2 }) } }
  assert.strictEqual(isBusySession(ctxBusy, 'x'), true, '开着 turn 就是忙')
  const ctxIdle = { agents: { get: () => ({ session: {} }), turnBoundaryOf: () => ({ openTurnStartSeq: null, lastTurn: 2 }) } }
  assert.strictEqual(isBusySession(ctxIdle, 'x'), false, '收尾了就是不忙')
  const ctxBroken = { agents: { get: () => { throw new Error('boom') } } }
  assert.strictEqual(isBusySession(ctxBroken, 'x'), false, '探测失败当不忙')
})

await t('最后说话时间：事件缺时间戳时不能假装「刚聊过」', async () => {
  const { lastTalkAtOf } = await import('../src/wake/session.js')
  const mk = (events) => ({ snapshotEvents: () => events })
  const old = 1795000000000
  assert.strictEqual(lastTalkAtOf(mk([])), 0, '没有事件返回 0')
  // 最新一条没 ts，上一条有：要拿到上一条的时间，不能返回 now
  assert.strictEqual(
    lastTalkAtOf(mk([{ type: 'assistant/message', ts: old }, { type: 'assistant/message' }])),
    old, '缺 ts 的跳过，继续往前找')
  // 一条有效时间都没有：返回 0，不能是 now
  assert.strictEqual(
    lastTalkAtOf(mk([{ type: 'assistant/message' }])),
    0, '全都缺 ts 时返回 0')
})

await t('最后说话时间：宿主的 time 字段要认', async () => {
  const { lastTalkAtOf } = await import('../src/wake/session.js')
  const mk = (events) => ({ snapshotEvents: () => events })
  const t1 = 1795000000000
  // 宿主事件形状是 {type, seq, time, data}（dsh-session/lib/types/index.js:418）。
  // 以前只认 ts/at/data.ts，全是 undefined → 每条都被跳过 → 永远返回 0，
  // lastTalkAt 再也不更新，「多久没聊」一直用着旧值。
  assert.strictEqual(
    lastTalkAtOf(mk([{ type: 'assistant/message', seq: 1, time: t1, data: {} }])),
    t1, '顶层 time 要认')
  assert.strictEqual(
    lastTalkAtOf(mk([
      { type: 'user/message', seq: 1, time: t1, data: { message: { content: [{ type: 'text', text: '在吗' }], source: { kind: 'user' } } } },
      { type: 'assistant/message', seq: 2, time: t1 + 5000, data: {} },
    ])),
    t1 + 5000, '取最新一条')
})

// ---- 孤儿会话判定 ----
await t('孤儿判定：扫不到会话目录给空集，不能当「全是孤儿」', async () => {
  const { liveSessions, orphanSessions } = await import('../src/raw.js')
  assert.strictEqual(liveSessions(TMP + 'no-such-sessions').size, 0, '目录不存在给空集')
  // 空集的语义是「不知道」，不是「全死」。orphanSessions 必须拒绝判断，
  // 否则一条活跃会话的原文会被当成孤儿清掉。
  const db = openDb(TMP + 'test-orphan.db')
  const r = orphanSessions(db, new Set())
  assert.strictEqual(r.ok, false, '空集不判孤儿')
  assert.deepStrictEqual(r.rows, [], '空集时一行都不给')
  closeDb()
})

await t('孤儿判定：会话目录存在时能扫到 sid', async () => {
  const { liveSessions } = await import('../src/raw.js')
  const { mkdirSync } = await import('node:fs')
  const root = TMP + 'test-sessions'
  mkdirSync(root + '/--bucket-a--/sid-aaa', { recursive: true })
  mkdirSync(root + '/--bucket-b--/sid-bbb', { recursive: true })
  const live = liveSessions(root)
  assert.strictEqual(live.size, 2, '两个桶各一个会话')
  assert.ok(live.has('sid-aaa') && live.has('sid-bbb'))
})

// ---- 状态文件（wake-state.json） ----
await t('状态文件：另一个实例写了，这边读得到', async () => {
  const { createStore } = await import('../src/wake/storage.js')
  const f = TMP + 'test-store-shared.json'
  const a = createStore(f)
  const b = createStore(f)
  a.update((s) => { s.lastTalkAt = 1 })     // a 先写一次，两边都有缓存
  b.get()
  b.update((s) => { s.lastTalkAt = 12345 })
  assert.strictEqual(a.get().lastTalkAt, 12345, 'b 写的 a 该看见（按 mtime 重读）')
})

await t('状态文件：自己写的不会被自己重读丢掉', async () => {
  const { createStore } = await import('../src/wake/storage.js')
  const f = TMP + 'test-store-self.json'
  const s = createStore(f)
  s.update((st) => { st.lastTalkAt = 999 })
  assert.strictEqual(s.get().lastTalkAt, 999, '写完立刻读要还是自己那份')
  s.update((st) => { st.lastTalkAt = 1000 })
  assert.strictEqual(s.get().lastTalkAt, 1000, '连写两次也不能回退')
})

await t('状态文件：坏了/不存在都给空状态，不抛', async () => {
  const { readState, emptyState } = await import('../src/wake/storage.js')
  const { writeFileSync } = await import('node:fs')
  assert.deepStrictEqual(readState(TMP + 'no-such-file.json'), emptyState(), '文件不在给空状态')
  writeFileSync(TMP + 'test-store-broken.json', '{ 这不是 json', 'utf8')
  assert.deepStrictEqual(readState(TMP + 'test-store-broken.json'), emptyState(), '读坏给空状态')
})

await t('开口计数：跨天自动清零，只留今天和昨天', async () => {
  const { bumpWakeCount, wakeCountToday, emptyState } = await import('../src/wake/storage.js')
  const st = emptyState()
  const today = new Date(2026, 10, 25, 12, 0, 0).getTime()
  const yday = today - 86400_000
  assert.strictEqual(bumpWakeCount(st, today), 1)
  assert.strictEqual(bumpWakeCount(st, today), 2)
  assert.strictEqual(wakeCountToday(st, today), 2)
  bumpWakeCount(st, today + 86400_000)   // 第二天
  assert.strictEqual(Object.keys(st.wakeCount).length, 2, '只留今天和昨天')
  assert.strictEqual(wakeCountToday(st, today + 86400_000), 1, '新的一天从 1 开始')
})

closeDb()
console.log(`\n全部 ${passed} 项通过`)
