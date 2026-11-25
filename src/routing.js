// routing.js —— 会话 → 库的路由。分库隔离的唯一裁判。
//
// 【规则只有一条，不由内容猜】
//   sid ∈ wakeSessions（白名单）→ qingdai 库
//   其余                        → work 库
//   sid 拿不到                  → 拒绝，报原因。**绝不猜库**——
//     写错方向比读不到更糟（v2 index.js:184 的教训原话）。
//
// 【白名单唯一源】wakeSessions 由 wake/settings.js 管理与展示，这里只读。
//   读取走 configEditor 运行时解析（微信桥 v2 先例：白名单可能后到，
//   启动时读不到不算失败，每次用的时候现查）。
//   兜底：本插件自己的 qingdaiSessions 配置；两边都空 = 拒写不猜。

import { join } from 'node:path'

export const DB_NAMES = Object.freeze({ qingdai: 'qingdai.db', work: 'work.db' })

/**
 * 这个会话是不是白名单会话。
 * 白名单列表由调用方注入（index.js 每次现查 configEditor 再传进来），
 * 本模块不做 IO，方便测试。
 */
export function isQingdaiSession(sid, sessions = []) {
  const id = String(sid ?? '').trim()
  if (!id) return false
  return sessions.some((x) => String(x ?? '').trim() === id)
}

/**
 * 会话 → 库文件路径。
 *
 * @param {string} sid             会话 id（必须非空）
 * @param {string} dataDir         库所在目录（…/storages/qingdai-core）
 * @param {string[]} sessions      当前生效的白名单
 * @returns {{ok:true, db:string, side:'qingdai'|'work'} | {ok:false, reason:string}}
 */
export function dbPlanFor(sid, dataDir, sessions = []) {
  const id = String(sid ?? '').trim()
  if (!id) return { ok: false, reason: '拿不到会话 id，拒绝写入（不猜库）' }
  const side = isQingdaiSession(id, sessions) ? 'qingdai' : 'work'
  return { ok: true, db: join(dataDir, side, DB_NAMES[side]), side }
}

/**
 * 从宿主装配体里挖会话 id（memory-tiers index.mjs:944 同款多级兜底）。
 * 工具 execute 的 exec.agent、事件的 session 对象都长这个形状。
 */
export function sidFrom(anyAgentish) {
  const a = anyAgentish ?? {}
  const id = a?.session?.id ?? a?.session?.header?.id ?? a?.agent?.session?.header?.id
    ?? a?.agent?.session?.id ?? a?.agent?.sessionId ?? a?.sessionId ?? null
  return id ? String(id) : ''
}
