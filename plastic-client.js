window.__ModuleLoader__.load({
  id: "dsh-plastic-memory",
  factory(require) {
    var module = { exports: {} };
    var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/index.tsx
var index_exports = {};
__export(index_exports, {
  PACKAGE_NAME: () => PACKAGE_NAME,
  PANEL_ID: () => PANEL_ID,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react49 = require("react");

// client/composer/dock.tsx
var import_react43 = require("react");

// client/nav.ts
var import_react2 = require("react");

// src/gui/contract.ts
var import_zod3 = require("zod");

// src/record-schema.ts
var import_zod = require("zod");
var memoryRecordSchema = import_zod.z.object({
  id: import_zod.z.string(),
  name: import_zod.z.string().min(1),
  type: import_zod.z.string(),
  scope: import_zod.z.enum(["global", "workspace"]),
  workspacePath: import_zod.z.string().optional(),
  tags: import_zod.z.array(import_zod.z.string()),
  content: import_zod.z.string(),
  summary: import_zod.z.string(),
  /** 缺省 = 手编/无出处（手建文件）：不带「模型推断」标注，memory_source 回「无出处」。 */
  source: import_zod.z.object({
    sessionId: import_zod.z.string(),
    eventRange: import_zod.z.tuple([import_zod.z.number(), import_zod.z.number()]),
    sourceMode: import_zod.z.enum(["user-explicit", "user-behavior", "environment-observed", "agent-inferred", "agent-action-confirmed"])
  }).optional(),
  createdAt: import_zod.z.number(),
  updatedAt: import_zod.z.number(),
  lastConfirmedAt: import_zod.z.number(),
  lastRecalledAt: import_zod.z.number().nullable(),
  recallCount: import_zod.z.number(),
  validFrom: import_zod.z.number().optional(),
  validTo: import_zod.z.number().optional(),
  status: import_zod.z.enum(["active", "superseded", "deleted"]),
  confidence: import_zod.z.number().min(0).max(1),
  supersedes: import_zod.z.array(import_zod.z.string()).optional(),
  /** 模型自主判断"该全局"但无权直写 global：落 workspace 时打此标记，治理时作为提升候选。 */
  globalCandidate: import_zod.z.boolean().optional(),
  /**
   * 子 agent 写入的委派信息（宿主填）。缺省 = 主会话或手建。顶层键：旧版插件把它当未知键原样保留，嵌进 source 会在维护回写时丢掉。
   * 创建者四个字段写入后不再改，升档只加 reviewed。
   */
  delegation: import_zod.z.object({
    /** 创建这条记录的子会话；主会话改写后 source.sessionId 变成主会话，这里不变 */
    sessionId: import_zod.z.string(),
    depth: import_zod.z.number().int().min(1),
    parentSessionId: import_zod.z.string(),
    /** 解析不到根会话时缺省，不阻塞保存 */
    rootSessionId: import_zod.z.string().optional(),
    /** 谁把它升成主档；缺省 = 待确认 */
    reviewed: import_zod.z.object({ by: import_zod.z.enum(["user", "main"]), at: import_zod.z.number() }).optional()
  }).optional(),
  /** 软删时刻（清扫按它计窗口）。 */
  deletedAt: import_zod.z.number().optional()
});

// src/scope.ts
var import_zod2 = require("zod");
var scopeSchema = import_zod2.z.discriminatedUnion("kind", [
  import_zod2.z.object({ kind: import_zod2.z.literal("global") }),
  import_zod2.z.object({ kind: import_zod2.z.literal("workspace"), workspacePath: import_zod2.z.string() })
]);
var GLOBAL_SCOPE_KEY = "global";
function scopeKey(scope) {
  return scope.kind === "global" ? GLOBAL_SCOPE_KEY : scope.workspacePath;
}
function scopeOfMemory(memory) {
  if (memory.scope === "global") return { kind: "global" };
  return memory.workspacePath === void 0 ? void 0 : { kind: "workspace", workspacePath: memory.workspacePath };
}
function sameScope(a, b) {
  if (a.kind === "global" || b.kind === "global") return a.kind === b.kind;
  return trimTrailingSeparator(a.workspacePath) === trimTrailingSeparator(b.workspacePath);
}
function trimTrailingSeparator(path) {
  const trimmed = path.replace(/[\\/]+$/, "");
  return trimmed === "" ? path.slice(0, 1) : trimmed;
}

// src/contract-codes.ts
var MODEL_CHANGE_KINDS = ["rewrite", "supersede"];
var SCAN_NOTE_CODES = [
  "semantic-unavailable",
  // layers=full 但拿不到 LLM，只返回规则层
  "no-layer-executed",
  // layers=semantic 且拿不到 LLM，什么都没跑
  "semantic-batched",
  // 记忆超出一次调用的 token 预算，语义层分批检查，跨批的成对问题可能漏
  "semantic-failed",
  // LLM 抛异常或两次输出无法解析，未更新语义缓存
  "model-unavailable",
  // 模型用不了：宿主报未登录或缺凭据（governance/host-llm.ts MODEL_UNAVAILABLE_HOST_CODES），未更新语义缓存；不算失败
  "baseline-missing",
  // 指令文件（AGENTS.md / CLAUDE.md）取不到，这个作用域的垂直冲突检测未执行
  "baseline-truncated",
  // 指令文件超过长度上限被截断，垂直冲突只对照了其中一部分
  "cross-ws-failed",
  // 跨项目重复分析失败，退用实体聚类保底
  "conflicts-settled"
  // 有冲突此前裁决为两边都留、双方未改，本次不再列出
];
var RETIRED_SCAN_NOTE_CODES = [
  "baseline-session-scoped"
  // 旧版的指令文件跟着会话取，查的不是会话所在项目时跳过垂直冲突检测
];
var CHECKUP_INITIATORS = ["manual", "auto", "agent"];
var CHECKUP_CAUSE_KINDS = ["no-default-model", "model-error", "unparseable", "error"];
var PROPOSAL_ACTIONS = ["merge", "keep-a", "keep-b", "keep-both", "rewrite", "delete"];
function verdictOfAction(action) {
  return action === "keep-a" ? "keep-left" : action === "keep-b" || action === "delete" ? "keep-right" : action === "keep-both" ? "keep-both" : void 0;
}
var SUGGESTION_FAILURE_KINDS = ["model-error", "unparseable", "secret-in-draft", "undecided", "quota-exhausted", "no-baseline"];
var DIRECTORY_NOTE_CODES = [
  "reserved-keys",
  // frontmatter 写了保留键（scope、workspacePath、召回统计、content），已忽略
  "marker-missing",
  // workspace 目录缺 .workspace 标记（或标记为空），目录不进清单、文件不读
  "dir-unreadable",
  // 目录不可读（权限等），计空
  "dir-empty",
  // workspace 目录顶层没有记忆文件（只剩归档或全空），不进体检清单
  "duplicate-id"
  // 同一 id 有多个文件：读取时按取舍规则用一份，其余副本不自动删（health / scan 报出）
];
var OVERFLOW_MODES = ["relax", "strict"];
var IGNORABLE_ADVICE_TYPES = ["expired", "bloat", "redundancy", "orphan", "misplaced", "unclear"];
var GENERAL_SCENE = "custom";
var SCENE_MAX_TYPES = 8;
var MAX_SCENES = 5;

// src/retention.ts
var RETENTION_MS = 14 * 864e5;

// src/secrets.ts
function keyBlock(begin, end) {
  const lead = String.raw`(?:[^\S\r\n]|>)*`;
  const trail = String.raw`[^\S\r\n]*`;
  const bodyLine = String.raw`\r?\n${lead}(?:[A-Za-z0-9+/=]+|[A-Za-z][A-Za-z0-9-]*: (?:[^\r\n]*\S)?|(?=\r?\n${lead}[A-Za-z0-9+/=]))${trail}(?=\r?\n|$)`;
  return new RegExp(String.raw`${begin}(?:${trail}(?:${bodyLine})*\r?\n${lead}${end}|[^\r\n]*(?:${bodyLine})*)`);
}
var SECRET_PATTERNS = [
  { name: "sk- \u7CFB\u5217\u5BC6\u94A5\uFF08OpenAI/Anthropic \u7B49\uFF09", re: /\bsk-[A-Za-z0-9_-]{16,}\b/, severity: "critical" },
  { name: "GitHub token\uFF08ghp_/gho_ \u7B49\uFF09", re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/, severity: "critical" },
  { name: "AWS Access Key", re: /\bAKIA[0-9A-Z]{16}\b/, severity: "critical" },
  { name: "JWT", re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/, severity: "critical" },
  { name: "PEM \u79C1\u94A5\u5757", re: keyBlock("-----BEGIN ([A-Z ]*)PRIVATE KEY-----", String.raw`-----END \1PRIVATE KEY-----`), severity: "critical" },
  { name: "PGP \u79C1\u94A5\u5757", re: keyBlock("-----BEGIN PGP PRIVATE KEY BLOCK-----", "-----END PGP PRIVATE KEY BLOCK-----"), severity: "critical" },
  { name: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{8,}\b/, severity: "critical" },
  { name: "Google API Key", re: /\bAIza[0-9A-Za-z_-]{35}\b/, severity: "critical" },
  { name: "Bearer token", re: /\bBearer\s+[A-Za-z0-9._-]{20,}/, severity: "critical" },
  // 以下两条无厂商特征、正则较宽，归 suspected（拦下待确认，force 放行，避免误伤）。
  // \S{6,} 对中文文本会把任意 6 个非空白字符当密码——中文记忆没有空格，普通句子如
  // "密码:公司统一走单点登录" 也会命中。约束取值必须像凭证（同时含数字与字母）且不含中日韩字符，
  // 排除自然语言描述、保留真正贴出来的口令。
  // 两条都把凭据值本身放进 value 分组（不含标签、分隔符、引号）：核对改写稿里的值是不是原文里本来就有的（secretValues）。
  { name: "\u786C\u7F16\u7801\u5BC6\u7801", re: /(?:password|passwd|pwd|密码)\s*[:=＝：]\s*(?<value>(?=\S*[0-9])(?=\S*[A-Za-z])[^\s㐀-鿿]{6,})/i, severity: "suspected" },
  // 引号改为可选：记忆内容是散文而非代码，"api_key: 1234567890abcdef" 这种写法不该被漏检。
  { name: "\u901A\u7528 api_key/token/secret \u8D4B\u503C", re: /\b(?:api[_-]?key|access[_-]?token|secret)\s*[:=]\s*['"]?(?<value>[A-Za-z0-9_-]{16,})['"]?/i, severity: "suspected" }
];
function detectSecrets(text) {
  return SECRET_PATTERNS.filter((p) => p.re.test(text)).map((p) => ({ name: p.name, severity: p.severity }));
}
var SECRET_MASK = "[\u5DF2\u9690\u85CF]";
var globalPatterns = (severities) => SECRET_PATTERNS.filter((p) => severities.includes(p.severity)).map((p) => new RegExp(p.re.source, `${p.re.flags}g`));
var GLOBAL_PATTERNS = {
  critical: globalPatterns(["critical"]),
  suspected: globalPatterns(["critical", "suspected"])
};
function rawSpans(text, opts) {
  return GLOBAL_PATTERNS[opts.severity ?? "critical"].flatMap((re) => [...text.matchAll(re)].map((m) => [m.index, m.index + m[0].length]));
}
function secretSpans(text, opts) {
  return mergeSpans(rawSpans(text, opts));
}
function mergeSpans(spans) {
  spans.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of spans) {
    const last = merged.at(-1);
    if (last !== void 0 && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
function maskRange(text, spans, from, to) {
  let out = "";
  let pos = from;
  for (const [start, end] of spans) {
    const a = Math.max(start, from);
    const b = Math.min(end, to);
    if (a >= b) continue;
    out += text.slice(pos, a) + SECRET_MASK;
    pos = b;
  }
  return out + text.slice(pos, to);
}
function maskSecrets(text, opts = {}) {
  return maskRange(text, secretSpans(text, opts), 0, text.length);
}
function surfaceSpans(r, opts) {
  const segments = [r.content, r.name, r.summary, ...r.tags];
  const starts = [];
  let text = "";
  segments.forEach((segment2, i) => {
    if (i > 0) text += i <= 3 ? "\n" : " ";
    starts.push(text.length);
    text += segment2;
  });
  const own = segments.flatMap((segment2, i) => secretSpans(segment2, opts).map(([a, b]) => [starts[i] + a, starts[i] + b]));
  const cross = rawSpans(text, opts).filter(([a, b]) => !own.some(([start, end]) => a >= start && b <= end));
  return { text, segments, starts, spans: mergeSpans([...own, ...cross]) };
}
function maskSecretSurface(r, opts = {}) {
  const { text, segments, starts, spans } = surfaceSpans(r, opts);
  if (spans.length === 0) return r;
  const [content, name, summary, ...tags] = segments.map((segment2, i) => maskRange(text, spans, starts[i], starts[i] + segment2.length));
  return { ...r, content, name, summary, tags };
}

// src/edits.ts
var lf = (text) => text.replace(/\r\n/g, "\n");
function applyEdits(content, edits) {
  let text = lf(content);
  for (const [index, edit] of edits.entries()) {
    const oldString = lf(edit.oldString);
    const newString = lf(edit.newString);
    const count = text.split(oldString).length - 1;
    if (count === 0) return { failure: "not-found", index, count };
    if (count > 1 && edit.replaceAll !== true) return { failure: "ambiguous", index, count };
    text = edit.replaceAll === true ? text.split(oldString).join(newString) : text.replace(oldString, () => newString);
  }
  return { content: text };
}

// src/gui/contract.ts
var GUI_VIEW_VERSION = 16;
var GUI_VIEW_DIR = ".state/gui";
var GUI_VIEW_FILES = {
  pending: "pending.json",
  health: "health.json",
  library: "library.json",
  deleted: "deleted.json"
};
function sessionViewFile(sessionId) {
  return `session-${encodeURIComponent(sessionId)}.json`;
}
var version = import_zod3.z.literal(GUI_VIEW_VERSION);
var generatedAt = import_zod3.z.number().optional();
var sourceModeSchema = memoryRecordSchema.shape.source.unwrap().shape.sourceMode;
var reviewedBySchema = memoryRecordSchema.shape.delegation.unwrap().shape.reviewed.unwrap().shape.by;
var ACCENTS = ["ella", "blue-whale"];
var MEMORY_PROMOTIONS = ["candidate", "kept-local"];
var memoryCardSchema = import_zod3.z.object({
  id: import_zod3.z.string(),
  name: import_zod3.z.string(),
  type: import_zod3.z.string(),
  scope: import_zod3.z.enum(["global", "workspace"]),
  workspacePath: import_zod3.z.string().optional(),
  summary: import_zod3.z.string(),
  content: import_zod3.z.string(),
  tags: import_zod3.z.array(import_zod3.z.string()),
  /** 缺省 = 手编 / 无出处。 */
  sourceMode: sourceModeSchema.optional(),
  sourceSessionId: import_zod3.z.string().optional(),
  createdAt: import_zod3.z.number(),
  updatedAt: import_zod3.z.number(),
  lastConfirmedAt: import_zod3.z.number(),
  validTo: import_zod3.z.number().optional(),
  /** 子 agent 写入的记忆：第几层子 agent 建的，谁升的档（缺省 = 待确认）。普通记忆不带。 */
  delegation: import_zod3.z.object({ depth: import_zod3.z.number().int().min(1), reviewed: reviewedBySchema.optional() }).optional(),
  /** 记忆文件的绝对路径。 */
  filePath: import_zod3.z.string(),
  /** 名称、摘要、正文的内容摘要（同文件里的 digest 算法）：直接改时连同 updatedAt 带回去，磁盘上对不上就是卡片加载后被改过。
   *  可缺省：对话卡从工具参数拼出来，没有它。 */
  digest: import_zod3.z.string().optional(),
  /** 四个面含高危密钥（只看高危，与界面遮盖同口径）：界面上的文字是遮盖后的，不给直接改、直接合并。 */
  hasSecret: import_zod3.z.literal(true).optional(),
  /** 提升为全局的状态（见 MEMORY_PROMOTIONS）。只在全部记忆视图里给：对话卡片和右侧栏「这次新写入的」据此就地提示。 */
  promotion: import_zod3.z.enum(MEMORY_PROMOTIONS).optional()
});
function mergeKeeperIndex(memories) {
  const [a, b] = memories;
  if (a.scope !== b.scope) return a.scope === "global" ? 0 : 1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 0 : 1;
  return a.id <= b.id ? 0 : 1;
}
var OVERFLOW_STEP = 0.25;
function relaxedTier(usedTokens, budget) {
  if (!(budget > 0) || usedTokens <= budget) return 0;
  return Math.ceil((usedTokens - budget) / OVERFLOW_STEP / budget);
}
function relaxedCap(budget, tier) {
  return Math.round(budget * (1 + OVERFLOW_STEP * tier));
}
var PENDING_LEVELS = ["must-fix", "your-call", "advice"];
var PENDING_LEVEL_OF_KIND = {
  "secret": "must-fix",
  "unreadable-file": "must-fix",
  "conflict-horizontal": "your-call",
  "conflict-vertical": "your-call",
  "promote-candidate": "your-call",
  "overflow": "your-call",
  "advice": "advice"
};
var ADVICE_TYPES = ["expired", "bloat", "redundancy", "orphan", "misplaced", "unclear", "stale"];
var MODEL_EDIT_ADVICE_TYPES = ["bloat", "redundancy", "unclear"];
function isAwaitingDecision(item) {
  return item.kind === "secret" || item.level === "your-call";
}
var levelOf = (kind) => import_zod3.z.literal(PENDING_LEVEL_OF_KIND[kind]);
var proposalOpSchema = import_zod3.z.discriminatedUnion("kind", [
  import_zod3.z.object({ kind: import_zod3.z.literal("edit"), memoryId: import_zod3.z.string(), content: import_zod3.z.string(), name: import_zod3.z.string(), summary: import_zod3.z.string(), tags: import_zod3.z.array(import_zod3.z.string()) }),
  import_zod3.z.object({ kind: import_zod3.z.literal("forget"), memoryId: import_zod3.z.string() }),
  import_zod3.z.object({ kind: import_zod3.z.literal("keep"), memoryId: import_zod3.z.string() })
]);
var suggestionSchema = import_zod3.z.object({
  id: import_zod3.z.string(),
  action: import_zod3.z.enum(PROPOSAL_ACTIONS),
  reason: import_zod3.z.string(),
  ops: import_zod3.z.array(proposalOpSchema),
  isSourced: import_zod3.z.boolean(),
  baselineWorkspace: import_zod3.z.string().optional()
});
var proposalBasisSchema = import_zod3.z.object({
  conflictFingerprint: import_zod3.z.string().optional(),
  memories: import_zod3.z.array(import_zod3.z.object({ memoryId: import_zod3.z.string(), fingerprint: import_zod3.z.string(), scopeKey: import_zod3.z.string().optional() })),
  /** 垂直冲突：生成时用的指令文件所属和基线指纹，应用时按这条记忆此刻对应的指令文件核对指纹。 */
  baseline: import_zod3.z.object({ workspace: import_zod3.z.string(), fingerprint: import_zod3.z.string() }).optional()
});
var requestedProposalSchema = import_zod3.z.object({
  action: import_zod3.z.enum(PROPOSAL_ACTIONS),
  reason: import_zod3.z.string(),
  ops: import_zod3.z.array(proposalOpSchema),
  basis: proposalBasisSchema
});
var suggestionFailureCauseSchema = import_zod3.z.object({
  kind: import_zod3.z.enum(SUGGESTION_FAILURE_KINDS).exclude(["undecided", "quota-exhausted", "no-baseline"]),
  hostCode: import_zod3.z.string().optional(),
  message: import_zod3.z.string().optional()
});
var NO_SUGGESTION_CODES = ["has-secret", "not-generated", "failed", "undecided", "quota-exhausted", "no-baseline"];
var noSuggestionSchema = import_zod3.z.object({ code: import_zod3.z.enum(NO_SUGGESTION_CODES), cause: suggestionFailureCauseSchema.optional(), reason: import_zod3.z.string().optional() });
var pendingItemSchema = import_zod3.z.discriminatedUnion("kind", [
  import_zod3.z.object({ kind: import_zod3.z.literal("secret"), level: levelOf("secret"), memory: memoryCardSchema }),
  import_zod3.z.object({
    kind: import_zod3.z.literal("conflict-horizontal"),
    level: levelOf("conflict-horizontal"),
    decisionId: import_zod3.z.string(),
    firstSeenAt: import_zod3.z.number(),
    summary: import_zod3.z.string(),
    left: memoryCardSchema.nullable(),
    right: memoryCardSchema.nullable(),
    /** 决定前 agent 按哪条来：快照注入的排序（confidence 降序 → lastConfirmedAt 降序）排在前的一方；两方都找不到时缺省。 */
    preferredId: import_zod3.z.string().optional(),
    /** 处理建议：依据版本和此刻对得上才有。和 noSuggestion 恰好有一个；一方定位不到时两个都缺省。 */
    suggestion: suggestionSchema.optional(),
    /** 没有处理建议的原因。 */
    noSuggestion: noSuggestionSchema.optional(),
    /** 体检之后正在给它生成建议（排队或生成中）：写视图的那个进程的进程内状态，别的进程写的视图里没有。和 noSuggestion 并存。 */
    isGeneratingSuggestion: import_zod3.z.literal(true).optional()
  }),
  import_zod3.z.object({
    kind: import_zod3.z.literal("conflict-vertical"),
    level: levelOf("conflict-vertical"),
    decisionId: import_zod3.z.string(),
    firstSeenAt: import_zod3.z.number(),
    summary: import_zod3.z.string(),
    memory: memoryCardSchema.nullable(),
    baselineRef: import_zod3.z.string(),
    /** 处理建议（同横向；视图只核对记忆那一半，基线那一半采纳时核对）。和 noSuggestion 恰好有一个；记忆定位不到时两个都缺省。 */
    suggestion: suggestionSchema.optional(),
    noSuggestion: noSuggestionSchema.optional(),
    isGeneratingSuggestion: import_zod3.z.literal(true).optional()
  }),
  import_zod3.z.object({
    kind: import_zod3.z.literal("promote-candidate"),
    level: levelOf("promote-candidate"),
    decisionId: import_zod3.z.string(),
    firstSeenAt: import_zod3.z.number(),
    memory: memoryCardSchema.nullable()
  }),
  /** 超出上限：relax 第 tier 档（放宽到上限 × (1 + 0.25 × tier)）；strict 用到 95%（tier 为 0）。workspacePath 缺省 = 无项目的会话。 */
  import_zod3.z.object({
    kind: import_zod3.z.literal("overflow"),
    level: levelOf("overflow"),
    decisionId: import_zod3.z.string(),
    firstSeenAt: import_zod3.z.number(),
    mode: import_zod3.z.enum(OVERFLOW_MODES),
    tier: import_zod3.z.number().int().nonnegative(),
    workspacePath: import_zod3.z.string().optional()
  }),
  import_zod3.z.object({
    kind: import_zod3.z.literal("unreadable-file"),
    level: levelOf("unreadable-file"),
    layer: scopeSchema,
    filePath: import_zod3.z.string(),
    relativePath: import_zod3.z.string(),
    /** 解析器原话。 */
    error: import_zod3.z.string()
  }),
  /**
   * 建议整理：每次生成视图时现算，不入账本。身份 = type + 涉及的记忆 id（memories 的 id，成对的按 id 排序）。
   * redundancy 一般是两条（互相重复）；只有一条时是和指令文件（AGENTS.md 等）重复。其余类型每项一条记忆。
   */
  import_zod3.z.object({
    kind: import_zod3.z.literal("advice"),
    level: levelOf("advice"),
    type: import_zod3.z.enum(ADVICE_TYPES),
    memories: import_zod3.z.array(memoryCardSchema).min(1)
  })
]);
function pendingItemKey(item) {
  switch (item.kind) {
    case "secret":
      return `secret:${item.memory.scope}:${item.memory.workspacePath ?? ""}:${item.memory.id}`;
    case "unreadable-file":
      return `unreadable-file:${item.filePath}`;
    case "advice":
      return `advice:${item.type}:${item.memories.map((m) => m.id).sort().join(",")}`;
    default:
      return `decision:${item.decisionId}`;
  }
}
function pendingItemScopes(item) {
  const scopes = (() => {
    switch (item.kind) {
      case "unreadable-file":
        return [item.layer];
      case "overflow":
        return [item.workspacePath === void 0 ? { kind: "global" } : { kind: "workspace", workspacePath: item.workspacePath }];
      case "conflict-horizontal":
        return [item.left, item.right].map((m) => m === null ? void 0 : scopeOfMemory(m));
      case "advice":
        return item.memories.map(scopeOfMemory);
      default:
        return [item.memory === null ? void 0 : scopeOfMemory(item.memory)];
    }
  })();
  const out = [];
  for (const scope of scopes) if (scope !== void 0 && !out.some((s) => sameScope(s, scope))) out.push(scope);
  return out;
}
var PENDING_DOTS = ["none", "amber", "red"];
var pendingViewSchema = import_zod3.z.object({
  version,
  generatedAt,
  dot: import_zod3.z.enum(PENDING_DOTS),
  items: import_zod3.z.array(pendingItemSchema),
  /** 各级的条数（每一级都有，没有为 0）。 */
  levelCounts: import_zod3.z.record(import_zod3.z.enum(PENDING_LEVELS), import_zod3.z.number().int().nonnegative()),
  /** 类型 id → 显示名（注册表的 label），供记忆卡元信息；认不出的类型显示 id。 */
  typeLabels: import_zod3.z.record(import_zod3.z.string(), import_zod3.z.string())
});
var CONFLICT_ACTION_VERDICTS = {
  horizontal: { keepA: "keep-left", keepB: "keep-right", keepBoth: "keep-both" },
  vertical: { keepBaseline: "keep-right", keepMemory: "keep-left" }
};
var RESOLVE_VERDICTS = ["keep-left", "keep-right", "keep-both"];
var deductionSchema = import_zod3.z.object({ points: import_zod3.z.number().nonnegative(), types: import_zod3.z.array(import_zod3.z.string()) });
var healthScopeSchema = import_zod3.z.object({
  layer: scopeSchema,
  totalMemories: import_zod3.z.number().int().nonnegative(),
  /** 有密钥时该作用域不打分：null。 */
  score: import_zod3.z.number().nullable(),
  tier: import_zod3.z.enum(["green", "amber", "red"]),
  gate: import_zod3.z.object({ secret: import_zod3.z.boolean() }),
  /** 非零的扣分原因计数（规则检查实时 + 内容检查取上次体检），type 取值见 governance/schema.ts FINDING_TYPES，按其顺序。 */
  issues: import_zod3.z.array(import_zod3.z.object({ type: import_zod3.z.string(), count: import_zod3.z.number().int().positive() })),
  /**
   * 上次体检：本作用域最近一次体检完成记录的完成时间（规则检查和内容检查都写完才算）；还没有完成记录（升级前体检过）时
   * 暂取内容检查缓存的时间；从没体检过为 null。
   */
  lastCheckupAt: import_zod3.z.number().nullable(),
  /**
   * 本作用域被用户忽略、没有计分的建议（issues 里已不含它们），按问题类型、再按第一条记忆名排；条数即长度。
   * memories 是涉及的记忆（内容重复两条，按 id 排序），名称与摘要已遮盖密钥；取消忽略按 type + 这些 id 发 unignore-advice。
   */
  ignored: import_zod3.z.array(import_zod3.z.object({
    type: import_zod3.z.enum(IGNORABLE_ADVICE_TYPES),
    memories: import_zod3.z.array(import_zod3.z.object({ id: import_zod3.z.string(), name: import_zod3.z.string(), summary: import_zod3.z.string() })).min(1)
  })),
  /**
   * 扣分来源：评分模块分开算好的三项扣分（规则检查、内容检查、新鲜度，保留两位小数；评分公式不变，没有密钥时 100 减三项即分数），
   * 以及各项里此刻有的问题类型：规则检查、内容检查的取值见 governance/schema.ts FINDING_TYPES，按其顺序；新鲜度是 stale。
   * 密钥不扣分（走红线门），不在这里。
   */
  deductions: import_zod3.z.object({ rule: deductionSchema, content: deductionSchema, freshness: deductionSchema })
});
var healthViewSchema = import_zod3.z.object({
  version,
  generatedAt,
  /** 体检开关（governance.enabled）：关闭时界面置灰健康内容、「体检当前项目」不可用。 */
  governanceEnabled: import_zod3.z.boolean(),
  /** 插件本次加载的时刻（epoch ms）：会话快照的 frozenAt 早于它就是「重启后未重新带入」；浏览器半侧拿不到宿主进程时间，从这里读。 */
  bootedAt: import_zod3.z.number().optional(),
  layers: import_zod3.z.array(healthScopeSchema)
});
var directoryIssueSchema = import_zod3.z.object({
  code: import_zod3.z.enum(DIRECTORY_NOTE_CODES),
  /** 涉及的文件或目录的绝对路径。 */
  path: import_zod3.z.string(),
  /** reserved-keys：被忽略的键。 */
  keys: import_zod3.z.array(import_zod3.z.string()).optional(),
  /** duplicate-id：读取时用的那份（path 是没用上的副本）。 */
  keptPath: import_zod3.z.string().optional()
});
var MODEL_CHANGE_STATES = ["undoable", "changed", "undone"];
var modelChangeSchema = import_zod3.z.object({
  decisionId: import_zod3.z.string(),
  kind: import_zod3.z.enum(MODEL_CHANGE_KINDS),
  /** 改写：被改写的那条；替代：被替代的旧记忆。 */
  memoryId: import_zod3.z.string(),
  /** 替代：替代它的那条。 */
  by: import_zod3.z.string().optional(),
  /** 改前的那份（快照里的），文字已遮盖密钥。 */
  before: memoryCardSchema,
  sessionId: import_zod3.z.string(),
  callId: import_zod3.z.string(),
  at: import_zod3.z.number(),
  state: import_zod3.z.enum(MODEL_CHANGE_STATES)
});
var libraryViewSchema = import_zod3.z.object({
  version,
  generatedAt,
  /** 存储目录（绝对路径）。 */
  memoryRoot: import_zod3.z.string(),
  /** global 在前，项目按路径排序；每个作用域只列 active 记忆，按 name 再 id 排序。 */
  layers: import_zod3.z.array(import_zod3.z.object({ layer: scopeSchema, items: import_zod3.z.array(memoryCardSchema) })),
  /** 目录问题：同 id 多份副本、被忽略的字段、缺标记 / 不可读目录。 */
  directoryIssues: import_zod3.z.array(directoryIssueSchema),
  /**
   * 判「彻底删除」的正面信号（对话卡用）：这次收集读到、但不在用的记忆 id（已取代、已删，含超出保留期还没清掉的），
   * 和有没有读不全的地方（读不出的文件、缺标记或不可读的目录，里面可能有任何 id）。一条记忆不在全部记忆、最近删除、
   * inactiveIds 里，且没有读不全的地方，才算从磁盘上没了。可缺省：升级前写的视图文件没有，缺省时不判彻底删除。
   */
  inactiveIds: import_zod3.z.array(import_zod3.z.string()).optional(),
  hasUnreadFiles: import_zod3.z.boolean().optional(),
  /** 类型 id → 显示名（同待处理视图的 typeLabels），覆盖注册表与本视图出现的类型。可缺省：升级前写的视图文件没有，下次写视图补上。 */
  typeLabels: import_zod3.z.record(import_zod3.z.string(), import_zod3.z.string()).optional(),
  /**
   * 记忆查看里类型组的顺序：当前场景的类型按注册表顺序在前，本视图出现的其他类型（退役、切场景前的、认不出的）按 id 在后。
   * 可缺省，理由同上；缺省时按显示名排。
   */
  typeOrder: import_zod3.z.array(import_zod3.z.string()).optional(),
  /**
   * 保留窗口内模型改写、替代已有记忆的改动，按时间先后。改前快照已清（过了 14 天、彻底删除）的不列：
   * 对话卡对不上自己那次调用时，按调用时刻判断是不是已超过保留窗口。可缺省，理由同上。
   */
  modelChanges: import_zod3.z.array(modelChangeSchema).optional()
});
var deletedItemSchema = import_zod3.z.object({
  memory: memoryCardSchema,
  deletedAt: import_zod3.z.number(),
  /** 到这个时刻被物理清掉，之后不可恢复。 */
  purgeAt: import_zod3.z.number(),
  /**
   * 裁决时删掉的：哪条冲突、什么裁决、对方是谁（横向为对方记忆 id，垂直为基线出处）。plan-applied 是融合时并入了另一条，
   * 对方是写进融合稿的那条；恢复它只恢复这一条，融合稿不退回，这次融合随之不能整条撤销（结果不带 decisionId）。
   */
  cause: import_zod3.z.object({
    decisionId: import_zod3.z.string(),
    verdict: import_zod3.z.enum(["keep-left", "keep-right", "plan-applied"]),
    counterpartId: import_zod3.z.string().optional(),
    baselineRef: import_zod3.z.string().optional(),
    snapshotId: import_zod3.z.string().optional()
  }).optional()
});
var deletedViewSchema = import_zod3.z.object({
  version,
  generatedAt,
  items: import_zod3.z.array(deletedItemSchema),
  /** 类型 id → 显示名（同全部记忆视图的 typeLabels），另含裁决对方的类型。可缺省，理由同上。 */
  typeLabels: import_zod3.z.record(import_zod3.z.string(), import_zod3.z.string()).optional()
});
var SNAPSHOT_ORIGINS = ["start", "resumed", "compacted", "refreshed"];
var sessionViewSchema = import_zod3.z.object({
  version,
  sessionId: import_zod3.z.string(),
  workspacePath: import_zod3.z.string().optional(),
  /** 快照冻结时刻；早于宿主启动时间说明重启后还没重新带入。 */
  frozenAt: import_zod3.z.number(),
  origin: import_zod3.z.enum(SNAPSHOT_ORIGINS),
  /** 最近一次成功压缩结束的时刻（宿主事件时间）；origin 为 compacted 时才有。 */
  compactedAt: import_zod3.z.number().optional(),
  budget: import_zod3.z.number().nonnegative(),
  overflowMode: import_zod3.z.enum(OVERFLOW_MODES),
  /** 三段之和即总用量：本项目、全局、固定说明（标题、附注、导航图、固定尾注）。 */
  tokens: import_zod3.z.object({ workspace: import_zod3.z.number(), global: import_zod3.z.number(), fixed: import_zod3.z.number() }),
  /** 计入上限的部分（附注、固定尾注与导航图不计）：relax 下超过 budget 即已放宽，strict 下不超过 budget。 */
  usedTokens: import_zod3.z.number().int().nonnegative(),
  injectedIds: import_zod3.z.array(import_zod3.z.string()),
  /** injectedIds 里带入全文的（core 区）；其余只带了索引行。 */
  coreIds: import_zod3.z.array(import_zod3.z.string()),
  /** injectedIds 里索引行只带名称和标签、不带摘要的（passive 类型）；不在这两组里的是带摘要的索引行。 */
  titleOnlyIds: import_zod3.z.array(import_zod3.z.string()),
  /** 没带入的条数（只有 strict 会截）：「已到上限，N 条没带入」。 */
  omittedCount: import_zod3.z.number().int().nonnegative(),
  /** 这次对话新记的（按写入先后）。冻结晚于写入的会同时出现在 injectedIds 里：界面只列在带入的记忆。 */
  savedIds: import_zod3.z.array(import_zod3.z.string())
});
var GUI_WORKSPACE_MAP_FILE = "workspaces.json";
var workspaceMapViewSchema = import_zod3.z.object({
  version,
  cwds: import_zod3.z.record(import_zod3.z.string(), import_zod3.z.string())
});
var SCOPE_KEYS = { all: "all" };
var scopeOrAllSchema = import_zod3.z.discriminatedUnion("kind", [import_zod3.z.object({ kind: import_zod3.z.literal("all") }), ...scopeSchema.options]);
function checkupKey(scope) {
  return scope.kind === "all" ? SCOPE_KEYS.all : scopeKey(scope);
}
var AUTO_CHECKUP_MAX_DAYS = 90;
var autoCheckupFrequencySchema = import_zod3.z.union([import_zod3.z.literal("manual"), import_zod3.z.number().int().min(1).max(AUTO_CHECKUP_MAX_DAYS)]);
var AUTO_CHECKUP_FOLLOW = "follow";
function resolveAutoCheckup(settings, scope) {
  const fallback = settings.get(SCOPE_KEYS.all) ?? "manual";
  if (scope.kind === "all") return { frequency: fallback, isOwn: false };
  const own = settings.get(checkupKey(scope));
  return own === void 0 ? { frequency: fallback, isOwn: false } : { frequency: own, isOwn: true };
}
var checkupCauseSchema = import_zod3.z.object({
  kind: import_zod3.z.enum(CHECKUP_CAUSE_KINDS),
  hostCode: import_zod3.z.string().optional(),
  message: import_zod3.z.string().optional()
});
var checkupAddedSchema = import_zod3.z.object({
  keys: import_zod3.z.array(import_zod3.z.string()),
  pending: import_zod3.z.number().int().nonnegative(),
  advice: import_zod3.z.number().int().nonnegative()
});
var checkupResultSchema = import_zod3.z.object({
  /** 体检标识：同一次体检写的各条结果相同。 */
  checkupId: import_zod3.z.string(),
  by: import_zod3.z.enum(CHECKUP_INITIATORS).exclude(["agent"]),
  /** 体检做完（写结果）的时刻。 */
  completedAt: import_zod3.z.number(),
  added: checkupAddedSchema,
  globalAdded: checkupAddedSchema.optional(),
  byScope: import_zod3.z.array(import_zod3.z.object({ scope: scopeSchema, keys: import_zod3.z.array(import_zod3.z.string()) })).optional(),
  /** 宿主流 usage 块报的实际用量合计（同 scan 命令的 usageTokens）；宿主一次都没报时缺省。自动体检不经过会话，用量由插件自己记在这里。 */
  usageTokens: import_zod3.z.number().int().nonnegative().optional(),
  /**
   * 说明码（如内容检查没做完 semantic-failed、分了批 semantic-batched、指令文件取不到 baseline-missing），semantic-failed、model-unavailable 带原因。
   * 结果落盘在体检记录里：不再产生的旧说明码（RETIRED_SCAN_NOTE_CODES）读的时候丢掉，整条记录照常解析。
   */
  notes: import_zod3.z.preprocess(
    (notes) => Array.isArray(notes) ? notes.filter((n) => !RETIRED_SCAN_NOTE_CODES.includes(n?.code)) : notes,
    import_zod3.z.array(import_zod3.z.object({ code: import_zod3.z.enum(SCAN_NOTE_CODES), cause: checkupCauseSchema.optional() }))
  )
});
var GUI_CHECKUP_VIEW_FILE = "checkups.json";
var checkupViewSchema = import_zod3.z.object({
  version,
  generatedAt,
  /** 体检开关（本进程的配置，几个进程不一致时以后写的为准）：关着时自动体检不跑。 */
  governanceEnabled: import_zod3.z.boolean(),
  /** 「全部」的频率，即默认值；没设过为 manual（仅手动）。 */
  defaultFrequency: autoCheckupFrequencySchema,
  /** 「全部」手动体检的最近一次结果（体检记录表键 all 的那条）；没做过为 null。 */
  allResult: checkupResultSchema.nullable(),
  /** 全局在前，项目按路径排序：目录里的全部项目，含没有活跃记忆的（它们的设置和上次体检照样给界面看）。 */
  scopes: import_zod3.z.array(import_zod3.z.object({
    scope: scopeSchema,
    /**
     * 可体检：全局总是，项目要有活跃记忆（同健康视图、memory_health 的体检清单）。
     * 不可体检的不到期、没有下次时间，旧的失败和「模型用不了」也不写（不会再试）；「全部」体检不查它。
     */
    isCheckable: import_zod3.z.boolean(),
    /** 有效频率（见 resolveAutoCheckup）。 */
    frequency: autoCheckupFrequencySchema,
    /** 单独设置；false = 跟随「全部」。 */
    isOwn: import_zod3.z.boolean(),
    /** 上次体检：最近一次体检完成记录的完成时间（升级前体检过、还没有完成记录的取内容检查缓存的时间）；从没体检过为 null。 */
    lastCheckupAt: import_zod3.z.number().nullable(),
    /** 下次自动体检：上次体检加有效频率的天数；仅手动、从没体检过为 null。 */
    nextCheckupAt: import_zod3.z.number().nullable(),
    /** 已到期：有效频率不是仅手动，且从没体检过或已到下次自动体检的时间。 */
    isDue: import_zod3.z.boolean(),
    /** 进行中：有体检（任一进程的手动或自动体检）认领着这个范围、认领没过期。agent 的 memory_scan 不认领，不算。 */
    isInProgress: import_zod3.z.boolean(),
    /**
     * 自动体检连续没做完（模型调用出错、输出解析不了、体检出错）：次数、下次重试时间、最近一次的原因。
     * 没到上限时 1 小时后再试；到了上限（isRetryLimitReached）等到下一个周期。到期了但还没到重试时间的不跑。
     * 这个范围做完一次体检（手动、自动、agent）就清掉；没有为 null。
     */
    failure: import_zod3.z.object({
      count: import_zod3.z.number().int().positive(),
      retryAt: import_zod3.z.number(),
      isRetryLimitReached: import_zod3.z.boolean(),
      cause: checkupCauseSchema
    }).nullable(),
    /** 最近一次自动体检的尝试是「模型用不了」（宿主没有默认模型、未登录、缺凭据）：原因；不是为 null。不算失败，下一次调度检查再试。 */
    modelUnavailable: checkupCauseSchema.nullable(),
    /** 这个范围最近一次界面手动或自动体检的结果（「全部」体检也给每个被查的范围写一条）；没有为 null。 */
    lastResult: checkupResultSchema.nullable()
  }))
});
var allowCrossWorkspace = import_zod3.z.boolean().optional();
var typeNameSchema = import_zod3.z.string().regex(/^[a-z]+(?:-[a-z]+)*$/);
var targetScope = scopeSchema.optional();
var memoryBaseSchema = import_zod3.z.object({ updatedAt: import_zod3.z.number(), digest: import_zod3.z.string() });
var mergeRefSchema = import_zod3.z.object({ memoryId: import_zod3.z.string(), layer: targetScope, base: memoryBaseSchema });
var MAX_BATCH_EDIT = 20;
var draftRefSchema = import_zod3.z.object({ memoryId: import_zod3.z.string(), layer: targetScope });
var memoryDraftSchema = import_zod3.z.object({
  content: import_zod3.z.string().min(1),
  summary: import_zod3.z.string(),
  name: import_zod3.z.string().min(1).optional(),
  tags: import_zod3.z.array(import_zod3.z.string()).optional()
});
var planQuestionSchema = import_zod3.z.object({ text: import_zod3.z.string(), placeholder: import_zod3.z.string() });
var planNoteSchema = import_zod3.z.object({ reason: import_zod3.z.string(), question: planQuestionSchema.optional(), answer: import_zod3.z.string().optional() });
var PLAN_ACTIONS = ["rewrite", "delete", "keep"];
var editPlanSchema = import_zod3.z.object({
  understanding: import_zod3.z.string(),
  ops: import_zod3.z.array(import_zod3.z.object({
    memoryId: import_zod3.z.string(),
    action: import_zod3.z.enum(PLAN_ACTIONS),
    reason: import_zod3.z.string(),
    into: import_zod3.z.string().optional(),
    question: planQuestionSchema.optional()
  }))
});
var draftPlanOpSchema = import_zod3.z.object({
  memoryId: import_zod3.z.string(),
  reason: import_zod3.z.string(),
  question: planQuestionSchema.optional(),
  answer: import_zod3.z.string().optional(),
  absorbs: import_zod3.z.array(import_zod3.z.string()).optional()
});
var applyEditOpSchema = import_zod3.z.discriminatedUnion("kind", [
  mergeRefSchema.extend({ kind: import_zod3.z.literal("edit"), content: import_zod3.z.string().min(1), name: import_zod3.z.string().min(1), summary: import_zod3.z.string(), tags: import_zod3.z.array(import_zod3.z.string()) }),
  mergeRefSchema.extend({ kind: import_zod3.z.literal("forget"), into: import_zod3.z.string().optional() })
]);
var editFields = {
  content: import_zod3.z.string().min(1),
  name: import_zod3.z.string().min(1),
  summary: import_zod3.z.string(),
  tags: import_zod3.z.array(import_zod3.z.string()),
  force: import_zod3.z.boolean().optional(),
  allowCrossWorkspace
};
var MEMORY_COMMAND_NAME = "memory";
var MEMORY_RPC_CHANNEL = "/plastic-memory";
var MEMORY_RPC_RUN = "run";
var MEMORY_RPC_PING = "ping";
var memoryCommandSchema = import_zod3.z.discriminatedUnion("cmd", [
  import_zod3.z.object({ cmd: import_zod3.z.literal("info") }),
  import_zod3.z.object({ cmd: import_zod3.z.literal("resolve"), decisionId: import_zod3.z.string(), verdict: import_zod3.z.enum(RESOLVE_VERDICTS), allowCrossWorkspace }),
  /**
   * 「采纳建议」：按条目上 id 为 suggestionId 的处理建议落盘，界面不回传建议内容。收横向、垂直冲突。保留 A、保留 B、都保留
   * 记法同 resolve 的 keep-left / keep-right / keep-both（另记依据和结论代码），撤销、最近删除、败方含高危密钥时的物理删除都同 resolve。
   * 融合：保留方改写成融合稿、另一条进最近删除，整批一份快照，条目结清为 plan-applied，结果的 memoryIds 是保留方、被并入的；
   * 撤销按回执把两条都恢复、冲突回到待处理；从最近删除恢复被并入的那条只恢复它。某一项没写成时同 apply-edits：已写的条件退回，
   * 没退干净的回 isPartial（没退回、仍是这次写下的另记一笔可撤销的账，decisionId 是那一笔），冲突条目不结清。
   * 服务端认领条目后核对：建议 id 一致、依据版本（冲突指纹、每条的完整内容指纹和作用域键）仍是此刻的，对不上回 stale，什么都不动；
   * 写入时锁内按依据再比一次。条目不在待处理回 not-found；不是冲突回 invalid-args。过跨项目门（同 resolve）。
   * 垂直冲突：删除这条记法同 resolve 的 keep-right，都保留同 keep-both；改写这条记忆同融合（条目结清为 plan-applied，回执只有改写一项、没有败方，
   * 撤销后记忆恢复、冲突回到待处理）。另按这条记忆此刻对应的指令文件核对依据里的基线指纹，拿不到或指令文件改过回 stale；在哪个会话里采纳都一样。指令文件不改。
   * 依据是要求时（补充要求）带 proposal（draft-proposal 回的方案，依据版本原样带回）代替 suggestionId：落盘、撤销、核对同上，结清时记来源 request；
   * 操作和结论对不上（每条恰好一项、按条目顺序，融合的改写项在合并规则选的保留方上）回 invalid-args；
   * 改写稿含高危密钥回 secret-critical，含疑似密钥回 secret-suspected，用户确认后带 force 重发（采纳建议不再确认，force 不看）。
   */
  import_zod3.z.object({
    cmd: import_zod3.z.literal("apply-proposal"),
    decisionId: import_zod3.z.string(),
    suggestionId: import_zod3.z.string().optional(),
    proposal: requestedProposalSchema.optional(),
    force: import_zod3.z.boolean().optional(),
    allowCrossWorkspace
  }).refine((c) => c.suggestionId === void 0 !== (c.proposal === void 0), { message: "suggestionId \u4E0E proposal \u6070\u597D\u7ED9\u4E00\u4E2A" }),
  /** 撤销一条已裁决条目：去掉 settled，记了快照的按它恢复败方（提升为全局则恢复原位）；直接改、移到项目的撤销后条目移出账本；
   *  模型改写、替代（全部记忆视图的 modelChanges）按改前快照恢复，撤销后条目标已撤销留着。
   *  六类撤销遇到目标之后又被改过（或已不在原处）一律回 stale、条目留着；合并的撤销不会只恢复一半：要么都不动，要么写回的那条中途被第三方改过、停在第三方的版本。 */
  import_zod3.z.object({ cmd: import_zod3.z.literal("undo"), decisionId: import_zod3.z.string(), allowCrossWorkspace }),
  import_zod3.z.object({ cmd: import_zod3.z.literal("promote"), decisionId: import_zod3.z.string(), target: import_zod3.z.enum(["global", "agents-md"]), allowCrossWorkspace }),
  import_zod3.z.object({ cmd: import_zod3.z.literal("keep-local"), decisionId: import_zod3.z.string(), allowCrossWorkspace }),
  /**
   * 按记忆 id 把一条项目记忆提升为全局（建议整理「放错层」）。同 promote：快照先行，在账本里留一条已结清的提升
   * （记忆已是提升候选时就结清那一条），结果的 decisionId 交给 undo 撤销。isCandidateRequired：就地提升（对话卡片、右侧栏
   * 「这次新写入的」）只认此刻仍是提升候选的那一份，别处已「留在本项目」的回 not-found。target 同 promote，缺省 global：
   * agents-md 写进 AGENTS.md、项目里那条软删，插件不再管理它，不留账、不可撤销（结果不带 decisionId）。
   */
  import_zod3.z.object({
    cmd: import_zod3.z.literal("promote-memory"),
    memoryId: import_zod3.z.string(),
    layer: targetScope,
    isCandidateRequired: import_zod3.z.boolean().optional(),
    target: import_zod3.z.enum(["global", "agents-md"]).optional(),
    allowCrossWorkspace
  }),
  /**
   * 按记忆 id 把一条提升候选留在本项目（对话卡片、右侧栏「这次新写入的」）。同 keep-local：清掉候选标记，在账本里留一条
   * 已结清的 keep-local（记忆已在等你决定里时就结清那一条），以后体检不再提。不是候选（已提升、已留下、已删）回 not-found。
   */
  import_zod3.z.object({ cmd: import_zod3.z.literal("keep-local-memory"), memoryId: import_zod3.z.string(), layer: targetScope, allowCrossWorkspace }),
  /**
   * 把一条全局记忆移到 workspacePath 那个项目（建议整理「放错层」里全局那条，与 promote-memory 对称）：只认全局那一份，
   * 内容、id、出处、时间戳不动，全局那份不再存在。目标项目已有同 id 的记忆（在用的或最近删除里的）回 target-taken，什么都不动。
   * 跨项目门按目标项目判。快照先行，在账本里留一条已结清的移动，结果的 decisionId 交给 undo 撤销（搬回全局）。
   */
  import_zod3.z.object({ cmd: import_zod3.z.literal("move-memory"), memoryId: import_zod3.z.string(), workspacePath: import_zod3.z.string(), allowCrossWorkspace }),
  import_zod3.z.object({ cmd: import_zod3.z.literal("forget"), memoryId: import_zod3.z.string(), layer: targetScope, allowCrossWorkspace }),
  /** 从最近删除恢复一条记忆：它是某次裁决删掉的、那次裁决还能撤销时，等同撤销那次裁决（错误码与 undo 一致）；否则按快照或归档恢复。 */
  import_zod3.z.object({ cmd: import_zod3.z.literal("restore"), memoryId: import_zod3.z.string(), layer: targetScope, allowCrossWorkspace }),
  /** 彻底删除：在用的只收含密钥的；最近删除里的不等 14 天到期，连同快照里的副本现在就清掉。 */
  import_zod3.z.object({ cmd: import_zod3.z.literal("hard-delete"), memoryId: import_zod3.z.string(), layer: targetScope, allowCrossWorkspace }),
  /** 刷新一条记忆的确认时间（建议整理「很久没确认」的「仍然有效」），内容不动。不受体检开关影响。 */
  import_zod3.z.object({ cmd: import_zod3.z.literal("confirm"), memoryId: import_zod3.z.string(), layer: targetScope, allowCrossWorkspace }),
  /**
   * 建议整理的「直接改」：正文、名称、摘要、标签换成给定值，updatedAt、lastConfirmedAt 记为当前时间；
   * 类型、作用域、出处、有效期、置信度、取代关系、召回统计不动。base 是卡片加载时的版本，磁盘上对不上回 stale，什么都不动。
   * 新内容含高危密钥回 secret-critical；疑似密钥回 secret-suspected，用户确认后带 force 重发。快照先行（项目记忆也拍），
   * 在账本里留一条已结清的条目，结果的 decisionId 交给 undo 撤销。
   */
  import_zod3.z.object({ cmd: import_zod3.z.literal("edit-memory"), memoryId: import_zod3.z.string(), layer: targetScope, base: memoryBaseSchema, ...editFields }),
  /**
   * 内容重复的「直接合并」：两条里按 mergeKeeperIndex 保留一条，按 edit-memory 的规则改成给定内容；另一条软删进最近删除。
   * 两条同拍一份快照，undo 把两条都恢复。
   */
  import_zod3.z.object({ cmd: import_zod3.z.literal("merge-memories"), memories: import_zod3.z.tuple([mergeRefSchema, mergeRefSchema]), ...editFields }),
  /** 借来的会话用哪个模型（「让模型改」的按钮与提示）：拿不到回 llm-unavailable；拿到了但不知道名字时 model 缺省。只读。 */
  import_zod3.z.object({ cmd: import_zod3.z.literal("model-info") }),
  /**
   * 「补上建议」：给一条未决的冲突生成处理建议，写到账本条目上（视图随后带出）。单次调用借来的会话的模型，不重新扫描、不写记忆。
   * 条目已有依据版本对得上的建议时直接回成功、不调用模型。条目不在待处理回 not-found；不是冲突回 invalid-args；
   * 垂直冲突按这条记忆对应的指令文件生成（项目记忆是它所在项目的，全局记忆是全局层的），取不到或不存在回 no-baseline，不调用模型、不记在条目上；
   * 一方已不在用回 not-found（带 memoryIds）；任一条含高危密钥回 has-secret，原文不发给模型。
   * 模型报错回 llm-failed（detail 已脱敏，鉴权错误只给错误码），输出不合格式、稿里带进了原文没有的密钥回 llm-invalid-output，
   * 两者都记在条目上，视图里是「生成失败」。模型判断不了哪条对时回成功（模型正常答了），记在条目上，视图里是 undecided。
   * 生成期间两条被改过回 stale；条目正被别处认领回 claimed，这一份丢弃。
   */
  import_zod3.z.object({ cmd: import_zod3.z.literal("suggest"), decisionId: import_zod3.z.string() }),
  /**
   * 「补充要求」的生成：给一条未决的冲突（横向两条，或垂直一条记忆和它对应的指令文件），按用户的要求单次调用借来的会话的模型，回一份处理方案（结果的 proposal，带依据版本）
   * 或做不到（结果的 infeasible，只有一句说明）。只读：不写记忆、不入账本，模型调用不在认领里。同 suggest 回查出处。
   * bases 是涉及记忆的卡片版本（条目记忆的顺序，横向两条、垂直一条；条数对不上回 invalid-args），对不上回 stale；生成期间被改过也回 stale，这一份丢弃。
   * 垂直冲突的指令文件同 suggest，取不到或不存在回 no-baseline。
   * priorRequests：此前每一轮的要求，按先后排列；previous：上一份方案，只作参照、不是事实来源。
   * 条目不在待处理回 not-found；不是横向冲突回 invalid-args；一方已不在用回 not-found（带 memoryIds）；任一条含高危密钥回 has-secret；
   * 要求、此前的要求、上一份方案任一处含高危密钥回 secret-critical，都不发给模型。模型报错回 llm-failed（已脱敏），输出不合格式回 llm-invalid-output。
   */
  import_zod3.z.object({
    cmd: import_zod3.z.literal("draft-proposal"),
    decisionId: import_zod3.z.string(),
    request: import_zod3.z.string().refine((s) => s.trim() !== "", { message: "\u8981\u5199 request" }),
    priorRequests: import_zod3.z.array(import_zod3.z.string()).optional(),
    previous: requestedProposalSchema.omit({ basis: true }).optional(),
    bases: import_zod3.z.union([import_zod3.z.tuple([memoryBaseSchema]), import_zod3.z.tuple([memoryBaseSchema, memoryBaseSchema])])
  }),
  /**
   * 「让模型改 / 让模型合并」的生成：一条（合并时两条）记忆按建议类型的默认要求、或用户写的 request，单次调用借来的会话的模型，
   * 回一稿改后的内容（结果的 draft）。只读：不写记忆、不拍快照、不入账本、不进会话记录；「应用」由界面改发 edit-memory / merge-memories。
   * adviceType 缺省（记忆查看里的修改，不是从建议来的）时 request 必填。
   * previous：「再改改」时的上一稿，模型在它的基础上接着改；priorRequests：此前每一轮的要求，按先后排列；
   * planNote：「整理所选」单项再改改时这一项的计划；absorbs：同时并进这一项、应用后会删除的记忆（计划里 into 指向这一项的删除项），
   * 要在用、与 memories 同一作用域、不与 memories 重复，否则回 not-found / invalid-args。含密钥的记忆（含 absorbs）回 has-secret，原文不发给模型；
   * request、priorRequests、planNote、previous 任一处含高危密钥回 secret-critical，同样不发。
   */
  import_zod3.z.object({
    cmd: import_zod3.z.literal("draft-edit"),
    adviceType: import_zod3.z.enum(MODEL_EDIT_ADVICE_TYPES).optional(),
    memories: import_zod3.z.union([import_zod3.z.tuple([draftRefSchema]), import_zod3.z.tuple([draftRefSchema, draftRefSchema])]),
    request: import_zod3.z.string().optional(),
    priorRequests: import_zod3.z.array(import_zod3.z.string()).optional(),
    planNote: planNoteSchema.optional(),
    absorbs: import_zod3.z.array(draftRefSchema).max(MAX_BATCH_EDIT).optional(),
    previous: memoryDraftSchema.optional()
  }).refine((c) => c.adviceType !== void 0 || (c.request ?? "").trim() !== "", { message: "\u6CA1\u6709\u5EFA\u8BAE\u7C7B\u578B\u65F6\u8981\u5199 request", path: ["request"] }),
  /**
   * 「整理所选」的计划：选中的 2–20 条记忆（同一作用域，各带卡片版本）和用户的要求，单次调用借来的会话的模型，回一份整理计划（结果的 plan）。
   * 只读：不写记忆、不拍快照、不入账本，不过跨项目门（同 draft-edit）。目标 id 重复、不在同一作用域回 invalid-args；版本对不上回 stale；
   * 含密钥的记忆回 has-secret、要求含高危密钥回 secret-critical，都不发给模型；模型的计划漏条、多条、into / question 不合规则回 llm-invalid-output。
   */
  import_zod3.z.object({
    cmd: import_zod3.z.literal("plan-edits"),
    memories: import_zod3.z.array(mergeRefSchema).min(2).max(MAX_BATCH_EDIT),
    request: import_zod3.z.string().refine((s) => s.trim() !== "", { message: "\u8981\u5199 request" })
  }),
  /**
   * 「整理所选」按计划出稿：plan-edits 的选中记忆和要求，加上用户勾选的改写项（ops，1 项起，选中记忆的无重复子集），
   * 单次调用借来的会话的模型，每个改写项回一稿（结果的 drafts）。选中的全部记忆都作为上下文给模型；删除项不需要稿，不进这条命令。
   * 只读，不过跨项目门（同 plan-edits）。ops 不是子集、absorbs 不在选中里或落在 ops 上或被两项承接回 invalid-args；
   * 要求、理由、提问、回答任一处含高危密钥回 secret-critical；模型没给齐每项恰好一稿回 llm-invalid-output。其余同 plan-edits。
   */
  import_zod3.z.object({
    cmd: import_zod3.z.literal("draft-plan"),
    memories: import_zod3.z.array(mergeRefSchema).min(2).max(MAX_BATCH_EDIT),
    request: import_zod3.z.string().refine((s) => s.trim() !== "", { message: "\u8981\u5199 request" }),
    ops: import_zod3.z.array(draftPlanOpSchema).min(1).max(MAX_BATCH_EDIT)
  }),
  /**
   * 「整理所选」的应用全部：ops 是对照后要写的 1–20 项（按计划顺序，改写或删除），keep 是删除依据涉及、这次不写的记忆，只核对版本。
   * 整批一份快照（pre-update），逐项写，全成后在账本里留一条已结清的 batch-edited（带逐项回执），结果的 decisionId 交给 undo 一次撤回。
   * 目标 id 重复（ops 之间、ops 与 keep 之间）、不在同一作用域、删除的 into 不指向本批的改写项或 keep 回 invalid-args；
   * 任一条不在用回 not-found；改写的目标含高危密钥、删除的目标含密钥（疑似也算）回 has-secret；版本对不上回 stale；
   * 改写项四个面含高危密钥回 secret-critical，疑似回 secret-suspected，确认后带 force 重发。以上都什么都不写。
   */
  import_zod3.z.object({
    cmd: import_zod3.z.literal("apply-edits"),
    ops: import_zod3.z.array(applyEditOpSchema).min(1).max(MAX_BATCH_EDIT),
    keep: import_zod3.z.array(mergeRefSchema).max(MAX_BATCH_EDIT).optional(),
    force: import_zod3.z.boolean().optional(),
    allowCrossWorkspace
  }),
  import_zod3.z.object({ cmd: import_zod3.z.literal("dismiss-overflow"), decisionId: import_zod3.z.string() }),
  /**
   * 忽略一条建议整理项：记下这几条记忆的指纹，之后该项不再出现在待处理、不再扣分；建议依据的字段变了就不再算已忽略。
   * memories 是该项涉及的记忆（内容重复为一组，顺序不论；其余类型恰好一条），每条带卡片上那一份的作用域和卡片版本：
   * 只认那一份，版本对不上（卡片加载后被改过）回 stale，不在用回 not-found，都什么都不记。
   * 不改记忆，所以不过跨项目门、不受体检开关影响；同一项再忽略一次只是刷新记录。
   */
  import_zod3.z.object({ cmd: import_zod3.z.literal("ignore-advice"), type: import_zod3.z.enum(IGNORABLE_ADVICE_TYPES), memories: import_zod3.z.array(mergeRefSchema).min(1) }),
  /** 取消忽略（健康页「已忽略」里的一条，或刚忽略后的撤销）：本来就没忽略也算成功。 */
  import_zod3.z.object({ cmd: import_zod3.z.literal("unignore-advice"), type: import_zod3.z.enum(IGNORABLE_ADVICE_TYPES), memoryIds: import_zod3.z.array(import_zod3.z.string()).min(1) }),
  /**
   * 体检，目标三选一：不带参数 = 全部（逐个查每个项目，再单独查一遍全局）；workspacePath = 这个项目（读全局加本项目、
   * 只写本项目的缓存）；layer = 全局（只查全局、只写全局的缓存）。两者不能同时给。体检完给覆盖到的每个范围写完成记录（发起方界面手动）。
   */
  import_zod3.z.object({ cmd: import_zod3.z.literal("scan"), workspacePath: import_zod3.z.string().optional(), layer: import_zod3.z.object({ kind: import_zod3.z.literal("global") }).optional() }).refine((c) => c.workspacePath === void 0 || c.layer === void 0, { message: "workspacePath \u4E0E layer \u53EA\u80FD\u7ED9\u4E00\u4E2A" }),
  /**
   * 改一个范围的自动体检频率：具体值（manual 或 1–90 天）写进自动体检设置表，和「全部」的值相同也写（算单独设置）；
   * follow 删掉这个范围的设置、改回跟随「全部」（「全部」没有可跟随的，不收 follow）。项目路径要是绝对路径。不受体检开关影响。
   */
  import_zod3.z.object({
    cmd: import_zod3.z.literal("set-auto-checkup"),
    scope: scopeOrAllSchema,
    frequency: import_zod3.z.union([autoCheckupFrequencySchema, import_zod3.z.literal(AUTO_CHECKUP_FOLLOW)])
  }).refine((c) => c.scope.kind !== "all" || c.frequency !== AUTO_CHECKUP_FOLLOW, { message: "\u300C\u5168\u90E8\u300D\u6CA1\u6709\u53EF\u8DDF\u968F\u7684\u8303\u56F4" }),
  import_zod3.z.object({ cmd: import_zod3.z.literal("refresh-views") }),
  /**
   * 设置页改名或删除自建类型时处理已有记忆（全库：全局和所有项目，等同 allowCrossWorkspace）。retype 把这一类的记忆
   * （在用的和最近删除里的）改成 to，不刷新更新、确认时间；forget 把在用的这一类移到最近删除，含密钥的不动、计数返回。
   * 重复执行只处理还是 from 的记忆。from 不限格式：配置文件里手写的类型名也要能迁走。
   */
  import_zod3.z.object({ cmd: import_zod3.z.literal("migrate-type"), from: import_zod3.z.string().min(1), action: import_zod3.z.enum(["retype", "forget"]), to: typeNameSchema.optional() }).refine((c) => c.action === "retype" === (c.to !== void 0), { message: "retype \u8981\u5E26 to\uFF0Cforget \u4E0D\u5E26" })
]);
var CROSS_WORKSPACE_COMMANDS = new Set(
  memoryCommandSchema.options.flatMap((o) => "allowCrossWorkspace" in o.shape ? [o.shape.cmd.value] : [])
);
var OPEN_ITEM_COMMANDS = /* @__PURE__ */ new Set([
  "resolve",
  "apply-proposal",
  "promote",
  "keep-local",
  "dismiss-overflow",
  "promote-memory",
  "keep-local-memory",
  "move-memory",
  "ignore-advice",
  "suggest",
  "draft-proposal"
]);
function encodeMemoryCommand(command) {
  const { cmd, ...rest } = command;
  return `/${MEMORY_COMMAND_NAME} ${cmd}${Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : ""}`;
}
function parseMemoryCommand(rawInput) {
  const text = rawInput.trim();
  const space = text.search(/\s/);
  const cmd = space === -1 ? text : text.slice(0, space);
  const argText = space === -1 ? "" : text.slice(space).trim();
  let args = {};
  if (argText !== "") {
    let value;
    try {
      value = JSON.parse(argText);
    } catch {
      return { ok: false, detail: `\u53C2\u6570\u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${argText}` };
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) return { ok: false, detail: "\u53C2\u6570\u5FC5\u987B\u662F JSON \u5BF9\u8C61" };
    args = value;
  }
  const parsed = memoryCommandSchema.safeParse({ ...args, cmd });
  if (!parsed.success) return { ok: false, detail: parsed.error.issues.map((i) => `${i.path.join(".") || "cmd"}: ${i.message}`).join("; ") };
  return { ok: true, command: parsed.data };
}
var GUI_ERROR_CODES = [
  "invalid-args",
  // 参数不符合 memoryCommandSchema
  "not-found",
  // 条目或记忆不存在（可能已处理）
  "cross-workspace",
  // 涉及其他项目且未带 allowCrossWorkspace，什么都没动
  "llm-unavailable",
  // 体检、让模型改、补上建议、按要求生成拿不到模型
  "llm-failed",
  // 让模型改、按要求生成：模型报错，detail 带原话（已脱敏）
  "llm-invalid-output",
  // 让模型改、按要求生成：模型的输出不合要求的格式；整理计划：漏条、多条、承接或提问不合规则
  "subagent-readonly",
  // 借的会话是子 agent，不可写
  "governance-disabled",
  // 体检已关闭：裁决、撤销、提升、移到项目、留在本项目、体检、忽略超限不可用
  "no-baseline",
  // 补上建议、按要求生成垂直冲突：这条记忆对应的指令文件取不到或不存在。什么都没动
  "has-secret",
  // forget 的目标含密钥（任一级），只能彻底删除：什么都没动，界面确认后改发 hard-delete；
  // 直接改、直接合并、整理所选的应用的目标含密钥（界面上是遮盖后的正文）：什么都没动；让模型改、整理计划、补上建议、按要求生成的目标含密钥：不发给模型
  "stale",
  // 直接改、直接合并、整理计划与应用：记忆在卡片加载后被改过；采纳建议：建议已换了一份，或两条在建议生成后被改过；按要求生成与应用：两条在卡片加载后或方案生成后被改过；任一类撤销（含等同撤销的恢复）：目标之后又被改过或已不在原处。什么都没动（合并撤销中途被第三方改过的停在第三方的版本）
  "secret-critical",
  // 直接改、直接合并、整理所选的应用、按要求应用的新内容含高危密钥：什么都没动；让模型改、整理计划、按要求生成的要求、此前的要求、计划、上一稿或上一份方案含高危密钥：不发给模型
  "secret-suspected",
  // 直接改、直接合并、整理所选的应用、按要求应用的新内容含疑似密钥：什么都没动，用户确认后带 force 重发
  "claimed",
  // 待决项正被另一次操作（别的标签页、宿主进程或体检）认领：什么都没动
  "busy",
  // 体检：范围正在体检（别的体检认领着、没过期；「全部」有一个范围认领不到也算），或体检中途认领被别的进程接手。
  // 没认领到时什么都没动；中途被接手的这次不再提交。和待决项的 claimed 是两回事
  "target-taken",
  // 移到项目：目标项目已有同 id 的记忆；撤销移到项目、提升为全局：全局已有同 id 的记忆（含最近删除）。什么都没动
  "failed"
  // 真失败：执行器或读写报错，detail 带原话。撤销遇到「之后又被改过」不走这里，回 stale；最近删除的普通恢复（不等同撤销）快照后被改过仍回它
];
var VIEW_BEHIND_CODES = /* @__PURE__ */ new Set(["stale", "not-found"]);
var memoryCommandResultSchema = import_zod3.z.discriminatedUnion("ok", [
  import_zod3.z.object({
    ok: import_zod3.z.literal(true),
    cmd: import_zod3.z.string(),
    decisionId: import_zod3.z.string().optional(),
    memoryIds: import_zod3.z.array(import_zod3.z.string()).optional(),
    snapshotId: import_zod3.z.string().optional(),
    /**
     * apply-edits：只应用了一部分（中途失败、已写的没能全部退回）。memoryIds 只列仍是这次写下、记进账本可撤销的；
     * 回退之前已被别处接着改过的停在别处的版本，不进账本、不可撤销，列在 unrecordedIds。两者之外的都已退回或没写。
     */
    isPartial: import_zod3.z.literal(true).optional(),
    unrecordedIds: import_zod3.z.array(import_zod3.z.string()).optional(),
    /** edit-memory / merge-memories：保留的那条写完后的文件（改了名称时文件名跟着变）；move-memory：移过去之后的文件。 */
    filePath: import_zod3.z.string().optional(),
    /**
     * resolve 两边都留：条目没有指纹（升级前导入的）、也现算不出（垂直冲突取不到这条记忆对应的指令文件），结论没记下、条目已移出账本，
     * 下次体检同一对还会报，也没有可撤销的条目。
     */
    isUnrecorded: import_zod3.z.literal(true).optional(),
    /** resolve、apply-proposal 删一方：败方含高危密钥，已物理删除、不可恢复，条目已移出账本，没有可撤销的条目。 */
    isHardDeleted: import_zod3.z.literal(true).optional(),
    /** draft-edit：模型给的改后稿。 */
    draft: memoryDraftSchema.optional(),
    /** draft-proposal：模型按要求给的处理方案（带依据版本，应用时原样带回）。 */
    proposal: requestedProposalSchema.optional(),
    /** draft-proposal：模型认为照这个要求做不到，只有一句说明（已遮疑似密钥），没有方案。 */
    infeasible: import_zod3.z.object({ reason: import_zod3.z.string() }).optional(),
    /** plan-edits：模型给的整理计划。 */
    plan: editPlanSchema.optional(),
    /** draft-plan：每个改写项一稿，按命令里 ops 的顺序。 */
    drafts: import_zod3.z.array(import_zod3.z.object({ memoryId: import_zod3.z.string(), draft: memoryDraftSchema })).optional(),
    /** model-info、draft-edit、plan-edits、draft-plan、suggest、draft-proposal：借来的会话用的模型名；拿不到名字时缺省（suggest 没调用模型时也缺省）。 */
    model: import_zod3.z.string().optional(),
    /** scan：体检的说明码（如 baseline-truncated）。 */
    notes: import_zod3.z.array(import_zod3.z.enum(SCAN_NOTE_CODES)).optional(),
    /**
     * scan：本次新增的待处理项条数。新增 = 体检后有、体检前没有（按待处理项的身份比较，只看本次体检覆盖的作用域），
     * 不等于「体检查出来的」：体检期间别的会话写入引出的、时间推移刚越过「很久没确认」门槛的也算。
     * 用户忽略的建议不在待处理里，不算。pending = 高优问题 + 待你处理，advice = 建议整理。
     * pendingLevel：新增的待处理都在同一组时给出那一组（界面的链接定位到它），分在两组或没有新增时缺省。
     * 收集视图出错时缺省（体检照常完成）。
     */
    added: import_zod3.z.object({
      pending: import_zod3.z.number().int().nonnegative(),
      advice: import_zod3.z.number().int().nonnegative(),
      pendingLevel: import_zod3.z.enum(["must-fix", "your-call"]).optional()
    }).optional(),
    /** scan：本次体检覆盖各作用域的健康分（与健康视图同值，有密钥的作用域为 null），按健康视图的顺序；与 added 同时缺省。 */
    scores: import_zod3.z.array(import_zod3.z.object({ layer: scopeSchema, score: import_zod3.z.number().nullable() })).optional(),
    /** scan：内容检查分了批时的批数（分批的各作用域相加），与说明码 semantic-batched 同时出现；不分批时缺省。 */
    semanticBatches: import_zod3.z.number().int().positive().optional(),
    /** scan：宿主流 usage 块报的实际用量合计（所有批次、重试、跨项目重复检查）；宿主一次都没报时缺省，不拿估算顶替。 */
    usageTokens: import_zod3.z.number().int().nonnegative().optional(),
    /** migrate-type：这次改了类型或移到最近删除的条数。 */
    migrated: import_zod3.z.number().int().nonnegative().optional(),
    /** migrate-type forget：含密钥、没有移动的条数。 */
    skippedSecrets: import_zod3.z.number().int().nonnegative().optional(),
    /** info：记忆根目录、视图目录与各视图文件的绝对路径（checkups 是体检视图，session 是发命令的这个会话的视图）、视图版本。 */
    info: import_zod3.z.object({
      memoryRoot: import_zod3.z.string(),
      viewDir: import_zod3.z.string(),
      views: import_zod3.z.object({ pending: import_zod3.z.string(), health: import_zod3.z.string(), library: import_zod3.z.string(), deleted: import_zod3.z.string(), checkups: import_zod3.z.string().optional(), session: import_zod3.z.string().optional() }),
      version: import_zod3.z.number()
    }).optional()
  }),
  import_zod3.z.object({
    ok: import_zod3.z.literal(false),
    cmd: import_zod3.z.string().optional(),
    code: import_zod3.z.enum(GUI_ERROR_CODES),
    /** cross-workspace：被拒的记录。 */
    rejected: import_zod3.z.array(import_zod3.z.object({ id: import_zod3.z.string(), workspacePath: import_zod3.z.string() })).optional(),
    /** 宿主或执行器的原话，界面原样显示。 */
    detail: import_zod3.z.string().optional(),
    /** stale、not-found：对不上或找不到的那几条（整理所选的三条命令、让模型改），界面据此等视图换成最新内容、移出清单。 */
    memoryIds: import_zod3.z.array(import_zod3.z.string()).optional()
  })
]);

// client/i18n.tsx
var import_react = require("react");

// client/locales/pending.ts
var pendingZh = {
  "pending.busy": "\u6B63\u5728\u5904\u7406\u2026",
  "pending.awaitingConfirm": "\u7B49\u4F60\u5148\u786E\u8BA4",
  "pending.undo": "\u64A4\u9500",
  "pending.cancel": "\u53D6\u6D88",
  "pending.cross.body": "\u8FD9\u6761\u8BB0\u5FC6\u5C5E\u4E8E {name} \u9879\u76EE\uFF0C\u4E0D\u662F\u5F53\u524D\u9879\u76EE\u3002\u786E\u5B9A\u5728\u8FD9\u91CC\u5904\u7406\u5B83\u5417\uFF1F",
  "pending.cross.confirm": "\u7EE7\u7EED\u5904\u7406",
  "pending.cross.moveBody": "\u8981\u79FB\u53BB\u7684 {name} \u4E0D\u662F\u5F53\u524D\u9879\u76EE\u3002\u786E\u5B9A\u4ECE\u8FD9\u91CC\u79FB\u8FC7\u53BB\u5417\uFF1F",
  "pending.softDelete.question": "\u5220\u9664\u8FD9\u6761\uFF1F",
  "pending.softDelete.confirm": "\u5220\u9664",
  "pending.openFailed": "\u6CA1\u80FD\u6253\u5F00\u6587\u4EF6\u3002",
  "pending.refused": "\u4F60\u5BF9\u300C{title}\u300D\u7684\u9009\u62E9\u6CA1\u6709\u751F\u6548\uFF1A\u5B83\u6B63\u5728\u522B\u5904\u5904\u7406\uFF0C\u6216\u8005\u521A\u5728\u522B\u5904\u5904\u7406\u5B8C\u3002",
  "pending.level.must-fix": "\u5148\u5904\u7406",
  "pending.level.your-call": "\u7B49\u4F60\u51B3\u5B9A",
  "pending.level.advice": "\u53EF\u4EE5\u6574\u7406",
  "pending.level.advice.note": "\u5904\u7406\u6216\u9009\u62E9\u4E0D\u518D\u63D0\u9192\u540E\u4E0D\u6263\u5206",
  "pending.new": "\u65B0",
  "pending.more": "\u5C55\u5F00\u5176\u4F59 {n} \u6761",
  "pending.allDone": "\u90FD\u5904\u7406\u5B8C\u4E86\uFF0Cagent \u4E4B\u540E\u6309\u4F60\u7684\u51B3\u5B9A\u6765\u3002",
  "pending.empty.title": "\u6CA1\u6709\u8981\u5904\u7406\u7684\u4E8B",
  "pending.empty.lastScan": "\u4E0A\u6B21\u4F53\u68C0 {date}\u3002\u65B0\u7684\u51B2\u7A81\u548C\u5EFA\u8BAE\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002",
  "pending.empty.never": "\u8FD8\u6CA1\u4F53\u68C0\u8FC7\u3002\u65B0\u7684\u51B2\u7A81\u548C\u5EFA\u8BAE\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002",
  "pending.ignored.count": "\u4E0D\u518D\u63D0\u9192\u7684 {n} \u6761",
  "pending.ignored.show": "\u67E5\u770B",
  "pending.ignored.hide": "\u6536\u8D77",
  "pending.ignored.unignore": "\u6062\u590D\u63D0\u9192",
  "pending.off.title": "\u4F53\u68C0\u5DF2\u5728\u914D\u7F6E\u6587\u4EF6\u91CC\u5173\u95ED",
  "pending.off.body": "\u5728\u914D\u7F6E\u6587\u4EF6\u91CC\u628A governance.enabled \u6539\u56DE true\uFF0C\u8FD9\u91CC\u5C31\u4F1A\u5217\u51FA\u51B2\u7A81\u3001\u63D0\u5347\u5019\u9009\u548C\u8D85\u51FA\u4E0A\u9650\u7684\u63D0\u9192\u3002\u5BC6\u94A5\u548C\u8BFB\u4E0D\u51FA\u7684\u6587\u4EF6\u7167\u5E38\u63D0\u793A\u3002",
  "pending.secret.title": "\u8FD9\u6761\u8BB0\u5FC6\u91CC\u6709\u5BC6\u94A5",
  "pending.secret.body": "\u539F\u6587\u5DF2\u6253\u7801\u3002\u4E0D\u662F\u5BC6\u94A5\u7684\u8BDD\uFF0C\u6253\u5F00\u6587\u4EF6\u6539\u5199\u90A3\u4E00\u6BB5\uFF0C\u4E0B\u6B21\u5C31\u4E0D\u518D\u63D0\u793A\u3002",
  "pending.secret.show": "\u663E\u793A",
  "pending.secret.hide": "\u9690\u85CF",
  "pending.secret.readFailed": "\u8BFB\u4E0D\u5230\u539F\u6587\uFF0C\u53EF\u4EE5\u6253\u5F00\u6587\u4EF6\u67E5\u770B\u3002",
  "pending.secret.rewrite": "\u6253\u5F00\u6587\u4EF6\u6539\u5199",
  "pending.secret.delete": "\u5F7B\u5E95\u5220\u9664\u2026",
  "pending.secret.confirmBody": "\u5F7B\u5E95\u5220\u9664\u540E\u4E0D\u8FDB\u6700\u8FD1\u5220\u9664\u3001\u4E0D\u80FD\u6062\u590D\uFF0C\u4EE5\u524D\u5FEB\u7167\u91CC\u7684\u526F\u672C\u4E5F\u4F1A\u62B9\u6389\u3002",
  "pending.secret.confirmDelete": "\u5F7B\u5E95\u5220\u9664",
  "pending.secret.deleted": "\u5DF2\u5F7B\u5E95\u5220\u9664",
  "pending.secret.deletedBody": "\u5982\u679C\u5B83\u662F\u771F\u7684\u51ED\u8BC1\uFF0C\u8BB0\u5F97\u53BB\u6362\u4E00\u4E2A\u65B0\u7684\u3002",
  "pending.secret.deletedNotice": "\u5DF2\u5F7B\u5E95\u5220\u9664\u3002\u5982\u679C\u5B83\u662F\u771F\u7684\u51ED\u8BC1\uFF0C\u8BB0\u5F97\u53BB\u6362\u4E00\u4E2A\u65B0\u7684\u3002",
  "pending.conflict.preferred": "\u51B3\u5B9A\u4E4B\u524D\uFF0Cagent \u6309 {side} \u6765\u505A\u3002",
  "pending.conflict.preferredExplicit": "\u51B3\u5B9A\u4E4B\u524D\uFF0Cagent \u6309\u4F60\u660E\u786E\u8BF4\u8FC7\u7684 {side} \u6765\u505A\u3002",
  "pending.suggestion.action.merge": "\u878D\u5408\u6210\u4E00\u6761",
  "pending.suggestion.action.keepA": "\u4FDD\u7559 A",
  "pending.suggestion.action.keepB": "\u4FDD\u7559 B",
  "pending.suggestion.action.keepBoth": "\u90FD\u4FDD\u7559\uFF08\u4E0D\u7B97\u51B2\u7A81\uFF09",
  "pending.suggestion.mergeInto": "\u878D\u5408\u540E\uFF08\u5199\u8FDB {keep}\uFF0C{drop} \u8FDB\u6700\u8FD1\u5220\u9664\uFF09",
  "pending.suggestion.compare": "\u770B\u548C\u539F\u6587\u7684\u5BF9\u7167 \u203A",
  "pending.suggestion.compareHide": "\u6536\u8D77\u5BF9\u7167",
  "pending.suggestion.none": "\u8FD9\u6B21\u6CA1\u6709\u5EFA\u8BAE",
  "pending.suggestion.secret": "{side} \u91CC\u6709\u5BC6\u94A5\uFF0C\u4E0D\u4F1A\u53D1\u7ED9\u6A21\u578B\u3002\u53EF\u4EE5\u76F4\u63A5\u9009\u4E0B\u9762\u7684\u5904\u7406\u65B9\u5F0F\u3002",
  "pending.suggestion.missing": "\u8FD9\u6761\u8FD8\u6CA1\u6709\u5EFA\u8BAE",
  "pending.suggestion.notGenerated": "\u8FD8\u6CA1\u8BA9\u6A21\u578B\u770B\u8FC7\u8FD9\u4E24\u6761\u3002",
  "pending.suggestion.quotaExhausted": "\u81EA\u52A8\u4F53\u68C0\u8FD9\u6B21\u7ED9\u7684\u5EFA\u8BAE\u6761\u6570\u5230\u4E0A\u9650\u4E86\uFF0C\u6CA1\u8F6E\u5230\u8FD9\u6761\u3002",
  "pending.suggestion.failed": "\u4E0A\u6B21\u6CA1\u751F\u6210\u6210\uFF1A{reason}\u3002",
  "pending.suggestion.secretInDraft": "\u6A21\u578B\u7ED9\u7684\u7A3F\u91CC\u5E26\u8FDB\u4E86\u539F\u6587\u6CA1\u6709\u7684\u5BC6\u94A5\uFF0C\u5DF2\u4E22\u5F03",
  "pending.suggestion.undecided": "\u6A21\u578B\u5224\u65AD\u4E0D\u4E86\u54EA\u6761\u5BF9",
  "pending.suggestion.generate": "\u8865\u4E0A\u5EFA\u8BAE",
  "pending.suggestion.retry": "\u518D\u8BD5\u4E00\u6B21",
  "pending.suggestion.busy": "\u6B63\u5728\u751F\u6210\u5EFA\u8BAE\u2026\u2026",
  "pending.suggestAll.missing": "{n} \u6761\u8FD8\u6CA1\u6709\u5EFA\u8BAE",
  "pending.suggestAll.run": "\u5168\u90E8\u8865\u4E0A",
  "pending.suggestAll.progress": "\u6B63\u5728\u751F\u6210\u5EFA\u8BAE {at} / {total}\u2026\u2026",
  "pending.suggestion.stale": "\u8FD9\u4E24\u6761\u521A\u88AB\u6539\u8FC7\uFF0C\u5EFA\u8BAE\u5DF2\u5931\u6548\u3002\u4E0B\u6B21\u4F53\u68C0\u4F1A\u91CD\u65B0\u7ED9\u5EFA\u8BAE\uFF0C\u73B0\u5728\u53EF\u4EE5\u76F4\u63A5\u9009\u5904\u7406\u65B9\u5F0F\u3002",
  "pending.suggestion.sourced": "\u5EFA\u8BAE\u662F\u56DE\u67E5\u4E24\u6761\u7684\u51FA\u5904\u540E\u7ED9\u51FA\u7684\u3002",
  "pending.conflict.adopt": "\u91C7\u7EB3\u5EFA\u8BAE",
  "pending.conflict.keepA": "\u4FDD\u7559 A",
  "pending.conflict.keepB": "\u4FDD\u7559 B",
  "pending.conflict.keepBoth": "\u90FD\u4FDD\u7559\uFF0C\u4E0D\u7B97\u51B2\u7A81",
  "pending.conflict.adoptNote": "\u91C7\u7EB3\u540E {drop} \u8FDB\u6700\u8FD1\u5220\u9664\uFF0C14 \u5929\u5185\u53EF\u6062\u590D\u3002",
  "pending.conflict.adoptNotePurge": "{drop} \u542B\u5BC6\u94A5\uFF0C\u91C7\u7EB3\u540E\u5C06\u5F7B\u5E95\u5220\u9664\u3001\u4E0D\u53EF\u6062\u590D\u3002",
  "pending.conflict.adoptNoteKeepBoth": "\u91C7\u7EB3\u540E\u4E24\u6761\u90FD\u7559\u7740\uFF0C\u4EE5\u540E\u4F53\u68C0\u4E0D\u518D\u628A\u5B83\u4EEC\u5F53\u51B2\u7A81\u3002",
  "pending.conflict.confirmKeep": "\u4FDD\u7559 {keep}\uFF0C{drop} \u8FDB\u6700\u8FD1\u5220\u9664\uFF1F",
  "pending.conflict.confirmPurge": "\u4FDD\u7559 {keep}\uFF1A{drop} \u542B\u5BC6\u94A5\uFF0C\u5C06\u5F7B\u5E95\u5220\u9664\u3001\u4E0D\u53EF\u6062\u590D\u3002",
  "pending.conflict.confirmKeepBoth": "\u90FD\u4FDD\u7559\uFF1F\u4EE5\u540E\u4F53\u68C0\u4E0D\u518D\u628A\u5B83\u4EEC\u5F53\u51B2\u7A81",
  "pending.conflict.confirmKeepBothLabel": "\u90FD\u4FDD\u7559",
  "pending.conflict.request": "\u8865\u5145\u8981\u6C42",
  "pending.proposal.ask": "\u60F3\u600E\u4E48\u5904\u7406\u8FD9\u4E24\u6761\uFF1F",
  "pending.proposal.intents": "\u5E38\u7528\u5904\u7406\uFF08\u53EF\u9009\uFF09",
  "pending.proposal.merge": "\u4E24\u8005\u878D\u5408",
  "pending.proposal.merge.template": "\u628A\u4E24\u6761\u878D\u5408\u6210\u4E00\u6761\uFF0C\u5199\u6E05\u5404\u81EA\u9002\u7528\u7684\u6761\u4EF6\u3002",
  "pending.proposal.placeholder": "\u4E5F\u53EF\u4EE5\u76F4\u63A5\u5199\u4F60\u7684\u8981\u6C42\uFF0C\u4F8B\u5982\uFF1A\u4EE5 A \u4E3A\u51C6\uFF0C\u4F46\u628A B \u91CC\u7684\u7AEF\u53E3\u53F7\u5E76\u8FDB\u6765\u3002",
  "pending.proposal.empty": "\u5148\u5199\u8981\u6C42\uFF0C\u6216\u4ECE\u5E38\u7528\u5904\u7406\u91CC\u9009\u4E00\u4E2A",
  "pending.proposal.note": "\u6A21\u578B\u6309\u4E24\u6761\u539F\u6587\u548C\u4F60\u7684\u8981\u6C42\u7ED9\u51FA\u5904\u7406\u65B9\u6848\uFF0C\u5148\u7ED9\u4F60\u770B\u7ED3\u679C\u518D\u51B3\u5B9A\u3002\u5B83\u53EA\u7528\u539F\u6587\u548C\u4F60\u5199\u7684\u4FE1\u606F\u3002\u4F1A\u6D88\u8017\u5C11\u91CF token\u3002",
  "pending.proposal.hint": "\u7528\u5F53\u524D\u6A21\u578B {model} \u751F\u6210",
  "pending.proposal.generate": "\u751F\u6210\u5904\u7406\u65B9\u6848",
  "pending.proposal.busy": "\u6B63\u5728\u751F\u6210\u5904\u7406\u65B9\u6848\u2026\u2026",
  "pending.proposal.again": "\u6539\u8981\u6C42",
  "pending.proposal.dropNote": "\u5E94\u7528\u540E {drop} \u8FDB\u6700\u8FD1\u5220\u9664\uFF0C14 \u5929\u5185\u53EF\u6062\u590D\u3002",
  "pending.proposal.keepBothNote": "\u4E24\u6761\u90FD\u7559\u7740\uFF0C\u4EE5\u540E\u4F53\u68C0\u4E0D\u518D\u628A\u5B83\u4EEC\u5F53\u51B2\u7A81\u3002",
  "pending.proposal.infeasible": "\u505A\u4E0D\u5230",
  "pending.proposal.stale": "\u8FD9\u4E24\u6761\u521A\u88AB\u6539\u8FC7\uFF0C\u5DF2\u6362\u6210\u6700\u65B0\u5185\u5BB9\u3002\u8BF7\u91CD\u65B0\u5904\u7406\u3002",
  "pending.suggestion.action.rewrite": "\u6539\u5199\u8FD9\u6761\u8BB0\u5FC6",
  "pending.suggestion.action.delete": "\u4EE5\u6587\u4EF6\u4E3A\u51C6\uFF0C\u5220\u9664\u8FD9\u6761",
  "pending.suggestion.rewriteInto": "\u6539\u5199\u540E\uFF08\u5199\u56DE\u8FD9\u6761\u8BB0\u5FC6\uFF0C\u6307\u4EE4\u6587\u4EF6\u4E0D\u6539\uFF09",
  "pending.suggestion.secretVertical": "\u8FD9\u6761\u8BB0\u5FC6\u91CC\u6709\u5BC6\u94A5\uFF0C\u4E0D\u4F1A\u53D1\u7ED9\u6A21\u578B\u3002\u53EF\u4EE5\u76F4\u63A5\u9009\u4E0B\u9762\u7684\u5904\u7406\u65B9\u5F0F\u3002",
  "pending.suggestion.notGeneratedVertical": "\u8FD8\u6CA1\u8BA9\u6A21\u578B\u770B\u8FC7\u8FD9\u6761\u8BB0\u5FC6\u548C\u6307\u4EE4\u6587\u4EF6\u3002",
  "pending.suggestion.noBaseline": "\u8FD9\u6761\u8BB0\u5FC6\u5BF9\u5E94\u7684\u6307\u4EE4\u6587\u4EF6\u8BFB\u4E0D\u5230\uFF0C\u6216\u5728\u4F53\u68C0\u540E\u6539\u8FC7\u3002\u91CD\u65B0\u4F53\u68C0\u540E\u518D\u8BD5\u3002",
  "pending.suggestion.staleVertical": "\u8FD9\u6761\u8BB0\u5FC6\u6216\u6307\u4EE4\u6587\u4EF6\u521A\u88AB\u6539\u8FC7\uFF0C\u5EFA\u8BAE\u5DF2\u5931\u6548\u3002\u4E0B\u6B21\u4F53\u68C0\u4F1A\u91CD\u65B0\u7ED9\u5EFA\u8BAE\uFF0C\u73B0\u5728\u53EF\u4EE5\u76F4\u63A5\u9009\u5904\u7406\u65B9\u5F0F\u3002",
  "pending.vertical.delete": "\u4EE5\u6587\u4EF6\u4E3A\u51C6\uFF0C\u5220\u9664\u8FD9\u6761",
  "pending.vertical.rewrite": "\u6539\u5199\u8FD9\u6761\u8BB0\u5FC6",
  "pending.vertical.rewrite.template": "\u6539\u5199\u8FD9\u6761\u8BB0\u5FC6\uFF0C\u5199\u6E05\u5B83\u548C\u6307\u4EE4\u6587\u4EF6\u5404\u7BA1\u4EC0\u4E48\u3002",
  "pending.vertical.adoptNoteDelete": "\u91C7\u7EB3\u540E\u8FD9\u6761\u8BB0\u5FC6\u8FDB\u6700\u8FD1\u5220\u9664\uFF0C14 \u5929\u5185\u53EF\u6062\u590D\u3002",
  "pending.vertical.adoptNotePurge": "\u8FD9\u6761\u8BB0\u5FC6\u542B\u5BC6\u94A5\uFF0C\u91C7\u7EB3\u540E\u5C06\u5F7B\u5E95\u5220\u9664\u3001\u4E0D\u53EF\u6062\u590D\u3002",
  "pending.vertical.adoptNoteKeepBoth": "\u91C7\u7EB3\u540E\u8FD9\u6761\u8BB0\u5FC6\u7559\u7740\uFF0C\u5B83\u548C\u6307\u4EE4\u6587\u4EF6\u90FD\u4E0D\u53D8\u65F6\u4E0D\u518D\u62A5\u3002",
  "pending.vertical.adoptNoteRewrite": "\u91C7\u7EB3\u540E\u8FD9\u6761\u8BB0\u5FC6\u6362\u6210\u6539\u5199\u7A3F\uFF0C\u53EF\u4EE5\u64A4\u9500\u3002",
  "pending.vertical.sourced": "\u5EFA\u8BAE\u662F\u56DE\u67E5\u8FD9\u6761\u8BB0\u5FC6\u7684\u51FA\u5904\u540E\u7ED9\u51FA\u7684\u3002",
  "pending.vertical.confirmDelete": "\u4EE5\u6587\u4EF6\u4E3A\u51C6\uFF0C\u8FD9\u6761\u8BB0\u5FC6\u8FDB\u6700\u8FD1\u5220\u9664\uFF1F",
  "pending.vertical.confirmDeleteLabel": "\u5220\u9664\u8FD9\u6761",
  "pending.vertical.confirmPurge": "\u4EE5\u6587\u4EF6\u4E3A\u51C6\uFF1A\u8FD9\u6761\u8BB0\u5FC6\u542B\u5BC6\u94A5\uFF0C\u5C06\u5F7B\u5E95\u5220\u9664\u3001\u4E0D\u53EF\u6062\u590D\u3002",
  "pending.vertical.confirmKeepBoth": "\u90FD\u4FDD\u7559\uFF1F\u5B83\u548C\u6307\u4EE4\u6587\u4EF6\u90FD\u4E0D\u53D8\u65F6\u4E0D\u518D\u62A5",
  "pending.vertical.ask": "\u60F3\u600E\u4E48\u5904\u7406\u8FD9\u6761\u8BB0\u5FC6\uFF1F",
  "pending.vertical.placeholder": "\u4E5F\u53EF\u4EE5\u76F4\u63A5\u5199\u4F60\u7684\u8981\u6C42\uFF0C\u4F8B\u5982\uFF1A\u53EA\u5728 web \u76EE\u5F55\u4E0B\u7528 pnpm\uFF0C\u5176\u4F59\u7167\u6307\u4EE4\u6587\u4EF6\u3002",
  "pending.vertical.note": "\u6A21\u578B\u6309\u8FD9\u6761\u8BB0\u5FC6\u3001\u6307\u4EE4\u6587\u4EF6\u548C\u4F60\u7684\u8981\u6C42\u7ED9\u51FA\u5904\u7406\u65B9\u6848\uFF0C\u5148\u7ED9\u4F60\u770B\u7ED3\u679C\u518D\u51B3\u5B9A\u3002\u5B83\u53EA\u7528\u539F\u6587\u548C\u4F60\u5199\u7684\u4FE1\u606F\u3002\u4F1A\u6D88\u8017\u5C11\u91CF token\u3002",
  "pending.vertical.deleteNote": "\u5E94\u7528\u540E\u8FD9\u6761\u8BB0\u5FC6\u8FDB\u6700\u8FD1\u5220\u9664\uFF0C14 \u5929\u5185\u53EF\u6062\u590D\u3002",
  "pending.vertical.keepBothNote": "\u8FD9\u6761\u8BB0\u5FC6\u7559\u7740\uFF0C\u5B83\u548C\u6307\u4EE4\u6587\u4EF6\u90FD\u4E0D\u53D8\u65F6\u4E0D\u518D\u62A5\u3002",
  "pending.vertical.stale": "\u8FD9\u6761\u8BB0\u5FC6\u521A\u88AB\u6539\u8FC7\uFF0C\u5DF2\u6362\u6210\u6700\u65B0\u5185\u5BB9\u3002\u8BF7\u91CD\u65B0\u5904\u7406\u3002",
  "pending.promote.title": "\u8FD9\u6761\u9002\u5408\u6240\u6709\u9879\u76EE",
  "pending.promote.titleIn": "{name} \u91CC\u7684\u8FD9\u6761\u9002\u5408\u6240\u6709\u9879\u76EE",
  "pending.promote.global": "\u63D0\u5347\u4E3A\u5168\u5C40",
  "pending.promote.globalIn": "\u63D0\u5347 {name} \u91CC\u7684\u8FD9\u6761",
  "pending.promote.agentsMd": "\u5199\u8FDB AGENTS.md",
  "pending.promote.reason": "\u8FD9\u6761\u770B\u8D77\u6765\u9002\u5408\u6240\u6709\u9879\u76EE\u3002",
  "pending.promote.globalNote": "\u63D0\u5347\u540E\u6240\u6709\u9879\u76EE\u90FD\u4F1A\u5E26\u5165\u5B83\uFF0C14 \u5929\u5185\u53EF\u64A4\u9500\u3002",
  "pending.promote.agentsMdNote": "\u4E4B\u540E\u7531\u4F60\u81EA\u5DF1\u7EF4\u62A4\uFF1A\u63D2\u4EF6\u4E0D\u518D\u4F53\u68C0\u5B83\uFF0C\u6709\u6548\u671F\u4E5F\u4E0D\u518D\u751F\u6548\u3002",
  "pending.promote.keepLocal": "\u7559\u5728\u672C\u9879\u76EE",
  "pending.promote.configLoading": "\u6B63\u5728\u8BFB\u53D6\u8BBE\u7F6E\u2026",
  "pending.overflow.title": "\u5E26\u5165\u7684\u8BB0\u5FC6\u8D85\u51FA\u4E0A\u9650",
  "pending.overflow.relax": "\u8D85\u51FA\u4E0A\u9650 {over}% \u4EE5\u4E0A\uFF0C\u5DF2\u81EA\u52A8\u653E\u5BBD\u5230 {cap}\uFF08\u4E0A\u9650 {budget}\uFF09\u3002",
  "pending.overflow.relaxNoBudget": "\u8D85\u51FA\u4E0A\u9650 {over}% \u4EE5\u4E0A\uFF0C\u5DF2\u81EA\u52A8\u653E\u5BBD\u3002",
  "pending.overflow.strict": "\u5DF2\u7528\u5230\u4E0A\u9650 {budget} \u7684 95%\uFF0C\u518D\u591A\u7684\u8BB0\u5FC6\u4E0D\u4F1A\u5E26\u5165\u3002",
  "pending.overflow.strictNoBudget": "\u5DF2\u7528\u5230\u4E0A\u9650\u7684 95%\uFF0C\u518D\u591A\u7684\u8BB0\u5FC6\u4E0D\u4F1A\u5E26\u5165\u3002",
  "pending.overflow.raise": "\u8C03\u9AD8\u4E0A\u9650",
  "pending.overflow.save": "\u4FDD\u5B58",
  "pending.overflow.raiseHint": "\u89E6\u53D1\u65B0\u4E0A\u9650\u524D\u4E0D\u4F1A\u518D\u63D0\u9192\u3002",
  "pending.overflow.cleanup": "\u6574\u7406\u8BB0\u5FC6 \u203A",
  "pending.overflow.invalid": "\u586B\u4E00\u4E2A\u6BD4 {budget} \u5927\u7684\u6574\u6570\u3002",
  "pending.overflow.saveFailed": "\u6CA1\u6709\u4FDD\u5B58\u6210\u529F\uFF0C\u518D\u8BD5\u4E00\u6B21\u3002",
  "pending.unreadable.title": "\u6709\u4E2A\u6587\u4EF6\u8BFB\u4E0D\u51FA\u6765",
  "pending.unreadable.body": "\u8FD9\u4E2A\u6587\u4EF6\u73B0\u5728\u8BFB\u4E0D\u51FA\u6765\uFF0C\u91CC\u9762\u7684\u8BB0\u5FC6\u4E0D\u4F1A\u5E26\u5165\u5BF9\u8BDD\u3002\u6253\u5F00\u6587\u4EF6\u6539\u597D\u683C\u5F0F\u540E\uFF0C\u4E0B\u6B21\u6253\u5F00\u8BB0\u5FC6\u9875\u65F6\u8FD9\u6761\u63D0\u9192\u4F1A\u6D88\u5931\uFF0C\u8BB0\u5FC6\u6062\u590D\u5E26\u5165\u3002",
  "pending.unreadable.open": "\u6253\u5F00\u6587\u4EF6",
  "pending.unreadable.revealMac": "\u5728\u8BBF\u8FBE\u4E2D\u663E\u793A",
  "pending.unreadable.revealOther": "\u5728\u6587\u4EF6\u5939\u4E2D\u663E\u793A",
  "pending.advice.expired.title": "\u5DF2\u8FC7\u6709\u6548\u671F",
  "pending.advice.expired.body": "\u6709\u6548\u671F\u5DF2\u8FC7\uFF0C\u4E0D\u518D\u5E26\u5165\u5BF9\u8BDD\u3002\u5220\u9664\u540E 14 \u5929\u5185\u53EF\u5728\u300C\u6700\u8FD1\u5220\u9664\u300D\u6062\u590D\uFF1B\u8FD8\u8981\u7528\u7684\u8BDD\uFF0C\u6253\u5F00\u6587\u4EF6\u6539\u6709\u6548\u671F\u3002",
  "pending.advice.stale.title": "\u5F88\u4E45\u6CA1\u786E\u8BA4",
  "pending.advice.stale.body": "\u4E0A\u6B21\u786E\u8BA4\u662F {date}\uFF0C\u5DF2\u8D85\u8FC7\u8FD9\u7C7B\u8BB0\u5FC6\u7684\u786E\u8BA4\u5468\u671F\u3002\u5185\u5BB9\u8FD8\u51C6\u786E\u5C31\u70B9\u300C\u4ECD\u7136\u6709\u6548\u300D\u3002",
  "pending.advice.bloat.title": "\u5185\u5BB9\u8FC7\u957F",
  "pending.advice.bloat.body": "\u5185\u5BB9\u5F88\u957F\uFF0C\u5E26\u5165\u5BF9\u8BDD\u65F6\u5360\u7528\u8F83\u591A\u3002\u7CBE\u7B80\u6210\u8981\u70B9\u66F4\u597D\u3002",
  "pending.advice.orphan.title": "\u6307\u5411\u7684\u65E7\u8BB0\u5FC6\u5DF2\u4E0D\u5728",
  "pending.advice.orphan.body": "\u5B83\u8BB0\u7740\u53D6\u4EE3\u4E86\u4E00\u6761\u65E7\u8BB0\u5FC6\uFF0C\u90A3\u6761\u5DF2\u7ECF\u5220\u9664\u6216\u627E\u4E0D\u5230\u4E86\u3002\u6253\u5F00\u6587\u4EF6\uFF0C\u53BB\u6389 supersedes \u91CC\u5931\u6548\u7684\u90A3\u4E00\u9879\u3002",
  "pending.advice.redundancy.title": "\u5185\u5BB9\u91CD\u590D",
  "pending.advice.redundancy.body": "\u8FD9\u4E24\u6761\u5185\u5BB9\u6709\u91CD\u53E0\u3002\u8BF4\u7684\u662F\u540C\u4E00\u4EF6\u4E8B\uFF0C\u7559\u4E00\u6761\u5C31\u591F\uFF1B\u5404\u6709\u8981\u4FDD\u7559\u7684\u7EC6\u8282\uFF0C\u518D\u7528\u300C\u5408\u5E76\u300D\uFF1B\u5176\u5B9E\u662F\u4E24\u4EF6\u4E8B\uFF0C\u70B9\u53F3\u4E0A\u89D2\u4E0D\u518D\u63D0\u9192\u3002\u5220\u6389\u7684\u90A3\u6761 14 \u5929\u5185\u53EF\u5728\u300C\u6700\u8FD1\u5220\u9664\u300D\u6062\u590D\u3002",
  "pending.advice.redundancy.manyBody": "\u8FD9\u51E0\u6761\u5185\u5BB9\u6709\u91CD\u53E0\u3002\u8BF4\u7684\u662F\u540C\u4E00\u4EF6\u4E8B\uFF0C\u70B9\u300C\u5408\u5E76\u300D\u8BA9\u6A21\u578B\u5408\u6210\u4E00\u6761\uFF0C\u5404\u81EA\u72EC\u6709\u7684\u4FE1\u606F\u90FD\u7559\u4E0B\uFF1B\u5176\u5B9E\u662F\u4E0D\u540C\u7684\u4E8B\uFF0C\u70B9\u53F3\u4E0A\u89D2\u4E0D\u518D\u63D0\u9192\u3002",
  "pending.advice.redundancy.manyBodyNoMerge": "\u8FD9\u51E0\u6761\u5185\u5BB9\u6709\u91CD\u53E0\u3002\u8BF4\u7684\u662F\u540C\u4E00\u4EF6\u4E8B\uFF0C\u7559\u4E00\u6761\u5C31\u591F\uFF1B\u5176\u5B9E\u662F\u4E0D\u540C\u7684\u4E8B\uFF0C\u70B9\u53F3\u4E0A\u89D2\u4E0D\u518D\u63D0\u9192\u3002",
  "pending.advice.redundancy.baselineBody": "\u6307\u4EE4\u6587\u4EF6\uFF08AGENTS.md \u7B49\uFF09\u91CC\u5DF2\u7ECF\u5199\u4E86\u540C\u6837\u7684\u5185\u5BB9\uFF0C\u8FD9\u6761\u53EF\u4EE5\u5220\u6389\u3002\u5220\u9664\u540E 14 \u5929\u5185\u53EF\u5728\u300C\u6700\u8FD1\u5220\u9664\u300D\u6062\u590D\u3002",
  "pending.advice.redundancy.left": "\u5DE6\u8FB9\u8FD9\u6761",
  "pending.advice.redundancy.right": "\u53F3\u8FB9\u8FD9\u6761",
  "pending.advice.redundancy.deleteLeft": "\u5220\u9664\u5DE6\u8FB9",
  "pending.advice.redundancy.deleteRight": "\u5220\u9664\u53F3\u8FB9",
  "pending.advice.misplaced.title": "\u653E\u9519\u5C42",
  "pending.advice.misplaced.toGlobalBody": "\u8FD9\u6761\u770B\u8D77\u6765\u5BF9\u6240\u6709\u9879\u76EE\u90FD\u9002\u7528\uFF0C\u73B0\u5728\u53EA\u653E\u5728\u4E00\u4E2A\u9879\u76EE\u91CC\u3002\u63D0\u5347\u4E3A\u5168\u5C40\u540E\u6240\u6709\u9879\u76EE\u90FD\u4F1A\u5E26\u5165\u5B83\uFF0C14 \u5929\u5185\u53EF\u64A4\u9500\u3002",
  "pending.advice.misplaced.toProjectBody": "\u8FD9\u6761\u770B\u8D77\u6765\u53EA\u548C\u67D0\u4E2A\u9879\u76EE\u6709\u5173\uFF0C\u653E\u5728\u5168\u5C40\u4F1A\u88AB\u5E26\u8FDB\u6BCF\u4E2A\u9879\u76EE\u7684\u5BF9\u8BDD\u3002\u79FB\u5230\u9879\u76EE\u540E\u53EA\u5728\u90A3\u4E2A\u9879\u76EE\u91CC\u5E26\u5165\uFF0C14 \u5929\u5185\u53EF\u64A4\u9500\u3002",
  "pending.move.move": "\u79FB\u5230\u9879\u76EE\u2026",
  "pending.move.title": "\u79FB\u5230\u54EA\u4E2A\u9879\u76EE",
  "pending.move.confirm": "\u79FB\u8FC7\u53BB",
  "pending.move.none": "\u8FD8\u6CA1\u6709\u5DF2\u77E5\u7684\u9879\u76EE\uFF1A\u5728\u67D0\u4E2A\u9879\u76EE\u91CC\u5F00\u8FC7\u5BF9\u8BDD\u540E\uFF0C\u5B83\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002",
  "pending.move.taken": "\u8FD9\u4E2A\u9879\u76EE\u91CC\u5DF2\u7ECF\u6709\u540C\u4E00\u6761\u8BB0\u5FC6\uFF08\u4E5F\u53EF\u80FD\u5728\u6700\u8FD1\u5220\u9664\u91CC\uFF09\uFF0C\u6CA1\u6709\u79FB\u52A8\u3002",
  "pending.move.undoTaken": "\u5168\u5C40\u91CC\u5DF2\u7ECF\u6709\u540C\u4E00\u6761\u8BB0\u5FC6\uFF0C\u6CA1\u6709\u64A4\u9500\u3002",
  "pending.promote.taken": "\u5168\u5C40\u91CC\u5DF2\u7ECF\u6709\u8FD9\u6761\u8BB0\u5FC6\uFF08\u542B\u6700\u8FD1\u5220\u9664\uFF09\uFF0C\u6CA1\u6709\u63D0\u5347\u3002",
  "pending.advice.unclear.title": "\u8868\u8FF0\u4E0D\u6E05",
  "pending.advice.unclear.body": "\u6362\u4E00\u4E2A\u6CA1\u6709\u4E0A\u4E0B\u6587\u7684\u65B0\u5BF9\u8BDD\uFF0Cagent \u5F88\u96BE\u7167\u8FD9\u6761\u53BB\u505A\u3002\u628A\u7F3A\u7684\u80CC\u666F\u3001\u5BF9\u8C61\u6216\u6761\u4EF6\u5199\u6E05\u695A\u3002\u539F\u6587\u6CA1\u5199\u7684\u80CC\u666F\uFF0C\u6A21\u578B\u8865\u4E0D\u4E0A\uFF0C\u8981\u4F60\u5199\u7ED9\u5B83\u3002",
  "pending.advice.confirm": "\u4ECD\u7136\u6709\u6548",
  "pending.advice.delete": "\u5220\u9664",
  "pending.advice.open": "\u6253\u5F00\u6587\u4EF6",
  "pending.dismiss": "\u4E0D\u518D\u63D0\u9192",
  "pending.modify": "\u4FEE\u6539",
  "pending.merge": "\u5408\u5E76",
  "pending.modes": "\u4FEE\u6539\u65B9\u5F0F",
  "pending.edit.edit": "\u624B\u52A8\u6539",
  "pending.edit.merge": "\u624B\u52A8\u5408\u5E76",
  "pending.edit.content": "\u6B63\u6587",
  "pending.edit.more": "\u66F4\u591A",
  "pending.edit.less": "\u6536\u8D77",
  "pending.edit.name": "\u540D\u79F0",
  "pending.edit.summary": "\u6458\u8981",
  "pending.edit.tags": "\u6807\u7B7E",
  "pending.edit.tagPlaceholder": "\u52A0\u6807\u7B7E\uFF0C\u56DE\u8F66\u786E\u8BA4",
  "pending.edit.removeTag": "\u79FB\u9664\u6807\u7B7E {tag}",
  "pending.edit.typeFixed": "\u7C7B\u578B\u6539\u4E0D\u4E86\uFF1A\u6362\u7C7B\u578B\u8981\u5148\u5220\u518D\u8BB0",
  "pending.edit.note": "\u76F4\u63A5\u6539\u6B63\u6587\uFF0C\u4FDD\u5B58\u540E\u53EF\u4EE5\u64A4\u9500\u3002\u7C7B\u578B\u6539\u4E0D\u4E86\uFF1A\u6362\u7C7B\u578B\u8981\u5148\u5220\u518D\u8BB0\u3002",
  "pending.edit.mergeNote": "\u4FDD\u5B58\u540E\u53E6\u4E00\u6761\u8FDB\u6700\u8FD1\u5220\u9664",
  "pending.edit.count": "{from} \u5B57 \u2192 {to} \u5B57",
  "pending.edit.summaryStale": "\u6B63\u6587\u6539\u4E86\uFF0C\u6458\u8981\u8FD8\u662F\u65E7\u7684",
  "pending.edit.summaryFix": "\u53BB\u6539\u6458\u8981",
  "pending.edit.save": "\u4FDD\u5B58",
  "pending.edit.empty": "\u6B63\u6587\u548C\u540D\u79F0\u4E0D\u80FD\u7A7A\u7740",
  "pending.edit.stale": "\u8FD9\u6761\u8BB0\u5FC6\u521A\u88AB\u6539\u8FC7\uFF0C\u6CA1\u6709\u4FDD\u5B58\u3002\u91CD\u65B0\u6253\u5F00\u4FEE\u6539\uFF0C\u4F1A\u4ECE\u6700\u65B0\u5185\u5BB9\u5F00\u59CB\u3002",
  "pending.ignore.stale": "\u8FD9\u6761\u8BB0\u5FC6\u521A\u88AB\u6539\u8FC7\uFF0C\u5DF2\u6362\u6210\u6700\u65B0\u5185\u5BB9\uFF0C\u770B\u8FC7\u518D\u51B3\u5B9A\u8981\u4E0D\u8981\u5FFD\u7565\u3002",
  "pending.delete.stale": "\u8FD9\u6761\u8BB0\u5FC6\u521A\u5728\u522B\u5904\u88AB\u6539\u8FC7\u6216\u79FB\u52A8\uFF0C\u6CA1\u6709\u5220\u9664\u3002\u770B\u8FC7\u6700\u65B0\u5185\u5BB9\u518D\u51B3\u5B9A\u3002",
  "pending.memory.gone": "\u8FD9\u6761\u8BB0\u5FC6\u5DF2\u7ECF\u4E0D\u5728\u4E86\uFF0C\u53EF\u80FD\u5728\u522B\u5904\u5220\u6389\u4E86\u3002\u5217\u8868\u5DF2\u66F4\u65B0\u3002",
  "pending.undo.stale": "\u8FD9\u6761\u8BB0\u5FC6\u4E4B\u540E\u53C8\u88AB\u6539\u8FC7\uFF0C\u64A4\u9500\u4F1A\u51B2\u6389\u4E4B\u540E\u7684\u6539\u52A8\uFF0C\u6CA1\u6709\u64A4\u9500\u3002",
  "pending.edit.secretCritical": "\u5185\u5BB9\u91CC\u6709\u9AD8\u5371\u5BC6\u94A5\uFF0C\u6CA1\u6709\u4FDD\u5B58\u3002\u6539\u5199\u6210\u4E0D\u542B\u5BC6\u94A5\u7684\u8BF4\u6CD5\u518D\u5B58\u3002",
  "pending.edit.secretSuspected": "\u5185\u5BB9\u91CC\u6709\u50CF\u5BC6\u94A5\u7684\u7247\u6BB5\u3002\u786E\u5B9A\u4E0D\u662F\u5BC6\u94A5\u518D\u4FDD\u5B58\u3002",
  "pending.edit.saveAnyway": "\u4ECD\u7136\u4FDD\u5B58",
  "pending.model.edit": "\u8BA9\u6A21\u578B\u6539",
  "pending.model.merge": "\u8BA9\u6A21\u578B\u5408\u5E76",
  "pending.model.ask": "\u60F3\u600E\u4E48\u6539\uFF1F\u4E0D\u5199\u4E5F\u884C\uFF0C\u4F1A\u6309\u300C{type}\u300D\u9ED8\u8BA4\u5904\u7406",
  "pending.model.hint": "\u7528\u5F53\u524D\u6A21\u578B {model} \u751F\u6210\uFF0C\u5148\u7ED9\u4F60\u770B\u7ED3\u679C\u518D\u51B3\u5B9A",
  "pending.model.hintNoName": "\u5148\u7ED9\u4F60\u770B\u7ED3\u679C\u518D\u51B3\u5B9A",
  "pending.model.generate": "\u751F\u6210\u4FEE\u6539",
  "pending.model.busy": "\u6B63\u5728\u751F\u6210\u4FEE\u6539\u2026\u2026",
  "pending.model.stop": "\u505C\u6B62",
  "pending.model.before": "\u539F\u6587",
  "pending.model.after": "\u6539\u540E",
  "pending.model.mergeBefore": "\u4E24\u6761\u539F\u6587",
  "pending.model.mergeAfter": "\u5408\u5E76\u540E\uFF08\u4FDD\u7559{side}\u7684 id\uFF09",
  "pending.model.mergeNote": "\u5E94\u7528\u540E{side}\u8FDB\u6700\u8FD1\u5220\u9664\uFF0C14 \u5929\u5185\u53EF\u6062\u590D\u3002",
  "pending.model.left": "\u5DE6\u8FB9\u90A3\u6761",
  "pending.model.right": "\u53F3\u8FB9\u90A3\u6761",
  "pending.model.discard": "\u653E\u5F03",
  "pending.model.again": "\u518D\u6539\u6539",
  "pending.model.apply": "\u5E94\u7528",
  "pending.model.unavailable": "\u62FF\u4E0D\u5230\u5F53\u524D\u4F1A\u8BDD\u7684\u6A21\u578B\u3002",
  "pending.model.failed": "\u6A21\u578B\u51FA\u9519\u4E86\uFF1A{detail}",
  "pending.model.invalid": "\u6A21\u578B\u8FD4\u56DE\u7684\u5185\u5BB9\u683C\u5F0F\u4E0D\u5BF9\uFF0C\u518D\u8BD5\u4E00\u6B21\u3002",
  "pending.model.secretCritical": "\u8981\u6C42\u91CC\u6709\u9AD8\u5371\u5BC6\u94A5\uFF0C\u6CA1\u6709\u53D1\u9001\u3002\u53BB\u6389\u5BC6\u94A5\u518D\u751F\u6210\u3002",
  "pending.mergeMany.title": "\u5408\u5E76\u8FD9 {n} \u6761",
  "pending.mergeMany.request": "\u5408\u6210\u4E00\u6761\uFF0C\u5404\u81EA\u72EC\u6709\u7684\u4FE1\u606F\u90FD\u7559\u4E0B",
  "pending.mergeMany.back": "\u8FD4\u56DE",
  "pending.result.keptA": "\u5DF2\u4FDD\u7559 A",
  "pending.result.keptB": "\u5DF2\u4FDD\u7559 B",
  "pending.result.keptBoth": "\u4E24\u6761\u90FD\u4FDD\u7559",
  "pending.result.mergedOne": "\u5DF2\u878D\u5408\u6210\u4E00\u6761",
  "pending.result.partial": "\u53EA\u5B8C\u6210\u4E86\u4E00\u90E8\u5206",
  "pending.result.mergePartialKept": "{keep} \u5DF2\u5199\u6210\u878D\u5408\u7A3F\uFF0C{drop} \u6CA1\u6709\u5220\u9664\u3002\u64A4\u9500\u53EF\u628A {keep} \u9000\u56DE\u539F\u6837\u3002",
  "pending.result.mergePartialChanged": "{drop} \u6CA1\u6709\u5220\u9664\uFF1B{keep} \u9000\u56DE\u524D\u53C8\u88AB\u522B\u5904\u6539\u8FC7\uFF0C\u505C\u5728\u90A3\u8FB9\u7684\u7248\u672C\u3002",
  "pending.result.mergePartialOtherUndoable": "\u8FD9\u6B21\u878D\u5408\u6CA1\u6709\u505A\u5B8C\uFF0C{keep}\u3001{drop} \u73B0\u5728\u7684\u5185\u5BB9\u4EE5\u8BB0\u5FC6\u5217\u8868\u4E3A\u51C6\u3002\u64A4\u9500\u53EF\u9000\u56DE\u8FD9\u6B21\u7559\u4E0B\u7684\u6539\u52A8\u3002",
  "pending.result.mergePartialOther": "\u8FD9\u6B21\u878D\u5408\u6CA1\u6709\u505A\u5B8C\uFF0C{keep}\u3001{drop} \u73B0\u5728\u7684\u5185\u5BB9\u4EE5\u8BB0\u5FC6\u5217\u8868\u4E3A\u51C6\u3002",
  "pending.result.bySuggestion": "\u6309\u6A21\u578B\u5EFA\u8BAE\u5904\u7406\u3002",
  "pending.result.byChoice": "\u6309\u4F60\u7684\u9009\u62E9\u5904\u7406\u3002",
  "pending.result.byRequest": "\u6309\u4F60\u7684\u8981\u6C42\u5904\u7406\u3002",
  "pending.result.deletedSide": "{side} \u5DF2\u5220\u9664\uFF0C14 \u5929\u5185\u53EF\u6062\u590D\u3002",
  "pending.result.keptBothBody": "\u4EE5\u540E\u4F53\u68C0\u4E0D\u518D\u628A\u5B83\u4EEC\u5F53\u51B2\u7A81\u3002",
  "pending.result.followedBaseline": "\u5DF2\u6309\u57FA\u7EBF",
  "pending.result.followedBaselineBody": "\u8FD9\u6761\u8BB0\u5FC6\u5DF2\u5220\u9664\uFF0C14 \u5929\u5185\u53EF\u6062\u590D\u3002",
  "pending.result.keptMemory": "\u5DF2\u4FDD\u7559\u8FD9\u6761\u8BB0\u5FC6",
  "pending.result.keptMemoryBody": "\u57FA\u7EBF\u548C\u8BB0\u5FC6\u90FD\u4E0D\u53D8\u65F6\u4E0D\u518D\u62A5\u3002",
  "pending.result.unrecordedBody": "\u8FD9\u6B21\u7684\u51B3\u5B9A\u6CA1\u80FD\u8BB0\u4E0B\uFF0C\u4E0B\u6B21\u4F53\u68C0\u53EF\u80FD\u8FD8\u4F1A\u62A5\u3002",
  "pending.result.rewritten": "\u5DF2\u6539\u5199\u8FD9\u6761\u8BB0\u5FC6",
  "pending.result.rewrittenBody": "\u6307\u4EE4\u6587\u4EF6\u6CA1\u6709\u6539\u52A8\u3002",
  "pending.result.rewritePartial": "\u8FD9\u6B21\u6539\u5199\u6CA1\u6709\u505A\u5B8C\uFF0C\u8FD9\u6761\u8BB0\u5FC6\u73B0\u5728\u7684\u5185\u5BB9\u4EE5\u8BB0\u5FC6\u5217\u8868\u4E3A\u51C6\u3002",
  "pending.result.rewritePartialUndoable": "\u8FD9\u6B21\u6539\u5199\u6CA1\u6709\u505A\u5B8C\uFF0C\u8FD9\u6761\u8BB0\u5FC6\u73B0\u5728\u7684\u5185\u5BB9\u4EE5\u8BB0\u5FC6\u5217\u8868\u4E3A\u51C6\u3002\u64A4\u9500\u53EF\u9000\u56DE\u8FD9\u6B21\u7559\u4E0B\u7684\u6539\u52A8\u3002",
  "pending.result.promoted": "\u5DF2\u63D0\u5347\u4E3A\u5168\u5C40",
  "pending.result.promotedBody": "\u6240\u6709\u9879\u76EE\u90FD\u4F1A\u5E26\u5165\u5B83\uFF0C14 \u5929\u5185\u53EF\u64A4\u9500\u3002",
  "pending.result.moved": "\u5DF2\u79FB\u5230 {name}",
  "pending.result.movedBody": "\u53EA\u5728\u8FD9\u4E2A\u9879\u76EE\u91CC\u5E26\u5165\uFF0C14 \u5929\u5185\u53EF\u64A4\u9500\u3002",
  "pending.result.wroteAgentsMd": "\u5DF2\u5199\u8FDB AGENTS.md",
  "pending.result.wroteAgentsMdBody": "\u4E4B\u540E\u7531\u4F60\u81EA\u5DF1\u7EF4\u62A4\u3002",
  "pending.result.keptLocal": "\u7559\u5728\u672C\u9879\u76EE",
  "pending.result.keptLocalBody": "\u4EE5\u540E\u4E0D\u518D\u63D0\u793A\u8FD9\u6761\u3002",
  "pending.result.dismissed": "\u4E0D\u518D\u63D0\u9192",
  "pending.result.dismissedBody": "\u7528\u91CF\u518D\u5347\u4E00\u6863\u65F6\u518D\u63D0\u9192\u4F60\u3002",
  "pending.result.raised": "\u4E0A\u9650\u5DF2\u8C03\u5230 {budget}",
  "pending.result.confirmed": "\u5DF2\u786E\u8BA4\u4ECD\u7136\u6709\u6548",
  "pending.result.confirmedBody": "\u786E\u8BA4\u65F6\u95F4\u5DF2\u66F4\u65B0\uFF0C\u8FD9\u6761\u4E0D\u518D\u7B97\u4F5C\u5F88\u4E45\u6CA1\u786E\u8BA4\u3002",
  "pending.result.deleted": "\u5DF2\u5220\u9664",
  "pending.result.deletedBody": "14 \u5929\u5185\u53EF\u5728\u300C\u6700\u8FD1\u5220\u9664\u300D\u6062\u590D\u3002",
  "pending.result.deletedNamedBody": "\u300C{name}\u300D14 \u5929\u5185\u53EF\u5728\u300C\u6700\u8FD1\u5220\u9664\u300D\u6062\u590D\u3002",
  "pending.result.edited": "\u5DF2\u4FEE\u6539",
  "pending.result.merged": "\u5DF2\u5408\u5E76",
  "pending.result.tidiedBody": "\u6539\u5199 {rewrites} \u6761\u3001\u5220\u9664 {deletes} \u6761\uFF1B\u5220\u6389\u7684 14 \u5929\u5185\u53EF\u5728\u300C\u6700\u8FD1\u5220\u9664\u300D\u6062\u590D\u3002",
  "pending.result.tidiedBodyNoDelete": "\u6539\u5199 {rewrites} \u6761\u3002",
  "pending.result.ignored": "\u4E0D\u518D\u63D0\u9192",
  "pending.result.ignoredBody": "\u4E0D\u518D\u6263\u5206\uFF1B\u5185\u5BB9\u6539\u4E86\u4F1A\u91CD\u65B0\u63D0\u9192\u3002"
};
var pendingEn = {
  "pending.busy": "Working\u2026",
  "pending.awaitingConfirm": "Waiting for you to confirm",
  "pending.undo": "Undo",
  "pending.cancel": "Cancel",
  "pending.cross.body": "This memory belongs to project {name}, not this one. Handle it from here anyway?",
  "pending.cross.confirm": "Continue",
  "pending.cross.moveBody": "{name}, where this would move, is not the current project. Move it from here anyway?",
  "pending.softDelete.question": "Delete this one?",
  "pending.softDelete.confirm": "Delete",
  "pending.openFailed": "Could not open the file.",
  "pending.refused": "Your choice on \u201C{title}\u201D did not take effect: it is being handled elsewhere, or was just handled there.",
  "pending.level.must-fix": "High priority",
  "pending.level.your-call": "Waiting on you",
  "pending.level.advice": "Suggested cleanup",
  "pending.level.advice.note": "No score penalty once handled or dismissed",
  "pending.new": "New",
  "pending.more": "Show {n} more",
  "pending.allDone": "All handled. The agent follows your decisions from here.",
  "pending.empty.title": "Nothing to handle",
  "pending.empty.lastScan": "Last checkup {date}. New conflicts and suggestions show up here.",
  "pending.empty.never": "No checkup yet. New conflicts and suggestions show up here.",
  "pending.ignored.count": "{n} dismissed",
  "pending.ignored.show": "Show",
  "pending.ignored.hide": "Hide",
  "pending.ignored.unignore": "Remind me again",
  "pending.off.title": "Checkups are turned off in the config file",
  "pending.off.body": "Set governance.enabled back to true in the config file to see conflicts, promotion candidates, and over-limit reminders here. Secrets and unreadable files are still shown.",
  "pending.secret.title": "This memory contains a secret",
  "pending.secret.body": "The original is masked. If it is not a secret, open the file and rewrite that part; it will not be flagged again.",
  "pending.secret.show": "Show",
  "pending.secret.hide": "Hide",
  "pending.secret.readFailed": "Could not read the original. Open the file to see it.",
  "pending.secret.rewrite": "Open file to rewrite",
  "pending.secret.delete": "Delete permanently\u2026",
  "pending.secret.confirmBody": "Deleting permanently skips Recently deleted and cannot be undone. Copies in earlier snapshots are erased too.",
  "pending.secret.confirmDelete": "Delete permanently",
  "pending.secret.deleted": "Deleted permanently",
  "pending.secret.deletedBody": "If it was a real credential, remember to rotate it.",
  "pending.secret.deletedNotice": "Deleted permanently. If it was a real credential, remember to rotate it.",
  "pending.conflict.preferred": "Until you decide, the agent follows {side}.",
  "pending.conflict.preferredExplicit": "Until you decide, the agent follows {side}, which you said explicitly.",
  "pending.suggestion.action.merge": "Merge into one",
  "pending.suggestion.action.keepA": "Keep A",
  "pending.suggestion.action.keepB": "Keep B",
  "pending.suggestion.action.keepBoth": "Keep both (not a conflict)",
  "pending.suggestion.mergeInto": "Merged (written into {keep}; {drop} moves to Recently deleted)",
  "pending.suggestion.compare": "Compare with the originals \u203A",
  "pending.suggestion.compareHide": "Hide comparison",
  "pending.suggestion.none": "No suggestion this time",
  "pending.suggestion.secret": "{side} contains a secret, so it is not sent to the model. You can still pick an option below.",
  "pending.suggestion.missing": "No suggestion yet",
  "pending.suggestion.notGenerated": "The model has not looked at these two yet.",
  "pending.suggestion.quotaExhausted": "The automatic checkup reached its suggestion limit before getting to this one.",
  "pending.suggestion.failed": "The last attempt failed: {reason}.",
  "pending.suggestion.secretInDraft": "the model\u2019s draft added a secret that is not in the originals, so it was discarded",
  "pending.suggestion.undecided": "The model can\u2019t tell which one is right",
  "pending.suggestion.generate": "Suggest",
  "pending.suggestion.retry": "Try again",
  "pending.suggestion.busy": "Generating a suggestion\u2026",
  "pending.suggestAll.missing": "{n} without a suggestion",
  "pending.suggestAll.run": "Suggest all",
  "pending.suggestAll.progress": "Generating suggestions {at} / {total}\u2026",
  "pending.suggestion.stale": "These two changed after the suggestion was made, so it no longer applies. The next checkup will suggest again; you can pick an option below now.",
  "pending.suggestion.sourced": "This suggestion was made after looking up the conversations both memories came from.",
  "pending.conflict.adopt": "Adopt suggestion",
  "pending.conflict.keepA": "Keep A",
  "pending.conflict.keepB": "Keep B",
  "pending.conflict.keepBoth": "Keep both, not a conflict",
  "pending.conflict.adoptNote": "If you adopt it, {drop} moves to Recently deleted and can be restored within 14 days.",
  "pending.conflict.adoptNotePurge": "{drop} holds a secret: adopting deletes it permanently, and it cannot be restored.",
  "pending.conflict.adoptNoteKeepBoth": "If you adopt it, both stay and future checkups stop treating them as a conflict.",
  "pending.conflict.confirmKeep": "Keep {keep} and move {drop} to Recently deleted?",
  "pending.conflict.confirmPurge": "Keep {keep}: {drop} holds a secret and will be deleted permanently. It cannot be restored.",
  "pending.conflict.confirmKeepBoth": "Keep both? Future checkups will stop treating them as a conflict",
  "pending.conflict.confirmKeepBothLabel": "Keep both",
  "pending.conflict.request": "Say how",
  "pending.proposal.ask": "How should these two be handled?",
  "pending.proposal.intents": "Common choices (optional)",
  "pending.proposal.merge": "Merge the two",
  "pending.proposal.merge.template": "Merge the two into one and spell out when each one applies.",
  "pending.proposal.placeholder": "Or type your own request, for example: go with A, but bring over the port number from B.",
  "pending.proposal.empty": "Write a request first, or pick a common choice",
  "pending.proposal.note": "The model works from the two originals and your request and shows you the plan before anything changes. It uses only the originals and what you write. This uses a few tokens.",
  "pending.proposal.hint": "Uses the current model, {model}",
  "pending.proposal.generate": "Make a plan",
  "pending.proposal.busy": "Making a plan\u2026",
  "pending.proposal.again": "Change request",
  "pending.proposal.dropNote": "If you apply it, {drop} moves to Recently deleted and can be restored within 14 days.",
  "pending.proposal.keepBothNote": "Both stay, and future checkups stop treating them as a conflict.",
  "pending.proposal.infeasible": "Can\u2019t do this",
  "pending.proposal.stale": "These two just changed and now show their latest content. Please decide again.",
  "pending.suggestion.action.rewrite": "Rewrite this memory",
  "pending.suggestion.action.delete": "Go with the file, delete this one",
  "pending.suggestion.rewriteInto": "Rewritten (saved back to this memory; the instruction file is not changed)",
  "pending.suggestion.secretVertical": "This memory contains a secret, so it is not sent to the model. You can still pick an option below.",
  "pending.suggestion.notGeneratedVertical": "The model has not looked at this memory and the instruction file yet.",
  "pending.suggestion.noBaseline": "The instruction file for this memory could not be read, or it changed after the checkup. Run a checkup and try again.",
  "pending.suggestion.staleVertical": "This memory or the instruction file changed after the suggestion was made, so it no longer applies. The next checkup will suggest again; you can pick an option below now.",
  "pending.vertical.delete": "Go with the file, delete this one",
  "pending.vertical.rewrite": "Rewrite this memory",
  "pending.vertical.rewrite.template": "Rewrite this memory and spell out what it covers and what the instruction file covers.",
  "pending.vertical.adoptNoteDelete": "If you adopt it, this memory moves to Recently deleted and can be restored within 14 days.",
  "pending.vertical.adoptNotePurge": "This memory holds a secret: adopting deletes it permanently, and it cannot be restored.",
  "pending.vertical.adoptNoteKeepBoth": "If you adopt it, this memory stays and is not reported again while neither it nor the instruction file changes.",
  "pending.vertical.adoptNoteRewrite": "If you adopt it, this memory is replaced by the rewrite. You can undo this.",
  "pending.vertical.sourced": "This suggestion was made after looking up the conversation this memory came from.",
  "pending.vertical.confirmDelete": "Go with the file and move this memory to Recently deleted?",
  "pending.vertical.confirmDeleteLabel": "Delete this one",
  "pending.vertical.confirmPurge": "Go with the file: this memory holds a secret and will be deleted permanently. It cannot be restored.",
  "pending.vertical.confirmKeepBoth": "Keep both? Not reported again while neither the memory nor the instruction file changes",
  "pending.vertical.ask": "How should this memory be handled?",
  "pending.vertical.placeholder": "Or type your own request, for example: use pnpm only under web/, follow the instruction file everywhere else.",
  "pending.vertical.note": "The model works from this memory, the instruction file and your request and shows you the plan before anything changes. It uses only the originals and what you write. This uses a few tokens.",
  "pending.vertical.deleteNote": "If you apply it, this memory moves to Recently deleted and can be restored within 14 days.",
  "pending.vertical.keepBothNote": "This memory stays and is not reported again while neither it nor the instruction file changes.",
  "pending.vertical.stale": "This memory just changed and now shows its latest content. Please decide again.",
  "pending.promote.title": "This fits every project",
  "pending.promote.titleIn": "This memory in {name} fits every project",
  "pending.promote.global": "Make global",
  "pending.promote.globalIn": "Promote the one in {name}",
  "pending.promote.agentsMd": "Write into AGENTS.md",
  "pending.promote.reason": "This looks useful to every project.",
  "pending.promote.globalNote": "Every project will bring it in. You can undo within 14 days.",
  "pending.promote.agentsMdNote": "You maintain it from then on: the plugin stops checking it, and its expiry no longer applies.",
  "pending.promote.keepLocal": "Keep in this project",
  "pending.promote.configLoading": "Reading settings\u2026",
  "pending.overflow.title": "Memories brought in exceed the limit",
  "pending.overflow.relax": "More than {over}% over the limit; relaxed to {cap} (limit {budget}).",
  "pending.overflow.relaxNoBudget": "More than {over}% over the limit; relaxed automatically.",
  "pending.overflow.strict": "95% of the {budget} limit is used; further memories will not be brought in.",
  "pending.overflow.strictNoBudget": "95% of the limit is used; further memories will not be brought in.",
  "pending.overflow.raise": "Raise the limit",
  "pending.overflow.save": "Save",
  "pending.overflow.raiseHint": "No more reminders until the new limit is reached.",
  "pending.overflow.cleanup": "Review memories \u203A",
  "pending.overflow.invalid": "Enter a whole number above {budget}.",
  "pending.overflow.saveFailed": "Could not save. Try again.",
  "pending.unreadable.title": "A file could not be read",
  "pending.unreadable.body": "This file cannot be read right now, so the memories in it are not brought into conversations. Open the file and fix its format; the next time you open the memory page, this reminder goes away and the memories are brought in again.",
  "pending.unreadable.open": "Open file",
  "pending.unreadable.revealMac": "Show in Finder",
  "pending.unreadable.revealOther": "Show in folder",
  "pending.advice.expired.title": "Past its end date",
  "pending.advice.expired.body": "Its end date has passed, so it is no longer brought into conversations. If you delete it, you can restore it from Recently deleted within 14 days; if you still need it, open the file and change the date.",
  "pending.advice.stale.title": "Not confirmed in a while",
  "pending.advice.stale.body": "Last confirmed {date}, longer ago than this type of memory allows. If it is still accurate, choose \u201CStill valid\u201D.",
  "pending.advice.bloat.title": "Too long",
  "pending.advice.bloat.body": "It is long and takes up a lot of room when brought into a conversation. It works better trimmed to the key points.",
  "pending.advice.orphan.title": "Replaces a memory that is gone",
  "pending.advice.orphan.body": "It says it replaces an older memory that has been deleted or cannot be found. Open the file and remove that entry from supersedes.",
  "pending.advice.redundancy.title": "Duplicate content",
  "pending.advice.redundancy.body": "These two overlap. If they say the same thing, one is enough; if each has details worth keeping, use \u201CMerge\u201D; if they are really about different things, choose \u201CDon't remind me\u201D at the top right. The one you delete can be restored from Recently deleted within 14 days.",
  "pending.advice.redundancy.manyBody": "These overlap. If they say the same thing, choose Merge to have the model combine them into one that keeps what is unique to each; if they are really about different things, choose \u201CDon't remind me\u201D at the top right.",
  "pending.advice.redundancy.manyBodyNoMerge": "These overlap. If they say the same thing, one is enough; if they are really about different things, choose \u201CDon't remind me\u201D at the top right.",
  "pending.advice.redundancy.baselineBody": "Your instruction files (AGENTS.md and the like) already say the same thing, so this one can go. If you delete it, you can restore it from Recently deleted within 14 days.",
  "pending.advice.redundancy.left": "Left memory",
  "pending.advice.redundancy.right": "Right memory",
  "pending.advice.redundancy.deleteLeft": "Delete left",
  "pending.advice.redundancy.deleteRight": "Delete right",
  "pending.advice.misplaced.title": "In the wrong place",
  "pending.advice.misplaced.toGlobalBody": "This looks useful to every project, but it sits in just one. Make it global and every project will bring it in. You can undo within 14 days.",
  "pending.advice.misplaced.toProjectBody": "This looks specific to one project, yet in global it is brought into every project\u2019s conversations. Move it to a project and only that project brings it in. You can undo within 14 days.",
  "pending.move.move": "Move to project\u2026",
  "pending.move.title": "Move to which project",
  "pending.move.confirm": "Move",
  "pending.move.none": "No known projects yet. A project shows up here once you have had a conversation in it.",
  "pending.move.taken": "That project already has this memory (possibly in Recently deleted). Nothing was moved.",
  "pending.move.undoTaken": "Global already has this memory. Nothing was undone.",
  "pending.promote.taken": "Global already has this memory (possibly in Recently deleted). Nothing was promoted.",
  "pending.advice.unclear.title": "Unclear wording",
  "pending.advice.unclear.body": "In a fresh conversation without context, the agent would struggle to act on this. Spell out the missing background, subject or conditions. The model can\u2019t add background the original doesn\u2019t have; you\u2019ll need to give it.",
  "pending.advice.confirm": "Still valid",
  "pending.advice.delete": "Delete",
  "pending.advice.open": "Open file",
  "pending.dismiss": "Don't remind me",
  "pending.modify": "Edit",
  "pending.merge": "Merge",
  "pending.modes": "Editing method",
  "pending.edit.edit": "Edit manually",
  "pending.edit.merge": "Merge manually",
  "pending.edit.content": "Content",
  "pending.edit.more": "More",
  "pending.edit.less": "Less",
  "pending.edit.name": "Name",
  "pending.edit.summary": "Summary",
  "pending.edit.tags": "Tags",
  "pending.edit.tagPlaceholder": "Add a tag and press Enter",
  "pending.edit.removeTag": "Remove tag {tag}",
  "pending.edit.typeFixed": "The type cannot be changed. To change it, delete this memory and save a new one.",
  "pending.edit.note": "Edit the content directly; you can undo after saving. The type cannot be changed. To change it, delete this memory and save a new one.",
  "pending.edit.mergeNote": "After saving, the other memory moves to Recently deleted",
  "pending.edit.count": "{from} \u2192 {to} characters",
  "pending.edit.summaryStale": "The content changed, but the summary is still the old one",
  "pending.edit.summaryFix": "Edit summary",
  "pending.edit.save": "Save",
  "pending.edit.empty": "Content and name cannot be empty",
  "pending.edit.stale": "This memory was just changed, so nothing was saved. Reopen the edit to start from the latest version.",
  "pending.ignore.stale": "This memory was just changed and now shows the latest version. Review it before ignoring.",
  "pending.delete.stale": "This memory was just changed or moved elsewhere and was not deleted. Check the latest version before deciding.",
  "pending.memory.gone": "This memory is no longer there; it may have been deleted elsewhere. The list has been updated.",
  "pending.undo.stale": "This memory changed afterwards, so undoing would overwrite those changes. Nothing was undone.",
  "pending.edit.secretCritical": "The content contains a high-risk secret, so it was not saved. Rewrite it without the secret, then save.",
  "pending.edit.secretSuspected": "Part of the content looks like a secret. Save only if you are sure it is not one.",
  "pending.edit.saveAnyway": "Save anyway",
  "pending.model.edit": "Edit with model",
  "pending.model.merge": "Merge with model",
  "pending.model.ask": "How should it change? Optional: leave it blank to fix the \u201C{type}\u201D issue the default way",
  "pending.model.hint": "Generated with the current model, {model}. You see the result before deciding.",
  "pending.model.hintNoName": "You see the result before deciding.",
  "pending.model.generate": "Generate",
  "pending.model.busy": "Generating changes\u2026",
  "pending.model.stop": "Stop",
  "pending.model.before": "Original",
  "pending.model.after": "Edited",
  "pending.model.mergeBefore": "Both originals",
  "pending.model.mergeAfter": "Merged (keeps the ID of the {side})",
  "pending.model.mergeNote": "After applying, the {side} moves to Recently deleted and can be restored within 14 days.",
  "pending.model.left": "left memory",
  "pending.model.right": "right memory",
  "pending.model.discard": "Discard",
  "pending.model.again": "Revise",
  "pending.model.apply": "Apply",
  "pending.model.unavailable": "The current session has no model available.",
  "pending.model.failed": "The model returned an error: {detail}",
  "pending.model.invalid": "The model\u2019s reply was not in the expected format. Try again.",
  "pending.model.secretCritical": "The request contains a high-risk secret, so it was not sent. Remove the secret, then generate again.",
  "pending.mergeMany.title": "Merge these {n}",
  "pending.mergeMany.request": "Combine them into one and keep what is unique to each",
  "pending.mergeMany.back": "Back",
  "pending.result.keptA": "Kept A",
  "pending.result.keptB": "Kept B",
  "pending.result.keptBoth": "Kept both",
  "pending.result.mergedOne": "Merged into one",
  "pending.result.partial": "Partly done",
  "pending.result.mergePartialKept": "{keep} now holds the merged text; {drop} was not deleted. Undo puts {keep} back.",
  "pending.result.mergePartialChanged": "{drop} was not deleted; {keep} changed elsewhere before it could be put back and keeps that version.",
  "pending.result.mergePartialOtherUndoable": "The merge did not finish. See the memory list for what {keep} and {drop} hold now. Undo puts back what this attempt left.",
  "pending.result.mergePartialOther": "The merge did not finish. See the memory list for what {keep} and {drop} hold now.",
  "pending.result.bySuggestion": "Done as the model suggested.",
  "pending.result.byChoice": "Done as you chose.",
  "pending.result.byRequest": "Done as you asked.",
  "pending.result.deletedSide": "{side} was deleted and can be restored within 14 days.",
  "pending.result.keptBothBody": "Future checkups will not treat them as a conflict.",
  "pending.result.followedBaseline": "Went with the baseline",
  "pending.result.followedBaselineBody": "This memory was deleted and can be restored within 14 days.",
  "pending.result.keptMemory": "Kept this memory",
  "pending.result.keptMemoryBody": "Not reported again while neither changes.",
  "pending.result.unrecordedBody": "This decision could not be saved, so the next checkup may report it again.",
  "pending.result.rewritten": "Rewrote this memory",
  "pending.result.rewrittenBody": "The instruction file was not changed.",
  "pending.result.rewritePartial": "The rewrite did not finish. See the memory list for what this memory holds now.",
  "pending.result.rewritePartialUndoable": "The rewrite did not finish. See the memory list for what this memory holds now. Undo puts back what this attempt left.",
  "pending.result.promoted": "Made global",
  "pending.result.promotedBody": "Every project will bring it in. You can undo within 14 days.",
  "pending.result.moved": "Moved to {name}",
  "pending.result.movedBody": "Only this project brings it in. You can undo within 14 days.",
  "pending.result.wroteAgentsMd": "Written into AGENTS.md",
  "pending.result.wroteAgentsMdBody": "You maintain it from now on.",
  "pending.result.keptLocal": "Kept in this project",
  "pending.result.keptLocalBody": "You will not be asked about it again.",
  "pending.result.dismissed": "Dismissed",
  "pending.result.dismissedBody": "You will hear again if usage climbs another tier.",
  "pending.result.raised": "Limit raised to {budget}",
  "pending.result.confirmed": "Confirmed still valid",
  "pending.result.confirmedBody": "Its confirmation date is updated; it no longer counts as not confirmed in a while.",
  "pending.result.deleted": "Deleted",
  "pending.result.deletedBody": "You can restore it from Recently deleted within 14 days.",
  "pending.result.deletedNamedBody": "\u201C{name}\u201D can be restored from Recently deleted within 14 days.",
  "pending.result.edited": "Edited",
  "pending.result.merged": "Merged",
  "pending.result.tidiedBody": "{rewrites} rewritten, {deletes} deleted. Deleted ones can be restored from Recently deleted within 14 days.",
  "pending.result.tidiedBodyNoDelete": "{rewrites} rewritten.",
  "pending.result.ignored": "Dismissed",
  "pending.result.ignoredBody": "No score penalty; you will be reminded again if the content changes."
};

// client/locales/composer.ts
var composerZh = {
  "composer.button": "\u8BB0\u5FC6",
  "composer.dialog": "\u8BB0\u5FC6\u7528\u91CF",
  // {percent} 是分割点：两边各自成段，语序由各语言自己决定（照宿主 context.aria 的做法）
  "composer.share": "\u8BB0\u5FC6\u5360\u4E0A\u4E0B\u6587 {percent}",
  "composer.figures": "\u7EA6 {used} / \u4E0A\u9650 {budget}",
  "composer.approx": "\u7EA6 {n}",
  "composer.counts": "\u5F00\u59CB\u65F6\u5E26\u5165 {injected} \u6761 \xB7 \u65B0\u5199\u5165 {saved} \u6761",
  "composer.countsResumed": "\u91CD\u65B0\u5E26\u5165 {injected} \u6761 \xB7 \u65B0\u5199\u5165 {saved} \u6761",
  "composer.countsCompacted": "\u538B\u7F29\u540E\u91CD\u65B0\u5E26\u5165 {injected} \u6761 \xB7 \u65B0\u5199\u5165 {saved} \u6761",
  "composer.countsRefreshed": "\u5BF9\u8BDD\u4E2D\u91CD\u65B0\u5E26\u5165 {injected} \u6761 \xB7 \u65B0\u5199\u5165 {saved} \u6761",
  "composer.relaxed": "\u8D85\u51FA\u4E0A\u9650 {over}\uFF0C\u5DF2\u81EA\u52A8\u653E\u5BBD\u5230 {cap}",
  "composer.truncated": "\u5DF2\u5230\u4E0A\u9650\uFF0C{n} \u6761\u6CA1\u5E26\u5165",
  "composer.handle": "\u5904\u7406 \u203A",
  "composer.viewInjected": "\u67E5\u770B\u5E26\u5165\u7684\u8BB0\u5FC6 \u203A"
};
var composerEn = {
  "composer.button": "Memory",
  "composer.dialog": "Memory usage",
  "composer.share": "Memory uses {percent} of context",
  "composer.figures": "~{used} / limit {budget}",
  "composer.approx": "~{n}",
  "composer.counts": "{injected} brought in at start \xB7 {saved} newly written",
  "composer.countsResumed": "{injected} brought in again \xB7 {saved} newly written",
  "composer.countsCompacted": "{injected} brought in again after compaction \xB7 {saved} newly written",
  "composer.countsRefreshed": "{injected} brought in again during the chat \xB7 {saved} newly written",
  "composer.relaxed": "Over the limit by {over}, relaxed to {cap}",
  "composer.truncated": "At the limit, {n} not brought in",
  "composer.handle": "Handle \u203A",
  "composer.viewInjected": "View memories brought in \u203A"
};

// client/locales/library.ts
var libraryZh = {
  "library.search.label": "\u641C\u7D22\u8BB0\u5FC6",
  "library.search.placeholder": "\u641C\u7D22\u8BB0\u5FC6\u539F\u6587",
  "library.search.none": "\u6CA1\u6709\u627E\u5230\u5339\u914D\u7684\u8BB0\u5FC6",
  "library.storage.oneFile": "\u6BCF\u6761\u4E00\u4E2A\u6587\u4EF6",
  "library.storage.openDir": "\u6253\u5F00\u76EE\u5F55",
  "library.issues.label": "\u76EE\u5F55\u95EE\u9898",
  "library.issue.duplicate-id": "\u540C\u4E00 id \u6709\u591A\u4EFD\u6587\u4EF6\uFF1A\u5728\u7528 {kept}\uFF0C\u672A\u7528 {path}",
  "library.issue.reserved-keys": "\u6587\u4EF6\u91CC\u5199\u4E86\u63D2\u4EF6\u81EA\u5DF1\u7BA1\u7684\u5B57\u6BB5\uFF08{keys}\uFF09\uFF0C\u5DF2\u5FFD\u7565\uFF1A{path}",
  "library.issue.marker-missing": "\u76EE\u5F55\u7F3A\u5C11 .workspace \u6807\u8BB0\uFF0C\u6CA1\u6709\u8BFB\u53D6\uFF1A{path}",
  "library.issue.dir-unreadable": "\u76EE\u5F55\u8BFB\u4E0D\u51FA\u6765\uFF1A{path}",
  "library.issue.other": "\u76EE\u5F55\u6709\u95EE\u9898\uFF1A{path}",
  "library.openFile": "\u6253\u5F00\u6587\u4EF6",
  "library.delete": "\u5220\u9664",
  "library.deletedResult": "\u5DF2\u5220\u9664\uFF0C14 \u5929\u5185\u53EF\u5728\u300C\u6700\u8FD1\u5220\u9664\u300D\u627E\u56DE\u3002",
  "library.undo": "\u64A4\u9500",
  "library.empty.first.title": "\u8FD8\u6CA1\u6709\u8BB0\u5FC6",
  "library.empty.first.body": "\u8BB0\u5FC6\u7531 agent \u5728\u5BF9\u8BDD\u91CC\u5199\u4E0B\uFF1A\u4F60\u660E\u786E\u8BF4\u8FC7\u7684\u504F\u597D\u3001\u9879\u76EE\u7EA6\u5B9A\u3001\u505A\u8FC7\u7684\u51B3\u5B9A\u3002\u5199\u4E0B\u540E\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002",
  "library.empty.scope": "\u8FD9\u91CC\u8FD8\u6CA1\u6709\u8BB0\u5FC6",
  "library.group.more": "\u5C55\u5F00\u5176\u4F59 {n} \u6761",
  "library.group.less": "\u6536\u8D77\u5230 {n} \u6761",
  "library.group.latest": "\u6700\u8FD1 {date}",
  "library.recent.day": "24 \u5C0F\u65F6\u5185",
  "library.recent.days3": "\u8FD1 3 \u5929",
  "library.recent.week": "\u8FD1 7 \u5929",
  "library.recent.older": "\u66F4\u65E9",
  "library.recent.quiet": "\u6700\u8FD1 7 \u5929\u6CA1\u6709\u65B0\u8BB0\u6216\u6539\u52A8\u7684\u8BB0\u5FC6\u3002",
  "library.goScope": "\u5230\u300C{scope}\u300D\u67E5\u770B\u8FD9\u6761",
  "library.edit.discard": "\u653E\u5F03\u521A\u5199\u7684\u5185\u5BB9\uFF1F",
  "library.edit.discardConfirm": "\u653E\u5F03",
  "library.edit.justEdited": "\u5DF2\u6539\u5199",
  "library.edit.modelDone": "\u5DF2\u6309\u4F60\u7684\u8981\u6C42\u6539\u5199\u8FD9\u6761",
  "library.edit.manualDone": "\u5DF2\u4FDD\u5B58\u4FEE\u6539",
  "library.edit.stale": "\u8FD9\u6761\u521A\u88AB\u6539\u8FC7\uFF0C\u5DF2\u6362\u6210\u6700\u65B0\u5185\u5BB9\u3002\u8981\u6539\u8BF7\u91CD\u65B0\u6253\u5F00\u3002",
  "library.model.ask": "\u60F3\u600E\u4E48\u6539\u8FD9\u6761\uFF1F",
  "library.model.intents": "\u5E38\u7528\u5199\u6CD5\uFF08\u53EF\u9009\uFF09",
  "library.model.placeholder": "\u4E5F\u53EF\u4EE5\u76F4\u63A5\u8F93\u5165\u4F60\u7684\u8981\u6C42\uFF0C\u4F8B\u5982\uFF1A\u300C\u6BCF\u5468\u4E09\u53D1\u7248\u300D\u5DF2\u7ECF\u4E0D\u5BF9\u4E86\uFF0C\u73B0\u5728\u6539\u6210\u6BCF\u5468\u56DB\uFF0C\u4EE5\u8FD9\u4E2A\u4E3A\u51C6\u3002",
  "library.model.empty": "\u5148\u5199\u8981\u6C42\uFF0C\u6216\u4ECE\u5E38\u7528\u5199\u6CD5\u5F00\u4E2A\u5934",
  "library.model.note": "\u6A21\u578B\u6309\u539F\u6587\u548C\u4F60\u7684\u8981\u6C42\u6539\u5199\u8FD9\u6761\u8BB0\u5FC6\uFF0C\u683C\u5F0F\u7531\u5B83\u4FDD\u6301\uFF0C\u6BD4\u624B\u52A8\u6539\u6587\u4EF6\u7A33\u59A5\u3002\u5B83\u53EA\u7528\u4F60\u5199\u7684\u4FE1\u606F\uFF0C\u4E0D\u4F1A\u81EA\u5DF1\u8865\u5145\u3002\u4F1A\u6D88\u8017\u5C11\u91CF token\u3002",
  "library.intent.compress": "\u538B\u7F29\u8981\u70B9",
  "library.intent.compress.template": "\u538B\u7F29\u6210\u8981\u70B9\uFF0C\u4FDD\u7559 ___\uFF0C\u53EF\u4EE5\u5220\u6389 ___\u3002",
  "library.intent.clarify": "\u6539\u6E05\u695A",
  "library.intent.clarify.template": "\u300C___\u300D\u5199\u5F97\u542B\u7CCA\uFF0C\u6307\u7684\u662F ___\u3002",
  "library.intent.correct": "\u7EA0\u6B63\u5185\u5BB9",
  "library.intent.correct.template": "\u300C___\u300D\u5DF2\u7ECF\u4E0D\u5BF9\u4E86\uFF0C\u73B0\u5728\u662F\u300C___\u300D\uFF0C\u4EE5\u8FD9\u4E2A\u4E3A\u51C6\u3002",
  "library.intent.supplement": "\u8865\u5145\u4FE1\u606F",
  "library.intent.supplement.template": "\u8865\u4E0A\uFF1A___\uFF08\u539F\u6587\u6CA1\u6709\uFF0C\u6309\u6211\u5199\u7684\u52A0\uFF09\u3002",
  "library.intent.resolve": "\u89E3\u51B3\u77DB\u76FE",
  "library.intent.resolve.template": "\u8FD9\u51E0\u6761\u5728 ___ \u4E0A\u8BF4\u6CD5\u77DB\u76FE\uFF0C\u4EE5 ___ \u4E3A\u51C6\uFF0C\u65E7\u8BF4\u6CD5\u90FD\u6539\u6389\u3002",
  "library.intent.dedupe": "\u5408\u5E76\u91CD\u590D",
  "library.intent.dedupe.template": "___ \u8FD9\u51E0\u6761\u8BF4\u7684\u662F\u4E00\u4EF6\u4E8B\uFF0C\u5408\u6210\u4E00\u6761\uFF0C\u5404\u81EA\u72EC\u6709\u7684\u4FE1\u606F\u90FD\u7559\u4E0B\u3002",
  "library.intent.prune": "\u5220\u8FC7\u65F6\u5185\u5BB9",
  "library.intent.prune.template": "\u548C ___ \u6709\u5173\u7684\u5DF2\u7ECF\u8FC7\u65F6\u4E86\uFF0C\u5220\u6389\uFF1B___ \u8FD8\u6709\u6548\uFF0C\u4FDD\u7559\u3002",
  "library.intent.unify": "\u7EDF\u4E00\u8BF4\u6CD5",
  "library.intent.unify.template": "\u628A ___ \u7EDF\u4E00\u53EB\u4F5C ___\u3002",
  "library.select": "\u9009\u62E9",
  "library.select.done": "\u5B8C\u6210",
  "library.select.row": "\u9009\u62E9\u300C{name}\u300D",
  "library.select.secret": "\u542B\u5BC6\u94A5\u7684\u8BB0\u5FC6\u4E0D\u53D1\u7ED9\u6A21\u578B",
  "library.select.noVersion": "\u8FD9\u6761\u8BFB\u4E0D\u5230\u7248\u672C\uFF0C\u5148\u5237\u65B0",
  "library.select.bar": "\u591A\u9009\u64CD\u4F5C",
  "library.select.count": "\u5DF2\u9009 {n} \u6761",
  "library.select.tooMany": "\u5DF2\u9009 {n} \u6761 \xB7 \u4E00\u6B21\u6700\u591A\u6574\u7406 {max} \u6761\uFF0C\u5148\u7528\u641C\u7D22\u7F29\u5C0F\u8303\u56F4",
  "library.select.tooFew": "\u81F3\u5C11\u9009 2 \u6761\u624D\u80FD\u6574\u7406",
  "library.select.all": "\u5168\u9009\u5F53\u524D\u7ED3\u679C",
  "library.select.cancel": "\u53D6\u6D88",
  "library.select.tidy": "\u6574\u7406\u6240\u9009\u2026",
  "library.batch.title": "\u6574\u7406\u6240\u9009\u7684 {n} \u6761",
  "library.batch.back": "\u8FD4\u56DE\u5217\u8868",
  "library.batch.steps": "\u6B65\u9AA4",
  "library.batch.step.request": "\u5199\u8981\u6C42",
  "library.batch.step.plan": "\u770B\u8BA1\u5212",
  "library.batch.step.apply": "\u5BF9\u7167\u5E94\u7528",
  "library.batch.picked": "\u5DF2\u9009\u7684\u8BB0\u5FC6",
  "library.batch.count": "{n} \u6761",
  "library.batch.unpick": "\u4E0D\u6574\u7406\u300C{name}\u300D",
  "library.batch.unpickHint": "\u4E0D\u6574\u7406\u8FD9\u6761",
  "library.batch.ask": "\u60F3\u600E\u4E48\u6574\u7406\u8FD9\u51E0\u6761\uFF1F",
  "library.batch.placeholder": "\u4E5F\u53EF\u4EE5\u76F4\u63A5\u8F93\u5165\u4F60\u7684\u8981\u6C42\uFF0C\u4F8B\u5982\uFF1A\u8FD9\u51E0\u6761\u5728\u683C\u5F0F\u5316\u5DE5\u5177\u4E0A\u8BF4\u6CD5\u77DB\u76FE\uFF0C\u4EE5 biome \u4E3A\u51C6\uFF0C\u65E7\u8BF4\u6CD5\u90FD\u6539\u6389\u3002",
  "library.batch.note": "\u6A21\u578B\u5148\u7ED9\u51FA\u6574\u7406\u8BA1\u5212\uFF0C\u5F85\u4F60\u786E\u8BA4\u540E\u9010\u6761\u4F18\u5316\u8BB0\u5FC6\u3002\u6574\u7406\u8FC7\u7A0B\u4E2D\u4F1A\u4EA7\u751F token \u6D88\u8017\u3002",
  "library.batch.generate": "\u751F\u6210\u6574\u7406\u8BA1\u5212",
  "library.batch.planning": "\u6B63\u5728\u751F\u6210\u6574\u7406\u8BA1\u5212\u2026\u2026",
  "library.batch.understanding": "\u6A21\u578B\u7684\u7406\u89E3",
  "library.batch.ops": "\u6574\u7406\u8BA1\u5212",
  "library.batch.action.rewrite": "\u6539\u5199",
  "library.batch.action.delete": "\u5220\u9664",
  "library.batch.action.keep": "\u4E0D\u52A8",
  "library.batch.op": "{action}\u300C{name}\u300D",
  "library.batch.into": "\u5185\u5BB9\u5E76\u5165\uFF1A{name}",
  "library.batch.held": "\u627F\u63A5\u5B83\u7684\u6539\u5199\u5DF2\u53D6\u6D88\uFF0C\u8FD9\u6761\u5148\u4E0D\u5220",
  "library.batch.decide": "\u7B49\u4F60\u51B3\u5B9A\uFF1A",
  "library.batch.summary": "{changes} \u9879\u6539\u52A8 \xB7 {keeps} \u6761\u4E0D\u52A8 \xB7 \u8BA1\u5212\u4E0D\u5199\u5165\u4EFB\u4F55\u4E1C\u897F",
  "library.batch.revise": "\u6539\u8981\u6C42",
  "library.batch.draft": "\u6309\u8BA1\u5212\u51FA\u7A3F",
  "library.batch.next": "\u4E0B\u4E00\u6B65",
  "library.batch.noChange": "\u81F3\u5C11\u52FE\u9009\u4E00\u9879\u6539\u52A8",
  "library.batch.drafting": "\u6B63\u5728\u6309\u8BA1\u5212\u51FA\u7A3F\u2026\u2026",
  "library.batch.items": "\u9010\u9879\u5BF9\u7167",
  "library.batch.drop": "\u653E\u5F03\u8FD9\u9879",
  "library.batch.restore": "\u6062\u590D\u8FD9\u9879",
  "library.batch.againAsk": "\u8FD9\u4E00\u9879\u8FD8\u60F3\u600E\u4E48\u6539\uFF1F",
  "library.batch.deleteNote": "\u5E94\u7528\u540E\u8FDB\u6700\u8FD1\u5220\u9664\uFF0C14 \u5929\u5185\u53EF\u6062\u590D\u3002",
  "library.batch.dropHeld": "\u627F\u63A5\u5B83\u7684\u6539\u5199\u5DF2\u653E\u5F03\uFF0C\u8FD9\u6761\u5148\u4E0D\u5220",
  "library.batch.applySummary": "\u5C06\u5E94\u7528 {n} \u9879\uFF1A\u5220\u9664 {deletes} \u6761\u3001\u6539\u5199 {rewrites} \u6761",
  "library.batch.discardAll": "\u5168\u90E8\u653E\u5F03",
  "library.batch.applyAll": "\u5E94\u7528\u5168\u90E8",
  "library.batch.nothing": "\u81F3\u5C11\u7559\u4E00\u9879\u6539\u52A8",
  "library.batch.waitItem": "\u7B49\u8FD9\u4E00\u9879\u751F\u6210\u5B8C\u518D\u5E94\u7528",
  "library.batch.confirmDelete": "\u5176\u4E2D {n} \u9879\u4F1A\u5220\u9664\u300C{names}\u300D\uFF0C\u786E\u8BA4\u5E94\u7528\uFF1F",
  "library.batch.nameSep": "\u300D\u300C",
  "library.batch.confirmApply": "\u786E\u8BA4\u5E94\u7528",
  "library.batch.done": "\u5DF2\u6574\u7406 {n} \u6761\uFF1A\u5220\u9664 {deletes} \u6761\u3001\u6539\u5199 {rewrites} \u6761\uFF0C{kept} \u6761\u6CA1\u52A8",
  "library.batch.doneDeleted": "\u5220\u6389\u7684\u5728\u6700\u8FD1\u5220\u9664\uFF0C14 \u5929\u5185\u53EF\u6062\u590D",
  "library.batch.undoAll": "\u64A4\u9500\u5168\u90E8",
  "library.batch.undone": "\u5DF2\u64A4\u9500\u8FD9\u6B21\u6574\u7406\uFF0C{n} \u6761\u6062\u590D\u539F\u6837",
  "library.batch.undoStale": "\u6709\u8BB0\u5FC6\u4E4B\u540E\u53C8\u88AB\u6539\u8FC7\uFF0C\u6CA1\u6CD5\u4E00\u8D77\u64A4\u9500",
  "library.batch.stale": "\u6709\u8BB0\u5FC6\u521A\u88AB\u6539\u8FC7\u6216\u5220\u6389\u4E86\uFF0C\u5DF2\u6362\u6210\u6700\u65B0\u5185\u5BB9\u3002\u8BA1\u5212\u9700\u8981\u91CD\u65B0\u751F\u6210\u3002",
  "library.batch.behind": "\u6709 {n} \u6761\u521A\u88AB\u6539\u8FC7\uFF0C\u5DF2\u6362\u6210\u6700\u65B0\u5185\u5BB9\u3002\u8BA1\u5212\u9700\u8981\u91CD\u65B0\u751F\u6210\u3002",
  "library.batch.refreshing": "\u6B63\u5728\u6362\u6210\u6700\u65B0\u5185\u5BB9\u2026\u2026",
  "library.batch.partial": "\u53EA\u5E94\u7528\u4E86\u5176\u4E2D {n} \u6761\uFF0C\u5176\u4F59\u6CA1\u6709\u6539\u52A8",
  "library.batch.partialKept": "\u300C{names}\u300D\u9000\u56DE\u65F6\u5199\u76D8\u51FA\u9519\uFF0C\u4ECD\u662F\u8FD9\u6B21\u6539\u7684\u6837\u5B50\uFF0C\u53EF\u4EE5\u64A4\u9500",
  "library.batch.partialChanged": "\u300C{names}\u300D\u9000\u56DE\u524D\u53C8\u88AB\u522B\u5904\u6539\u8FC7\uFF0C\u505C\u5728\u90A3\u8FB9\u7684\u7248\u672C\uFF0C\u4E0D\u5728\u64A4\u9500\u8303\u56F4",
  "deleted.label": "\u5DF2\u5220\u9664",
  "deleted.when.today": "\u4ECA\u5929",
  "deleted.when.week": "\u8FD1 7 \u5929",
  "deleted.when.older": "\u66F4\u65E9 \xB7 7 \u5929\u5185\u5F7B\u5E95\u5220\u9664",
  "deleted.cause.keep": "\u4EE5\u300C{name}\u300D\u4E3A\u51C6\u65F6\u5220\u9664",
  "deleted.cause.keepA": "\u4EE5 A \u4E3A\u51C6\u65F6\u5220\u9664",
  "deleted.cause.keepB": "\u4EE5 B \u4E3A\u51C6\u65F6\u5220\u9664",
  "deleted.cause.baseline": "\u4EE5\u57FA\u7EBF\u4E3A\u51C6\u65F6\u5220\u9664",
  "deleted.cause.merged": "\u878D\u5408\u8FDB\u300C{name}\u300D\u65F6\u5220\u9664",
  "deleted.search.label": "\u641C\u7D22\u5DF2\u5220\u9664\u7684\u8BB0\u5FC6",
  "deleted.search.placeholder": "\u641C\u7D22\u5DF2\u5220\u9664\u7684\u8BB0\u5FC6",
  "deleted.search.none": "\u6CA1\u6709\u627E\u5230\u5339\u914D\u7684\u8BB0\u5FC6",
  "deleted.note": "\u5220\u9664\u7684\u8BB0\u5FC6\u4FDD\u7559 14 \u5929\uFF0C\u671F\u95F4\u53EF\u4EE5\u6062\u590D\u3002",
  "deleted.left.today": "\u8FD8\u80FD\u6062\u590D\u4E0D\u5230 1 \u5929",
  "deleted.left.days": "\u8FD8\u80FD\u6062\u590D {n} \u5929",
  "deleted.left.days.one": "\u8FD8\u80FD\u6062\u590D {n} \u5929",
  "deleted.restore": "\u6062\u590D",
  "deleted.restoreHint": "\u6062\u590D\u540E\u8FD9\u6761\u51B2\u7A81\u4F1A\u56DE\u5230\u300C\u7B49\u4F60\u51B3\u5B9A\u300D",
  "deleted.restoreHintMerged": "\u6062\u590D\u53EA\u5E26\u56DE\u8FD9\u4E00\u6761\uFF0C\u300C{name}\u300D\u4FDD\u6301\u878D\u5408\u540E\u7684\u6837\u5B50",
  "deleted.restored": "\u5DF2\u6062\u590D\u3002",
  "deleted.restoredConflict": "\u5DF2\u6062\u590D\uFF0C\u8FD9\u6761\u51B2\u7A81\u56DE\u5230\u4E86\u300C\u7B49\u4F60\u51B3\u5B9A\u300D\u3002",
  "deleted.hardDelete": "\u5F7B\u5E95\u5220\u9664\u2026",
  "deleted.hardDeleteConfirm": "\u73B0\u5728\u5C31\u5F7B\u5E95\u5220\u9664\u8FD9\u6761\u8BB0\u5FC6\uFF1F\u5220\u9664\u540E\u4E0D\u80FD\u6062\u590D\uFF0C\u4EE5\u524D\u5FEB\u7167\u91CC\u7684\u526F\u672C\u4E5F\u4E00\u8D77\u62B9\u6389\u3002",
  "deleted.hardDeleted": "\u5DF2\u5F7B\u5E95\u5220\u9664\u3002",
  "deleted.empty.title": "\u6700\u8FD1\u6CA1\u6709\u5220\u9664\u8FC7\u8BB0\u5FC6",
  "deleted.empty.body": "\u5220\u9664\u7684\u8BB0\u5FC6\u5728\u8FD9\u91CC\u4FDD\u7559 14 \u5929\uFF0C\u671F\u95F4\u53EF\u4EE5\u6062\u590D\uFF0C\u4E4B\u540E\u5F7B\u5E95\u6E05\u9664\u3002\u542B\u5BC6\u94A5\u7684\u8BB0\u5FC6\u5220\u9664\u65F6\u76F4\u63A5\u62B9\u6389\uFF0C\u4E0D\u8FDB\u8FD9\u91CC\u3002",
  "action.openFailed": "\u6CA1\u80FD\u6253\u5F00\uFF0CDeepSeek Harness \u62D2\u7EDD\u4E86\u8FD9\u4E2A\u8DEF\u5F84\u3002"
};
var libraryEn = {
  "library.search.label": "Search memories",
  "library.search.placeholder": "Search memory text",
  "library.search.none": "No matching memories",
  "library.storage.oneFile": "One file per memory",
  "library.storage.openDir": "Open folder",
  "library.issues.label": "Folder issues",
  "library.issue.duplicate-id": "Several files share one id: using {kept}, not {path}",
  "library.issue.reserved-keys": "The file sets fields the plugin manages ({keys}); they are ignored: {path}",
  "library.issue.marker-missing": "The folder has no .workspace marker and was not read: {path}",
  "library.issue.dir-unreadable": "The folder could not be read: {path}",
  "library.issue.other": "Folder issue: {path}",
  "library.openFile": "Open file",
  "library.delete": "Delete",
  "library.deletedResult": "Deleted. You can get it back from Recently deleted within 14 days.",
  "library.undo": "Undo",
  "library.empty.first.title": "No memories yet",
  "library.empty.first.body": "The agent writes memories during chats: preferences you stated, project conventions, decisions made. They show up here once written.",
  "library.empty.scope": "No memories here yet",
  "library.group.more": "Show {n} more",
  "library.group.less": "Show only the first {n}",
  "library.group.latest": "Latest {date}",
  "library.recent.day": "Last 24 hours",
  "library.recent.days3": "Last 3 days",
  "library.recent.week": "Last 7 days",
  "library.recent.older": "Earlier",
  "library.recent.quiet": "No memories saved or changed in the last 7 days.",
  "library.goScope": "View this in {scope}",
  "library.edit.discard": "Discard what you wrote?",
  "library.edit.discardConfirm": "Discard",
  "library.edit.justEdited": "Rewritten",
  "library.edit.modelDone": "Rewritten as you asked",
  "library.edit.manualDone": "Changes saved",
  "library.edit.stale": "This memory was just changed elsewhere, so the latest version is shown. Reopen Edit to change it.",
  "library.model.ask": "How should this memory change?",
  "library.model.intents": "Common requests (optional)",
  "library.model.placeholder": "Or type your own request, for example: \u201CRelease every Wednesday\u201D is out of date; it is Thursday now, go with that.",
  "library.model.empty": "Write a request first, or start from a common request",
  "library.model.note": "The model rewrites this memory from the original and your request and keeps the format intact, which is safer than editing the file by hand. It uses only what you write and adds nothing on its own. This uses a few tokens.",
  "library.intent.compress": "Condense",
  "library.intent.compress.template": "Condense into key points. Keep ___; ___ can go.",
  "library.intent.clarify": "Clarify",
  "library.intent.clarify.template": "\u201C___\u201D is vague; it means ___.",
  "library.intent.correct": "Correct",
  "library.intent.correct.template": "\u201C___\u201D is no longer right. It is now \u201C___\u201D; go with this.",
  "library.intent.supplement": "Add info",
  "library.intent.supplement.template": "Add: ___ (not in the original; add it as I wrote).",
  "library.intent.resolve": "Resolve conflict",
  "library.intent.resolve.template": "These disagree on ___. Go with ___ and change the old wording everywhere.",
  "library.intent.dedupe": "Merge duplicates",
  "library.intent.dedupe.template": "___ say the same thing. Merge them into one and keep what each one adds.",
  "library.intent.prune": "Drop outdated",
  "library.intent.prune.template": "Anything about ___ is out of date; delete it. ___ still holds; keep it.",
  "library.intent.unify": "Unify wording",
  "library.intent.unify.template": "Call ___ \u201C___\u201D everywhere.",
  "library.select": "Select",
  "library.select.done": "Done",
  "library.select.row": "Select \u201C{name}\u201D",
  "library.select.secret": "Memories containing secrets are not sent to the model",
  "library.select.noVersion": "This memory\u2019s version could not be read. Refresh first",
  "library.select.bar": "Selection actions",
  "library.select.count": "{n} selected",
  "library.select.tooMany": "{n} selected \xB7 You can tidy up to {max} at a time; narrow it down with search first",
  "library.select.tooFew": "Select at least 2 to tidy",
  "library.select.all": "Select all results",
  "library.select.cancel": "Cancel",
  "library.select.tidy": "Tidy selected\u2026",
  "library.batch.title": "Tidy {n} selected",
  "library.batch.back": "Back to list",
  "library.batch.steps": "Steps",
  "library.batch.step.request": "Write request",
  "library.batch.step.plan": "Review plan",
  "library.batch.step.apply": "Compare and apply",
  "library.batch.picked": "Selected memories",
  "library.batch.count": "{n} selected",
  "library.batch.unpick": "Leave out \u201C{name}\u201D",
  "library.batch.unpickHint": "Leave this one out",
  "library.batch.ask": "How should these be tidied?",
  "library.batch.placeholder": "Or type your own request, for example: These disagree on the formatter. Go with biome and change the old wording everywhere.",
  "library.batch.note": "The model drafts a tidy plan first; once you confirm it, it refines the memories one by one. Tidying uses tokens.",
  "library.batch.generate": "Draft tidy plan",
  "library.batch.planning": "Drafting the tidy plan\u2026",
  "library.batch.understanding": "How the model reads it",
  "library.batch.ops": "Tidy plan",
  "library.batch.action.rewrite": "Rewrite",
  "library.batch.action.delete": "Delete",
  "library.batch.action.keep": "Keep",
  "library.batch.op": "{action} \u201C{name}\u201D",
  "library.batch.into": "Merged into: {name}",
  "library.batch.held": "The rewrite that takes this in was unchecked, so this one stays for now",
  "library.batch.decide": "Your call:",
  "library.batch.summary": "{changes} changes \xB7 {keeps} unchanged \xB7 The plan writes nothing",
  "library.batch.revise": "Edit request",
  "library.batch.draft": "Draft from plan",
  "library.batch.next": "Next",
  "library.batch.noChange": "Check at least one change",
  "library.batch.drafting": "Drafting from the plan\u2026",
  "library.batch.items": "Changes to compare",
  "library.batch.drop": "Drop this",
  "library.batch.restore": "Restore this",
  "library.batch.againAsk": "What else should change here?",
  "library.batch.deleteNote": "After applying, this moves to Recently deleted and can be restored within 14 days.",
  "library.batch.dropHeld": "The rewrite that takes this in was dropped, so this one stays for now",
  "library.batch.applySummary": "Applying {n}: {deletes} deleted, {rewrites} rewritten",
  "library.batch.discardAll": "Discard all",
  "library.batch.applyAll": "Apply all",
  "library.batch.nothing": "Keep at least one change",
  "library.batch.waitItem": "Wait for this draft to finish before applying",
  "library.batch.confirmDelete": "This deletes {n}: \u201C{names}\u201D. Apply?",
  "library.batch.nameSep": "\u201D, \u201C",
  "library.batch.confirmApply": "Apply",
  "library.batch.done": "Tidied {n}: {deletes} deleted, {rewrites} rewritten, {kept} unchanged",
  "library.batch.doneDeleted": "Deleted ones are in Recently deleted and can be restored within 14 days",
  "library.batch.undoAll": "Undo all",
  "library.batch.undone": "Undid this tidy: {n} restored",
  "library.batch.undoStale": "Some of these were changed afterwards, so they can\u2019t be undone together",
  "library.batch.stale": "Some of these just changed or were deleted elsewhere and now show the latest version. The plan needs to be generated again.",
  "library.batch.behind": "{n} of these just changed elsewhere and now show the latest version. The plan needs to be generated again.",
  "library.batch.refreshing": "Loading the latest version\u2026",
  "library.batch.partial": "Applied only {n} of these; the rest are unchanged",
  "library.batch.partialKept": "\u201C{names}\u201D hit a write error while rolling back and stays as applied; Undo all covers it",
  "library.batch.partialChanged": "\u201C{names}\u201D changed elsewhere before it could be rolled back; it keeps that version and Undo all leaves it alone",
  "deleted.label": "Deleted",
  "deleted.when.today": "Today",
  "deleted.when.week": "Last 7 days",
  "deleted.when.older": "Earlier \xB7 purged within 7 days",
  "deleted.cause.keep": "Deleted when going with \u201C{name}\u201D",
  "deleted.cause.keepA": "Deleted when going with A",
  "deleted.cause.keepB": "Deleted when going with B",
  "deleted.cause.baseline": "Deleted when going with the baseline",
  "deleted.cause.merged": "Deleted when merged into \u201C{name}\u201D",
  "deleted.search.label": "Search deleted memories",
  "deleted.search.placeholder": "Search deleted memories",
  "deleted.search.none": "No matching memories",
  "deleted.note": "Deleted memories are kept for 14 days and can be restored in that time.",
  "deleted.left.today": "Less than a day left",
  "deleted.left.days": "{n} days left",
  "deleted.left.days.one": "{n} day left",
  "deleted.restore": "Restore",
  "deleted.restoreHint": "Restoring puts this conflict back under Waiting on you",
  "deleted.restoreHintMerged": "Restoring brings back only this one; \u201C{name}\u201D keeps the merged text",
  "deleted.restored": "Restored.",
  "deleted.restoredConflict": "Restored. The conflict is back under Waiting on you.",
  "deleted.hardDelete": "Delete permanently\u2026",
  "deleted.hardDeleteConfirm": "Delete this memory permanently now? This cannot be undone, and copies in earlier snapshots are erased too.",
  "deleted.hardDeleted": "Deleted permanently.",
  "deleted.empty.title": "Nothing recently deleted",
  "deleted.empty.body": "Deleted memories stay here for 14 days and can be restored, then they are purged. Memories containing secrets are erased on delete and never land here.",
  "action.openFailed": "Could not open it; DeepSeek Harness refused this path."
};

// client/locales/chat.ts
var chatZh = {
  "chat.command.title": "\u8BB0\u5FC6",
  "chat.command.info": "\u67E5\u627E\u8BB0\u5FC6\u6240\u5728\u4F4D\u7F6E",
  "chat.command.modelInfo": "\u67E5\u770B\u53EF\u7528\u7684\u6A21\u578B",
  "chat.command.refreshViews": "\u5237\u65B0\u8BB0\u5FC6\u89C6\u56FE",
  "chat.command.draftEdit": "\u8BA9\u6A21\u578B\u8D77\u8349\u4FEE\u6539",
  "chat.command.suggest": "\u8BA9\u6A21\u578B\u7ED9\u51B2\u7A81\u8865\u4E0A\u5EFA\u8BAE",
  "chat.command.applyProposal": "\u91C7\u7EB3\u6A21\u578B\u5BF9\u51B2\u7A81\u7684\u5EFA\u8BAE",
  "chat.command.draftProposal": "\u8BA9\u6A21\u578B\u6309\u4F60\u7684\u8981\u6C42\u51FA\u51B2\u7A81\u7684\u5904\u7406\u65B9\u6848",
  "chat.command.applyRequestedProposal": "\u6309\u4F60\u7684\u8981\u6C42\u5904\u7406\u51B2\u7A81",
  "chat.command.planEdits": "\u8BA9\u6A21\u578B\u5217\u6574\u7406\u8BA1\u5212",
  "chat.command.draftPlan": "\u8BA9\u6A21\u578B\u6309\u8BA1\u5212\u51FA\u7A3F",
  "chat.command.resolve.one": "\u88C1\u51B3\u51B2\u7A81\uFF0C\u7559\u4E0B\u4E00\u6761",
  "chat.command.resolve.both": "\u88C1\u51B3\u51B2\u7A81\uFF0C\u4E24\u6761\u90FD\u7559\u4E0B",
  "chat.command.undo": "\u64A4\u9500\u4E00\u6B21\u5904\u7406",
  "chat.command.promote.global": "\u63D0\u5347\u4E3A\u5168\u5C40",
  "chat.command.promote.agentsMd": "\u5199\u8FDB AGENTS.md",
  "chat.command.keepLocal": "\u7559\u5728\u672C\u9879\u76EE",
  "chat.command.move": "\u79FB\u5230\u9879\u76EE\u300C{name}\u300D",
  "chat.command.forget": "\u5220\u9664\u4E00\u6761\u8BB0\u5FC6",
  "chat.command.restore": "\u6062\u590D\u4E00\u6761\u8BB0\u5FC6",
  "chat.command.hardDelete": "\u5F7B\u5E95\u5220\u9664\u4E00\u6761\u8BB0\u5FC6",
  "chat.command.confirm": "\u786E\u8BA4\u8BB0\u5FC6\u4ECD\u7136\u51C6\u786E",
  "chat.command.edit": "\u4FEE\u6539\u4E00\u6761\u8BB0\u5FC6",
  "chat.command.merge": "\u5408\u5E76\u4E24\u6761\u8BB0\u5FC6",
  "chat.command.applyEdits": "\u6574\u7406 {n} \u6761\u8BB0\u5FC6",
  "chat.command.dismissOverflow": "\u4E0D\u518D\u63D0\u9192\u8D85\u51FA\u4E0A\u9650",
  "chat.command.ignoreAdvice": "\u4E0D\u518D\u63D0\u9192\u8FD9\u6761\u5EFA\u8BAE",
  "chat.command.unignoreAdvice": "\u6062\u590D\u63D0\u9192\u5EFA\u8BAE",
  "chat.command.scan": "\u4F53\u68C0\u8BB0\u5FC6",
  "chat.command.autoCheckup": "\u4FEE\u6539\u81EA\u52A8\u4F53\u68C0\u9891\u7387",
  "chat.command.migrateType": "\u5904\u7406\u7C7B\u578B\u300C{name}\u300D\u7684\u8BB0\u5FC6",
  "chat.command.unknown": "\u6267\u884C\u8BB0\u5FC6\u547D\u4EE4",
  "chat.command.running": "{action}\u2026",
  "chat.command.awaiting": "{action}\uFF1A\u9700\u8981\u4F60\u786E\u8BA4",
  "chat.command.elsewhere": "{action}\uFF1A\u522B\u5904\u5DF2\u5904\u7406",
  "chat.command.busy": "{action}\uFF1A\u5DF2\u6709\u4F53\u68C0\u5728\u8FDB\u884C",
  "chat.command.failed": "{action}\uFF1A\u6CA1\u6709\u6210\u529F\uFF0C{reason}",
  "chat.command.failed.noReason": "{action}\uFF1A\u6CA1\u6709\u6210\u529F",
  "chat.tool.save.running": "\u6B63\u5728\u8BB0\u4F4F\u300C{name}\u300D",
  "chat.tool.save.saved": "\u5DF2\u8BB0\u4F4F\u300C{name}\u300D",
  "chat.tool.save.updated": "\u5DF2\u66F4\u65B0\u300C{name}\u300D",
  "chat.tool.save.notSaved": "\u6CA1\u6709\u8BB0\u4F4F\u300C{name}\u300D",
  "chat.tool.save.confirmingGlobal": "\u300C{name}\u300D\u662F\u5168\u5C40\u8BB0\u5FC6\uFF0C\u786E\u8BA4\u540E\u518D\u6539",
  "chat.tool.search.running": "\u6B63\u5728\u641C\u7D22\u300C{query}\u300D",
  "chat.tool.search.found": "\u641C\u5230 {count} \u6761\u300C{query}\u300D",
  "chat.tool.search.none": "\u6CA1\u6709\u641C\u5230\u300C{query}\u300D",
  "chat.tool.forget.running": "\u6B63\u5728\u5220\u9664 {count} \u6761\u8BB0\u5FC6",
  "chat.tool.forget.running.one": "\u6B63\u5728\u5220\u9664 {count} \u6761\u8BB0\u5FC6",
  "chat.tool.forget.done": "\u5DF2\u5220\u9664 {count} \u6761\u8BB0\u5FC6",
  "chat.tool.forget.done.one": "\u5DF2\u5220\u9664 {count} \u6761\u8BB0\u5FC6",
  "chat.tool.forget.none": "\u6CA1\u6709\u53EF\u5220\u9664\u7684\u8BB0\u5FC6",
  "chat.tool.snapshot.create": "\u5EFA\u4E00\u4EFD\u5FEB\u7167",
  "chat.tool.snapshot.list": "\u67E5\u770B\u5FEB\u7167\u5217\u8868",
  "chat.tool.snapshot.show": "\u67E5\u770B\u5FEB\u7167 {id}",
  "chat.tool.snapshot.restore": "\u4ECE\u5FEB\u7167 {id} \u6062\u590D",
  "chat.tool.source": "\u56DE\u67E5\u8BB0\u5FC6\u51FA\u5904 {id}",
  "chat.tool.confirm.refresh": "\u786E\u8BA4\u8BB0\u5FC6\u4ECD\u7136\u51C6\u786E {id}",
  "chat.tool.confirm.resolve": "\u88C1\u51B3\u51B2\u7A81 {id}",
  "chat.tool.confirm.acceptSubagent": "\u63A5\u53D7\u5B50 agent \u5B58\u7684\u8BB0\u5FC6 {id}",
  "chat.tool.scan": "\u4F53\u68C0{scope}",
  "chat.tool.health": "\u67E5\u770B{scope}\u7684\u5065\u5EB7\u5206",
  "chat.tool.promote.global": "\u628A {count} \u6761\u63D0\u5347\u4E3A\u5168\u5C40",
  "chat.tool.promote.agentsMd": "\u628A {count} \u6761\u5199\u8FDB AGENTS.md",
  "chat.tool.promote.dismiss": "{count} \u6761\u4E0D\u63D0\u5347",
  "chat.scope.workspace": "\u672C\u9879\u76EE",
  "chat.scope.all": "\u5168\u90E8\u8BB0\u5FC6",
  "chat.scope.path": "\u300C{name}\u300D",
  "chat.scope.paths": " {count} \u4E2A\u9879\u76EE",
  "chat.scope.paths.one": " {count} \u4E2A\u9879\u76EE",
  "chat.card.title": "\u8FD9\u4E00\u8F6E\u8BB0\u4F4F\u4E86 {count} \u6761",
  "chat.card.folded": "\u8FD9\u8F6E\u8BB0\u4F4F\u4E86 {count} \u6761\u65B0\u8BB0\u5FC6\uFF1A",
  "chat.card.folded.one": "\u8FD9\u8F6E\u8BB0\u4F4F\u4E86 {count} \u6761\u65B0\u8BB0\u5FC6\uFF1A",
  "chat.card.folded.promote": "{count} \u6761\u53EF\u63D0\u5347\u4E3A\u5168\u5C40",
  "chat.card.delete": "\u5220\u9664\u8FD9\u6761\u8BB0\u5FC6",
  "chat.card.deleted": "\u5DF2\u5220\u9664\u300214 \u5929\u5185\u4E5F\u80FD\u5728\u6700\u8FD1\u5220\u9664\u91CC\u627E\u56DE\u3002",
  "chat.card.undo": "\u64A4\u9500",
  "chat.card.detail": "\u67E5\u770B\u8BE6\u60C5 \u203A",
  "chat.card.title.rewritten": "\u8FD9\u4E00\u8F6E\u6539\u5199\u4E86 {count} \u6761",
  "chat.card.title.mixed": "\u8FD9\u4E00\u8F6E\u8BB0\u4F4F\u4E86 {count} \u6761\u3001\u6539\u5199\u4E86 {rewritten} \u6761",
  "chat.card.folded.rewritten": "\u8FD9\u8F6E\u6539\u5199\u4E86 {count} \u6761\u8BB0\u5FC6\uFF1A",
  "chat.card.folded.rewritten.one": "\u8FD9\u8F6E\u6539\u5199\u4E86 {count} \u6761\u8BB0\u5FC6\uFF1A",
  "chat.card.folded.mixed": "\u8FD9\u8F6E\u8BB0\u4F4F\u4E86 {count} \u6761\u65B0\u8BB0\u5FC6\u3001\u6539\u5199\u4E86 {rewritten} \u6761\uFF1A",
  "chat.card.folded.superseded": "\u66FF\u4EE3\u4E86 {count} \u6761\u65E7\u8BB0\u5FC6",
  "chat.change.rewritten": "\u5DF2\u6539\u5199",
  "chat.change.rewrittenGlobal": "\u5168\u5C40\u8BB0\u5FC6\uFF0C\u5F71\u54CD\u6240\u6709\u9879\u76EE",
  "chat.change.compare": "\u6539\u524D / \u6539\u540E \u203A",
  "chat.change.before": "\u6539\u524D",
  "chat.change.after": "\u6539\u540E",
  "chat.change.superseded": "\u66FF\u4EE3\u4E86\u300C{name}\u300D",
  "chat.change.supersededBy": "\u300C{by}\u300D\u66FF\u4EE3\u4E86\u300C{name}\u300D",
  "chat.change.supersededOlder": "\u66FF\u4EE3\u4E86 {count} \u6761\u65E7\u8BB0\u5FC6",
  "chat.change.supersededOlder.one": "\u66FF\u4EE3\u4E86 {count} \u6761\u65E7\u8BB0\u5FC6",
  "chat.change.undo": "\u64A4\u9500\u4FEE\u6539",
  "chat.change.undone": "\u5DF2\u64A4\u9500",
  "chat.change.changed": "\u4E4B\u540E\u53C8\u6539\u8FC7\uFF0C\u6CA1\u6CD5\u76F4\u63A5\u64A4\u9500",
  "chat.change.expired": "\u6539\u524D\u7248\u672C\u5DF2\u8D85\u8FC7 14 \u5929\uFF0C\u65E0\u6CD5\u6062\u590D"
};
var chatEn = {
  "chat.command.title": "Memory",
  "chat.command.info": "Locate memories",
  "chat.command.modelInfo": "Check the model",
  "chat.command.refreshViews": "Refresh memory views",
  "chat.command.draftEdit": "Ask the model for an edit",
  "chat.command.suggest": "Ask the model to suggest how to settle a conflict",
  "chat.command.applyProposal": "Adopt the model\u2019s suggestion for a conflict",
  "chat.command.draftProposal": "Ask the model for a plan to settle a conflict your way",
  "chat.command.applyRequestedProposal": "Settle a conflict as you asked",
  "chat.command.planEdits": "Ask the model for a tidy plan",
  "chat.command.draftPlan": "Ask the model to draft from the plan",
  "chat.command.resolve.one": "Resolve a conflict, keep one",
  "chat.command.resolve.both": "Resolve a conflict, keep both",
  "chat.command.undo": "Undo a decision",
  "chat.command.promote.global": "Promote to global",
  "chat.command.promote.agentsMd": "Write into AGENTS.md",
  "chat.command.keepLocal": "Keep in this project",
  "chat.command.move": "Move to project \u201C{name}\u201D",
  "chat.command.forget": "Delete a memory",
  "chat.command.restore": "Restore a memory",
  "chat.command.hardDelete": "Permanently delete a memory",
  "chat.command.confirm": "Confirm a memory is still accurate",
  "chat.command.edit": "Edit a memory",
  "chat.command.merge": "Merge two memories",
  "chat.command.applyEdits": "Tidy {n} memories",
  "chat.command.dismissOverflow": "Stop the over-limit reminder",
  "chat.command.ignoreAdvice": "Stop this suggestion",
  "chat.command.unignoreAdvice": "Bring back a suggestion",
  "chat.command.scan": "Check up on memories",
  "chat.command.autoCheckup": "Change automatic checkups",
  "chat.command.migrateType": "Handle memories of type \u201C{name}\u201D",
  "chat.command.unknown": "Run a memory command",
  "chat.command.running": "{action}\u2026",
  "chat.command.awaiting": "{action}: needs your confirmation",
  "chat.command.elsewhere": "{action}: already handled elsewhere",
  "chat.command.busy": "{action}: a checkup is already running",
  "chat.command.failed": "{action}: didn\u2019t go through. {reason}",
  "chat.command.failed.noReason": "{action}: didn\u2019t go through",
  "chat.tool.save.running": "Remembering \u201C{name}\u201D",
  "chat.tool.save.saved": "Remembered \u201C{name}\u201D",
  "chat.tool.save.updated": "Updated \u201C{name}\u201D",
  "chat.tool.save.notSaved": "Did not remember \u201C{name}\u201D",
  "chat.tool.save.confirmingGlobal": "\u201C{name}\u201D is a global memory; confirming before changing it",
  "chat.tool.search.running": "Searching \u201C{query}\u201D",
  "chat.tool.search.found": "Found {count} for \u201C{query}\u201D",
  "chat.tool.search.none": "Nothing found for \u201C{query}\u201D",
  "chat.tool.forget.running": "Deleting {count} memories",
  "chat.tool.forget.running.one": "Deleting {count} memory",
  "chat.tool.forget.done": "Deleted {count} memories",
  "chat.tool.forget.done.one": "Deleted {count} memory",
  "chat.tool.forget.none": "Nothing to delete",
  "chat.tool.snapshot.create": "Take a snapshot",
  "chat.tool.snapshot.list": "List snapshots",
  "chat.tool.snapshot.show": "View snapshot {id}",
  "chat.tool.snapshot.restore": "Restore from snapshot {id}",
  "chat.tool.source": "Trace where {id} came from",
  "chat.tool.confirm.refresh": "Confirm {id} is still accurate",
  "chat.tool.confirm.resolve": "Resolve conflict {id}",
  "chat.tool.confirm.acceptSubagent": "Accept {id} saved by a subagent",
  "chat.tool.scan": "Checkup: {scope}",
  "chat.tool.health": "Health score: {scope}",
  "chat.tool.promote.global": "Promote {count} to global",
  "chat.tool.promote.agentsMd": "Write {count} into AGENTS.md",
  "chat.tool.promote.dismiss": "Keep {count} in this project",
  "chat.scope.workspace": "this project",
  "chat.scope.all": "all memories",
  "chat.scope.path": "{name}",
  "chat.scope.paths": "{count} projects",
  "chat.scope.paths.one": "{count} project",
  "chat.card.title": "Remembered {count} this turn",
  "chat.card.folded": "Remembered {count} new memories this turn: ",
  "chat.card.folded.one": "Remembered {count} new memory this turn: ",
  "chat.card.folded.promote": "{count} could become global",
  "chat.card.delete": "Delete this memory",
  "chat.card.deleted": "Deleted. You can also find it in Recently deleted for 14 days.",
  "chat.card.undo": "Undo",
  "chat.card.detail": "View details \u203A",
  "chat.card.title.rewritten": "Rewrote {count} this turn",
  "chat.card.title.mixed": "Remembered {count} and rewrote {rewritten} this turn",
  "chat.card.folded.rewritten": "Rewrote {count} memories this turn: ",
  "chat.card.folded.rewritten.one": "Rewrote {count} memory this turn: ",
  "chat.card.folded.mixed": "Remembered {count} new and rewrote {rewritten} this turn: ",
  "chat.card.folded.superseded": "replaced {count} older",
  "chat.change.rewritten": "Rewritten",
  "chat.change.rewrittenGlobal": "Global memory, applies to every project",
  "chat.change.compare": "Before / after \u203A",
  "chat.change.before": "Before",
  "chat.change.after": "After",
  "chat.change.superseded": "Replaced \u201C{name}\u201D",
  "chat.change.supersededBy": "\u201C{by}\u201D replaced \u201C{name}\u201D",
  "chat.change.supersededOlder": "Replaced {count} older memories",
  "chat.change.supersededOlder.one": "Replaced {count} older memory",
  "chat.change.undo": "Undo change",
  "chat.change.undone": "Undone",
  "chat.change.changed": "Changed again since, so it can\u2019t be undone directly",
  "chat.change.expired": "The earlier version is over 14 days old and can\u2019t be restored"
};

// client/locales/health.ts
var healthZh = {
  "health.score": "{score} \u5206",
  "health.tier.green": "\u826F\u597D",
  "health.tier.amber": "\u9700\u8981\u7559\u610F",
  "health.tier.red": "\u6709\u95EE\u9898",
  "health.unscored": "\u8FD8\u6CA1\u4F53\u68C0\u8FC7\uFF0C\u4F53\u68C0\u540E\u6253\u5206"
};
var healthEn = {
  "health.score": "Score {score}",
  "health.tier.green": "Good",
  "health.tier.amber": "Needs attention",
  "health.tier.red": "Has problems",
  "health.unscored": "Not checked yet; scored after a checkup"
};

// client/locales/checkup.ts
var checkupZh = {
  "checkup.run": "\u7ACB\u5373\u4F53\u68C0",
  "checkup.running": "\u4F53\u68C0\u4E2D\u2026",
  "checkup.run.hint.all": "\u9010\u4E2A\u68C0\u67E5\u5168\u5C40\u548C {n} \u4E2A\u9879\u76EE\u7684\u8BB0\u5FC6\uFF1B\u8BB0\u5FC6\u8D8A\u591A\uFF0C\u7528\u7684 token \u8D8A\u591A",
  "checkup.run.hint.all.one": "\u9010\u4E2A\u68C0\u67E5\u5168\u5C40\u548C {n} \u4E2A\u9879\u76EE\u7684\u8BB0\u5FC6\uFF1B\u8BB0\u5FC6\u8D8A\u591A\uFF0C\u7528\u7684 token \u8D8A\u591A",
  "checkup.run.hint.global": "\u53EA\u68C0\u67E5\u5168\u5C40\u8BB0\u5FC6\uFF1B\u8BB0\u5FC6\u8D8A\u591A\uFF0C\u7528\u7684 token \u8D8A\u591A",
  "checkup.run.hint.workspace": "\u68C0\u67E5 {name} \u7684\u8BB0\u5FC6\uFF1B\u8BB0\u5FC6\u8D8A\u591A\uFF0C\u7528\u7684 token \u8D8A\u591A",
  "checkup.run.busy.all": "\u5168\u90E8\u8BB0\u5FC6\u6B63\u5728\u4F53\u68C0\uFF0C\u67E5\u5B8C\u518D\u6765",
  "checkup.run.busy.global": "\u5168\u5C40\u8BB0\u5FC6\u6B63\u5728\u4F53\u68C0\uFF0C\u67E5\u5B8C\u518D\u6765",
  "checkup.run.busy.workspace": "{name} \u6B63\u5728\u4F53\u68C0\uFF0C\u67E5\u5B8C\u518D\u6765",
  "checkup.run.empty.all": "\u6682\u65F6\u6CA1\u6709\u8BB0\u5FC6\uFF0C\u6CA1\u6709\u53EF\u4F53\u68C0\u7684\u5185\u5BB9\u3002",
  "checkup.run.empty.global": "\u5168\u5C40\u6682\u65F6\u6CA1\u6709\u8BB0\u5FC6\uFF0C\u6CA1\u6709\u53EF\u4F53\u68C0\u7684\u5185\u5BB9\u3002",
  "checkup.run.empty.workspace": "\u8FD9\u4E2A\u9879\u76EE\u6682\u65F6\u6CA1\u6709\u8BB0\u5FC6\uFF0C\u6CA1\u6709\u53EF\u4F53\u68C0\u7684\u5185\u5BB9\u3002",
  "checkup.auto": "\u81EA\u52A8\u4F53\u68C0",
  "checkup.auto.manual": "\u4EC5\u624B\u52A8",
  "checkup.auto.daily": "\u6BCF\u5929",
  "checkup.auto.days": "\u6BCF {n} \u5929",
  "checkup.auto.title.all": "\u5168\u90E8\u8BB0\u5FC6\u7684\u81EA\u52A8\u4F53\u68C0",
  "checkup.auto.title.global": "\u5168\u5C40\u8BB0\u5FC6\u7684\u81EA\u52A8\u4F53\u68C0",
  "checkup.auto.title.workspace": "{name} \u7684\u81EA\u52A8\u4F53\u68C0",
  "checkup.auto.aria": "{title}\uFF1A{value}",
  "checkup.auto.aria.follow": "{title}\uFF1A{value}\uFF0C\u8DDF\u968F\u5168\u90E8",
  "checkup.auto.aria.own": "{title}\uFF1A{value}\uFF0C\u5355\u72EC\u8BBE\u7F6E",
  "checkup.auto.follow": "\u8DDF\u968F\u5168\u90E8\uFF08{value}\uFF09",
  "checkup.auto.follow.hint": "\u300C\u5168\u90E8\u300D\u6539\u4E86\uFF0C\u8FD9\u91CC\u8DDF\u7740\u6539\u3002",
  "checkup.auto.manual.hint": "\u53EA\u5728\u4F60\u70B9\u300C\u7ACB\u5373\u4F53\u68C0\u300D\u65F6\u68C0\u67E5\u3002",
  "checkup.auto.daily.hint": "dsh \u5F00\u7740\u65F6\uFF0C\u8DDD\u4E0A\u6B21\u4F53\u68C0\u6EE1 24 \u5C0F\u65F6\u5C31\u5728\u540E\u53F0\u67E5\u4E00\u6B21\u3002",
  "checkup.auto.days.before": "\u6BCF",
  "checkup.auto.days.after": "\u5929",
  "checkup.auto.days.input": "\u5929\u6570",
  "checkup.auto.days.input.checked": "\u5929\u6570\uFF0C\u5DF2\u9009\u4E2D",
  "checkup.auto.days.hint": "dsh \u5F00\u7740\u65F6\uFF0C\u8DDD\u4E0A\u6B21\u4F53\u68C0\u6EE1\u8FD9\u4E48\u591A\u5929\u5C31\u5728\u540E\u53F0\u67E5\u4E00\u6B21\u3002",
  "checkup.auto.days.invalid": "\u586B 1 \u5230 90 \u7684\u6574\u6570\u3002",
  "checkup.auto.own.title": "\u5355\u72EC\u8BBE\u7F6E\u7684\uFF0C\u4E0D\u8DDF\u8FD9\u91CC",
  "checkup.auto.own.row": "{name} \xB7 {value}",
  "checkup.auto.own.back": "\u6539\u56DE\u8DDF\u968F",
  "checkup.auto.own.backAria": "{name} \u6539\u56DE\u8DDF\u968F",
  "checkup.auto.foot": "{scope}{model}",
  "checkup.auto.foot.all": "\u5168\u5C40\u548C\u5404\u9879\u76EE\u90FD\u6309\u8FD9\u4E2A\u9891\u7387\u67E5\uFF0C\u5404\u81EA\u8BA1\u65F6\uFF1B\u65B0\u9879\u76EE\u4E5F\u4E00\u6837\u3002",
  "checkup.auto.foot.allOwn": "\u5176\u4F59\u8303\u56F4\u548C\u65B0\u9879\u76EE\u90FD\u6309\u8FD9\u4E2A\u9891\u7387\u67E5\uFF0C\u5404\u81EA\u8BA1\u65F6\u3002",
  "checkup.auto.foot.global": "\u53EA\u67E5\u5168\u5C40\u8BB0\u5FC6\u3002",
  "checkup.auto.foot.workspace": "\u53EA\u67E5 {name} \u7684\u8BB0\u5FC6\u3002",
  "checkup.auto.foot.model": "\u7528 dsh \u5F53\u524D\u7684\u9ED8\u8BA4\u6A21\u578B\u68C0\u67E5\u5185\u5BB9\u3001\u7ED9\u65B0\u51B2\u7A81\u51FA\u5904\u7406\u5EFA\u8BAE\uFF0C\u8BB0\u5FC6\u8D8A\u591A\uFF0Ctoken \u7528\u5F97\u8D8A\u591A\uFF1Bdsh \u6CA1\u5F00\u65F6\u4E0D\u67E5\uFF0C\u6253\u5F00\u540E\u8865\u4E0A\u3002",
  "checkup.auto.saveFailed": "\u6CA1\u6709\u4FDD\u5B58\u6210\u529F\uFF0C\u518D\u8BD5\u4E00\u6B21\u3002",
  "checkup.status.count": "{n} \u6761\u8BB0\u5FC6",
  "checkup.status.count.one": "{n} \u6761\u8BB0\u5FC6",
  "checkup.status.last": "\u4E0A\u6B21\u4F53\u68C0 {date}",
  "checkup.status.next": "\u4E0B\u6B21\u81EA\u52A8\u4F53\u68C0 {time} \u540E",
  "checkup.status.due": "\u81EA\u52A8\u4F53\u68C0\u5DF2\u5230\u671F\uFF0C\u9A6C\u4E0A\u5728\u540E\u53F0\u67E5",
  "checkup.status.why": "\u5206\u6570\u600E\u4E48\u6765\u7684",
  "checkup.status.deduction": "{label}\u6263 {points} \u5206\uFF1A{types}",
  "checkup.status.deduction.bare": "{label}\u6263 {points} \u5206",
  "checkup.status.deduction.rule": "\u89C4\u5219\u68C0\u67E5",
  "checkup.status.deduction.content": "\u5185\u5BB9\u68C0\u67E5",
  "checkup.status.deduction.freshness": "\u65B0\u9C9C\u5EA6",
  "checkup.status.noDeduction": "\u6CA1\u6709\u6263\u5206",
  "checkup.status.listSep": "\u3001",
  "checkup.status.issue.expired": "\u5DF2\u8FC7\u6709\u6548\u671F",
  "checkup.status.issue.bloat": "\u5185\u5BB9\u8FC7\u957F",
  "checkup.status.issue.orphan": "\u6307\u5411\u7684\u65E7\u8BB0\u5FC6\u5DF2\u4E0D\u5728",
  "checkup.status.issue.malformed": "\u6587\u4EF6\u8BFB\u4E0D\u51FA\u6765",
  "checkup.status.issue.conflict": "\u8BB0\u5FC6\u51B2\u7A81",
  "checkup.status.issue.redundancy": "\u5185\u5BB9\u91CD\u590D",
  "checkup.status.issue.misplaced": "\u653E\u9519\u5C42",
  "checkup.status.issue.unclear": "\u8868\u8FF0\u4E0D\u6E05",
  "checkup.status.issue.stale": "\u5F88\u4E45\u6CA1\u786E\u8BA4",
  "checkup.status.all.secret": "{name} \u6709\u5BC6\u94A5\u8981\u5148\u5904\u7406",
  "checkup.status.all.secret.global": "\u5168\u5C40\u6709\u5BC6\u94A5\u8981\u5148\u5904\u7406",
  "checkup.status.all.todo": "{name} \u6709\u4E8B\u7B49\u4F60\u51B3\u5B9A",
  "checkup.status.all.todo.global": "\u5168\u5C40\u6709\u4E8B\u7B49\u4F60\u51B3\u5B9A",
  "checkup.status.all.clear": "\u6CA1\u6709\u8981\u4F60\u51B3\u5B9A\u7684\u4E8B",
  "checkup.status.all.count": "{scopes}\uFF0C\u5171 {n} \u6761\u8BB0\u5FC6",
  "checkup.status.all.count.one": "{scopes}\uFF0C\u5171 {n} \u6761\u8BB0\u5FC6",
  "checkup.status.all.auto": "{frequency}\u81EA\u52A8\u4F53\u68C0\u5168\u90E8\u8BB0\u5FC6",
  "checkup.status.all.autoOwn": "{frequency}\u81EA\u52A8\u4F53\u68C0\uFF0C{names} \u5355\u72EC\u8BBE\u7F6E",
  "checkup.status.all.manualOwn": "\u9ED8\u8BA4\u4EC5\u624B\u52A8\uFF0C{names} \u5355\u72EC\u8BBE\u7F6E",
  "checkup.result.running.all": "\u6B63\u5728\u4F53\u68C0\u5168\u90E8\u8BB0\u5FC6\uFF0C\u53EF\u4EE5\u5148\u505A\u522B\u7684",
  "checkup.result.running.global": "\u6B63\u5728\u4F53\u68C0\u5168\u5C40\u8BB0\u5FC6\uFF0C\u53EF\u4EE5\u5148\u505A\u522B\u7684",
  "checkup.result.running.workspace": "\u6B63\u5728\u4F53\u68C0 {name} \u7684\u8BB0\u5FC6\uFF0C\u53EF\u4EE5\u5148\u505A\u522B\u7684",
  "checkup.result.done": "\u4F53\u68C0\u5B8C\u6210\uFF1A",
  "checkup.result.autoDone": "\u81EA\u52A8\u4F53\u68C0\u5B8C\u6210\uFF1A",
  "checkup.result.nothingNew": "\u6CA1\u6709\u53D1\u73B0\u65B0\u95EE\u9898",
  "checkup.result.newTodo": "\u65B0\u589E {n} \u6761\u7B49\u4F60\u51B3\u5B9A \u203A",
  "checkup.result.newAdvice": "\u65B0\u589E {n} \u6761\u53EF\u4EE5\u6574\u7406 \u203A",
  "checkup.result.newGlobal": "\u5168\u5C40\u65B0\u589E {n} \u6761 \u203A",
  "checkup.result.autoNewTodo": "\u81EA\u52A8\u4F53\u68C0\u65B0\u589E {n} \u6761\u7B49\u4F60\u51B3\u5B9A \u203A",
  "checkup.result.autoNewAdvice": "{n} \u6761\u53EF\u4EE5\u6574\u7406 \u203A",
  "checkup.result.autoNewAdviceOnly": "\u81EA\u52A8\u4F53\u68C0\u65B0\u589E {n} \u6761\u53EF\u4EE5\u6574\u7406 \u203A",
  "checkup.result.usage": "\u672C\u6B21\u7528\u4E86\u7EA6 {n} token",
  "checkup.result.note.semanticFailed": "\u5185\u5BB9\u68C0\u67E5\u6CA1\u6709\u5B8C\u6210\uFF08{cause}\uFF09\uFF0C\u8FD9\u6B21\u53EA\u66F4\u65B0\u4E86\u89C4\u5219\u68C0\u67E5\u3002",
  "checkup.result.note.semanticFailed.bare": "\u5185\u5BB9\u68C0\u67E5\u6CA1\u6709\u5B8C\u6210\uFF0C\u8FD9\u6B21\u53EA\u66F4\u65B0\u4E86\u89C4\u5219\u68C0\u67E5\u3002",
  "checkup.result.note.modelUnavailable": "\u5185\u5BB9\u68C0\u67E5\u6CA1\u6709\u505A\uFF1A\u6A21\u578B\u73B0\u5728\u7528\u4E0D\u4E86\uFF08{cause}\uFF09\uFF0C\u8FD9\u6B21\u53EA\u66F4\u65B0\u4E86\u89C4\u5219\u68C0\u67E5\u3002",
  "checkup.result.note.modelUnavailable.bare": "\u5185\u5BB9\u68C0\u67E5\u6CA1\u6709\u505A\uFF1A\u6A21\u578B\u73B0\u5728\u7528\u4E0D\u4E86\uFF0C\u8FD9\u6B21\u53EA\u66F4\u65B0\u4E86\u89C4\u5219\u68C0\u67E5\u3002",
  "checkup.result.note.semanticBatched": "\u8BB0\u5FC6\u8F83\u591A\uFF0C\u5206\u6279\u68C0\u67E5\uFF0C\u4E0D\u540C\u6279\u4E4B\u95F4\u7684\u51B2\u7A81\u548C\u91CD\u590D\u53EF\u80FD\u67E5\u4E0D\u51FA\u3002",
  "checkup.result.note.baselineTruncated": "\u6307\u4EE4\u6587\u4EF6\u592A\u957F\uFF0C\u53EA\u68C0\u67E5\u4E86\u5176\u4E2D\u4E00\u90E8\u5206\u3002",
  "checkup.result.note.baselineMissing": "\u8FD9\u6B21\u6CA1\u80FD\u8BFB\u53D6\u6307\u4EE4\u6587\u4EF6\uFF0C\u6CA1\u6709\u68C0\u67E5\u8BB0\u5FC6\u548C\u5B83\u7684\u51B2\u7A81\u3002",
  "checkup.result.autoFailed.retry": "\u81EA\u52A8\u4F53\u68C0\u6CA1\u505A\u5B8C\uFF1A{cause}\u3002{time} \u540E\u518D\u8BD5",
  "checkup.result.autoFailed.next": "\u81EA\u52A8\u4F53\u68C0\u6CA1\u505A\u5B8C\uFF1A{cause}\u3002\u4E0B\u6B21 {time}",
  "checkup.result.modelUnavailable": "\u9ED8\u8BA4\u6A21\u578B\u73B0\u5728\u7528\u4E0D\u4E86\uFF08{cause}\uFF09\uFF0C\u81EA\u52A8\u4F53\u68C0\u5148\u6682\u505C\u3002",
  "checkup.result.llmUnavailable": "\u8FD9\u6B21\u6CA1\u80FD\u4F53\u68C0\uFF1A\u501F\u7528\u7684\u4F1A\u8BDD\u62FF\u4E0D\u5230\u6A21\u578B\u3002\u53EF\u4EE5\u5728\u5BF9\u8BDD\u91CC\u8BA9 agent \u4F53\u68C0\u3002",
  "checkup.result.failed": "\u4F53\u68C0\u6CA1\u6709\u5B8C\u6210\uFF1A{detail}",
  "checkup.cause.noDefaultModel": "dsh \u8FD8\u6CA1\u6709\u53EF\u7528\u7684\u9ED8\u8BA4\u6A21\u578B",
  "checkup.cause.signIn": "\u8D26\u53F7\u6CA1\u767B\u5F55",
  "checkup.cause.tokenInvalid": "\u767B\u5F55\u5DF2\u5931\u6548",
  "checkup.cause.missingCredential": "\u7F3A\u5C11\u51ED\u636E",
  "checkup.cause.invalidCredential": "\u51ED\u636E\u65E0\u6548",
  "checkup.cause.auth": "API key \u65E0\u6548\u6216\u6CA1\u6709\u6743\u9650",
  "checkup.cause.quota": "\u989D\u5EA6\u7528\u5B8C\u4E86",
  "checkup.cause.rateLimit": "\u8BF7\u6C42\u592A\u9891\u7E41\uFF0C\u88AB\u9650\u6D41\u4E86",
  "checkup.cause.timeout": "\u6A21\u578B\u54CD\u5E94\u8D85\u65F6",
  "checkup.cause.transport": "\u8FDE\u4E0D\u4E0A\u6A21\u578B\u670D\u52A1",
  "checkup.cause.server": "\u6A21\u578B\u670D\u52A1\u51FA\u9519",
  "checkup.cause.contextWindow": "\u8BB0\u5FC6\u592A\u591A\uFF0C\u8D85\u51FA\u4E86\u6A21\u578B\u4E00\u6B21\u80FD\u8BFB\u7684\u957F\u5EA6",
  "checkup.cause.modelError": "\u6A21\u578B\u8C03\u7528\u51FA\u9519",
  "checkup.cause.unparseable": "\u6A21\u578B\u7684\u56DE\u590D\u8BFB\u4E0D\u51FA\u7ED3\u679C",
  "checkup.cause.error": "\u4F53\u68C0\u51FA\u9519"
};
var checkupEn = {
  "checkup.run": "Check now",
  "checkup.running": "Checking\u2026",
  "checkup.run.hint.all": "Checks global and each of the {n} projects in turn; more memories use more tokens",
  "checkup.run.hint.all.one": "Checks global and the {n} project in turn; more memories use more tokens",
  "checkup.run.hint.global": "Checks global memories only; more memories use more tokens",
  "checkup.run.hint.workspace": "Checks the memories of {name}; more memories use more tokens",
  "checkup.run.busy.all": "All memories are being checked; try again when it finishes",
  "checkup.run.busy.global": "Global memories are being checked; try again when it finishes",
  "checkup.run.busy.workspace": "{name} is being checked; try again when it finishes",
  "checkup.run.empty.all": "There are no memories yet, so there is nothing to check.",
  "checkup.run.empty.global": "Global has no memories yet, so there is nothing to check.",
  "checkup.run.empty.workspace": "This project has no memories yet, so there is nothing to check.",
  "checkup.auto": "Auto checkup",
  "checkup.auto.manual": "Manual only",
  "checkup.auto.daily": "Daily",
  "checkup.auto.days": "Every {n} days",
  "checkup.auto.title.all": "Auto checkup for all memories",
  "checkup.auto.title.global": "Auto checkup for global memories",
  "checkup.auto.title.workspace": "Auto checkup for {name}",
  "checkup.auto.aria": "{title}: {value}",
  "checkup.auto.aria.follow": "{title}: {value}, following All",
  "checkup.auto.aria.own": "{title}: {value}, set separately",
  "checkup.auto.follow": "Follow All ({value})",
  "checkup.auto.follow.hint": "Changes here when All changes.",
  "checkup.auto.manual.hint": "Checks only when you click Check now.",
  "checkup.auto.daily.hint": "While dsh is open, checks in the background once 24 hours have passed since the last checkup.",
  "checkup.auto.days.before": "Every",
  "checkup.auto.days.after": "days",
  "checkup.auto.days.input": "Number of days",
  "checkup.auto.days.input.checked": "Number of days, selected",
  "checkup.auto.days.hint": "While dsh is open, checks in the background once this many days have passed since the last checkup.",
  "checkup.auto.days.invalid": "Enter a whole number from 1 to 90.",
  "checkup.auto.own.title": "Set separately, not following this",
  "checkup.auto.own.row": "{name} \xB7 {value}",
  "checkup.auto.own.back": "Back to following",
  "checkup.auto.own.backAria": "{name}: back to following",
  "checkup.auto.foot": "{scope} {model}",
  "checkup.auto.foot.all": "Global and every project are checked at this frequency, each on its own timer; new projects too.",
  "checkup.auto.foot.allOwn": "Other scopes and new projects are checked at this frequency, each on its own timer.",
  "checkup.auto.foot.global": "Checks global memories only.",
  "checkup.auto.foot.workspace": "Checks the memories of {name} only.",
  "checkup.auto.foot.model": "The current dsh default model checks the content and suggests how to settle new conflicts; more memories use more tokens. Nothing runs while dsh is closed; it catches up once dsh opens.",
  "checkup.auto.saveFailed": "Could not save. Try again.",
  "checkup.status.count": "{n} memories",
  "checkup.status.count.one": "{n} memory",
  "checkup.status.last": "Last checkup {date}",
  "checkup.status.next": "Next auto checkup after {time}",
  "checkup.status.due": "Auto checkup is due and runs in the background shortly",
  "checkup.status.why": "How the score is made",
  "checkup.status.deduction": "{label}: \u2212{points} ({types})",
  "checkup.status.deduction.bare": "{label}: \u2212{points}",
  "checkup.status.deduction.rule": "Rule check",
  "checkup.status.deduction.content": "Content check",
  "checkup.status.deduction.freshness": "Freshness",
  "checkup.status.noDeduction": "No deductions",
  "checkup.status.listSep": ", ",
  "checkup.status.issue.expired": "past their end date",
  "checkup.status.issue.bloat": "too long",
  "checkup.status.issue.orphan": "replace a memory that is gone",
  "checkup.status.issue.malformed": "files that cannot be read",
  "checkup.status.issue.conflict": "memory conflicts",
  "checkup.status.issue.redundancy": "duplicate content",
  "checkup.status.issue.misplaced": "in the wrong layer",
  "checkup.status.issue.unclear": "unclear wording",
  "checkup.status.issue.stale": "not confirmed in a while",
  "checkup.status.all.secret": "{name} has a secret to handle first",
  "checkup.status.all.secret.global": "Global has a secret to handle first",
  "checkup.status.all.todo": "{name} has items waiting on you",
  "checkup.status.all.todo.global": "Global has items waiting on you",
  "checkup.status.all.clear": "Nothing waiting on you",
  "checkup.status.all.count": "{scopes}, {n} memories in all",
  "checkup.status.all.count.one": "{scopes}, {n} memory in all",
  "checkup.status.all.auto": "Auto checkup: {frequency} for all memories",
  "checkup.status.all.autoOwn": "Auto checkup: {frequency}; set separately: {names}",
  "checkup.status.all.manualOwn": "Manual only by default; set separately: {names}",
  "checkup.result.running.all": "Checking all memories; you can do something else meanwhile",
  "checkup.result.running.global": "Checking global memories; you can do something else meanwhile",
  "checkup.result.running.workspace": "Checking the memories of {name}; you can do something else meanwhile",
  "checkup.result.done": "Checkup finished: ",
  "checkup.result.autoDone": "Auto checkup finished: ",
  "checkup.result.nothingNew": "No new issues found",
  "checkup.result.newTodo": "{n} new waiting on you \u203A",
  "checkup.result.newAdvice": "{n} new for cleanup \u203A",
  "checkup.result.newGlobal": "{n} new in global \u203A",
  "checkup.result.autoNewTodo": "Auto checkups found {n} new waiting on you \u203A",
  "checkup.result.autoNewAdvice": "{n} for cleanup \u203A",
  "checkup.result.autoNewAdviceOnly": "Auto checkups found {n} new for cleanup \u203A",
  "checkup.result.usage": "Used about {n} tokens this time",
  "checkup.result.note.semanticFailed": "The content check did not finish ({cause}); only the rule check was updated.",
  "checkup.result.note.semanticFailed.bare": "The content check did not finish; only the rule check was updated.",
  "checkup.result.note.modelUnavailable": "The content check was skipped: the model is unavailable right now ({cause}); only the rule check was updated.",
  "checkup.result.note.modelUnavailable.bare": "The content check was skipped: the model is unavailable right now; only the rule check was updated.",
  "checkup.result.note.semanticBatched": "Many memories, so the content was checked in batches; conflicts and duplicates across batches may be missed.",
  "checkup.result.note.baselineTruncated": "The instruction files are too long, so only part of them was checked.",
  "checkup.result.note.baselineMissing": "The instruction files couldn't be read this time, so memories were not checked against them.",
  "checkup.result.autoFailed.retry": "Auto checkup did not finish: {cause}. Trying again after {time}",
  "checkup.result.autoFailed.next": "Auto checkup did not finish: {cause}. Next try {time}",
  "checkup.result.modelUnavailable": "The default model is unavailable right now ({cause}), so auto checkups are paused.",
  "checkup.result.llmUnavailable": "Could not run the checkup: the borrowed session has no model. You can ask the agent to run a checkup in a chat.",
  "checkup.result.failed": "The checkup did not finish: {detail}",
  "checkup.cause.noDefaultModel": "dsh has no default model yet",
  "checkup.cause.signIn": "not signed in",
  "checkup.cause.tokenInvalid": "sign-in has expired",
  "checkup.cause.missingCredential": "missing credentials",
  "checkup.cause.invalidCredential": "invalid credentials",
  "checkup.cause.auth": "the API key was rejected",
  "checkup.cause.quota": "out of quota",
  "checkup.cause.rateLimit": "rate limited",
  "checkup.cause.timeout": "the model timed out",
  "checkup.cause.transport": "could not reach the model service",
  "checkup.cause.server": "the model service returned an error",
  "checkup.cause.contextWindow": "more than the model can read at once",
  "checkup.cause.modelError": "the model call failed",
  "checkup.cause.unparseable": "could not read the model's reply",
  "checkup.cause.error": "the checkup ran into an error"
};

// client/locales/sidebar.ts
var sidebarZh = {
  "sidebar.tab.title": "\u8BB0\u5FC6",
  "sidebar.guide.title": "\u8BB0\u5FC6",
  "sidebar.guide.description": "\u8FD9\u6B21\u5BF9\u8BDD\u5E26\u5165\u548C\u65B0\u5199\u5165\u7684\u8BB0\u5FC6",
  "sidebar.crumb.scope": "\u672C\u9879\u76EE /",
  "sidebar.usage.title": "\u5BF9\u8BDD\u5F00\u59CB\u65F6\u5E26\u5165\u7684\u8BB0\u5FC6",
  "sidebar.usage.titleResumed": "\u91CD\u65B0\u5E26\u5165\u7684\u8BB0\u5FC6",
  "sidebar.usage.titleCompacted": "\u538B\u7F29\u540E\u91CD\u65B0\u5E26\u5165\u7684\u8BB0\u5FC6",
  "sidebar.usage.titleRefreshed": "\u5BF9\u8BDD\u4E2D\u91CD\u65B0\u5E26\u5165\u7684\u8BB0\u5FC6",
  "sidebar.usage.searchNote": "\u5BF9\u8BDD\u4E2D\u641C\u7D22\u5230\u7684\u8BB0\u5FC6\u7B97\u666E\u901A\u4E0A\u4E0B\u6587\uFF0C\u4E0D\u8BA1\u5165\u8FD9\u91CC\u3002",
  "sidebar.saved.title": "\u8FD9\u6B21\u65B0\u5199\u5165\u7684",
  "sidebar.saved.note": "\u538B\u7F29\u540E\u6216\u4E0B\u4E2A\u5BF9\u8BDD\u5E26\u5165",
  "sidebar.groups.title": "\u5E26\u5165\u7684\u8BB0\u5FC6",
  "sidebar.groups.full": "\u5168\u6587",
  "sidebar.groups.summary": "\u53EA\u5E26\u6458\u8981",
  "sidebar.groups.titleOnly": "\u53EA\u5E26\u6807\u9898",
  "sidebar.saved.delete": "\u5220\u9664\u8FD9\u6761\u8BB0\u5FC6",
  "sidebar.empty.title": "\u8FD8\u6CA1\u6709\u8BB0\u5FC6",
  "sidebar.empty.body": "agent \u5728\u5BF9\u8BDD\u91CC\u8BB0\u4E0B\u4F60\u7684\u504F\u597D\u3001\u9879\u76EE\u7EA6\u5B9A\u540E\uFF0C\u6BCF\u6B21\u5BF9\u8BDD\u5E26\u5165\u4E86\u54EA\u4E9B\u4F1A\u5217\u5728\u8FD9\u91CC\u3002",
  "sidebar.globalOnly": "\u672C\u9879\u76EE\u8FD8\u6CA1\u6709\u8BB0\u5FC6\uFF0C\u8FD9\u6B21\u5E26\u5165\u7684\u90FD\u662F\u5168\u5C40\u8BB0\u5FC6\u3002",
  "sidebar.noSnapshot.title": "\u8FD9\u6B21\u5BF9\u8BDD\u8FD8\u6CA1\u5E26\u5165\u8BB0\u5FC6",
  "sidebar.noSnapshot.body": "\u53D1\u51FA\u7B2C\u4E00\u6761\u6D88\u606F\u540E\uFF0C\u8FD9\u91CC\u4F1A\u5217\u51FA\u5E26\u5165\u7684\u8BB0\u5FC6\u548C\u7528\u91CF\u3002",
  "sidebar.stale.title": "\u91CD\u542F\u524D\u5E26\u5165\u7684\u8BB0\u5FC6",
  "sidebar.stale.body": "DeepSeek Harness \u91CD\u542F\u8FC7\uFF0C\u5BF9\u8BDD\u91CC\u4ECD\u662F\u91CD\u542F\u524D\u5E26\u5165\u7684\u8FD9\u4EFD\u8BB0\u5FC6\u3002\u7EE7\u7EED\u5BF9\u8BDD\u540E\u8FD9\u91CC\u4F1A\u66F4\u65B0\uFF1B\u8BB0\u5FC6\u6709\u53D8\u5316\u65F6\u4F1A\u8865\u53D1\u6700\u65B0\u7684\u4E00\u4EFD\u3002",
  "sidebar.footer.pending": "\u672C\u9879\u76EE\u8FD8\u6709 {n} \u5904\u5F85\u5904\u7406",
  "sidebar.footer.pendingLink": "\u5728\u8BB0\u5FC6\u9875\u5904\u7406 \u203A",
  "sidebar.footer.count": "\u672C\u9879\u76EE {n} \u6761\u8BB0\u5FC6",
  "sidebar.footer.count.one": "\u672C\u9879\u76EE {n} \u6761\u8BB0\u5FC6",
  "sidebar.footer.countLink": "\u5728\u8BB0\u5FC6\u9875\u67E5\u770B \u203A",
  "sidebar.suggestion.lead": "\u6A21\u578B\u5EFA\u8BAE\uFF1A",
  "sidebar.suggestion.stale": "\u8FD9\u4E24\u6761\u521A\u88AB\u6539\u8FC7\uFF0C\u5EFA\u8BAE\u5DF2\u5931\u6548\u3002\u4E0B\u6B21\u4F53\u68C0\u4F1A\u91CD\u65B0\u7ED9\u5EFA\u8BAE\u3002",
  "sidebar.suggestion.undecided": "\u6A21\u578B\u5224\u65AD\u4E0D\u4E86\u8BE5\u600E\u4E48\u5904\u7406\uFF0C\u9700\u8981\u4F60\u6765\u5B9A\u3002",
  "sidebar.ruled.keepA": "\u5DF2\u4FDD\u7559 A",
  "sidebar.ruled.keepB": "\u5DF2\u4FDD\u7559 B",
  "sidebar.ruled.keepBoth": "\u4E24\u6761\u90FD\u4FDD\u7559",
  "sidebar.ruled.deletedA": "A \u5DF2\u5220\u9664\uFF0C14 \u5929\u5185\u53EF\u6062\u590D\u3002",
  "sidebar.ruled.deletedB": "B \u5DF2\u5220\u9664\uFF0C14 \u5929\u5185\u53EF\u6062\u590D\u3002",
  "sidebar.ruled.keptBoth": "\u4EE5\u540E\u4F53\u68C0\u4E0D\u518D\u628A\u5B83\u4EEC\u5F53\u51B2\u7A81\u3002",
  "sidebar.ruled.keepBaseline": "\u5DF2\u6309\u57FA\u7EBF",
  "sidebar.ruled.keepMemory": "\u5DF2\u4FDD\u7559\u8FD9\u6761\u8BB0\u5FC6",
  "sidebar.ruled.deletedMemory": "\u8FD9\u6761\u8BB0\u5FC6\u5DF2\u5220\u9664\uFF0C14 \u5929\u5185\u53EF\u6062\u590D\u3002",
  "sidebar.ruled.keptMemory": "\u57FA\u7EBF\u548C\u8BB0\u5FC6\u90FD\u4E0D\u53D8\u65F6\u4E0D\u518D\u62A5\u3002",
  "sidebar.ruled.unrecorded": "\u8FD9\u6B21\u7684\u51B3\u5B9A\u6CA1\u80FD\u8BB0\u4E0B\uFF0C\u4E0B\u6B21\u4F53\u68C0\u53EF\u80FD\u8FD8\u4F1A\u62A5\u3002",
  "sidebar.ruled.appliesLater": "\u8FD9\u6B21\u5BF9\u8BDD\u91CC\u5DF2\u5E26\u5165\u7684\u4E0D\u53D8\uFF0C\u538B\u7F29\u540E\u6216\u4E0B\u4E2A\u5BF9\u8BDD\u8D77\u751F\u6548\u3002",
  "sidebar.ruled.undo": "\u64A4\u9500",
  "sidebar.action.refused": "\u4F60\u7684\u9009\u62E9\u6CA1\u6709\u751F\u6548\uFF1A\u8FD9\u6761\u51B2\u7A81\u6B63\u5728\u522B\u5904\u5904\u7406\uFF0C\u6216\u8005\u521A\u5728\u522B\u5904\u5904\u7406\u5B8C\u3002"
};
var sidebarEn = {
  "sidebar.tab.title": "Memory",
  "sidebar.guide.title": "Memory",
  "sidebar.guide.description": "Memories this chat brought in and wrote",
  "sidebar.crumb.scope": "This project /",
  "sidebar.usage.title": "Brought in when the chat started",
  "sidebar.usage.titleResumed": "Brought in again",
  "sidebar.usage.titleCompacted": "Brought in again after compaction",
  "sidebar.usage.titleRefreshed": "Brought in again during the chat",
  "sidebar.usage.searchNote": "Memories found by search during the chat are regular context and do not count here.",
  "sidebar.saved.title": "Written in this chat",
  "sidebar.saved.note": "Brought in after compaction or in the next chat",
  "sidebar.groups.title": "Brought-in memories",
  "sidebar.groups.full": "Full text",
  "sidebar.groups.summary": "Summary only",
  "sidebar.groups.titleOnly": "Title only",
  "sidebar.saved.delete": "Delete this memory",
  "sidebar.empty.title": "No memories yet",
  "sidebar.empty.body": "Once the agent saves your preferences and project conventions during chats, this tab lists which ones each chat brings in.",
  "sidebar.globalOnly": "This project has no memories yet. Everything brought in is global.",
  "sidebar.noSnapshot.title": "Nothing brought into this chat yet",
  "sidebar.noSnapshot.body": "After the first message, this tab lists the memories brought in and how much they use.",
  "sidebar.stale.title": "Memories from before the restart",
  "sidebar.stale.body": "DeepSeek Harness restarted. This chat still has the memories brought in before the restart. This tab updates when the chat continues, and the latest set is sent if they changed.",
  "sidebar.footer.pending": "{n} more pending in this project",
  "sidebar.footer.pendingLink": "Handle on the Memory page \u203A",
  "sidebar.footer.count": "{n} memories in this project",
  "sidebar.footer.count.one": "{n} memory in this project",
  "sidebar.footer.countLink": "View on the Memory page \u203A",
  "sidebar.suggestion.lead": "Model suggests: ",
  "sidebar.suggestion.stale": "These two changed after the suggestion was made, so it no longer applies. The next checkup will suggest again.",
  "sidebar.suggestion.undecided": "The model could not tell how to settle this. It needs your call.",
  "sidebar.ruled.keepA": "Kept A",
  "sidebar.ruled.keepB": "Kept B",
  "sidebar.ruled.keepBoth": "Kept both",
  "sidebar.ruled.deletedA": "A was deleted. It can be restored within 14 days.",
  "sidebar.ruled.deletedB": "B was deleted. It can be restored within 14 days.",
  "sidebar.ruled.keptBoth": "Future checkups will not treat them as a conflict.",
  "sidebar.ruled.keepBaseline": "Went with the baseline",
  "sidebar.ruled.keepMemory": "Kept this memory",
  "sidebar.ruled.deletedMemory": "This memory was deleted. It can be restored within 14 days.",
  "sidebar.ruled.keptMemory": "Not reported again while neither changes.",
  "sidebar.ruled.unrecorded": "This decision could not be saved, so the next checkup may report it again.",
  "sidebar.ruled.appliesLater": "What this conversation already loaded stays the same. The change applies after compaction or in the next conversation.",
  "sidebar.ruled.undo": "Undo",
  "sidebar.action.refused": "Your choice did not take effect: this conflict is being handled elsewhere, or was just handled there."
};

// client/locales/settings.ts
var settingsZh = {
  "settings.loading": "\u6B63\u5728\u8BFB\u53D6\u914D\u7F6E\u2026",
  "settings.status.noSession": "\u5F00\u4E00\u4E2A\u4F1A\u8BDD\u540E\u8FD9\u91CC\u663E\u793A\u8BB0\u5FC6\u72B6\u6001",
  "settings.status.loading": "\u6B63\u5728\u8BFB\u53D6\u8BB0\u5FC6\u72B6\u6001\u2026",
  "settings.status.empty": "\u8FD8\u6CA1\u6709\u8BB0\u5FC6",
  "settings.status.unscanned": "\u6709\u8BB0\u5FC6\uFF0C\u8FD8\u6CA1\u4F53\u68C0\u8FC7",
  "settings.status.ok": "\u72B6\u6001\u826F\u597D",
  "settings.status.pending": "\u6709 {n} \u5904\u7B49\u4F60\u51B3\u5B9A",
  "settings.status.secret": "\u6709\u5BC6\u94A5\u8981\u5904\u7406",
  "settings.status.count": "\u5171 {n} \u6761\u8BB0\u5FC6",
  "settings.status.count.one": "\u5171 {n} \u6761\u8BB0\u5FC6",
  "settings.status.lastScan": "\u4E0A\u6B21\u4F53\u68C0\uFF1A{date}",
  "settings.status.neverScanned": "\u8FD8\u6CA1\u4F53\u68C0\u8FC7",
  "settings.status.open": "\u6253\u5F00\u8BB0\u5FC6\u9875 \u203A",
  "settings.group.what": "\u8BB0\u4EC0\u4E48",
  "settings.group.how": "\u600E\u4E48\u7528",
  "settings.group.manage": "\u600E\u4E48\u7BA1",
  "settings.group.look": "\u5916\u89C2",
  "settings.accent.label": "\u4E3B\u9898\u8272",
  "settings.accent.ella": "\u827E\u62C9\u4E3B\u9898\u8272",
  "settings.accent.blue-whale": "\u5927\u80A5\u9C7C\u4E3B\u9898\u8272",
  "settings.scene.label": "\u573A\u666F",
  "settings.scene.custom": "\u901A\u7528",
  "settings.scene.coding": "\u7F16\u7801",
  "settings.scene.office": "\u529E\u516C",
  "settings.scene.edited": "\u5DF2\u6539",
  "settings.scene.edit": "\u7F16\u8F91",
  "settings.scene.reset": "\u6062\u590D\u9ED8\u8BA4",
  "settings.scene.remove": "\u5220\u9664",
  "settings.scene.editAria": "\u7F16\u8F91\u573A\u666F {name}",
  "settings.scene.resetAria": "{name}\u6062\u590D\u9ED8\u8BA4",
  "settings.scene.removeAria": "\u5220\u9664\u573A\u666F {name}",
  "settings.scene.removeQuestion": "\u5220\u9664\u300C{name}\u300D\uFF1F",
  "settings.scene.removeCurrent": "\u5220\u9664\u300C{name}\u300D\uFF1F\u5F53\u524D\u573A\u666F\u4F1A\u6362\u56DE\u901A\u7528\u3002",
  "settings.scene.removeConfirm": "\u5220\u9664",
  "settings.scene.cancel": "\u53D6\u6D88",
  "settings.scene.add": "\u65B0\u5EFA\u573A\u666F",
  "settings.scene.remaining": "\u8FD8\u80FD\u5EFA {n} \u4E2A",
  "settings.unsaved": "{n} \u9879\u6539\u52A8\u672A\u4FDD\u5B58",
  "settings.scene.generalTypes": "\u901A\u7528\u4E94\u7C7B",
  "settings.scene.listSep": "\u3001",
  "settings.scene.groupSep": " + ",
  "settings.scene.dropHint": "\u4FDD\u5B58\u540E\u4E0D\u518D\u65B0\u589E{types}\u7C7B\u8BB0\u5FC6\uFF0C\u5DF2\u6709\u7684\u4ECD\u4F1A\u5E26\u5165\u3001\u80FD\u641C\u5230\u3002",
  "settings.typeOpen": "\u300C",
  "settings.typeSep": "\u300D\u300C",
  "settings.typeClose": "\u300D",
  "settings.types.label": "\u6211\u52A0\u7684\u7C7B\u578B",
  "settings.types.title": "\u8BB0\u5FC6\u7C7B\u578B",
  "settings.types.create": "\u65B0\u5EFA\u7C7B\u578B",
  "settings.types.intro": "\u6240\u6709\u573A\u666F\u5171\u7528\u3002\u8981\u7528\u67D0\u4E00\u7C7B\uFF0C\u5728\u573A\u666F\u7684\u300C\u7F16\u8F91\u300D\u91CC\u52FE\u4E0A\u3002",
  "settings.types.add": "\uFF0B \u65B0\u5EFA\u7C7B\u578B",
  "settings.types.edit": "\u7F16\u8F91",
  "settings.types.remove": "\u5220\u9664",
  "settings.types.editAria": "\u7F16\u8F91 {name}",
  "settings.types.removeAria": "\u5220\u9664 {name}",
  "settings.types.usedBy": "{names}\u5728\u7528",
  "settings.types.unused": "\u6CA1\u6709\u573A\u666F\u5728\u7528",
  "settings.types.count": "{n} \u6761\u8BB0\u5FC6",
  "settings.types.group.general": "\u901A\u7528\u4E94\u7C7B",
  "settings.types.group.preset": "\u9884\u8BBE",
  "settings.types.group.custom": "\u6211\u52A0\u7684",
  "settings.types.view": "\u67E5\u770B",
  "settings.types.viewAria": "\u67E5\u770B {name}",
  "settings.types.removedLine": "\u5DF2\u5220\u9664\uFF1A{label}",
  "settings.types.restore": "\u6062\u590D",
  "settings.types.restoreAria": "\u6062\u590D {name}",
  "settings.sceneDialog.addTitle": "\u65B0\u5EFA\u573A\u666F",
  "settings.sceneDialog.editTitle": "\u7F16\u8F91\u573A\u666F",
  "settings.sceneDialog.name": "\u573A\u666F\u540D",
  "settings.sceneDialog.general": "\u901A\u7528\uFF08\u9ED8\u8BA4\u5E26\u4E0A\uFF0C\u53EF\u4EE5\u53BB\u6389\uFF09",
  "settings.sceneDialog.preset": "\u9884\u8BBE",
  "settings.sceneDialog.custom": "\u6211\u52A0\u7684\uFF08\u6240\u6709\u573A\u666F\u5171\u7528\uFF09",
  "settings.sceneDialog.count": "\u5DF2\u9009 {n} / {max}",
  "settings.sceneDialog.limit": "\u6700\u591A {max} \u7C7B\uFF0C\u81F3\u5C11 1 \u7C7B",
  "settings.sceneDialog.full": "\u5DF2\u6EE1 {max} \u7C7B\uFF0C\u53BB\u6389\u4E00\u7C7B\u540E\u624D\u80FD\u52FE\u4E0A\u300C{name}\u300D\u3002",
  "settings.sceneDialog.error.required": "\u5FC5\u586B\u3002",
  "settings.sceneDialog.error.label-taken": "\u5DF2\u7ECF\u6709\u8FD9\u4E2A\u540D\u5B57\u7684\u573A\u666F\u4E86\u3002",
  "settings.sceneDialog.error.types-empty": "\u81F3\u5C11\u52FE\u4E00\u7C7B\u3002",
  "settings.sceneDialog.cancel": "\u53D6\u6D88",
  "settings.sceneDialog.confirm": "\u786E\u5B9A",
  "settings.sceneDialog.close": "\u5173\u95ED",
  "settings.sceneDialog.back": "\u2039 \u8FD4\u56DE",
  "settings.sceneDialog.autoPick": "\u5EFA\u597D\u540E\u81EA\u52A8\u52FE\u8FDB\u300C{name}\u300D\uFF0C\u6240\u6709\u573A\u666F\u90FD\u80FD\u52FE\u9009\u5B83\u3002",
  "settings.type.addTitle": "\u65B0\u5EFA\u7C7B\u578B",
  "settings.type.editTitle": "\u7F16\u8F91\u7C7B\u578B",
  "settings.type.label": "\u4E2D\u6587\u540D",
  "settings.type.labelHint": "\u4F8B\u5982\u300C\u672F\u8BED\u300D\u3002",
  "settings.type.name": "\u82F1\u6587\u540D",
  "settings.type.nameHint": "\u5C0F\u5199\u82F1\u6587\u5B57\u6BCD\u548C\u8FDE\u5B57\u7B26\uFF0C\u4F8B\u5982 domain-term\u3002",
  "settings.type.nameLocked": "\u9884\u8BBE\u7C7B\u578B\u7684\u82F1\u6587\u540D\u4E0D\u80FD\u6539\u3002",
  "settings.type.description": "\u8BF4\u660E",
  "settings.type.descriptionHint": "\u5199\u7ED9 agent \u770B\uFF1A\u5148\u4E00\u53E5\u8BDD\u8BF4\u6E05\u8FD9\u7C7B\u8BB0\u5FC6\u8BB0\u4EC0\u4E48\uFF0C\u53EF\u4EE5\u518D\u5199\u6B63\u6587\u600E\u4E48\u5199\u3001\u5E26\u4E2A\u4F8B\u5B50\u3002",
  "settings.type.whenToSave": "\u4EC0\u4E48\u65F6\u5019\u8BB0",
  "settings.type.whenToSaveHint": "\u5199\u7ED9 agent \u770B\uFF1A\u9047\u5230\u4EC0\u4E48\u60C5\u51B5\u8BE5\u8BB0\u4E00\u6761\u3002",
  "settings.type.howToUse": "\u5E26\u5165\u540E\u600E\u4E48\u7528",
  "settings.type.howToUseHint": "\u5199\u7ED9 agent \u770B\uFF1A\u5E26\u5165\u8FD9\u7C7B\u8BB0\u5FC6\u540E\u600E\u4E48\u7528\u3002\u53EF\u4EE5\u4E0D\u586B\u3002",
  "settings.type.recall": "\u600E\u4E48\u53EC\u56DE",
  "settings.type.recall.core": "\u5E38\u9A7B",
  "settings.type.recall.search": "\u641C\u7D22",
  "settings.type.recall.passive": "\u88AB\u52A8",
  "settings.type.recallHint": "\u5E38\u9A7B\uFF1A\u5168\u6587\u5E26\u5165\u6BCF\u6B21\u5BF9\u8BDD\uFF1B\u641C\u7D22\uFF1A\u53EA\u5E26\u5165\u4E00\u884C\u7D22\u5F15\uFF0Cagent \u9700\u8981\u65F6\u518D\u8BFB\uFF1B\u88AB\u52A8\uFF1A\u7D22\u5F15\u91CC\u53EA\u5217\u540D\u5B57\uFF0C\u6700\u7701\u4E0A\u4E0B\u6587\u3002",
  "settings.type.priority": "\u6CBB\u7406\u4F18\u5148\u7EA7",
  "settings.type.priority.high": "\u9AD8",
  "settings.type.priority.medium": "\u4E2D",
  "settings.type.priority.low": "\u4F4E",
  "settings.type.priorityHint": "\u4F18\u5148\u7EA7\u9AD8\u7684\u7C7B\u578B\u5E26\u5165\u65F6\u6392\u5728\u524D\u9762\uFF0C\u4F53\u68C0\u65F6\u4E5F\u5148\u770B\u3002",
  "settings.type.decayDays": "\u8870\u9000\u5929\u6570",
  "settings.type.decayDaysHint": "\u8D85\u8FC7\u8FD9\u4E48\u591A\u5929\u6CA1\u786E\u8BA4\uFF0C\u5E26\u5165\u65F6\u6807\u4E3A\u53EF\u80FD\u8FC7\u65F6\u3002\u7559\u7A7A\u8868\u793A\u4E0D\u8870\u9000\u3002",
  "settings.type.noDecay": "\u4E0D\u8870\u9000",
  "settings.type.error.required": "\u5FC5\u586B\u3002",
  "settings.type.error.name-format": "\u53EA\u80FD\u7528\u5C0F\u5199\u82F1\u6587\u5B57\u6BCD\u548C\u8FDE\u5B57\u7B26\uFF0C\u4F8B\u5982 domain-term\u3002",
  "settings.type.error.name-builtin": "\u548C\u5185\u7F6E\u7C7B\u578B\u91CD\u540D\u4E86\uFF0C\u6362\u4E00\u4E2A\u3002",
  "settings.type.error.name-taken": "\u5DF2\u7ECF\u6709\u8FD9\u4E2A\u82F1\u6587\u540D\u4E86\u3002",
  "settings.type.error.name-removed-preset": "\u8FD9\u662F\u5DF2\u5220\u9664\u7684\u9884\u8BBE\u7C7B\u578B\uFF0C\u5728\u9884\u8BBE\u91CC\u70B9\u300C\u6062\u590D\u300D\u5C31\u80FD\u7528\u3002",
  "settings.type.error.name-pending": "\u8FD9\u4E2A\u82F1\u6587\u540D\u4E0B\u7684\u65E7\u8BB0\u5FC6\u8FD8\u6CA1\u8FC1\u8D70\uFF0C\u4FDD\u5B58\u540E\u518D\u7528\u3002",
  "settings.type.error.label-taken": "\u5DF2\u7ECF\u6709\u53EB\u300C{label}\u300D\u7684\u7C7B\u578B\u4E86\u3002",
  "settings.type.renameAsk": "\u300C{label}\u300D\u5B58\u8FC7 {n} \u6761\u8BB0\u5FC6\uFF0C\u6539\u540D\u540E\uFF1A",
  "settings.type.renameAskUnknown": "\u300C{label}\u300D\u53EF\u80FD\u5B58\u8FC7\u8BB0\u5FC6\uFF0C\u6539\u540D\u540E\uFF1A",
  "settings.type.retype": "\u8DDF\u7740\u6539\u540D",
  "settings.type.forget": "\u79FB\u5230\u6700\u8FD1\u5220\u9664",
  "settings.type.keep": "\u4FDD\u7559\u8BB0\u5FC6",
  "settings.type.noSession": "\u5F00\u4E00\u4E2A\u4F1A\u8BDD\u540E\u624D\u80FD\u5904\u7406\u5DF2\u6709\u8BB0\u5FC6\u3002",
  "settings.type.removeQuestion": "\u5220\u9664\u300C{label}\u300D\uFF1F",
  "settings.type.removeAlsoUsed": "{scenes}\u4E5F\u5728\u7528\uFF0C\u4F1A\u4E00\u8D77\u53BB\u6389\u3002",
  "settings.type.removeUsed": "{scenes}\u5728\u7528\uFF0C\u4F1A\u4E00\u8D77\u53BB\u6389\u3002",
  "settings.type.removeMemories": "\u5B58\u8FC7 {n} \u6761\u8BB0\u5FC6\u3002",
  "settings.type.removeMemoriesUnknown": "\u53EF\u80FD\u5B58\u8FC7\u8BB0\u5FC6\u3002",
  "settings.type.removeConfirm": "\u5220\u9664",
  "settings.type.removeBlocked": "\u300C{scene}\u300D\u53EA\u5269\u8FD9\u4E00\u7C7B\uFF0C\u5148\u7ED9\u5B83\u52A0\u522B\u7684\u7C7B\u578B\u518D\u5220\u3002",
  "settings.type.error.decay-invalid": "\u586B\u4E00\u4E2A\u5927\u4E8E 0 \u7684\u6574\u6570\uFF0C\u6216\u8005\u7559\u7A7A\u3002",
  "settings.budget.label": "\u5BF9\u8BDD\u5F00\u59CB\u65F6\u81EA\u52A8\u5E26\u5165\u7684\u8BB0\u5FC6\u4E0A\u9650\uFF08token\uFF09",
  "settings.budget.hint": "\u9ED8\u8BA4 4,000\uFF0C\u7EA6\u5408 6,700 \u4E2A\u6C49\u5B57\u6216 13,000 \u4E2A\u82F1\u6587\u5B57\u7B26\u3002\u5305\u62EC\u5168\u5C40\u548C\u5F53\u524D\u9879\u76EE\u7684\u8BB0\u5FC6\uFF0C\u6309\u5404\u7C7B\u578B\u300C\u600E\u4E48\u53EC\u56DE\u300D\u7684\u8BBE\u7F6E\u5E26\u5165\u5168\u6587\u3001\u4E00\u884C\u7D22\u5F15\u6216\u53EA\u5217\u540D\u5B57\u3002\u5BF9\u8BDD\u4E2D\u68C0\u7D22\u5230\u7684\u8BB0\u5FC6\u4E0D\u8BA1\u5165\u3002",
  "settings.budget.invalid": "\u586B\u4E00\u4E2A\u5927\u4E8E 0 \u7684\u6574\u6570\u3002",
  "settings.overflow.label": "\u8D85\u51FA\u4E0A\u9650\u65F6",
  "settings.overflow.relax": "\u81EA\u52A8\u653E\u5BBD",
  "settings.overflow.strict": "\u4E25\u683C\u6309\u4E0A\u9650",
  "settings.overflow.relaxHint": "\u81EA\u52A8\u653E\u5BBD\uFF1A\u8D85\u51FA\u7684\u7167\u5E38\u5E26\u5165\uFF0C\u6BCF\u591A\u51FA\u4E0A\u9650\u7684 25% \u63D0\u9192\u4F60\u4E00\u6B21\uFF0C\u4E0D\u622A\u65AD\u3002",
  "settings.overflow.strictHint": "\u4E25\u683C\u6309\u4E0A\u9650\uFF1A\u8D85\u51FA\u7684\u4E0D\u5E26\u5165\uFF0C\u7528\u5230 95% \u65F6\u63D0\u9192\u4F60\u3002",
  "settings.evidence.label": "\u6EAF\u6E90\u8BB0\u5FC6\u51FA\u5904",
  "settings.evidence.off": "\u4EC5\u4F60\u8981\u6C42\u65F6",
  "settings.evidence.strict": "\u9047\u5230\u77DB\u76FE\u6216\u9AD8\u98CE\u9669\u65F6",
  "settings.evidence.active": "\u4E3B\u52A8\u79EF\u6781",
  "settings.evidence.hint": "agent \u56DE\u5230\u8FD9\u6761\u8BB0\u5FC6\u4EA7\u751F\u7684\u90A3\u6B21\u5BF9\u8BDD\uFF0C\u6838\u5BF9\u5F53\u65F6\u7684\u539F\u8BDD\u3001\u539F\u56E0\u548C\u7EA6\u675F\u3002",
  "settings.usage.reloadNote": "\u4FDD\u5B58\u540E\uFF0C\u5DF2\u5F00\u7740\u7684\u5BF9\u8BDD\u53D1\u4E0B\u4E00\u6761\u6D88\u606F\u65F6\u4F1A\u91CD\u65B0\u5E26\u5165\u8BB0\u5FC6\uFF0C\u8FD9\u6761\u6D88\u606F\u591A\u7528\u4E00\u4E9B token\u3002",
  "settings.governanceOff": "\u4F53\u68C0\u5DF2\u5728\u914D\u7F6E\u6587\u4EF6\u91CC\u5173\u95ED",
  "settings.sensitivity.label": "\u63D0\u9192\u7684\u7075\u654F\u5EA6",
  "settings.sensitivity.conservative": "\u4FDD\u5B88",
  "settings.sensitivity.normal": "\u6807\u51C6",
  "settings.sensitivity.proactive": "\u79EF\u6781",
  "settings.sensitivity.hint": "\u5065\u5EB7\u5206\u4F4E\u4E8E {score} \u5206\u3001\u6216\u51B2\u7A81\u7B49\u4E86 {days} \u5929\u4EE5\u4E0A\u65F6\u63D0\u9192\u4F60\u3002",
  "settings.target.label": "\u8DE8\u9879\u76EE\u7684\u8BB0\u5FC6\u653E\u5230",
  "settings.target.plugin-global": "\u63D2\u4EF6\u7684\u5168\u5C40\u8BB0\u5FC6",
  "settings.target.agents-md": "AGENTS.md",
  "settings.target.pluginHint": "\u63D0\u5347\u4E3A\u5168\u5C40\u7684\u8BB0\u5FC6\u7531\u63D2\u4EF6\u7BA1\u7406\uFF0C\u6BCF\u4E2A\u9879\u76EE\u7684\u5BF9\u8BDD\u90FD\u4F1A\u5E26\u5165\u3002",
  "settings.target.agentsHint": "\u5199\u8FDB AGENTS.md \u540E\u7531 dsh \u8BFB\u53D6\uFF0C\u63D2\u4EF6\u4E0D\u518D\u7BA1\u7406\u8FD9\u4E9B\u5185\u5BB9\uFF1A\u4E0D\u4F53\u68C0\uFF0C\u4E5F\u4E0D\u5728\u8BB0\u5FC6\u9875\u663E\u793A\u3002",
  "settings.deleted.label": "\u5220\u9664\u7684\u8BB0\u5FC6",
  "settings.deleted.open": "\u67E5\u770B\u6700\u8FD1\u5220\u9664 \u203A",
  "settings.deleted.hint": "\u5220\u9664\u540E\u4FDD\u7559 14 \u5929\uFF0C\u671F\u95F4\u53EF\u4EE5\u6062\u590D\uFF1B\u542B\u5BC6\u94A5\u7684\u8BB0\u5FC6\u5220\u9664\u65F6\u76F4\u63A5\u5F7B\u5E95\u5220\u9664\u3002",
  "settings.root.label": "\u8BB0\u5FC6\u6587\u4EF6\u4F4D\u7F6E",
  "settings.root.hint": "\u53EA\u8BFB\u3002\u8981\u6362\u4F4D\u7F6E\uFF0C\u5728 profile \u91CC\u6539 memoryRoot\u3002",
  "settings.root.unknown": "\u5F00\u4E00\u4E2A\u4F1A\u8BDD\u540E\u663E\u793A\u5B9E\u9645\u8DEF\u5F84\u3002",
  "settings.confirm.title": "\u4FDD\u5B58\u8FD9\u4E9B\u6539\u52A8\uFF1F",
  "settings.confirm.item": "{label}\uFF1A{change}",
  "settings.confirm.change": "{from} \u2192 {to}",
  "settings.confirm.added": "\u65B0\u589E{names}",
  "settings.confirm.edited": "\u4FEE\u6539{names}",
  "settings.confirm.removed": "\u5220\u9664{names}",
  "settings.confirm.reset": "\u6062\u590D\u9ED8\u8BA4{names}",
  "settings.confirm.restored": "\u6062\u590D{names}",
  "settings.confirm.presets": "\u9884\u8BBE\u7C7B\u578B",
  "settings.confirm.current": "\u5F53\u524D\u573A\u666F",
  "settings.confirm.scenes": "\u573A\u666F",
  "settings.confirm.retype": "\u300C{label}\u300D\u6539\u540D\u4E3A {to}\uFF0C{n} \u6761\u8BB0\u5FC6\u8DDF\u7740\u6539",
  "settings.confirm.retypeUnknown": "\u300C{label}\u300D\u6539\u540D\u4E3A {to}\uFF0C\u5DF2\u6709\u8BB0\u5FC6\u8DDF\u7740\u6539",
  "settings.confirm.forget": "\u300C{label}\u300D\u5728\u7528\u7684\u8BB0\u5FC6\u79FB\u5230\u6700\u8FD1\u5220\u9664",
  "settings.confirm.partSep": "\uFF1B",
  "settings.confirm.cancel": "\u53D6\u6D88",
  "settings.confirm.save": "\u4FDD\u5B58",
  "settings.confirm.close": "\u5173\u95ED",
  "settings.conflict": "\u8FD9\u4EFD\u914D\u7F6E\u521A\u5728\u522B\u5904\u6539\u8FC7\uFF0C\u4F60\u7684\u6539\u52A8\u6CA1\u6709\u4FDD\u5B58\u3002\u8F7D\u5165\u6700\u65B0\u914D\u7F6E\u540E\u518D\u6539\u3002",
  "settings.conflict.reload": "\u8F7D\u5165\u6700\u65B0\u914D\u7F6E",
  "settings.migration.running": "\u914D\u7F6E\u5DF2\u4FDD\u5B58\uFF0C\u6B63\u5728\u5904\u7406\u5DF2\u6709\u8BB0\u5FC6\u2026",
  "settings.migration.failed": "\u914D\u7F6E\u5DF2\u4FDD\u5B58\uFF0C\u6709\u8BB0\u5FC6\u6CA1\u8FC1\u8FC7\u53BB\u3002",
  "settings.migration.retry": "\u91CD\u8BD5",
  "settings.migration.secrets": "{n} \u6761\u542B\u5BC6\u94A5\u7684\u8BB0\u5FC6\u6CA1\u6709\u79FB\u5230\u6700\u8FD1\u5220\u9664\uFF0C\u53BB\u8BB0\u5FC6\u9875\u5904\u7406\u3002"
};
var settingsEn = {
  "settings.loading": "Loading settings\u2026",
  "settings.status.noSession": "Open a session to see memory status here",
  "settings.status.loading": "Loading memory status\u2026",
  "settings.status.empty": "No memories yet",
  "settings.status.unscanned": "Memories have not been checked yet",
  "settings.status.ok": "All good",
  "settings.status.pending": "{n} waiting for your decision",
  "settings.status.secret": "A secret needs attention",
  "settings.status.count": "{n} memories",
  "settings.status.count.one": "{n} memory",
  "settings.status.lastScan": "Last checkup: {date}",
  "settings.status.neverScanned": "Never checked",
  "settings.status.open": "Open Memory page \u203A",
  "settings.group.what": "What to remember",
  "settings.group.how": "How to use",
  "settings.group.manage": "How to manage",
  "settings.group.look": "Appearance",
  "settings.accent.label": "Theme color",
  "settings.accent.ella": "Ella",
  "settings.accent.blue-whale": "Blue Whale",
  "settings.scene.label": "Scene",
  "settings.scene.custom": "General",
  "settings.scene.coding": "Coding",
  "settings.scene.office": "Office",
  "settings.scene.edited": "Edited",
  "settings.scene.edit": "Edit",
  "settings.scene.reset": "Restore default",
  "settings.scene.remove": "Delete",
  "settings.scene.editAria": "Edit scene {name}",
  "settings.scene.resetAria": "Restore default for {name}",
  "settings.scene.removeAria": "Delete scene {name}",
  "settings.scene.removeQuestion": "Delete \u201C{name}\u201D?",
  "settings.scene.removeCurrent": "Delete \u201C{name}\u201D? The current scene goes back to General.",
  "settings.scene.removeConfirm": "Delete",
  "settings.scene.cancel": "Cancel",
  "settings.scene.add": "New scene",
  "settings.scene.remaining": "{n} more allowed",
  "settings.unsaved": "Unsaved changes: {n}",
  "settings.scene.generalTypes": "the five general types",
  "settings.scene.listSep": ", ",
  "settings.scene.groupSep": " + ",
  "settings.scene.dropHint": "After saving, no new {types} memories are added; existing ones are still brought in and searchable.",
  "settings.typeOpen": "\u201C",
  "settings.typeSep": "\u201D, \u201C",
  "settings.typeClose": "\u201D",
  "settings.types.label": "My types",
  "settings.types.title": "Memory types",
  "settings.types.create": "New type",
  "settings.types.intro": "Shared by all scenes. To use one, tick it under a scene\u2019s Edit.",
  "settings.types.add": "+ New type",
  "settings.types.edit": "Edit",
  "settings.types.remove": "Delete",
  "settings.types.editAria": "Edit {name}",
  "settings.types.removeAria": "Delete {name}",
  "settings.types.usedBy": "Used by {names}",
  "settings.types.unused": "Not used by any scene",
  "settings.types.count": "{n} memories",
  "settings.types.group.general": "General",
  "settings.types.group.preset": "Presets",
  "settings.types.group.custom": "My types",
  "settings.types.view": "View",
  "settings.types.viewAria": "View {name}",
  "settings.types.removedLine": "Deleted: {label}",
  "settings.types.restore": "Restore",
  "settings.types.restoreAria": "Restore {name}",
  "settings.sceneDialog.addTitle": "New scene",
  "settings.sceneDialog.editTitle": "Edit scene",
  "settings.sceneDialog.name": "Scene name",
  "settings.sceneDialog.general": "General (included by default, can be removed)",
  "settings.sceneDialog.preset": "Presets",
  "settings.sceneDialog.custom": "My types (shared by all scenes)",
  "settings.sceneDialog.count": "{n} / {max} selected",
  "settings.sceneDialog.limit": "At most {max} types, at least 1",
  "settings.sceneDialog.full": "Already {max} types. Untick one to add \u201C{name}\u201D.",
  "settings.sceneDialog.error.required": "Required.",
  "settings.sceneDialog.error.label-taken": "A scene with this name already exists.",
  "settings.sceneDialog.error.types-empty": "Tick at least one type.",
  "settings.sceneDialog.cancel": "Cancel",
  "settings.sceneDialog.confirm": "OK",
  "settings.sceneDialog.close": "Close",
  "settings.sceneDialog.back": "\u2039 Back",
  "settings.sceneDialog.autoPick": "Ticked in \u201C{name}\u201D once created; every scene can use it.",
  "settings.type.addTitle": "New type",
  "settings.type.editTitle": "Edit type",
  "settings.type.label": "Display name",
  "settings.type.labelHint": "For example \u201CDomain term\u201D.",
  "settings.type.name": "Identifier",
  "settings.type.nameHint": "Lowercase letters and hyphens, for example domain-term.",
  "settings.type.nameLocked": "A preset type\u2019s identifier can\u2019t be changed.",
  "settings.type.description": "Description",
  "settings.type.descriptionHint": "Written for the agent: start with one sentence on what this kind of memory holds; how to write it and an example help.",
  "settings.type.whenToSave": "When to save",
  "settings.type.whenToSaveHint": "Written for the agent: when it should save one.",
  "settings.type.howToUse": "How to use once brought in",
  "settings.type.howToUseHint": "Written for the agent: how to use these memories once they are brought in. Optional.",
  "settings.type.recall": "Recall",
  "settings.type.recall.core": "Always",
  "settings.type.recall.search": "Search",
  "settings.type.recall.passive": "Passive",
  "settings.type.recallHint": "Always: full text in every chat. Search: one index line, the agent reads it when needed. Passive: only the name is listed, using the least context.",
  "settings.type.priority": "Governance priority",
  "settings.type.priority.high": "High",
  "settings.type.priority.medium": "Medium",
  "settings.type.priority.low": "Low",
  "settings.type.priorityHint": "Higher-priority types are brought in first and checked first.",
  "settings.type.decayDays": "Decay after (days)",
  "settings.type.decayDaysHint": "Unconfirmed for longer than this, it is marked as possibly outdated. Leave empty for no decay.",
  "settings.type.noDecay": "No decay",
  "settings.type.error.required": "Required.",
  "settings.type.error.name-format": "Use lowercase letters and hyphens only, for example domain-term.",
  "settings.type.error.name-builtin": "This is a built-in type. Pick another name.",
  "settings.type.error.name-taken": "This identifier is already used.",
  "settings.type.error.name-removed-preset": "This is a deleted preset type. Restore it under Presets to use it.",
  "settings.type.error.name-pending": "Old memories still carry this identifier. Use it after saving.",
  "settings.type.error.label-taken": "A type named \u201C{label}\u201D already exists.",
  "settings.type.renameAsk": "\u201C{label}\u201D has {n} memories. After renaming:",
  "settings.type.renameAskUnknown": "\u201C{label}\u201D may have memories. After renaming:",
  "settings.type.retype": "Rename them too",
  "settings.type.forget": "Move to Recently deleted",
  "settings.type.keep": "Keep memories",
  "settings.type.noSession": "Open a session to handle existing memories.",
  "settings.type.removeQuestion": "Delete \u201C{label}\u201D?",
  "settings.type.removeAlsoUsed": "{scenes} also use it and will lose it too.",
  "settings.type.removeUsed": "{scenes} use it and will lose it too.",
  "settings.type.removeMemories": "It has {n} memories.",
  "settings.type.removeMemoriesUnknown": "It may have memories.",
  "settings.type.removeConfirm": "Delete",
  "settings.type.removeBlocked": "\u201C{scene}\u201D has only this type left. Add another type to it first.",
  "settings.type.error.decay-invalid": "Enter a whole number above 0, or leave it empty.",
  "settings.budget.label": "Limit for memories auto-loaded at chat start (tokens)",
  "settings.budget.hint": "Default 4,000, about 6,700 Chinese characters or 13,000 English characters. Covers global and current-project memories, loaded as full text, one index line or just the name, per each type's Recall setting. Memories found by search during a chat don't count.",
  "settings.budget.invalid": "Enter a whole number above 0.",
  "settings.overflow.label": "When over the limit",
  "settings.overflow.relax": "Relax automatically",
  "settings.overflow.strict": "Keep to the limit",
  "settings.overflow.relaxHint": "Relax automatically: everything is still brought in; you are reminded each time it grows by another 25% of the limit. Nothing is cut.",
  "settings.overflow.strictHint": "Keep to the limit: whatever does not fit is left out; you are reminded at 95%.",
  "settings.evidence.label": "Check memory sources",
  "settings.evidence.off": "Only when you ask",
  "settings.evidence.strict": "On contradictions or high risk",
  "settings.evidence.active": "Proactively",
  "settings.evidence.hint": "The agent goes back to the chat a memory came from to check the original words, reasons and constraints.",
  "settings.usage.reloadNote": "After saving, open chats bring memories in again with their next message, which uses a few more tokens.",
  "settings.governanceOff": "Checkups are turned off in the config file",
  "settings.sensitivity.label": "Reminder sensitivity",
  "settings.sensitivity.conservative": "Conservative",
  "settings.sensitivity.normal": "Standard",
  "settings.sensitivity.proactive": "Proactive",
  "settings.sensitivity.hint": "Reminds you when the health score drops below {score}, or a conflict has waited more than {days} days.",
  "settings.target.label": "Put cross-project memories in",
  "settings.target.plugin-global": "Plugin global memory",
  "settings.target.agents-md": "AGENTS.md",
  "settings.target.pluginHint": "Promoted memories stay managed by the plugin and are brought into chats in every project.",
  "settings.target.agentsHint": "Written to AGENTS.md and read by dsh; the plugin no longer manages them: no checkups, not shown on the Memory page.",
  "settings.deleted.label": "Deleted memories",
  "settings.deleted.open": "View recently deleted \u203A",
  "settings.deleted.hint": "Kept for 14 days and restorable meanwhile; memories containing secrets are deleted permanently right away.",
  "settings.root.label": "Memory folder",
  "settings.root.hint": "Read-only. To move it, change memoryRoot in the profile.",
  "settings.root.unknown": "Open a session to see the actual path.",
  "settings.confirm.title": "Save these changes?",
  "settings.confirm.item": "{label}: {change}",
  "settings.confirm.change": "{from} \u2192 {to}",
  "settings.confirm.added": "added {names}",
  "settings.confirm.edited": "edited {names}",
  "settings.confirm.removed": "deleted {names}",
  "settings.confirm.reset": "restored the default of {names}",
  "settings.confirm.restored": "restored {names}",
  "settings.confirm.presets": "Preset types",
  "settings.confirm.current": "Current scene",
  "settings.confirm.scenes": "Scenes",
  "settings.confirm.retype": "\u201C{label}\u201D renamed to {to}, {n} memories follow",
  "settings.confirm.retypeUnknown": "\u201C{label}\u201D renamed to {to}, existing memories follow",
  "settings.confirm.forget": "\u201C{label}\u201D memories in use moved to Recently deleted",
  "settings.confirm.partSep": "; ",
  "settings.confirm.cancel": "Cancel",
  "settings.confirm.save": "Save",
  "settings.confirm.close": "Close",
  "settings.conflict": "These settings were just changed elsewhere, so your changes were not saved. Load the latest settings, then edit again.",
  "settings.conflict.reload": "Load latest settings",
  "settings.migration.running": "Settings saved. Updating existing memories\u2026",
  "settings.migration.failed": "Settings saved, but some memories were not updated.",
  "settings.migration.retry": "Retry",
  "settings.migration.secrets": "{n} memories containing secrets were not moved to Recently deleted; handle them on the Memory page."
};

// client/locales.ts
var NS = "plastic-memory";
var zh = {
  "nav.label": "\u8BB0\u5FC6",
  "page.title": "\u8BB0\u5FC6",
  "page.settings": "\u8BBE\u7F6E",
  "scope.global": "\u5168\u5C40",
  "scope.workspace": "\u672C\u9879\u76EE",
  "type.profile": "\u7528\u6237\u753B\u50CF",
  "type.preference": "\u884C\u4E3A\u504F\u597D",
  "type.knowledge": "\u4E8B\u5B9E\u4E0E\u7ECF\u9A8C",
  "type.project": "\u9879\u76EE\u4FE1\u606F",
  "type.reference": "\u53C2\u8003\u5F15\u7528",
  "type.procedure": "\u53EF\u590D\u7528\u6D41\u7A0B",
  "type.decision": "\u51B3\u5B9A",
  "type.commitment": "\u627F\u8BFA",
  "type.person": "\u4EBA\u7269",
  "rail.label": "\u8303\u56F4",
  "rail.settings": "\u63D2\u4EF6\u8BBE\u7F6E",
  "scope.all": "\u5168\u90E8",
  "scope.all.sub": "{n} \u4E2A\u9879\u76EE\u548C\u5168\u5C40",
  "scope.all.sub.one": "{n} \u4E2A\u9879\u76EE\u548C\u5168\u5C40",
  "scope.all.sub.none": "\u53EA\u6709\u5168\u5C40",
  "scope.global.sub": "\u6240\u6709\u9879\u76EE\u5171\u7528",
  "scope.currentChat": "\u5F53\u524D\u5BF9\u8BDD",
  "narrow.others": "\u5176\u4ED6\u8303\u56F4\u8FD8\u6709 {n} \u4EF6\u5F85\u5904\u7406 \u203A",
  "rail.count": "{n} \u6761",
  "rail.count.one": "{n} \u6761",
  "rail.unscored": "\u6682\u4E0D\u6253\u5206",
  "rail.badge": "\uFF0C{n} \u4EF6\u5F85\u5904\u7406",
  "rail.badge.secret": "\uFF0C{n} \u4EF6\u5F85\u5904\u7406\uFF0C\u542B\u5BC6\u94A5",
  "status.label": "\u8BB0\u5FC6\u72B6\u51B5",
  "status.unscored": "\u6682\u4E0D\u6253\u5206",
  "status.secretFirst": "\u6709\u5BC6\u94A5\uFF0C\u5148\u5904\u7406",
  "tabs.label": "\u8BB0\u5FC6\u89C6\u56FE",
  "tab.todo": "\u5904\u7406",
  "tab.todo.advice": "\xB7 \u53EF\u6574\u7406 {n}",
  "tab.library": "\u8BB0\u5FC6\u67E5\u770B",
  "tab.deleted": "\u6700\u8FD1\u5220\u9664",
  "session.none.title": "\u5F00\u4E00\u4E2A\u4F1A\u8BDD\u540E\u8FD9\u91CC\u53EF\u7528",
  "session.none.body": "\u5F00\u59CB\u4E00\u6B21\u5BF9\u8BDD\u540E\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u8BB0\u5FC6\u548C\u4F53\u68C0\u7ED3\u679C\u3002",
  "session.none.hint": "\u5148\u5F00\u4E00\u4E2A\u4F1A\u8BDD",
  "view.loading": "\u6B63\u5728\u8BFB\u53D6\u2026",
  "view.missing": "\u8FD8\u6CA1\u6709\u751F\u6210\u8FD9\u4EFD\u6570\u636E\u3002",
  "view.outdated": "\u6570\u636E\u683C\u5F0F\u5DF2\u66F4\u65B0\uFF0C\u9700\u8981\u5237\u65B0\u3002",
  "view.error": "\u8BFB\u53D6\u5931\u8D25\uFF1A{message}",
  "command.failed": "\u6CA1\u6709\u6210\u529F\uFF1A{detail}",
  "command.handledElsewhere": "\u8FD9\u6B21\u64CD\u4F5C\u6CA1\u6709\u751F\u6548\uFF1A\u8FD9\u4E00\u6761\u6B63\u5728\u522B\u5904\u5904\u7406\uFF0C\u6216\u8005\u521A\u5728\u522B\u5904\u5904\u7406\u5B8C\u3002",
  "time.justNow": "\u521A\u521A",
  "time.monthDay": "{month} \u6708 {day} \u65E5",
  "time.yearMonthDay": "{year} \u5E74 {month} \u6708 {day} \u65E5",
  "time.dayTime": "{date} {time}",
  "source.user-explicit": "\u4F60\u660E\u786E\u8BF4\u7684",
  "source.user-behavior": "\u4ECE\u4F60\u7684\u505A\u6CD5\u770B\u51FA",
  "source.environment-observed": "\u4ECE\u73AF\u5883\u89C2\u5BDF\u5230",
  "source.agent-inferred": "agent \u63A8\u65AD",
  "source.agent-action-confirmed": "agent \u64CD\u4F5C\u540E\u786E\u8BA4",
  "source.none": "\u65E0\u51FA\u5904",
  "memory.expired": "\u4E0D\u518D\u5E26\u5165\u5BF9\u8BDD",
  "memory.expand": "\u5C55\u5F00",
  "memory.collapse": "\u6536\u8D77",
  "memory.delegated.pending": "\u5B50 agent \u5199\u5165 \xB7 \u7B2C {depth} \u5C42 \xB7 \u5F85\u786E\u8BA4",
  "memory.delegated.main": "\u5B50 agent \u5199\u5165 \xB7 \u7B2C {depth} \u5C42 \xB7 \u4E3B\u4F1A\u8BDD\u5DF2\u63A5\u53D7",
  "memory.delegated.user": "\u5B50 agent \u5199\u5165 \xB7 \u7B2C {depth} \u5C42 \xB7 \u7528\u6237\u5DF2\u6539",
  "marker.secret": "\u6709\u5BC6\u94A5\u8981\u5904\u7406",
  "advice.label": "\u5EFA\u8BAE",
  "advice.label.note": "\u8BF4\u660E",
  "conflict.title": "\u4E24\u6761\u8BB0\u5FC6\u4E92\u76F8\u77DB\u76FE\uFF0C\u7B49\u4F60\u51B3\u5B9A",
  "conflict.side": "\u8BB0\u5FC6 {side}",
  "conflict.purgedSide": "{side} \u542B\u5BC6\u94A5\uFF0C\u5DF2\u5F7B\u5E95\u5220\u9664\u3002\u5982\u679C\u5B83\u662F\u771F\u7684\u51ED\u8BC1\uFF0C\u8BB0\u5F97\u53BB\u6362\u4E00\u4E2A\u65B0\u7684\u3002",
  "conflict.purgedMemory": "\u8FD9\u6761\u8BB0\u5FC6\u542B\u5BC6\u94A5\uFF0C\u5DF2\u5F7B\u5E95\u5220\u9664\u3002\u5982\u679C\u5B83\u662F\u771F\u7684\u51ED\u8BC1\uFF0C\u8BB0\u5F97\u53BB\u6362\u4E00\u4E2A\u65B0\u7684\u3002",
  "conflict.twoSentences": "{first}{second}",
  "conflict.missing": "\u8FD9\u6761\u8BB0\u5FC6\u627E\u4E0D\u5230\u4E86\uFF0C\u53EF\u80FD\u5DF2\u7ECF\u88AB\u5220\u9664\u3002",
  "conflict.missingHint": "\u6709\u4E00\u6761\u8BB0\u5FC6\u627E\u4E0D\u5230\u4E86\uFF0C\u5148\u91CD\u65B0\u4F53\u68C0",
  "conflict.vertical.title": "\u8FD9\u6761\u8BB0\u5FC6\u548C\u57FA\u7EBF\u77DB\u76FE\uFF0C\u7B49\u4F60\u51B3\u5B9A",
  "conflict.vertical.baseline": "\u6307\u4EE4\u6587\u4EF6\u4E0D\u4F1A\u88AB\u6539\u52A8\uFF0C\u5904\u7406\u53EA\u9488\u5BF9\u8FD9\u6761\u8BB0\u5FC6\u3002",
  "conflict.vertical.baselineRef": "\u57FA\u7EBF\uFF1A{ref}",
  "budget.summary": "{count} \u6761 \xB7 \u7EA6 {used} / {budget}",
  "budget.summary.one": "{count} \u6761 \xB7 \u7EA6 {used} / {budget}",
  // 图例与输入框弹层明细共用：色块 + 名称 + 数字；固定说明只剩不计上限的导航图与尾注，标题单列
  "budget.part.workspace": "\u672C\u9879\u76EE",
  "budget.part.global": "\u5168\u5C40",
  "budget.part.headings": "\u6807\u9898",
  "budget.part.uncounted": "\u56FA\u5B9A\u8BF4\u660E",
  "budget.key": "{name} {n}",
  "budget.keyUncounted": "{name} {n}\uFF08\u4E0D\u8BA1\u4E0A\u9650\uFF09",
  "budget.nameUncounted": "{name}\uFF08\u4E0D\u8BA1\u4E0A\u9650\uFF09",
  "budget.allIn": "\u5168\u90E8\u5E26\u5165",
  "budget.truncated": "\u5DF2\u5230\u4E0A\u9650\uFF0C{n} \u6761\u6CA1\u5E26\u5165",
  "budget.handle": "\u5904\u7406 \u203A",
  "budget.relaxed": "\u5DF2\u653E\u5BBD\u5230 {cap}",
  "budget.aria": "\u5DF2\u7528\u4E0A\u9650\u7684 {percent}%\uFF1A\u672C\u9879\u76EE {workspace}\uFF0C\u5168\u5C40 {global}\uFF0C\u6807\u9898 {headings}\uFF1B\u56FA\u5B9A\u8BF4\u660E {uncounted}\uFF0C\u4E0D\u8BA1\u4E0A\u9650",
  "budget.ariaNoHeadings": "\u5DF2\u7528\u4E0A\u9650\u7684 {percent}%\uFF1A\u672C\u9879\u76EE {workspace}\uFF0C\u5168\u5C40 {global}\uFF1B\u56FA\u5B9A\u8BF4\u660E {uncounted}\uFF0C\u4E0D\u8BA1\u4E0A\u9650",
  "settings.save": "\u4FDD\u5B58",
  "settings.saving": "\u6B63\u5728\u4FDD\u5B58\u2026",
  "settings.saveFailed": "\u6CA1\u6709\u4FDD\u5B58\u6210\u529F\uFF0C\u518D\u8BD5\u4E00\u6B21\u3002",
  "settings.readOnly": "\u5F53\u524D\u914D\u7F6E\u662F\u53EA\u8BFB\u7684\uFF0C\u6539\u4E0D\u4E86\u3002",
  "settings.unavailable": "DeepSeek Harness \u6682\u65F6\u6CA1\u6709\u63D0\u4F9B\u8FD9\u4EFD\u914D\u7F6E\u3002",
  ...composerZh,
  ...libraryZh,
  ...chatZh,
  ...healthZh,
  ...checkupZh,
  ...pendingZh,
  ...sidebarZh,
  ...settingsZh
};
var en = {
  "nav.label": "Memory",
  "page.title": "Memory",
  "page.settings": "Settings",
  "scope.global": "Global",
  "scope.workspace": "This project",
  "type.profile": "Profile",
  "type.preference": "Preference",
  "type.knowledge": "Facts & lessons",
  "type.project": "Project",
  "type.reference": "Reference",
  "type.procedure": "Procedure",
  "type.decision": "Decision",
  "type.commitment": "Commitment",
  "type.person": "Person",
  "rail.label": "Scopes",
  "rail.settings": "Plugin settings",
  "scope.all": "All",
  "scope.all.sub": "{n} projects and global",
  "scope.all.sub.one": "{n} project and global",
  "scope.all.sub.none": "Global only",
  "scope.global.sub": "Shared by all projects",
  "scope.currentChat": "Current chat",
  "narrow.others": "Other scopes have {n} to do \u203A",
  "rail.count": "{n} memories",
  "rail.count.one": "{n} memory",
  "rail.unscored": "Not scored",
  "rail.badge": ", {n} to do",
  "rail.badge.secret": ", {n} to do, including a secret",
  "status.label": "Memory status",
  "status.unscored": "Not scored",
  "status.secretFirst": "Has a secret, handle it first",
  "tabs.label": "Memory views",
  "tab.todo": "To do",
  "tab.todo.advice": "\xB7 Cleanup {n}",
  "tab.library": "Browse",
  "tab.deleted": "Recently deleted",
  "session.none.title": "Available once you open a session",
  "session.none.body": "Start a chat, and your memories and checkup results will show up here.",
  "session.none.hint": "Open a session first",
  "view.loading": "Loading\u2026",
  "view.missing": "This data has not been generated yet.",
  "view.outdated": "The data format changed and needs a refresh.",
  "view.error": "Could not read: {message}",
  "command.failed": "Did not work: {detail}",
  "command.handledElsewhere": "This did not take effect: it is being handled elsewhere, or was just handled there.",
  "time.justNow": "Just now",
  "time.monthDay": "{monthName} {day}",
  "time.yearMonthDay": "{monthName} {day}, {year}",
  "time.dayTime": "{date}, {time}",
  "source.user-explicit": "You said so",
  "source.user-behavior": "From what you did",
  "source.environment-observed": "Observed in the environment",
  "source.agent-inferred": "Inferred by the agent",
  "source.agent-action-confirmed": "Confirmed after an agent action",
  "source.none": "No source",
  "memory.expired": "No longer brought into chats",
  "memory.expand": "Expand",
  "memory.collapse": "Collapse",
  "memory.delegated.pending": "Written by a subagent \xB7 level {depth} \xB7 pending review",
  "memory.delegated.main": "Written by a subagent \xB7 level {depth} \xB7 accepted by the main session",
  "memory.delegated.user": "Written by a subagent \xB7 level {depth} \xB7 edited by you",
  "marker.secret": "A secret needs attention",
  "advice.label": "Suggestion",
  "advice.label.note": "Note",
  "conflict.title": "Two memories contradict each other",
  "conflict.side": "Memory {side}",
  "conflict.purgedSide": "{side} held a secret and was deleted permanently. If it was a real credential, remember to rotate it.",
  "conflict.purgedMemory": "This memory held a secret and was deleted permanently. If it was a real credential, remember to rotate it.",
  "conflict.twoSentences": "{first} {second}",
  "conflict.missing": "This memory can no longer be found. It may have been deleted.",
  "conflict.missingHint": "One memory is missing. Run a checkup first",
  "conflict.vertical.title": "This memory contradicts the baseline",
  "conflict.vertical.baseline": "The instruction file is never changed; this only affects the memory.",
  "conflict.vertical.baselineRef": "Baseline: {ref}",
  "budget.summary": "{count} memories \xB7 ~{used} / {budget}",
  "budget.summary.one": "{count} memory \xB7 ~{used} / {budget}",
  "budget.part.workspace": "This project",
  "budget.part.global": "Global",
  "budget.part.headings": "Headings",
  "budget.part.uncounted": "Fixed notes",
  "budget.key": "{name} {n}",
  "budget.keyUncounted": "{name} {n} (outside the limit)",
  "budget.nameUncounted": "{name} (outside the limit)",
  "budget.allIn": "All brought in",
  "budget.truncated": "At the limit, {n} not brought in",
  "budget.handle": "Handle \u203A",
  "budget.relaxed": "Relaxed to {cap}",
  "budget.aria": "{percent}% of the limit used: this project {workspace}, global {global}, headings {headings}; fixed notes {uncounted}, outside the limit",
  "budget.ariaNoHeadings": "{percent}% of the limit used: this project {workspace}, global {global}; fixed notes {uncounted}, outside the limit",
  "settings.save": "Save",
  "settings.saving": "Saving\u2026",
  "settings.saveFailed": "Could not save. Try again.",
  "settings.readOnly": "These settings are read-only.",
  "settings.unavailable": "DeepSeek Harness is not serving these settings right now.",
  ...composerEn,
  ...libraryEn,
  ...chatEn,
  ...healthEn,
  ...checkupEn,
  ...pendingEn,
  ...sidebarEn,
  ...settingsEn
};

// client/path.ts
function baseName(path) {
  const parts = path.replace(/[\\/]+$/, "").split(/[\\/]/);
  return parts[parts.length - 1] || path;
}
var isMac = () => typeof navigator !== "undefined" && /mac/i.test(navigator.platform);

// client/i18n.tsx
function createTranslator(dict) {
  return (key, params) => {
    const template = dict[key] ?? key;
    if (params === void 0) return template;
    return template.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match);
  };
}
var TranslateContext = (0, import_react.createContext)(createTranslator(zh));
var TranslateProvider = TranslateContext.Provider;
function useT() {
  return (0, import_react.useContext)(TranslateContext);
}
function useHostTranslate(locale, ns) {
  const subscribe = (0, import_react.useCallback)((fn) => locale.subscribe(fn), [locale]);
  const snapshot = (0, import_react.useSyncExternalStore)(subscribe, () => locale.getSnapshot());
  return (0, import_react.useMemo)(() => {
    const bound = locale.bind(ns);
    return (key, params) => bound(key, params);
  }, [locale, ns, snapshot]);
}
function formatNumber(n) {
  return Math.round(n).toLocaleString("en-US");
}
var MONTH_NAME = new Intl.DateTimeFormat("en-US", { month: "short" });
function formatDay(ms, now, t) {
  if (Math.abs(now - ms) < 6e4) return t("time.justNow");
  const d = new Date(ms);
  const params = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), monthName: MONTH_NAME.format(d) };
  return d.getFullYear() === new Date(now).getFullYear() ? t("time.monthDay", params) : t("time.yearMonthDay", params);
}
function formatDayTime(ms, now, t) {
  const d = new Date(ms);
  const params = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), monthName: MONTH_NAME.format(d) };
  const date = d.getFullYear() === new Date(now).getFullYear() ? t("time.monthDay", params) : t("time.yearMonthDay", params);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return t("time.dayTime", { date, time });
}

// client/nav.ts
var PANEL_ID = "plastic-memory";
var SIDEBAR_TAB_ID = "dsh-plastic-memory";
var SIDEBAR_TAB_KIND = "plastic-memory";
var MEMORY_VIEWS = ["todo", "library", "deleted"];
var ALL_SCOPE = { kind: "all" };
function samePageScope(a, b) {
  if (a.kind === "all" || b.kind === "all") return a.kind === b.kind;
  return sameScope(a, b);
}
function isInScope(scopes, scope) {
  return scope.kind === "all" || scopes.some((s) => sameScope(s, scope));
}
function compareScopes(a, b) {
  if (a.kind === "global" || b.kind === "global") return a.kind === b.kind ? 0 : a.kind === "global" ? -1 : 1;
  return baseName(a.workspacePath).localeCompare(baseName(b.workspacePath)) || a.workspacePath.localeCompare(b.workspacePath);
}
function scopeLabel(scope, t) {
  return scope.kind === "all" ? t("scope.all") : scope.kind === "global" ? t("scope.global") : baseName(scope.workspacePath);
}
function allScopesSub(projects, t) {
  if (projects === 0) return t("scope.all.sub.none");
  return t(projects === 1 ? "scope.all.sub.one" : "scope.all.sub", { n: formatNumber(projects) });
}
var LEGACY_VIEW = { pending: "todo", health: "todo", library: "library", deleted: "deleted" };
function toNavTarget(target) {
  if (!("tab" in target)) return target;
  const { tab, ...rest } = target;
  return { view: LEGACY_VIEW[tab], ...rest };
}
function createNavStore(initial = { view: "todo" }, opts = {}) {
  let target = initial;
  let entered = false;
  const exits = { settings: opts.openSettings, sidebarTab: opts.openSidebarTab };
  const listeners = /* @__PURE__ */ new Set();
  const notify = () => {
    for (const fn of listeners) fn();
  };
  const set = (next) => {
    target = next;
    notify();
  };
  return {
    get: () => target,
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    navigate: set,
    enter(next) {
      entered = true;
      set(toNavTarget(next));
    },
    takeEntry() {
      const was = entered;
      entered = false;
      return was;
    },
    update(patch) {
      const { level: _level, newItem: _newItem, ...rest } = target;
      set({ ...rest, ...patch });
    },
    openSettings: () => {
      exits.settings?.();
    },
    openSidebarTab: () => {
      exits.sidebarTab?.();
    },
    canOpen: (exit) => exits[exit] !== void 0,
    provide(exit, open) {
      exits[exit] = open;
      notify();
    }
  };
}
function useNavTarget(nav) {
  return (0, import_react2.useSyncExternalStore)(nav.subscribe, nav.get);
}
function useCanOpen(nav, exit) {
  return (0, import_react2.useSyncExternalStore)(nav.subscribe, () => nav.canOpen(exit));
}
function openMemoryPage(ctx, nav, target) {
  nav.enter(target);
  ctx.layout.selectPanel(PANEL_ID);
}

// client/chat/model-change.tsx
var import_react7 = require("react");

// client/command/confirm.tsx
var import_react4 = require("react");

// client/ui/Button.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function Button({ variant = "secondary", size = "md", unavailable, className, onClick, title, ...rest }) {
  const blocked = unavailable !== void 0;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      type: "button",
      ...rest,
      className: ["pm-btn", `pm-btn--${variant}`, size === "sm" && "pm-btn--sm", className].filter(Boolean).join(" "),
      "aria-disabled": blocked || void 0,
      title: blocked ? unavailable : title,
      onClick: (event) => {
        if (!blocked) onClick?.(event);
      }
    }
  );
}
var buttonCss = `
.pm-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 4px; flex-shrink: 0;
  font: inherit; font-size: 13px; line-height: 1.5; white-space: nowrap;
  padding: 5px 14px; border-radius: var(--dsw-radius-md, 12px);
  border: 0.5px solid var(--pm-line-input); background: var(--pm-bg); color: var(--pm-text);
  cursor: pointer;
}
.pm-btn:hover:not(:disabled):not([aria-disabled='true']) { background: var(--pm-hover); }
/* \u5F00\u5173\u5F0F\u6309\u94AE\u6309\u4E0B\uFF08\u5982\u8BB0\u5FC6\u67E5\u770B\u7684\u300C\u9009\u62E9 \u2192 \u5B8C\u6210\u300D\uFF09\uFF1A\u5E95\u8272\u4FDD\u6301\u6309\u4E0B\u6001\uFF0C\u60AC\u505C\u4E5F\u4E0D\u53D8\u6D45 */
.pm-btn[aria-pressed='true'], .pm-btn[aria-pressed='true']:hover:not(:disabled):not([aria-disabled='true']) { background: var(--pm-pressed); }
.pm-btn--primary { border: 1px solid transparent; background: var(--pm-text); color: var(--pm-bg-raised); }
.pm-btn--primary:hover:not(:disabled):not([aria-disabled='true']) { background: var(--pm-text); }
.pm-btn--sm { padding: 2px 10px; font-size: 12px; }
.pm-btn--quiet {
  height: 24px; padding: 0 8px; font-size: 12px; border: 0;
  border-radius: var(--dsw-radius-sm, 8px); background: var(--pm-hover); color: var(--pm-text-2);
}
.pm-btn--quiet:hover:not(:disabled):not([aria-disabled='true']) { background: var(--pm-pressed); color: var(--pm-text); }
.pm-btn--danger { color: var(--pm-error); border-color: color-mix(in srgb, var(--pm-error) 35%, transparent); }
.pm-btn--ghost { border-color: transparent; background: transparent; color: var(--pm-text-2); }
.pm-btn.pm-btn--icon { width: 24px; height: 24px; padding: 0; border-color: transparent; border-radius: var(--dsw-radius-sm, 8px); background: transparent; color: var(--pm-text-2); }
.pm-btn--icon:hover:not(:disabled):not([aria-disabled='true']) { color: var(--pm-text); }
.pm-btn:disabled, .pm-btn[aria-disabled='true'] { opacity: .4; cursor: default; }
/* \u6309\u4E0B\uFF1A\u4E3B\u6309\u94AE\u8F7B\u8F7B\u4E00\u7F29\uFF08\u51CF\u5C11\u52A8\u6001\u6548\u679C\u65F6\u4E0D\u7F29\uFF09\uFF0C\u5176\u4F59\u6309\u94AE\u5E95\u8272\u52A0\u6DF1 */
@media (prefers-reduced-motion: no-preference) {
  .pm-btn--primary { transition: transform 160ms ease-out; }
  .pm-btn--primary:active:not(:disabled):not([aria-disabled='true']) { transform: scale(0.97); }
}
.pm-btn:not(.pm-btn--primary):active:not(:disabled):not([aria-disabled='true']) { background: var(--pm-pressed); }
`;

// client/ui/focus-return.ts
var import_react3 = require("react");
var FOCUSABLE = "a[href], button, input, select, textarea, summary, [tabindex]";
function labelOf(el) {
  return (el.getAttribute("aria-label") ?? el.textContent ?? "").trim();
}
function spotOf(el) {
  const path = [];
  let node = el;
  while (node.parentElement !== null) {
    const parent = node.parentElement;
    path.push({ parent, index: Array.prototype.indexOf.call(parent.children, node) });
    node = parent;
  }
  return { el, label: labelOf(el), path };
}
function usable(el) {
  return el instanceof HTMLElement && !el.matches(":disabled") && el.closest("[hidden], [inert]") === null;
}
function pick(block, label) {
  const all = [block, ...block.querySelectorAll(FOCUSABLE)].filter((el) => el.matches(FOCUSABLE)).filter(usable);
  const tabbable = all.filter((el) => el.tabIndex >= 0);
  return tabbable.find((el) => labelOf(el) === label) ?? tabbable[0] ?? all[0];
}
function resolve(spot) {
  if (spot.el.isConnected) return spot.el;
  const body = spot.el.ownerDocument.body;
  for (const { parent, index } of spot.path) {
    if (parent === body || parent === spot.el.ownerDocument.documentElement) return void 0;
    if (!parent.isConnected) continue;
    const blocks = [...parent.children];
    const order = [...blocks.slice(index), ...blocks.slice(0, index).reverse()];
    for (const block of order) {
      const hit = pick(block, spot.label);
      if (hit !== void 0) return hit;
    }
  }
  return void 0;
}
function isFocusFree(doc) {
  const active = doc.activeElement;
  return active === null || active === doc.body || !active.isConnected;
}
var stopWatching;
function watch(el) {
  stopWatching?.();
  const doc = el.ownerDocument;
  let spot = spotOf(el);
  const observer = new MutationObserver(() => {
    if (el.isConnected) {
      spot = spotOf(el);
      return;
    }
    stop();
    if (isFocusFree(doc)) resolve(spot)?.focus();
  });
  const onFocusIn = (event) => {
    if (event.target !== el) stop();
  };
  const onFocusOut = () => {
    queueMicrotask(() => {
      if (el.isConnected) stop();
    });
  };
  function stop() {
    observer.disconnect();
    doc.removeEventListener("focusin", onFocusIn, true);
    el.removeEventListener("focusout", onFocusOut);
    if (stopWatching === stop) stopWatching = void 0;
  }
  observer.observe(doc.documentElement, { childList: true, subtree: true });
  doc.addEventListener("focusin", onFocusIn, true);
  el.addEventListener("focusout", onFocusOut);
  stopWatching = stop;
}
var confirmGroups = /* @__PURE__ */ new Set();
function keepFocusInPlace() {
  const active = typeof document === "undefined" ? null : document.activeElement;
  if (!(active instanceof HTMLElement) || active === active.ownerDocument.body) return;
  if ([...confirmGroups].some((group) => group.contains(active))) return;
  watch(active);
}
function returnFocus(spot) {
  if (!isFocusFree(spot.el.ownerDocument)) return;
  const target = resolve(spot);
  if (target === void 0) return;
  target.focus();
  watch(target);
}
function useReturnFocus(group) {
  const [opener] = (0, import_react3.useState)(() => {
    const active = typeof document === "undefined" ? null : document.activeElement;
    return active instanceof HTMLElement && active !== document.body ? spotOf(active) : void 0;
  });
  (0, import_react3.useLayoutEffect)(() => {
    const el = group.current;
    if (el === null) return;
    const spot = opener ?? spotOf(el);
    confirmGroups.add(el);
    return () => {
      confirmGroups.delete(el);
      const active = el.ownerDocument.activeElement;
      if (!isFocusFree(el.ownerDocument) && !el.contains(active)) return;
      queueMicrotask(() => {
        returnFocus(spot);
      });
    };
  }, [group, opener]);
}

// client/command/confirm.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function ConfirmGroup({ label, children }) {
  const ref = (0, import_react4.useRef)(null);
  useReturnFocus(ref);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { ref, className: "pm-pending-confirm", role: "group", "aria-label": label, children });
}
function CrossConfirm({ workspacePath, isMove = false, onCancel, onConfirm }) {
  const t = useT();
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(ConfirmGroup, { label: t("pending.cross.confirm"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "pm-pending-text", children: t(isMove ? "pending.cross.moveBody" : "pending.cross.body", { name: baseName(workspacePath) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "pm-pending-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { variant: "ghost", autoFocus: true, onClick: onCancel, children: t("pending.cancel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { onClick: onConfirm, children: t("pending.cross.confirm") })
    ] })
  ] });
}
function SecretDeleteConfirm({ onCancel, onConfirm, unavailable, showTitle = true, body }) {
  const t = useT();
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(ConfirmGroup, { label: t("pending.secret.confirmDelete"), children: [
    showTitle ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "pm-pending-text pm-pending-confirm-title", children: t("pending.secret.title") }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "pm-pending-text", children: body ?? t("pending.secret.confirmBody") }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "pm-pending-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { variant: "ghost", autoFocus: true, onClick: onCancel, children: t("pending.cancel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { variant: "danger", unavailable, onClick: onConfirm, children: t("pending.secret.confirmDelete") })
    ] })
  ] });
}
function SuspectedConfirm({ onCancel, onConfirm }) {
  const t = useT();
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(ConfirmGroup, { label: t("pending.edit.saveAnyway"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "pm-pending-text", children: t("pending.edit.secretSuspected") }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "pm-pending-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { variant: "ghost", autoFocus: true, onClick: onCancel, children: t("pending.cancel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { onClick: onConfirm, children: t("pending.edit.saveAnyway") })
    ] })
  ] });
}
function CommandFeedback({ runner, id }) {
  const t = useT();
  const state = runner.stateOf(id);
  const cancel = () => {
    runner.cancel(id);
  };
  const confirm = () => {
    runner.confirm(id);
  };
  switch (state.kind) {
    case "confirm-cross":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(CrossConfirm, { workspacePath: state.workspacePath, isMove: state.isMove, onCancel: cancel, onConfirm: confirm });
    case "confirm-secret":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SecretDeleteConfirm, { onCancel: cancel, onConfirm: confirm });
    case "confirm-suspected":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SuspectedConfirm, { onCancel: cancel, onConfirm: confirm });
    case "failed":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "pm-pending-error", role: "alert", children: t("command.failed", { detail: state.isLocalized ? t(state.detail) : state.detail }) });
    case "handled-elsewhere":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "pm-pending-error", role: "status", children: t("command.handledElsewhere") });
    default:
      return null;
  }
}
function SoftDeleteConfirm({ onCancel, onConfirm, question, confirmLabel }) {
  const t = useT();
  const ref = (0, import_react4.useRef)(null);
  const questionId = (0, import_react4.useId)();
  const cancel = (0, import_react4.useRef)(onCancel);
  cancel.current = onCancel;
  useReturnFocus(ref);
  (0, import_react4.useEffect)(() => {
    const doc = ref.current?.ownerDocument;
    if (doc === void 0) return;
    const onPointer = (event) => {
      if (!(ref.current?.contains(event.target) ?? false)) cancel.current();
    };
    doc.addEventListener("pointerdown", onPointer, true);
    return () => {
      doc.removeEventListener("pointerdown", onPointer, true);
    };
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "span",
    {
      ref,
      className: "pm-soft-confirm",
      role: "group",
      "aria-labelledby": questionId,
      onKeyDown: (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      },
      onBlur: (event) => {
        const next = event.relatedTarget;
        if (next !== null && !event.currentTarget.contains(next)) onCancel();
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { id: questionId, children: question ?? t("pending.softDelete.question") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "pm-link", onClick: onConfirm, children: confirmLabel ?? t("pending.softDelete.confirm") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("i", { className: "pm-sep", "aria-hidden": "true", children: "\xB7" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "pm-link pm-link--muted", autoFocus: true, onClick: onCancel, children: t("pending.cancel") })
      ]
    }
  );
}
function DeleteWithConfirm({ trigger, onDelete }) {
  const [isOpen, setOpen] = (0, import_react4.useState)(false);
  if (!isOpen) return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_jsx_runtime2.Fragment, { children: trigger(() => {
    setOpen(true);
  }) });
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SoftDeleteConfirm, { onCancel: () => {
    setOpen(false);
  }, onConfirm: () => {
    setOpen(false);
    onDelete();
  } });
}
var confirmCss = `
.pm-pending-text { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-pending-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.pm-pending-confirm-title { font-weight: 600; color: var(--pm-text); }
.pm-pending-confirm { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: var(--dsw-radius-md, 12px); background: var(--pm-bg-block); }
.pm-pending-error { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text); }
.pm-soft-confirm {
  display: inline-flex; flex: none; align-items: center; min-height: 24px; gap: 8px;
  font-size: 12px; line-height: 1.5; white-space: nowrap; color: var(--pm-text-2);
}
.pm-soft-confirm .pm-sep { margin: 0 -2px; }
.pm-soft-confirm .pm-link { font-size: 12px; }
`;

// client/command/useCommandRunner.ts
var import_react6 = require("react");

// client/gateway.ts
var import_react5 = require("react");

// client/deletions.ts
function copyKey(id, scope) {
  return scope === void 0 ? void 0 : JSON.stringify([id, scopeKey(scope)]);
}
function createDeletionStore() {
  const local2 = /* @__PURE__ */ new Map();
  let deleted;
  let library;
  const seen = /* @__PURE__ */ new Set();
  let viewSoft = { copies: /* @__PURE__ */ new Set(), ids: /* @__PURE__ */ new Set() };
  const listeners = /* @__PURE__ */ new Set();
  const snapshot = () => {
    const mine = [...local2.values()].reverse();
    const soft = viewSoft;
    const seenIds = new Set(seen);
    const at2 = deleted?.at !== void 0 && deleted.at === library?.at ? deleted.at : void 0;
    const lib = library;
    const del = deleted;
    return {
      of(id, scope, savedAt) {
        const copy = copyKey(id, scope);
        const own = mine.find((e) => e.id === id && (copy === void 0 || e.copy === copy)) ?? (copy === void 0 ? void 0 : mine.find((e) => e.id === id && e.copy === void 0));
        if (own !== void 0) return own.how === "restored" ? void 0 : own.how;
        if (copy !== void 0 ? soft.copies.has(copy) : soft.ids.has(id)) return "soft";
        if (savedAt === void 0 || at2 === void 0 || at2 <= savedAt || lib?.inactive === void 0 || del === void 0 || !seenIds.has(id)) return void 0;
        return lib.ids.has(id) || del.ids.has(id) || lib.inactive.has(id) ? void 0 : "hard";
      }
    };
  };
  let state = snapshot();
  const publish = () => {
    state = snapshot();
    for (const fn of listeners) fn();
  };
  return {
    get: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    record(command, result) {
      if (!result.ok || command.cmd !== "forget" && command.cmd !== "hard-delete" && command.cmd !== "restore") return;
      const copy = copyKey(command.memoryId, command.layer);
      const key = copy ?? command.memoryId;
      local2.delete(key);
      local2.set(key, { id: command.memoryId, copy, how: command.cmd === "forget" ? "soft" : command.cmd === "hard-delete" ? "hard" : "restored" });
      publish();
    },
    /** 读到一份最近删除或全部记忆视图：重算视图证明的软删，去掉视图已经确认的本地记录。 */
    settle(view) {
      const keysOf = (memories) => new Set(memories.flatMap((m) => copyKey(m.id, scopeOfMemory(m)) ?? []));
      if (view.name === "deleted") {
        const memories = view.data.items.map((item) => item.memory);
        deleted = { ids: new Set(memories.map((m) => m.id)), copies: keysOf(memories), at: view.data.generatedAt };
        for (const id of deleted.ids) seen.add(id);
      } else {
        const { inactiveIds, hasUnreadFiles } = view.data;
        const memories = view.data.layers.flatMap((s) => s.items);
        library = {
          ids: new Set(memories.map((m) => m.id)),
          copies: keysOf(memories),
          inactive: inactiveIds === void 0 || hasUnreadFiles !== false ? void 0 : new Set(inactiveIds),
          at: view.data.generatedAt
        };
        for (const id of [...library.ids, ...inactiveIds ?? []]) seen.add(id);
      }
      if (deleted === void 0 || library === void 0) {
        publish();
        return;
      }
      const active = library;
      viewSoft = {
        copies: new Set([...deleted.copies].filter((copy) => !active.copies.has(copy))),
        ids: new Set([...deleted.ids].filter((id) => !active.ids.has(id)))
      };
      for (const [key, e] of local2) {
        const isSoft = e.copy !== void 0 ? viewSoft.copies.has(e.copy) : viewSoft.ids.has(e.id);
        const isActive = e.copy !== void 0 ? active.copies.has(e.copy) : active.ids.has(e.id);
        if (e.how === "soft" && isSoft || e.how === "restored" && isActive && !isSoft) local2.delete(key);
      }
      publish();
    }
  };
}

// client/session-pick.ts
function isBorrowable(list2, id) {
  return list2.byId[id] !== void 0 && list2.byId[id].origin !== "subagent";
}
function newest(list2, ids) {
  let best;
  for (const id of ids) {
    if (best === void 0 || list2.byId[id].updatedAt > list2.byId[best].updatedAt) best = id;
  }
  return best;
}
function preferIdle(list2, ids) {
  return newest(list2, ids.filter((id) => !list2.byId[id].running)) ?? newest(list2, ids);
}
function selectedSessionId(list2) {
  return list2.ids.find((id) => (list2.byId[id]?.retainedBy.mainView ?? 0) > 0);
}
function lookup(map, cwd) {
  if (map[cwd] !== void 0) return map[cwd];
  for (const [key, workspacePath] of Object.entries(map)) if (samePath(key, cwd)) return workspacePath;
  return void 0;
}
function deepestContaining(cwd, projects) {
  let best;
  for (const p of projects) {
    if (isWithin(cwd, p) && (best === void 0 || stripTrailing(p).length > stripTrailing(best).length)) best = p;
  }
  return best;
}
function belongsTo(cwd, workspacePath, map) {
  if (cwd === void 0 || workspacePath === void 0) return false;
  const known = lookup(map, cwd);
  if (known !== void 0) return samePath(known, workspacePath);
  const deepest = deepestContaining(cwd, [...Object.values(map), workspacePath]);
  return deepest !== void 0 && samePath(deepest, workspacePath);
}
function workspaceOf(cwd, map) {
  if (cwd === void 0) return void 0;
  return lookup(map, cwd) ?? deepestContaining(cwd, Object.values(map)) ?? cwd;
}
function pickSession(list2, workspacePath, map = {}) {
  const candidates = list2.ids.filter((id2) => isBorrowable(list2, id2));
  const inWorkspace2 = workspacePath === void 0 ? [] : candidates.filter((id2) => belongsTo(list2.byId[id2].cwd, workspacePath, map));
  const selected = selectedSessionId(list2);
  const id = preferIdle(list2, inWorkspace2) ?? (selected !== void 0 && candidates.includes(selected) ? selected : void 0) ?? preferIdle(list2, candidates);
  return id === void 0 ? { kind: "none" } : { kind: "ready", sessionId: id, cwd: list2.byId[id].cwd };
}
var stripTrailing = (p) => p.replace(/[\\/]+$/, "");
function samePath(a, b) {
  return a !== void 0 && b !== void 0 && stripTrailing(a) === stripTrailing(b);
}
function isWithin(path, dir) {
  if (path === void 0 || dir === void 0) return false;
  const p = stripTrailing(path);
  const d = stripTrailing(dir);
  return p === d || p.startsWith(`${d}/`) || p.startsWith(`${d}\\`);
}

// client/settings/config.ts
var ENTRY_ID = "plastic-memory";
var PACKAGE_NAME = "dsh-plastic-memory";
var BUILTIN_TYPE_NAMES = ["profile", "preference", "knowledge", "project", "reference"];
var PRESET_TYPE_NAMES = ["procedure", "decision"];
var RETIRED_TYPE_NAMES = ["commitment", "person"];
function isPresetType(name) {
  return PRESET_TYPE_NAMES.includes(name);
}
var TYPE_DEFINITIONS = {
  profile: {
    label: "\u7528\u6237\u753B\u50CF",
    description: "\u7528\u6237\u672C\u4EBA\u76F8\u5BF9\u7A33\u5B9A\u7684\u60C5\u51B5\uFF1A\u8EAB\u4EFD\u548C\u89D2\u8272\u3001\u5DE5\u4F5C\u6216\u5B66\u4E60\u80CC\u666F\u3001\u6240\u5728\u5730\u533A\u3001\u8BED\u8A00\u4E60\u60EF\u3001\u65E5\u5E38\u751F\u6D3B\u91CC\u7684\u4E60\u60EF\uFF08\u4F5C\u606F\u3001\u996E\u98DF\u3001\u51FA\u884C\u7B49\uFF09\u548C\u5BB6\u5EAD\u60C5\u51B5\u3001\u4E2A\u4EBA\u5174\u8DA3\u3001\u957F\u671F\u76EE\u6807\uFF0C\u4EE5\u53CA\u5BF9\u5404\u7C7B\u77E5\u8BC6\u3001\u6280\u80FD\u548C\u5DE5\u5177\u7684\u719F\u6089\u7A0B\u5EA6\u3002\u6B63\u6587\uFF1A\u4E00\u53E5\u7B2C\u4E09\u4EBA\u79F0\u9648\u8FF0\uFF0C\u4EE5\u300C\u7528\u6237\u300D\u5F00\u5934\uFF0C\u53EA\u5199\u7528\u6237\u8BF4\u5230\u7684\u60C5\u51B5\uFF0C\u7528\u5E73\u5E38\u8BF4\u8BDD\u7684\u8BCD\u5199\u6E05\u695A\uFF1B\u540C\u4E00\u65B9\u9762\u7684\u60C5\u51B5\u5408\u6210\u4E00\u6761\uFF08\u5DE5\u4F5C\u80CC\u666F\u4E00\u6761\u3001\u67D0\u9879\u6280\u80FD\u4E00\u6761\u3001\u6240\u5728\u5730\u533A\u4E00\u6761\uFF09\uFF0C\u60C5\u51B5\u53D8\u4E86\u5C31\u66F4\u65B0\u539F\u6765\u90A3\u6761\u3002\u4F8B\uFF1A\u7528\u6237\u8BF4\u300C\u6211\u5728\u4E0A\u6D77\u505A\u5E73\u9762\u8BBE\u8BA1\uFF0C\u4E0B\u73ED\u540E\u5728\u81EA\u5B66\u65E5\u8BED\uFF0C\u76EE\u6807\u662F\u8003\u8FC7 N1\u300D\u2192 \u8BB0\u4E24\u6761\uFF1A\u300C\u7528\u6237\u5728\u4E0A\u6D77\u505A\u5E73\u9762\u8BBE\u8BA1\u300D\u300C\u7528\u6237\u4E1A\u4F59\u65F6\u95F4\u5728\u81EA\u5B66\u65E5\u8BED\uFF0C\u76EE\u6807\u662F\u901A\u8FC7 N1 \u8003\u8BD5\u300D",
    whenToSave: "\u7528\u6237\u8BF4\u5230\u81EA\u5DF1\u7684\u8EAB\u4EFD\u3001\u5DE5\u4F5C\u6216\u5B66\u4E60\u7ECF\u5386\u3001\u6240\u5728\u5730\u533A\u3001\u8BED\u8A00\u4E60\u60EF\u3001\u65E5\u5E38\u751F\u6D3B\u91CC\u7684\u4E60\u60EF\uFF08\u4F5C\u606F\u3001\u996E\u98DF\u3001\u51FA\u884C\u7B49\uFF09\u3001\u5BB6\u5EAD\u60C5\u51B5\u3001\u4E2A\u4EBA\u5174\u8DA3\u3001\u957F\u671F\u76EE\u6807\uFF1B\u7528\u6237\u7684\u8BDD\u6216\u5B9E\u9645\u8868\u73B0\u4F53\u73B0\u51FA\u5BF9\u67D0\u9879\u77E5\u8BC6\u6216\u6280\u80FD\u7684\u719F\u6089\u7A0B\u5EA6\uFF08\u300C\u8FD9\u5757\u6211\u5F88\u719F\u300D\u300C\u7B2C\u4E00\u6B21\u63A5\u89E6\u8FD9\u4E2A\u300D\uFF09",
    howToUse: "\u6309\u7528\u6237\u7684\u60C5\u51B5\u8C03\u6574\u56DE\u7B54\uFF1A\u719F\u6089\u7684\u9886\u57DF\u76F4\u63A5\u7ED9\u7ED3\u8BBA\u548C\u5173\u952E\u7EC6\u8282\uFF0C\u751F\u758F\u7684\u9886\u57DF\u8865\u4E0A\u80CC\u666F\u3001\u672F\u8BED\u5148\u89E3\u91CA\u518D\u7528\uFF1B\u4E3E\u4F8B\u3001\u65F6\u95F4\u5B89\u6392\u548C\u7528\u8BED\u8D34\u5408\u7528\u6237\u7684\u80CC\u666F\u3001\u6240\u5728\u5730\u548C\u4F5C\u606F\u3002",
    recall: "core",
    decayDays: null,
    governancePriority: "low"
  },
  preference: {
    label: "\u884C\u4E3A\u504F\u597D",
    description: "\u7528\u6237\u5BF9\u4F60\u505A\u4E8B\u65B9\u5F0F\u7684\u6301\u7EED\u8981\u6C42\uFF1A\u5728\u9879\u76EE\u6216\u4EFB\u52A1\u91CC\u4E60\u60EF\u7528\u7684\u505A\u6CD5\u3001\u5DE5\u5177\u3001\u4EA4\u4ED8\u683C\u5F0F\u3001\u6C9F\u901A\u65B9\u5F0F\u7B49\uFF0C\u6765\u81EA\u7528\u6237\u76F4\u63A5\u63D0\u51FA\u3001\u7EA0\u6B63\u6216\u660E\u786E\u8BA4\u53EF\uFF0C\u4EE5\u540E\u540C\u7C7B\u4E8B\u60C5\u90FD\u7167\u8FD9\u4E2A\u505A\u3002\u6B63\u6587\uFF1A\u5148\u5199\u8981\u6C42\uFF0C\u4EE5\u300C\u7528\u6237\u300D\u5F00\u5934\uFF0C\u5199\u6E05\u5728\u4EC0\u4E48\u4E8B\u4E0A\u8981\u4F60\u600E\u4E48\u505A\uFF0C\u9002\u7528\u8303\u56F4\u7167\u7528\u6237\u8BF4\u7684\u5199\uFF1B\u53E5\u53F7\u540E\u5199\u300C\u539F\u56E0\uFF1A\u300D\uFF0C\u6982\u62EC\u7528\u6237\u7ED9\u7684\u539F\u56E0\uFF08\u5305\u62EC\u7528\u6237\u8BB2\u7684\u8FC7\u5F80\u7ECF\u5386\uFF09\uFF1B\u7528\u6237\u6CA1\u8BF4\u539F\u56E0\uFF0C\u5C31\u5199\u300C\u80CC\u666F\uFF1A\u300D\u548C\u63D0\u51FA\u65F6\u5728\u505A\u7684\u4E8B\u3002\u4E00\u6761\u53EA\u5199\u4E00\u9879\u8981\u6C42\u3002\u4F8B\uFF1A\u7528\u6237\u8BF4\u300C\u4EE5\u540E\u5E2E\u6211\u8BA2\u9152\u5E97\u90FD\u6311\u5E26\u53A8\u623F\u7684\uFF0C\u51FA\u95E8\u5728\u5916\u6211\u60F3\u81EA\u5DF1\u505A\u996D\u300D\u2192 \u8BB0\u300C\u7528\u6237\u8BA2\u9152\u5E97\u65F6\u8981\u9009\u5E26\u53A8\u623F\u7684\u3002\u539F\u56E0\uFF1A\u51FA\u95E8\u5728\u5916\u60F3\u81EA\u5DF1\u505A\u996D\u3002\u300D",
    whenToSave: "\u7528\u6237\u63D0\u51FA\u4E00\u9879\u4EE5\u540E\u90FD\u9002\u7528\u7684\u8981\u6C42\uFF08\u300C\u4EE5\u540E\u90FD\u2026\u300D\u300C\u6BCF\u6B21\u2026\u300D\uFF09\uFF1B\u7528\u6237\u7EA0\u6B63\u4F60\u7684\u505A\u6CD5\uFF0C\u5E76\u5E0C\u671B\u4EE5\u540E\u7167\u65B0\u7684\u6765\uFF08\u300C\u6362\u6210\u2026\u300D\u300C\u4E0B\u6B21\u522B\u2026\u300D\uFF09\uFF1B\u7528\u6237\u660E\u786E\u8BA4\u53EF\u4F60\u7684\u67D0\u4E2A\u505A\u6CD5\u5E76\u5E0C\u671B\u4FDD\u6301\uFF08\u300C\u5BF9\uFF0C\u4EE5\u540E\u5C31\u8FD9\u6837\u300D\uFF09\uFF1B\u7528\u6237\u53CD\u590D\u6539\u5199\u3001\u64A4\u9500\u6216\u62D2\u7EDD\u540C\u4E00\u7C7B\u505A\u6CD5",
    howToUse: "\u540C\u7C7B\u4E8B\u60C5\u76F4\u63A5\u7167\u505A\uFF0C\u4E0D\u7528\u518D\u95EE\uFF1B\u7528\u6237\u8FD9\u6B21\u7684\u8BDD\u548C\u8FD9\u6761\u4E0D\u4E00\u81F4\u65F6\uFF0C\u8FD9\u6B21\u6309\u7528\u6237\u7684\u8BDD\u505A\uFF0C\u7528\u6237\u8868\u660E\u4EE5\u540E\u90FD\u8FD9\u6837\u518D\u66F4\u65B0\u8FD9\u6761\u3002",
    recall: "core",
    decayDays: null,
    governancePriority: "medium"
  },
  knowledge: {
    label: "\u4E8B\u5B9E\u4E0E\u7ECF\u9A8C",
    description: "\u7ECF\u8FC7\u786E\u8BA4\u3001\u4EE5\u540E\u8FD8\u4F1A\u7528\u5230\u7684\u4E8B\u5B9E\u548C\u7ECF\u9A8C\uFF1A\u89C4\u7AE0\u5236\u5EA6\u3001\u5DE5\u5177\u548C\u8BBE\u5907\u7684\u884C\u4E3A\u3001\u67E5\u660E\u7684\u95EE\u9898\u539F\u56E0\u3001\u9A8C\u8BC1\u8FC7\u6709\u6548\u6216\u884C\u4E0D\u901A\u7684\u505A\u6CD5\u3002\u6B63\u6587\uFF1A\u5148\u5199\u4E8B\u5B9E\uFF0C\u6210\u7ACB\u7684\u6761\u4EF6\uFF08\u7248\u672C\u3001\u73AF\u5883\u3001\u9002\u7528\u8303\u56F4\uFF09\u5199\u5728\u53E5\u5B50\u91CC\uFF1B\u4F9D\u636E\u662F\u8D44\u6599\u51FA\u5904\uFF08\u6587\u6863\u3001\u901A\u77E5\u3001\u62A5\u9519\u3001\u5B9E\u6D4B\uFF09\u7684\uFF0C\u53E5\u53F7\u540E\u5199\u300C\u4F9D\u636E\uFF1A\u300D\u548C\u8FD9\u4E2A\u51FA\u5904\uFF0C\u7528\u6237\u672C\u4EBA\u8BF4\u7684\u60C5\u51B5\u76F4\u63A5\u5199\u6210\u4E8B\u5B9E\uFF1B\u6CA1\u627E\u5230\u3001\u884C\u4E0D\u901A\u8FD9\u7C7B\u7ED3\u8BBA\u5199\u660E\u5728\u4EC0\u4E48\u8303\u56F4\u8BD5\u8FC7\uFF0C\u63A8\u6D4B\u7684\u5199\u660E\u662F\u63A8\u6D4B\u3002\u4F8B\uFF1A\u7528\u6237\u8BF4\u300C\u8D22\u52A1\u521A\u901A\u77E5\uFF0C25 \u53F7\u4EE5\u540E\u4EA4\u7684\u62A5\u9500\u90FD\u7B97\u4E0B\u4E2A\u6708\u300D\u2192 \u8BB0\u300C\u516C\u53F8\u62A5\u9500\u6BCF\u6708 25 \u65E5\u622A\u6B62\uFF0C\u4E4B\u540E\u63D0\u4EA4\u7684\u8BA1\u5165\u4E0B\u6708\u3002\u4F9D\u636E\uFF1A\u8D22\u52A1\u90E8\u95E8\u901A\u77E5\u3002\u300D",
    whenToSave: "\u786E\u8BA4\u4E86\u4E00\u6761\u4EE5\u540E\u8FD8\u4F1A\u7528\u5230\u7684\u89C4\u5219\u6216\u4E8B\u5B9E\uFF1B\u67E5\u660E\u4E86\u4E00\u4E2A\u95EE\u9898\u7684\u539F\u56E0\uFF1B\u9A8C\u8BC1\u4E86\u67D0\u4E2A\u505A\u6CD5\u6709\u6548\u6216\u884C\u4E0D\u901A\uFF1B\u7528\u6237\u8D34\u6765\u7684\u6216\u4F60\u67E5\u5230\u7684\u8D44\u6599\uFF08\u62A5\u9519\u3001\u63A5\u53E3\u7ED3\u6784\u3001\u6570\u636E\u683C\u5F0F\u3001\u6587\u4EF6\u5185\u5BB9\uFF09\u91CC\u6709\u4EE5\u540E\u7528\u5F97\u4E0A\u7684\u4E8B\u5B9E\uFF08\u8BB0\u4E8B\u5B9E\u672C\u8EAB\uFF09",
    howToUse: "\u9047\u5230\u540C\u7C7B\u95EE\u9898\u5148\u6309\u8FD9\u6761\u5224\u65AD\uFF0C\u7701\u6389\u91CD\u590D\u6392\u67E5\uFF1B\u6761\u4EF6\uFF08\u7248\u672C\u3001\u73AF\u5883\uFF09\u548C\u773C\u524D\u5BF9\u4E0D\u4E0A\u65F6\uFF0C\u5148\u6838\u5BF9\u518D\u7528\u3002",
    recall: "search",
    decayDays: 90,
    governancePriority: "high"
  },
  project: {
    label: "\u9879\u76EE\u4FE1\u606F",
    description: "\u8FDB\u884C\u4E2D\u7684\u9879\u76EE\u6216\u4E2A\u4EBA\u4E8B\u9879\u7684\u5F53\u524D\u60C5\u51B5\uFF1A\u76EE\u6807\u3001\u8303\u56F4\u3001\u91CC\u7A0B\u7891\u3001\u622A\u6B62\u65E5\u671F\u3001\u5206\u5DE5\u548C\u5BF9\u63A5\u4EBA\u3001\u5F53\u524D\u91C7\u7528\u7684\u65B9\u6848\u3001\u8FDB\u5C55\u548C\u963B\u585E\uFF0C\u4F1A\u968F\u4E8B\u60C5\u63A8\u8FDB\u53D8\u5316\u3002\u6B63\u6587\uFF1A\u5199\u6E05\u5F53\u524D\u72B6\u6001\u548C\u5BF9\u5E94\u7684\u5177\u4F53\u65E5\u671F\uFF1B\u72B6\u6001\u6709\u53D8\u5316\u65F6\u5199\u660E\u4ECE\u4EC0\u4E48\u53D8\u6210\u4EC0\u4E48\uFF0C\u8BF4\u5F97\u51FA\u539F\u56E0\u7684\uFF0C\u53E5\u53F7\u540E\u5199\u300C\u539F\u56E0\uFF1A\u300D\u3002\u4F8B\uFF1A\u7528\u6237\u8BF4\u300C\u5B66\u9662\u793C\u5802\u8981\u88C5\u4FEE\uFF0C\u7B54\u8FA9\u4ECE 12 \u6708 20 \u65E5\u63D0\u524D\u5230 12 \u6708 10 \u65E5\u4E86\uFF0C\u6211\u5F97 11 \u6708\u5E95\u524D\u628A\u521D\u7A3F\u4EA4\u7ED9\u5BFC\u5E08\u300D\u2192 \u8BB0\u300C\u7528\u6237\u7684\u6BD5\u4E1A\u8BBA\u6587\u7B54\u8FA9\u4ECE 12 \u6708 20 \u65E5\u63D0\u524D\u5230 12 \u6708 10 \u65E5\uFF0C\u521D\u7A3F\u8981\u5728 11 \u6708 30 \u65E5\u524D\u4EA4\u7ED9\u5BFC\u5E08\u3002\u539F\u56E0\uFF1A\u5B66\u9662\u793C\u5802\u8981\u88C5\u4FEE\u3002\u300D",
    whenToSave: "\u9879\u76EE\u6216\u4E2A\u4EBA\u4E8B\u9879\u5B9A\u4E0B\u76EE\u6807\u3001\u8303\u56F4\u6216\u622A\u6B62\u65E5\u671F\uFF1B\u91CC\u7A0B\u7891\u5B8C\u6210\uFF1B\u8BA1\u5212\u3001\u5206\u5DE5\u6216\u8303\u56F4\u6709\u53D8\u5316\uFF1B\u51FA\u73B0\u5F71\u54CD\u540E\u7EED\u5B89\u6392\u7684\u8FDB\u5C55\u6216\u963B\u585E\uFF08\u7528\u6237\u544A\u77E5\uFF0C\u6216\u4F60\u4ECE\u8D44\u6599\u3001\u6267\u884C\u7ED3\u679C\u91CC\u786E\u8BA4\uFF09",
    howToUse: "\u7528\u5B83\u7406\u89E3\u5F53\u524D\u8BF7\u6C42\u6240\u5904\u7684\u4E8B\u9879\u548C\u7EA6\u675F\uFF08\u622A\u6B62\u65E5\u671F\u3001\u8303\u56F4\u3001\u8D1F\u8D23\u4EBA\uFF09\uFF1B\u8FD9\u7C7B\u4FE1\u606F\u53D8\u5F97\u5FEB\uFF0C\u6807\u4E86\u300C\u53EF\u80FD\u8FC7\u65F6\u300D\u7684\u5148\u6838\u5BF9\u518D\u7528\u3002",
    recall: "search",
    decayDays: 7,
    governancePriority: "high"
  },
  reference: {
    label: "\u53C2\u8003\u5F15\u7528",
    description: "\u4E0E\u9879\u76EE\u76F8\u5173\u7684\u5916\u90E8\u8D44\u6599\u5728\u54EA\u91CC\uFF1A\u6587\u4EF6\u8DEF\u5F84\u3001\u7F51\u9875\u94FE\u63A5\u3001\u5916\u90E8\u6587\u6863\uFF0C\u6216\u7CFB\u7EDF\u3001\u770B\u677F\u91CC\u7684\u8D44\u6599\u5165\u53E3\uFF0C\u4EE5\u53CA\u7B80\u8981\u6982\u62EC\u91CC\u9762\u6709\u4EC0\u4E48\u3002\u6B63\u6587\uFF1A\u5199\u4F4D\u7F6E\u3001\u91CC\u9762\u6709\u4EC0\u4E48\u3001\u4EC0\u4E48\u65F6\u5019\u8BE5\u53BB\u770B\uFF1B\u6807\u9898\u5199\u6E05\u662F\u4EC0\u4E48\u8D44\u6599\uFF08\u5982\u300C\u652F\u4ED8\u63A5\u53E3\u6587\u6863\u300D\uFF09\uFF0C\u6458\u8981\u91CC\u5199\u4E0A\u4F4D\u7F6E\u3002\u4F8B\uFF1A\u7528\u6237\u8BF4\u300C\u63A5\u53E3\u6587\u6863\u5728\u4ED3\u5E93\u7684 docs/api \u76EE\u5F55\uFF0C\u7B2C\u4E09\u65B9\u652F\u4ED8\u7684\u63A5\u53E3\u8BF4\u660E\u770B https://pay.example.com/docs\u300D\u2192 \u8BB0\u4E24\u6761\uFF1A\u300C\u9879\u76EE\u63A5\u53E3\u6587\u6863\u5728\u4ED3\u5E93 docs/api \u76EE\u5F55\uFF0C\u6539\u63A5\u53E3\u524D\u5148\u770B\u8FD9\u91CC\u300D\u300C\u7B2C\u4E09\u65B9\u652F\u4ED8\u63A5\u53E3\u8BF4\u660E\u5728 https://pay.example.com/docs\uFF0C\u5BF9\u63A5\u652F\u4ED8\u65F6\u67E5\u8FD9\u91CC\u300D",
    whenToSave: "\u7528\u6237\u6307\u660E\u67D0\u4EFD\u4E0E\u9879\u76EE\u6709\u5173\u7684\u8D44\u6599\u6587\u4EF6\u5728\u54EA\u91CC\uFF08\u8DEF\u5F84\u3001\u94FE\u63A5\u3001\u7CFB\u7EDF\u5165\u53E3\u7B49\uFF09\uFF1B\u6216\u8005\u4F60\u5728\u5206\u6790\u4EFB\u52A1\u8FC7\u7A0B\u4E2D\u627E\u5230\u4E00\u4E2A\u4EE5\u540E\u9879\u76EE\u4E2D\u4F1A\u53CD\u590D\u7528\u5230\u7684\u8D44\u6599\u5165\u53E3",
    howToUse: "\u7528\u6237\u63D0\u5230\u76F8\u5173\u7684\u8D44\u6599\u6216\u95EE\u9898\u65F6\uFF0C\u76F4\u63A5\u6309\u6458\u8981\u91CC\u7684\u4F4D\u7F6E\u53BB\u67E5\uFF1B\u6458\u8981\u4E0D\u591F\u7528\u65F6\uFF0C\u518D\u7528 memory_search \u6309 id \u53D6\u51FA\u5168\u6587\uFF1B\u4F60\u53BB\u4E0D\u4E86\u7684\u4F4D\u7F6E\uFF08\u5982\u522B\u4EBA\u7684\u7CFB\u7EDF\uFF09\u544A\u8BC9\u7528\u6237\u53BB\u54EA\u91CC\u627E\u3002",
    recall: "search",
    decayDays: null,
    governancePriority: "medium"
  },
  procedure: {
    label: "\u53EF\u590D\u7528\u6D41\u7A0B",
    description: "\u5B9E\u9645\u7528\u8FC7\u3001\u786E\u8BA4\u6709\u6548\u7684\u591A\u6B65\u9AA4\u505A\u6CD5\uFF1A\u5B8C\u6210\u67D0\u7C7B\u4EFB\u52A1\u7684\u987A\u5E8F\u3001\u5173\u952E\u547D\u4EE4\u6216\u64CD\u4F5C\uFF0C\u4EE5\u53CA\u5BB9\u6613\u51FA\u9519\u7684\u5730\u65B9\u548C\u89E3\u6CD5\u3002\u6B63\u6587\uFF1A\u5148\u5199\u9002\u7528\u7684\u4EFB\u52A1\u548C\u524D\u63D0\uFF0C\u518D\u6309\u987A\u5E8F\u5199\u6B65\u9AA4\uFF0C\u6700\u540E\u5199\u5BB9\u6613\u51FA\u9519\u7684\u5730\u65B9\u548C\u5BF9\u7B56\uFF1B\u6B65\u9AA4\u91CC\u5199\u7A33\u5B9A\u7684\u547D\u4EE4\u548C\u4F4D\u7F6E\u3002\u4F8B\uFF1A\u7528\u6237\u8BF4\u300C\u53D1\u7248\u5C31\u6309\u8FD9\u4E2A\u987A\u5E8F\uFF0C\u7528\u4E86\u4E09\u6B21\u90FD\u987A\uFF1A\u6539\u7248\u672C\u53F7\u548C CHANGELOG\uFF0C\u6253\u5305\u6838\u5BF9\u6587\u4EF6\u6E05\u5355\uFF0C\u518D\u53D1\u5E03\uFF1B\u521A\u53D1\u5E03\u88C5\u4E0D\u4E0A\u62A5 404 \u662F\u6B63\u5E38\u7684\uFF0C\u7B49\u5341\u5206\u949F\u518D\u8BD5\u300D\u2192 \u8BB0\u300C\u53D1\u5E03 npm \u5305\u7684\u6B65\u9AA4\uFF0C\u5DF2\u987A\u5229\u7528\u8FC7\u4E09\u6B21\uFF1A\u6539\u7248\u672C\u53F7\u548C CHANGELOG \u2192 \u6253\u5305\u5E76\u6838\u5BF9\u6587\u4EF6\u6E05\u5355 \u2192 \u53D1\u5E03 \u2192 \u7B49\u5341\u5206\u949F\u518D\u9A8C\u8BC1\u5B89\u88C5\u3002\u6CE8\u610F\uFF1A\u521A\u53D1\u5E03\u65F6\u5B89\u88C5\u62A5 404 \u5C5E\u6B63\u5E38\uFF0C\u6309\u6700\u540E\u4E00\u6B65\u7B49\u5341\u5206\u949F\u5373\u53EF\u3002\u300D",
    whenToSave: "\u540C\u4E00\u5957\u505A\u6CD5\u5DF2\u7ECF\u591A\u6B21\u7528\u4E0B\u6765\u90FD\u6709\u6548\uFF1B\u7528\u6237\u8981\u6C42\u4EE5\u540E\u7167\u4E00\u5957\u591A\u6B65\u9AA4\u505A\u6CD5\u6765\u505A\uFF1B\u505A\u5B8C\u4E00\u4EF6\u590D\u6742\u7684\u4E8B\uFF0C\u5176\u4E2D\u7684\u6B65\u9AA4\u3001\u8E29\u8FC7\u7684\u5751\u548C\u89E3\u6CD5\u5B9E\u9645\u9A8C\u8BC1\u6709\u6548",
    howToUse: "\u505A\u540C\u7C7B\u4EFB\u52A1\u524D\u5148\u7167\u8FD9\u6761\u7684\u6B65\u9AA4\u8D70\uFF1B\u67D0\u4E00\u6B65\u548C\u73B0\u72B6\u5BF9\u4E0D\u4E0A\uFF08\u547D\u4EE4\u3001\u8DEF\u5F84\u53D8\u4E86\uFF09\u65F6\uFF0C\u505A\u5B8C\u540E\u66F4\u65B0\u8FD9\u6761\u3002",
    recall: "search",
    decayDays: 90,
    governancePriority: "medium"
  },
  decision: {
    label: "\u51B3\u5B9A",
    description: "\u6709\u660E\u786E\u5F53\u4E8B\u4EBA\u7684\u51B3\u5B9A\u548C\u627F\u8BFA\uFF1A\u8C01\u5B9A\u4E86\u4EC0\u4E48\u3001\u4F9D\u636E\u662F\u4EC0\u4E48\uFF1B\u8C01\u7B54\u5E94\u8C01\u505A\u4EC0\u4E48\u3001\u4EC0\u4E48\u65F6\u5019\u5B8C\u6210\u3002\u6B63\u6587\uFF1A\u4E00\u6761\u5199\u4E00\u9879\u51B3\u5B9A\u6216\u4E00\u9879\u627F\u8BFA\u3002\u51B3\u5B9A\u5199\u6210\u8C01\u51B3\u5B9A\u4E86\u4EC0\u4E48\uFF0C\u8BF4\u5F97\u51FA\u4F9D\u636E\u7684\uFF0C\u53E5\u53F7\u540E\u5199\u300C\u4F9D\u636E\uFF1A\u300D\uFF1B\u627F\u8BFA\u5199\u6210\u8C01\u7B54\u5E94\u8C01\u5728\u4EC0\u4E48\u65F6\u5019\u524D\u505A\u4EC0\u4E48\u3002\u51B3\u5B9A\u6539\u4E86\u5C31\u65B0\u8BB0\u4E00\u6761\uFF0C\u7528 supersedes \u6307\u5411\u65E7\u7684\u90A3\u6761\u3002\u4F8B\uFF1A\u7528\u6237\u8BF4\u300C\u548C\u8D22\u52A1\u7ECF\u7406\u5B9A\u4E86\uFF0CQ3 \u8D85\u652F\uFF0CQ4 \u5916\u5305\u9884\u7B97\u5148\u780D\u6389\uFF1B\u4ED6\u7B54\u5E94 11 \u6708 7 \u65E5\u524D\u628A\u65B0\u9884\u7B97\u8868\u53D1\u6211\u300D\u2192 \u8BB0\u4E24\u6761\uFF1A\u300C\u7528\u6237\u548C\u8D22\u52A1\u7ECF\u7406\u51B3\u5B9A\u5148\u780D\u6389 Q4 \u5916\u5305\u9884\u7B97\u3002\u4F9D\u636E\uFF1AQ3 \u8D85\u652F\u3002\u300D\u300C\u8D22\u52A1\u7ECF\u7406\u7B54\u5E94\u5728 11 \u6708 7 \u65E5\u524D\u628A\u65B0\u9884\u7B97\u8868\u53D1\u7ED9\u7528\u6237\u3002\u300D",
    whenToSave: "\u5BF9\u8BDD\u91CC\u6216\u4F60\u67E5\u9605\u7684\u8D44\u6599\uFF08\u4F1A\u8BAE\u7EAA\u8981\u3001\u90AE\u4EF6\u3001\u804A\u5929\u8BB0\u5F55\uFF09\u91CC\u51FA\u73B0\u4E00\u9879\u5B9A\u4E0B\u6765\u7684\u51B3\u5B9A\uFF08\u8C01\u3001\u5B9A\u4E86\u4EC0\u4E48\u3001\u4E3A\u4EC0\u4E48\uFF09\uFF0C\u6216\u4E00\u9879\u627F\u8BFA\uFF08\u8C01\u7B54\u5E94\u8C01\u3001\u505A\u4EC0\u4E48\u3001\u4EC0\u4E48\u65F6\u5019\u5B8C\u6210\uFF09",
    howToUse: "\u5904\u7406\u76F8\u5173\u4E8B\u9879\u65F6\u6309\u5DF2\u5B9A\u7684\u51B3\u5B9A\u548C\u627F\u8BFA\u6765\uFF1B\u7528\u6237\u95EE\u5230\u65F6\u8BF4\u660E\u4F9D\u636E\uFF0C\u5E76\u63D0\u5230\u4E34\u8FD1\u7684\u622A\u6B62\u65E5\u671F\u3002",
    recall: "search",
    decayDays: 30,
    governancePriority: "high"
  }
};
function isPresetTypeEdited(name, customTypes) {
  return isPresetType(name) && Object.hasOwn(customTypes, name) && !sameType(customTypes[name], TYPE_DEFINITIONS[name]);
}
var PRESET_SCENES = {
  coding: { label: "\u7F16\u7801", types: [...BUILTIN_TYPE_NAMES, "procedure"] },
  office: { label: "\u529E\u516C", types: [...BUILTIN_TYPE_NAMES, "decision"] }
};
function isPresetScene(id) {
  return Object.hasOwn(PRESET_SCENES, id);
}
function sameSet(a, b) {
  const set = new Set(a);
  return set.size === new Set(b).size && b.every((x) => set.has(x));
}
function presetSceneTypes(id, removedPresets) {
  return PRESET_SCENES[id].types.filter((name) => !removedPresets.includes(name));
}
function isPresetEdited(id, scene, removedPresets = []) {
  return isPresetScene(id) && !sameSet(scene.types.filter((name) => !removedPresets.includes(name)), presetSceneTypes(id, removedPresets));
}
function typePool(customTypes, removedPresets = []) {
  const fixed = [...BUILTIN_TYPE_NAMES, ...PRESET_TYPE_NAMES];
  return [
    ...fixed.filter((name) => !removedPresets.includes(name)),
    ...Object.keys(customTypes).filter((name) => !fixed.includes(name))
  ];
}
function sceneTypes(fields, id) {
  const scene = id === GENERAL_SCENE || !Object.hasOwn(fields.scenes, id) ? void 0 : fields.scenes[id];
  const pool = typePool(fields.customTypes, fields.removedPresets);
  const picked = scene === void 0 ? [] : pool.filter((name) => scene.types.includes(name)).slice(0, SCENE_MAX_TYPES);
  return picked.length > 0 ? picked : [...BUILTIN_TYPE_NAMES];
}
function droppedTypes(saved, draft, migrations = {}) {
  const next = new Set(sceneTypes(draft, draft.template));
  return sceneTypes(saved, saved.template).filter((name) => {
    const m = migrations[name];
    if (m?.action === "forget") return false;
    return !next.has(m?.action === "retype" ? m.to : name);
  });
}
function scenesUsing(scenes, name) {
  return Object.entries(scenes).filter(([, scene]) => scene.types.includes(name)).map(([id]) => id);
}
function nextSceneId(taken, now) {
  let at2 = now;
  while (taken.includes(`scene-${at2.toString(36)}`)) at2 += 1;
  return `scene-${at2.toString(36)}`;
}
function validateSceneDraft(draft, otherLabels) {
  const errors = {};
  const label = draft.label.trim();
  if (label === "") errors.label = "required";
  else if (otherLabels.some((other) => other.trim() === label)) errors.label = "label-taken";
  if (draft.types.length === 0) errors.types = "types-empty";
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, scene: { label, types: draft.types } };
}
function sceneChanges(saved, draft) {
  const added = [];
  const edited = [];
  for (const [id, scene] of Object.entries(draft)) {
    const before = Object.hasOwn(saved, id) ? saved[id] : void 0;
    if (before === void 0) added.push(id);
    else if (!sameScene(before, scene)) edited.push(id);
  }
  return { added, edited, removed: Object.keys(saved).filter((id) => !Object.hasOwn(draft, id)) };
}
function sameScene(a, b) {
  return a.label === b.label && sameSet(a.types, b.types);
}
function sourcesOf(name, migrations, counts) {
  const moved = Object.entries(migrations).filter(([, m]) => m.action === "retype" && m.to === name).map(([from]) => from);
  const sources = Object.hasOwn(migrations, name) ? moved : [name, ...moved];
  return counts === void 0 ? sources : sources.filter((from) => (counts.get(from) ?? 0) > 0);
}
function memoryCountOf(name, migrations, counts) {
  return sourcesOf(name, migrations).reduce((sum, from) => sum + (counts.get(from) ?? 0), 0);
}
function renameMigrations(migrations, from, to, action, counts) {
  const next = { ...migrations };
  for (const source of sourcesOf(from, migrations, counts)) {
    if (action === "forget") next[source] = { action: "forget" };
    else if (source === to) delete next[source];
    else next[source] = { action: "retype", to };
  }
  return next;
}
function forgetMigrations(migrations, name, counts) {
  return renameMigrations(migrations, name, name, "forget", counts);
}
function keepMigrations(migrations, name) {
  return Object.fromEntries(Object.entries(migrations).filter(([, m]) => m.action !== "retype" || m.to !== name));
}
function pendingNames(migrations, name) {
  const own = name === void 0 ? [] : sourcesOf(name, migrations);
  return Object.keys(migrations).filter((from) => !own.includes(from));
}
function renameType(pool, from, to, type) {
  const customTypes = Object.fromEntries(Object.entries(pool.customTypes).map(([name, t]) => name === from ? [to, type] : [name, t]));
  const scenes = Object.fromEntries(Object.entries(pool.scenes).map(([id, scene]) => [id, scene.types.includes(from) ? { ...scene, types: scene.types.map((name) => name === from ? to : name) } : scene]));
  return { ...pool, scenes, customTypes };
}
function removeType(pool, name) {
  const { [name]: _removed, ...customTypes } = pool.customTypes;
  const scenes = Object.fromEntries(Object.entries(pool.scenes).map(([id, scene]) => [id, scene.types.includes(name) ? { ...scene, types: scene.types.filter((n) => n !== name) } : scene]));
  const removedPresets = isPresetType(name) && !pool.removedPresets.includes(name) ? [...pool.removedPresets, name] : pool.removedPresets;
  return { ...pool, scenes, customTypes, removedPresets };
}
function restorePresetType(pool, migrations, name) {
  const { [name]: _forget, ...rest } = migrations;
  const { [name]: _stale, ...customTypes } = pool.customTypes;
  const scenes = Object.fromEntries(Object.entries(pool.scenes).map(([id, scene]) => [id, scene.types.includes(name) ? { ...scene, types: scene.types.filter((n) => n !== name) } : scene]));
  return { pool: { ...pool, scenes, customTypes, removedPresets: pool.removedPresets.filter((n) => n !== name) }, migrations: rest };
}
var OVERFLOW_MODES2 = ["relax", "strict"];
var EVIDENCE_LEVELS = ["off", "strict", "active"];
var SENSITIVITIES = ["conservative", "normal", "proactive"];
var PROMOTE_TARGETS = ["plugin-global", "agents-md"];
var RECALL_MODES = ["core", "search", "passive"];
var PRIORITIES = ["high", "medium", "low"];
var SENSITIVITY_NUMBERS = {
  conservative: { score: 60, days: 14 },
  normal: { score: 70, days: 7 },
  proactive: { score: 80, days: 3 }
};
var PATHS = {
  template: ["template"],
  budget: ["snapshotTokenBudget"],
  overflow: ["snapshotOverflow"],
  evidence: ["evidenceLookup"],
  sensitivity: ["governance", "health", "sensitivity"],
  promoteTarget: ["governance", "globalPromoteTarget"],
  accent: ["accent"]
};
var DEFAULTS = {
  template: "custom",
  scenes: PRESET_SCENES,
  customTypes: {},
  removedPresets: [],
  budget: "4000",
  overflow: "relax",
  evidence: "strict",
  sensitivity: "normal",
  promoteTarget: "plugin-global",
  accent: "ella"
};
function at(value, path) {
  let cur = value;
  for (const key of path) {
    if (typeof cur !== "object" || cur === null) return void 0;
    cur = cur[key];
  }
  return cur;
}
var isOneOf = (choices, value) => choices.includes(value);
function oneOf(choices, value, fallback) {
  return isOneOf(choices, value) ? value : fallback;
}
function scenesOf(value) {
  if (typeof value !== "object" || value === null) return structuredClone(PRESET_SCENES);
  const scenes = {};
  for (const [id, scene] of Object.entries(value)) {
    const label = at(scene, ["label"]);
    const types = at(scene, ["types"]);
    if (id === GENERAL_SCENE || typeof label !== "string" || !Array.isArray(types)) continue;
    scenes[id] = { label, types: types.filter((name) => typeof name === "string") };
  }
  return scenes;
}
function removedPresetsOf(value) {
  return Array.isArray(value) ? PRESET_TYPE_NAMES.filter((name) => value.includes(name)) : [];
}
function fieldsOf(section) {
  const budget = at(section, PATHS.budget);
  const types = at(section, ["customTypes"]);
  const template = at(section, PATHS.template);
  const scenes = scenesOf(at(section, ["scenes"]));
  return {
    template: typeof template !== "string" || template === "" ? DEFAULTS.template : template === GENERAL_SCENE || Object.hasOwn(scenes, template) ? template : GENERAL_SCENE,
    scenes,
    customTypes: typeof types === "object" && types !== null ? types : {},
    removedPresets: removedPresetsOf(at(section, ["removedPresetTypes"])),
    budget: typeof budget === "number" ? String(budget) : DEFAULTS.budget,
    overflow: oneOf(OVERFLOW_MODES2, at(section, PATHS.overflow), DEFAULTS.overflow),
    evidence: oneOf(EVIDENCE_LEVELS, at(section, PATHS.evidence), DEFAULTS.evidence),
    sensitivity: oneOf(SENSITIVITIES, at(section, PATHS.sensitivity), DEFAULTS.sensitivity),
    promoteTarget: oneOf(PROMOTE_TARGETS, at(section, PATHS.promoteTarget), DEFAULTS.promoteTarget),
    accent: oneOf(ACCENTS, at(section, PATHS.accent), DEFAULTS.accent)
  };
}
var GOVERNANCE_ENABLED = ["governance", "enabled"];
function governanceEnabled(section) {
  return at(section, GOVERNANCE_ENABLED) !== false;
}
function configuredRoot(section) {
  const root = at(section, ["memoryRoot"]);
  return typeof root === "string" ? root : "";
}
function toPluginConfig(section) {
  const budget = at(section, PATHS.budget);
  const overflow = at(section, PATHS.overflow);
  const enabled = at(section, GOVERNANCE_ENABLED);
  const target = at(section, PATHS.promoteTarget);
  if (typeof budget !== "number" || !isOneOf(OVERFLOW_MODES2, overflow) || typeof enabled !== "boolean" || !isOneOf(PROMOTE_TARGETS, target)) return void 0;
  const accent = oneOf(ACCENTS, at(section, PATHS.accent), DEFAULTS.accent);
  const types = at(section, ["customTypes"]);
  const customTypes = typeof types === "object" && types !== null ? Object.fromEntries(Object.entries(types).flatMap(([name, type]) => {
    const label = at(type, ["label"]);
    return typeof label === "string" && label !== "" ? [[name, { label }]] : [];
  })) : {};
  return { snapshotTokenBudget: budget, snapshotOverflow: overflow, governanceEnabled: enabled, globalPromoteTarget: target, accent, customTypes };
}
function parsePositiveInt(text) {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return void 0;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) && n > 0 ? n : void 0;
}
function sameType(a, b) {
  return a !== void 0 && b !== void 0 && Object.keys(b).every((k) => a[k] === b[k]) && Object.keys(a).length === Object.keys(b).length;
}
function buildOps(saved, draft) {
  const ops = [];
  for (const key of Object.keys(PATHS)) {
    if (draft[key] === saved[key]) continue;
    if (key === "budget") {
      const n = parsePositiveInt(draft.budget);
      if (n === void 0) return void 0;
      if (String(n) !== saved.budget) ops.push({ op: "set", path: PATHS.budget, value: n });
      continue;
    }
    ops.push({ op: "set", path: PATHS[key], value: draft[key] });
  }
  for (const [name, type] of Object.entries(draft.customTypes)) {
    if (!sameType(saved.customTypes[name], type)) ops.push({ op: "set", path: ["customTypes", name], value: type });
  }
  for (const name of Object.keys(saved.customTypes)) {
    if (!(name in draft.customTypes)) ops.push({ op: "unset", path: ["customTypes", name] });
  }
  if (!sameSet(saved.removedPresets, draft.removedPresets)) {
    ops.push({ op: "set", path: ["removedPresetTypes"], value: PRESET_TYPE_NAMES.filter((name) => draft.removedPresets.includes(name)) });
  }
  const scenes = sceneChanges(saved.scenes, draft.scenes);
  for (const id of [...scenes.added, ...scenes.edited]) {
    ops.push({ op: "set", path: ["scenes", id], value: { label: draft.scenes[id].label, types: [...draft.scenes[id].types] } });
  }
  for (const id of scenes.removed) ops.push({ op: "unset", path: ["scenes", id] });
  return ops;
}
function customTypeChanges(saved, draft) {
  const added = [];
  const edited = [];
  for (const [name, type] of Object.entries(draft)) {
    if (isPresetType(name)) continue;
    if (!(name in saved)) added.push(type.label);
    else if (!sameType(saved[name], type)) edited.push(type.label);
  }
  const removed = Object.entries(saved).filter(([name]) => !isPresetType(name) && !(name in draft)).map(([, type]) => type.label);
  return { added, edited, removed };
}
function presetTypeChanges(saved, draft) {
  const parts = { edited: [], reset: [], removed: [], restored: [] };
  for (const name of PRESET_TYPE_NAMES) {
    const wasRemoved = saved.removedPresets.includes(name);
    const isRemoved = draft.removedPresets.includes(name);
    if (isRemoved !== wasRemoved) {
      (isRemoved ? parts.removed : parts.restored).push(name);
      continue;
    }
    if (isRemoved) continue;
    const before = isPresetTypeEdited(name, saved.customTypes);
    const after = isPresetTypeEdited(name, draft.customTypes);
    if (after && (!before || !sameType(saved.customTypes[name], draft.customTypes[name]))) parts.edited.push(name);
    else if (before && !after) parts.reset.push(name);
  }
  return parts;
}
var EMPTY_TYPE_DRAFT = {
  name: "",
  label: "",
  description: "",
  whenToSave: "",
  howToUse: "",
  recall: "search",
  governancePriority: "medium",
  decayDays: ""
};
function draftOf(name, type) {
  return { name, ...type, howToUse: type.howToUse ?? "", decayDays: type.decayDays === null ? "" : String(type.decayDays) };
}
function validateTypeDraft(draft, taken) {
  const errors = {};
  const name = draft.name.trim();
  if (name === "") errors.name = "required";
  else if (!/^[a-z]+(?:-[a-z]+)*$/.test(name)) errors.name = "name-format";
  else if (BUILTIN_TYPE_NAMES.includes(name)) errors.name = "name-builtin";
  else if (taken.removedPresets?.includes(name) === true) errors.name = "name-removed-preset";
  else if (taken.names.includes(name)) errors.name = "name-taken";
  else if (taken.pending?.includes(name) === true) errors.name = "name-pending";
  if (draft.label.trim() !== "" && taken.labels.some((label) => label.trim() === draft.label.trim())) errors.label = "label-taken";
  for (const key of ["label", "description", "whenToSave", "recall", "governancePriority"]) {
    if (draft[key].trim() === "") errors[key] = "required";
  }
  const decay = draft.decayDays.trim();
  const decayDays = decay === "" ? null : parsePositiveInt(decay);
  if (decayDays === void 0) errors.decayDays = "decay-invalid";
  if (Object.keys(errors).length > 0 || draft.recall === "" || draft.governancePriority === "" || decayDays === void 0) {
    return { ok: false, errors };
  }
  const howToUse = draft.howToUse.trim();
  return {
    ok: true,
    name,
    type: {
      label: draft.label.trim(),
      description: draft.description.trim(),
      whenToSave: draft.whenToSave.trim(),
      ...howToUse === "" ? {} : { howToUse },
      recall: draft.recall,
      decayDays,
      governancePriority: draft.governancePriority
    }
  };
}

// client/gateway.ts
var GatewayContext = (0, import_react5.createContext)(null);
var GatewayProvider = GatewayContext.Provider;
function useGateway() {
  const gateway = (0, import_react5.useContext)(GatewayContext);
  if (gateway === null) throw new Error("plastic-memory: useGateway outside GatewayProvider");
  return gateway;
}
function failed(detail, cmd) {
  return { ok: false, code: "failed", detail, ...cmd === void 0 ? {} : { cmd } };
}
function decodeExecution(cmd, r) {
  if (!r.ok) return failed(`${r.error.code}: ${r.error.message}`, cmd);
  if (r.value === void 0) return failed("no command result", cmd);
  const text = r.value.result.text ?? "";
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return failed(text, cmd);
  }
  const parsed = memoryCommandResultSchema.safeParse(json);
  return parsed.success ? parsed.data : failed(text, cmd);
}
var SCHEMAS = {
  pending: pendingViewSchema,
  health: healthViewSchema,
  library: libraryViewSchema,
  deleted: deletedViewSchema,
  checkups: checkupViewSchema,
  session: sessionViewSchema,
  workspaces: workspaceMapViewSchema
};
function parseView(name, text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    return { status: "error", message: String(err) };
  }
  if (typeof json !== "object" || json === null || json.version !== GUI_VIEW_VERSION) {
    return { status: "outdated" };
  }
  const parsed = SCHEMAS[name].safeParse(json);
  if (!parsed.success) return { status: "error", message: parsed.error.message };
  return { status: "ready", data: parsed.data };
}
function viewPath(memoryRoot, name, sessionId) {
  const file = name === "session" ? sessionViewFile(sessionId) : name === "workspaces" ? GUI_WORKSPACE_MAP_FILE : name === "checkups" ? GUI_CHECKUP_VIEW_FILE : GUI_VIEW_FILES[name];
  return `${memoryRoot.replace(/[\\/]+$/, "")}/${GUI_VIEW_DIR}/${file}`;
}
function fileAddress(sessionId, path) {
  const enc = (s) => encodeURIComponent(s).replace(/%3A/gi, ":");
  return `dsh-resource://file/session/${enc(sessionId)}/${path.replace(/\\/g, "/").split("/").map(enc).join("/")}`;
}
var NO_MAP = Object.freeze({});
var MEMORY_ROOT_KEY = "dsh-plastic-memory.gui.memoryRoot";
var MEMORY_ROOT_CONFIG_KEY = "dsh-plastic-memory.gui.memoryRootConfig";
var NO_CONFIG = { form: void 0, get: () => void 0, subscribe: () => () => {
} };
var COMMAND_PREFIX = `/${MEMORY_COMMAND_NAME}`;
function decodeRpc(r) {
  if (!r.ok) return r;
  const result = r.value?.result;
  if (result?.kind !== "success" && result?.kind !== "error" || result.text !== void 0 && typeof result.text !== "string") {
    return { ok: false, error: { code: "bad-response", message: "unexpected response from the memory channel" } };
  }
  return { ok: true, value: { commandId: "", result } };
}
function createRootStore(run) {
  let state = { refreshes: 0 };
  let isCached = false;
  let cachedConfig;
  let liveConfig;
  let isFresh = false;
  try {
    const saved = localStorage.getItem(MEMORY_ROOT_KEY);
    if (saved) {
      state = { ...state, memoryRoot: saved };
      isCached = true;
    }
    cachedConfig = localStorage.getItem(MEMORY_ROOT_CONFIG_KEY) ?? void 0;
  } catch {
  }
  const listeners = /* @__PURE__ */ new Set();
  let infoInflight = false;
  const failedSessions = /* @__PURE__ */ new Set();
  let refreshed = false;
  let refreshing = false;
  const set = (next) => {
    state = next;
    for (const fn of listeners) fn();
  };
  const rememberConfig = (configured) => {
    cachedConfig = configured;
    try {
      if (configured === void 0) localStorage.removeItem(MEMORY_ROOT_CONFIG_KEY);
      else localStorage.setItem(MEMORY_ROOT_CONFIG_KEY, configured);
    } catch {
    }
  };
  const remember = (memoryRoot) => {
    try {
      localStorage.setItem(MEMORY_ROOT_KEY, memoryRoot);
    } catch {
    }
    rememberConfig(liveConfig);
    isFresh = true;
    set({ ...state, memoryRoot, error: void 0 });
  };
  const refresh = (sessionId) => {
    refreshed = true;
    refreshing = true;
    if (state.isRefreshFailed === true) set({ ...state, isRefreshFailed: false });
    void run(sessionId, encodeMemoryCommand({ cmd: "refresh-views" })).then((r) => {
      refreshing = false;
      if (decodeExecution("refresh-views", r).ok) set({ ...state, refreshes: state.refreshes + 1 });
      else {
        refreshed = false;
        set({ ...state, isRefreshFailed: true });
      }
    });
  };
  const store = {
    get: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    /** 配置里的 memoryRoot（宿主还没给出或不服务配置时为 undefined，不比对）。和缓存时的值不同就丢掉缓存，useView 随后按首次进入发 info。 */
    syncConfig(configured) {
      if (configured === void 0) return;
      liveConfig = configured;
      if (state.memoryRoot === void 0 || configured === cachedConfig) return;
      if (isFresh && cachedConfig === void 0) {
        rememberConfig(configured);
        return;
      }
      isCached = false;
      isFresh = false;
      refreshed = false;
      failedSessions.clear();
      try {
        localStorage.removeItem(MEMORY_ROOT_KEY);
      } catch {
      }
      rememberConfig(void 0);
      set({ ...state, memoryRoot: void 0, error: void 0 });
    },
    ensureRoot(sessionId) {
      if (state.memoryRoot !== void 0 || infoInflight || failedSessions.has(sessionId)) return;
      infoInflight = true;
      void run(sessionId, encodeMemoryCommand({ cmd: "info" })).then((r) => {
        infoInflight = false;
        const result = decodeExecution("info", r);
        if (result.ok && result.info !== void 0) {
          remember(result.info.memoryRoot);
          store.ensureViews(sessionId);
        } else {
          failedSessions.add(sessionId);
          set({ ...state, error: result.ok ? "info returned no paths" : result.detail ?? result.code });
        }
      });
    },
    /** 缓存的根刷新后仍读不到视图：再发一次 info（每个页面生命周期一次），根变了就换掉缓存，视图跟着换路径。 */
    revalidate(sessionId) {
      if (!isCached) return;
      isCached = false;
      void run(sessionId, encodeMemoryCommand({ cmd: "info" })).then((r) => {
        const result = decodeExecution("info", r);
        if (result.ok && result.info !== void 0 && result.info.memoryRoot !== state.memoryRoot) remember(result.info.memoryRoot);
      });
    },
    /** 让服务端把视图文件写出来：首次拿到 memoryRoot 之后、视图文件缺失或版本不认识时，每个页面生命周期成功一次；同一时间只发一条，失败了下次再试。 */
    ensureViews(sessionId) {
      if (refreshed) return;
      refresh(sessionId);
    },
    /** 记忆页打开：根已知就再刷新一次（这次页面里刷新过也发）；根还没问到时由拿到根之后的 ensureViews 发；正在刷新时不重复发。 */
    refreshOnOpen(sessionId) {
      if (state.memoryRoot === void 0 || refreshing) return;
      refresh(sessionId);
    }
  };
  return store;
}
var MODEL_UNKNOWN = Object.freeze({ status: "unknown" });
function createModelStore(run) {
  const states = /* @__PURE__ */ new Map();
  const listeners = /* @__PURE__ */ new Set();
  return {
    get: (sessionId) => (sessionId === void 0 ? void 0 : states.get(sessionId)) ?? MODEL_UNKNOWN,
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    probe(sessionId) {
      if (states.has(sessionId)) return;
      states.set(sessionId, MODEL_UNKNOWN);
      void run(sessionId, encodeMemoryCommand({ cmd: "model-info" })).then((r) => {
        const result = decodeExecution("model-info", r);
        states.set(sessionId, result.ok ? { status: "ready", model: result.model } : result.code === "llm-unavailable" ? { status: "unavailable" } : { status: "ready", model: void 0 });
        for (const fn of listeners) fn();
      });
    }
  };
}
function createHostGateway(ctx) {
  const viaCommand = async (sessionId, line) => {
    try {
      return await ctx.remote.commands.execute(sessionId, line, []);
    } catch (err) {
      return { ok: false, error: { code: "thrown", message: String(err) } };
    }
  };
  let rpc;
  let reachable;
  ctx.inject(["connection"], (scope) => {
    scope.effect(() => {
      const caller = scope.connection.rpc;
      rpc = caller;
      reachable = void 0;
      return () => {
        if (rpc !== caller) return;
        rpc = void 0;
        reachable = void 0;
      };
    });
  });
  const run = async (sessionId, line) => {
    const caller = rpc;
    if (caller === void 0) return await viaCommand(sessionId, line);
    reachable ??= caller.call(MEMORY_RPC_CHANNEL, MEMORY_RPC_PING, {}).then((r) => r.ok, () => false);
    if (!await reachable) return await viaCommand(sessionId, line);
    try {
      return decodeRpc(await caller.call(MEMORY_RPC_CHANNEL, MEMORY_RPC_RUN, { sessionId, input: line.slice(COMMAND_PREFIX.length).trimStart() }));
    } catch (err) {
      return { ok: false, error: { code: "thrown", message: String(err) } };
    }
  };
  const deletions = createDeletionStore();
  let succeeded = 0;
  const succeededListeners = /* @__PURE__ */ new Set();
  const subscribeSucceeded = (fn) => {
    succeededListeners.add(fn);
    return () => {
      succeededListeners.delete(fn);
    };
  };
  const getSucceeded = () => succeeded;
  const execute = async (sessionId, command) => {
    const result = decodeExecution(command.cmd, await run(sessionId, encodeMemoryCommand(command)));
    deletions.record(command, result);
    if (result.ok || VIEW_BEHIND_CODES.has(result.code)) {
      succeeded++;
      for (const fn of succeededListeners) fn();
    }
    return result;
  };
  const root = createRootStore(run);
  const models = createModelStore(run);
  const viewReads = /* @__PURE__ */ new Map();
  const lastReads = /* @__PURE__ */ new Map();
  const readView = (sessionId, path, trigger, name) => {
    const cached = viewReads.get(path);
    if (cached?.trigger === trigger) return cached.result;
    const result = ctx.remote.workspaceFiles.read(sessionId, path, {}).then((r) => {
      const view = r.ok ? parseView(name, r.value.text) : r.error.code === "workspace-file/not-found" ? { status: "missing" } : { status: "error", message: `${r.error.code}: ${r.error.message}` };
      if (view.status === "ready" && name === "deleted") deletions.settle({ name, data: view.data });
      if (view.status === "ready" && name === "library") deletions.settle({ name, data: view.data });
      if (view.status === "ready") lastReads.set(path, { key: path, trigger, view });
      else lastReads.delete(path);
      return view;
    }, (err) => ({ status: "error", message: String(err) }));
    const entry = { trigger, result };
    viewReads.set(path, entry);
    void result.then((view) => {
      if (view.status === "error" && viewReads.get(path) === entry) viewReads.delete(path);
    });
    return result;
  };
  let configForms;
  let binding;
  let serviceVersion = 0;
  const serviceListeners = /* @__PURE__ */ new Set();
  const serviceChanged = () => {
    serviceVersion++;
    for (const fn of serviceListeners) fn();
  };
  const subscribeService = (fn) => {
    serviceListeners.add(fn);
    return () => {
      serviceListeners.delete(fn);
    };
  };
  const getServiceVersion = () => serviceVersion;
  ctx.inject(["configForms"], (scope) => {
    scope.effect(() => {
      const service = scope.configForms;
      configForms = service;
      binding = void 0;
      serviceChanged();
      return () => {
        if (configForms !== service) return;
        configForms = void 0;
        binding = void 0;
        serviceChanged();
      };
    }, "plastic-memory: gateway config form");
  });
  const config = () => {
    if (binding !== void 0) return binding;
    if (configForms === void 0) return NO_CONFIG;
    const form = configForms.get(ENTRY_ID);
    binding = { form, get: () => form.getSnapshot(), subscribe: (fn) => form.subscribe(fn) };
    return binding;
  };
  function useConfigSnapshot() {
    (0, import_react5.useSyncExternalStore)(subscribeService, getServiceVersion);
    const { get, subscribe } = config();
    return (0, import_react5.useSyncExternalStore)(subscribe, get);
  }
  return ({ useSessions, useResource }) => {
    function useViewState(session, name, isPassive) {
      const rootState = (0, import_react5.useSyncExternalStore)(root.subscribe, root.get);
      const configSnapshot = useConfigSnapshot();
      const configured = configSnapshot?.status === "ready" ? configuredRoot(configSnapshot.value) : void 0;
      (0, import_react5.useEffect)(() => {
        root.syncConfig(configured);
      }, [configured]);
      const sessionId = session.kind === "ready" ? session.sessionId : void 0;
      (0, import_react5.useEffect)(() => {
        if (!isPassive && sessionId !== void 0) root.ensureRoot(sessionId);
      }, [isPassive, sessionId, rootState]);
      const path = sessionId !== void 0 && rootState.memoryRoot !== void 0 ? viewPath(rootState.memoryRoot, name, sessionId) : void 0;
      const stat = useResource(sessionId !== void 0 && path !== void 0 ? fileAddress(sessionId, path) : "");
      const version2 = stat.status === "live" ? stat.value?.version : void 0;
      const isMissing = stat.status === "failed" && stat.failure?.code === "workspace-file/not-found";
      const isRegenerable = !isPassive && (name in GUI_VIEW_FILES || name === "checkups");
      (0, import_react5.useEffect)(() => {
        if (isRegenerable && sessionId !== void 0 && isMissing) root.ensureViews(sessionId);
      }, [isRegenerable, sessionId, isMissing]);
      const key = path ?? "";
      const commands = (0, import_react5.useSyncExternalStore)(subscribeSucceeded, getSucceeded);
      const trigger = version2 !== void 0 ? `${version2}#${rootState.refreshes}#${commands}` : isMissing && rootState.refreshes > 0 ? `refresh:${rootState.refreshes}#${commands}` : void 0;
      const [read, setRead] = (0, import_react5.useState)(() => path === void 0 ? void 0 : lastReads.get(path));
      const isStillMissing = isMissing && trigger !== void 0 && read?.key === key && read.trigger === trigger && read.view.status === "missing";
      (0, import_react5.useEffect)(() => {
        if (isRegenerable && sessionId !== void 0 && isStillMissing) root.revalidate(sessionId);
      }, [isRegenerable, sessionId, isStillMissing]);
      const isOutdated = read !== void 0 && read.key === key && read.view.status === "outdated";
      (0, import_react5.useEffect)(() => {
        if (isRegenerable && sessionId !== void 0 && isOutdated) root.ensureViews(sessionId);
      }, [isRegenerable, sessionId, isOutdated]);
      const isAwaitingRewrite = isRegenerable && isOutdated && (rootState.refreshes === 0 ? rootState.isRefreshFailed !== true : read.trigger !== trigger);
      (0, import_react5.useEffect)(() => {
        if (sessionId === void 0 || path === void 0 || trigger === void 0) return;
        let live = true;
        void readView(sessionId, path, trigger, name).then((view) => {
          if (live) setRead({ key, trigger, view });
        });
        return () => {
          live = false;
        };
      }, [sessionId, path, trigger, key, name]);
      if (sessionId === void 0) return { status: "idle" };
      if (rootState.error !== void 0) return { status: "error", message: rootState.error };
      if (path === void 0) return { status: "loading" };
      if (stat.status === "failed") {
        if (!isMissing) return { status: "error", message: `${stat.failure?.code}: ${stat.failure?.message}` };
        return read !== void 0 && read.key === key && read.trigger === trigger ? read.view : { status: "missing" };
      }
      if (isAwaitingRewrite) return { status: "loading" };
      return read !== void 0 && read.key === key ? read.view : { status: "loading" };
    }
    function useWorkspaceMap() {
      const anchor = useSessions((s) => {
        const picked = pickSession(s, void 0);
        return picked.kind === "ready" ? picked.sessionId : void 0;
      });
      const session = (0, import_react5.useMemo)(
        () => anchor === void 0 ? { kind: "none" } : { kind: "ready", sessionId: anchor, cwd: void 0 },
        [anchor]
      );
      return useViewState(session, "workspaces", true);
    }
    return {
      execute,
      useDeletions() {
        return (0, import_react5.useSyncExternalStore)(deletions.subscribe, deletions.get);
      },
      useModel(session, options) {
        const sessionId = session.kind === "ready" ? session.sessionId : void 0;
        const shouldAsk = options?.shouldAsk !== false;
        const state = (0, import_react5.useSyncExternalStore)(models.subscribe, () => models.get(sessionId));
        (0, import_react5.useEffect)(() => {
          if (sessionId !== void 0 && shouldAsk) models.probe(sessionId);
        }, [sessionId, shouldAsk]);
        return state;
      },
      useConfig() {
        const snapshot = useConfigSnapshot();
        return (0, import_react5.useMemo)(() => snapshot?.status === "ready" ? toPluginConfig(snapshot.value) : void 0, [snapshot]);
      },
      async setConfig(field, value) {
        try {
          return await config().form?.set(field, value) ?? false;
        } catch {
          return false;
        }
      },
      async readFile(sessionId, path) {
        try {
          const r = await ctx.remote.workspaceFiles.read(sessionId, path, {});
          return r.ok ? r.value.text : void 0;
        } catch {
          return void 0;
        }
      },
      async openPath(path, action) {
        try {
          const r = await ctx.remote.session?.openWorkspacePath(action === "reveal" ? { path, action } : { path });
          return r?.ok ?? false;
        } catch {
          return false;
        }
      },
      useSession(workspacePath) {
        const list2 = useSessions((s) => s);
        const mapState = useWorkspaceMap();
        const map = mapState.status === "ready" ? mapState.data.cwds : NO_MAP;
        const picked = pickSession(list2, workspacePath, map);
        const sessionId = picked.kind === "ready" ? picked.sessionId : void 0;
        const cwd = picked.kind === "ready" ? picked.cwd : void 0;
        return (0, import_react5.useMemo)(() => picked.kind === "ready" ? { ...picked, workspaces: map } : picked, [sessionId, cwd, map]);
      },
      useCurrentWorkspace() {
        const id = useSessions(selectedSessionId);
        const cwd = useSessions((s) => id === void 0 ? void 0 : s.byId[id]?.cwd);
        const mapState = useWorkspaceMap();
        const isLoading = id !== void 0 && mapState.status === "loading";
        const map = mapState.status === "ready" ? mapState.data.cwds : NO_MAP;
        const workspacePath = id === void 0 ? void 0 : workspaceOf(cwd, map);
        return (0, import_react5.useMemo)(() => isLoading ? { status: "loading" } : { status: "ready", workspacePath }, [isLoading, workspacePath]);
      },
      useView(session, name) {
        return useViewState(session, name, false);
      },
      useFreshViews(session) {
        const sessionId = session.kind === "ready" ? session.sessionId : void 0;
        const isRequested = (0, import_react5.useRef)(false);
        (0, import_react5.useEffect)(() => {
          if (sessionId === void 0 || isRequested.current) return;
          isRequested.current = true;
          root.refreshOnOpen(sessionId);
        }, [sessionId]);
      }
    };
  };
}

// client/command/protocol.ts
var LLM_FAILURE_KEYS = {
  "llm-unavailable": "pending.model.unavailable",
  "llm-failed": "pending.model.failed",
  "llm-invalid-output": "pending.model.invalid"
};
var local = (code, detail) => ({ kind: "failed", ...code === void 0 ? {} : { code }, detail, isLocalized: true });
var isTidyCommand = (command) => command.cmd === "plan-edits" || command.cmd === "draft-plan" || command.cmd === "apply-edits";
function localKeyOf(command, code) {
  if ((code === "stale" || code === "not-found") && isTidyCommand(command)) return "library.batch.stale";
  switch (code) {
    case "stale":
      return command.cmd === "undo" || command.cmd === "restore" ? "pending.undo.stale" : command.cmd === "ignore-advice" ? "pending.ignore.stale" : command.cmd === "forget" || command.cmd === "hard-delete" ? "pending.delete.stale" : "pending.edit.stale";
    // 按记忆动手的：要动的记忆已经不在（多半在外面删了），服务端已重写视图。待决项的在前面算别处已处理；撤销的是快照没了，照常显示原话
    case "not-found":
      return "memoryId" in command || "memories" in command ? "pending.memory.gone" : void 0;
    case "secret-critical":
      return "pending.edit.secretCritical";
    // 垂直冲突的补上建议、按要求生成：这条记忆对应的指令文件读不到，或在体检后改过
    case "no-baseline":
      return "pending.suggestion.noBaseline";
    case "target-taken":
      return command.cmd === "undo" ? "pending.move.undoTaken" : command.cmd === "promote" || command.cmd === "promote-memory" ? "pending.promote.taken" : "pending.move.taken";
    case "llm-unavailable":
    case "llm-invalid-output":
      return LLM_FAILURE_KEYS[code];
    // 模型报错的原话照常显示
    default:
      return void 0;
  }
}
var isCrossWorkspace = (command) => CROSS_WORKSPACE_COMMANDS.has(command.cmd);
function interpret(command, result) {
  if (result.ok) return { kind: "ok", result };
  const { code } = result;
  if (code === "cross-workspace" && isCrossWorkspace(command) && command.allowCrossWorkspace !== true) {
    const workspacePath = result.rejected?.[0]?.workspacePath;
    if (workspacePath !== void 0) {
      return { kind: "confirm-cross", workspacePath, isMove: command.cmd === "move-memory", resend: { ...command, allowCrossWorkspace: true } };
    }
  }
  if (code === "has-secret" && command.cmd === "forget") return { kind: "confirm-secret", resend: { ...command, cmd: "hard-delete" } };
  if (code === "secret-suspected" && (command.cmd === "edit-memory" || command.cmd === "merge-memories" || command.cmd === "apply-edits" || command.cmd === "apply-proposal" && command.proposal !== void 0)) {
    return { kind: "confirm-suspected", resend: { ...command, force: true } };
  }
  if (code === "claimed" || code === "not-found" && OPEN_ITEM_COMMANDS.has(command.cmd)) return { kind: "handled-elsewhere" };
  const key = localKeyOf(command, code);
  const ids = result.memoryIds !== void 0 ? { memoryIds: result.memoryIds } : {};
  return key !== void 0 ? { ...local(code, key), ...ids } : { kind: "failed", code, detail: result.detail ?? code, isLocalized: false, ...ids };
}
var hasCritical = (texts) => detectSecrets(texts.join("\n")).some((h) => h.severity === "critical");
var editTexts = (ops) => ops.flatMap((op) => op.kind === "edit" ? [op.content ?? "", op.name ?? "", op.summary ?? "", (op.tags ?? []).join(" ")] : []);
function refuseBeforeSend(command) {
  if (command.cmd === "edit-memory" || command.cmd === "merge-memories") {
    const { content, name, summary, tags } = command;
    return hasCritical([content, name, summary, tags.join(" ")]) ? local("secret-critical", "pending.edit.secretCritical") : void 0;
  }
  if (command.cmd === "apply-edits" || command.cmd === "apply-proposal" && command.proposal !== void 0) {
    const ops = command.cmd === "apply-edits" ? command.ops : command.proposal.ops;
    return hasCritical(editTexts(ops)) ? local("secret-critical", "pending.edit.secretCritical") : void 0;
  }
  if (command.cmd === "draft-proposal") {
    const { previous } = command;
    const texts = [command.request, ...command.priorRequests ?? [], ...previous !== void 0 ? [previous.reason, ...editTexts(previous.ops)] : []];
    return hasCritical(texts) ? local("secret-critical", "pending.model.secretCritical") : void 0;
  }
  if (command.cmd === "draft-edit") {
    const { previous, planNote } = command;
    const texts = [
      command.request ?? "",
      ...command.priorRequests ?? [],
      ...planNote !== void 0 ? [planNote.reason, planNote.question?.text ?? "", planNote.question?.placeholder ?? "", planNote.answer ?? ""] : [],
      ...previous !== void 0 ? [previous.content, previous.name ?? "", previous.summary, ...previous.tags ?? []] : []
    ];
    return hasCritical(texts) ? local("secret-critical", "pending.model.secretCritical") : void 0;
  }
  if (command.cmd === "plan-edits") return hasCritical([command.request]) ? local("secret-critical", "pending.model.secretCritical") : void 0;
  if (command.cmd === "draft-plan") {
    const texts = [command.request, ...command.ops.flatMap((op) => [op.reason, op.question?.text ?? "", op.question?.placeholder ?? "", op.answer ?? ""])];
    return hasCritical(texts) ? local("secret-critical", "pending.model.secretCritical") : void 0;
  }
  return void 0;
}

// client/command/useCommandRunner.ts
var ItemSending = (0, import_react6.createContext)(() => {
});
var IDLE = { kind: "idle" };
var BUSY = { kind: "busy" };
function starting(prev, key, state) {
  const next = new Map([...prev].filter(([k, s]) => k !== key && (s.kind === "busy" || s.kind.startsWith("confirm-"))));
  if (state.kind !== "idle") next.set(key, state);
  return next;
}
function useCommandRunner(session) {
  const t = useT();
  const gateway = useGateway();
  const onSending = (0, import_react6.useContext)(ItemSending);
  const [states, setStates] = (0, import_react6.useState)(/* @__PURE__ */ new Map());
  const inFlight = (0, import_react6.useRef)(/* @__PURE__ */ new Set());
  const handlersOf = (0, import_react6.useRef)(/* @__PURE__ */ new Map());
  const clear = (key) => {
    setStates((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };
  const settle = (key, outcome, handlers, command) => {
    if (outcome.kind === "ok") {
      clear(key);
      handlers.onOk?.(outcome.result, command);
      return;
    }
    if (outcome.kind === "handled-elsewhere" && handlers.onHandledElsewhere !== void 0) {
      clear(key);
      handlers.onHandledElsewhere();
      return;
    }
    if (outcome.kind === "failed") {
      const { onFailed } = handlers;
      if (onFailed === "silent" || onFailed !== void 0 && onFailed(outcome)) {
        clear(key);
        return;
      }
    }
    setStates((prev) => new Map(prev).set(key, outcome));
  };
  const run = (key, command, handlers = {}) => {
    if (session.kind !== "ready" || inFlight.current.has(key)) return;
    handlersOf.current.set(key, handlers);
    const refused = refuseBeforeSend(command);
    if (refused !== void 0) {
      setStates((prev) => starting(prev, key, refused));
      return;
    }
    keepFocusInPlace();
    inFlight.current.add(key);
    setStates((prev) => starting(prev, key, BUSY));
    onSending(true);
    void gateway.execute(session.sessionId, command).then((result) => {
      inFlight.current.delete(key);
      onSending(false);
      settle(key, interpret(command, result), handlers, command);
    });
  };
  const stateOf = (key) => states.get(key) ?? IDLE;
  return {
    run,
    stateOf,
    unavailable(key) {
      if (session.kind !== "ready") return t("session.none.hint");
      const { kind } = stateOf(key);
      return kind === "busy" ? t("pending.busy") : kind.startsWith("confirm-") ? t("pending.awaitingConfirm") : void 0;
    },
    confirm(key) {
      const state = stateOf(key);
      if (state.kind === "confirm-cross" || state.kind === "confirm-secret" || state.kind === "confirm-suspected") run(key, state.resend, handlersOf.current.get(key));
    },
    cancel(key) {
      if (stateOf(key).kind !== "busy") clear(key);
    },
    fail(key, detail) {
      setStates((prev) => starting(prev, key, { kind: "failed", detail, isLocalized: false }));
    }
  };
}

// client/chat/model-change.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var UNDO = "undo";
function ModelChangeLine({ session, change, kind, after, bySubject, count = 1, isGlobal = false }) {
  const t = useT();
  const runner = useCommandRunner(session);
  const diffId = (0, import_react7.useId)();
  const [isOpen, setOpen] = (0, import_react7.useState)(false);
  const [local2, setLocal] = (0, import_react7.useState)(void 0);
  const viewState = change === "expired" ? "expired" : change.state;
  const [seen, setSeen] = (0, import_react7.useState)(viewState);
  if (seen !== viewState) {
    setSeen(viewState);
    setLocal(void 0);
    runner.cancel(UNDO);
  }
  const shown = local2 ?? viewState;
  const undo = () => {
    if (change === "expired") return;
    runner.run(UNDO, { cmd: "undo", decisionId: change.decisionId }, {
      onOk() {
        setLocal("undone");
      },
      onFailed(failure) {
        if (failure.code !== "stale") return false;
        setLocal("changed");
        return true;
      }
    });
  };
  const before = change === "expired" ? void 0 : change.before;
  const status = shown === "undoable" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Button, { size: "sm", unavailable: runner.unavailable(UNDO), onClick: undo, children: t("chat.change.undo") }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "pm-change-note", role: "status", children: t(shown === "undone" ? "chat.change.undone" : shown === "changed" ? "chat.change.changed" : "chat.change.expired") });
  const subject = before === void 0 ? t(count === 1 ? "chat.change.supersededOlder.one" : "chat.change.supersededOlder", { count }) : bySubject === void 0 ? t("chat.change.superseded", { name: before.name }) : t("chat.change.supersededBy", { by: bySubject, name: before.name });
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "pm-change", "data-change": kind, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "pm-change-head", children: [
      kind === "rewrite" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "pm-change-lead", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "pm-change-text", children: t("chat.change.rewritten") }),
        isGlobal ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "pm-change-scope", children: t("chat.change.rewrittenGlobal") }) : null,
        before !== void 0 && after !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "pm-link pm-link--muted pm-change-toggle", "aria-expanded": isOpen, "aria-controls": diffId, onClick: () => {
          setOpen(!isOpen);
        }, children: t("chat.change.compare") }) : null
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "pm-change-text", children: subject }),
      status
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(CommandFeedback, { runner, id: UNDO }),
    kind === "rewrite" && before !== void 0 && after !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("dl", { className: "pm-change-diff", id: diffId, hidden: !isOpen, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("dt", { children: t("chat.change.before") }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("dd", { children: before.content }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("dt", { children: t("chat.change.after") }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("dd", { children: after.content })
    ] }) : null
  ] });
}
var modelChangeCss = `
.pm-change { display: flex; flex-direction: column; gap: 6px; padding-left: 14px; }
.pm-change-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
.pm-change-lead { display: flex; align-items: center; gap: 10px; min-width: 0; }
.pm-change-text { min-width: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text); overflow-wrap: anywhere; }
.pm-change-scope { min-width: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); overflow-wrap: anywhere; }
.pm-change-toggle { font-size: 12px; }
.pm-change-note { flex: none; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-change-diff[hidden] { display: none; }
.pm-change-diff {
  display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 4px 10px; margin: 0; padding: 8px 10px;
  border-radius: var(--dsw-radius-sm, 8px); background: var(--pm-bg-block); font-size: 12px; line-height: 1.5;
}
.pm-change-diff dt { color: var(--pm-text-2); }
.pm-change-diff dd { margin: 0; min-width: 0; color: var(--pm-text); white-space: pre-wrap; overflow-wrap: anywhere; }
`;

// client/chat/SavedMemoriesCard.tsx
var import_react13 = require("react");

// client/library/shared.tsx
var import_react10 = require("react");

// client/ui/Icon.tsx
var import_react8 = require("react");

// client/ui/host-icons.ts
var HOST_ICON_DATA = {
  "user": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M8 8.25C9.51878 8.25 10.75 7.01878 10.75 5.5C10.75 3.98122 9.51878 2.75 8 2.75C6.48122 2.75 5.25 3.98122 5.25 5.5C5.25 7.01878 6.48122 8.25 8 8.25Z",
          "stroke": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M2.5 14.5C2.5 11.5 5.25 10.25 8 10.25C10.75 10.25 13.5 11.5 13.5 14.5",
          "stroke": "currentColor"
        }
      }
    ]
  },
  "sparkle": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M5.875 3C5.875 6.33333 7.54167 8 10.875 8C7.54167 8 5.875 9.66667 5.875 13C5.875 9.66667 4.20833 8 0.875 8C4.20833 8 5.875 6.33333 5.875 3Z",
          "stroke": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M12.375 1.55823C12.375 3.39156 13.2917 4.30823 15.125 4.30823C13.2917 4.30823 12.375 5.22489 12.375 7.05823C12.375 5.22489 11.4583 4.30823 9.625 4.30823C11.4583 4.30823 12.375 3.39156 12.375 1.55823Z",
          "stroke": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M12.375 10.4418C12.375 11.7751 13.0417 12.4418 14.375 12.4418C13.0417 12.4418 12.375 13.1084 12.375 14.4418C12.375 13.1084 11.7083 12.4418 10.375 12.4418C11.7083 12.4418 12.375 11.7751 12.375 10.4418Z",
          "stroke": "currentColor"
        }
      }
    ]
  },
  "code": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M4.67398 4.25061L1.36094 7.86484C1.29085 7.9413 1.29085 8.05866 1.36094 8.13513L4.67398 11.7494",
          "stroke": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M11.3262 4.25061L14.6392 7.86484C14.7093 7.9413 14.7093 8.05866 14.6392 8.13513L11.3262 11.7494",
          "stroke": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M9.56222 3.62573L6.43774 12.3743",
          "stroke": "currentColor"
        }
      }
    ]
  },
  "folder": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M1.50439 3.11059C1.50439 2.55831 1.95211 2.1106 2.50439 2.1106H5.43389C5.67773 2.1106 5.91318 2.19969 6.09593 2.36113L7.71649 3.79265C7.89924 3.95409 8.1347 4.04319 8.3785 4.04319H13.4958C14.0481 4.04319 14.4958 4.4909 14.4958 5.04319V12.8894C14.4958 13.4417 14.0481 13.8894 13.4958 13.8894H2.50439C1.95211 13.8894 1.50439 13.4417 1.50439 12.8894V4.04319V3.11059Z",
          "stroke": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M3.63501 7.66614H12.3647",
          "stroke": "currentColor"
        }
      }
    ]
  },
  "globe": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M7.99986 14.0887C11.3626 14.0887 14.0886 11.3627 14.0886 7.99998C14.0886 4.63727 11.3626 1.91125 7.99986 1.91125C4.63715 1.91125 1.91113 4.63727 1.91113 7.99998C1.91113 11.3627 4.63715 14.0887 7.99986 14.0887Z",
          "stroke": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M2.34619 8H13.6538",
          "stroke": "currentColor",
          "stroke-linecap": "square"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M7.99976 14.0889C9.23509 14.0889 10.1743 11.3629 10.1743 8.00006C10.1743 4.63739 9.23509 1.91138 7.99976 1.91138",
          "stroke": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M7.99973 14.0889C6.76445 14.0889 5.8252 11.3629 5.8252 8.00006C5.8252 4.63739 6.76445 1.91138 7.99973 1.91138",
          "stroke": "currentColor"
        }
      }
    ]
  },
  "clock": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z",
          "stroke": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M8 4.31V8.46L11 10.08",
          "stroke": "currentColor"
        }
      }
    ]
  },
  "search": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M6.58727 11.8586C9.55061 11.8586 11.9529 9.45637 11.9529 6.49304C11.9529 3.5297 9.55061 1.12744 6.58727 1.12744C3.62394 1.12744 1.22168 3.5297 1.22168 6.49304C1.22168 9.45637 3.62394 11.8586 6.58727 11.8586Z",
          "stroke": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M10.2991 10.3933L14.7783 14.8725",
          "stroke": "currentColor"
        }
      }
    ]
  },
  "info": {
    "viewBox": "0 0 14 14",
    "strokeWidth": "1",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M12.5757 7.00012C12.5757 3.92085 10.0794 1.42463 7.00012 1.42456C3.9208 1.42456 1.42456 3.9208 1.42456 7.00012C1.42463 10.0794 3.92085 12.5757 7.00012 12.5757C10.0793 12.5756 12.5756 10.0793 12.5757 7.00012ZM13.8002 7.00012C13.8001 10.7559 10.7559 13.8001 7.00012 13.8002C3.2443 13.8002 0.199291 10.7559 0.199219 7.00012C0.199219 3.24426 3.24426 0.199219 7.00012 0.199219C10.7559 0.199291 13.8002 3.2443 13.8002 7.00012Z",
          "fill": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M7.6127 3.18921V4.55986H6.38735V3.18921H7.6127Z",
          "fill": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M7.6127 5.68921V10.8109H6.38735V5.68921H7.6127Z",
          "fill": "currentColor"
        }
      }
    ]
  },
  "check": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1.3",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M2.25 8.5L5.49732 11.7473C5.90519 12.1552 6.57263 12.1344 6.95426 11.7018L13.75 4",
          "stroke": "currentColor"
        }
      }
    ]
  },
  "chevronDown": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M4 6L7.29289 9.29289C7.68342 9.68342 8.31658 9.68342 8.70711 9.29289L12 6",
          "stroke": "currentColor"
        }
      }
    ]
  },
  "chevronDownMedium": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1.3",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M4 6L7.29289 9.29289C7.68342 9.68342 8.31658 9.68342 8.70711 9.29289L12 6",
          "stroke": "currentColor"
        }
      }
    ]
  },
  "chevronUp": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M12 10L8.70711 6.70711C8.31658 6.31658 7.68342 6.31658 7.29289 6.70711L4 10",
          "stroke": "currentColor"
        }
      }
    ]
  },
  "chevronRight": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M6 12L9.29289 8.70711C9.68342 8.31658 9.68342 7.68342 9.29289 7.29289L6 4",
          "stroke": "currentColor"
        }
      }
    ]
  },
  "chevronsUpDown": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1",
    "root": {
      "stroke": "currentColor",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    },
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "m5.1 6 2.9-2.9L10.9 6"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "m5.1 10 2.9 2.9 2.9-2.9"
        }
      }
    ]
  },
  "trash": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M1.28149 3.88831H14.7187",
          "stroke": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M5.41602 3.88833V2.47962C5.41602 2.29282 5.52492 2.11366 5.71876 1.98157C5.9126 1.84948 6.17551 1.77527 6.44964 1.77527H9.55053C9.82466 1.77527 10.0876 1.84948 10.2814 1.98157C10.4753 2.11366 10.5842 2.29282 10.5842 2.47962V3.88833",
          "stroke": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M2.57349 3.88831L3.19366 13.2943C3.21937 13.5502 3.33952 13.7872 3.53065 13.9593C3.72178 14.1313 3.97016 14.2259 4.22729 14.2246H11.7728C12.0299 14.2259 12.2783 14.1313 12.4694 13.9593C12.6605 13.7872 12.7807 13.5502 12.8064 13.2943L13.4266 3.88831",
          "stroke": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M6.44946 6.98926V11.1238",
          "stroke": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M9.55054 6.98926V11.1238",
          "stroke": "currentColor"
        }
      }
    ]
  },
  "plus": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M8 2V14",
          "stroke": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M2 8H14",
          "stroke": "currentColor"
        }
      }
    ]
  },
  "openFile": {
    "viewBox": "0 0 16 16",
    "strokeWidth": "1",
    "root": {},
    "shapes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M11.7256 2.77441C12.5538 2.77469 13.2256 3.44616 13.2256 4.27441V10.1416H12.2256V4.27441C12.2256 3.99844 12.0015 3.77469 11.7256 3.77441H5.7207V2.77441H11.7256Z",
          "fill": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M2.77441 13.2255L12.3756 3.62427",
          "stroke": "currentColor"
        }
      }
    ]
  }
};

// client/ui/Icon.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
var reactProp = (attr) => attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
var reactProps = (attrs) => Object.fromEntries(Object.entries(attrs).map(([k, v]) => [reactProp(k), v]));
function Icon({ name, size = 16, className }) {
  const icon = HOST_ICON_DATA[name];
  const isStroked = (attrs) => "stroke" in attrs || "stroke" in icon.root;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("svg", { width: size, height: size, viewBox: icon.viewBox, fill: "none", strokeWidth: icon.strokeWidth, ...reactProps(icon.root), "aria-hidden": "true", className, children: icon.shapes.map((shape, i) => (0, import_react8.createElement)(shape.tag, { key: i, ...reactProps(shape.attrs), ...isStroked(shape.attrs) ? { vectorEffect: "non-scaling-stroke" } : {} })) });
}

// client/ui/motion.tsx
var import_react9 = require("react");
var import_jsx_runtime5 = require("react/jsx-runtime");
var EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
var ROLL_MS = 200;
var HEIGHT_MS = 220;
function prefersReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function useArrivals(ids, resetKey = "") {
  const state = (0, import_react9.useRef)({ key: resetKey, baseline: void 0, arrived: /* @__PURE__ */ new Set() });
  if (state.current.key !== resetKey) state.current = { key: resetKey, baseline: void 0, arrived: /* @__PURE__ */ new Set() };
  const current = state.current;
  if (ids !== void 0) {
    if (current.baseline === void 0) current.baseline = new Set(ids);
    const baseline = current.baseline;
    const present = new Set(ids);
    for (const id of ids) if (!baseline.has(id)) current.arrived.add(id);
    for (const id of current.arrived) if (!present.has(id)) {
      current.arrived.delete(id);
      baseline.add(id);
    }
  }
  return {
    isNew: (id) => current.arrived.has(id),
    settle: (id) => {
      if (current.arrived.delete(id)) current.baseline?.add(id);
    }
  };
}
function Arrival({ arrivals, id, highlight = false, children }) {
  const [isEntering] = (0, import_react9.useState)(() => arrivals.isNew(id));
  (0, import_react9.useEffect)(() => {
    if (isEntering) arrivals.settle(id);
  }, []);
  if (!isEntering) return children;
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: highlight ? "pm-arrive pm-arrive--highlight" : "pm-arrive", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "pm-arrive-body", children }) });
}
var NUMBER_SLOT = "\0";
function withRollingNumber(template, value, text) {
  const parts = template(NUMBER_SLOT).split(NUMBER_SLOT);
  if (parts.length !== 2) return template(text);
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
    parts[0],
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(RollingNumber, { value, text }),
    parts[1]
  ] });
}
function RollingNumber({ value, text }) {
  const prev = (0, import_react9.useRef)({ value, text });
  const enter = (0, import_react9.useRef)(null);
  const leave = (0, import_react9.useRef)(null);
  const [leaving, setLeaving] = (0, import_react9.useState)(void 0);
  (0, import_react9.useLayoutEffect)(() => {
    const last = prev.current;
    prev.current = { value, text };
    if (last.value === value || prefersReducedMotion()) return;
    const dir = value > last.value ? 1 : -1;
    setLeaving({ text: last.text, dir });
    enter.current?.animate?.([{ transform: `translateY(${dir * 100}%)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: ROLL_MS, easing: EASE_OUT });
  }, [value, text]);
  (0, import_react9.useLayoutEffect)(() => {
    if (leaving === void 0) return;
    const animation = leave.current?.animate?.(
      [{ transform: "none", opacity: 1 }, { transform: `translateY(${-leaving.dir * 100}%)`, opacity: 0 }],
      { duration: ROLL_MS, easing: EASE_OUT, fill: "forwards" }
    );
    if (animation === void 0) {
      setLeaving(void 0);
      return;
    }
    animation.onfinish = () => {
      setLeaving(void 0);
    };
    return () => {
      animation.cancel();
    };
  }, [leaving]);
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "pm-roll", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { ref: enter, children: text }),
    leaving === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { ref: leave, "aria-hidden": "true", children: leaving.text })
  ] });
}
function useHeightTransition(ref, contentKey) {
  const last = (0, import_react9.useRef)(void 0);
  const running = (0, import_react9.useRef)(void 0);
  (0, import_react9.useLayoutEffect)(() => {
    const el = ref.current;
    if (el === null) return;
    if (running.current !== void 0 && last.current?.key === contentKey) return;
    const measure = () => ({ key: contentKey, height: el.getBoundingClientRect().height, margin: getComputedStyle(el).marginTop });
    const from = running.current === void 0 ? last.current : measure();
    running.current?.cancel();
    running.current = void 0;
    const to = measure();
    last.current = to;
    if (from === void 0 || from.key === contentKey || from.height === to.height && from.margin === to.margin) return;
    if (prefersReducedMotion() || typeof el.animate !== "function") return;
    const animation = el.animate(
      [{ height: `${from.height}px`, marginTop: from.margin, overflow: "hidden" }, { height: `${to.height}px`, marginTop: to.margin, overflow: "hidden" }],
      { duration: HEIGHT_MS, easing: EASE_OUT }
    );
    running.current = animation;
    animation.onfinish = () => {
      running.current = void 0;
    };
  });
}
var motionCss = `
.pm-arrive { display: grid; grid-template-rows: 1fr; transition: grid-template-rows 260ms ${EASE_OUT}, margin-top 260ms ${EASE_OUT}; }
.pm-arrive-body {
  min-height: 0; overflow-clip-margin: 8px; animation: pm-arrive-clip 260ms;
  transition: opacity 200ms ease-out, transform 260ms ${EASE_OUT};
}
@starting-style {
  .pm-arrive { grid-template-rows: 0fr; margin-top: calc(-1 * var(--pm-arrive-gap, 0px)); }
  .pm-arrive-body { opacity: 0; transform: translateY(-8px); }
}
/* \u53EA\u5728\u6491\u5F00\u7684\u8FD9\u6BB5\u65F6\u95F4\u88C1\u5207\uFF1A\u4E4B\u540E\u7126\u70B9\u73AF\u3001\u5C55\u5F00\u7684\u6309\u94AE\u4E0D\u88AB\u5207\u6389 */
@keyframes pm-arrive-clip { from, to { overflow: clip; } }
.pm-arrive--highlight .pm-arrive-body { position: relative; isolation: isolate; }
.pm-arrive--highlight .pm-arrive-body::before {
  content: ''; position: absolute; inset: -6px -8px; z-index: -1; border-radius: 10px;
  animation: pm-arrive-tint 1800ms ease-out both;
}
@keyframes pm-arrive-tint { 0%, 60% { background: var(--pm-accent-tint); } 100% { background: transparent; } }
.pm-roll { position: relative; display: inline-grid; vertical-align: top; overflow: visible clip; }
.pm-roll > span { grid-area: 1 / 1; }
/* \u79BB\u573A\u7684\u65E7\u6570\u5B57\u4E0D\u5360\u5BBD\u5EA6\uFF1A\u683C\u5BBD\u53EA\u7531\u65B0\u6570\u5B57\u5B9A\uFF0C\u4F4D\u6570\u53D8\u5C11\u65F6\u5BBD\u5EA6\u5728\u5F00\u59CB\u90A3\u4E00\u523B\u5C31\u53D8\uFF0C\u6EDA\u5B8C\u4E0D\u518D\u8DF3\uFF1B\u6A2A\u5411\u4E0D\u88C1\uFF0C\u5BBD\u7684\u65E7\u6570\u5B57\u4E0D\u88AB\u5207\u6389 */
.pm-roll > span[aria-hidden] { position: absolute; inset-inline-start: 0; }
@media (prefers-reduced-motion: reduce) {
  .pm-arrive, .pm-arrive-body { transition: none; animation: none; }
}
`;

// client/type-label.ts
var KNOWN_TYPES = /* @__PURE__ */ new Set([...BUILTIN_TYPE_NAMES, ...PRESET_TYPE_NAMES, ...RETIRED_TYPE_NAMES]);
function typeLabel(t, type, sources) {
  const custom = sources.customTypes;
  if (custom !== void 0 && Object.hasOwn(custom, type)) return custom[type].label;
  if (KNOWN_TYPES.has(type)) return t(`type.${type}`);
  const view = sources.viewLabels;
  return view !== void 0 && Object.hasOwn(view, type) ? view[type] : type;
}

// client/library/shared.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
function mergeTypeLabels(...views) {
  return Object.assign({}, ...views.map((v) => v.status === "ready" ? v.data.typeLabels ?? {} : {}));
}
function useTypeLabel(session) {
  const gateway = useGateway();
  const t = useT();
  const library = gateway.useView(session, "library");
  const deleted = gateway.useView(session, "deleted");
  const pending = gateway.useView(session, "pending");
  const customTypes = gateway.useConfig()?.customTypes;
  const viewLabels = (0, import_react10.useMemo)(() => mergeTypeLabels(library, deleted, pending), [library, deleted, pending]);
  return (0, import_react10.useCallback)((type) => typeLabel(t, type, { viewLabels, customTypes }), [t, viewLabels, customTypes]);
}
function SearchBox({ label, placeholder, value, onChange }) {
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("label", { className: "pm-search", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Icon, { name: "search", size: 14 }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("input", { type: "search", "aria-label": label, placeholder, value, onChange: (event) => {
      onChange(event.target.value);
    } })
  ] });
}
function matchesQuery(memory, query) {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  return [memory.name, memory.summary, memory.content, ...memory.tags].some((text) => text.toLowerCase().includes(q));
}
function ViewMessage({ state, idle, className = "pm-tab-message" }) {
  const t = useT();
  if (state.status === "ready" || state.status === "idle" && idle === null) return null;
  const text = state.status === "error" ? t("view.error", { message: state.message }) : state.status === "idle" ? idle : t(`view.${state.status}`);
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className, role: "status", children: text });
}
function useFlashTarget(nav, ids) {
  const target = useNavTarget(nav);
  const present = target.memoryId !== void 0 && ids.includes(target.memoryId);
  const handled = (0, import_react10.useRef)(void 0);
  const [flashId, setFlashId] = (0, import_react10.useState)(void 0);
  (0, import_react10.useEffect)(() => {
    if (!present || handled.current === target) return;
    handled.current = target;
    setFlashId(target.memoryId);
  }, [target, present]);
  const isGone = flashId !== void 0 && !ids.includes(flashId);
  (0, import_react10.useEffect)(() => {
    if (isGone) setFlashId(void 0);
  }, [isGone]);
  const upcoming = present && handled.current !== target ? target.memoryId : void 0;
  return { flashId, revealId: flashId ?? upcoming, targetId: present ? target.memoryId : void 0, clear: () => {
    setFlashId(void 0);
  } };
}
var FLASH_MS = 1800;
function FlashRow({ flashing, onFlashEnd, className, children, as: Tag = "li", takesFocus = false }) {
  const ref = (0, import_react10.useRef)(null);
  const end = (0, import_react10.useRef)(onFlashEnd);
  end.current = onFlashEnd;
  const [isRinged, setRinged] = (0, import_react10.useState)(false);
  (0, import_react10.useEffect)(() => {
    if (!flashing) return;
    ref.current?.scrollIntoView?.({ block: "center" });
    if (takesFocus) {
      ref.current?.focus({ preventScroll: true });
      if (prefersReducedMotion()) setRinged(true);
    }
    const timer = setTimeout(() => {
      end.current();
    }, FLASH_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [flashing]);
  const highlight = isRinged ? "pm-flash-ring" : flashing ? "pm-flash" : void 0;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
    Tag,
    {
      ref,
      className: highlight === void 0 ? className : `${className} ${highlight}`,
      tabIndex: takesFocus ? -1 : void 0,
      onBlur: isRinged ? (event) => {
        if (event.target === event.currentTarget) setRinged(false);
      } : void 0,
      children
    }
  );
}
function useRowActions(session) {
  const t = useT();
  const gateway = useGateway();
  const runner = useCommandRunner(session);
  const [notice, setNotice] = (0, import_react10.useState)(void 0);
  const ran = (0, import_react10.useRef)(/* @__PURE__ */ new Set());
  const run = (memoryId, command, okText, onOk, onFailed) => {
    setNotice(void 0);
    ran.current.add(memoryId);
    runner.run(memoryId, command, {
      onOk(result, sent) {
        if (sent.cmd !== command.cmd) {
          setNotice({ kind: "purged", text: t("pending.secret.deletedNotice") });
          return;
        }
        onOk?.(result);
        setNotice(okText === null ? void 0 : sent.cmd === "hard-delete" ? { kind: "purged", text: okText(result) } : { kind: "ok", text: okText(result) });
      },
      onHandledElsewhere() {
        setNotice({ kind: "elsewhere", text: t("command.handledElsewhere") });
      },
      ...onFailed !== void 0 ? { onFailed } : {}
    });
  };
  return {
    notice,
    /** 按钮的 unavailable：没有会话、这条正在处理或等确认时给原因。 */
    unavailable: runner.unavailable,
    run,
    /** 收起这一条的确认或失败（在途的不动）。 */
    dismiss(id) {
      runner.cancel(id);
    },
    /** 这一条的命令发出了、结果还没回来。 */
    isBusy(id) {
      return runner.stateOf(id).kind === "busy";
    },
    /** 这一行的确认与失败；没有时为 null。 */
    feedback(memoryId) {
      return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(CommandFeedback, { runner, id: memoryId });
    },
    /** 失败的那一条已不在列表里（别处删掉、恢复了）：失败提示放在列表上方，不跟着那一行消失。shown：此刻列表里的记忆 id。 */
    strayFailures(shown) {
      const ids = new Set(shown);
      return [...ran.current].filter((id) => !ids.has(id) && runner.stateOf(id).kind === "failed").map((id) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(CommandFeedback, { runner, id }, id));
    },
    async open(path, action) {
      if (!await gateway.openPath(path, action)) setNotice({ kind: "error", text: t("action.openFailed") });
    }
  };
}
var sharedTabCss = `
.pm-search {
  display: flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px; border-radius: var(--dsw-radius-md, 12px);
  border: .5px solid var(--pm-line-input); color: var(--pm-text-2); background: transparent;
}
.pm-search input {
  flex: 1; min-width: 0; height: 100%; border: 0; outline: none; background: transparent;
  font: inherit; font-size: 13px; color: var(--pm-text);
}
.pm-search input::placeholder { color: var(--pm-text-2); }
.pm-search:focus-within { outline: var(--dsw-focus-ring-width, 2px) solid var(--pm-focus); outline-offset: 0; }
.pm-tab-message { margin: 24px 0; text-align: center; font-size: 12px; color: var(--pm-text-2); }
.pm-notice { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; container-type: inline-size; }
.pm-list-row {
  position: relative; display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 12px 12px 16px; border-radius: 10px;
}
.pm-list-row + .pm-list-row::after {
  content: ''; position: absolute; left: 16px; right: 12px; top: 0; border-top: .5px solid var(--pm-line);
}
.pm-list-row > .pm-mc { flex: 1; }
.pm-row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.pm-row-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; flex-shrink: 0; }
@container (max-width: 500px) {
  .pm-list-row { flex-direction: column; align-items: stretch; gap: 8px; }
}
.pm-flash { animation: pm-flash ${FLASH_MS}ms ease-out both; }
.pm-flash::before {
  content: ''; position: absolute; left: 4px; top: 9px; bottom: 9px; width: 2px; border-radius: 2px;
  background: var(--pm-accent); animation: pm-flash-bar ${FLASH_MS}ms ease-out both;
}
@keyframes pm-flash { 0%, 60% { background: var(--pm-accent-tint); } 100% { background: transparent; } }
@keyframes pm-flash-bar { 0%, 60% { opacity: 1; } 100% { opacity: 0; } }
.pm-root .pm-flash-ring { outline: var(--dsw-focus-ring-width, 2px) solid var(--pm-focus); outline-offset: 2px; }
`;

// client/ui/MemoryCard.tsx
var import_react11 = require("react");

// client/ui/Chip.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
function Chip({ variant, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: `pm-chip pm-chip--${variant}`, children: [
    variant === "result" ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "pm-chip-dot", "aria-hidden": "true" }) : null,
    children
  ] });
}
var chipCss = `
.pm-chip {
  display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
  font-size: 11px; line-height: 16px; padding: 1px 6px; border-radius: 4px;
  color: var(--pm-text); white-space: nowrap;
}
.pm-chip--result { background: var(--pm-bg-block); }
.pm-chip-dot { width: 6px; height: 6px; border-radius: 999px; background: var(--pm-success); }
.pm-chip--neutral { background: var(--pm-bg-block); color: var(--pm-text-2); border-radius: 999px; padding: 1px 8px; }
`;

// client/ui/MemoryCard.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
var COLLAPSED_LINES = 6;
var SOURCE_ICON = {
  "user-explicit": "user",
  "user-behavior": "user",
  "agent-inferred": "sparkle",
  "agent-action-confirmed": "sparkle",
  "environment-observed": "code"
};
function MemoryCard({ memory, now, typeLabel: typeLabel2, hideType = false, hideScope = false, scopeSlot, projectName, badge, collapsible = false }) {
  const t = useT();
  const expired = memory.validTo !== void 0 && memory.validTo <= now;
  const textId = (0, import_react11.useId)();
  const textRef = (0, import_react11.useRef)(null);
  const [isExpanded, setExpanded] = (0, import_react11.useState)(false);
  const [isLong, setLong] = (0, import_react11.useState)(false);
  const [measuredContent, setMeasuredContent] = (0, import_react11.useState)(memory.content);
  if (measuredContent !== memory.content) {
    setMeasuredContent(memory.content);
    setExpanded(false);
  }
  const isClamped = collapsible && !isExpanded;
  const hasBadge = badge !== void 0;
  (0, import_react11.useLayoutEffect)(() => {
    const el = textRef.current;
    if (!isClamped || el === null) return;
    const measure = () => {
      setLong(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [isClamped, memory.content, hasBadge]);
  const item = (icon, text) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "pm-mc-item", children: [
    icon === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Icon, { name: icon, size: 13 }),
    text
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: expired ? "pm-mc pm-mc--expired" : "pm-mc", "data-memory-id": memory.id, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("p", { ref: textRef, id: textId, className: isClamped ? "pm-mc-text pm-mc-text--clamped" : "pm-mc-text", children: [
      memory.content,
      hasBadge ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "pm-mc-badge", children: badge }) : null
    ] }),
    collapsible && isLong ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "pm-mc-more", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("button", { type: "button", className: "pm-mc-toggle", "aria-expanded": isExpanded, "aria-controls": textId, onClick: () => {
        setExpanded(!isExpanded);
      }, children: [
        t(isExpanded ? "memory.collapse" : "memory.expand"),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Icon, { name: isExpanded ? "chevronUp" : "chevronDown", size: 14 })
      ] }),
      hasBadge && isClamped ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "pm-mc-badge", "aria-hidden": "true", children: badge }) : null
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "pm-mc-meta", children: [
      hideType ? null : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Chip, { variant: "neutral", children: typeLabel2 ?? memory.type }),
      scopeSlot !== void 0 ? scopeSlot : hideScope ? null : memory.scope === "global" ? item("globe", t("scope.global")) : item("folder", projectName ?? t("scope.workspace")),
      item(memory.sourceMode === void 0 ? void 0 : SOURCE_ICON[memory.sourceMode], t(memory.sourceMode === void 0 ? "source.none" : `source.${memory.sourceMode}`)),
      item("clock", formatDay(memory.updatedAt, now, t)),
      memory.delegation === void 0 ? null : item(void 0, t(`memory.delegated.${memory.delegation.reviewed ?? "pending"}`, { depth: memory.delegation.depth })),
      expired ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "pm-mc-item", children: t("memory.expired") }) : null
    ] })
  ] });
}
var memoryCardCss = `
.pm-mc { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.pm-mc-text {
  margin: 0; padding-left: 12px; border-left: 2px solid var(--pm-accent);
  font-size: var(--dsh-content-font-size, 14px); line-height: 1.6; color: var(--pm-text);
  white-space: pre-wrap; overflow-wrap: anywhere;
}
.pm-mc--expired .pm-mc-text { color: var(--pm-text-2); }
.pm-mc-text--clamped { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: ${COLLAPSED_LINES}; overflow: hidden; }
.pm-mc-more { display: flex; align-items: center; gap: 6px; margin-top: -2px; }
/* \u5BF9\u9F50\u5BBF\u4E3B\u7684\u6298\u53E0\u6309\u94AE\uFF1A\u5E7D\u7075\u6309\u94AE\u3001\u6B21\u6587\u5B57\u8272\uFF0C\u5DE6\u8FB9\u8D1F\u5916\u8FB9\u8DDD\u62B5\u6389\u81EA\u8EAB\u5185\u8FB9\u8DDD\uFF0C\u5B57\u548C\u539F\u6587\u5DE6\u7F18\u5BF9\u9F50 */
.pm-mc-toggle {
  display: inline-flex; align-items: center; gap: 2px; margin-left: 8px; padding: 1px 6px;
  border: 0; border-radius: 6px; background: transparent; font: inherit; font-size: 12px; line-height: 20px;
  color: var(--pm-text-2); cursor: pointer;
}
@media (hover: hover) { .pm-mc-toggle:hover { background: var(--pm-hover); } }
.pm-mc-badge { margin-left: 6px; white-space: nowrap; }
.pm-mc-more .pm-mc-badge { margin-left: 0; }
.pm-mc-badge .pm-chip { vertical-align: 1px; }
.pm-mc-meta {
  display: flex; flex-wrap: wrap; align-items: center; gap: 2px 12px; padding-left: 14px;
  font-size: 12px; line-height: 1.5; color: var(--pm-text-2);
}
.pm-mc-item { display: inline-flex; align-items: center; gap: 4px; min-width: 0; overflow-wrap: anywhere; }
.pm-mc-item svg { flex-shrink: 0; }
/* \u81EA\u5B9A\u4E49\u7C7B\u578B\u540D\u53EF\u80FD\u5F88\u957F\uFF1A\u7A84\u4FA7\u680F\u91CC\u5141\u8BB8\u6298\u884C\uFF0C\u4E0D\u6491\u51FA\u6A2A\u5411\u6EDA\u52A8 */
.pm-mc-meta .pm-chip { flex-shrink: 1; min-width: 0; white-space: normal; overflow-wrap: anywhere; }
`;

// client/chat/promote-in-place.tsx
var import_react12 = require("react");

// client/ui/Advice.tsx
var import_jsx_runtime9 = require("react/jsx-runtime");
function BulbIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("svg", { width: 15, height: 15, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1, strokeLinecap: "square", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("path", { d: "M6.2 10.8V10.3C4.7 9.5 3.6 8 3.6 6.3C3.6 3.9 5.6 2 8 2C10.4 2 12.4 3.9 12.4 6.3C12.4 8 11.3 9.5 9.8 10.3V10.8", vectorEffect: "non-scaling-stroke" }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("path", { d: "M6.2 12.3H9.8", vectorEffect: "non-scaling-stroke" }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("path", { d: "M6.9 14.1H9.1", vectorEffect: "non-scaling-stroke" })
  ] });
}
function AdviceNote({ label = "advice", children }) {
  const t = useT();
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "pm-advice", children: [
    label === "note" ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Icon, { name: "info", size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(BulbIcon, {}),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "pm-advice-label", children: t(label === "note" ? "advice.label.note" : "advice.label") }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: "pm-advice-text", children })
  ] });
}
function ResultLine({ chip, children, undo }) {
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "pm-result-line", children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Chip, { variant: "result", children: chip }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: "pm-result-text", children }),
    undo
  ] });
}
var adviceCss = `
.pm-advice, .pm-result-line { display: flex; gap: 6px; margin: 0; padding-top: 4px; }
.pm-advice > svg { flex: none; margin-top: 2px; color: var(--pm-text); }
.pm-advice-label { flex: none; margin-right: 2px; font-size: 12px; font-weight: 600; line-height: 1.6; color: var(--pm-text); }
.pm-advice-text, .pm-result-text { flex: 1; min-width: 0; margin: 0; font-size: 12px; line-height: 1.6; color: var(--pm-text-2); }
.pm-result-line { align-items: center; flex-wrap: wrap; gap: 8px; }
`;

// client/chat/promote-in-place.tsx
var import_jsx_runtime10 = require("react/jsx-runtime");
function promotionOf(card) {
  if (card === void 0) return void 0;
  return card.scope === "global" ? "promoted" : card.promotion;
}
function inPlacePromoteCommand(memoryId, scope, target) {
  return { cmd: "promote-memory", memoryId, layer: scope, isCandidateRequired: true, ...target === "agents-md" ? { target: "agents-md" } : {} };
}
var PROMOTE = "promote";
function usePromoteInPlace(session, memory, scope, state, onWroteAgentsMd) {
  const t = useT();
  const promoteTarget = useGateway().useConfig()?.globalPromoteTarget;
  const [decided, setDecided] = (0, import_react12.useState)(void 0);
  const [local2, setLocal] = (0, import_react12.useState)(void 0);
  const [isRefused, setRefused] = (0, import_react12.useState)(false);
  const [seenState, setSeenState] = (0, import_react12.useState)(state);
  if (seenState !== state) {
    setSeenState(state);
    setLocal(void 0);
    if (decided !== void 0 && state !== decided.verdict) setDecided(void 0);
  }
  const runner = useCommandRunner(session);
  const handlers = {
    onOk(result, command) {
      if (command.cmd === "undo") {
        setDecided(void 0);
        setLocal("candidate");
        return;
      }
      const verdict = command.cmd !== "promote-memory" ? "kept-local" : command.target === "agents-md" ? "wrote-agents-md" : "promoted";
      setDecided({ verdict, decisionId: verdict === "wrote-agents-md" ? void 0 : result.decisionId });
      setLocal(verdict);
      if (verdict === "wrote-agents-md") onWroteAgentsMd?.();
    },
    onHandledElsewhere() {
      setRefused(true);
    }
  };
  const shown = local2 ?? state;
  const unavailable = runner.unavailable(PROMOTE);
  const run = (command) => {
    setRefused(false);
    runner.run(PROMOTE, command, handlers);
  };
  const undoId = decided !== void 0 && shown === decided.verdict ? decided.decisionId : void 0;
  const undo = undoId !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Button, { variant: "ghost", unavailable, onClick: () => {
    run({ cmd: "undo", decisionId: undoId });
  }, children: t("pending.undo") }) : void 0;
  const note = t(promoteTarget === "agents-md" ? "pending.promote.agentsMdNote" : "pending.promote.globalNote");
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
    shown === "candidate" ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(AdviceNote, { children: t("conflict.twoSentences", { first: t("pending.promote.reason"), second: note }) }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "pm-pending-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Button, { size: "sm", unavailable, onClick: () => {
          run({ cmd: "keep-local-memory", memoryId: memory.id, layer: scope });
        }, children: t("pending.promote.keepLocal") }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          Button,
          {
            size: "sm",
            unavailable: unavailable ?? (promoteTarget === void 0 ? t("pending.promote.configLoading") : void 0),
            onClick: () => {
              if (promoteTarget !== void 0) run(inPlacePromoteCommand(memory.id, scope, promoteTarget));
            },
            children: t(promoteTarget === "agents-md" ? "pending.promote.agentsMd" : "pending.promote.global")
          }
        )
      ] })
    ] }) : shown === "promoted" ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(ResultLine, { chip: t("pending.result.promoted"), undo, children: t("pending.result.promotedBody") }) : shown === "kept-local" ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(ResultLine, { chip: t("pending.result.keptLocal"), undo, children: t("pending.result.keptLocalBody") }) : shown === "wrote-agents-md" ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(ResultLine, { chip: t("pending.result.wroteAgentsMd"), children: t("pending.result.wroteAgentsMdBody") }) : null,
    isRefused ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "pm-pending-error", role: "alert", tabIndex: -1, children: t("pending.refused", { title: memory.name }) }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(CommandFeedback, { runner, id: PROMOTE })
  ] });
}

// client/chat/SavedMemoriesCard.tsx
var import_jsx_runtime11 = require("react/jsx-runtime");
var LIVE_MS = 1e4;
var ROW = "row";
function liveCard(library, id, scope) {
  if (library === void 0) return void 0;
  const find = (match) => library.layers.find((l) => match(l.layer))?.items.find((m) => m.id === id);
  return find((s) => scope !== void 0 && sameScope(s, scope)) ?? find((s) => s.kind === "global");
}
function SavedRow({ session, item, scope, promotion, rewrite, superseded, expiredSupersedes, now, typeLabel: typeLabel2, onDetail, onWroteAgentsMd }) {
  const t = useT();
  const gateway = useGateway();
  const runner = useCommandRunner(session);
  const id = item.memory.id;
  const promote = usePromoteInPlace(session, item.memory, scope, promotion, onWroteAgentsMd);
  const isWrittenToAgentsMd = promotion === "wrote-agents-md";
  const [firstSeen] = (0, import_react13.useState)(() => Date.now());
  const savedAt = Number.isFinite(item.memory.updatedAt) && item.memory.updatedAt > 0 ? item.memory.updatedAt : firstSeen;
  const how = gateway.useDeletions().of(id, scope, savedAt);
  const [seenHow, setSeenHow] = (0, import_react13.useState)(how);
  if (seenHow !== how) {
    setSeenHow(how);
    if (how === "soft") runner.cancel(ROW);
  }
  const isBusy = runner.stateOf(ROW).kind === "busy";
  const changes = /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_jsx_runtime11.Fragment, { children: [
    rewrite !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(ModelChangeLine, { session, change: rewrite, kind: "rewrite", after: item.memory, isGlobal: rewrite !== "expired" && rewrite.before.scope === "global" }) : null,
    superseded.map((c) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(ModelChangeLine, { session, change: c, kind: "supersede" }, c.decisionId)),
    expiredSupersedes > 0 ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(ModelChangeLine, { session, change: "expired", kind: "supersede", count: expiredSupersedes }) : null
  ] });
  const feedback = /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(CommandFeedback, { runner, id: ROW });
  if (isWrittenToAgentsMd) {
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "pm-saved-row", "data-memory-id": id, children: /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "pm-saved-main", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(MemoryCard, { memory: item.memory, now, typeLabel: typeLabel2(item.memory.type) }),
      promote
    ] }) });
  }
  if (how === "hard") {
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "pm-saved-row pm-saved-row--deleted", "data-memory-id": id, children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { className: "pm-saved-note", tabIndex: -1, children: t("pending.secret.deletedNotice") }) });
  }
  if (how === "soft" && !isBusy) {
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "pm-saved-row pm-saved-row--deleted", "data-memory-id": id, children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "pm-saved-main", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { className: "pm-saved-note", children: t("chat.card.deleted") }),
        feedback
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        Button,
        {
          variant: "ghost",
          unavailable: runner.unavailable(ROW),
          onClick: () => {
            runner.run(ROW, { cmd: "restore", memoryId: id, layer: scope }, { onFailed: "silent" });
          },
          children: t("chat.card.undo")
        }
      )
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "pm-saved-row", "data-memory-id": id, children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "pm-saved-main", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(MemoryCard, { memory: item.memory, now, typeLabel: typeLabel2(item.memory.type) }),
      promote,
      changes,
      feedback,
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "pm-saved-foot", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { type: "button", className: "pm-link pm-link--muted", onClick: onDetail, children: t("chat.card.detail") }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      DeleteWithConfirm,
      {
        onDelete: () => {
          runner.run(ROW, { cmd: "forget", memoryId: id, layer: scope });
        },
        trigger: (open) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          Button,
          {
            variant: "icon",
            "aria-label": t("chat.card.delete"),
            title: t("chat.card.delete"),
            unavailable: runner.unavailable(ROW),
            onClick: open,
            children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Icon, { name: "trash", size: 14 })
          }
        )
      }
    )
  ] });
}
function SavedMemoriesCard({ sessionId, cwd, saved, now, openDetail }) {
  const t = useT();
  const [isOpen, setOpen] = (0, import_react13.useState)(false);
  const [wroteAgentsMd, setWroteAgentsMd] = (0, import_react13.useState)(/* @__PURE__ */ new Set());
  const listId = (0, import_react13.useId)();
  const [isLive] = (0, import_react13.useState)(() => saved.some((item) => now - item.memory.updatedAt < LIVE_MS));
  const session = (0, import_react13.useMemo)(() => ({ kind: "ready", sessionId, cwd }), [sessionId, cwd]);
  const typeLabel2 = useTypeLabel(session);
  const gateway = useGateway();
  const sessionView = gateway.useView(session, "session");
  const workspaceMap = gateway.useView(session, "workspaces");
  const library = gateway.useView(session, "library");
  const workspacePath = (sessionView.status === "ready" ? sessionView.data.workspacePath : void 0) ?? workspaceOf(cwd, workspaceMap.status === "ready" ? workspaceMap.data.cwds : {});
  const scopeOf = (memory) => scopeOfMemory(memory) ?? (workspacePath === void 0 ? void 0 : { kind: "workspace", workspacePath });
  const current = (item) => {
    if (wroteAgentsMd.has(item.memory.id)) return { memory: item.memory, promotion: "wrote-agents-md" };
    if (item.memory.scope === "global") return { memory: item.memory, promotion: void 0 };
    const live = liveCard(library.status === "ready" ? library.data : void 0, item.memory.id, scopeOf(item.memory));
    const promotion = promotionOf(live);
    if (promotion !== "promoted") return { memory: item.memory, promotion };
    const { workspacePath: _workspacePath, ...rest } = item.memory;
    return { memory: { ...rest, scope: "global" }, promotion };
  };
  const modelChanges = library.status === "ready" ? library.data.modelChanges ?? [] : [];
  const changesOf = (item) => modelChanges.filter((c) => c.sessionId === sessionId && c.callId === item.callId);
  const rewriteOf = (item) => {
    if (item.isUpdate !== true) return void 0;
    const found = changesOf(item).find((c) => c.kind === "rewrite" && c.memoryId === item.memory.id);
    if (found !== void 0) return found;
    return library.status === "ready" && now - item.memory.updatedAt > RETENTION_MS ? "expired" : void 0;
  };
  const placed = (item) => {
    const rewrite = rewriteOf(item);
    if (rewrite === void 0 || rewrite === "expired") return item;
    const { workspacePath: _workspacePath, ...rest } = item.memory;
    const { scope, workspacePath: workspacePath2 } = rewrite.before;
    return { ...item, memory: { ...rest, scope, ...workspacePath2 !== void 0 ? { workspacePath: workspacePath2 } : {} } };
  };
  const filled = (item) => {
    const at2 = placed(item);
    if (item.edit === void 0) return at2;
    const rewrite = rewriteOf(item);
    const before = rewrite === void 0 || rewrite === "expired" ? void 0 : rewrite.before;
    const outcome = before === void 0 ? void 0 : applyEdits(before.content, item.edit.edits);
    const source = before !== void 0 && outcome !== void 0 && "content" in outcome ? { ...before, content: outcome.content, ...item.edit.fields } : liveCard(library.status === "ready" ? library.data : void 0, item.memory.id, scopeOf(at2.memory));
    if (source === void 0) return at2;
    const { name, type, summary, content, tags } = source;
    return { ...at2, memory: maskSecretSurface({ ...at2.memory, name, type, summary, content, tags }, { severity: "suspected" }) };
  };
  const candidates = saved.filter((item) => current(filled(item)).promotion === "candidate").length;
  const firstName = saved[0] === void 0 ? void 0 : filled(saved[0]).memory.name;
  const rewritten = saved.filter((item) => item.isUpdate === true).length;
  const fresh = saved.length - rewritten;
  const expiredSupersedesOf = (item) => item.supersedes === void 0 || library.status !== "ready" || changesOf(item).some((c) => c.kind === "supersede") || now - item.memory.updatedAt <= RETENTION_MS ? 0 : item.supersedes.length;
  const supersededCount = saved.reduce((n, item) => n + changesOf(item).filter((c) => c.kind === "supersede").length + expiredSupersedesOf(item), 0);
  const title = fresh === 0 ? t("chat.card.title.rewritten", { count: rewritten }) : rewritten === 0 ? t("chat.card.title", { count: saved.length }) : t("chat.card.title.mixed", { count: fresh, rewritten });
  const folded = fresh === 0 ? t(rewritten === 1 ? "chat.card.folded.rewritten.one" : "chat.card.folded.rewritten", { count: rewritten }) : rewritten === 0 ? t(saved.length === 1 ? "chat.card.folded.one" : "chat.card.folded", { count: saved.length }) : t("chat.card.folded.mixed", { count: fresh, rewritten });
  const counted = (key) => withRollingNumber((slot) => t(key, { count: slot }), saved.length, String(saved.length));
  const titleNode = fresh > 0 && rewritten === 0 ? counted("chat.card.title") : title;
  const foldedNode = fresh > 0 && rewritten === 0 ? counted(saved.length === 1 ? "chat.card.folded.one" : "chat.card.folded") : folded;
  const detail = (memory) => {
    const scope = scopeOf(memory);
    openDetail({ view: "library", ...scope === void 0 ? {} : { scope }, memoryId: memory.id, fromChat: true });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("section", { className: isLive ? "pm-saved pm-saved--enter" : "pm-saved", "data-open": isOpen || void 0, "aria-label": title, children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("h3", { className: "pm-saved-title", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("button", { type: "button", className: "pm-saved-toggle", "aria-expanded": isOpen, "aria-controls": listId, onClick: () => {
      setOpen(!isOpen);
    }, children: [
      isOpen ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "pm-saved-lead", children: titleNode }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_jsx_runtime11.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "pm-saved-lead", children: foldedNode }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "pm-saved-first", title: firstName, children: firstName }),
        candidates > 0 ? /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { className: "pm-saved-hint", title: t("chat.card.folded.promote", { count: candidates }), children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("i", { className: "pm-sep", "aria-hidden": "true", children: "\xB7" }),
          t("chat.card.folded.promote", { count: candidates })
        ] }) : null,
        supersededCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { className: "pm-saved-hint", title: t("chat.card.folded.superseded", { count: supersededCount }), children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("i", { className: "pm-sep", "aria-hidden": "true", children: "\xB7" }),
          t("chat.card.folded.superseded", { count: supersededCount })
        ] }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "pm-saved-chevron", "aria-hidden": "true", children: "\u203A" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "pm-saved-list", id: listId, hidden: !isOpen, children: isOpen ? saved.map((item) => {
      const { memory, promotion } = current(filled(item));
      return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        SavedRow,
        {
          session,
          item: { ...item, memory },
          scope: scopeOf(memory),
          promotion,
          rewrite: rewriteOf(item),
          superseded: changesOf(item).filter((c) => c.kind === "supersede"),
          expiredSupersedes: expiredSupersedesOf(item),
          now,
          typeLabel: typeLabel2,
          onDetail: () => {
            detail(memory);
          },
          onWroteAgentsMd: () => {
            setWroteAgentsMd((prev) => new Set(prev).add(item.memory.id));
          }
        },
        item.callId
      );
    }) : null })
  ] });
}
var savedMemoriesCardCss = `
.pm-saved {
  display: flex; flex-direction: column; gap: 10px; margin: 4px 0; padding: 12px 14px;
  border: 0.5px solid var(--pm-line-card); border-radius: var(--dsw-radius-lg, 16px); background: var(--pm-bg);
}
.pm-saved--enter { transition: opacity 200ms ease-out, transform 200ms cubic-bezier(0.23, 1, 0.32, 1); }
@starting-style { .pm-saved--enter { opacity: 0; transform: translateY(4px); } }
@media (prefers-reduced-motion: reduce) { .pm-saved--enter { transition: none; } }
.pm-saved-title { margin: 0; font-size: 13px; font-weight: 600; line-height: 1.5; color: var(--pm-text); }
.pm-saved-toggle {
  display: flex; align-items: baseline; width: 100%; min-width: 0; padding: 0; border: 0; background: none;
  font: inherit; color: inherit; text-align: left; cursor: pointer;
}
.pm-saved-lead { flex: none; white-space: pre; }
.pm-saved-first { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 400; color: var(--pm-text-2); }
/* \u672B\u5C3E\u7684\u63D0\u793A\u548C\u9996\u6761\u540D\u79F0\u4E00\u8D77\u6536\u7F29\uFF0C\u7A84\u7684\u65F6\u5019\u5199\u7701\u7565\u53F7\uFF0C\u4E0D\u753B\u51FA\u5361\u7247 */
.pm-saved-hint { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 400; color: var(--pm-text-2); }
.pm-saved-chevron { flex: none; margin-left: auto; padding-left: 8px; font-weight: 400; color: var(--pm-text-2); transition: transform 120ms ease; }
.pm-saved[data-open] .pm-saved-chevron { transform: rotate(90deg); }
@media (prefers-reduced-motion: reduce) { .pm-saved-chevron { transition: none; } }
.pm-saved-toggle:hover .pm-saved-chevron, .pm-saved-toggle:hover .pm-saved-first, .pm-saved-toggle:hover .pm-saved-hint { color: var(--pm-text); }
.pm-saved-list[hidden] { display: none; }
.pm-saved-list { display: flex; flex-direction: column; gap: 12px; }
.pm-saved-row { display: flex; align-items: flex-start; gap: 8px; }
.pm-saved-row--deleted { align-items: center; justify-content: space-between; }
.pm-saved-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.pm-saved-note { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-saved-foot { display: flex; justify-content: flex-end; }
.pm-saved-foot .pm-link { font-size: 12px; }
`;

// client/checkup/StatusBar.tsx
var import_react16 = require("react");

// client/ui/StatusMarker.tsx
var import_jsx_runtime12 = require("react/jsx-runtime");
function StatusMarker({ kind, label }) {
  const a11y = label === void 0 ? { "aria-hidden": true } : { role: "img", "aria-label": label };
  if (kind === "secret") {
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("svg", { className: "pm-marker", "data-pm-marker": kind, width: 14, height: 14, viewBox: "0 0 14 14", ...a11y, children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("path", { d: "M7 1.4 13.2 12.4H.8Z", fill: "var(--pm-error)", stroke: "var(--pm-error)", strokeWidth: "1.2", strokeLinejoin: "round" }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("path", { d: "M7 5.2v3.4M7 10.4v.1", stroke: "var(--pm-on-error)", strokeWidth: "1.5", strokeLinecap: "round" })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: `pm-marker pm-marker--dot pm-marker--${kind}`, "data-pm-marker": kind, ...a11y });
}
var statusMarkerCss = `
.pm-marker { display: inline-block; flex-shrink: 0; vertical-align: middle; }
.pm-marker--dot { width: 8px; height: 8px; border-radius: 999px; }
.pm-marker--pending { background: var(--pm-warn); }
.pm-marker--ok { background: var(--pm-success); }
.pm-marker--error { background: var(--pm-error); }
.pm-marker--done { background: var(--pm-caption); }
`;

// client/checkup/seen.ts
var import_react14 = require("react");
var import_zod4 = require("zod");
var SEEN_STORAGE_KEY = "dsh-plastic-memory.gui.checkupSeen";
var seenSchema = import_zod4.z.object({
  checkups: import_zod4.z.array(import_zod4.z.object({ id: import_zod4.z.string(), keys: import_zod4.z.array(import_zod4.z.string()), scopes: import_zod4.z.array(import_zod4.z.string()) }))
});
var EMPTY = { checkups: [] };
function readSeen() {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    if (raw === null) return EMPTY;
    const parsed = seenSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}
function markSeen(view, marks) {
  if (marks.length === 0) return;
  const live = new Set(checkupResults(view).map((r) => r.result.checkupId));
  const before = readSeen();
  const byId = new Map(before.checkups.filter((c) => live.has(c.id)).map((c) => [c.id, { ...c }]));
  for (const mark of marks) {
    if (!live.has(mark.checkupId)) continue;
    const entry = byId.get(mark.checkupId) ?? { id: mark.checkupId, keys: [], scopes: [] };
    entry.keys = [.../* @__PURE__ */ new Set([...entry.keys, ...mark.keys ?? []])];
    if (mark.scope !== void 0 && !entry.scopes.includes(mark.scope)) entry.scopes = [...entry.scopes, mark.scope];
    byId.set(mark.checkupId, entry);
  }
  const next = { checkups: [...byId.values()] };
  const text = JSON.stringify(next);
  if (text === JSON.stringify(before)) return;
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, text);
  } catch {
  }
}
function useVisitSeen(visitKey) {
  const [visit, setVisit] = (0, import_react14.useState)(() => ({ key: visitKey, seen: readSeen() }));
  if (visit.key === visitKey) return visit.seen;
  const next = { key: visitKey, seen: readSeen() };
  setVisit(next);
  return next.seen;
}
function isResultSeen(seen, checkupId, scope) {
  return seen.checkups.some((c) => c.id === checkupId && c.scopes.includes(scope));
}
function checkupResults(view) {
  if (view === void 0) return [];
  const out = [];
  if (view.allResult !== null) out.push({ scope: SCOPE_KEYS.all, result: view.allResult });
  for (const s of view.scopes) {
    if (s.lastResult !== null) out.push({ scope: checkupKey(s.scope), result: s.lastResult });
  }
  return out;
}
function newItemIndex(view) {
  const index = /* @__PURE__ */ new Map();
  for (const { result } of checkupResults(view)) {
    for (const key of [...result.added.keys, ...result.globalAdded?.keys ?? []]) {
      const ids = index.get(key) ?? [];
      if (!ids.includes(result.checkupId)) index.set(key, [...ids, result.checkupId]);
    }
  }
  return index;
}
function isNewItem(index, seen, key) {
  return (index.get(key) ?? []).some((id) => !seen.checkups.some((c) => c.id === id && c.keys.includes(key)));
}

// client/checkup/TitleControls.tsx
var import_react15 = require("react");
var import_jsx_runtime13 = require("react/jsx-runtime");
var DEFAULT_DAYS = 7;
var MENU_WIDTH = 272;
var EDGE = 8;
var NOTE_WIDTH = 240;
function TitleControls({ scope, session, runs, checkups, isGovernanceEnabled, projectCount, isEmpty }) {
  const t = useT();
  if (!isGovernanceEnabled) return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("p", { className: "pm-head-off", children: t("settings.governanceOff") });
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(import_jsx_runtime13.Fragment, { children: [
    checkups !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(AutoCheckup, { scope, session, view: checkups }, checkupKey(scope)) : null,
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(RunCheckup, { scope, runs, projectCount, isEmpty }, `run:${checkupKey(scope)}`)
  ] });
}
function busyHint(scope, t) {
  return scope.kind === "all" ? t("checkup.run.busy.all") : scope.kind === "global" ? t("checkup.run.busy.global") : t("checkup.run.busy.workspace", { name: baseName(scope.workspacePath) });
}
function RunCheckup({ scope, runs, projectCount, isEmpty }) {
  const t = useT();
  const noteId = (0, import_react15.useId)();
  const [isNoteOpen, setNoteOpen] = (0, import_react15.useState)(false);
  const [isStartAligned, setStartAligned] = (0, import_react15.useState)(false);
  const root = (0, import_react15.useRef)(null);
  const note = (0, import_react15.useRef)(null);
  const busy = runs.busyScope(scope);
  const hint = scope.kind === "all" ? t(projectCount === 1 ? "checkup.run.hint.all.one" : "checkup.run.hint.all", { n: formatNumber(projectCount) }) : scope.kind === "global" ? t("checkup.run.hint.global") : t("checkup.run.hint.workspace", { name: baseName(scope.workspacePath) });
  const button = () => root.current?.querySelector(".pm-run") ?? null;
  const close = (focusButton) => {
    setNoteOpen(false);
    if (focusButton) button()?.focus();
  };
  (0, import_react15.useLayoutEffect)(() => {
    if (isNoteOpen) note.current?.focus();
  }, [isNoteOpen]);
  (0, import_react15.useEffect)(() => {
    if (!isNoteOpen) return;
    const onPointer = (event) => {
      if (!root.current?.contains(event.target)) close(false);
    };
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [isNoteOpen]);
  const onClick = () => {
    if (!isEmpty) {
      runs.run(scope);
      return;
    }
    if (isNoteOpen) {
      close(false);
      return;
    }
    setStartAligned((button()?.getBoundingClientRect().right ?? Infinity) - NOTE_WIDTH < EDGE);
    setNoteOpen(true);
  };
  const onNoteBlur = (event) => {
    const next = event.relatedTarget;
    if (next !== null && !root.current?.contains(next)) close(false);
  };
  const text = scope.kind === "all" ? t("checkup.run.empty.all") : scope.kind === "global" ? t("checkup.run.empty.global") : t("checkup.run.empty.workspace");
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { ref: root, className: "pm-run-wrap", children: [
    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
      Button,
      {
        className: busy === void 0 ? "pm-run" : "pm-run pm-run--busy",
        title: hint,
        unavailable: busy === void 0 ? void 0 : busyHint(busy, t),
        "aria-haspopup": isEmpty ? "dialog" : void 0,
        "aria-expanded": isEmpty ? isNoteOpen : void 0,
        "aria-controls": isNoteOpen ? noteId : void 0,
        onClick,
        children: [
          busy === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("path", { d: "M3 12h4l2.5-6 5 12 2.5-6h4" }) }) : /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "pm-run-spinner", "aria-hidden": "true" }),
          busy === void 0 ? t("checkup.run") : t("checkup.running")
        ]
      }
    ),
    isNoteOpen ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
      "div",
      {
        ref: note,
        id: noteId,
        role: "dialog",
        "aria-labelledby": `${noteId}-text`,
        tabIndex: -1,
        className: isStartAligned ? "pm-run-note pm-run-note--start" : "pm-run-note",
        onKeyDown: (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close(true);
          }
        },
        onBlur: onNoteBlur,
        children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("p", { id: `${noteId}-text`, className: "pm-run-note-text", children: text })
      }
    ) : null
  ] });
}
function frequencyText(frequency, t) {
  return frequency === "manual" ? t("checkup.auto.manual") : frequency === 1 ? t("checkup.auto.daily") : t("checkup.auto.days", { n: formatNumber(frequency) });
}
function parseDays(text) {
  const n = parsePositiveInt(text);
  return n !== void 0 && n <= AUTO_CHECKUP_MAX_DAYS ? n : void 0;
}
function AutoCheckup({ scope, session, view }) {
  const t = useT();
  const gateway = useGateway();
  const menuId = (0, import_react15.useId)();
  const [isOpen, setOpen] = (0, import_react15.useState)(false);
  const [isStartAligned, setStartAligned] = (0, import_react15.useState)(false);
  const [draft, setDraft] = (0, import_react15.useState)("");
  const [isDirty, setDirty] = (0, import_react15.useState)(false);
  const [hidden, setHidden] = (0, import_react15.useState)(/* @__PURE__ */ new Set());
  const [isFailed, setFailed] = (0, import_react15.useState)(false);
  const root = (0, import_react15.useRef)(null);
  const trigger = (0, import_react15.useRef)(null);
  const menu = (0, import_react15.useRef)(null);
  const isOpenNow = (0, import_react15.useRef)(false);
  const settings = /* @__PURE__ */ new Map([[SCOPE_KEYS.all, view.defaultFrequency]]);
  for (const s of view.scopes) if (s.isOwn) settings.set(checkupKey(s.scope), s.frequency);
  const { frequency, isOwn } = resolveAutoCheckup(settings, scope);
  const isAll = scope.kind === "all";
  const isExplicit = isAll || isOwn;
  const owned = isAll ? view.scopes.filter((s) => s.isOwn && !hidden.has(checkupKey(s.scope))) : [];
  const days = parseDays(draft);
  (0, import_react15.useEffect)(() => {
    setHidden((prev) => prev.size === 0 ? prev : new Set([...prev].filter((key) => view.scopes.some((s) => s.isOwn && checkupKey(s.scope) === key))));
  }, [view]);
  const title = isAll ? t("checkup.auto.title.all") : scope.kind === "global" ? t("checkup.auto.title.global") : t("checkup.auto.title.workspace", { name: baseName(scope.workspacePath) });
  const value = frequencyText(frequency, t);
  const aria = t(isAll ? "checkup.auto.aria" : isOwn ? "checkup.auto.aria.own" : "checkup.auto.aria.follow", { title, value });
  const items = () => [...menu.current?.querySelectorAll("[data-menu-item]") ?? []];
  const close = (focusTrigger) => {
    isOpenNow.current = false;
    setOpen(false);
    setFailed(false);
    if (focusTrigger) trigger.current?.focus();
  };
  const send = (target, choice) => {
    if (session.kind !== "ready") return Promise.resolve(false);
    return gateway.execute(session.sessionId, { cmd: "set-auto-checkup", scope: target, frequency: choice }).then((r) => {
      setFailed(!r.ok);
      return r.ok;
    });
  };
  const choose = (choice) => {
    close(true);
    void send(scope, choice);
  };
  const dismiss = () => {
    if (!isOpenNow.current) return;
    if (isDirty && days !== void 0) void send(scope, days);
    close(false);
  };
  (0, import_react15.useLayoutEffect)(() => {
    if (!isOpen) return;
    const list2 = items();
    (list2.find((el) => el.dataset.checked === "true") ?? list2[0])?.focus();
  }, [isOpen]);
  (0, import_react15.useEffect)(() => {
    if (!isOpen) return;
    const onPointer = (event) => {
      if (!root.current?.contains(event.target)) dismiss();
    };
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
    };
  });
  const toggle = () => {
    if (isOpen) {
      dismiss();
      return;
    }
    setDraft(typeof frequency === "number" && frequency > 1 ? String(frequency) : String(DEFAULT_DAYS));
    setDirty(false);
    setStartAligned((trigger.current?.getBoundingClientRect().right ?? Infinity) - MENU_WIDTH < EDGE);
    isOpenNow.current = true;
    setOpen(true);
  };
  const onMenuKey = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    const active = event.target;
    if ((event.key === "Enter" || event.key === " ") && active instanceof HTMLButtonElement && menu.current?.contains(active)) {
      event.preventDefault();
      active.click();
      return;
    }
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const list2 = items();
    const at2 = list2.indexOf(event.target);
    const next = at2 === -1 ? step === 1 ? 0 : list2.length - 1 : (at2 + step + list2.length) % list2.length;
    list2[next]?.focus();
  };
  const onMenuBlur = (event) => {
    const next = event.relatedTarget;
    if (next !== null && (menu.current?.contains(next) || next === trigger.current)) return;
    dismiss();
  };
  const unfollow = (target, event) => {
    const key = checkupKey(target);
    const list2 = items();
    const at2 = list2.indexOf(event.currentTarget);
    (list2[at2 + 1] ?? list2[at2 - 1])?.focus();
    setHidden((prev) => new Set(prev).add(key));
    void send(target, AUTO_CHECKUP_FOLLOW).then((ok) => {
      if (!ok) setHidden((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    });
  };
  const option = (choice, name, hint, isChecked) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
    "button",
    {
      type: "button",
      role: "menuitemradio",
      "aria-checked": isChecked,
      "aria-label": name,
      "aria-describedby": `${menuId}-${String(choice)}`,
      tabIndex: -1,
      "data-menu-item": "",
      "data-checked": isChecked,
      className: "pm-auto-option",
      onClick: () => {
        choose(choice);
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Check, { isChecked }),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "pm-auto-option-name", children: name }),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { id: `${menuId}-${String(choice)}`, className: "pm-auto-option-hint", children: hint })
      ]
    }
  );
  const isDaysChecked = isExplicit && typeof frequency === "number" && frequency > 1;
  const isDraftInvalid = days === void 0;
  const daysHintId = `${menuId}-days`;
  const foot = isAll ? t(owned.length > 0 ? "checkup.auto.foot.allOwn" : "checkup.auto.foot.all") : scope.kind === "global" ? t("checkup.auto.foot.global") : t("checkup.auto.foot.workspace", { name: baseName(scope.workspacePath) });
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { ref: root, className: "pm-auto", children: [
    isFailed ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("p", { className: "pm-auto-failed", role: "status", children: t("checkup.auto.saveFailed") }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
      "button",
      {
        ref: trigger,
        type: "button",
        className: "pm-auto-trigger",
        "aria-label": aria,
        "aria-haspopup": "menu",
        "aria-expanded": isOpen,
        "aria-controls": isOpen ? menuId : void 0,
        onClick: toggle,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { children: t("checkup.auto") }),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "pm-auto-value", children: value }),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Icon, { name: "chevronsUpDown", size: 14 })
        ]
      }
    ),
    isOpen ? /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
      "div",
      {
        ref: menu,
        id: menuId,
        role: "menu",
        "aria-labelledby": `${menuId}-title`,
        tabIndex: -1,
        className: isStartAligned ? "pm-auto-menu pm-auto-menu--start" : "pm-auto-menu",
        onKeyDown: onMenuKey,
        onBlur: onMenuBlur,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("p", { id: `${menuId}-title`, className: "pm-auto-menu-title", children: title }),
          isAll ? null : option(AUTO_CHECKUP_FOLLOW, t("checkup.auto.follow", { value: frequencyText(view.defaultFrequency, t) }), t("checkup.auto.follow.hint"), !isOwn),
          option("manual", t("checkup.auto.manual"), t("checkup.auto.manual.hint"), isExplicit && frequency === "manual"),
          option(1, t("checkup.auto.daily"), t("checkup.auto.daily.hint"), isExplicit && frequency === 1),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
            "div",
            {
              role: "menuitemradio",
              "aria-checked": isDaysChecked,
              "aria-label": t("checkup.auto.days", { n: days === void 0 ? "N" : formatNumber(days) }),
              className: "pm-auto-option",
              onClick: (event) => {
                if (event.target !== event.currentTarget.querySelector("input") && days !== void 0) choose(days);
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Check, { isChecked: isDaysChecked }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "pm-auto-option-name", children: [
                  t("checkup.auto.days.before"),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    "input",
                    {
                      type: "text",
                      inputMode: "numeric",
                      className: "pm-auto-days",
                      value: draft,
                      tabIndex: -1,
                      "data-menu-item": "",
                      "data-checked": isDaysChecked,
                      "aria-label": t(isDaysChecked ? "checkup.auto.days.input.checked" : "checkup.auto.days.input"),
                      "aria-describedby": daysHintId,
                      ...isDraftInvalid ? { "aria-invalid": true } : {},
                      onChange: (event) => {
                        setDraft(event.target.value);
                        setDirty(true);
                      },
                      onKeyDown: (event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        if (days !== void 0) choose(days);
                      }
                    }
                  ),
                  t("checkup.auto.days.after")
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { id: daysHintId, className: isDraftInvalid ? "pm-auto-option-hint pm-auto-option-hint--invalid" : "pm-auto-option-hint", role: isDraftInvalid ? "status" : void 0, children: isDraftInvalid ? t("checkup.auto.days.invalid") : t("checkup.auto.days.hint") })
              ]
            }
          ),
          owned.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("ul", { role: "group", "aria-labelledby": `${menuId}-own`, className: "pm-auto-own", children: [
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("li", { role: "none", id: `${menuId}-own`, className: "pm-auto-own-title", children: t("checkup.auto.own.title") }),
            owned.map((s) => {
              const name = scopeLabel(s.scope, t);
              return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("li", { role: "none", className: "pm-auto-own-row", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "pm-auto-own-label", children: t("checkup.auto.own.row", { name, value: frequencyText(s.frequency, t) }) }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                  "button",
                  {
                    type: "button",
                    role: "menuitem",
                    tabIndex: -1,
                    "data-menu-item": "",
                    className: "pm-link pm-auto-own-back",
                    "aria-label": t("checkup.auto.own.backAria", { name }),
                    onClick: (event) => {
                      unfollow(s.scope, event);
                    },
                    children: t("checkup.auto.own.back")
                  }
                )
              ] }, checkupKey(s.scope));
            })
          ] }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("p", { className: "pm-auto-menu-foot", children: t("checkup.auto.foot", { scope: foot, model: t("checkup.auto.foot.model") }) })
        ]
      }
    ) : null
  ] });
}
function Check({ isChecked }) {
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "pm-auto-check", "aria-hidden": "true", children: isChecked ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Icon, { name: "check", size: 14 }) : null });
}
var titleControlsCss = `
.pm-head-off { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-btn.pm-run {
  height: 30px; gap: 6px; padding: 0 12px; border: 0; border-radius: var(--dsw-radius-md, 12px);
  background: var(--pm-hover); font-weight: 600; color: var(--pm-text);
}
.pm-btn.pm-run:hover:not([aria-disabled='true']), .pm-btn.pm-run:active:not([aria-disabled='true']) { background: var(--pm-pressed); }
.pm-btn.pm-run--busy, .pm-btn.pm-run--busy[aria-disabled='true'] { opacity: 1; font-weight: 400; color: var(--pm-text-2); }
.pm-run-spinner {
  width: 12px; height: 12px; border-radius: 999px; border: 1.5px solid currentColor; border-right-color: transparent;
  animation: pm-run-spin .8s linear infinite;
}
@keyframes pm-run-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .pm-run-spinner { animation: none; } }
.pm-run-wrap { position: relative; display: inline-flex; }
/* \u6807\u9898\u884C\u7684\u4E24\u4E2A\u5F39\u5C42\uFF1A\u300C\u7ACB\u5373\u4F53\u68C0\u300D\u65C1\u7684\u8BF4\u660E\u3001\u81EA\u52A8\u4F53\u68C0\u83DC\u5355\uFF0C\u6302\u5728\u89E6\u53D1\u6309\u94AE\u4E0B\u65B9\u53F3\u5BF9\u9F50\uFF08--start \u5DE6\u5BF9\u9F50\uFF09 */
.pm-run-note, .pm-auto-menu {
  position: absolute; top: calc(100% + 4px); right: 0; z-index: 20; border-radius: 14px;
  background: var(--pm-bg-raised); box-shadow: var(--dsw-elevation-panel); outline: none; text-align: left;
}
.pm-run-note--start, .pm-auto-menu--start { right: auto; left: 0; }
.pm-run-note { width: 240px; box-sizing: border-box; padding: 10px 12px; }
.pm-run-note-text { margin: 0; font-size: 13px; line-height: 1.5; color: var(--pm-text); }
.pm-auto { position: relative; display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 4px 8px; min-width: 0; }
.pm-auto-failed { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text); }
.pm-auto-trigger {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 8px 0 10px; border: 0; border-radius: var(--dsw-radius-md, 12px);
  background: transparent; font: inherit; font-size: 13px; line-height: 1.5; white-space: nowrap; color: var(--pm-text-2); cursor: pointer;
}
.pm-auto-trigger:hover, .pm-auto-trigger[aria-expanded='true'] { background: var(--pm-hover); }
.pm-auto-value { color: var(--pm-text); }
.pm-auto-menu { width: 272px; padding: 6px; display: flex; flex-direction: column; }
.pm-auto-menu-title { margin: 0; padding: 6px 8px 4px; font-size: 12px; font-weight: 600; line-height: 1.5; color: var(--pm-text-2); }
.pm-auto-option {
  display: grid; grid-template-columns: 16px minmax(0, 1fr); column-gap: 8px; align-items: center;
  width: 100%; padding: 6px 8px; border: 0; border-radius: 10px; background: transparent;
  font: inherit; text-align: left; color: var(--pm-text); cursor: pointer;
}
.pm-auto-option:hover, .pm-auto-option:focus-within { background: var(--pm-hover); }
.pm-auto-check { grid-row: 1; display: inline-flex; color: var(--pm-text); }
.pm-auto-option-name { grid-column: 2; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; line-height: 1.5; }
.pm-auto-option-hint { grid-column: 2; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-auto-option-hint--invalid { color: var(--pm-error); }
.pm-auto-days {
  width: 52px; height: 26px; box-sizing: border-box; padding: 0 8px; border: .5px solid var(--pm-line-input); border-radius: var(--dsw-radius-sm, 8px);
  background: var(--pm-bg); font: inherit; font-size: 13px; color: var(--pm-text);
}
.pm-auto-days:focus-visible { outline: none; border-color: var(--dsw-alias-state-business-primary); }
.pm-auto-days[aria-invalid='true'] { border-color: var(--pm-error); }
.pm-auto-own { margin: 4px 0 0; padding: 6px 0 0; list-style: none; border-top: .5px solid var(--pm-line); }
.pm-auto-own-title { padding: 2px 8px 4px; font-size: 12px; font-weight: 600; line-height: 1.5; color: var(--pm-text-2); }
.pm-auto-own-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 8px; font-size: 13px; line-height: 1.5; }
.pm-auto-own-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pm-auto-own-back { flex-shrink: 0; font-size: 12px; }
.pm-auto-menu-foot { margin: 4px 0 0; padding: 8px 8px 4px; border-top: .5px solid var(--pm-line); font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
`;

// client/checkup/StatusBar.tsx
var import_jsx_runtime14 = require("react/jsx-runtime");
function scoreOf(health) {
  if (health === void 0) return void 0;
  if (health.gate.secret || health.score === null) return "secret";
  return health.lastCheckupAt === null ? void 0 : health.score;
}
var TIER_MARKER = { green: "ok", amber: "pending", red: "error" };
var DEDUCTIONS = ["rule", "content", "freshness"];
var DEDUCTION_LABEL = {
  rule: "checkup.status.deduction.rule",
  content: "checkup.status.deduction.content",
  freshness: "checkup.status.deduction.freshness"
};
var ISSUE_LABEL = {
  expired: "checkup.status.issue.expired",
  bloat: "checkup.status.issue.bloat",
  orphan: "checkup.status.issue.orphan",
  malformed: "checkup.status.issue.malformed",
  conflict: "checkup.status.issue.conflict",
  redundancy: "checkup.status.issue.redundancy",
  misplaced: "checkup.status.issue.misplaced",
  unclear: "checkup.status.issue.unclear",
  stale: "checkup.status.issue.stale"
};
var HOST_CODE_CAUSE = {
  ACCOUNT_SIGN_IN_REQUIRED: "checkup.cause.signIn",
  ACCOUNT_TOKEN_INVALID: "checkup.cause.tokenInvalid",
  MISSING_CREDENTIAL: "checkup.cause.missingCredential",
  INVALID_CREDENTIAL: "checkup.cause.invalidCredential",
  AUTH: "checkup.cause.auth",
  QUOTA: "checkup.cause.quota",
  RATE_LIMIT: "checkup.cause.rateLimit",
  TIMEOUT: "checkup.cause.timeout",
  TRANSPORT: "checkup.cause.transport",
  SERVER: "checkup.cause.server",
  CONTEXT_WINDOW_EXCEEDED: "checkup.cause.contextWindow"
};
var CAUSE_KIND = {
  "no-default-model": "checkup.cause.noDefaultModel",
  "model-error": "checkup.cause.modelError",
  "unparseable": "checkup.cause.unparseable",
  "error": "checkup.cause.error"
};
function causeText(cause, t) {
  const byCode = cause.hostCode === void 0 ? void 0 : HOST_CODE_CAUSE[cause.hostCode];
  return t(byCode ?? CAUSE_KIND[cause.kind]);
}
function formatPoints(points) {
  return String(Math.max(0.1, Math.round(points * 10) / 10));
}
var Sep = () => /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("i", { className: "pm-sep", "aria-hidden": "true", children: "\xB7" });
function joined(parts) {
  return parts.map((part, i) => /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("span", { children: [
    part,
    i < parts.length - 1 ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Sep, {}) : null
  ] }, i));
}
function StatusBar({ scope, view, nav, runs, seen, health, checkups, isGovernanceEnabled, memoryCount, projectCount, needs }) {
  const t = useT();
  const now = Date.now();
  const count = t(memoryCount === 1 ? "checkup.status.count.one" : "checkup.status.count", { n: formatNumber(memoryCount) });
  const allCount = () => t(memoryCount === 1 ? "checkup.status.all.count.one" : "checkup.status.all.count", {
    scopes: allScopesSub(projectCount, t),
    n: formatNumber(memoryCount)
  });
  if (!isGovernanceEnabled) {
    return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("section", { className: "pm-status", "aria-label": t("status.label"), children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("p", { className: "pm-status-line", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "pm-status-soft", children: scope.kind === "all" ? allCount() : count }) }) });
  }
  const result = /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(ResultRow, { scope, isTodoView: view === "todo", nav, runs, seen, checkups, now });
  if (scope.kind === "all") {
    const lastAt = Math.max(...(checkups?.scopes.filter((s) => s.isCheckable) ?? health.layers).map((s) => s.lastCheckupAt ?? -Infinity));
    const meta = [allCount()];
    if (Number.isFinite(lastAt)) meta.push(t("checkup.status.last", { date: formatDay(lastAt, now, t) }));
    const auto = checkups === void 0 ? void 0 : autoSummary(checkups, t);
    if (auto !== void 0) meta.push(auto);
    return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("section", { className: "pm-status", "aria-label": t("status.label"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(AllHeadline, { needs }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("p", { className: "pm-status-meta", children: joined(meta) }),
      result
    ] });
  }
  const scopeHealth = health.layers.find((l) => sameScope(l.layer, scope));
  const entry = checkups?.scopes.find((s) => sameScope(s.scope, scope));
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(ScopeStatus, { scopeHealth, entry, count, now, result });
}
function ScopeStatus({ scopeHealth, entry, count, now, result }) {
  const t = useT();
  const whyId = (0, import_react16.useId)();
  const [isWhyOpen, setWhyOpen] = (0, import_react16.useState)(false);
  const score = scoreOf(scopeHealth);
  const lastAt = entry?.lastCheckupAt ?? scopeHealth?.lastCheckupAt ?? null;
  const meta = [count];
  if (lastAt !== null) meta.push(t("checkup.status.last", { date: formatDay(lastAt, now, t) }));
  if (entry !== void 0 && entry.frequency !== "manual" && entry.failure === null && entry.modelUnavailable === null) {
    if (entry.isDue) meta.push(t("checkup.status.due"));
    else if (entry.nextCheckupAt !== null) meta.push(t("checkup.status.next", { time: formatDayTime(entry.nextCheckupAt, now, t) }));
  }
  if (typeof score === "number") {
    meta.push(
      /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("button", { type: "button", className: "pm-status-why", "aria-expanded": isWhyOpen, "aria-controls": isWhyOpen ? whyId : void 0, onClick: () => {
        setWhyOpen(!isWhyOpen);
      }, children: [
        t("checkup.status.why"),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Icon, { name: "chevronDownMedium", size: 12 })
      ] })
    );
  }
  const deductions = scopeHealth === void 0 ? [] : DEDUCTIONS.filter((d) => scopeHealth.deductions[d].points > 0);
  const isPlain = score !== "secret" && (score === void 0 || scopeHealth === void 0);
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("section", { className: isPlain ? "pm-status pm-status--plain" : "pm-status", "aria-label": t("status.label"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("p", { className: "pm-status-line", children: score === "secret" ? /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "pm-status-mark", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(StatusMarker, { kind: "secret" }) }),
      t("status.unscored"),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Sep, {}),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "pm-status-soft", children: t("status.secretFirst") })
    ] }) : score === void 0 || scopeHealth === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "pm-status-soft", children: t("health.unscored") }) : /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "pm-status-mark", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(StatusMarker, { kind: TIER_MARKER[scopeHealth.tier] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { children: withRollingNumber((slot) => t("health.score", { score: slot }), score, formatNumber(score)) }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Sep, {}),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "pm-status-soft", children: t(`health.tier.${scopeHealth.tier}`) })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("p", { className: "pm-status-meta", children: joined(meta) }),
    isWhyOpen && scopeHealth !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("ul", { id: whyId, className: "pm-status-deductions", "aria-label": t("checkup.status.why"), children: deductions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("li", { children: t("checkup.status.noDeduction") }) : deductions.map((d) => {
      const { points, types } = scopeHealth.deductions[d];
      const label = t(DEDUCTION_LABEL[d]);
      const typeText = types.map((type) => ISSUE_LABEL[type] === void 0 ? type : t(ISSUE_LABEL[type])).join(t("checkup.status.listSep"));
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("li", { children: types.length === 0 ? t("checkup.status.deduction.bare", { label, points: formatPoints(points) }) : t("checkup.status.deduction", { label, points: formatPoints(points), types: typeText }) }, d);
    }) }) : null,
    result
  ] });
}
function AllHeadline({ needs }) {
  const t = useT();
  const busy = needs.filter((n) => n.todo > 0);
  if (busy.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("p", { className: "pm-status-line", children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "pm-status-mark", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(StatusMarker, { kind: "ok" }) }),
      t("checkup.status.all.clear")
    ] });
  }
  const phrase = ({ scope, hasSecret }) => scope.kind === "global" ? t(hasSecret ? "checkup.status.all.secret.global" : "checkup.status.all.todo.global") : t(hasSecret ? "checkup.status.all.secret" : "checkup.status.all.todo", { name: baseName(scope.workspacePath) });
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("p", { className: "pm-status-line", children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "pm-status-mark", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(StatusMarker, { kind: busy.some((n) => n.hasSecret) ? "secret" : "pending" }) }),
    joined(busy.map((n, i) => i === 0 ? phrase(n) : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "pm-status-soft", children: phrase(n) })))
  ] });
}
function autoSummary(view, t) {
  const own = view.scopes.filter((s) => s.isCheckable && s.isOwn).map((s) => scopeLabel(s.scope, t));
  const frequency = view.defaultFrequency;
  if (own.length === 0) return frequency === "manual" ? void 0 : t("checkup.status.all.auto", { frequency: frequencyText(frequency, t) });
  const names = own.join(t("checkup.status.listSep"));
  return frequency === "manual" ? t("checkup.status.all.manualOwn", { names }) : t("checkup.status.all.autoOwn", { frequency: frequencyText(frequency, t), names });
}
function runningText(scope, t) {
  return scope.kind === "all" ? t("checkup.result.running.all") : scope.kind === "global" ? t("checkup.result.running.global") : t("checkup.result.running.workspace", { name: baseName(scope.workspacePath) });
}
function failureText(failure, t) {
  return failure.code === "llm-unavailable" ? t("checkup.result.llmUnavailable") : failure.code === "governance-disabled" ? t("settings.governanceOff") : t("checkup.result.failed", { detail: failure.detail ?? failure.code });
}
function Line({ children, title, isSoft = false }) {
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("p", { className: isSoft ? "pm-status-result-line pm-status-soft-line" : "pm-status-result-line", title, children });
}
function ResultRow({ scope, isTodoView, nav, runs, seen, checkups, now }) {
  const t = useT();
  const shown = (0, import_react16.useRef)([]);
  shown.current = [];
  const box = (0, import_react16.useRef)(null);
  (0, import_react16.useEffect)(() => {
    box.current?.setAttribute("data-live", "");
  }, []);
  (0, import_react16.useEffect)(() => {
    if (isTodoView && checkups !== void 0) markSeen(checkups, shown.current);
  });
  const key = checkupKey(scope);
  const jump = (to, target) => {
    nav.update({ view: "todo", newItem: to, memoryId: void 0, ...target !== void 0 ? { scope: target } : {} });
  };
  const link = (text, onClick) => /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { type: "button", className: "pm-link", onClick, children: text });
  const lines = [];
  const busy = runs.busyScope(scope);
  if (busy !== void 0) {
    lines.push(/* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Line, { isSoft: true, children: runningText(busy, t) }, "running"));
  } else {
    const failure = runs.failure(scope);
    if (failure !== void 0) lines.push(/* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Line, { title: failure.detail, children: failureText(failure, t) }, "manual-failed"));
    if (scope.kind === "all") {
      const all = checkups?.allResult ?? null;
      if (all !== null && !isResultSeen(seen, all.checkupId, key)) {
        shown.current.push({ checkupId: all.checkupId, scope: key });
        lines.push(...resultLines(all, "all"));
      }
      const autos = checkupResults(checkups).filter(({ scope: s, result }) => s !== SCOPE_KEYS.all && result.by === "auto" && !isResultSeen(seen, result.checkupId, s) && !isResultSeen(seen, result.checkupId, key));
      const sum = (pick2) => autos.reduce((n, { result }) => n + pick2(result), 0);
      const pendingN = sum((r) => r.added.pending + (r.globalAdded?.pending ?? 0));
      const adviceN = sum((r) => r.added.advice + (r.globalAdded?.advice ?? 0));
      if (pendingN + adviceN > 0) {
        for (const { result } of autos) shown.current.push({ checkupId: result.checkupId, scope: key });
        const parts = [];
        if (pendingN > 0) parts.push(link(t("checkup.result.autoNewTodo", { n: formatNumber(pendingN) }), () => {
          jump("todo");
        }));
        if (adviceN > 0) {
          parts.push(link(t(pendingN > 0 ? "checkup.result.autoNewAdvice" : "checkup.result.autoNewAdviceOnly", { n: formatNumber(adviceN) }), () => {
            jump("advice");
          }));
        }
        lines.push(/* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Line, { children: joined(parts) }, "auto"));
      }
    } else {
      const entry = checkups?.scopes.find((s) => sameScope(s.scope, scope));
      if (entry?.failure != null && entry.frequency !== "manual") {
        const { cause, retryAt, isRetryLimitReached } = entry.failure;
        const time = formatDayTime(retryAt, now, t);
        lines.push(
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Line, { title: cause.message, children: t(isRetryLimitReached ? "checkup.result.autoFailed.next" : "checkup.result.autoFailed.retry", { cause: causeText(cause, t), time }) }, "auto-failed")
        );
      }
      if (entry?.modelUnavailable != null && entry.frequency !== "manual") {
        lines.push(
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Line, { title: entry.modelUnavailable.message, children: t("checkup.result.modelUnavailable", { cause: causeText(entry.modelUnavailable, t) }) }, "model")
        );
      }
      const last = entry?.lastResult ?? null;
      if (last !== null && !isResultSeen(seen, last.checkupId, key)) {
        shown.current.push({ checkupId: last.checkupId, scope: key });
        lines.push(...resultLines(last, key));
      }
    }
  }
  function resultLines(result, lineKey) {
    const parts = [];
    if (result.added.pending > 0) parts.push(link(t("checkup.result.newTodo", { n: formatNumber(result.added.pending) }), () => {
      jump("todo");
    }));
    if (result.added.advice > 0) parts.push(link(t("checkup.result.newAdvice", { n: formatNumber(result.added.advice) }), () => {
      jump("advice");
    }));
    const globalN = (result.globalAdded?.pending ?? 0) + (result.globalAdded?.advice ?? 0);
    if (globalN > 0) parts.push(link(t("checkup.result.newGlobal", { n: formatNumber(globalN) }), () => {
      jump("any", { kind: "global" });
    }));
    const head = /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(Line, { children: [
      t(result.by === "auto" ? "checkup.result.autoDone" : "checkup.result.done"),
      parts.length === 0 ? t("checkup.result.nothingNew") : joined(parts),
      result.usageTokens !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("span", { className: "pm-status-usage", children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Sep, {}),
        t("checkup.result.usage", { n: formatNumber(result.usageTokens) })
      ] }) : null
    ] }, `${lineKey}:head`);
    const notes = result.notes.filter((n, i) => result.notes.findIndex((m) => m.code === n.code) === i).flatMap(({ code, cause }) => {
      const text = code === "semantic-failed" ? cause === void 0 ? t("checkup.result.note.semanticFailed.bare") : t("checkup.result.note.semanticFailed", { cause: causeText(cause, t) }) : code === "model-unavailable" ? cause === void 0 ? t("checkup.result.note.modelUnavailable.bare") : t("checkup.result.note.modelUnavailable", { cause: causeText(cause, t) }) : code === "semantic-batched" ? t("checkup.result.note.semanticBatched") : code === "baseline-missing" ? t("checkup.result.note.baselineMissing") : code === "baseline-truncated" ? t("checkup.result.note.baselineTruncated") : void 0;
      return text === void 0 ? [] : [/* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Line, { title: cause?.message, children: text }, `${lineKey}:${code}`)];
    });
    return [head, ...notes];
  }
  useHeightTransition(box, lines.map((line) => (0, import_react16.isValidElement)(line) ? line.key : "").join("|"));
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { ref: box, className: "pm-status-result", "aria-live": "polite", children: lines });
}
var statusBarCss = `
.pm-status { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; border-radius: var(--dsw-radius-lg, 16px); background: var(--pm-bg-block); }
.pm-status-line { display: flex; align-items: center; flex-wrap: wrap; margin: 0; font-size: 14px; font-weight: 600; line-height: 1.5; color: var(--pm-text); }
.pm-status-mark { display: inline-flex; justify-content: center; width: 14px; margin-right: 8px; }
.pm-status-soft { font-weight: 400; }
.pm-status-meta, .pm-status-deductions, .pm-status-result { margin: 0; padding-left: 22px; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-status-why {
  display: inline-flex; align-items: center; gap: 2px; padding: 0; border: 0; background: none;
  font: inherit; color: var(--pm-text-2); cursor: pointer;
}
.pm-status-why:hover { color: var(--pm-text); }
.pm-status-why svg { transition: transform 120ms ease; }
.pm-status-why[aria-expanded='true'] svg { transform: rotate(180deg); }
@media (prefers-reduced-motion: reduce) { .pm-status-why svg { transition: none; } }
.pm-status--plain :is(.pm-status-meta, .pm-status-result) { padding-left: 0; }
.pm-status-deductions { list-style: none; display: flex; flex-direction: column; gap: 2px; margin-left: 22px; padding: 6px 0 0; border-top: .5px solid var(--pm-line); }
.pm-status-result { display: flex; flex-direction: column; gap: 2px; color: var(--pm-text); }
/* \u7ED3\u679C\u884C\u4E00\u76F4\u5728 DOM \u91CC\uFF08aria-live \u8981\u5148\u5728\u573A\uFF09\uFF0C\u7A7A\u7740\u65F6\u4E0D\u5360\u72B6\u6001\u6761\u7684\u884C\u8DDD */
.pm-status-result:empty { margin-top: -6px; }
.pm-status-result-line { margin: 0; }
.pm-status-result[data-live] .pm-status-result-line { transition: opacity 200ms ease-out; }
@starting-style { .pm-status-result[data-live] .pm-status-result-line { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .pm-status-result[data-live] .pm-status-result-line { transition: none; } }
.pm-status-soft-line { color: var(--pm-text-2); }
.pm-status-result .pm-link { font-size: 12px; }
.pm-status-usage { white-space: nowrap; }
`;

// client/composer/MemoryButton.tsx
var import_react18 = require("react");
var import_react_dom = require("react-dom");

// client/MemoryIcon.tsx
var import_react17 = require("react");
var import_jsx_runtime15 = require("react/jsx-runtime");
var DOT = { cx: 20.4, cy: 3.6, r: 4.4, holeR: 6.4 };
var TRIANGLE = "M20.5 -1.2L26.2 8.6H14.8Z";
function MemoryIcon({ size, marker }) {
  const maskId = `pm-nav-mask-${(0, import_react17.useId)().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const lines = /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(import_jsx_runtime15.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("path", { d: "M12 13.2C9.5 12.6 4.6 11.2 3 7c2.8.1 6.2.8 8.1 1.6L12 9.8l.9-1.2c1.9-.8 5.3-1.5 8.1-1.6-1.6 4.2-6.5 5.6-9 6.2z", transform: "translate(0 -1.2)" }),
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("path", { d: "M12 12v4.3" }),
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("path", { d: "M3.5 18.3c1.5 0 1.5-1.1 2.9-1.1s1.4 1.1 2.8 1.1 1.4-1.1 2.8-1.1 1.4 1.1 2.8 1.1 1.4-1.1 2.8-1.1 1.4 1.1 2.9 1.1" })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.6,
      strokeLinejoin: "round",
      strokeLinecap: "round",
      "aria-hidden": "true",
      style: { display: "block", overflow: "visible" },
      ...marker !== void 0 ? { "data-marker": marker } : {},
      children: marker === void 0 ? lines : /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(import_jsx_runtime15.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("mask", { id: maskId, maskUnits: "userSpaceOnUse", x: "-4", y: "-4", width: "32", height: "32", children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("rect", { x: "-4", y: "-4", width: "32", height: "32", fill: "#fff", stroke: "none" }),
          marker === "pending" ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("circle", { cx: DOT.cx, cy: DOT.cy, r: DOT.holeR, fill: "#000", stroke: "none" }) : /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("path", { d: TRIANGLE, fill: "#000", stroke: "#000", strokeWidth: 3.6 })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("g", { mask: `url(#${maskId})`, children: lines }),
        marker === "pending" ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("circle", { "data-pm-nav-mark": "dot", cx: DOT.cx, cy: DOT.cy, r: DOT.r, fill: "var(--dsw-alias-state-warn-primary, #F59E0B)", stroke: "none" }) : /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
          "path",
          {
            "data-pm-nav-mark": "secret",
            d: TRIANGLE,
            fill: "var(--dsw-alias-state-error-primary, #EF4444)",
            stroke: "var(--dsw-alias-state-error-primary, #EF4444)",
            strokeWidth: 1
          }
        )
      ] })
    }
  );
}

// client/sidebar/session-memories.ts
function sessionCards(library, ws) {
  const byId = /* @__PURE__ */ new Map();
  let globalCount = 0;
  let projectCount = 0;
  for (const { layer: scope, items } of library.layers) {
    const isOwn = ws !== void 0 && sameScope(scope, { kind: "workspace", workspacePath: ws });
    if (scope.kind === "global") globalCount += items.length;
    else if (isOwn) projectCount += items.length;
    if (scope.kind !== "global" && !isOwn) continue;
    for (const item of items) {
      const current = byId.get(item.id);
      if (current === void 0 || item.updatedAt > current.updatedAt || item.updatedAt === current.updatedAt && isOwn) byId.set(item.id, item);
    }
  }
  return { byId, globalCount, projectCount };
}
function writtenSinceSnapshot(view) {
  const injected = new Set(view.injectedIds);
  return view.savedIds.filter((id) => !injected.has(id));
}
function isLiveWrite(id, byId, deletions) {
  if (byId === void 0) return deletions.of(id) === void 0;
  const memory = byId.get(id);
  return memory !== void 0 && deletions.of(id, scopeOfMemory(memory)) === void 0;
}

// client/ui/ContextBudgetBar.tsx
var import_jsx_runtime16 = require("react/jsx-runtime");
var BUDGET_PART_KEYS = ["workspace", "global", "headings", "uncounted"];
function budgetParts({ tokens, usedTokens }) {
  const { workspace, global, fixed } = tokens;
  const headings = Math.min(Math.max(usedTokens - workspace - global, 0), fixed);
  return { total: workspace + global + fixed, counted: usedTokens, workspace, global, headings, uncounted: fixed - headings };
}
function capFor(total, budget) {
  return relaxedCap(budget, relaxedTier(total, budget));
}
function barScale(used, limited, budget) {
  return Math.max(capFor(limited, budget), used, 1);
}
function BudgetSegments({ parts, scale }) {
  const pct = (n) => `${n / scale * 100}%`;
  const fixed = parts.headings + parts.uncounted;
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
    parts.workspace > 0 ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("i", { className: "pm-budget-seg pm-budget-tint--workspace", style: { width: pct(parts.workspace) } }) : null,
    parts.global > 0 ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("i", { className: "pm-budget-seg pm-budget-tint--global", style: { width: pct(parts.global) } }) : null,
    fixed > 0 ? /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("i", { className: "pm-budget-seg pm-budget-seg--fixed", style: { width: pct(fixed) }, children: [
      parts.headings > 0 ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("i", { className: "pm-budget-tint--headings", style: { flexGrow: parts.headings } }) : null,
      parts.uncounted > 0 ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("i", { className: "pm-budget-tint--uncounted", style: { flexGrow: parts.uncounted } }) : null
    ] }) : null
  ] });
}
function BudgetSwatch({ part }) {
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("i", { className: `pm-budget-swatch pm-budget-tint--${part}`, "aria-hidden": "true" });
}
function shownParts(parts) {
  return BUDGET_PART_KEYS.filter((key) => key === "workspace" || key === "global" || parts[key] > 0);
}
function ContextBudgetBar({ count, budget, tokens, usedTokens, droppedCount = 0, onHandle }) {
  const t = useT();
  const parts = budgetParts({ tokens, usedTokens });
  const cap = capFor(parts.counted, budget);
  const scale = barScale(parts.total, parts.counted, budget);
  const relaxed = parts.counted > budget && droppedCount === 0;
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "pm-budget", children: [
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { className: "pm-budget-summary", children: t(count === 1 ? "budget.summary.one" : "budget.summary", { count: formatNumber(count), used: formatNumber(parts.counted), budget: formatNumber(budget) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
      "div",
      {
        className: "pm-budget-bar",
        role: "img",
        "aria-label": t(parts.headings > 0 ? "budget.aria" : "budget.ariaNoHeadings", {
          percent: Math.round(parts.counted / Math.max(budget, 1) * 100),
          workspace: formatNumber(parts.workspace),
          global: formatNumber(parts.global),
          headings: formatNumber(parts.headings),
          uncounted: formatNumber(parts.uncounted)
        }),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(BudgetSegments, { parts, scale }),
          relaxed ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("b", { className: "pm-budget-limit", style: { left: `${budget / scale * 100}%` } }) : null
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "pm-budget-legend", children: [
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { className: "pm-budget-keys", children: shownParts(parts).map((key) => /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { className: "pm-budget-key", children: [
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(BudgetSwatch, { part: key }),
        t(key === "uncounted" ? "budget.keyUncounted" : "budget.key", { name: t(`budget.part.${key}`), n: formatNumber(parts[key]) })
      ] }, key)) }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { className: "pm-budget-status", children: droppedCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
        t("budget.truncated", { n: formatNumber(droppedCount) }),
        onHandle !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("i", { className: "pm-sep", "aria-hidden": "true", children: "\xB7" }),
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("button", { type: "button", className: "pm-link", onClick: onHandle, children: t("budget.handle") })
        ] }) : null
      ] }) : relaxed ? t("budget.relaxed", { cap: formatNumber(cap) }) : t("budget.allIn") })
    ] })
  ] });
}
var contextBudgetBarCss = `
.pm-budget { display: flex; flex-direction: column; gap: 6px; }
.pm-budget-summary { align-self: flex-end; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-budget-bar { position: relative; display: flex; gap: 2px; height: 6px; border-radius: 6px; background: var(--pm-track); overflow: hidden; }
.pm-budget-seg { display: block; height: 100%; }
.pm-budget-seg--fixed { display: flex; }
.pm-budget-seg--fixed > i { display: block; flex-basis: 0; min-width: 0; }
.pm-budget-tint--workspace { background: var(--pm-accent); }
.pm-budget-tint--global { background: var(--pm-accent-soft); }
.pm-budget-tint--headings { background: var(--pm-caption); }
/* \u4E0D\u8BA1\u4E0A\u9650\uFF1Acaption \u7070\u659C\u7EB9\uFF0C\u7A7A\u9699\u900F\u51FA\u5E95\u8F68\uFF08\u8272\u5757\u91CC\u900F\u51FA\u9762\u677F\u5E95\uFF09 */
.pm-budget-tint--uncounted { background: repeating-linear-gradient(-45deg, var(--pm-caption) 0 1.5px, transparent 1.5px 3.5px); }
.pm-budget-limit { position: absolute; top: 0; bottom: 0; width: 1px; margin-left: -.5px; background: var(--pm-text); }
/* \u56FE\u4F8B\u9879\u548C\u72B6\u6001\u540C\u6392\u6362\u884C\uFF1A\u7A84\u680F\u91CC\u56DB\u9879\u6392\u4E0D\u4E0B\u65F6\u72B6\u6001\u8DDF\u5728\u6700\u540E\u4E00\u884C\uFF0C\u4ECD\u9760\u53F3 */
.pm-budget-legend { display: flex; flex-wrap: wrap; gap: 2px 12px; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-budget-keys { display: contents; }
.pm-budget-status { margin-left: auto; }
.pm-budget-key { display: inline-flex; align-items: center; white-space: nowrap; font-variant-numeric: tabular-nums; }
.pm-budget-swatch { display: inline-block; flex: none; width: 8px; height: 8px; margin-right: 6px; border-radius: 2px; }
.pm-budget-swatch.pm-budget-tint--uncounted { outline: .5px solid var(--pm-caption); outline-offset: -.5px; }
`;

// client/composer/MemoryButton.tsx
var import_jsx_runtime17 = require("react/jsx-runtime");
var COUNTS_LINE = {
  start: "composer.counts",
  resumed: "composer.countsResumed",
  compacted: "composer.countsCompacted",
  refreshed: "composer.countsRefreshed"
};
var READING_SLOT = "\0";
var PANEL_WIDTH = 264;
var EDGE2 = 12;
function memoryShare(used, pressure) {
  const window2 = pressure?.contextWindow;
  if (window2 === void 0 || window2 <= 0) return null;
  const ratio = used / window2 * 100;
  if (ratio > 0 && ratio < 1) return "<1%";
  return `${Math.min(100, Math.round(ratio))}%`;
}
function hasSessionMemory(view) {
  return view !== void 0 && (view.injectedIds.length > 0 || view.savedIds.length > 0);
}
function MemoryButton({ sessionId, useProjection, onOpenTab, onHandle }) {
  const t = useT();
  const gateway = useGateway();
  const accent = gateway.useConfig()?.accent;
  const session = (0, import_react18.useMemo)(() => ({ kind: "ready", sessionId, cwd: void 0 }), [sessionId]);
  const state = gateway.useView(session, "session");
  const library = gateway.useView(session, "library");
  const deletions = gateway.useDeletions();
  const pressure = useProjection("contextPressure");
  const view = state.status === "ready" ? state.data : void 0;
  const visible = hasSessionMemory(view);
  const [position, setPosition] = (0, import_react18.useState)(null);
  const rootRef = (0, import_react18.useRef)(null);
  const panelRef = (0, import_react18.useRef)(null);
  const triggerRef = (0, import_react18.useRef)(null);
  const open = position !== null && visible;
  const close = (isFocusReturned = false) => {
    setPosition(null);
    if (isFocusReturned) triggerRef.current?.focus();
  };
  (0, import_react18.useLayoutEffect)(() => {
    if (!open) return;
    const panel = panelRef.current;
    (panel?.querySelector("button") ?? panel)?.focus();
  }, [open]);
  (0, import_react18.useEffect)(() => {
    if (!open) return;
    const isOutside = (target) => !(rootRef.current?.contains(target) || panelRef.current?.contains(target));
    const onPointer = (e) => {
      if (isOutside(e.target)) setPosition(null);
    };
    const onFocusIn = (e) => {
      if (isOutside(e.target)) setPosition(null);
    };
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const isInside = panelRef.current?.contains(document.activeElement) ?? false;
      setPosition(null);
      if (isInside) triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open]);
  if (!visible) return null;
  const toggle = () => {
    if (open) {
      close();
      return;
    }
    const rect = rootRef.current.getBoundingClientRect();
    const width = Math.min(PANEL_WIDTH, window.innerWidth - EDGE2 * 2);
    const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, EDGE2), window.innerWidth - width - EDGE2);
    setPosition({ left, bottom: window.innerHeight - rect.top + 8, width });
  };
  const byId = library.status === "ready" ? sessionCards(library.data, view.workspacePath).byId : void 0;
  const parts = budgetParts(view);
  const share = memoryShare(parts.total, pressure);
  const [headBefore = "", headAfter = ""] = t("composer.share", { percent: READING_SLOT }).split(READING_SLOT).map((s) => s.trim());
  const scale = barScale(parts.total, parts.counted, view.budget);
  const overflow = view.overflowMode === "strict" ? view.omittedCount > 0 ? t("composer.truncated", { n: formatNumber(view.omittedCount) }) : null : view.usedTokens > view.budget ? t("composer.relaxed", {
    over: formatNumber(view.usedTokens - view.budget),
    cap: formatNumber(capFor(view.usedTokens, view.budget))
  }) : null;
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("span", { ref: rootRef, className: "pm-composer", children: [
    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
      "button",
      {
        ref: triggerRef,
        type: "button",
        className: "pm-composer-trigger",
        "aria-label": t("composer.button"),
        title: t("composer.button"),
        "aria-haspopup": "dialog",
        "aria-expanded": open,
        onClick: toggle,
        children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(MemoryIcon, { size: 14 })
      }
    ),
    open && (0, import_react_dom.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { ref: panelRef, className: "pm-root pm-composer-panel", style: position, role: "dialog", "aria-label": t("composer.dialog"), "data-pm-accent": accent, tabIndex: -1, children: [
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "pm-composer-header", children: [
          share === null ? null : /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { className: "pm-composer-headline", children: headBefore }),
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { className: "pm-composer-percent", children: share }),
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { className: "pm-composer-headline", children: headAfter })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { className: "pm-composer-figures", children: t("composer.figures", { used: formatNumber(parts.counted), budget: formatNumber(view.budget) }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "pm-composer-bar", children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(BudgetSegments, { parts, scale }) }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("dl", { className: "pm-composer-rows", children: shownParts(parts).map((key) => /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "pm-composer-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("dt", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(BudgetSwatch, { part: key }),
            key === "uncounted" ? t("budget.nameUncounted", { name: t(`budget.part.${key}`) }) : t(`budget.part.${key}`)
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("dd", { children: t("composer.approx", { n: formatNumber(parts[key]) }) })
        ] }, key)) }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "pm-composer-line", children: t(COUNTS_LINE[view.origin], {
          injected: formatNumber(view.injectedIds.length),
          saved: formatNumber(writtenSinceSnapshot(view).filter((id) => isLiveWrite(id, byId, deletions)).length)
        }) }),
        overflow === null ? null : /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "pm-composer-line", children: [
          overflow,
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("i", { className: "pm-sep", "aria-hidden": "true", children: "\xB7" }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("button", { type: "button", className: "pm-link", onClick: () => {
            close(true);
            onHandle();
          }, children: t("composer.handle") })
        ] }),
        onOpenTab === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("button", { type: "button", className: "pm-link pm-composer-open", onClick: () => {
          close(true);
          onOpenTab();
        }, children: t("composer.viewInjected") })
      ] }),
      document.body
    )
  ] });
}
var memoryButtonCss = `
.pm-composer-root { display: contents; }
.pm-composer { display: inline-flex; flex: none; }
.pm-composer-trigger {
  display: inline-flex; align-items: center; flex: none; padding: 1px 8px; border: none;
  border-radius: var(--dsw-radius-sm); background: transparent; color: var(--pm-text-3);
  /* \u5BBF\u4E3B trigger \u9760 20px \u884C\u9AD8\u7684\u8BFB\u6570\u6491\u5230 22px\uFF1B\u8FD9\u91CC\u53EA\u6709\u56FE\u6807\uFF0C\u76F4\u63A5\u7ED9\u540C\u6837\u7684\u9AD8\u5EA6\uFF0C\u548C\u7528\u91CF\u6309\u94AE\u5BF9\u9F50 */
  height: calc(22px + var(--dsh-content-font-delta-secondary, 0px));
  cursor: pointer;
}
.pm-composer-trigger:hover, .pm-composer-trigger[aria-expanded='true'] { background: var(--pm-hover); color: var(--pm-text-2); }
.pm-composer-panel {
  position: fixed; z-index: 1100; padding: 12px; border-radius: var(--dsw-radius-lg);
  background: var(--dsw-specific-menu); backdrop-filter: var(--dsw-menu-backdrop-filter);
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l1); box-shadow: var(--dsw-elevation-prominent);
  font-size: 12px; line-height: 20px; color: var(--pm-text-2); cursor: default; outline: none;
}
.pm-composer-header { display: flex; align-items: center; gap: 6px; }
.pm-composer-headline { color: var(--pm-text-3); }
.pm-composer-headline:empty { display: none; }
.pm-composer-percent { font-weight: 500; color: var(--pm-text); }
.pm-composer-figures { margin-left: auto; font-weight: 500; font-variant-numeric: tabular-nums; color: var(--pm-text); }
.pm-composer-bar { display: flex; gap: 1px; margin: 10px 0 12px; height: 4px; border-radius: 999px; background: var(--pm-track); overflow: hidden; }
.pm-composer-bar > .pm-budget-seg { flex: none; min-width: 2px; border-radius: 1px; }
.pm-composer-rows { margin: 6px 0 0; }
.pm-composer-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 2px 0; }
.pm-composer-row dt { display: flex; align-items: center; color: var(--pm-text-2); }
.pm-composer-row dd { margin: 0; font-variant-numeric: tabular-nums; color: var(--pm-text); }
.pm-composer-line { margin-top: 6px; }
.pm-composer-open { display: block; margin-top: 8px; }
`;

// client/deleted/DeletedTab.tsx
var import_react21 = require("react");

// client/ui/EmptyState.tsx
var import_react19 = require("react");
var import_jsx_runtime18 = require("react/jsx-runtime");
function EmptyState({ variant, title, children }) {
  const [play, setPlay] = (0, import_react19.useState)(0);
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: `pm-empty pm-empty--${variant}`, role: "status", children: [
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "pm-empty-icon", onMouseEnter: variant === "first" ? () => {
      setPlay((n) => n + 1);
    } : void 0, children: variant === "first" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(WhaleTail, {}, play) : /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(MemoryIcon, { size: 20 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "pm-empty-title", children: title }),
    children !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "pm-empty-body", children }) : null
  ] });
}
function WhaleTail() {
  const clip = (0, import_react19.useId)();
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
    "svg",
    {
      className: "pm-whale",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.6,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("clipPath", { id: clip, children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("rect", { x: "0", y: "0", width: "24", height: "18.6" }) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("g", { clipPath: `url(#${clip})`, children: /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("g", { className: "pm-whale-tail", children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: "M12 19.5v-6.6" }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: "M12 12.9C10.6 10.4 8.2 8.9 4.6 8.4c.5 2.7 3 4.6 7.4 4.5Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: "M12 12.9c1.4-2.5 3.8-4 7.4-4.5-.5 2.7-3 4.6-7.4 4.5Z" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: "M2.5 19.6c1.1 0 1.7-.8 2.8-.8s1.7.8 2.8.8" }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("path", { d: "M15.9 19.6c1.1 0 1.7-.8 2.8-.8s1.7.8 2.8.8" }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("ellipse", { className: "pm-whale-ripple pm-whale-ripple--1", cx: "12", cy: "19.4", rx: "4", ry: ".9", strokeWidth: 1 }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("ellipse", { className: "pm-whale-ripple pm-whale-ripple--2", cx: "12", cy: "19.4", rx: "6", ry: "1.3", strokeWidth: 1 }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("circle", { className: "pm-whale-drip pm-whale-drip--1", cx: "5.2", cy: "9.4", r: ".5", fill: "currentColor", stroke: "none" }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("circle", { className: "pm-whale-drip pm-whale-drip--2", cx: "12", cy: "13.4", r: ".5", fill: "currentColor", stroke: "none" }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("circle", { className: "pm-whale-drip pm-whale-drip--3", cx: "18.8", cy: "9.4", r: ".5", fill: "currentColor", stroke: "none" })
      ]
    }
  );
}
var emptyStateCss = `
.pm-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px 16px; text-align: center; }
.pm-empty-icon {
  display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px;
  border-radius: var(--dsw-radius-md, 12px); background: var(--pm-bg-block); color: var(--pm-text-2);
}
.pm-empty--first .pm-empty-icon { background: var(--pm-accent-tint); color: var(--pm-accent); }
.pm-empty-title { margin: 4px 0 0; font-size: 14px; font-weight: 600; line-height: 1.5; color: var(--pm-text); }
.pm-empty-body { margin: 0; max-width: 420px; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }

.pm-whale { overflow: visible; }
.pm-whale-tail { transform-box: view-box; transform-origin: 12px 19px; animation: pm-whale-rise 2s cubic-bezier(.22,.8,.24,1) both; }
.pm-whale-ripple { transform-box: fill-box; transform-origin: center; opacity: 0; animation: pm-whale-ripple 1.5s ease-out both; }
.pm-whale-ripple--1 { animation-delay: .4s; }
.pm-whale-ripple--2 { animation-delay: .75s; }
.pm-whale-drip { opacity: 0; animation: pm-whale-drip .8s cubic-bezier(.55,0,1,.45) both; }
.pm-whale-drip--1 { animation-delay: 1.15s; }
.pm-whale-drip--2 { animation-delay: 1.3s; }
.pm-whale-drip--3 { animation-delay: 1.45s; }
@keyframes pm-whale-rise {
  0% { transform: translateY(9px) rotate(0deg); }
  42% { transform: translateY(0) rotate(0deg); }
  62% { transform: translateY(0) rotate(-8deg); }
  80% { transform: translateY(0) rotate(5deg); }
  100% { transform: translateY(0) rotate(0deg); }
}
@keyframes pm-whale-ripple { 0% { transform: scale(.3); opacity: 0; } 20% { opacity: .9; } 100% { transform: scale(1.4); opacity: 0; } }
@keyframes pm-whale-drip { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(6px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .pm-whale-tail, .pm-whale-ripple, .pm-whale-drip { animation: none; }
}
`;

// client/library/groups.tsx
var import_react20 = require("react");
var import_jsx_runtime19 = require("react/jsx-runtime");
var GROUP_PREVIEW = 3;
var HOUR_MS = 60 * 60 * 1e3;
var DAY_MS = 24 * HOUR_MS;
var RECENT_BUCKETS = ["day", "days3", "week", "older"];
var RECENT_WITHIN_MS = { day: 24 * HOUR_MS, days3: 72 * HOUR_MS, week: 168 * HOUR_MS };
function recentBucketOf(updatedAt, now) {
  const age = now - updatedAt;
  return age < RECENT_WITHIN_MS.day ? "day" : age < RECENT_WITHIN_MS.days3 ? "days3" : age < RECENT_WITHIN_MS.week ? "week" : "older";
}
var DELETED_BUCKETS = ["today", "week", "older"];
function deletedBucketOf(deletedAt, now) {
  const startOfDay = (ms) => new Date(ms).setHours(0, 0, 0, 0);
  const days = Math.round((startOfDay(now) - startOfDay(deletedAt)) / DAY_MS);
  return days <= 0 ? "today" : days < 7 ? "week" : "older";
}
function bucketize(items, keys, keyOf) {
  return keys.map((key) => ({ key, items: items.filter((item) => keyOf(item) === key) })).filter((b) => b.items.length > 0);
}
function groupByType(items, order, label) {
  const groups = /* @__PURE__ */ new Map();
  for (const memory of items) groups.set(memory.type, [...groups.get(memory.type) ?? [], memory]);
  const rank = (type) => {
    const i = order?.indexOf(type) ?? -1;
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...groups.entries()].map(([type, list2]) => ({ type, items: list2.sort((a, b) => b.updatedAt - a.updatedAt) })).sort((a, b) => rank(a.type) - rank(b.type) || label(a.type).localeCompare(label(b.type)) || (a.type < b.type ? -1 : 1));
}
function useFold(memory, prefix, isSearching) {
  const [own] = (0, import_react20.useState)(() => /* @__PURE__ */ new Map());
  const [, rerender] = (0, import_react20.useReducer)((n) => n + 1, 0);
  const searchFold = (0, import_react20.useRef)(/* @__PURE__ */ new Map());
  (0, import_react20.useEffect)(() => {
    if (!isSearching) searchFold.current.clear();
  }, [isSearching]);
  const store = memory ?? own;
  const at2 = (key) => `${prefix}|${key}`;
  const remember = (key, entry) => {
    store.set(at2(key), { ...store.get(at2(key)), ...entry });
    rerender();
  };
  return {
    isOpen: (key, byDefault) => isSearching ? searchFold.current.get(key) ?? true : store.get(at2(key))?.isOpen ?? byDefault,
    isFull: (key) => isSearching || store.get(at2(key))?.isFull === true,
    toggle(key, isOpenNow) {
      if (!isSearching) return remember(key, { isOpen: !isOpenNow });
      searchFold.current.set(key, !isOpenNow);
      rerender();
    },
    remember
  };
}
function MemoryGroup({ title, count, latest, now, isOpen, onToggle, hidden = 0, onMore, onLess, children }) {
  const t = useT();
  const bodyId = (0, import_react20.useId)();
  const head = (0, import_react20.useRef)(null);
  const list2 = (0, import_react20.useRef)(null);
  const isClicked = (0, import_react20.useRef)(false);
  const focusAfter = (0, import_react20.useRef)(void 0);
  (0, import_react20.useLayoutEffect)(() => {
    const to = focusAfter.current;
    focusAfter.current = void 0;
    if (to === "less") {
      head.current?.scrollIntoView?.({ block: "nearest" });
      head.current?.focus({ preventScroll: true });
    } else if (to === "more") {
      const row = list2.current?.children.item(GROUP_PREVIEW);
      if (!(row instanceof HTMLElement)) return;
      if (!row.hasAttribute("tabindex")) {
        row.tabIndex = -1;
        row.addEventListener("blur", () => {
          row.removeAttribute("tabindex");
        }, { once: true });
      }
      row.focus();
    }
  });
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("section", { className: "pm-memgroup", children: [
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("h3", { className: "pm-memgroup-heading", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
      "button",
      {
        ref: head,
        type: "button",
        className: "pm-memgroup-toggle",
        "aria-expanded": isOpen,
        "aria-controls": bodyId,
        onClick: () => {
          isClicked.current = !isOpen;
          onToggle();
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(Icon, { name: "chevronRight", size: 14 }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "pm-memgroup-title", children: title }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "pm-memgroup-count", children: formatNumber(count) }),
          !isOpen && latest !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "pm-memgroup-latest", children: t("library.group.latest", { date: formatDay(latest, now, t) }) }) : null
        ]
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { id: bodyId, className: "pm-memgroup-body", hidden: !isOpen, children: isOpen ? /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(GroupBody, { clicked: isClicked, children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("ul", { ref: list2, className: "pm-list", children }),
      hidden > 0 && onMore !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("button", { type: "button", className: "pm-memgroup-more", onClick: () => {
        focusAfter.current = "more";
        onMore();
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(Icon, { name: "chevronDown", size: 12 }),
        t("library.group.more", { n: formatNumber(hidden) })
      ] }) : onLess !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("button", { type: "button", className: "pm-memgroup-more", onClick: () => {
        focusAfter.current = "less";
        onLess();
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(Icon, { name: "chevronUp", size: 12 }),
        t("library.group.less", { n: formatNumber(GROUP_PREVIEW) })
      ] }) : null
    ] }) : null })
  ] });
}
function GroupBody({ clicked, children }) {
  const [isArriving] = (0, import_react20.useState)(() => clicked.current);
  (0, import_react20.useEffect)(() => {
    clicked.current = false;
  }, []);
  if (!isArriving) return children;
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "pm-arrive", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "pm-arrive-body", children }) });
}
var groupsCss = `
.pm-memgroups { display: flex; flex-direction: column; gap: 4px; }
.pm-memgroup { display: flex; flex-direction: column; }
.pm-memgroup + .pm-memgroup { padding-top: 4px; border-top: .5px solid var(--pm-line); }
.pm-memgroup-heading { margin: 0; font-size: 13px; line-height: 1.5; }
.pm-memgroup-toggle {
  width: 100%; min-height: 36px; display: flex; align-items: center; gap: 6px; padding: 0 12px 0 10px; border: 0; border-radius: 10px;
  background: transparent; font: inherit; color: var(--pm-text); text-align: left; cursor: pointer;
}
.pm-memgroup-toggle:hover { background: var(--pm-hover); }
.pm-memgroup-toggle svg { flex: none; color: var(--pm-text-2); transition: transform 120ms ease; }
.pm-memgroup-toggle[aria-expanded='true'] svg { transform: rotate(90deg); }
.pm-memgroup-title { min-width: 0; font-weight: 600; overflow-wrap: anywhere; }
.pm-memgroup-count { font-weight: 400; color: var(--pm-text-2); }
.pm-memgroup-latest { margin-left: auto; padding-left: 12px; font-size: 12px; color: var(--pm-text-2); white-space: nowrap; }
.pm-memgroup-body, .pm-memgroup-body .pm-arrive-body { display: flex; flex-direction: column; }
.pm-memgroup-body[hidden] { display: none; }
.pm-memgroup-more {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 4px; margin: 0 0 4px; padding: 4px 16px 4px 30px;
  border: 0; background: none; font: inherit; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); cursor: pointer;
}
.pm-memgroup-more:hover { color: var(--pm-text); }
@media (prefers-reduced-motion: reduce) {
  .pm-memgroup-toggle svg { transition: none; }
}
`;

// client/deleted/DeletedTab.tsx
var import_jsx_runtime20 = require("react/jsx-runtime");
var DAY_MS2 = 24 * 60 * 60 * 1e3;
function inScope(item, scope) {
  const own = scopeOfMemory(item.memory);
  return isInScope(own === void 0 ? [] : [own], scope);
}
function causeLabel(cause, names, t) {
  if (cause.baselineRef !== void 0) return t("deleted.cause.baseline");
  if (cause.counterpartId !== void 0) return t(cause.verdict === "plan-applied" ? "deleted.cause.merged" : "deleted.cause.keep", { name: counterpartName(cause, names) });
  return t(cause.verdict === "keep-left" ? "deleted.cause.keepA" : "deleted.cause.keepB");
}
var counterpartName = (cause, names) => cause.counterpartId === void 0 ? "" : names.get(cause.counterpartId) ?? cause.counterpartId;
function restoreHint(cause, names, t) {
  return cause.verdict === "plan-applied" ? t("deleted.restoreHintMerged", { name: counterpartName(cause, names) }) : t("deleted.restoreHint");
}
function memoryNames(library, deleted) {
  const names = /* @__PURE__ */ new Map();
  for (const { memory } of deleted.items) names.set(memory.id, memory.name);
  for (const group of library?.layers ?? []) for (const memory of group.items) names.set(memory.id, memory.name);
  return names;
}
function leftLabel(purgeAt, now, t) {
  const left = (purgeAt - now) / DAY_MS2;
  if (left < 1) return t("deleted.left.today");
  const days = Math.ceil(left);
  return t(days === 1 ? "deleted.left.days.one" : "deleted.left.days", { n: days });
}
function DeletedTab({ nav, scope, session, fold, now = Date.now() }) {
  const t = useT();
  const gateway = useGateway();
  const view = gateway.useView(session, "deleted");
  const library = gateway.useView(session, "library");
  const [query, setQuery] = (0, import_react21.useState)("");
  const scopeItems = view.status === "ready" ? view.data.items.filter((item) => inScope(item, scope)) : [];
  const items = scopeItems.filter((item) => matchesQuery(item.memory, query));
  const { flashId, revealId, clear } = useFlashTarget(nav, items.map((item) => item.memory.id));
  const actions = useRowActions(session);
  const typeLabel2 = useTypeLabel(session);
  const [confirming, setConfirming] = (0, import_react21.useState)(void 0);
  const isSearching = query.trim() !== "";
  const folds = useFold(fold, `deleted|${checkupKey(scope)}`, isSearching);
  if (view.status !== "ready") return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(ViewMessage, { state: view, idle: null });
  const names = memoryNames(library.status === "ready" ? library.data : void 0, view.data);
  const endFlash = () => {
    const target = items.find((item) => item.memory.id === flashId);
    if (target !== void 0) folds.remember(deletedBucketOf(target.deletedAt, now), { isOpen: true });
    clear();
  };
  const row = ({ memory, deletedAt, purgeAt, cause }) => {
    const meta = [cause !== void 0 ? causeLabel(cause, names, t) : t("deleted.label"), formatDay(deletedAt, now, t)];
    const unavailable = actions.unavailable(memory.id) ?? (confirming === memory.id ? t("pending.awaitingConfirm") : void 0);
    return /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(FlashRow, { className: "pm-list-row", flashing: flashId === memory.id, onFlashEnd: endFlash, children: [
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "pm-del-body", children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
          MemoryCard,
          {
            memory,
            now,
            typeLabel: typeLabel2(memory.type),
            hideScope: scope.kind !== "all",
            projectName: memory.workspacePath === void 0 ? void 0 : baseName(memory.workspacePath),
            collapsible: !isSearching
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { className: "pm-del-meta", children: meta.map((text, i) => /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(import_react21.Fragment, { children: [
          i > 0 ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("i", { className: "pm-sep", "aria-hidden": "true", children: "\xB7" }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { children: text })
        ] }, i)) }),
        cause !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { className: "pm-del-hint", children: restoreHint(cause, names, t) }) : null,
        actions.feedback(memory.id),
        confirming === memory.id ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
          SecretDeleteConfirm,
          {
            showTitle: false,
            body: t("deleted.hardDeleteConfirm"),
            onCancel: () => {
              setConfirming(void 0);
            },
            onConfirm: () => {
              setConfirming(void 0);
              actions.run(memory.id, { cmd: "hard-delete", memoryId: memory.id, layer: scopeOfMemory(memory) }, () => t("deleted.hardDeleted"));
            }
          }
        ) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "pm-row-actions pm-del-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { className: "pm-del-left", children: leftLabel(purgeAt, now, t) }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(Button, { variant: "ghost", size: "sm", unavailable, onClick: () => {
          setConfirming(memory.id);
        }, children: t("deleted.hardDelete") }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
          Button,
          {
            size: "sm",
            unavailable,
            onClick: () => {
              actions.run(
                memory.id,
                { cmd: "restore", memoryId: memory.id, layer: scopeOfMemory(memory) },
                (result) => t(result.decisionId !== void 0 ? "deleted.restoredConflict" : "deleted.restored")
              );
            },
            children: t("deleted.restore")
          }
        )
      ] })
    ] }, memory.id);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "pm-del", children: [
    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(SearchBox, { label: t("deleted.search.label"), placeholder: t("deleted.search.placeholder"), value: query, onChange: setQuery }),
    scopeItems.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { className: "pm-del-note", children: t("deleted.note") }) : null,
    actions.notice !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { className: "pm-notice", role: "status", tabIndex: -1, children: actions.notice.text }) : null,
    actions.strayFailures(items.map((item) => item.memory.id)),
    items.length === 0 ? scopeItems.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(EmptyState, { variant: "daily", title: t("deleted.search.none") }) : /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(EmptyState, { variant: "daily", title: t("deleted.empty.title"), children: t("deleted.empty.body") }) : /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "pm-memgroups", children: bucketize(items, DELETED_BUCKETS, (item) => deletedBucketOf(item.deletedAt, now)).map(({ key, items: rows }) => {
      const isRevealing = rows.some((item) => item.memory.id === revealId);
      const isOpen = isRevealing || folds.isOpen(key, true);
      return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
        MemoryGroup,
        {
          title: t(`deleted.when.${key}`),
          count: rows.length,
          now,
          isOpen,
          onToggle: () => {
            if (isRevealing) clear();
            folds.toggle(key, isOpen);
          },
          children: rows.map(row)
        },
        key
      );
    }) })
  ] });
}
var deletedTabCss = `
.pm-del { display: flex; flex-direction: column; gap: 12px; }
.pm-del > .pm-notice { padding: 0 16px; }
.pm-del-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.pm-del-meta { display: flex; flex-wrap: wrap; align-items: center; margin: 0; padding-left: 14px; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-del-actions { align-items: center; }
.pm-del-note { margin: 0; padding: 0 16px; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-del-hint { margin: 0; padding-left: 14px; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-del-left { font-size: 12px; line-height: 1.5; color: var(--pm-text-2); white-space: nowrap; }
`;

// client/library/batch-edit.tsx
var import_react25 = require("react");

// client/pending/card-edit.ts
var isEditable = (memory) => memory.digest !== void 0 && memory.hasSecret !== true;
var baseOf = (memory) => ({ updatedAt: memory.updatedAt, digest: memory.digest ?? "" });
var draftOf2 = (memory) => ({ content: memory.content, name: memory.name, summary: memory.summary, tags: memory.tags });

// node_modules/.pnpm/diff@9.0.0/node_modules/diff/libesm/diff/base.js
var Diff = class {
  diff(oldStr, newStr, options = {}) {
    let callback;
    if (typeof options === "function") {
      callback = options;
      options = {};
    } else if ("callback" in options) {
      callback = options.callback;
    }
    const oldString = this.castInput(oldStr, options);
    const newString = this.castInput(newStr, options);
    const oldTokens = this.removeEmpty(this.tokenize(oldString, options));
    const newTokens = this.removeEmpty(this.tokenize(newString, options));
    return this.diffWithOptionsObj(oldTokens, newTokens, options, callback);
  }
  diffWithOptionsObj(oldTokens, newTokens, options, callback) {
    var _a;
    const done = (value) => {
      value = this.postProcess(value, options);
      if (callback) {
        setTimeout(function() {
          callback(value);
        }, 0);
        return void 0;
      } else {
        return value;
      }
    };
    const newLen = newTokens.length, oldLen = oldTokens.length;
    let editLength = 1;
    let maxEditLength = newLen + oldLen;
    if (options.maxEditLength != null) {
      maxEditLength = Math.min(maxEditLength, options.maxEditLength);
    }
    const maxExecutionTime = (_a = options.timeout) !== null && _a !== void 0 ? _a : Infinity;
    const abortAfterTimestamp = Date.now() + maxExecutionTime;
    const bestPath = [{ oldPos: -1, lastComponent: void 0 }];
    let newPos = this.extractCommon(bestPath[0], newTokens, oldTokens, 0, options);
    if (bestPath[0].oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
      return done(this.buildValues(bestPath[0].lastComponent, newTokens, oldTokens));
    }
    let minDiagonalToConsider = -Infinity, maxDiagonalToConsider = Infinity;
    const execEditLength = () => {
      for (let diagonalPath = Math.max(minDiagonalToConsider, -editLength); diagonalPath <= Math.min(maxDiagonalToConsider, editLength); diagonalPath += 2) {
        let basePath;
        const removePath = bestPath[diagonalPath - 1], addPath = bestPath[diagonalPath + 1];
        if (removePath) {
          bestPath[diagonalPath - 1] = void 0;
        }
        let canAdd = false;
        if (addPath) {
          const addPathNewPos = addPath.oldPos - diagonalPath;
          canAdd = addPath && 0 <= addPathNewPos && addPathNewPos < newLen;
        }
        const canRemove = removePath && removePath.oldPos + 1 < oldLen;
        if (!canAdd && !canRemove) {
          bestPath[diagonalPath] = void 0;
          continue;
        }
        if (!canRemove || canAdd && removePath.oldPos < addPath.oldPos) {
          basePath = this.addToPath(addPath, true, false, 0, options);
        } else {
          basePath = this.addToPath(removePath, false, true, 1, options);
        }
        newPos = this.extractCommon(basePath, newTokens, oldTokens, diagonalPath, options);
        if (basePath.oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
          return done(this.buildValues(basePath.lastComponent, newTokens, oldTokens)) || true;
        } else {
          bestPath[diagonalPath] = basePath;
          if (basePath.oldPos + 1 >= oldLen) {
            maxDiagonalToConsider = Math.min(maxDiagonalToConsider, diagonalPath - 1);
          }
          if (newPos + 1 >= newLen) {
            minDiagonalToConsider = Math.max(minDiagonalToConsider, diagonalPath + 1);
          }
        }
      }
      editLength++;
    };
    if (callback) {
      (function exec() {
        setTimeout(function() {
          if (editLength > maxEditLength || Date.now() > abortAfterTimestamp) {
            return callback(void 0);
          }
          if (!execEditLength()) {
            exec();
          }
        }, 0);
      })();
    } else {
      while (editLength <= maxEditLength && Date.now() <= abortAfterTimestamp) {
        const ret = execEditLength();
        if (ret) {
          return ret;
        }
      }
    }
  }
  addToPath(path, added, removed, oldPosInc, options) {
    const last = path.lastComponent;
    if (last && !options.oneChangePerToken && last.added === added && last.removed === removed) {
      return {
        oldPos: path.oldPos + oldPosInc,
        lastComponent: { count: last.count + 1, added, removed, previousComponent: last.previousComponent }
      };
    } else {
      return {
        oldPos: path.oldPos + oldPosInc,
        lastComponent: { count: 1, added, removed, previousComponent: last }
      };
    }
  }
  extractCommon(basePath, newTokens, oldTokens, diagonalPath, options) {
    const newLen = newTokens.length, oldLen = oldTokens.length;
    let oldPos = basePath.oldPos, newPos = oldPos - diagonalPath, commonCount = 0;
    while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(oldTokens[oldPos + 1], newTokens[newPos + 1], options)) {
      newPos++;
      oldPos++;
      commonCount++;
      if (options.oneChangePerToken) {
        basePath.lastComponent = { count: 1, previousComponent: basePath.lastComponent, added: false, removed: false };
      }
    }
    if (commonCount && !options.oneChangePerToken) {
      basePath.lastComponent = { count: commonCount, previousComponent: basePath.lastComponent, added: false, removed: false };
    }
    basePath.oldPos = oldPos;
    return newPos;
  }
  equals(left, right, options) {
    if (options.comparator) {
      return options.comparator(left, right);
    } else {
      return left === right || !!options.ignoreCase && left.toLowerCase() === right.toLowerCase();
    }
  }
  removeEmpty(array) {
    const ret = [];
    for (let i = 0; i < array.length; i++) {
      if (array[i]) {
        ret.push(array[i]);
      }
    }
    return ret;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  castInput(value, options) {
    return value;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tokenize(value, options) {
    return Array.from(value);
  }
  join(chars) {
    return chars.join("");
  }
  postProcess(changeObjects, options) {
    return changeObjects;
  }
  get useLongestToken() {
    return false;
  }
  buildValues(lastComponent, newTokens, oldTokens) {
    const components = [];
    let nextComponent;
    while (lastComponent) {
      components.push(lastComponent);
      nextComponent = lastComponent.previousComponent;
      delete lastComponent.previousComponent;
      lastComponent = nextComponent;
    }
    components.reverse();
    const componentLen = components.length;
    let componentPos = 0, newPos = 0, oldPos = 0;
    for (; componentPos < componentLen; componentPos++) {
      const component = components[componentPos];
      if (!component.removed) {
        if (!component.added && this.useLongestToken) {
          let value = newTokens.slice(newPos, newPos + component.count);
          value = value.map(function(value2, i) {
            const oldValue = oldTokens[oldPos + i];
            return oldValue.length > value2.length ? oldValue : value2;
          });
          component.value = this.join(value);
        } else {
          component.value = this.join(newTokens.slice(newPos, newPos + component.count));
        }
        newPos += component.count;
        if (!component.added) {
          oldPos += component.count;
        }
      } else {
        component.value = this.join(oldTokens.slice(oldPos, oldPos + component.count));
        oldPos += component.count;
      }
    }
    return components;
  }
};

// node_modules/.pnpm/diff@9.0.0/node_modules/diff/libesm/util/string.js
function longestCommonPrefix(str1, str2) {
  let i;
  for (i = 0; i < str1.length && i < str2.length; i++) {
    if (str1[i] != str2[i]) {
      return str1.slice(0, i);
    }
  }
  return str1.slice(0, i);
}
function longestCommonSuffix(str1, str2) {
  let i;
  if (!str1 || !str2 || str1[str1.length - 1] != str2[str2.length - 1]) {
    return "";
  }
  for (i = 0; i < str1.length && i < str2.length; i++) {
    if (str1[str1.length - (i + 1)] != str2[str2.length - (i + 1)]) {
      return str1.slice(-i);
    }
  }
  return str1.slice(-i);
}
function replacePrefix(string, oldPrefix, newPrefix) {
  if (string.slice(0, oldPrefix.length) != oldPrefix) {
    throw Error(`string ${JSON.stringify(string)} doesn't start with prefix ${JSON.stringify(oldPrefix)}; this is a bug`);
  }
  return newPrefix + string.slice(oldPrefix.length);
}
function replaceSuffix(string, oldSuffix, newSuffix) {
  if (!oldSuffix) {
    return string + newSuffix;
  }
  if (string.slice(-oldSuffix.length) != oldSuffix) {
    throw Error(`string ${JSON.stringify(string)} doesn't end with suffix ${JSON.stringify(oldSuffix)}; this is a bug`);
  }
  return string.slice(0, -oldSuffix.length) + newSuffix;
}
function removePrefix(string, oldPrefix) {
  return replacePrefix(string, oldPrefix, "");
}
function removeSuffix(string, oldSuffix) {
  return replaceSuffix(string, oldSuffix, "");
}
function maximumOverlap(string1, string2) {
  return string2.slice(0, overlapCount(string1, string2));
}
function overlapCount(a, b) {
  let startA = 0;
  if (a.length > b.length) {
    startA = a.length - b.length;
  }
  let endB = b.length;
  if (a.length < b.length) {
    endB = a.length;
  }
  const map = Array(endB);
  let k = 0;
  map[0] = 0;
  for (let j = 1; j < endB; j++) {
    if (b[j] == b[k]) {
      map[j] = map[k];
    } else {
      map[j] = k;
    }
    while (k > 0 && b[j] != b[k]) {
      k = map[k];
    }
    if (b[j] == b[k]) {
      k++;
    }
  }
  k = 0;
  for (let i = startA; i < a.length; i++) {
    while (k > 0 && a[i] != b[k]) {
      k = map[k];
    }
    if (a[i] == b[k]) {
      k++;
    }
  }
  return k;
}
function segment(string, segmenter2) {
  const parts = [];
  for (const segmentObj of Array.from(segmenter2.segment(string))) {
    const segment2 = segmentObj.segment;
    if (parts.length && /\s/.test(parts[parts.length - 1]) && /\s/.test(segment2)) {
      parts[parts.length - 1] += segment2;
    } else {
      parts.push(segment2);
    }
  }
  return parts;
}
function trailingWs(string, segmenter2) {
  if (segmenter2) {
    return leadingAndTrailingWs(string, segmenter2)[1];
  }
  let i;
  for (i = string.length - 1; i >= 0; i--) {
    if (!string[i].match(/\s/)) {
      break;
    }
  }
  return string.substring(i + 1);
}
function leadingWs(string, segmenter2) {
  if (segmenter2) {
    return leadingAndTrailingWs(string, segmenter2)[0];
  }
  const match = string.match(/^\s*/);
  return match ? match[0] : "";
}
function leadingAndTrailingWs(string, segmenter2) {
  if (!segmenter2) {
    return [leadingWs(string), trailingWs(string)];
  }
  if (segmenter2.resolvedOptions().granularity != "word") {
    throw new Error('The segmenter passed must have a granularity of "word"');
  }
  const segments = segment(string, segmenter2);
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];
  const head = /\s/.test(firstSeg) ? firstSeg : "";
  const tail = /\s/.test(lastSeg) ? lastSeg : "";
  return [head, tail];
}

// node_modules/.pnpm/diff@9.0.0/node_modules/diff/libesm/diff/word.js
var extendedWordChars = "a-zA-Z0-9_\\u{AD}\\u{C0}-\\u{D6}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}";
var tokenizeIncludingWhitespace = new RegExp(`[${extendedWordChars}]+|\\s+|[^${extendedWordChars}]`, "ug");
var WordDiff = class extends Diff {
  equals(left, right, options) {
    if (options.ignoreCase) {
      left = left.toLowerCase();
      right = right.toLowerCase();
    }
    return left.trim() === right.trim();
  }
  tokenize(value, options = {}) {
    let parts;
    if (options.intlSegmenter) {
      const segmenter2 = options.intlSegmenter;
      if (segmenter2.resolvedOptions().granularity != "word") {
        throw new Error('The segmenter passed must have a granularity of "word"');
      }
      parts = segment(value, segmenter2);
    } else {
      parts = value.match(tokenizeIncludingWhitespace) || [];
    }
    const tokens = [];
    let prevPart = null;
    parts.forEach((part) => {
      if (/\s/.test(part)) {
        if (prevPart == null) {
          tokens.push(part);
        } else {
          tokens.push(tokens.pop() + part);
        }
      } else if (prevPart != null && /\s/.test(prevPart)) {
        if (tokens[tokens.length - 1] == prevPart) {
          tokens.push(tokens.pop() + part);
        } else {
          tokens.push(prevPart + part);
        }
      } else {
        tokens.push(part);
      }
      prevPart = part;
    });
    return tokens;
  }
  join(tokens) {
    return tokens.map((token, i) => {
      if (i == 0) {
        return token;
      } else {
        return token.replace(/^\s+/, "");
      }
    }).join("");
  }
  postProcess(changes, options) {
    if (!changes || options.oneChangePerToken) {
      return changes;
    }
    let lastKeep = null;
    let insertion = null;
    let deletion = null;
    changes.forEach((change) => {
      if (change.added) {
        insertion = change;
      } else if (change.removed) {
        deletion = change;
      } else {
        if (insertion || deletion) {
          dedupeWhitespaceInChangeObjects(lastKeep, deletion, insertion, change, options.intlSegmenter);
        }
        lastKeep = change;
        insertion = null;
        deletion = null;
      }
    });
    if (insertion || deletion) {
      dedupeWhitespaceInChangeObjects(lastKeep, deletion, insertion, null, options.intlSegmenter);
    }
    return changes;
  }
};
var wordDiff = new WordDiff();
function diffWords(oldStr, newStr, options) {
  if ((options === null || options === void 0 ? void 0 : options.ignoreWhitespace) != null && !options.ignoreWhitespace) {
    return diffWordsWithSpace(oldStr, newStr, options);
  }
  return wordDiff.diff(oldStr, newStr, options);
}
function dedupeWhitespaceInChangeObjects(startKeep, deletion, insertion, endKeep, segmenter2) {
  if (deletion && insertion) {
    const [oldWsPrefix, oldWsSuffix] = leadingAndTrailingWs(deletion.value, segmenter2);
    const [newWsPrefix, newWsSuffix] = leadingAndTrailingWs(insertion.value, segmenter2);
    if (startKeep) {
      const commonWsPrefix = longestCommonPrefix(oldWsPrefix, newWsPrefix);
      startKeep.value = replaceSuffix(startKeep.value, newWsPrefix, commonWsPrefix);
      deletion.value = removePrefix(deletion.value, commonWsPrefix);
      insertion.value = removePrefix(insertion.value, commonWsPrefix);
    }
    if (endKeep) {
      const commonWsSuffix = longestCommonSuffix(oldWsSuffix, newWsSuffix);
      endKeep.value = replacePrefix(endKeep.value, newWsSuffix, commonWsSuffix);
      deletion.value = removeSuffix(deletion.value, commonWsSuffix);
      insertion.value = removeSuffix(insertion.value, commonWsSuffix);
    }
  } else if (insertion) {
    if (startKeep) {
      const ws = leadingWs(insertion.value, segmenter2);
      insertion.value = insertion.value.substring(ws.length);
    }
    if (endKeep) {
      const ws = leadingWs(endKeep.value, segmenter2);
      endKeep.value = endKeep.value.substring(ws.length);
    }
  } else if (startKeep && endKeep) {
    const newWsFull = leadingWs(endKeep.value, segmenter2), [delWsStart, delWsEnd] = leadingAndTrailingWs(deletion.value, segmenter2);
    const newWsStart = longestCommonPrefix(newWsFull, delWsStart);
    deletion.value = removePrefix(deletion.value, newWsStart);
    const newWsEnd = longestCommonSuffix(removePrefix(newWsFull, newWsStart), delWsEnd);
    deletion.value = removeSuffix(deletion.value, newWsEnd);
    endKeep.value = replacePrefix(endKeep.value, newWsFull, newWsEnd);
    startKeep.value = replaceSuffix(startKeep.value, newWsFull, newWsFull.slice(0, newWsFull.length - newWsEnd.length));
  } else if (endKeep) {
    const endKeepWsPrefix = leadingWs(endKeep.value, segmenter2);
    const deletionWsSuffix = trailingWs(deletion.value, segmenter2);
    const overlap = maximumOverlap(deletionWsSuffix, endKeepWsPrefix);
    deletion.value = removeSuffix(deletion.value, overlap);
  } else if (startKeep) {
    const startKeepWsSuffix = trailingWs(startKeep.value, segmenter2);
    const deletionWsPrefix = leadingWs(deletion.value, segmenter2);
    const overlap = maximumOverlap(startKeepWsSuffix, deletionWsPrefix);
    deletion.value = removePrefix(deletion.value, overlap);
  }
}
var WordsWithSpaceDiff = class extends Diff {
  tokenize(value) {
    const regex = new RegExp(`(\\r?\\n)|[${extendedWordChars}]+|[^\\S\\n\\r]+|[^${extendedWordChars}]`, "ug");
    return value.match(regex) || [];
  }
};
var wordsWithSpaceDiff = new WordsWithSpaceDiff();
function diffWordsWithSpace(oldStr, newStr, options) {
  return wordsWithSpaceDiff.diff(oldStr, newStr, options);
}

// client/pending/model-edit.tsx
var import_react24 = require("react");

// client/library/intents.ts
var INTENT_BLANK = "___";
var SINGLE_INTENTS = [
  { id: "compress", label: "library.intent.compress", template: "library.intent.compress.template" },
  { id: "clarify", label: "library.intent.clarify", template: "library.intent.clarify.template" },
  { id: "correct", label: "library.intent.correct", template: "library.intent.correct.template" },
  { id: "supplement", label: "library.intent.supplement", template: "library.intent.supplement.template" }
];
var BATCH_INTENTS = [
  { id: "resolve", label: "library.intent.resolve", template: "library.intent.resolve.template" },
  { id: "dedupe", label: "library.intent.dedupe", template: "library.intent.dedupe.template" },
  { id: "prune", label: "library.intent.prune", template: "library.intent.prune.template" },
  { id: "unify", label: "library.intent.unify", template: "library.intent.unify.template" }
];

// client/pending/edit-modes.tsx
var import_react23 = require("react");

// client/ui/Segmented.tsx
var import_react22 = require("react");
var import_jsx_runtime21 = require("react/jsx-runtime");
function SegmentedTabs({ items, value, onChange, label }) {
  const selectedIndex = items.findIndex((item) => item.value === value);
  const onKeyDown = (event, index) => {
    let next;
    switch (event.key) {
      case "ArrowLeft":
        next = (index + items.length - 1) % items.length;
        break;
      case "ArrowRight":
        next = (index + 1) % items.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    const nextItem = items[next];
    if (nextItem === void 0) return;
    event.currentTarget.parentElement?.querySelectorAll('[role="tab"]').item(next).focus();
    onChange(nextItem.value);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { role: "tablist", "aria-label": label, className: "pm-tabs", style: { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
      "span",
      {
        className: "pm-tabs-indicator",
        "aria-hidden": "true",
        style: { width: `calc((100% - 8px) / ${items.length})`, transform: `translateX(${selectedIndex * 100}%)` }
      }
    ),
    items.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
      "button",
      {
        id: item.id,
        type: "button",
        role: "tab",
        className: "pm-tab",
        "aria-selected": value === item.value,
        "aria-controls": item.panelId,
        tabIndex: value === item.value ? 0 : -1,
        onClick: () => {
          onChange(item.value);
        },
        onKeyDown: (event) => {
          onKeyDown(event, index);
        },
        children: item.label
      },
      item.value
    ))
  ] });
}
function isWalkKey(key) {
  return key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown" || key === "Home" || key === "End";
}
function walk(options, from, key) {
  const enabled = options.filter((option) => option.disabled !== true);
  if (key === "Home") return enabled[0];
  if (key === "End") return enabled[enabled.length - 1];
  const step = key === "ArrowRight" || key === "ArrowDown" ? 1 : -1;
  const count = options.length;
  for (let offset = 1; offset < count; offset += 1) {
    const candidate = options[((from + step * offset) % count + count) % count];
    if (candidate !== void 0 && candidate.disabled !== true) return candidate;
  }
  return void 0;
}
function SegmentedControl({ id, value, options, onChange, label, disabled = false }) {
  const list2 = (0, import_react22.useRef)(null);
  const selected = options.findIndex((option) => option.value === value);
  (0, import_react22.useEffect)(() => {
    const root = list2.current;
    if (root === null || !root.contains(document.activeElement)) return;
    root.querySelector('[role="tab"][aria-selected="true"]')?.focus();
  }, [value]);
  const onKeyDown = (event) => {
    if (!isWalkKey(event.key)) return;
    event.preventDefault();
    const target = walk(options, selected, event.key);
    if (target !== void 0 && target.value !== value) onChange(target.value);
  };
  const indicator = { "--pm-segment-count": String(options.length), "--pm-segment-index": String(selected) };
  const stop = selected >= 0 ? options[selected]?.value : options.find((option) => option.disabled !== true)?.value;
  return /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { ref: list2, role: "tablist", "aria-label": label, className: "pm-segmented", style: indicator, children: [
    selected >= 0 ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { "aria-hidden": "true", className: "pm-segmented-indicator" }) : null,
    options.map((option) => {
      const active = option.value === value;
      return /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
        "button",
        {
          id: `${id}-${option.value}`,
          type: "button",
          role: "tab",
          "aria-selected": active,
          "aria-controls": `${id}-${option.value}-panel`,
          tabIndex: option.value === stop ? 0 : -1,
          disabled: disabled || option.disabled === true,
          title: option.title,
          className: "pm-segment",
          onClick: () => {
            if (!active) onChange(option.value);
          },
          onKeyDown,
          children: option.label
        },
        option.value
      );
    })
  ] });
}
var segmentedCss = `
.pm-tabs { position: relative; display: grid; padding: 4px; border-radius: var(--dsw-radius-lg, 16px); background: var(--pm-bg-block); }
.pm-tabs-indicator {
  position: absolute; inset: 4px auto 4px 4px; border: .5px solid var(--pm-line-card);
  border-radius: var(--dsw-radius-md, 12px); background: var(--pm-bg-raised); transition: transform 180ms ease; pointer-events: none;
}
.pm-tab {
  position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 34px; padding: 0 12px;
  border: none; border-radius: var(--dsw-radius-md, 12px); background: transparent; cursor: pointer;
  font: inherit; font-size: 14px; line-height: 20px; white-space: nowrap; color: var(--pm-text-2); transition: color 180ms ease;
}
.pm-tab:hover, .pm-tab[aria-selected='true'] { color: var(--pm-text); }
.pm-tab[aria-selected='true'] { font-weight: 600; }
.pm-root .pm-tab:focus-visible { outline: none; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }

.pm-segmented {
  position: relative; display: inline-grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 2px; padding: 4px;
  border-radius: var(--dsw-radius-md, 12px); background: var(--pm-hover);
}
.pm-segmented-indicator {
  position: absolute; top: 4px; left: 4px;
  width: calc((100% - 8px - 2px * (var(--pm-segment-count) - 1)) / var(--pm-segment-count)); height: calc(100% - 8px);
  border: 0; border-radius: var(--dsw-radius-sm, 8px); background: var(--pm-bg); box-shadow: var(--dsw-elevation-soft);
  transform: translateX(calc(var(--pm-segment-index) * (100% + 2px))); transition: transform 160ms ease; pointer-events: none;
}
.pm-segment {
  position: relative; z-index: 1; height: 28px; padding: 0 16px; border: 0; border-radius: var(--dsw-radius-sm, 8px);
  background: transparent; color: var(--pm-text-2); font: inherit; font-size: 13px; line-height: 20px; font-weight: 500;
  white-space: nowrap; cursor: pointer; transition: color 120ms ease;
}
.pm-segment:hover:not(:disabled), .pm-segment[aria-selected='true'] { color: var(--pm-text); }
.pm-segment:disabled { cursor: default; opacity: .4; }
.pm-root .pm-segment:focus-visible { outline-offset: -2px; }
@media (prefers-reduced-motion: reduce) {
  .pm-tabs-indicator, .pm-tab, .pm-segmented-indicator, .pm-segment { transition: none; }
}
`;

// client/pending/edit-modes.tsx
var import_jsx_runtime22 = (
  // Esc 从面板里任一控件冒上来都关
  require("react/jsx-runtime")
);
var EDIT_MODE_STORAGE_KEY = "dsh-plastic-memory.gui.editMode";
var DEFAULT_MODE = "model";
var IDLE2 = { phase: "idle", isDirty: false };
function readEditMode() {
  try {
    const raw = localStorage.getItem(EDIT_MODE_STORAGE_KEY);
    return raw === "model" || raw === "manual" ? raw : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}
function writeEditMode(mode) {
  try {
    localStorage.setItem(EDIT_MODE_STORAGE_KEY, mode);
  } catch {
  }
}
function useReportEditState(onStateChange, phase, isDirty) {
  const report = (0, import_react23.useRef)(onStateChange);
  report.current = onStateChange;
  (0, import_react23.useEffect)(() => {
    report.current?.({ phase, isDirty });
  }, [phase, isDirty]);
}
function EditModes({ isMerge = false, model, manual, onClose, onStateChange }) {
  const t = useT();
  const id = (0, import_react23.useId)();
  const [mode, setMode] = (0, import_react23.useState)(readEditMode);
  const [states, setStates] = (0, import_react23.useState)({ model: IDLE2, manual: IDLE2 });
  const reportModel = (0, import_react23.useCallback)((state) => {
    setStates((prev) => ({ ...prev, model: state }));
  }, []);
  const reportManual = (0, import_react23.useCallback)((state) => {
    setStates((prev) => ({ ...prev, manual: state }));
  }, []);
  const { phase } = states[mode];
  useReportEditState(onStateChange, phase, states.model.isDirty || states.manual.isDirty);
  const root = (0, import_react23.useRef)(null);
  (0, import_react23.useLayoutEffect)(() => {
    const panels = root.current?.querySelectorAll(':scope > [role="tabpanel"]') ?? [];
    const shown = [...panels].find((panel) => !panel.hidden);
    const hidden = [...panels].find((panel) => panel.hidden);
    if (hidden?.contains(document.activeElement) === true) shown?.querySelector("textarea, input")?.focus();
  }, []);
  const change = (next) => {
    setMode(next);
    writeEditMode(next);
  };
  const onKeyDown = (event) => {
    if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
    if (phase === "saving") return;
    event.preventDefault();
    onClose();
  };
  const options = [
    { value: "model", label: t(isMerge ? "pending.model.merge" : "pending.model.edit") },
    { value: "manual", label: t(isMerge ? "pending.edit.merge" : "pending.edit.edit") }
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { ref: root, className: "pm-edit-modes", onKeyDown, children: [
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(SegmentedControl, { id, value: mode, options, onChange: change, label: t("pending.modes"), disabled: phase !== "idle" }),
    options.map(({ value }) => /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { id: `${id}-${value}-panel`, role: "tabpanel", "aria-labelledby": `${id}-${value}`, hidden: value !== mode, children: value === "model" ? model(reportModel) : manual(reportManual) }, value))
  ] });
}
var editModesCss = `
.pm-edit-modes { display: flex; flex-direction: column; gap: 8px; }
.pm-edit-modes > .pm-segmented { align-self: flex-start; padding: 3px; background: var(--pm-bg-block); }
.pm-edit-modes .pm-segmented-indicator { top: 3px; left: 3px; width: calc((100% - 6px - 2px * (var(--pm-segment-count) - 1)) / var(--pm-segment-count)); height: calc(100% - 6px); }
.pm-edit-modes .pm-segment { height: 24px; padding: 0 12px; font-size: 12px; }
.pm-edit-modes .pm-segment[aria-selected='true'] { font-weight: 600; }
`;

// client/pending/model-edit.tsx
var import_jsx_runtime23 = require("react/jsx-runtime");
var segmenter = new Intl.Segmenter("zh", { granularity: "word" });
var diffOf = (before, after) => diffWords(before, after, { intlSegmenter: segmenter });
function modelFailureOf(command, r, t) {
  if (r.code === "llm-failed") return t(LLM_FAILURE_KEYS[r.code], { detail: r.detail ?? "" });
  const outcome = interpret(command, r);
  if (outcome.kind !== "failed") return t("command.failed", { detail: r.detail ?? r.code });
  return outcome.isLocalized ? t(outcome.detail) : t("command.failed", { detail: outcome.detail });
}
function hintOf(model, t) {
  if (model.status === "unavailable") return t("pending.model.unavailable");
  return model.status === "ready" && model.model !== void 0 ? t("pending.model.hint", { model: model.model }) : t("pending.model.hintNoName");
}
function requestFootOf(model, isMissing, t, other, empty = "library.model.empty") {
  const isUnavailable = model.status === "unavailable";
  return {
    hint: isMissing && !isUnavailable ? t(empty) : hintOf(model, t),
    blocked: isUnavailable ? t("pending.model.unavailable") : other ?? (isMissing ? t(empty) : void 0)
  };
}
function ModelBusy({ label, onStop }) {
  const t = useT();
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "pm-model-busy", role: "status", children: [
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "pm-model-dot", "aria-hidden": "true" }),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Button, { variant: "ghost", onClick: onStop, children: t("pending.model.stop") })
  ] });
}
function ModelEditPanel({ memories, adviceType, typeTitle, base, keeper, session, unavailable, onClose, onApply, onStateChange }) {
  const t = useT();
  const id = (0, import_react24.useId)();
  const gateway = useGateway();
  const model = gateway.useModel(session);
  const [phase, setPhase] = (0, import_react24.useState)({ kind: "ask" });
  const [request, setRequest] = (0, import_react24.useState)("");
  const [previous, setPrevious] = (0, import_react24.useState)(void 0);
  const [priorRequests, setPriorRequests] = (0, import_react24.useState)([]);
  const seq = (0, import_react24.useRef)(0);
  (0, import_react24.useEffect)(() => () => {
    seq.current += 1;
  }, []);
  const target = memories.map((m) => `${m.id}@${m.updatedAt}@${m.digest ?? ""}`).join("|");
  const lastTarget = (0, import_react24.useRef)(target);
  (0, import_react24.useEffect)(() => {
    if (lastTarget.current === target) return;
    lastTarget.current = target;
    seq.current += 1;
    setPhase((prev) => prev.kind === "busy" ? { kind: "ask" } : prev);
  }, [target]);
  const [hasApplied, setApplied] = (0, import_react24.useState)(false);
  (0, import_react24.useEffect)(() => {
    if (hasApplied && unavailable === void 0) setApplied(false);
  }, [hasApplied, unavailable]);
  const reported = phase.kind === "ask" ? "idle" : phase.kind === "busy" ? "busy" : hasApplied && unavailable !== void 0 ? "saving" : "result";
  useReportEditState(onStateChange, reported, request.trim() !== "" || phase.kind === "result" || previous !== void 0);
  const root = (0, import_react24.useRef)(null);
  useReturnFocus(root);
  const isRequired = adviceType === void 0;
  const isSingle = memories.length === 1;
  const generate = () => {
    if (session.kind !== "ready") return;
    const text = request.trim();
    if (isRequired && text === "") return;
    const command = {
      cmd: "draft-edit",
      ...adviceType !== void 0 ? { adviceType } : {},
      memories: memories.map((m) => ({ memoryId: m.id, layer: scopeOfMemory(m) })),
      ...text !== "" ? { request: text } : {},
      ...priorRequests.length > 0 ? { priorRequests } : {},
      ...previous !== void 0 ? { previous } : {}
    };
    const refused = refuseBeforeSend(command);
    if (refused !== void 0) {
      setPhase({ kind: "ask", error: refused.isLocalized ? t(refused.detail) : refused.detail });
      return;
    }
    const mine = ++seq.current;
    keepFocusInPlace();
    setPhase({ kind: "busy" });
    void gateway.execute(session.sessionId, command).then((r) => {
      if (mine !== seq.current) return;
      if (!r.ok) {
        setPhase({ kind: "ask", error: modelFailureOf(command, r, t) });
        return;
      }
      if (r.draft === void 0) {
        setPhase({ kind: "ask", error: t("pending.model.invalid") });
        return;
      }
      const { content, summary, name, tags } = r.draft;
      setPhase({ kind: "result", draft: { content, summary, name: name ?? base.name, tags: tags ?? base.tags } });
    });
  };
  const stop = () => {
    seq.current += 1;
    setPhase({ kind: "ask" });
  };
  if (phase.kind === "busy") {
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { ref: root, className: "pm-edit", children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(ModelBusy, { label: t("pending.model.busy"), onStop: stop }) });
  }
  if (phase.kind === "ask") {
    const foot = requestFootOf(model, isRequired && request.trim() === "", t);
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { ref: root, className: "pm-edit", children: [
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        RequestBox,
        {
          id,
          label: isRequired ? t("library.model.ask") : t("pending.model.ask", { type: typeTitle ?? "" }),
          value: request,
          onChange: setRequest,
          intents: isSingle ? SINGLE_INTENTS : void 0,
          placeholder: isSingle ? t("library.model.placeholder") : void 0
        }
      ),
      isRequired ? /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("p", { className: "pm-model-note", children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Icon, { name: "info", size: 14 }),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { children: t("library.model.note") })
      ] }) : null,
      phase.error !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: "pm-pending-error", role: "alert", children: phase.error }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "pm-edit-foot", children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "pm-edit-hint", children: foot.hint }),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Button, { variant: "ghost", unavailable, onClick: onClose, children: t("pending.cancel") }),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Button, { variant: "primary", unavailable: unavailable ?? foot.blocked, onClick: generate, children: t("pending.model.generate") })
      ] })
    ] });
  }
  const { draft } = phase;
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { ref: root, className: "pm-edit pm-model-result", children: [
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(DraftCompare, { memories, base, draft, keeper }),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "pm-edit-foot", children: [
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "pm-edit-hint" }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Button, { variant: "ghost", unavailable, onClick: () => {
        setPhase({ kind: "ask" });
      }, children: t("pending.model.discard") }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        Button,
        {
          unavailable,
          onClick: () => {
            const text = request.trim();
            if (text !== "") setPriorRequests((prior) => [...prior, text]);
            setPrevious(draft);
            setRequest("");
            setPhase({ kind: "ask" });
          },
          children: t("pending.model.again")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Button, { variant: "primary", unavailable, onClick: () => {
        setApplied(true);
        onApply(draft);
      }, children: t("pending.model.apply") })
    ] })
  ] });
}
function DraftCompare({ memories, base, draft, keeper }) {
  const t = useT();
  const id = (0, import_react24.useId)();
  const isMerge = memories.length === 2;
  const chars = memories.reduce((n, m) => n + m.content.length, 0);
  const fields = [
    { label: t("pending.edit.summary"), before: base.summary, after: draft.summary },
    { label: t("pending.edit.name"), before: base.name, after: draft.name },
    { label: t("pending.edit.tags"), before: base.tags.join("\u3001"), after: draft.tags.join("\u3001") }
  ].filter((f) => f.before !== f.after).map((f) => ({ ...f, parts: isMerge ? void 0 : diffOf(f.before, f.after) }));
  const side = (index) => t(index === 0 ? "pending.model.left" : "pending.model.right");
  const removed = keeper === void 0 ? void 0 : side(keeper === 0 ? 1 : 0);
  const contentParts = isMerge ? void 0 : diffOf(memories[0].content, draft.content);
  const before = contentParts === void 0 ? memories.map((m) => /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: "pm-model-text", children: m.content }, m.id)) : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: "pm-model-text", children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Diff2, { parts: contentParts, side: "before" }) });
  const after = /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: "pm-model-text", children: contentParts === void 0 ? draft.content : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Diff2, { parts: contentParts, side: "after" }) });
  const fieldRows = (which) => fields.map((f) => /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("p", { className: "pm-model-field", children: [
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "pm-model-field-label", children: f.label }),
    f.parts === void 0 ? f[which] : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Diff2, { parts: f.parts, side: which })
  ] }, f.label));
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(import_jsx_runtime23.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "pm-model-compare", children: [
      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("section", { className: "pm-model-pane", "aria-labelledby": `${id}-before`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("h4", { id: `${id}-before`, className: "pm-model-pane-title", children: t(isMerge ? "pending.model.mergeBefore" : "pending.model.before") }),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "pm-model-body", children: [
          before,
          fieldRows("before")
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("section", { className: "pm-model-pane", "aria-labelledby": `${id}-after`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("h4", { id: `${id}-after`, className: "pm-model-pane-title", children: keeper !== void 0 ? t("pending.model.mergeAfter", { side: side(keeper) }) : t("pending.model.after") }),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "pm-model-body", children: [
          after,
          fieldRows("after")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("p", { className: "pm-model-stat", children: [
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { children: t("pending.edit.count", { from: formatNumber(chars), to: formatNumber(draft.content.length) }) }),
      removed !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(import_jsx_runtime23.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { "aria-hidden": "true", children: " \xB7 " }),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { children: t("pending.model.mergeNote", { side: removed }) })
      ] }) : null
    ] })
  ] });
}
function RequestBox({ id, label, value, onChange, intents, intentsLabel, onPick, placeholder }) {
  const t = useT();
  const box = (0, import_react24.useRef)(null);
  const [picked, setPicked] = (0, import_react24.useState)();
  const [filled, setFilled] = (0, import_react24.useState)(0);
  (0, import_react24.useLayoutEffect)(() => {
    const el = box.current;
    if (filled === 0 || el === null) return;
    el.focus();
    const at2 = el.value.indexOf(INTENT_BLANK);
    if (at2 >= 0) el.setSelectionRange(at2, at2 + INTENT_BLANK.length);
  }, [filled]);
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(import_jsx_runtime23.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("label", { className: "pm-edit-label", htmlFor: `${id}-ask`, children: label }),
    intents !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "pm-intents", role: "group", "aria-labelledby": `${id}-intents`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { id: `${id}-intents`, className: "pm-intents-label", children: intentsLabel ?? t("library.model.intents") }),
      intents.map((intent) => /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        Button,
        {
          variant: "quiet",
          className: "pm-intent",
          "aria-pressed": intent.template === void 0 ? void 0 : picked === intent.id && value !== "",
          onClick: () => {
            const { template } = intent;
            if (template === void 0) {
              onPick?.(intent.id);
              return;
            }
            onChange(t(template));
            setPicked(intent.id);
            setFilled((n) => n + 1);
          },
          children: t(intent.label)
        },
        intent.id
      ))
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
      "textarea",
      {
        ref: box,
        id: `${id}-ask`,
        className: "pm-edit-input pm-model-ask",
        value,
        placeholder,
        autoFocus: true,
        onChange: (event) => {
          onChange(event.target.value);
        }
      }
    )
  ] });
}
function Diff2({ parts, side }) {
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(import_jsx_runtime23.Fragment, { children: parts.map((part, i) => part.added ? side === "after" ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("ins", { children: part.value }, i) : null : part.removed ? side === "before" ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("del", { children: part.value }, i) : null : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(import_react24.Fragment, { children: part.value }, i)) });
}
var modelEditCss = `
.pm-model-ask { min-height: 58px; resize: vertical; }
.pm-model-ask::placeholder { color: var(--pm-text-2); }
.pm-intents { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.pm-intents-label { margin-right: 2px; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-intent[aria-pressed='true'] { background: var(--pm-pressed); color: var(--pm-text); }
.pm-model-note { display: flex; align-items: flex-start; gap: 6px; margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-model-note svg { flex-shrink: 0; margin-top: 2px; }
.pm-model-busy { display: flex; align-items: center; gap: 10px; font-size: 13px; line-height: 1.5; color: var(--pm-text-2); }
.pm-model-busy .pm-btn { margin-left: auto; }
.pm-model-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pm-text-2); animation: pm-model-pulse 1.2s ease-in-out infinite; }
@keyframes pm-model-pulse { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .pm-model-dot { animation: none; } }
.pm-model-result { container-type: inline-size; }
.pm-model-compare { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
@container (max-width: 520px) { .pm-model-compare { grid-template-columns: minmax(0, 1fr); } }
.pm-model-pane { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.pm-model-pane-title { margin: 0; font-size: 12px; font-weight: 600; line-height: 1.5; color: var(--pm-text-2); }
.pm-model-body {
  display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: var(--dsw-radius-sm, 8px);
  background: var(--pm-bg); border: .5px solid var(--pm-line-card);
}
.pm-model-text, .pm-model-field { margin: 0; font-size: 13px; line-height: 1.6; color: var(--pm-text); white-space: pre-wrap; overflow-wrap: anywhere; }
.pm-model-field { font-size: 12px; }
.pm-model-field-label { margin-right: 8px; color: var(--pm-text-2); }
.pm-model-body del { color: var(--pm-text-2); text-decoration-color: var(--pm-text-2); background: var(--pm-hover); }
.pm-model-body ins { text-decoration: none; background: var(--pm-hover); box-shadow: inset 0 -1px 0 var(--pm-text); }
.pm-model-stat { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); font-variant-numeric: tabular-nums; }
`;

// client/ui/CrossIcon.tsx
var import_jsx_runtime24 = require("react/jsx-runtime");
function CrossIcon({ size = 10 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("svg", { width: size, height: size, viewBox: "0 0 10 10", fill: "none", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("path", { d: "m1.5 1.5 7 7m0-7-7 7" }) });
}

// client/library/batch-edit.tsx
var import_jsx_runtime25 = require("react/jsx-runtime");
var toBatchItems = (memories) => memories.map((memory) => ({ memory, ref: { memoryId: memory.id, layer: scopeOfMemory(memory), base: baseOf(memory) } }));
var BATCH_STEPS = ["request", "plan", "apply"];
function BatchSteps({ current }) {
  const t = useT();
  const at2 = BATCH_STEPS.indexOf(current);
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("ol", { className: "pm-batch-steps", "aria-label": t("library.batch.steps"), children: BATCH_STEPS.map((step, i) => /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(
    "li",
    {
      className: ["pm-batch-step", i === at2 ? "pm-batch-step--current" : "", i < at2 ? "pm-batch-step--done" : ""].filter(Boolean).join(" "),
      "aria-current": i === at2 ? "step" : void 0,
      children: [
        i < at2 ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { "aria-hidden": "true", children: "\u2713" }) : null,
        t(`library.batch.step.${step}`)
      ]
    },
    step
  )) });
}
var chosenOps = (choice) => choice.plan.ops.filter((op) => op.action !== "keep" && choice.checked.includes(op.memoryId));
function applicationOf(choice, picked, drafts, dropped) {
  const refOf = (memoryId) => picked.find((item) => item.memory.id === memoryId).ref;
  const live = chosenOps(choice).filter((op) => !dropped.has(op.memoryId));
  const kept = live.filter((op) => !isOrphanDelete(op, choice.plan.ops, new Set(live.map((o) => o.memoryId))));
  const ops = kept.map((op) => op.action === "rewrite" ? { kind: "edit", ...refOf(op.memoryId), ...drafts[op.memoryId] } : { kind: "forget", ...refOf(op.memoryId), ...op.into !== void 0 ? { into: op.into } : {} });
  const edited = new Set(kept.filter((op) => op.action === "rewrite").map((op) => op.memoryId));
  const intos = new Set(kept.flatMap((op) => op.action === "delete" && op.into !== void 0 && !edited.has(op.into) ? [op.into] : []));
  return { ops, keep: choice.plan.ops.filter((op) => op.action === "keep" && intos.has(op.memoryId)).map((op) => refOf(op.memoryId)), total: picked.length };
}
function isOrphanDelete(op, planOps, active) {
  return op.action === "delete" && op.into !== void 0 && !active.has(op.into) && planOps.some((o) => o.memoryId === op.into && o.action === "rewrite");
}
function toggleWithDependents(op, ops, active, held) {
  const isOn = !active.has(op.memoryId);
  const next = new Set(active);
  const nextHeld = new Set(held);
  if (isOn) next.add(op.memoryId);
  else next.delete(op.memoryId);
  nextHeld.delete(op.memoryId);
  if (op.action === "rewrite") {
    for (const d of ops.filter((d2) => d2.action === "delete" && d2.into === op.memoryId)) {
      if (!isOn && next.delete(d.memoryId)) nextHeld.add(d.memoryId);
      if (isOn) nextHeld.delete(d.memoryId);
    }
  }
  return { active: next, held: nextHeld };
}
function draftOpsOf(choice) {
  const chosen = chosenOps(choice);
  return chosen.filter((op) => op.action === "rewrite").map((op) => {
    const absorbs = chosen.filter((d) => d.action === "delete" && d.into === op.memoryId).map((d) => d.memoryId);
    const answer = choice.answers[op.memoryId];
    return {
      memoryId: op.memoryId,
      reason: op.reason,
      ...op.question !== void 0 ? { question: op.question } : {},
      ...answer !== void 0 ? { answer } : {},
      ...absorbs.length > 0 ? { absorbs } : {}
    };
  });
}
var fillDraft = (draft, fallback) => ({ content: draft.content, summary: draft.summary, name: draft.name ?? fallback.name, tags: draft.tags ?? [...fallback.tags] });
var STEP_OF = { request: "request", planning: "plan", plan: "plan", drafting: "apply", apply: "apply" };
function BatchEdit({ items, latest, session, onBack, onApply, applyUnavailable, applyFeedback, initialRequest = "", titleOf: titleOf2, backLabel }) {
  const t = useT();
  const titleId = (0, import_react25.useId)();
  const title = (0, import_react25.useRef)(null);
  const gateway = useGateway();
  (0, import_react25.useEffect)(() => {
    title.current?.focus();
  }, []);
  const [picked, setPicked] = (0, import_react25.useState)(items);
  const [request, setRequest] = (0, import_react25.useState)(initialRequest);
  const [stage, setStage] = (0, import_react25.useState)({ kind: "request" });
  const seq = (0, import_react25.useRef)(0);
  (0, import_react25.useEffect)(() => () => {
    seq.current += 1;
  }, []);
  const [refreshing, setRefreshing] = (0, import_react25.useState)();
  const [behindCount, setBehindCount] = (0, import_react25.useState)();
  (0, import_react25.useEffect)(() => {
    if (refreshing === void 0 || latest === void 0) return;
    const fresh = new Map(latest.map((m) => [m.id, m]));
    const isArrived = [...refreshing].every(([id, base]) => {
      const m = fresh.get(id);
      return m === void 0 || baseOf(m).updatedAt !== base.updatedAt || baseOf(m).digest !== base.digest;
    });
    if (!isArrived) return;
    setPicked((prev) => prev.flatMap((item) => {
      if (!refreshing.has(item.memory.id)) return [item];
      const m = fresh.get(item.memory.id);
      return m !== void 0 && isEditable(m) ? toBatchItems([m]) : [];
    }));
    setRefreshing(void 0);
  }, [latest, refreshing]);
  const behind = (memoryIds) => {
    seq.current += 1;
    const waiting = new Map(picked.filter((item) => memoryIds.includes(item.memory.id)).map((item) => [item.memory.id, item.ref.base]));
    setRefreshing(waiting.size > 0 ? waiting : void 0);
    setBehindCount(memoryIds.length);
    setStage({ kind: "request" });
  };
  const isBehind = (r) => {
    if (r.code !== "stale" && r.code !== "not-found" || r.memoryIds === void 0 || r.memoryIds.length === 0) return false;
    behind(r.memoryIds);
    return true;
  };
  const generate = () => {
    if (session.kind !== "ready" || refreshing !== void 0) return;
    const text = request.trim();
    if (text === "" || picked.length < 2) return;
    const command = { cmd: "plan-edits", memories: picked.map((item) => item.ref), request: text };
    const refused = refuseBeforeSend(command);
    if (refused !== void 0) {
      setStage({ kind: "request", error: refused.isLocalized ? t(refused.detail) : refused.detail });
      return;
    }
    const mine = ++seq.current;
    setBehindCount(void 0);
    setStage({ kind: "planning" });
    void gateway.execute(session.sessionId, command).then((r) => {
      if (mine !== seq.current) return;
      if (!r.ok) {
        if (!isBehind(r)) setStage({ kind: "request", error: modelFailureOf(command, r, t) });
        return;
      }
      if (r.plan === void 0) {
        setStage({ kind: "request", error: t("pending.model.invalid") });
        return;
      }
      setStage({ kind: "plan", plan: r.plan });
    });
  };
  const stop = () => {
    seq.current += 1;
    setStage({ kind: "request" });
  };
  const draftFromPlan = (choice) => {
    const ops = draftOpsOf(choice);
    if (ops.length === 0) {
      setStage({ kind: "apply", choice, drafts: {} });
      return;
    }
    if (session.kind !== "ready") return;
    const back = (error) => {
      setStage({ kind: "plan", plan: choice.plan, choice, error });
    };
    const command = { cmd: "draft-plan", memories: picked.map((item) => item.ref), request: choice.request, ops };
    const refused = refuseBeforeSend(command);
    if (refused !== void 0) {
      back(refused.isLocalized ? t(refused.detail) : refused.detail);
      return;
    }
    const mine = ++seq.current;
    setStage({ kind: "drafting", choice });
    void gateway.execute(session.sessionId, command).then((r) => {
      if (mine !== seq.current) return;
      if (!r.ok) {
        if (!isBehind(r)) back(modelFailureOf(command, r, t));
        return;
      }
      const drafts = {};
      for (const { memoryId, draft } of r.drafts ?? []) {
        const memory = picked.find((item) => item.memory.id === memoryId)?.memory;
        if (memory !== void 0) drafts[memoryId] = fillDraft(draft, memory);
      }
      if (ops.some((op) => drafts[op.memoryId] === void 0)) {
        back(t("pending.model.invalid"));
        return;
      }
      setStage({ kind: "apply", choice, drafts });
    });
  };
  const stopDrafting = (choice) => {
    seq.current += 1;
    setStage({ kind: "plan", plan: choice.plan, choice });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("section", { className: "pm-batch", "aria-labelledby": titleId, children: [
    /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "pm-batch-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("h3", { ref: title, id: titleId, className: "pm-batch-title", tabIndex: -1, children: titleOf2?.(picked.length) ?? t("library.batch.title", { n: picked.length }) }),
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(Button, { variant: "ghost", unavailable: applyUnavailable, onClick: onBack, children: backLabel ?? t("library.batch.back") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(BatchSteps, { current: STEP_OF[stage.kind] }),
    behindCount !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "pm-notice", role: "status", children: t("library.batch.behind", { n: behindCount }) }) : null,
    stage.kind === "request" ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
      RequestStep,
      {
        session,
        picked,
        isRefreshing: refreshing !== void 0,
        onUnpick: (id) => {
          setPicked((prev) => prev.filter((item) => item.memory.id !== id));
        },
        request,
        onRequest: setRequest,
        error: stage.error,
        onCancel: onBack,
        onGenerate: generate
      }
    ) : stage.kind === "planning" ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(ModelBusy, { label: t("library.batch.planning"), onStop: stop }) : stage.kind === "plan" ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
      PlanStep,
      {
        plan: stage.plan,
        initial: stage.choice,
        error: stage.error,
        picked,
        onRevise: () => {
          setStage({ kind: "request" });
        },
        onConfirm: (checked, answers) => {
          draftFromPlan({ request: request.trim(), plan: stage.plan, checked, answers });
        }
      }
    ) : stage.kind === "drafting" ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(ModelBusy, { label: t("library.batch.drafting"), onStop: () => {
      stopDrafting(stage.choice);
    } }) : /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
      ApplyStep,
      {
        session,
        choice: stage.choice,
        picked,
        drafts: stage.drafts,
        onDiscardAll: onBack,
        onApply: onApply === void 0 ? void 0 : (application) => {
          onApply(application, picked, behind);
        },
        onBehind: behind,
        unavailable: applyUnavailable,
        feedback: applyFeedback
      }
    )
  ] });
}
function RequestStep({ session, picked, isRefreshing, onUnpick, request, onRequest, error, onCancel, onGenerate }) {
  const t = useT();
  const id = (0, import_react25.useId)();
  const gateway = useGateway();
  const model = gateway.useModel(session);
  const typeLabel2 = useTypeLabel(session);
  const list2 = (0, import_react25.useRef)(null);
  const removedAt = (0, import_react25.useRef)();
  (0, import_react25.useLayoutEffect)(() => {
    const at2 = removedAt.current;
    if (at2 === void 0) return;
    removedAt.current = void 0;
    const buttons = list2.current?.querySelectorAll(".pm-batch-unpick") ?? [];
    buttons[Math.min(at2, buttons.length - 1)]?.focus();
  }, [picked]);
  const foot = requestFootOf(model, request.trim() === "", t, picked.length < 2 ? t("library.select.tooFew") : void 0);
  const blocked = isRefreshing ? t("library.batch.refreshing") : foot.blocked;
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(import_jsx_runtime25.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("section", { className: "pm-batch-picked", "aria-label": t("library.batch.picked"), children: [
      isRefreshing ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "pm-batch-picked-count", role: "status", children: t("library.batch.refreshing") }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("ul", { ref: list2, className: "pm-batch-picked-list", hidden: isRefreshing, children: picked.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("li", { className: "pm-batch-picked-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(Chip, { variant: "neutral", children: typeLabel2(item.memory.type) }),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { className: "pm-batch-picked-text", children: item.memory.content }),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
          Button,
          {
            variant: "icon",
            className: "pm-batch-unpick",
            "aria-label": t("library.batch.unpick", { name: item.memory.name }),
            title: t("library.batch.unpickHint"),
            onClick: () => {
              removedAt.current = index;
              onUnpick(item.memory.id);
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(CrossIcon, {})
          }
        )
      ] }, item.memory.id)) }),
      isRefreshing ? null : /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "pm-batch-picked-count", children: t("library.batch.count", { n: picked.length }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "pm-edit", children: [
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
        RequestBox,
        {
          id,
          label: t("library.batch.ask"),
          value: request,
          onChange: onRequest,
          intents: BATCH_INTENTS,
          placeholder: t("library.batch.placeholder")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("p", { className: "pm-model-note", children: [
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(Icon, { name: "info", size: 14 }),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { children: t("library.batch.note") })
      ] }),
      error !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "pm-pending-error", role: "alert", children: error }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "pm-edit-foot", children: [
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { className: "pm-edit-hint", children: foot.hint }),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(Button, { variant: "ghost", onClick: onCancel, children: t("pending.cancel") }),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(Button, { variant: "primary", unavailable: blocked, onClick: onGenerate, children: t("library.batch.generate") })
      ] })
    ] })
  ] });
}
function PlanStep({ plan, initial, error, picked, onRevise, onConfirm }) {
  const t = useT();
  const id = (0, import_react25.useId)();
  const nameOf = (memoryId) => picked.find((item) => item.memory.id === memoryId)?.memory.name ?? memoryId;
  const [checked, setChecked] = (0, import_react25.useState)(() => new Set(initial?.checked ?? plan.ops.filter((op) => op.action !== "keep").map((op) => op.memoryId)));
  const [held, setHeld] = (0, import_react25.useState)(() => new Set(initial === void 0 ? [] : plan.ops.filter((d) => d.action === "delete" && !initial.checked.includes(d.memoryId) && plan.ops.some((op) => op.memoryId === d.into && op.action === "rewrite" && !initial.checked.includes(op.memoryId))).map((d) => d.memoryId)));
  const [answers, setAnswers] = (0, import_react25.useState)(initial?.answers ?? {});
  const toggle = (op) => {
    if (!checked.has(op.memoryId) && isOrphanDelete(op, plan.ops, checked)) return;
    const next = toggleWithDependents(op, plan.ops, checked, held);
    setChecked(next.active);
    setHeld(next.held);
  };
  const chosen = plan.ops.filter((op) => op.action !== "keep" && checked.has(op.memoryId));
  const isDeleteOnly = chosen.length > 0 && chosen.every((op) => op.action === "delete");
  const confirm = () => {
    const ids = chosen.map((op) => op.memoryId);
    const replies = Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v.trim()]).filter(([k, v]) => v !== "" && ids.includes(k)));
    onConfirm(ids, replies);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(import_jsx_runtime25.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("section", { className: "pm-plan-understanding", "aria-labelledby": `${id}-understanding`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("h4", { id: `${id}-understanding`, className: "pm-plan-understanding-title", children: t("library.batch.understanding") }),
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "pm-plan-understanding-text", children: plan.understanding })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("ul", { className: "pm-plan-ops", "aria-label": t("library.batch.ops"), children: plan.ops.map((op, index) => {
      const item = picked.find((i) => i.memory.id === op.memoryId);
      const action = t(`library.batch.action.${op.action}`);
      const questionId = `${id}-q${index}`;
      return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("li", { className: ["pm-plan-op", op.action === "keep" ? "pm-plan-op--keep" : ""].filter(Boolean).join(" "), children: [
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
          "input",
          {
            type: "checkbox",
            className: "pm-plan-check",
            "aria-label": t("library.batch.op", { action, name: nameOf(op.memoryId) }),
            checked: op.action !== "keep" && checked.has(op.memoryId),
            disabled: op.action === "keep" || isOrphanDelete(op, plan.ops, checked),
            onChange: () => {
              toggle(op);
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "pm-plan-op-body", children: [
          /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("p", { className: "pm-plan-op-head", children: [
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { className: "pm-plan-action", children: action }),
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { className: "pm-plan-op-text", children: item?.memory.content ?? op.memoryId })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("p", { className: "pm-plan-reason", children: [
            op.reason,
            op.into !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(import_jsx_runtime25.Fragment, { children: [
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { className: "pm-plan-into", children: t("library.batch.into", { name: nameOf(op.into) }) })
            ] }) : null
          ] }),
          held.has(op.memoryId) ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "pm-plan-held", children: t("library.batch.held") }) : null,
          op.action === "rewrite" && op.question !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "pm-plan-ask", children: [
            /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("p", { className: "pm-plan-question", children: [
              /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(StatusMarker, { kind: "pending" }),
              /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("span", { children: [
                t("library.batch.decide"),
                /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { id: questionId, children: op.question.text })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
              "input",
              {
                type: "text",
                className: "pm-edit-input",
                "aria-labelledby": questionId,
                placeholder: op.question.placeholder,
                value: answers[op.memoryId] ?? "",
                onChange: (event) => {
                  const value = event.target.value;
                  setAnswers((prev) => ({ ...prev, [op.memoryId]: value }));
                }
              }
            )
          ] }) : null
        ] })
      ] }, op.memoryId);
    }) }),
    error !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "pm-pending-error", role: "alert", children: error }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "pm-edit-foot pm-plan-foot", children: [
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { className: "pm-edit-hint", children: t("library.batch.summary", { changes: chosen.length, keeps: plan.ops.length - chosen.length }) }),
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(Button, { variant: "ghost", onClick: onRevise, children: t("library.batch.revise") }),
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(Button, { variant: "primary", unavailable: chosen.length === 0 ? t("library.batch.noChange") : void 0, onClick: confirm, children: t(isDeleteOnly ? "library.batch.next" : "library.batch.draft") })
    ] })
  ] });
}
function ApplyStep({ session, choice, picked, drafts: initialDrafts, onDiscardAll, onApply, onBehind, unavailable, feedback }) {
  const t = useT();
  const ops = chosenOps(choice);
  const [drafts, setDrafts] = (0, import_react25.useState)(initialDrafts);
  const [dropped, setDropped] = (0, import_react25.useState)(/* @__PURE__ */ new Set());
  const [held, setHeld] = (0, import_react25.useState)(/* @__PURE__ */ new Set());
  const [busy, setBusy] = (0, import_react25.useState)(/* @__PURE__ */ new Set());
  const [isConfirming, setConfirming] = (0, import_react25.useState)(false);
  const live = ops.filter((op) => !dropped.has(op.memoryId));
  const toggle = (op) => {
    const next = toggleWithDependents(op, ops, new Set(live.map((o) => o.memoryId)), held);
    setDropped(new Set(ops.filter((o) => !next.active.has(o.memoryId)).map((o) => o.memoryId)));
    setHeld(next.held);
  };
  const setItemBusy = (memoryId, isBusy) => {
    setBusy((prev) => {
      if (prev.has(memoryId) === isBusy) return prev;
      const next = new Set(prev);
      if (isBusy) next.add(memoryId);
      else next.delete(memoryId);
      return next;
    });
  };
  const deleting = live.filter((op) => op.action === "delete");
  const deletes = deleting.length;
  const nameOf = (memoryId) => picked.find((item) => item.memory.id === memoryId).memory.name;
  const refOf = (memoryId) => {
    const { ref } = picked.find((item) => item.memory.id === memoryId);
    return { memoryId: ref.memoryId, layer: ref.layer };
  };
  const apply2 = () => {
    onApply?.(applicationOf(choice, picked, drafts, dropped));
  };
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(import_jsx_runtime25.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("ul", { className: "pm-batch-items", "aria-label": t("library.batch.items"), children: ops.map((op) => {
      const item = picked.find((i) => i.memory.id === op.memoryId);
      const draft = drafts[op.memoryId];
      return op.action === "rewrite" && draft !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
        RewriteItem,
        {
          session,
          op,
          item,
          draft,
          request: choice.request,
          answer: choice.answers[op.memoryId],
          absorbs: deleting.filter((d) => d.into === op.memoryId).map((d) => refOf(d.memoryId)),
          isDropped: dropped.has(op.memoryId),
          onToggle: () => {
            toggle(op);
          },
          onDraft: (next) => {
            setDrafts((prev) => ({ ...prev, [op.memoryId]: next }));
          },
          onBusy: (isBusy) => {
            setItemBusy(op.memoryId, isBusy);
          },
          onBehind
        },
        op.memoryId
      ) : /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(
        "li",
        {
          className: ["pm-batch-item", dropped.has(op.memoryId) ? "pm-batch-item--dropped" : ""].filter(Boolean).join(" "),
          "aria-label": t("library.batch.op", { action: t("library.batch.action.delete"), name: item.memory.name }),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(ItemHead, { action: t("library.batch.action.delete"), name: item.memory.name, children: /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
              Button,
              {
                variant: "ghost",
                unavailable: dropped.has(op.memoryId) && isOrphanDelete(op, ops, new Set(live.map((o) => o.memoryId))) ? t("library.batch.dropHeld") : void 0,
                onClick: () => {
                  toggle(op);
                },
                children: t(dropped.has(op.memoryId) ? "library.batch.restore" : "library.batch.drop")
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "pm-batch-struck", children: /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("del", { children: item.memory.content }) }),
            op.into !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "pm-batch-item-note", children: t("library.batch.into", { name: nameOf(op.into) }) }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "pm-batch-item-note", children: t("library.batch.deleteNote") }),
            held.has(op.memoryId) ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "pm-plan-held", children: t("library.batch.dropHeld") }) : null
          ]
        },
        op.memoryId
      );
    }) }),
    /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "pm-edit-foot pm-plan-foot", children: [
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { className: "pm-edit-hint", children: t("library.batch.applySummary", { n: live.length, deletes, rewrites: live.length - deletes }) }),
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(Button, { variant: "ghost", unavailable, onClick: onDiscardAll, children: t("library.batch.discardAll") }),
      isConfirming ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
        SoftDeleteConfirm,
        {
          question: t("library.batch.confirmDelete", { n: deletes, names: deleting.map((op) => nameOf(op.memoryId)).join(t("library.batch.nameSep")) }),
          confirmLabel: t("library.batch.confirmApply"),
          onCancel: () => {
            setConfirming(false);
          },
          onConfirm: () => {
            setConfirming(false);
            apply2();
          }
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
        Button,
        {
          variant: "primary",
          unavailable: live.length === 0 ? t("library.batch.nothing") : busy.size > 0 ? t("library.batch.waitItem") : unavailable,
          onClick: () => {
            if (deletes > 0) setConfirming(true);
            else apply2();
          },
          children: t("library.batch.applyAll")
        }
      )
    ] }),
    feedback
  ] });
}
function ItemHead({ action, name, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "pm-batch-item-head", children: [
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { className: "pm-plan-action", children: action }),
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { className: "pm-batch-item-name", children: name }),
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { className: "pm-batch-item-actions", children })
  ] });
}
function RewriteItem({ session, op, item, draft, request, answer, absorbs, isDropped, onToggle, onDraft, onBusy, onBehind }) {
  const t = useT();
  const id = (0, import_react25.useId)();
  const gateway = useGateway();
  const model = gateway.useModel(session);
  const [phase, setPhaseState] = (0, import_react25.useState)({ kind: "idle" });
  const [rounds, setRounds] = (0, import_react25.useState)([]);
  const seq = (0, import_react25.useRef)(0);
  (0, import_react25.useEffect)(() => () => {
    seq.current += 1;
  }, []);
  const setPhase = (next) => {
    setPhaseState(next);
    onBusy(next.kind === "busy");
  };
  const { memory } = item;
  const label = t("library.batch.op", { action: t("library.batch.action.rewrite"), name: memory.name });
  const foot = requestFootOf(model, phase.kind !== "ask" || phase.text.trim() === "", t);
  const toggle = () => {
    if (!isDropped) {
      seq.current += 1;
      setPhase({ kind: "idle" });
    }
    onToggle();
  };
  const generate = (text) => {
    if (session.kind !== "ready" || text.trim() === "") return;
    const command = {
      cmd: "draft-edit",
      memories: [{ memoryId: memory.id, layer: scopeOfMemory(memory) }],
      request: text.trim(),
      priorRequests: [request, ...rounds],
      planNote: { reason: op.reason, ...op.question !== void 0 ? { question: op.question } : {}, ...answer !== void 0 ? { answer } : {} },
      ...absorbs.length > 0 ? { absorbs } : {},
      previous: draft
    };
    const refused = refuseBeforeSend(command);
    if (refused !== void 0) {
      setPhase({ kind: "ask", text, error: refused.isLocalized ? t(refused.detail) : refused.detail });
      return;
    }
    const mine = ++seq.current;
    setPhase({ kind: "busy", text });
    void gateway.execute(session.sessionId, command).then((r) => {
      if (mine !== seq.current) return;
      if (!r.ok && r.code === "not-found") {
        setPhase({ kind: "idle" });
        onBehind(r.memoryIds ?? [memory.id]);
        return;
      }
      if (!r.ok) {
        setPhase({ kind: "ask", text, error: modelFailureOf(command, r, t) });
        return;
      }
      if (r.draft === void 0) {
        setPhase({ kind: "ask", text, error: t("pending.model.invalid") });
        return;
      }
      onDraft(fillDraft(r.draft, draft));
      setRounds((prev) => [...prev, text.trim()]);
      setPhase({ kind: "idle" });
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("li", { className: ["pm-batch-item", isDropped ? "pm-batch-item--dropped" : ""].filter(Boolean).join(" "), "aria-label": label, children: [
    /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(ItemHead, { action: t("library.batch.action.rewrite"), name: memory.name, children: [
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(Button, { variant: "ghost", onClick: toggle, children: t(isDropped ? "library.batch.restore" : "library.batch.drop") }),
      !isDropped && phase.kind === "idle" ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(Button, { onClick: () => {
        setPhase({ kind: "ask", text: "" });
      }, children: t("pending.model.again") }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("div", { className: "pm-model-result", children: /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(DraftCompare, { memories: [memory], base: draftOf2(memory), draft }) }),
    phase.kind === "busy" ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(ModelBusy, { label: t("pending.model.busy"), onStop: () => {
      seq.current += 1;
      setPhase({ kind: "ask", text: phase.text });
    } }) : phase.kind === "ask" ? /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "pm-edit pm-batch-again", children: [
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
        RequestBox,
        {
          id,
          label: t("library.batch.againAsk"),
          value: phase.text,
          onChange: (text) => {
            setPhaseState({ kind: "ask", text });
          },
          intents: SINGLE_INTENTS,
          placeholder: t("library.model.placeholder")
        }
      ),
      phase.error !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "pm-pending-error", role: "alert", children: phase.error }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "pm-edit-foot", children: [
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { className: "pm-edit-hint", children: foot.hint }),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(Button, { variant: "ghost", onClick: () => {
          setPhase({ kind: "idle" });
        }, children: t("pending.cancel") }),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(Button, { variant: "primary", unavailable: foot.blocked, onClick: () => {
          generate(phase.text);
        }, children: t("pending.model.generate") })
      ] })
    ] }) : null
  ] });
}
var batchEditCss = `
.pm-batch { display: flex; flex-direction: column; gap: 16px; }
.pm-batch-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pm-batch-title { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.5; color: var(--pm-text); outline: none; }
.pm-batch-steps { display: flex; flex-wrap: wrap; gap: 6px 20px; margin: 0; padding: 0; list-style: none; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-batch-step { display: inline-flex; gap: 4px; }
.pm-batch-step--current { font-weight: 600; color: var(--pm-text); }
.pm-batch-picked { display: flex; flex-direction: column; gap: 2px; padding: 6px; border-radius: var(--dsw-radius-md, 12px); background: var(--pm-bg-block); }
.pm-batch-picked-list { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0; list-style: none; }
.pm-batch-picked-row { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 3px 4px 3px 8px; font-size: 13px; line-height: 1.5; color: var(--pm-text); }
.pm-batch-picked-text, .pm-plan-op-text { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.pm-batch-picked-count { margin: 0; padding: 2px 8px 4px; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); font-variant-numeric: tabular-nums; }
.pm-plan-understanding { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: var(--dsw-radius-md, 12px); background: var(--pm-bg-block); }
.pm-plan-understanding-title { margin: 0; font-size: 12px; font-weight: 600; line-height: 1.5; color: var(--pm-text-2); }
.pm-plan-understanding-text { margin: 0; font-size: 13px; line-height: 1.6; color: var(--pm-text); }
.pm-plan-ops { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.pm-plan-op { display: flex; gap: 10px; padding: 12px 0; }
.pm-plan-op + .pm-plan-op { border-top: .5px solid var(--pm-line); }
.pm-plan-check { flex-shrink: 0; align-self: flex-start; margin: 4px 0 0; accent-color: var(--pm-text); }
.pm-plan-op-body { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
.pm-plan-op-head { display: flex; align-items: center; gap: 8px; min-width: 0; margin: 0; font-size: 13px; line-height: 1.5; color: var(--pm-text); }
.pm-plan-action {
  flex-shrink: 0; padding: 1px 8px; border-radius: 6px; background: var(--pm-bg-block);
  font-size: 12px; font-weight: 600; line-height: 18px; color: var(--pm-text);
}
.pm-plan-op--keep .pm-plan-op-head { color: var(--pm-text-2); }
.pm-plan-reason, .pm-plan-held { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-plan-held { color: var(--pm-text); }
.pm-plan-ask { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; padding: 8px 10px; border-radius: var(--dsw-radius-sm, 8px); background: var(--pm-bg-block); }
.pm-plan-question { display: flex; align-items: baseline; gap: 6px; margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text); }
.pm-plan-question .pm-marker { align-self: center; }
.pm-plan-foot { padding-top: 12px; border-top: .5px solid var(--pm-line); }
/* \u5220\u9664\u786E\u8BA4\u7684\u95EE\u53E5\u5217\u51FA\u8981\u5220\u7684\u6BCF\u6761\u540D\u79F0\uFF0C\u53EF\u80FD\u5F88\u957F\uFF1A\u5728\u5E95\u680F\u91CC\u72EC\u5360\u4E00\u884C\u3001\u95EE\u53E5\u6362\u884C\uFF0C\u4E24\u4E2A\u94FE\u63A5\u4E0D\u6298\u884C */
.pm-plan-foot .pm-soft-confirm { flex: 1 1 100%; white-space: normal; }
.pm-plan-foot .pm-soft-confirm > :not(:first-child) { flex: none; white-space: nowrap; }
.pm-batch-items { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.pm-batch-item { display: flex; flex-direction: column; gap: 8px; padding: 12px 0; }
.pm-batch-item + .pm-batch-item { border-top: .5px solid var(--pm-line); }
.pm-batch-item--dropped > :not(.pm-batch-item-head), .pm-batch-item--dropped .pm-batch-item-head > :not(.pm-batch-item-actions) { opacity: .45; }
.pm-batch-item-head { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 13px; line-height: 1.5; color: var(--pm-text); }
.pm-batch-item-name { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-weight: 600; }
.pm-batch-item-actions { display: inline-flex; flex-shrink: 0; gap: 6px; }
.pm-batch-struck { margin: 0; font-size: 13px; line-height: 1.6; color: var(--pm-text-2); white-space: pre-wrap; overflow-wrap: anywhere; }
.pm-batch-struck del { text-decoration-color: var(--pm-text-2); }
.pm-batch-item-note { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
`;

// client/library/LibraryTab.tsx
var import_react32 = require("react");

// client/pending/cards.tsx
var import_react30 = require("react");

// client/ui/ConflictRuling.tsx
var import_jsx_runtime26 = require("react/jsx-runtime");
function ConflictRuling(props) {
  const t = useT();
  const side = (letter, memory) => /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("section", { className: "pm-conflict-side", "aria-label": t("conflict.side", { side: letter }), children: [
    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { className: "pm-ab", "aria-hidden": "true", children: letter }),
    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "pm-conflict-body", children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(RulingMemory, { ...props, memory }) })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(RulingShell, { ...props, title: props.title ?? t("conflict.title"), children: /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "pm-conflict-sides", children: [
    side("A", props.left),
    side("B", props.right)
  ] }) });
}
function VerticalConflictRuling(props) {
  const t = useT();
  return /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(RulingShell, { ...props, title: props.title ?? t("conflict.vertical.title"), note: t("conflict.vertical.baseline"), children: /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "pm-conflict-single", children: [
    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(RulingMemory, { ...props }),
    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("p", { className: "pm-conflict-baseline", children: t("conflict.vertical.baselineRef", { ref: props.baselineRef }) })
  ] }) });
}
function RulingShell({ layout, title, headExtra, note, footer, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("article", { className: `pm-conflict pm-conflict--${layout}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("header", { className: "pm-conflict-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { className: "pm-conflict-mark", children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(StatusMarker, { kind: "pending" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("h3", { className: "pm-conflict-title", children: title }),
      headExtra
    ] }),
    note !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("p", { className: "pm-conflict-note", children: note }) : null,
    children,
    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "pm-conflict-footer", children: footer })
  ] });
}
function RulingMemory({ layout, memory, now, typeLabel: typeLabel2, hideScope, projectName }) {
  const t = useT();
  return memory === null ? /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("p", { className: "pm-conflict-missing", children: t("conflict.missing") }) : /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(MemoryCard, { memory, now, typeLabel: typeLabel2?.(memory.type), hideScope, projectName: projectName?.(memory), collapsible: layout === "wide" });
}
var conflictRulingCss = `
.pm-conflict { padding-bottom: 18px; }
.pm-conflict-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
/* \u8BB0\u5FC6\u9875\uFF08\u5BBD\u7248\uFF09\u7684\u6807\u8BB0\u5217\u548C\u5904\u7406\u89C6\u56FE\u5176\u4ED6\u5361\u7247\u4E00\u6837 14px\uFF0C\u6807\u9898\u548C\u4E0B\u9762\u5404\u6BB5\u90FD\u4ECE 22px \u8D77\uFF1B\u4FA7\u680F\u7A84\u7248\u4E0D\u53D8 */
.pm-conflict-mark { display: inline-flex; }
.pm-conflict--wide .pm-conflict-mark { justify-content: center; flex: 0 0 14px; }
.pm-conflict--wide .pm-conflict-note { margin-left: 22px; }
/* \u6807\u9898\u662F\u6A21\u578B\u5199\u7684\u6458\u8981\uFF0C\u53EF\u80FD\u5E26\u957F\u51FD\u6570\u540D\u3001\u8DEF\u5F84\uFF1A\u5141\u8BB8\u5728\u4EFB\u610F\u5904\u6298\u884C\uFF0C\u4E0D\u628A\u53F3\u8FB9\u7684\u80F6\u56CA\u6324\u51FA\u53BB */
.pm-conflict-title { margin: 0; min-width: 0; overflow-wrap: anywhere; font-size: 14px; font-weight: 600; line-height: 1.5; color: var(--pm-text); }
.pm-conflict-note { margin: -6px 0 12px 16px; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-conflict-sides { display: flex; flex-direction: column; gap: 12px; }
.pm-conflict--wide .pm-conflict-sides { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; padding-left: 22px; }
.pm-conflict-side { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
.pm-conflict-body { display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 0; }
.pm-conflict-missing { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-ab {
  flex-shrink: 0; min-width: 10px;
  font-size: 13px; font-weight: 600; line-height: 22px; color: var(--pm-text-2);
}
.pm-conflict--wide .pm-conflict-side { padding: 12px 14px; border: .5px solid var(--pm-line-card); border-radius: var(--dsw-radius-lg, 16px); }
/* A / B \u6539\u6210\u4E0A\u4E0B\u6392\uFF1A\u8BB0\u5FC6\u9875\u7A84\u5C4F\uFF08pm-page 720px \u4EE5\u4E0B\uFF09\uFF0C\u6216\u4E3B\u533A\uFF08pm-main\uFF0C\u4E0D\u542B\u5DE6\u680F\uFF09\u5185\u5BB9\u5BBD 640px \u4EE5\u4E0B */
@container pm-page (max-width: 720px) { .pm-conflict--wide .pm-conflict-sides { grid-template-columns: minmax(0, 1fr); } }
@container pm-main (max-width: 640px) { .pm-conflict--wide .pm-conflict-sides { grid-template-columns: minmax(0, 1fr); } }
.pm-conflict-single { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.pm-conflict--wide .pm-conflict-single { padding-left: 22px; }
.pm-conflict-baseline { margin: 0; padding-left: 14px; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); overflow-wrap: anywhere; }
.pm-conflict-footer { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
.pm-conflict--wide .pm-conflict-footer { padding-left: 22px; }
/* footer \u91CC\u7684\u6309\u94AE\u884C\uFF08\u91C7\u7EB3\u5EFA\u8BAE\u3001\u4E09\u4E2A\u5019\u9009\u9879\uFF09\u9760\u5DE6\uFF0C\u91C7\u7EB3\u5728\u524D */
.pm-conflict-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
`;

// client/ui/DismissButton.tsx
var import_jsx_runtime27 = require("react/jsx-runtime");
function DismissButton({ label, unavailable, onClick }) {
  const blocked = unavailable !== void 0;
  return /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)(
    "button",
    {
      type: "button",
      className: "pm-dismiss",
      "aria-label": label,
      "aria-disabled": blocked || void 0,
      title: blocked ? unavailable : void 0,
      onClick: () => {
        if (!blocked) onClick();
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("span", { className: "pm-dismiss-label", "aria-hidden": "true", children: label }),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(CrossIcon, {})
      ]
    }
  );
}
var dismissButtonCss = `
.pm-dismiss {
  position: absolute; top: 0; right: 0; isolation: isolate; display: inline-flex; align-items: center; justify-content: flex-end;
  height: 24px; min-width: 24px; padding: 0 7px; border: 0; border-radius: var(--dsw-radius-sm, 8px);
  font: inherit; font-size: 12px; font-weight: 400; line-height: 1; white-space: nowrap;
  background: transparent; color: var(--pm-text-2); cursor: pointer;
  clip-path: inset(0 0 0 calc(100% - 24px) round var(--dsw-radius-sm, 8px));
  transition: color .15s ease-out, clip-path .2s cubic-bezier(0.23, 1, 0.32, 1);
}
.pm-dismiss::before { content: ''; position: absolute; inset: 0; z-index: -1; border-radius: inherit; transition: background-color .15s ease-out; }
.pm-dismiss-label { margin-right: 4px; opacity: 0; transition: opacity .15s ease-out; }
/* \u952E\u76D8\u805A\u7126\u65F6\u4E0D\u53EF\u7528\u4E5F\u5C55\u5F00\u51FA\u5B57\uFF08\u6574\u4F53\u534A\u900F\u660E\uFF09\uFF0C\u4E0D\u53EA\u5269\u4E00\u4E2A\u6DE1\u6DE1\u7684\u53C9 */
:is(.pm-dismiss:hover:not([aria-disabled='true']), .pm-dismiss:focus-visible) { background: var(--pm-bg); color: var(--pm-text); clip-path: inset(-4px round calc(var(--dsw-radius-sm, 8px) + 4px)); }
:is(.pm-dismiss:hover:not([aria-disabled='true']), .pm-dismiss:focus-visible)::before { background: var(--pm-hover); }
:is(.pm-dismiss:hover:not([aria-disabled='true']), .pm-dismiss:focus-visible) .pm-dismiss-label { opacity: 1; }
.pm-dismiss[aria-disabled='true'] { opacity: .4; cursor: default; }
@media (prefers-reduced-motion: reduce) { .pm-dismiss, .pm-dismiss::before, .pm-dismiss-label { transition: none; } }
`;

// client/pending/edit.tsx
var import_react26 = require("react");
var import_jsx_runtime28 = require("react/jsx-runtime");
function EditPanel({ initial, original, isMerge, unavailable, onCancel, onSave, onStateChange }) {
  const t = useT();
  const id = (0, import_react26.useId)();
  const [draft, setDraft] = (0, import_react26.useState)(initial);
  const [isMoreOpen, setMoreOpen] = (0, import_react26.useState)(false);
  const [tagText, setTagText] = (0, import_react26.useState)("");
  const [hasSaved, setSaved] = (0, import_react26.useState)(false);
  (0, import_react26.useEffect)(() => {
    if (hasSaved && unavailable === void 0) setSaved(false);
  }, [hasSaved, unavailable]);
  const [isSummaryWanted, setSummaryWanted] = (0, import_react26.useState)(false);
  const summaryRef = (0, import_react26.useRef)(null);
  const root = (0, import_react26.useRef)(null);
  useReturnFocus(root);
  (0, import_react26.useEffect)(() => {
    if (!isSummaryWanted || !isMoreOpen) return;
    summaryRef.current?.focus();
    setSummaryWanted(false);
  }, [isSummaryWanted, isMoreOpen]);
  const set = (patch) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };
  const content = draft.content.trim();
  const isSummaryStale = content !== original.content.trim() && draft.summary === original.summary;
  const isEmpty = content === "" || draft.name.trim() === "";
  const isDirty = tagText.trim() !== "" || draft.content !== initial.content || draft.name !== initial.name || draft.summary !== initial.summary || draft.tags.join("\n") !== initial.tags.join("\n");
  useReportEditState(onStateChange, hasSaved && unavailable !== void 0 ? "saving" : "idle", isDirty);
  const addTag = (event) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const tag = tagText.trim();
    if (tag !== "" && !draft.tags.includes(tag)) set({ tags: [...draft.tags, tag] });
    setTagText("");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("div", { ref: root, className: "pm-edit", children: [
    /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("label", { className: "pm-edit-label", htmlFor: `${id}-content`, children: t("pending.edit.content") }),
    /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
      "textarea",
      {
        id: `${id}-content`,
        className: "pm-edit-input pm-edit-content",
        value: draft.content,
        autoFocus: true,
        onChange: (event) => {
          set({ content: event.target.value });
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)(
      "button",
      {
        type: "button",
        className: "pm-edit-more",
        "aria-expanded": isMoreOpen,
        "aria-controls": `${id}-more`,
        onClick: () => {
          setMoreOpen((open) => !open);
        },
        children: [
          t(isMoreOpen ? "pending.edit.less" : "pending.edit.more"),
          /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(Icon, { name: "chevronDownMedium", size: 12 })
        ]
      }
    ),
    isMoreOpen ? /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("div", { id: `${id}-more`, className: "pm-edit-fields", children: [
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("label", { className: "pm-edit-label", htmlFor: `${id}-name`, children: t("pending.edit.name") }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("input", { id: `${id}-name`, className: "pm-edit-input", value: draft.name, onChange: (event) => {
        set({ name: event.target.value });
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("label", { className: "pm-edit-label", htmlFor: `${id}-summary`, children: t("pending.edit.summary") }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("input", { id: `${id}-summary`, ref: summaryRef, className: "pm-edit-input", value: draft.summary, onChange: (event) => {
        set({ summary: event.target.value });
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("label", { className: "pm-edit-label", htmlFor: `${id}-tag`, children: t("pending.edit.tags") }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("div", { className: "pm-edit-tags", children: [
        draft.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("span", { className: "pm-edit-tag", children: [
          tag,
          /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("button", { type: "button", "aria-label": t("pending.edit.removeTag", { tag }), onClick: () => {
            set({ tags: draft.tags.filter((x) => x !== tag) });
          }, children: /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(CrossIcon, { size: 8 }) })
        ] }, tag)),
        /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
          "input",
          {
            id: `${id}-tag`,
            className: "pm-edit-tag-input",
            placeholder: t("pending.edit.tagPlaceholder"),
            value: tagText,
            onChange: (event) => {
              setTagText(event.target.value);
            },
            onKeyDown: addTag
          }
        )
      ] })
    ] }) : null,
    isSummaryStale ? /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("p", { className: "pm-pending-hint", children: [
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("span", { children: t("pending.edit.summaryStale") }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("button", { type: "button", className: "pm-link", onClick: () => {
        setMoreOpen(true);
        setSummaryWanted(true);
      }, children: t("pending.edit.summaryFix") })
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("div", { className: "pm-edit-foot", children: [
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("span", { className: "pm-edit-hint", children: isMerge ? /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)(import_jsx_runtime28.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("span", { children: t("pending.edit.mergeNote") }),
        isMoreOpen ? /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("span", { children: t("pending.edit.typeFixed") }) : null
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("span", { children: t("pending.edit.note") }) }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("span", { className: "pm-edit-count", children: t("pending.edit.count", { from: formatNumber(original.chars), to: formatNumber(content.length) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(Button, { variant: "ghost", unavailable, onClick: onCancel, children: t("pending.cancel") }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
        Button,
        {
          variant: "primary",
          unavailable: unavailable ?? (isEmpty ? t("pending.edit.empty") : void 0),
          onClick: () => {
            setSaved(true);
            onSave({ content, name: draft.name.trim(), summary: draft.summary.trim(), tags: draft.tags });
          },
          children: t("pending.edit.save")
        }
      )
    ] })
  ] });
}
var editCss = `
.pm-edit { display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: var(--dsw-radius-md, 12px); background: var(--pm-bg-block); }
.pm-edit-label { font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-edit-input {
  width: 100%; padding: 6px 10px; font: inherit; font-size: 13px; line-height: 1.6; color: var(--pm-text); background: var(--pm-bg);
  border: .5px solid var(--pm-line-input); border-radius: var(--dsw-radius-sm, 8px);
}
.pm-edit-input::placeholder { color: var(--pm-text-2); }
.pm-edit-input:focus-visible, .pm-edit-tags:focus-within { outline: var(--dsw-focus-ring-width, 2px) solid var(--pm-focus); outline-offset: 0; }
.pm-edit-content { min-height: 120px; resize: vertical; }
.pm-edit-more {
  display: inline-flex; align-items: center; gap: 2px; align-self: flex-start; padding: 2px 0; border: 0; background: none;
  font: inherit; font-size: 12px; color: var(--pm-text-2); cursor: pointer;
}
.pm-edit-more svg { transition: transform 120ms ease; }
.pm-edit-more[aria-expanded='true'] svg { transform: rotate(180deg); }
@media (prefers-reduced-motion: reduce) { .pm-edit-more svg { transition: none; } }
.pm-edit-more:hover { color: var(--pm-text); }
.pm-edit-fields { display: flex; flex-direction: column; gap: 6px; }
.pm-edit-fields .pm-edit-label { margin-top: 4px; }
.pm-edit-tags {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 4px 6px; background: var(--pm-bg);
  border: .5px solid var(--pm-line-input); border-radius: var(--dsw-radius-sm, 8px);
}
.pm-edit-tag { display: inline-flex; align-items: center; height: 22px; padding-left: 8px; border-radius: 6px; background: var(--pm-hover); font-size: 12px; color: var(--pm-text); }
.pm-edit-tag button { display: inline-flex; align-items: center; align-self: stretch; padding: 0 6px; border: 0; background: none; font: inherit; color: var(--pm-text-2); cursor: pointer; }
.pm-edit-tag button:hover { color: var(--pm-text); }
.pm-edit-tag-input { flex: 1; min-width: 120px; height: 22px; border: 0; outline: 0; background: none; font: inherit; font-size: 12px; color: var(--pm-text); }
.pm-edit-tag-input::placeholder { color: var(--pm-text-2); }
.pm-edit-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 4px; }
.pm-edit-hint { display: flex; flex-wrap: wrap; gap: 0 12px; margin-right: auto; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-edit-count { font-size: 12px; line-height: 1.5; color: var(--pm-text-2); font-variant-numeric: tabular-nums; }
.pm-pending-done { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.pm-pending-done-text { flex: 1; min-width: 0; font-size: 13px; line-height: 1.5; color: var(--pm-text); overflow-wrap: anywhere; }
`;

// client/pending/move.tsx
var import_react27 = require("react");
var import_jsx_runtime29 = require("react/jsx-runtime");
function MovePanel({ projects, initial, unavailable, onCancel, onMove }) {
  const t = useT();
  const ref = (0, import_react27.useRef)(null);
  useReturnFocus(ref);
  const name = (0, import_react27.useId)();
  const [selected, setSelected] = (0, import_react27.useState)(initial !== void 0 && projects.includes(initial) ? initial : projects[0]);
  const labels = projectLabels(projects);
  return /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)("fieldset", { ref, className: "pm-move", children: [
    /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("legend", { className: "pm-pending-text pm-pending-confirm-title", children: t("pending.move.title") }),
    projects.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("p", { className: "pm-pending-text", children: t("pending.move.none") }) : /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "pm-move-list", children: projects.map((path) => /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)("label", { className: "pm-move-option", children: [
      /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(
        "input",
        {
          type: "radio",
          name,
          value: path,
          checked: selected === path,
          autoFocus: selected === path,
          onChange: () => {
            setSelected(path);
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("span", { className: "pm-move-name", children: labels.get(path) })
    ] }, path)) }),
    /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)("div", { className: "pm-pending-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(Button, { variant: "ghost", autoFocus: selected === void 0, onClick: onCancel, children: t("pending.cancel") }),
      /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(
        Button,
        {
          variant: "primary",
          unavailable: unavailable ?? (selected === void 0 ? t("pending.move.none") : void 0),
          onClick: () => {
            if (selected !== void 0) onMove(selected);
          },
          children: t("pending.move.confirm")
        }
      )
    ] })
  ] });
}
function projectLabels(paths) {
  const parts = new Map(paths.map((path) => [path, path.split(/[\\/]+/).filter(Boolean)]));
  const tail = (path, depth) => parts.get(path).slice(-depth).join("/") || path;
  const labels = new Map(paths.map((path) => [path, tail(path, 1)]));
  for (let depth = 2; ; depth++) {
    const seen = /* @__PURE__ */ new Map();
    for (const label of labels.values()) seen.set(label, (seen.get(label) ?? 0) + 1);
    const clashing = paths.filter((path) => seen.get(labels.get(path)) > 1 && parts.get(path).length >= depth);
    if (clashing.length === 0) return labels;
    for (const path of clashing) labels.set(path, tail(path, depth));
  }
}
var moveCss = `
.pm-move { display: flex; flex-direction: column; gap: 8px; min-width: 0; margin: 0; padding: 12px; border: 0; border-radius: var(--dsw-radius-md, 12px); background: var(--pm-bg-block); }
.pm-move legend { float: left; width: 100%; padding: 0; }
.pm-move-list { display: flex; flex-direction: column; gap: 2px; }
.pm-move-option { display: flex; align-items: baseline; gap: 8px; min-width: 0; padding: 4px 0; font-size: 13px; line-height: 1.5; color: var(--pm-text); cursor: pointer; }
.pm-move-option input { flex-shrink: 0; margin: 0; accent-color: var(--pm-text); transform: translateY(2px); }
.pm-move-option input:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--pm-focus); outline-offset: 2px; }
/* \u9879\u76EE\u540D\u592A\u957F\u65F6\u6298\u884C */
.pm-move-name { min-width: 0; overflow-wrap: anywhere; }
`;

// client/pending/proposal.tsx
var import_react29 = require("react");

// client/pending/suggestion.tsx
var import_react28 = require("react");
var import_jsx_runtime30 = require("react/jsx-runtime");
var ACTION_LABEL = {
  "merge": "pending.suggestion.action.merge",
  "keep-a": "pending.suggestion.action.keepA",
  "keep-b": "pending.suggestion.action.keepB",
  "keep-both": "pending.suggestion.action.keepBoth",
  "rewrite": "pending.suggestion.action.rewrite",
  "delete": "pending.suggestion.action.delete"
};
var WAIT_FOR_VIEW_MS = 5e3;
var signatureOf = (none) => JSON.stringify(none ?? null);
function failureText2(cause, t) {
  if (cause.kind === "secret-in-draft") return t("pending.suggestion.secretInDraft");
  return causeText({ kind: cause.kind, ...cause.hostCode !== void 0 ? { hostCode: cause.hostCode } : {} }, t);
}
function SuggestionBlock({ decisionId, left, right, suggestion, noSuggestion, isGenerating = false, notice, session, onRefused }) {
  const t = useT();
  const gateway = useGateway();
  const model = gateway.useModel(session, { shouldAsk: false });
  const isBatchCurrent = (0, import_react28.useContext)(BatchSuggesting) === decisionId;
  const [phase, setPhase] = (0, import_react28.useState)({ kind: "idle" });
  const seq = (0, import_react28.useRef)(0);
  const sessionId = session.kind === "ready" ? session.sessionId : void 0;
  (0, import_react28.useEffect)(() => () => {
    seq.current += 1;
    setPhase({ kind: "idle" });
  }, [sessionId]);
  const signature = signatureOf(noSuggestion);
  const latestSignature = (0, import_react28.useRef)(signature);
  latestSignature.current = signature;
  (0, import_react28.useEffect)(() => {
    setPhase((prev) => (prev.kind === "waiting" || prev.kind === "failed") && (suggestion !== void 0 || prev.signature !== signature) ? { kind: "idle" } : prev);
  }, [signature, suggestion]);
  const isWaiting = phase.kind === "waiting";
  (0, import_react28.useEffect)(() => {
    if (!isWaiting) return;
    const timer = setTimeout(() => {
      setPhase((prev) => prev.kind === "waiting" ? { kind: "idle" } : prev);
    }, WAIT_FOR_VIEW_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [isWaiting]);
  if (suggestion !== void 0) return /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(SuggestionView, { suggestion, left, right });
  if (noSuggestion === void 0) return null;
  const isVertical = right === void 0;
  const generate = () => {
    if (session.kind !== "ready") return;
    const command = { cmd: "suggest", decisionId };
    const mine = ++seq.current;
    const clicked = signature;
    keepFocusInPlace();
    setPhase({ kind: "busy" });
    void gateway.execute(session.sessionId, command).then((r) => {
      if (mine !== seq.current) return;
      const isViewChanged = latestSignature.current !== clicked;
      if (r.ok) {
        setPhase(isViewChanged ? { kind: "idle" } : { kind: "waiting", signature: clicked });
        return;
      }
      if (r.code === "llm-unavailable") {
        setPhase({ kind: "unavailable" });
        return;
      }
      if (r.code === "claimed") {
        setPhase({ kind: "idle" });
        return;
      }
      if (interpret(command, r).kind === "handled-elsewhere") {
        setPhase({ kind: "idle" });
        onRefused();
        return;
      }
      setPhase(isViewChanged ? { kind: "idle" } : { kind: "failed", message: modelFailureOf(command, r, t), signature: clicked });
    });
  };
  const stop = () => {
    seq.current += 1;
    setPhase({ kind: "idle" });
  };
  if (phase.kind === "busy" || phase.kind === "waiting") {
    return /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("div", { className: "pm-suggestion", children: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(ModelBusy, { label: t("pending.suggestion.busy"), onStop: stop }) });
  }
  if ((isGenerating || isBatchCurrent) && notice === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("div", { className: "pm-suggestion", children: /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)("div", { className: "pm-model-busy", role: "status", children: [
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("span", { className: "pm-model-dot", "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("span", { children: t("pending.suggestion.busy") })
    ] }) });
  }
  if (noSuggestion.code === "has-secret") {
    const side = left.hasSecret === true && right?.hasSecret === true ? "A\u3001B" : left.hasSecret === true ? "A" : "B";
    return /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("div", { className: "pm-suggestion", children: /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)("p", { className: "pm-suggestion-line", children: [
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("strong", { className: "pm-suggestion-title", children: t("pending.suggestion.none") }),
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("span", { children: isVertical ? t("pending.suggestion.secretVertical") : t("pending.suggestion.secret", { side }) })
    ] }) });
  }
  const isUnavailable = model.status === "unavailable" || phase.kind === "unavailable";
  const isUndecided = noSuggestion.code === "undecided";
  const reason = notice ?? (isUndecided ? noSuggestion.reason : isUnavailable ? t("pending.model.unavailable") : noSuggestion.code === "failed" && noSuggestion.cause !== void 0 ? t("pending.suggestion.failed", { reason: failureText2(noSuggestion.cause, t) }) : phase.kind === "failed" ? void 0 : noSuggestion.code === "quota-exhausted" ? t("pending.suggestion.quotaExhausted") : noSuggestion.code === "no-baseline" ? t("pending.suggestion.noBaseline") : t(isVertical ? "pending.suggestion.notGeneratedVertical" : "pending.suggestion.notGenerated"));
  const isRetry = phase.kind === "failed" || noSuggestion.code === "failed" || isUndecided;
  return /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)("div", { className: "pm-suggestion", children: [
    /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)("p", { className: "pm-suggestion-line", role: notice !== void 0 ? "status" : void 0, children: [
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("strong", { className: "pm-suggestion-title", children: t(notice !== void 0 ? "pending.suggestion.none" : isUndecided ? "pending.suggestion.undecided" : "pending.suggestion.missing") }),
      reason !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("span", { children: reason }) : null
    ] }),
    phase.kind === "failed" ? /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("p", { className: "pm-pending-error", role: "alert", children: phase.message }) : null,
    isUnavailable ? null : /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("div", { className: "pm-suggestion-actions", children: /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)(Button, { unavailable: session.kind === "ready" ? void 0 : t("session.none.hint"), onClick: generate, children: [
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(Icon, { name: "sparkle", size: 14 }),
      t(isRetry ? "pending.suggestion.retry" : "pending.suggestion.generate")
    ] }) })
  ] });
}
var BatchSuggesting = (0, import_react28.createContext)(void 0);
function isMissingSuggestion(item) {
  if (item.level !== "your-call") return false;
  if (item.kind !== "conflict-horizontal" && item.kind !== "conflict-vertical") return false;
  if (item.kind === "conflict-horizontal" ? item.left === null || item.right === null : item.memory === null) return false;
  if (item.suggestion !== void 0 || item.isGeneratingSuggestion === true) return false;
  const code = item.noSuggestion?.code;
  return code === "not-generated" || code === "failed" || code === "quota-exhausted" || item.kind === "conflict-vertical" && code === "no-baseline";
}
function SuggestAll({ items, session, onCurrent }) {
  const t = useT();
  const gateway = useGateway();
  const model = gateway.useModel(session, { shouldAsk: false });
  const [phase, setPhase] = (0, import_react28.useState)({ kind: "idle" });
  const seq = (0, import_react28.useRef)(0);
  const current = (0, import_react28.useRef)(onCurrent);
  current.current = onCurrent;
  const missing = (0, import_react28.useRef)(items);
  missing.current = items;
  const sessionId = session.kind === "ready" ? session.sessionId : void 0;
  (0, import_react28.useEffect)(() => () => {
    seq.current += 1;
    setPhase({ kind: "idle" });
    current.current(void 0);
  }, [sessionId]);
  const run = async () => {
    if (session.kind !== "ready") return;
    const ids = items.map((item) => item.decisionId);
    const mine = ++seq.current;
    keepFocusInPlace();
    for (const [index, decisionId] of ids.entries()) {
      if (mine !== seq.current) return;
      if (!missing.current.some((item) => item.decisionId === decisionId)) continue;
      setPhase({ kind: "running", at: index + 1, total: ids.length });
      current.current(decisionId);
      const r = await gateway.execute(session.sessionId, { cmd: "suggest", decisionId });
      if (mine !== seq.current) return;
      if (!r.ok && r.code === "llm-unavailable") {
        current.current(void 0);
        setPhase({ kind: "unavailable" });
        return;
      }
    }
    current.current(void 0);
    setPhase({ kind: "idle" });
  };
  const stop = () => {
    seq.current += 1;
    current.current(void 0);
    setPhase({ kind: "idle" });
  };
  if (phase.kind === "running") {
    return /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("div", { className: "pm-suggest-all", children: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(ModelBusy, { label: t("pending.suggestAll.progress", { at: formatNumber(phase.at), total: formatNumber(phase.total) }), onStop: stop }) });
  }
  if (phase.kind === "unavailable") return /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("p", { className: "pm-suggest-all", role: "alert", children: t("pending.model.unavailable") });
  if (items.length < 2 || model.status === "unavailable") return null;
  return /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)("div", { className: "pm-suggest-all", children: [
    /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("span", { children: t("pending.suggestAll.missing", { n: formatNumber(items.length) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("i", { className: "pm-sep", "aria-hidden": "true", children: "\xB7" }),
    /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)(Button, { variant: "ghost", size: "sm", unavailable: session.kind === "ready" ? void 0 : t("session.none.hint"), onClick: () => {
      void run();
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(Icon, { name: "sparkle", size: 14 }),
      t("pending.suggestAll.run")
    ] })
  ] });
}
function SuggestionView({ suggestion, left, right }) {
  const t = useT();
  const [isComparing, setComparing] = (0, import_react28.useState)(false);
  const edit = suggestion.ops.find((op) => op.kind === "edit");
  const keeper = edit === void 0 ? void 0 : edit.memoryId === right?.id ? right : left;
  const draft = edit === void 0 ? void 0 : { content: edit.content, name: edit.name, summary: edit.summary, tags: edit.tags };
  return /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)("div", { className: "pm-suggestion", children: [
    /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)("p", { className: "pm-suggestion-line", children: [
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("span", { className: "pm-suggestion-icon", children: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(Icon, { name: "sparkle", size: 14 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("strong", { className: "pm-suggestion-title", children: t(ACTION_LABEL[suggestion.action]) }),
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("span", { children: suggestion.reason })
    ] }),
    keeper !== void 0 && draft !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)("div", { className: "pm-suggestion-draft", children: [
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("p", { className: "pm-suggestion-into", children: suggestion.action === "rewrite" ? t("pending.suggestion.rewriteInto") : t("pending.suggestion.mergeInto", keeper === right ? { keep: "B", drop: "A" } : { keep: "A", drop: "B" }) }),
      isComparing ? /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(DraftCompare, { memories: [keeper], base: { content: keeper.content, name: keeper.name, summary: keeper.summary, tags: keeper.tags }, draft }) : /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("p", { className: "pm-model-text", children: draft.content }),
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(Button, { variant: "ghost", size: "sm", "aria-expanded": isComparing, onClick: () => {
        setComparing((v) => !v);
      }, children: t(isComparing ? "pending.suggestion.compareHide" : "pending.suggestion.compare") })
    ] }) : null
  ] });
}
var suggestionCss = `
.pm-suggestion { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border-radius: var(--dsw-radius-md, 12px); background: var(--pm-accent-tint); }
.pm-suggestion-line { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: 1em; row-gap: 2px; margin: 0; font-size: 13px; line-height: 1.5; color: var(--pm-text); }
.pm-suggestion-icon { display: inline-flex; align-self: center; color: var(--pm-accent); }
.pm-suggestion-line .pm-suggestion-icon { margin-right: -0.5em; }
.pm-suggestion-title { font-weight: 600; }
.pm-suggestion-draft { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; min-width: 0; }
.pm-suggestion-draft > * { max-width: 100%; }
.pm-suggestion-into { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-suggestion-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.pm-suggest-all { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-suggest-all .pm-sep { margin: 0; }
.pm-suggest-all .pm-model-busy { flex: 1; font-size: 12px; }
`;

// client/pending/proposal.tsx
var import_jsx_runtime31 = require("react/jsx-runtime");
var { horizontal, vertical } = CONFLICT_ACTION_VERDICTS;
var CANDIDATES = [
  { id: horizontal.keepA, label: "pending.conflict.keepA" },
  { id: horizontal.keepB, label: "pending.conflict.keepB" },
  { id: "merge", label: "pending.proposal.merge", template: "pending.proposal.merge.template" },
  { id: horizontal.keepBoth, label: "pending.conflict.keepBoth" }
];
var VERTICAL_CANDIDATES = [
  { id: vertical.keepBaseline, label: "pending.vertical.delete" },
  { id: "rewrite", label: "pending.vertical.rewrite", template: "pending.vertical.rewrite.template" },
  { id: vertical.keepMemory, label: "pending.conflict.keepBoth" }
];
var isVerdict = (id) => id === horizontal.keepA || id === horizontal.keepB || id === horizontal.keepBoth;
function ProposalRequest({ decisionId, left, right, session, unavailable, isHidden, voided, discardAsk, onClose, onPick, onApply, onRefused, onDirtyChange }) {
  const t = useT();
  const id = (0, import_react29.useId)();
  const gateway = useGateway();
  const isVertical = right === void 0;
  const memories = right === void 0 ? [left] : [left, right];
  const model = gateway.useModel(session);
  const [phase, setPhase] = (0, import_react29.useState)({ kind: "ask" });
  const [request, setRequest] = (0, import_react29.useState)("");
  const [priorRequests, setPriorRequests] = (0, import_react29.useState)([]);
  const [previous, setPrevious] = (0, import_react29.useState)(void 0);
  const seq = (0, import_react29.useRef)(0);
  (0, import_react29.useEffect)(() => () => {
    seq.current += 1;
  }, []);
  const root = (0, import_react29.useRef)(null);
  useReturnFocus(root);
  const isDirty = request.trim() !== "" || phase.kind !== "ask" || previous !== void 0 || priorRequests.length > 0;
  const dirtyChange = (0, import_react29.useRef)(onDirtyChange);
  dirtyChange.current = onDirtyChange;
  (0, import_react29.useEffect)(() => {
    dirtyChange.current(isDirty);
  }, [isDirty]);
  (0, import_react29.useEffect)(() => () => {
    dirtyChange.current(false);
  }, []);
  const invalidate = () => {
    seq.current += 1;
    setPrevious(void 0);
    setPhase((prev) => prev.kind === "ask" ? prev : { kind: "ask", notice: t(isVertical ? "pending.vertical.stale" : "pending.proposal.stale") });
  };
  const target = memories.map((m) => `${m.id}@${m.updatedAt}@${m.digest ?? ""}`).join("|");
  const lastTarget = (0, import_react29.useRef)(target);
  (0, import_react29.useEffect)(() => {
    if (lastTarget.current === target) return;
    lastTarget.current = target;
    invalidate();
  }, [target]);
  const lastVoided = (0, import_react29.useRef)(voided);
  (0, import_react29.useEffect)(() => {
    if (lastVoided.current === voided) return;
    lastVoided.current = voided;
    invalidate();
  }, [voided]);
  const generate = () => {
    if (session.kind !== "ready") return;
    const text = request.trim();
    if (text === "") return;
    const command = {
      cmd: "draft-proposal",
      decisionId,
      request: text,
      bases: right === void 0 ? [baseOf(left)] : [baseOf(left), baseOf(right)],
      ...priorRequests.length > 0 ? { priorRequests } : {},
      ...previous !== void 0 ? { previous } : {}
    };
    const refused = refuseBeforeSend(command);
    if (refused !== void 0) {
      setPhase({ kind: "ask", error: refused.isLocalized ? t(refused.detail) : refused.detail });
      return;
    }
    const mine = ++seq.current;
    keepFocusInPlace();
    setPhase({ kind: "busy" });
    void gateway.execute(session.sessionId, command).then((r) => {
      if (mine !== seq.current) return;
      if (!r.ok) {
        if (r.code === "stale") {
          invalidate();
          return;
        }
        if (interpret(command, r).kind === "handled-elsewhere") {
          setPhase({ kind: "ask" });
          onRefused();
          return;
        }
        setPhase({ kind: "ask", error: modelFailureOf(command, r, t) });
        return;
      }
      if (r.infeasible !== void 0) {
        setPhase({ kind: "infeasible", reason: r.infeasible.reason });
        return;
      }
      if (r.proposal === void 0) {
        setPhase({ kind: "ask", error: t("pending.model.invalid") });
        return;
      }
      setPhase({ kind: "result", proposal: r.proposal });
    });
  };
  const stop = () => {
    seq.current += 1;
    setPhase({ kind: "ask" });
  };
  const again = () => {
    const text = request.trim();
    if (text !== "") setPriorRequests((prior) => [...prior, text]);
    if (phase.kind === "result") {
      const { action, reason, ops } = phase.proposal;
      setPrevious({ action, reason, ops });
    }
    setRequest("");
    setPhase({ kind: "ask" });
  };
  const className = phase.kind === "result" ? "pm-edit pm-proposal pm-model-result" : "pm-edit pm-proposal";
  let body;
  if (phase.kind === "busy") {
    body = /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(ModelBusy, { label: t("pending.proposal.busy"), onStop: stop });
  } else if (phase.kind === "ask") {
    const foot = requestFootOf(model, request.trim() === "", t, void 0, "pending.proposal.empty");
    const hint = foot.blocked !== void 0 ? foot.hint : model.status === "ready" && model.model !== void 0 ? t("pending.proposal.hint", { model: model.model }) : "";
    body = /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)(import_jsx_runtime31.Fragment, { children: [
      phase.notice !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { className: "pm-proposal-notice", role: "status", children: phase.notice }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(
        RequestBox,
        {
          id,
          label: t(isVertical ? "pending.vertical.ask" : "pending.proposal.ask"),
          value: request,
          onChange: setRequest,
          intents: isVertical ? VERTICAL_CANDIDATES : CANDIDATES,
          intentsLabel: t("pending.proposal.intents"),
          onPick: (picked) => {
            if (isVerdict(picked)) onPick(picked);
          },
          placeholder: t(isVertical ? "pending.vertical.placeholder" : "pending.proposal.placeholder")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("p", { className: "pm-model-note", children: [
        /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(Icon, { name: "info", size: 14 }),
        /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("span", { children: t(isVertical ? "pending.vertical.note" : "pending.proposal.note") })
      ] }),
      phase.error !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { className: "pm-pending-error", role: "alert", children: phase.error }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { className: "pm-edit-foot", children: [
        /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("span", { className: "pm-edit-hint", children: hint }),
        /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(Button, { variant: "ghost", unavailable, onClick: onClose, children: t("pending.cancel") }),
        /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(Button, { variant: "primary", unavailable: unavailable ?? foot.blocked, onClick: generate, children: t("pending.proposal.generate") })
      ] })
    ] });
  } else {
    body = /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)(import_jsx_runtime31.Fragment, { children: [
      phase.kind === "result" ? /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(ProposalView, { proposal: phase.proposal, left, right }) : /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("p", { className: "pm-suggestion-line", children: [
        /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("strong", { className: "pm-suggestion-title", children: t("pending.proposal.infeasible") }),
        /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("span", { children: phase.reason })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { className: "pm-edit-foot", children: [
        /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("span", { className: "pm-edit-hint" }),
        /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(Button, { variant: "ghost", unavailable, onClick: onClose, children: t("pending.cancel") }),
        /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(Button, { unavailable, onClick: again, children: t("pending.proposal.again") }),
        phase.kind === "result" ? /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(Button, { variant: "primary", unavailable, onClick: () => {
          onApply(phase.proposal);
        }, children: t("pending.model.apply") }) : null
      ] })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)(import_jsx_runtime31.Fragment, { children: [
    isHidden === true ? discardAsk : null,
    /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { ref: root, className, hidden: isHidden, children: [
      isHidden === true ? null : discardAsk,
      body
    ] })
  ] });
}
function ProposalView({ proposal, left, right }) {
  const t = useT();
  const edit = proposal.ops.find((op) => op.kind === "edit");
  const kept = proposal.action === "keep-a" ? left : proposal.action === "keep-b" ? right : void 0;
  let detail = null;
  if (proposal.action === "rewrite" && edit?.kind === "edit") {
    detail = /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { className: "pm-suggestion-draft", children: [
      /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { className: "pm-suggestion-into", children: t("pending.suggestion.rewriteInto") }),
      /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(DraftCompare, { memories: [left], base: draftOf2(left), draft: { content: edit.content, name: edit.name, summary: edit.summary, tags: edit.tags } })
    ] });
  } else if (proposal.action === "delete") {
    detail = /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { className: "pm-suggestion-into", children: t("pending.vertical.deleteNote") });
  } else if (proposal.action === "keep-both" && right === void 0) {
    detail = /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { className: "pm-suggestion-into", children: t("pending.vertical.keepBothNote") });
  } else if (proposal.action === "merge" && edit?.kind === "edit" && right !== void 0) {
    const keeper = edit.memoryId === right.id ? right : left;
    detail = /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { className: "pm-suggestion-draft", children: [
      /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { className: "pm-suggestion-into", children: t("pending.suggestion.mergeInto", keeper === right ? { keep: "B", drop: "A" } : { keep: "A", drop: "B" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(DraftCompare, { memories: [keeper], base: draftOf2(keeper), draft: { content: edit.content, name: edit.name, summary: edit.summary, tags: edit.tags } })
    ] });
  } else if (kept !== void 0) {
    detail = /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)(import_jsx_runtime31.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("div", { className: "pm-model-body", children: /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { className: "pm-model-text", children: kept.content }) }),
      /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { className: "pm-suggestion-into", children: t("pending.proposal.dropNote", { drop: kept === left ? "B" : "A" }) })
    ] });
  } else if (proposal.action === "keep-both") {
    detail = /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { className: "pm-suggestion-into", children: t("pending.proposal.keepBothNote") });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)(import_jsx_runtime31.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("p", { className: "pm-suggestion-line", children: [
      /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("span", { className: "pm-suggestion-icon", children: /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(Icon, { name: "sparkle", size: 14 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("strong", { className: "pm-suggestion-title", children: t(ACTION_LABEL[proposal.action]) }),
      /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("span", { children: proposal.reason })
    ] }),
    detail
  ] });
}
function useRequestSlots() {
  const [state, setState] = (0, import_react29.useState)({});
  const dirty = (0, import_react29.useRef)(/* @__PURE__ */ new Set());
  const actions = (0, import_react29.useMemo)(() => ({
    want(decisionId) {
      setState((s) => s.openId === void 0 || s.openId === decisionId || !dirty.current.has(s.openId) ? { openId: decisionId } : { ...s, waitingId: decisionId });
    },
    close(decisionId) {
      dirty.current.delete(decisionId);
      setState((s) => s.openId === decisionId ? {} : s.waitingId === decisionId ? { openId: s.openId } : s);
    },
    report(decisionId, isDirty) {
      if (isDirty) dirty.current.add(decisionId);
      else dirty.current.delete(decisionId);
    },
    discard() {
      setState((s) => s.waitingId === void 0 ? s : { openId: s.waitingId });
    },
    keep() {
      setState((s) => ({ openId: s.openId }));
    }
  }), []);
  return (0, import_react29.useMemo)(() => ({ openId: state.openId, waitingId: state.waitingId, ...actions }), [state, actions]);
}
var RequestSlotsContext = (0, import_react29.createContext)(void 0);
function useRequestSlot(decisionId) {
  const shared = (0, import_react29.useContext)(RequestSlotsContext);
  const local2 = useRequestSlots();
  const slots = shared ?? local2;
  const latest = (0, import_react29.useRef)(slots);
  latest.current = slots;
  (0, import_react29.useEffect)(() => () => {
    latest.current.close(decisionId);
  }, [decisionId]);
  const isOpen = slots.openId === decisionId;
  return {
    isOpen,
    isAskingDiscard: isOpen && slots.waitingId !== void 0,
    open() {
      slots.want(decisionId);
    },
    close() {
      slots.close(decisionId);
    },
    report(isDirty) {
      slots.report(decisionId, isDirty);
    },
    discard: slots.discard,
    keep: slots.keep
  };
}
var proposalCss = `
.pm-proposal-notice { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text); }
`;

// client/pending/cards.tsx
var import_jsx_runtime32 = require("react/jsx-runtime");
var CARD = "card";
function useCardAction(session, handlers) {
  const runner = useCommandRunner(session);
  return {
    run(command) {
      runner.run(CARD, command, handlers);
    },
    unavailable: runner.unavailable(CARD),
    fail(detail) {
      runner.fail(CARD, detail);
    },
    feedback: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(CommandFeedback, { runner, id: CARD })
  };
}
function otherProject(memory, session) {
  if (memory?.workspacePath === void 0) return void 0;
  return session.kind === "ready" && belongsTo(session.cwd, memory.workspacePath, session.workspaces ?? {}) ? void 0 : memory.workspacePath;
}
function projectNameOf(session) {
  return (memory) => {
    const other = otherProject(memory, session);
    return other === void 0 ? void 0 : baseName(other);
  };
}
function bodyOf(text) {
  const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(text);
  return (m === null ? text : text.slice(m[0].length)).trim();
}
var ItemScopeNames = (0, import_react30.createContext)([]);
var ItemIsNew = (0, import_react30.createContext)(false);
function ScopeChips() {
  const t = useT();
  const scopes = (0, import_react30.useContext)(ItemScopeNames);
  const isNew = (0, import_react30.useContext)(ItemIsNew);
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(import_jsx_runtime32.Fragment, { children: [
    isNew ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("span", { className: "pm-pending-scope", children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Chip, { variant: "neutral", children: t("pending.new") }) }) : null,
    scopes.map((name, i) => /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("span", { className: "pm-pending-scope", children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Chip, { variant: "neutral", children: name }) }, i))
  ] });
}
function Card({ marker, title, aside, focusable = false, isResult = false, children }) {
  const className = ["pm-pending-item", marker !== void 0 && "pm-pending-item--marked", isResult && "pm-pending-item--result"].filter(Boolean).join(" ");
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("article", { className, tabIndex: focusable ? -1 : void 0, children: [
    /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("header", { className: "pm-pending-head", children: [
      marker !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("span", { className: "pm-pending-mark", children: marker }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("h3", { className: "pm-pending-title", children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(ScopeChips, {}),
      aside !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "pm-pending-aside", children: aside }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "pm-pending-body", children })
  ] });
}
function MemoryOf({ memory, session, now, typeLabel: typeLabel2, collapsible = false }) {
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(MemoryCard, { memory, now, typeLabel: typeLabel2(memory.type), projectName: projectNameOf(session)(memory), collapsible });
}
function titleOf(item, t, session) {
  switch (item.kind) {
    case "secret":
      return t("pending.secret.title");
    case "conflict-horizontal":
      return item.summary || t("conflict.title");
    case "conflict-vertical":
      return item.summary || t("conflict.title");
    case "promote-candidate": {
      const other = otherProject(item.memory, session);
      return other !== void 0 ? t("pending.promote.titleIn", { name: baseName(other) }) : t("pending.promote.title");
    }
    case "overflow":
      return t("pending.overflow.title");
    case "unreadable-file":
      return t("pending.unreadable.title");
    case "advice":
      return t(ADVICE_COPY[item.type].title);
  }
}
function SecretCard({ item, session, now, typeLabel: typeLabel2, onDone }) {
  const t = useT();
  const gateway = useGateway();
  const action = useCardAction(session, { onOk: () => {
    onDone({ kind: "hard-deleted" });
  } });
  const [revealed, setRevealed] = (0, import_react30.useState)(void 0);
  const [confirming, setConfirming] = (0, import_react30.useState)(false);
  const { memory } = item;
  const show = () => {
    if (session.kind !== "ready") return;
    void gateway.readFile(session.sessionId, memory.filePath).then((text) => {
      setRevealed(text === void 0 ? null : bodyOf(text));
    });
  };
  const open = () => {
    void gateway.openPath(memory.filePath, "open").then((ok) => {
      if (!ok) action.fail(t("pending.openFailed"));
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(Card, { marker: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(StatusMarker, { kind: "secret", label: t("marker.secret") }), title: t("pending.secret.title"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(MemoryOf, { session, memory: typeof revealed === "string" ? { ...memory, content: revealed } : memory, now, typeLabel: typeLabel2, collapsible: true }),
    revealed === null ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("p", { className: "pm-pending-text", children: t("pending.secret.readFailed") }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(AdviceNote, { children: t("pending.secret.body") }),
    confirming ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
      SecretDeleteConfirm,
      {
        showTitle: false,
        unavailable: action.unavailable,
        onCancel: () => {
          setConfirming(false);
        },
        onConfirm: () => {
          action.run({ cmd: "hard-delete", memoryId: memory.id, layer: scopeOfMemory(memory) });
        }
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "pm-pending-actions", children: [
      typeof revealed === "string" ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { onClick: () => {
        setRevealed(void 0);
      }, children: t("pending.secret.hide") }) : /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { unavailable: action.unavailable, onClick: show, children: t("pending.secret.show") }),
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { onClick: open, children: t("pending.secret.rewrite") }),
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { variant: "danger", unavailable: action.unavailable, onClick: () => {
        setConfirming(true);
      }, children: t("pending.secret.delete") })
    ] }),
    action.feedback
  ] });
}
var resolvedTo = (onDone, adopted) => (result, command) => {
  const proposal = command.cmd === "apply-proposal" ? command.proposal : void 0;
  const verdict = command.cmd === "resolve" ? command.verdict : proposal !== void 0 ? verdictOfAction(proposal.action) : command.cmd === "apply-proposal" ? adopted : void 0;
  if (verdict === void 0) return;
  onDone({
    kind: "resolved",
    verdict,
    ...result.isUnrecorded ? { isUnrecorded: true } : {},
    ...result.isHardDeleted ? { isHardDeleted: true } : {},
    ...command.cmd === "apply-proposal" ? { source: proposal !== void 0 ? "request" : "suggestion" } : {}
  });
};
function HorizontalCard({ item, session, now, typeLabel: typeLabel2, onDone, onRefused }) {
  const t = useT();
  const preferred = item.preferredId === void 0 ? void 0 : item.left?.id === item.preferredId ? { side: "A", memory: item.left } : item.right?.id === item.preferredId ? { side: "B", memory: item.right } : void 0;
  const note = preferred === void 0 ? void 0 : t(preferred.memory.sourceMode === "user-explicit" ? "pending.conflict.preferredExplicit" : "pending.conflict.preferred", { side: preferred.side });
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "pm-pending-item", children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
    ConflictRuling,
    {
      layout: "wide",
      left: item.left,
      right: item.right,
      now,
      title: titleOf(item, t, session),
      note,
      typeLabel: typeLabel2,
      projectName: projectNameOf(session),
      headExtra: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(ScopeChips, {}),
      footer: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(HorizontalActions, { item, session, onDone, onRefused })
    }
  ) });
}
function mergePartialOf(keeperId, recorded, unrecorded) {
  if (unrecorded.length === 0 && recorded.length === 1 && recorded[0] === keeperId) return "kept";
  if (recorded.length === 0 && unrecorded.length === 1 && unrecorded[0] === keeperId) return "changed";
  return "other";
}
function mergeSidesOf(ops, left, right) {
  const edit = ops.find((op) => op.kind === "edit");
  if (edit?.kind !== "edit") return void 0;
  const isRight = edit.memoryId === right?.id;
  const keeper = isRight ? right : edit.memoryId === left?.id ? left : null;
  if (keeper === null) return void 0;
  const { content, name, summary, tags } = edit;
  return { keeper: { ...keeper, content, name, summary, tags }, keep: isRight ? "B" : "A", drop: isRight ? "A" : "B" };
}
function HorizontalActions({ item, session, onDone, onRefused }) {
  const t = useT();
  const gateway = useGateway();
  const { horizontal: horizontal2 } = CONFLICT_ACTION_VERDICTS;
  const [staleId, setStaleId] = (0, import_react30.useState)(void 0);
  const [asking, setAsking] = (0, import_react30.useState)(void 0);
  const [voided, setVoided] = (0, import_react30.useState)(0);
  const sent = (0, import_react30.useRef)("other");
  const slot = useRequestSlot(item.decisionId);
  const model = gateway.useModel(session, { shouldAsk: false });
  const isStale = staleId !== void 0 && (item.suggestion === void 0 || item.suggestion.id === staleId);
  const suggestion = isStale ? void 0 : item.suggestion;
  const adopted = suggestion === void 0 ? void 0 : verdictOfAction(suggestion.action);
  const merging = suggestion?.action === "merge" ? mergeSidesOf(suggestion.ops, item.left, item.right) : void 0;
  const { left, right } = item;
  const action = useCardAction(session, {
    onOk: (result, command) => {
      const proposal = command.cmd === "apply-proposal" ? command.proposal : void 0;
      const sides2 = proposal === void 0 ? command.cmd === "apply-proposal" ? merging : void 0 : proposal.action === "merge" ? mergeSidesOf(proposal.ops, left, right) : void 0;
      if (sides2 === void 0) {
        resolvedTo(onDone, adopted)?.(result, command);
        return;
      }
      onDone({
        kind: "plan-merged",
        source: proposal !== void 0 ? "request" : "suggestion",
        ...sides2,
        ...result.isPartial === true ? { partial: mergePartialOf(sides2.keeper.id, result.memoryIds ?? [], result.unrecordedIds ?? []) } : {},
        ...result.decisionId !== void 0 ? { decisionId: result.decisionId } : {}
      });
    },
    onHandledElsewhere: onRefused,
    // 只有采纳建议、按要求应用会回 stale；处理器按点击时那一次渲染取，记下的是当时卡上那份建议
    onFailed: (failure) => {
      if (failure.code !== "stale") return false;
      if (sent.current === "request") {
        setVoided((n) => n + 1);
        return true;
      }
      if (suggestion === void 0) return false;
      setStaleId(suggestion.id);
      return true;
    }
  });
  const run = (command) => {
    sent.current = command.cmd === "apply-proposal" && command.proposal !== void 0 ? "request" : "other";
    action.run(command);
  };
  const reason = action.unavailable ?? (left === null || right === null ? t("conflict.missingHint") : void 0);
  const canRequest = left !== null && right !== null && isEditable(left) && isEditable(right) && model.status !== "unavailable";
  const isRequesting = canRequest && slot.isOpen;
  const sides = (verdict) => verdict === horizontal2.keepA ? { keep: "A", drop: "B", loser: right } : verdict === horizontal2.keepB ? { keep: "B", drop: "A", loser: left } : void 0;
  const isPurge = (verdict) => sides(verdict)?.loser?.hasSecret === true;
  const adopt = () => {
    if (suggestion !== void 0) run({ cmd: "apply-proposal", decisionId: item.decisionId, suggestionId: suggestion.id });
  };
  const rule = (verdict) => {
    run({ cmd: "resolve", decisionId: item.decisionId, verdict });
  };
  const send = (ask) => {
    setAsking(void 0);
    if (ask.kind === "rule") {
      rule(ask.verdict);
      return;
    }
    if (suggestion?.id === ask.suggestionId) adopt();
    else setStaleId(ask.suggestionId);
  };
  const adoptNote = merging !== void 0 ? t("pending.conflict.adoptNote", { drop: merging.drop }) : adopted === void 0 ? void 0 : adopted === horizontal2.keepBoth ? t("pending.conflict.adoptNoteKeepBoth") : t(isPurge(adopted) ? "pending.conflict.adoptNotePurge" : "pending.conflict.adoptNote", { drop: sides(adopted).drop });
  const sourced = suggestion?.isSourced === true ? t("pending.suggestion.sourced") : void 0;
  const note = isRequesting ? void 0 : sourced === void 0 ? adoptNote : adoptNote === void 0 ? sourced : t("conflict.twoSentences", { first: sourced, second: adoptNote });
  const direct = [
    [horizontal2.keepA, t("pending.conflict.keepA")],
    [horizontal2.keepB, t("pending.conflict.keepB")],
    [horizontal2.keepBoth, t("pending.conflict.keepBoth")]
  ];
  const hasAdopt = adopted !== void 0 || merging !== void 0;
  let row = null;
  if (asking !== void 0 && isPurge(asking.verdict)) {
    const { keep, drop } = sides(asking.verdict);
    row = /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
      SecretDeleteConfirm,
      {
        showTitle: false,
        body: t("pending.conflict.confirmPurge", { keep, drop }),
        unavailable: action.unavailable,
        onCancel: () => {
          setAsking(void 0);
        },
        onConfirm: () => {
          send(asking);
        }
      }
    );
  } else if (asking !== void 0) {
    const side = sides(asking.verdict);
    row = /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "pm-conflict-actions", children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
      SoftDeleteConfirm,
      {
        question: side === void 0 ? t("pending.conflict.confirmKeepBoth") : t("pending.conflict.confirmKeep", { keep: side.keep, drop: side.drop }),
        confirmLabel: side === void 0 ? t("pending.conflict.confirmKeepBothLabel") : t(side.keep === "A" ? "pending.conflict.keepA" : "pending.conflict.keepB"),
        onCancel: () => {
          setAsking(void 0);
        },
        onConfirm: () => {
          send(asking);
        }
      }
    ) });
  } else if (!isRequesting) {
    row = /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "pm-conflict-actions", children: [
      hasAdopt ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { variant: "primary", unavailable: reason, onClick: () => {
        if (adopted !== void 0 && isPurge(adopted) && suggestion !== void 0) setAsking({ kind: "adopt", verdict: adopted, suggestionId: suggestion.id });
        else adopt();
      }, children: t("pending.conflict.adopt") }) : null,
      hasAdopt && canRequest ? null : direct.map(([verdict, label]) => /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { unavailable: reason, onClick: () => {
        setAsking({ kind: "rule", verdict });
      }, children: label }, verdict)),
      canRequest ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { unavailable: reason, onClick: slot.open, children: t("pending.conflict.request") }) : null
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(import_jsx_runtime32.Fragment, { children: [
    left !== null && right !== null ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
      SuggestionBlock,
      {
        decisionId: item.decisionId,
        left,
        right,
        suggestion,
        noSuggestion: item.noSuggestion ?? (isStale ? { code: "not-generated" } : void 0),
        isGenerating: item.isGeneratingSuggestion === true,
        notice: isStale && (item.noSuggestion === void 0 || item.noSuggestion.code === "not-generated") ? t("pending.suggestion.stale") : void 0,
        session,
        onRefused
      }
    ) : null,
    note !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(AdviceNote, { label: "note", children: note }) : null,
    isRequesting ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
      ProposalRequest,
      {
        decisionId: item.decisionId,
        left,
        right,
        session,
        unavailable: action.unavailable,
        isHidden: asking !== void 0,
        voided,
        discardAsk: slot.isAskingDiscard ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(SoftDeleteConfirm, { question: t("library.edit.discard"), confirmLabel: t("library.edit.discardConfirm"), onCancel: slot.keep, onConfirm: slot.discard }) : void 0,
        onClose: slot.close,
        onPick: (verdict) => {
          setAsking({ kind: "rule", verdict });
        },
        onApply: (proposal) => {
          run({ cmd: "apply-proposal", decisionId: item.decisionId, proposal });
        },
        onRefused,
        onDirtyChange: slot.report
      }
    ) : null,
    row,
    action.feedback
  ] });
}
function VerticalCard({ item, session, now, typeLabel: typeLabel2, onDone, onRefused }) {
  const t = useT();
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "pm-pending-item", children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
    VerticalConflictRuling,
    {
      layout: "wide",
      memory: item.memory,
      baselineRef: item.baselineRef,
      now,
      title: titleOf(item, t, session),
      typeLabel: typeLabel2,
      projectName: projectNameOf(session),
      headExtra: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(ScopeChips, {}),
      footer: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(VerticalActions, { item, session, onDone, onRefused })
    }
  ) });
}
function rewrittenOf(ops, memory) {
  const edit = ops.find((op) => op.kind === "edit");
  if (edit?.kind !== "edit" || memory === null || edit.memoryId !== memory.id) return void 0;
  const { content, name, summary, tags } = edit;
  return { ...memory, content, name, summary, tags };
}
function VerticalActions({ item, session, onDone, onRefused }) {
  const t = useT();
  const gateway = useGateway();
  const { vertical: vertical2 } = CONFLICT_ACTION_VERDICTS;
  const [staleId, setStaleId] = (0, import_react30.useState)(void 0);
  const [asking, setAsking] = (0, import_react30.useState)(void 0);
  const [voided, setVoided] = (0, import_react30.useState)(0);
  const sent = (0, import_react30.useRef)("other");
  const slot = useRequestSlot(item.decisionId);
  const model = gateway.useModel(session, { shouldAsk: false });
  const { memory } = item;
  const isStale = staleId !== void 0 && (item.suggestion === void 0 || item.suggestion.id === staleId);
  const suggestion = isStale ? void 0 : item.suggestion;
  const adopted = suggestion === void 0 ? void 0 : verdictOfAction(suggestion.action);
  const rewriting = suggestion?.action === "rewrite" ? rewrittenOf(suggestion.ops, memory) : void 0;
  const action = useCardAction(session, {
    onOk: (result, command) => {
      const proposal = command.cmd === "apply-proposal" ? command.proposal : void 0;
      const rewritten = proposal === void 0 ? command.cmd === "apply-proposal" ? rewriting : void 0 : proposal.action === "rewrite" ? rewrittenOf(proposal.ops, memory) : void 0;
      if (rewritten === void 0) {
        resolvedTo(onDone, adopted)?.(result, command);
        return;
      }
      onDone({
        kind: "plan-rewritten",
        source: proposal !== void 0 ? "request" : "suggestion",
        memory: rewritten,
        ...result.isPartial === true ? { isPartial: true } : {},
        ...result.decisionId !== void 0 ? { decisionId: result.decisionId } : {}
      });
    },
    onHandledElsewhere: onRefused,
    // 同横向：只有采纳建议、按要求应用会回 stale
    onFailed: (failure) => {
      if (failure.code !== "stale") return false;
      if (sent.current === "request") {
        setVoided((n) => n + 1);
        return true;
      }
      if (suggestion === void 0) return false;
      setStaleId(suggestion.id);
      return true;
    }
  });
  const run = (command) => {
    sent.current = command.cmd === "apply-proposal" && command.proposal !== void 0 ? "request" : "other";
    action.run(command);
  };
  const reason = action.unavailable ?? (memory === null ? t("conflict.missingHint") : void 0);
  const canRequest = memory !== null && isEditable(memory) && model.status !== "unavailable";
  const isRequesting = canRequest && slot.isOpen;
  const isPurge = (verdict) => verdict === vertical2.keepBaseline && memory?.hasSecret === true;
  const adopt = () => {
    if (suggestion !== void 0) run({ cmd: "apply-proposal", decisionId: item.decisionId, suggestionId: suggestion.id });
  };
  const send = (ask) => {
    setAsking(void 0);
    if (ask.kind === "rule") {
      run({ cmd: "resolve", decisionId: item.decisionId, verdict: ask.verdict });
      return;
    }
    if (suggestion?.id === ask.suggestionId) adopt();
    else setStaleId(ask.suggestionId);
  };
  const adoptNote = rewriting !== void 0 ? t("pending.vertical.adoptNoteRewrite") : adopted === void 0 ? void 0 : adopted === vertical2.keepBaseline ? t(isPurge(adopted) ? "pending.vertical.adoptNotePurge" : "pending.vertical.adoptNoteDelete") : t("pending.vertical.adoptNoteKeepBoth");
  const sourced = suggestion?.isSourced === true ? t("pending.vertical.sourced") : void 0;
  const note = isRequesting ? void 0 : sourced === void 0 ? adoptNote : adoptNote === void 0 ? sourced : t("conflict.twoSentences", { first: sourced, second: adoptNote });
  const direct = [
    [vertical2.keepBaseline, t("pending.vertical.delete")],
    [vertical2.keepMemory, t("pending.conflict.keepBoth")]
  ];
  const hasAdopt = adopted !== void 0 || rewriting !== void 0;
  let row = null;
  if (asking !== void 0 && isPurge(asking.verdict)) {
    row = /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
      SecretDeleteConfirm,
      {
        showTitle: false,
        body: t("pending.vertical.confirmPurge"),
        unavailable: action.unavailable,
        onCancel: () => {
          setAsking(void 0);
        },
        onConfirm: () => {
          send(asking);
        }
      }
    );
  } else if (asking !== void 0) {
    const isDelete = asking.verdict === vertical2.keepBaseline;
    row = /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "pm-conflict-actions", children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
      SoftDeleteConfirm,
      {
        question: t(isDelete ? "pending.vertical.confirmDelete" : "pending.vertical.confirmKeepBoth"),
        confirmLabel: t(isDelete ? "pending.vertical.confirmDeleteLabel" : "pending.conflict.confirmKeepBothLabel"),
        onCancel: () => {
          setAsking(void 0);
        },
        onConfirm: () => {
          send(asking);
        }
      }
    ) });
  } else if (!isRequesting) {
    row = /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "pm-conflict-actions", children: [
      hasAdopt ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { variant: "primary", unavailable: reason, onClick: () => {
        if (adopted !== void 0 && isPurge(adopted) && suggestion !== void 0) setAsking({ kind: "adopt", verdict: adopted, suggestionId: suggestion.id });
        else adopt();
      }, children: t("pending.conflict.adopt") }) : null,
      hasAdopt && canRequest ? null : direct.map(([verdict, label]) => /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { unavailable: reason, onClick: () => {
        setAsking({ kind: "rule", verdict });
      }, children: label }, verdict)),
      canRequest ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { unavailable: reason, onClick: slot.open, children: t("pending.conflict.request") }) : null
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(import_jsx_runtime32.Fragment, { children: [
    memory !== null ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
      SuggestionBlock,
      {
        decisionId: item.decisionId,
        left: memory,
        suggestion,
        noSuggestion: item.noSuggestion ?? (isStale ? { code: "not-generated" } : void 0),
        isGenerating: item.isGeneratingSuggestion === true,
        notice: isStale && (item.noSuggestion === void 0 || item.noSuggestion.code === "not-generated") ? t("pending.suggestion.staleVertical") : void 0,
        session,
        onRefused
      }
    ) : null,
    note !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(AdviceNote, { label: "note", children: note }) : null,
    isRequesting ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
      ProposalRequest,
      {
        decisionId: item.decisionId,
        left: memory,
        session,
        unavailable: action.unavailable,
        isHidden: asking !== void 0,
        voided,
        discardAsk: slot.isAskingDiscard ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(SoftDeleteConfirm, { question: t("library.edit.discard"), confirmLabel: t("library.edit.discardConfirm"), onCancel: slot.keep, onConfirm: slot.discard }) : void 0,
        onClose: slot.close,
        onPick: (verdict) => {
          setAsking({ kind: "rule", verdict });
        },
        onApply: (proposal) => {
          run({ cmd: "apply-proposal", decisionId: item.decisionId, proposal });
        },
        onRefused,
        onDirtyChange: slot.report
      }
    ) : null,
    row,
    action.feedback
  ] });
}
function PromoteCard({ item, session, now, typeLabel: typeLabel2, onDone, onRefused, promoteTarget }) {
  const t = useT();
  const action = useCardAction(session, {
    onOk: (_result, command) => {
      if (command.cmd === "promote") onDone({ kind: "promoted", target: command.target });
      if (command.cmd === "keep-local") onDone({ kind: "kept-local" });
    },
    onHandledElsewhere: onRefused
  });
  const other = otherProject(item.memory, session);
  const unavailable = action.unavailable ?? (item.memory === null ? t("conflict.missingHint") : void 0);
  const promoteLabel = promoteTarget === "agents-md" ? t("pending.promote.agentsMd") : other !== void 0 ? t("pending.promote.globalIn", { name: baseName(other) }) : t("pending.promote.global");
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(Card, { marker: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(StatusMarker, { kind: "pending" }), title: titleOf(item, t, session), children: [
    item.memory === null ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("p", { className: "pm-pending-text", children: t("conflict.missing") }) : /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(MemoryOf, { session, memory: item.memory, now, typeLabel: typeLabel2, collapsible: true }),
    promoteTarget !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(AdviceNote, { children: t(promoteTarget === "agents-md" ? "pending.promote.agentsMdNote" : "pending.promote.globalNote") }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "pm-pending-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { unavailable, onClick: () => {
        action.run({ cmd: "keep-local", decisionId: item.decisionId });
      }, children: t("pending.promote.keepLocal") }),
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
        Button,
        {
          unavailable: unavailable ?? (promoteTarget === void 0 ? t("pending.promote.configLoading") : void 0),
          onClick: () => {
            if (promoteTarget !== void 0) action.run({ cmd: "promote", decisionId: item.decisionId, target: promoteTarget });
          },
          children: promoteLabel
        }
      )
    ] }),
    action.feedback
  ] });
}
function OverflowCard({ item, session, onDone, onRefused, budget, onCleanup }) {
  const t = useT();
  const gateway = useGateway();
  const action = useCardAction(session, { onOk: () => {
    onDone({ kind: "dismissed" });
  }, onHandledElsewhere: onRefused });
  const suggested = budget === void 0 ? "" : String(Math.ceil(relaxedCap(budget, item.tier + 1) / 100) * 100);
  const [draft, setDraft] = (0, import_react30.useState)(void 0);
  const value = draft ?? suggested;
  const parsed = Number(value);
  const invalid = budget === void 0 || !/^\d+$/.test(value.trim()) || parsed <= budget;
  const [saving, setSaving] = (0, import_react30.useState)(false);
  const save = () => {
    if (invalid) return;
    setSaving(true);
    void gateway.setConfig("snapshotTokenBudget", parsed).then((ok) => {
      setSaving(false);
      if (ok) onDone({ kind: "raised", budget: parsed });
      else action.fail(t("pending.overflow.saveFailed"));
    });
  };
  const over = 25 * item.tier;
  const summary = item.mode === "relax" ? budget === void 0 ? t("pending.overflow.relaxNoBudget", { over }) : t("pending.overflow.relax", { over, cap: formatNumber(relaxedCap(budget, item.tier)), budget: formatNumber(budget) }) : budget === void 0 ? t("pending.overflow.strictNoBudget") : t("pending.overflow.strict", { budget: formatNumber(budget) });
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(
    Card,
    {
      marker: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(StatusMarker, { kind: "pending" }),
      title: t("pending.overflow.title"),
      aside: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(DismissButton, { label: t("pending.dismiss"), unavailable: action.unavailable ?? (saving ? t("pending.busy") : void 0), onClick: () => {
        action.run({ cmd: "dismiss-overflow", decisionId: item.decisionId });
      } }),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("p", { className: "pm-pending-text", children: summary }),
        /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "pm-pending-option", children: [
          /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("label", { className: "pm-pending-option-label", children: [
            t("pending.overflow.raise"),
            /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
              "input",
              {
                className: "pm-pending-input",
                inputMode: "numeric",
                value,
                "aria-invalid": budget !== void 0 && invalid,
                onChange: (event) => {
                  setDraft(event.target.value);
                }
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
            Button,
            {
              unavailable: saving ? t("pending.busy") : budget === void 0 ? t("pending.promote.configLoading") : invalid ? t("pending.overflow.invalid", { budget: formatNumber(budget) }) : void 0,
              onClick: save,
              children: t("pending.overflow.save")
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("p", { className: "pm-pending-hint", children: [
          budget !== void 0 && invalid && value.trim() !== "" ? t("pending.overflow.invalid", { budget: formatNumber(budget) }) : t("pending.overflow.raiseHint"),
          /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
            "button",
            {
              type: "button",
              className: "pm-link",
              onClick: () => {
                onCleanup(item.workspacePath !== void 0 ? { kind: "workspace", workspacePath: item.workspacePath } : { kind: "global" });
              },
              children: t("pending.overflow.cleanup")
            }
          )
        ] }),
        action.feedback
      ]
    }
  );
}
function UnreadableCard({ item, session }) {
  const t = useT();
  const gateway = useGateway();
  const action = useCardAction(session, {});
  const open = (how) => {
    void gateway.openPath(item.filePath, how).then((ok) => {
      if (!ok) action.fail(t("pending.openFailed"));
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(Card, { marker: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(StatusMarker, { kind: "pending" }), title: t("pending.unreadable.title"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("p", { className: "pm-pending-path", children: item.relativePath }),
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("pre", { className: "pm-pending-error-text", children: item.error }),
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(AdviceNote, { children: t("pending.unreadable.body") }),
    /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "pm-pending-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { onClick: () => {
        open("reveal");
      }, children: t(isMac() ? "pending.unreadable.revealMac" : "pending.unreadable.revealOther") }),
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { onClick: () => {
        open("open");
      }, children: t("pending.unreadable.open") })
    ] }),
    action.feedback
  ] });
}
var ADVICE_COPY = {
  expired: { title: "pending.advice.expired.title", body: "pending.advice.expired.body", actions: ["open", "delete"] },
  // 很久没确认不给忽略：它的出路是「仍然有效」或删除
  stale: { title: "pending.advice.stale.title", body: "pending.advice.stale.body", actions: ["open", "delete", "confirm"] },
  bloat: { title: "pending.advice.bloat.title", body: "pending.advice.bloat.body", actions: ["open", "modify"] },
  redundancy: { title: "pending.advice.redundancy.title", body: "pending.advice.redundancy.baselineBody", actions: ["open", "delete"] },
  orphan: { title: "pending.advice.orphan.title", body: "pending.advice.orphan.body", actions: ["open"] },
  // 放错层只回答挪不挪：改写不换作用域
  misplaced: { title: "pending.advice.misplaced.title", body: "pending.advice.misplaced.toGlobalBody", actions: ["open", "promote"] },
  unclear: { title: "pending.advice.unclear.title", body: "pending.advice.unclear.body", actions: ["open", "modify"] }
};
function adviceTitle(type, t) {
  return t(ADVICE_COPY[type].title);
}
var MISPLACED_TO_PROJECT = { body: "pending.advice.misplaced.toProjectBody", actions: ["open", "move"] };
function IgnoreButton({ item, action }) {
  const t = useT();
  if (item.type === "stale") return null;
  const memories = item.memories.map((m) => ({ memoryId: m.id, layer: scopeOfMemory(m), base: baseOf(m) }));
  const command = { cmd: "ignore-advice", type: item.type, memories };
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(DismissButton, { label: t("pending.dismiss"), unavailable: action.unavailable, onClick: () => {
    action.run(command);
  } });
}
var isModelEditType = (type) => MODEL_EDIT_ADVICE_TYPES.includes(type);
var editCommandOf = (memory, draft) => ({ cmd: "edit-memory", memoryId: memory.id, layer: scopeOfMemory(memory), base: baseOf(memory), ...draft });
function charsBefore(memories, command) {
  const ids = command.cmd === "edit-memory" ? [command.memoryId] : command.memories.map((m) => m.memoryId);
  return memories.filter((m) => ids.includes(m.id)).reduce((n, m) => n + m.content.length, 0);
}
function AdviceCard(props) {
  const { item, session, now, typeLabel: typeLabel2, onDone, onRefused, projects, defaultProject } = props;
  const t = useT();
  const gateway = useGateway();
  const onBehind = (0, import_react30.useRef)(void 0);
  const action = useCardAction(session, { onHandledElsewhere: onRefused, onFailed: (failure) => {
    const ids = failure.memoryIds;
    if (onBehind.current === void 0 || failure.code !== "stale" && failure.code !== "not-found" || ids === void 0 || ids.length === 0) return false;
    onBehind.current(ids);
    return true;
  }, onOk: (result, command) => {
    if (command.cmd === "apply-edits") {
      const recorded = new Set(result.memoryIds ?? command.ops.map((op) => op.memoryId));
      const done = command.ops.filter((op) => recorded.has(op.memoryId));
      onDone({ kind: "tidied", decisionId: result.decisionId, rewrites: done.filter((op) => op.kind === "edit").length, deletes: done.filter((op) => op.kind === "forget").length });
    }
    if (command.cmd === "confirm") onDone({ kind: "confirmed" });
    if (command.cmd === "forget") onDone({ kind: "deleted", memoryId: command.memoryId, scope: command.layer });
    if (command.cmd === "hard-delete") onDone({ kind: "hard-deleted" });
    if (command.cmd === "promote-memory") onDone({ kind: "promoted", target: "global", decisionId: result.decisionId });
    if (command.cmd === "move-memory") onDone({ kind: "moved", workspacePath: command.workspacePath, decisionId: result.decisionId, filePath: result.filePath });
    if (command.cmd === "ignore-advice") onDone({ kind: "ignored", type: command.type, memoryIds: command.memories.map((m) => m.memoryId) });
    if (command.cmd === "edit-memory" || command.cmd === "merge-memories") {
      onDone({
        kind: command.cmd === "edit-memory" ? "edited" : "merged",
        decisionId: result.decisionId,
        name: command.name,
        fromChars: charsBefore(item.memories, command),
        toChars: command.content.length,
        filePath: result.filePath
      });
    }
  } });
  const [modifying, setModifying] = (0, import_react30.useState)();
  const [isMoving, setMoving] = (0, import_react30.useState)(false);
  const buttonsOf = (memory2, deleteLabel = t("pending.advice.delete")) => {
    const scope = scopeOfMemory(memory2);
    const open = () => {
      void gateway.openPath(memory2.filePath, "open").then((ok) => {
        if (!ok) action.fail(t("pending.openFailed"));
      });
    };
    return {
      confirm: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { unavailable: action.unavailable, onClick: () => {
        action.run({ cmd: "confirm", memoryId: memory2.id, layer: scope });
      }, children: t("pending.advice.confirm") }, "confirm"),
      delete: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
        DeleteWithConfirm,
        {
          onDelete: () => {
            action.run({ cmd: "forget", memoryId: memory2.id, layer: scope });
          },
          trigger: (open2) => /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { unavailable: action.unavailable, onClick: open2, children: deleteLabel })
        },
        "delete"
      ),
      promote: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { unavailable: action.unavailable, onClick: () => {
        action.run({ cmd: "promote-memory", memoryId: memory2.id, layer: scope });
      }, children: t("pending.promote.global") }, "promote"),
      move: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { unavailable: action.unavailable, onClick: () => {
        setMoving(true);
      }, children: t("pending.move.move") }, "move"),
      open: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { variant: "ghost", onClick: open, children: t("pending.advice.open") }, "open"),
      modify: isEditable(memory2) ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { unavailable: action.unavailable, onClick: () => {
        setModifying(memory2);
      }, children: t("pending.modify") }, "modify") : null
    };
  };
  if (item.type === "redundancy" && item.memories.length > 1) {
    return /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
      AdviceGroupCard,
      {
        ...props,
        action,
        buttonsOf,
        onApplyMany: (application, behind) => {
          onBehind.current = behind;
          const { ops, keep } = application;
          action.run({ cmd: "apply-edits", ops, ...keep.length > 0 ? { keep } : {} });
        }
      }
    );
  }
  const [memory] = item.memories;
  const copy = item.type === "misplaced" && memory.scope === "global" ? { ...ADVICE_COPY.misplaced, ...MISPLACED_TO_PROJECT } : ADVICE_COPY[item.type];
  const buttons = buttonsOf(memory);
  const modelType = isModelEditType(item.type) ? item.type : void 0;
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(Card, { title: t(copy.title), aside: item.type === "stale" || isMoving || modifying !== void 0 ? void 0 : /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(IgnoreButton, { item, action }), children: [
    isMoving ? /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(import_jsx_runtime32.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "pm-pending-advice-memories", children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(MemoryOf, { session, memory, now, typeLabel: typeLabel2 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
        MovePanel,
        {
          projects,
          initial: defaultProject,
          unavailable: action.unavailable,
          onCancel: () => {
            setMoving(false);
          },
          onMove: (workspacePath) => {
            action.run({ cmd: "move-memory", memoryId: memory.id, workspacePath });
          }
        }
      )
    ] }) : modifying !== void 0 && modelType !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
      EditModes,
      {
        onClose: () => {
          setModifying(void 0);
        },
        model: (report) => /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(import_jsx_runtime32.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "pm-pending-advice-memories", children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(MemoryOf, { session, memory: modifying, now, typeLabel: typeLabel2 }) }),
          /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
            ModelEditPanel,
            {
              memories: [modifying],
              adviceType: modelType,
              typeTitle: t(copy.title),
              base: draftOf2(modifying),
              session,
              unavailable: action.unavailable,
              onClose: () => {
                setModifying(void 0);
              },
              onApply: (draft) => {
                action.run(editCommandOf(modifying, draft));
              },
              onStateChange: report
            }
          )
        ] }),
        manual: (report) => /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
          EditPanel,
          {
            initial: draftOf2(modifying),
            original: { content: modifying.content, summary: modifying.summary, chars: modifying.content.length },
            isMerge: false,
            unavailable: action.unavailable,
            onCancel: () => {
              setModifying(void 0);
            },
            onSave: (draft) => {
              action.run(editCommandOf(modifying, draft));
            },
            onStateChange: report
          }
        )
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(import_jsx_runtime32.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "pm-pending-advice-memories", children: item.memories.map((m) => /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(MemoryOf, { session, memory: m, now, typeLabel: typeLabel2 }, m.id)) }),
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(AdviceNote, { children: t(copy.body, { date: formatDay(memory.lastConfirmedAt, now, t) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "pm-pending-actions", children: copy.actions.map((a) => buttons[a]) })
    ] }),
    action.feedback
  ] });
}
function mergeDraft(pair) {
  const kept = pair[mergeKeeperIndex(pair)];
  const other = pair[1 - mergeKeeperIndex(pair)];
  return {
    draft: { content: `${kept.content}

${other.content}`, name: kept.name, summary: kept.summary, tags: [.../* @__PURE__ */ new Set([...kept.tags, ...other.tags])] },
    chars: kept.content.length + other.content.length
  };
}
function mergeManyOf(memories) {
  const [first, ...rest] = memories.map(scopeOfMemory);
  if (memories.length > MAX_BATCH_EDIT || first === void 0 || !rest.every((s) => s !== void 0 && sameScope(s, first))) return void 0;
  const editable = memories.filter(isEditable);
  return editable.length >= 2 ? editable : void 0;
}
function AdviceGroupCard({ item, session, now, typeLabel: typeLabel2, action, buttonsOf, onApplyMany }) {
  const t = useT();
  const isPair = item.memories.length === 2;
  const pair = isPair && item.memories.every(isEditable) ? [item.memories[0], item.memories[1]] : void 0;
  const many = isPair ? void 0 : mergeManyOf(item.memories);
  const [mergingMany, setMergingMany] = (0, import_react30.useState)();
  const [merging, setMerging] = (0, import_react30.useState)();
  if (mergingMany !== void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Card, { title: t("pending.advice.redundancy.title"), children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
      MergeMany,
      {
        memories: mergingMany,
        latest: item.memories,
        session,
        onBack: () => {
          setMergingMany(void 0);
        },
        onApply: onApplyMany,
        applyUnavailable: action.unavailable,
        applyFeedback: action.feedback
      }
    ) });
  }
  const merge = merging === void 0 ? void 0 : mergeDraft(merging);
  const mergeWith = (both, draft) => {
    const memories = both.map((m) => ({ memoryId: m.id, layer: scopeOfMemory(m), base: baseOf(m) }));
    action.run({ cmd: "merge-memories", memories: [memories[0], memories[1]], ...draft });
  };
  const sides = [
    { label: "pending.advice.redundancy.left", delete: "pending.advice.redundancy.deleteLeft" },
    { label: "pending.advice.redundancy.right", delete: "pending.advice.redundancy.deleteRight" }
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(Card, { title: t("pending.advice.redundancy.title"), aside: merging !== void 0 ? void 0 : /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(IgnoreButton, { item, action }), children: [
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "pm-pending-advice-memories pm-pending-advice-group", children: item.memories.map((m, i) => {
      const side = isPair ? sides[i] : void 0;
      const buttons = buttonsOf(m, side === void 0 ? void 0 : t(side.delete));
      return /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("section", { className: "pm-pending-advice-side", "aria-label": side === void 0 ? m.name : t(side.label), children: [
        /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(MemoryOf, { session, memory: m, now, typeLabel: typeLabel2 }),
        merging !== void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "pm-pending-actions", children: [
          buttons.open,
          buttons.delete
        ] })
      ] }, m.id);
    }) }),
    merging !== void 0 && merge !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
      EditModes,
      {
        isMerge: true,
        onClose: () => {
          setMerging(void 0);
        },
        model: (report) => /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
          ModelEditPanel,
          {
            memories: merging,
            adviceType: "redundancy",
            typeTitle: t("pending.advice.redundancy.title"),
            base: merge.draft,
            keeper: mergeKeeperIndex(merging),
            session,
            unavailable: action.unavailable,
            onClose: () => {
              setMerging(void 0);
            },
            onApply: (draft) => {
              mergeWith(merging, draft);
            },
            onStateChange: report
          }
        ),
        manual: (report) => /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
          EditPanel,
          {
            initial: merge.draft,
            original: { content: merge.draft.content, summary: merge.draft.summary, chars: merge.chars },
            isMerge: true,
            unavailable: action.unavailable,
            onCancel: () => {
              setMerging(void 0);
            },
            onSave: (draft) => {
              mergeWith(merging, draft);
            },
            onStateChange: report
          }
        )
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(import_jsx_runtime32.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(AdviceNote, { children: t(isPair ? "pending.advice.redundancy.body" : many !== void 0 ? "pending.advice.redundancy.manyBody" : "pending.advice.redundancy.manyBodyNoMerge") }),
      pair !== void 0 || many !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "pm-pending-actions", children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { unavailable: action.unavailable, onClick: () => {
        if (pair !== void 0) setMerging(pair);
        else setMergingMany(many);
      }, children: t("pending.merge") }) }) : null
    ] }),
    action.feedback
  ] });
}
function MergeMany({ memories, latest, session, onBack, onApply, applyUnavailable, applyFeedback }) {
  const t = useT();
  const root = (0, import_react30.useRef)(null);
  useReturnFocus(root);
  const [items] = (0, import_react30.useState)(() => toBatchItems(memories));
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { ref: root, children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
    BatchEdit,
    {
      items,
      latest,
      session,
      initialRequest: t("pending.mergeMany.request"),
      titleOf: (n) => t("pending.mergeMany.title", { n }),
      backLabel: t("pending.mergeMany.back"),
      onBack,
      onApply: (application, _picked, behind) => {
        onApply(application, behind);
      },
      applyUnavailable,
      applyFeedback
    }
  ) });
}
var byKeyOf = (source) => source === "suggestion" ? "pending.result.bySuggestion" : source === "request" ? "pending.result.byRequest" : "pending.result.byChoice";
function resultCopy(item, outcome, t) {
  if (outcome.kind === "resolved" && item.kind === "conflict-horizontal") {
    const by = (second) => t("conflict.twoSentences", { first: t(byKeyOf(outcome.source)), second });
    const deleted = (side) => by(outcome.isHardDeleted ? t("conflict.purgedSide", { side }) : t("pending.result.deletedSide", { side }));
    if (outcome.verdict === "keep-left") return { memory: item.left, chip: t("pending.result.keptA"), body: deleted("B"), undoable: outcome.isHardDeleted !== true };
    if (outcome.verdict === "keep-right") return { memory: item.right, chip: t("pending.result.keptB"), body: deleted("A"), undoable: outcome.isHardDeleted !== true };
    if (outcome.isUnrecorded) return { chip: t("pending.result.keptBoth"), body: by(t("pending.result.unrecordedBody")), undoable: false };
    return { chip: t("pending.result.keptBoth"), body: by(t("pending.result.keptBothBody")), undoable: true };
  }
  if (outcome.kind === "resolved" && item.kind === "conflict-vertical") {
    const by = (second) => outcome.source === void 0 ? second : t("conflict.twoSentences", { first: t(byKeyOf(outcome.source)), second });
    if (outcome.verdict === CONFLICT_ACTION_VERDICTS.vertical.keepBaseline) {
      return outcome.isHardDeleted ? { chip: t("pending.result.followedBaseline"), body: by(t("conflict.purgedMemory")), undoable: false } : { chip: t("pending.result.followedBaseline"), body: by(t("pending.result.followedBaselineBody")), undoable: true };
    }
    return { memory: item.memory, chip: t("pending.result.keptMemory"), body: by(t(outcome.isUnrecorded ? "pending.result.unrecordedBody" : "pending.result.keptMemoryBody")), undoable: outcome.isUnrecorded !== true };
  }
  const memory = "memory" in item ? item.memory : item.kind === "advice" ? item.memories[0] : void 0;
  switch (outcome.kind) {
    case "promoted":
      return outcome.target === "global" ? { memory, chip: t("pending.result.promoted"), body: t("pending.result.promotedBody"), undoable: true } : { chip: t("pending.result.wroteAgentsMd"), body: t("pending.result.wroteAgentsMdBody"), undoable: false };
    case "moved": {
      const moved = memory && { ...memory, scope: "workspace", workspacePath: outcome.workspacePath, filePath: outcome.filePath ?? memory.filePath };
      return { memory: moved, chip: t("pending.result.moved", { name: baseName(outcome.workspacePath) }), body: t("pending.result.movedBody"), undoable: true };
    }
    case "kept-local":
      return { memory, chip: t("pending.result.keptLocal"), body: t("pending.result.keptLocalBody"), undoable: true };
    case "hard-deleted":
      return { chip: t("pending.secret.deleted"), body: t("pending.secret.deletedBody"), undoable: false };
    case "dismissed":
      return { chip: t("pending.result.dismissed"), body: t("pending.result.dismissedBody"), undoable: true };
    case "raised":
      return { chip: t("pending.result.raised", { budget: formatNumber(outcome.budget) }), body: t("pending.overflow.raiseHint"), undoable: false };
    case "confirmed":
      return { memory, chip: t("pending.result.confirmed"), body: t("pending.result.confirmedBody"), undoable: false };
    case "deleted": {
      const name = item.kind === "advice" ? item.memories.find((m) => m.id === outcome.memoryId)?.name : void 0;
      return { chip: t("pending.result.deleted"), body: name === void 0 ? t("pending.result.deletedBody") : t("pending.result.deletedNamedBody", { name }), undoable: true };
    }
    case "ignored": {
      const ignored = item.kind === "advice" && item.memories.length > 1 ? { memories: item.memories } : { memory };
      return { ...ignored, chip: t("pending.result.ignored"), body: t("pending.result.ignoredBody"), undoable: true };
    }
    case "tidied":
      return {
        chip: t("pending.result.merged"),
        undoable: outcome.decisionId !== void 0,
        body: outcome.deletes > 0 ? t("pending.result.tidiedBody", { rewrites: outcome.rewrites, deletes: outcome.deletes }) : t("pending.result.tidiedBodyNoDelete", { rewrites: outcome.rewrites })
      };
    case "plan-merged":
      if (outcome.partial !== void 0) {
        const key = outcome.partial === "kept" ? "pending.result.mergePartialKept" : outcome.partial === "changed" ? "pending.result.mergePartialChanged" : outcome.decisionId !== void 0 ? "pending.result.mergePartialOtherUndoable" : "pending.result.mergePartialOther";
        return { chip: t("pending.result.partial"), body: t(key, { keep: outcome.keep, drop: outcome.drop }), undoable: outcome.decisionId !== void 0 };
      }
      return {
        memory: outcome.keeper,
        chip: t("pending.result.mergedOne"),
        undoable: true,
        body: t("conflict.twoSentences", { first: t(byKeyOf(outcome.source)), second: t("pending.result.deletedSide", { side: outcome.drop }) })
      };
    case "plan-rewritten":
      if (outcome.isPartial === true) {
        return { chip: t("pending.result.partial"), body: t(outcome.decisionId !== void 0 ? "pending.result.rewritePartialUndoable" : "pending.result.rewritePartial"), undoable: outcome.decisionId !== void 0 };
      }
      return {
        memory: outcome.memory,
        chip: t("pending.result.rewritten"),
        undoable: true,
        body: t("conflict.twoSentences", { first: t(byKeyOf(outcome.source)), second: t("pending.result.rewrittenBody") })
      };
    case "resolved":
      throw new Error(`resolved outcome on ${item.kind}`);
    case "edited":
    case "merged":
      throw new Error(`${outcome.kind} outcome renders as EditedRow`);
  }
}
function ResultCard({ item, outcome, session, now, typeLabel: typeLabel2, onUndone, onRefused }) {
  const t = useT();
  const action = useCardAction(session, { onOk: () => {
    onUndone();
  }, onHandledElsewhere: onRefused });
  if (outcome.kind === "edited" || outcome.kind === "merged") return /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(EditedRow, { item, outcome, action });
  const copy = resultCopy(item, outcome, t);
  const undoId = outcome.kind === "plan-merged" || outcome.kind === "plan-rewritten" ? outcome.decisionId : "decisionId" in item ? item.decisionId : outcome.kind === "promoted" || outcome.kind === "moved" || outcome.kind === "tidied" ? outcome.decisionId : void 0;
  const undo = !copy.undoable ? void 0 : outcome.kind === "ignored" ? { cmd: "unignore-advice", type: outcome.type, memoryIds: outcome.memoryIds } : outcome.kind === "deleted" ? { cmd: "restore", memoryId: outcome.memoryId, layer: outcome.scope } : undoId !== void 0 ? { cmd: "undo", decisionId: undoId } : void 0;
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(Card, { marker: item.kind === "advice" ? void 0 : /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(StatusMarker, { kind: "done" }), title: titleOf(item, t, session), focusable: true, isResult: true, children: [
    copy.memory ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(MemoryOf, { session, memory: copy.memory, now, typeLabel: typeLabel2, collapsible: true }) : null,
    copy.memories !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "pm-pending-advice-group", children: copy.memories.map((m) => /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(MemoryOf, { session, memory: m, now, typeLabel: typeLabel2, collapsible: true }, m.id)) }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
      ResultLine,
      {
        chip: copy.chip,
        undo: undo !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { variant: "ghost", unavailable: action.unavailable, onClick: () => {
          action.run(undo);
        }, children: t("pending.undo") }) : void 0,
        children: copy.body
      }
    ),
    action.feedback
  ] });
}
function EditedRow({ item, outcome, action }) {
  const t = useT();
  const gateway = useGateway();
  const filePath = outcome.filePath ?? (item.kind === "advice" ? item.memories[0]?.filePath : void 0);
  const open = () => {
    if (filePath !== void 0) void gateway.openPath(filePath, "open").then((ok) => {
      if (!ok) action.fail(t("pending.openFailed"));
    });
  };
  const undoId = outcome.decisionId;
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("article", { className: "pm-pending-item pm-pending-item--result", tabIndex: -1, children: [
    /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "pm-pending-done", children: [
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Chip, { variant: "result", children: t(outcome.kind === "edited" ? "pending.result.edited" : "pending.result.merged") }),
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("span", { className: "pm-pending-done-text", children: `${outcome.name} \xB7 ${t("pending.edit.count", { from: formatNumber(outcome.fromChars), to: formatNumber(outcome.toChars) })}` }),
      undoId !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { variant: "ghost", unavailable: action.unavailable, onClick: () => {
        action.run({ cmd: "undo", decisionId: undoId });
      }, children: t("pending.undo") }) : null,
      filePath !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(Button, { onClick: open, children: t("pending.advice.open") }) : null
    ] }),
    action.feedback
  ] });
}

// client/library/deleted-placeholders.ts
var import_react31 = require("react");
function useDeletedPlaceholders(viewItems, scope, isBusy) {
  const [rows, setRows] = (0, import_react31.useState)(/* @__PURE__ */ new Map());
  const placeholders = [...rows.values()].filter((row) => row.state !== "deleting" || isBusy(row.memory.id));
  const items = [...viewItems];
  for (const row of placeholders) {
    const at2 = scopeOfMemory(row.memory);
    if (at2 === void 0 || !isInScope([at2], scope) || items.some((m) => m.id === row.memory.id)) continue;
    items.splice(Math.min(row.index, items.length), 0, row.memory);
  }
  const viewIds = viewItems.map((m) => m.id).join("\n");
  (0, import_react31.useEffect)(() => {
    const ids = new Set(viewIds.split("\n"));
    setRows((prev) => {
      const restored = [...prev.values()].filter((row) => row.state === "restored" && ids.has(row.memory.id));
      if (restored.length === 0) return prev;
      const next = new Map(prev);
      for (const row of restored) next.delete(row.memory.id);
      return next;
    });
  }, [viewIds]);
  const mark = (memory, state) => {
    setRows((prev) => {
      const index = (state === "deleting" ? void 0 : prev.get(memory.id)?.index) ?? Math.max(0, viewItems.findIndex((m) => m.id === memory.id));
      return new Map(prev).set(memory.id, { memory, index, state });
    });
  };
  return {
    items,
    hasPlaceholders: placeholders.length > 0,
    isDeleted: (id) => rows.get(id)?.state === "deleted",
    mark
  };
}

// client/library/LibraryTab.tsx
var import_jsx_runtime33 = require("react/jsx-runtime");
function dirName(path) {
  return path.replace(/[\\/][^\\/]*$/, "");
}
function scopeDir(view, scope, firstFile) {
  if (scope.kind === "all") return void 0;
  if (firstFile !== void 0 && firstFile !== "") return dirName(firstFile);
  return scope.kind === "global" ? `${view.memoryRoot.replace(/[\\/]+$/, "")}/global` : void 0;
}
function shortPath(path, root) {
  const base = root.replace(/[\\/]+$/, "");
  return path.startsWith(`${base}/`) ? path.slice(base.length + 1) : path;
}
function issueText(issue, root, t) {
  const path = shortPath(issue.path, root);
  switch (issue.code) {
    case "duplicate-id":
      return issue.keptPath === void 0 ? t("library.issue.other", { path }) : t("library.issue.duplicate-id", { kept: shortPath(issue.keptPath, root), path });
    case "marker-missing":
    case "dir-unreadable":
      return t(`library.issue.${issue.code}`, { path });
    case "reserved-keys":
      return t("library.issue.reserved-keys", { path, keys: (issue.keys ?? []).join(", ") });
    default:
      return t("library.issue.other", { path });
  }
}
var IDLE_EDIT = { phase: "idle", isDirty: false };
var TIDY = "tidy";
var isSameVersion = (a, b) => a.updatedAt === b.updatedAt && a.digest === b.digest;
function TidiedBar({ result, barRef, undoUnavailable, onUndo }) {
  const t = useT();
  const deletes = result.deleted.length;
  const rewrites = result.rewritten.size;
  const { partial, decisionId } = result;
  const names = (memories) => memories.map((m) => m.name).join(t("library.batch.nameSep"));
  if (result.undone !== void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("div", { ref: barRef, className: "pm-lib-result pm-lib-tidied", tabIndex: -1, children: /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("p", { role: "status", className: "pm-lib-tidied-title", children: t("library.batch.undone", { n: result.undone }) }) });
  }
  const subs = result.isStale ? [t("library.batch.undoStale")] : [
    ...partial !== void 0 && partial.recorded.length > 0 ? [t("library.batch.partialKept", { names: names(partial.recorded) })] : [],
    ...partial !== void 0 && partial.unrecorded.length > 0 ? [t("library.batch.partialChanged", { names: names(partial.unrecorded) })] : [],
    ...deletes > 0 ? [t("library.batch.doneDeleted")] : []
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("div", { ref: barRef, className: "pm-lib-result pm-lib-tidied", tabIndex: -1, children: [
    /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("div", { role: "status", children: [
      /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("p", { className: "pm-lib-tidied-title", children: partial !== void 0 ? t("library.batch.partial", { n: partial.recorded.length + partial.unrecorded.length }) : t("library.batch.done", { n: result.total, deletes, rewrites, kept: result.total - deletes - rewrites }) }),
      subs.map((sub) => /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("p", { className: "pm-lib-result-text", children: sub }, sub))
    ] }),
    result.isStale || decisionId === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(Button, { variant: "ghost", unavailable: undoUnavailable, onClick: () => {
      onUndo(decisionId);
    }, children: t("library.batch.undoAll") })
  ] });
}
function SelectionBar({ count: n, barRef, onSelectAll, onCancel, onTidy }) {
  const t = useT();
  const isOver = n > MAX_BATCH_EDIT;
  const blocked = n < 2 ? t("library.select.tooFew") : isOver ? t("library.select.tooMany", { n, max: MAX_BATCH_EDIT }) : void 0;
  return /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("div", { ref: barRef, className: "pm-lib-selbar", role: "group", "aria-label": t("library.select.bar"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("p", { className: "pm-lib-selbar-count", role: "status", children: isOver ? t("library.select.tooMany", { n, max: MAX_BATCH_EDIT }) : t("library.select.count", { n }) }),
    /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(Button, { onClick: onSelectAll, children: t("library.select.all") }),
    /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(Button, { variant: "ghost", onClick: onCancel, children: t("library.select.cancel") }),
    /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(Button, { variant: "primary", unavailable: blocked, onClick: onTidy, children: t("library.select.tidy") })
  ] });
}
function LibraryTab({ nav, scope, session, fold, now = Date.now() }) {
  const t = useT();
  const gateway = useGateway();
  const view = gateway.useView(session, "library");
  const [query, setQuery] = (0, import_react32.useState)("");
  const actions = useRowActions(session);
  const [editing, setEditing] = (0, import_react32.useState)();
  const panel = (0, import_react32.useRef)(IDLE_EDIT);
  const [asking, setAsking] = (0, import_react32.useState)();
  const [edited, setEdited] = (0, import_react32.useState)();
  const [fresh, setFresh] = (0, import_react32.useState)(/* @__PURE__ */ new Set());
  const [editFlash, setEditFlash] = (0, import_react32.useState)(/* @__PURE__ */ new Set());
  const [selecting, setSelecting] = (0, import_react32.useState)(false);
  const [selected, setSelected] = (0, import_react32.useState)(/* @__PURE__ */ new Set());
  const [askingSelect, setAskingSelect] = (0, import_react32.useState)(false);
  const [batch, setBatch] = (0, import_react32.useState)();
  const selectionBar = (0, import_react32.useRef)(null);
  const isBackFromBatch = (0, import_react32.useRef)(false);
  const [tidied, setTidied] = (0, import_react32.useState)();
  const tidiedBar = (0, import_react32.useRef)(null);
  const isTidiedNew = (0, import_react32.useRef)(false);
  const libBar = (0, import_react32.useRef)(null);
  const checkId = (0, import_react32.useId)();
  const drawnRows = (0, import_react32.useRef)(/* @__PURE__ */ new Set());
  const isTidyFlashNew = (0, import_react32.useRef)(false);
  const viewItems = view.status === "ready" ? view.data.layers.filter((l) => isInScope([l.layer], scope)).flatMap((l) => l.items) : [];
  const { items: scopeItems, hasPlaceholders, isDeleted, mark } = useDeletedPlaceholders(viewItems, scope, actions.isBusy);
  const isSearching = query.trim() !== "";
  const tidyGone = (m) => tidied?.deleted.some((d) => d.id === m.id && isSameVersion(m, d)) === true;
  const items = scopeItems.filter((m) => !tidyGone(m) && (matchesQuery(m, query) || m.id === editing?.id));
  const isEditingGone = editing !== void 0 && view.status === "ready" && !viewItems.some((m) => m.id === editing.id);
  (0, import_react32.useEffect)(() => {
    if (!isEditingGone) return;
    panel.current = IDLE_EDIT;
    setEditing(void 0);
  }, [isEditingGone]);
  const isViewReady = view.status === "ready";
  const selectableKey = viewItems.filter(isEditable).map((m) => m.id).join("\n");
  (0, import_react32.useEffect)(() => {
    if (!isViewReady) return;
    const ids = new Set(selectableKey.split("\n"));
    setSelected((prev) => {
      const next = [...prev].filter((id) => ids.has(id));
      return next.length === prev.size ? prev : new Set(next);
    });
  }, [selectableKey, isViewReady]);
  (0, import_react32.useEffect)(() => {
    if (batch !== void 0 || !isBackFromBatch.current) return;
    isBackFromBatch.current = false;
    selectionBar.current?.querySelector(".pm-btn--primary")?.focus();
  }, [batch]);
  (0, import_react32.useEffect)(() => {
    if (tidied === void 0 || !isTidiedNew.current) return;
    isTidiedNew.current = false;
    tidiedBar.current?.focus();
  }, [tidied]);
  (0, import_react32.useEffect)(() => {
    if (!isTidyFlashNew.current) return;
    isTidyFlashNew.current = false;
    setEditFlash((prev) => {
      const next = [...prev].filter((id) => drawnRows.current.has(id));
      return next.length === prev.size ? prev : new Set(next);
    });
  }, [editFlash]);
  const { flashId, revealId, targetId, clear } = useFlashTarget(nav, items.map((m) => m.id));
  const typeLabel2 = useTypeLabel(session);
  const folds = useFold(fold, `library|${checkupKey(scope)}`, isSearching);
  const applyTidy = (picked2, application, onBehind) => {
    const { ops, keep, total: total2 } = application;
    const command = { cmd: "apply-edits", ops, ...keep.length > 0 ? { keep } : {} };
    actions.run(TIDY, command, null, (result) => {
      const memoryOf = (id) => picked2.find((item) => item.memory.id === id).memory;
      const recorded = new Set(result.memoryIds ?? ops.map((op) => op.memoryId));
      const rewritten = new Map(ops.flatMap((op) => op.kind === "edit" && recorded.has(op.memoryId) ? [[op.memoryId, { before: memoryOf(op.memoryId), draft: { content: op.content, name: op.name, summary: op.summary, tags: op.tags } }]] : []));
      setBatch(void 0);
      setSelecting(false);
      setSelected(/* @__PURE__ */ new Set());
      setEdited(void 0);
      isTidiedNew.current = true;
      setTidied({
        decisionId: result.decisionId,
        total: total2,
        rewritten,
        isStale: false,
        deleted: ops.filter((op) => op.kind === "forget" && recorded.has(op.memoryId)).map((op) => memoryOf(op.memoryId)),
        ...result.isPartial === true ? { partial: { recorded: [...recorded].map(memoryOf), unrecorded: (result.unrecordedIds ?? []).map(memoryOf) } } : {}
      });
      setFresh((prev) => /* @__PURE__ */ new Set([...prev, ...rewritten.keys()]));
      isTidyFlashNew.current = true;
      setEditFlash(new Set(rewritten.keys()));
    }, (failure) => {
      const ids = failure.memoryIds;
      if (failure.code !== "stale" && failure.code !== "not-found" || ids === void 0 || ids.length === 0) return false;
      onBehind(ids);
      return true;
    });
  };
  if (batch !== void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("div", { className: "pm-lib", children: /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
      BatchEdit,
      {
        items: batch,
        latest: isViewReady ? viewItems : void 0,
        session,
        onBack: () => {
          isBackFromBatch.current = true;
          setBatch(void 0);
        },
        onApply: (application, picked2, onBehind) => {
          applyTidy(picked2, application, onBehind);
        },
        applyUnavailable: actions.unavailable(TIDY),
        applyFeedback: actions.feedback(TIDY)
      }
    ) });
  }
  if (view.status !== "ready") return /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(ViewMessage, { state: view, idle: null });
  const data = view.data;
  const total = data.layers.reduce((n, l) => n + l.items.length, 0);
  const dir = scopeDir(data, scope, viewItems[0]?.filePath);
  const notice = actions.notice;
  const isAll = scope.kind === "all";
  const groups = isAll ? bucketize([...items].sort((a, b) => b.updatedAt - a.updatedAt), RECENT_BUCKETS, (m) => recentBucketOf(m.updatedAt, now)).map(({ key, items: rows }) => ({ key: `recent:${key}`, title: t(`library.recent.${key}`), items: rows, isOpenByDefault: key !== "older", truncates: false })) : groupByType(items, data.typeOrder, typeLabel2).map(({ type, items: rows }) => ({ key: `type:${type}`, title: typeLabel2(type), items: rows, isOpenByDefault: true, truncates: true, latest: rows[0].updatedAt }));
  const endFlash = () => {
    for (const group2 of groups) {
      const index = group2.items.findIndex((m) => m.id === flashId);
      if (index >= 0) folds.remember(group2.key, { isOpen: true, ...group2.truncates && index >= GROUP_PREVIEW ? { isFull: true } : {} });
    }
    clear();
  };
  const startEdit = (memory) => {
    panel.current = IDLE_EDIT;
    setAsking(void 0);
    setEdited(void 0);
    setEditing(memory);
  };
  const modify = (memory) => {
    if (editing !== void 0 && editing.id !== memory.id && panel.current.isDirty) {
      setAsking(memory.id);
      return;
    }
    startEdit(memory);
  };
  const closeEdit = (id) => {
    setEditing((prev) => {
      if (prev?.id !== id) return prev;
      panel.current = IDLE_EDIT;
      return void 0;
    });
  };
  const selectable = new Set(selectableKey.split("\n"));
  const picked = viewItems.filter((m) => selected.has(m.id) && selectable.has(m.id));
  const pickedIds = new Set(picked.map((m) => m.id));
  const startSelect = () => {
    panel.current = IDLE_EDIT;
    setEditing(void 0);
    setAsking(void 0);
    setAskingSelect(false);
    setEdited(void 0);
    setSelected(/* @__PURE__ */ new Set());
    setSelecting(true);
  };
  const select = () => {
    if (editing !== void 0 && panel.current.isDirty) {
      setAskingSelect(true);
      return;
    }
    startSelect();
  };
  const endSelect = () => {
    setSelecting(false);
    setSelected(/* @__PURE__ */ new Set());
  };
  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };
  const save = (before, draft, via) => {
    const command = { cmd: "edit-memory", memoryId: before.id, layer: scopeOfMemory(before), base: baseOf(before), ...draft };
    actions.run(before.id, command, null, (result) => {
      closeEdit(before.id);
      setEdited({ kind: "done", memoryId: before.id, via, decisionId: result.decisionId, before, draft });
      setFresh((prev) => new Set(prev).add(before.id));
      setEditFlash(/* @__PURE__ */ new Set([before.id]));
    }, (failure) => {
      if (failure.code !== "stale") return false;
      closeEdit(before.id);
      setEdited({ kind: "stale", memoryId: before.id });
      return true;
    });
  };
  const undoEdit = (memoryId, decisionId) => {
    actions.run(memoryId, { cmd: "undo", decisionId }, null, () => {
      setEdited(void 0);
      setFresh((prev) => {
        const next = new Set(prev);
        next.delete(memoryId);
        return next;
      });
    });
  };
  const undoTidy = (result, decisionId) => {
    actions.run(TIDY, { cmd: "undo", decisionId }, null, () => {
      isTidiedNew.current = true;
      setTidied({ ...result, rewritten: /* @__PURE__ */ new Map(), deleted: [], undone: result.rewritten.size + result.deleted.length });
      setFresh((prev) => {
        const next = new Set(prev);
        for (const id of result.rewritten.keys()) next.delete(id);
        return next;
      });
    }, (failure) => {
      if (failure.code !== "stale") return false;
      setTidied({ ...result, isStale: true });
      return true;
    });
  };
  const editPanel = (memory) => /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
    EditModes,
    {
      onClose: () => {
        closeEdit(memory.id);
      },
      onStateChange: (state) => {
        panel.current = state;
      },
      model: (report) => /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
        ModelEditPanel,
        {
          memories: [memory],
          base: draftOf2(memory),
          session,
          unavailable: actions.unavailable(memory.id),
          onClose: () => {
            closeEdit(memory.id);
          },
          onApply: (draft) => {
            save(memory, draft, "model");
          },
          onStateChange: report
        }
      ),
      manual: (report) => /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
        EditPanel,
        {
          initial: draftOf2(memory),
          original: { content: memory.content, summary: memory.summary, chars: memory.content.length },
          isMerge: false,
          unavailable: actions.unavailable(memory.id),
          onCancel: () => {
            closeEdit(memory.id);
          },
          onSave: (draft) => {
            save(memory, draft, "manual");
          },
          onStateChange: report
        }
      )
    }
  );
  const editedRow = (row2) => {
    const undoId = row2.kind === "done" ? row2.decisionId : void 0;
    return /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("div", { className: "pm-lib-result", children: [
      /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("p", { className: "pm-lib-result-text", children: t(row2.kind === "stale" ? "library.edit.stale" : row2.via === "model" ? "library.edit.modelDone" : "library.edit.manualDone") }),
      undoId !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(Button, { variant: "ghost", unavailable: actions.unavailable(row2.memoryId), onClick: () => {
        undoEdit(row2.memoryId, undoId);
      }, children: t("library.undo") }) : null
    ] });
  };
  const scopeLink = (memory) => {
    const own = scopeOfMemory(memory);
    if (own === void 0) return void 0;
    const name = scopeLabel(own, t);
    return /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)(
      "button",
      {
        type: "button",
        className: "pm-mc-item pm-lib-scope",
        "aria-label": t("library.goScope", { scope: name }),
        onClick: () => {
          nav.update({ scope: own, memoryId: memory.id });
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(Icon, { name: own.kind === "global" ? "globe" : "folder", size: 13 }),
          name,
          /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("span", { "aria-hidden": "true", children: "\u203A" })
        ]
      }
    );
  };
  const checkbox = (memory, isPicked) => {
    const reason = memory.hasSecret === true ? t("library.select.secret") : memory.digest === void 0 ? t("library.select.noVersion") : void 0;
    const blocked = reason !== void 0;
    const reasonId = `${checkId}-${memory.id}`;
    return /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("label", { className: "pm-lib-check", title: reason, children: [
      /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
        "input",
        {
          type: "checkbox",
          "aria-label": t("library.select.row", { name: memory.name }),
          "aria-disabled": blocked || void 0,
          "aria-describedby": blocked ? reasonId : void 0,
          checked: isPicked,
          onChange: () => {
            if (!blocked) toggle(memory.id);
          }
        }
      ),
      blocked ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("span", { id: reasonId, className: "pm-sr-only", children: reason }) : null
    ] });
  };
  const row = (memory) => {
    const own = scopeOfMemory(memory);
    if (isDeleted(memory.id)) {
      return /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("li", { className: selecting ? "pm-list-row pm-lib-row--selecting" : "pm-list-row", children: [
        selecting ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("span", { className: "pm-lib-check pm-lib-check--blank", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("input", { type: "checkbox", tabIndex: -1, disabled: true }) }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("div", { className: "pm-row-body", children: [
          /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("div", { className: "pm-lib-gone", children: /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
            MemoryCard,
            {
              memory,
              now,
              typeLabel: typeLabel2(memory.type),
              hideType: !isAll,
              hideScope: !isAll,
              projectName: memory.workspacePath === void 0 ? void 0 : baseName(memory.workspacePath),
              collapsible: !isSearching
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("div", { className: "pm-lib-result", children: [
            /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("p", { className: "pm-lib-result-text", children: t("library.deletedResult") }),
            /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
              Button,
              {
                variant: "ghost",
                unavailable: actions.unavailable(memory.id),
                onClick: () => {
                  actions.run(memory.id, { cmd: "restore", memoryId: memory.id, layer: own }, null, () => {
                    mark(memory, "restored");
                  });
                },
                children: t("library.undo")
              }
            )
          ] }),
          actions.feedback(memory.id)
        ] })
      ] }, memory.id);
    }
    const isEditing = editing?.id === memory.id;
    const result = edited?.memoryId === memory.id ? edited : void 0;
    const tidyRewrite = tidied?.rewritten.get(memory.id);
    const shown = result?.kind === "done" && isSameVersion(memory, result.before) ? { ...memory, ...result.draft } : tidyRewrite !== void 0 && isSameVersion(memory, tidyRewrite.before) ? { ...memory, ...tidyRewrite.draft } : memory;
    const badge = fresh.has(memory.id) ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(Chip, { variant: "neutral", children: t("library.edit.justEdited") }) : void 0;
    const endRowFlash = () => {
      if (editFlash.has(memory.id)) {
        setEditFlash((prev) => {
          const next = new Set(prev);
          next.delete(memory.id);
          return next;
        });
      }
      if (flashId === memory.id) endFlash();
    };
    const isPicked = selecting && pickedIds.has(memory.id);
    const className = ["pm-list-row", selecting ? "pm-lib-row--selecting" : "", isPicked ? "pm-lib-row--selected" : ""].filter(Boolean).join(" ");
    return /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)(FlashRow, { className, flashing: flashId === memory.id || editFlash.has(memory.id), onFlashEnd: endRowFlash, takesFocus: memory.id === targetId, children: [
      selecting ? checkbox(memory, isPicked) : null,
      /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("div", { className: "pm-row-body", children: [
        isAll ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(MemoryCard, { memory: shown, now, typeLabel: typeLabel2(memory.type), scopeSlot: scopeLink(memory), badge, collapsible: !isSearching }) : /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(MemoryCard, { memory: shown, now, hideType: true, hideScope: true, badge, collapsible: !isSearching }),
        isEditing ? editPanel(editing) : null,
        result !== void 0 ? editedRow(result) : null,
        actions.feedback(memory.id)
      ] }),
      isEditing || selecting ? null : /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("div", { className: "pm-row-actions", children: [
        !isEditable(memory) ? null : asking === memory.id ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
          SoftDeleteConfirm,
          {
            question: t("library.edit.discard"),
            confirmLabel: t("library.edit.discardConfirm"),
            onCancel: () => {
              setAsking(void 0);
            },
            onConfirm: () => {
              startEdit(memory);
            }
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(Button, { size: "sm", unavailable: actions.unavailable(memory.id), onClick: () => {
          modify(memory);
        }, children: t("pending.modify") }),
        /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
          DeleteWithConfirm,
          {
            onDelete: () => {
              if (memory.id === flashId) endFlash();
              mark(memory, "deleting");
              actions.run(memory.id, { cmd: "forget", memoryId: memory.id, layer: own }, null, () => {
                mark(memory, "deleted");
              });
            },
            trigger: (open) => /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(Button, { variant: "ghost", size: "sm", unavailable: actions.unavailable(memory.id), onClick: open, children: t("library.delete") })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(Button, { variant: "icon", "aria-label": t("library.openFile"), title: t("library.openFile"), onClick: () => {
          void actions.open(memory.filePath);
        }, children: /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(Icon, { name: "openFile", size: 14 }) })
      ] })
    ] }, memory.id);
  };
  const drawn = /* @__PURE__ */ new Set();
  drawnRows.current = drawn;
  const group = ({ key, title, items: rows, isOpenByDefault, truncates, latest }) => {
    const reveal = rows.findIndex((m) => m.id === revealId);
    const isOpen = reveal >= 0 || folds.isOpen(key, isOpenByDefault);
    const isFull = !truncates || reveal >= GROUP_PREVIEW || folds.isFull(key);
    const shown = isFull ? rows : rows.slice(0, GROUP_PREVIEW);
    if (isOpen) for (const m of shown) drawn.add(m.id);
    const settle = () => {
      if (reveal >= 0) clear();
    };
    return /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
      MemoryGroup,
      {
        title,
        count: rows.length,
        latest,
        now,
        isOpen,
        onToggle: () => {
          settle();
          folds.toggle(key, isOpen);
        },
        hidden: rows.length - shown.length,
        onMore: () => {
          folds.remember(key, { isFull: true });
        },
        onLess: truncates && isFull && !isSearching && rows.length > GROUP_PREVIEW ? () => {
          settle();
          folds.remember(key, { isFull: false });
        } : void 0,
        children: shown.map(row)
      },
      key
    );
  };
  return /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("div", { className: "pm-lib", children: [
    /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("div", { ref: libBar, className: "pm-lib-bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(SearchBox, { label: t("library.search.label"), placeholder: t("library.search.placeholder"), value: query, onChange: setQuery }),
      isAll ? null : askingSelect ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
        SoftDeleteConfirm,
        {
          question: t("library.edit.discard"),
          confirmLabel: t("library.edit.discardConfirm"),
          onCancel: () => {
            setAskingSelect(false);
          },
          onConfirm: startSelect
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(Button, { "aria-pressed": selecting, onClick: selecting ? endSelect : select, children: t(selecting ? "library.select.done" : "library.select") })
    ] }),
    viewItems.length > 0 && dir !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("p", { className: "pm-lib-storage", children: [
      /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("span", { children: t("library.storage.oneFile") }),
      /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("i", { className: "pm-sep", "aria-hidden": "true", children: "\xB7" }),
      /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("button", { type: "button", className: "pm-link", onClick: () => {
        void actions.open(dir);
      }, children: t("library.storage.openDir") })
    ] }) : null,
    data.directoryIssues.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("ul", { className: "pm-lib-issues", "aria-label": t("library.issues.label"), children: data.directoryIssues.map((issue, i) => /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("li", { children: issueText(issue, data.memoryRoot, t) }, i)) }) : null,
    tidied !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(TidiedBar, { result: tidied, barRef: tidiedBar, undoUnavailable: actions.unavailable(TIDY), onUndo: (decisionId) => {
      undoTidy(tidied, decisionId);
    } }) : null,
    tidied !== void 0 ? actions.feedback(TIDY) : null,
    notice !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("p", { className: "pm-notice", role: "status", tabIndex: -1, children: notice.text }) : null,
    actions.strayFailures([...items.map((m) => m.id), TIDY]),
    items.length === 0 ? total === 0 && !hasPlaceholders ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(EmptyState, { variant: "first", title: t("library.empty.first.title"), children: t("library.empty.first.body") }) : viewItems.length > 0 || hasPlaceholders ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(EmptyState, { variant: "daily", title: t("library.search.none") }) : /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(EmptyState, { variant: "daily", title: t("library.empty.scope") }) : /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)(import_jsx_runtime33.Fragment, { children: [
      isAll && !isSearching && groups.every((g) => g.key === "recent:older") ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("p", { className: "pm-lib-quiet", children: t("library.recent.quiet") }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("div", { className: "pm-memgroups", children: groups.map(group) })
    ] }),
    selecting ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
      SelectionBar,
      {
        count: picked.length,
        barRef: selectionBar,
        onSelectAll: () => {
          setSelected((prev) => /* @__PURE__ */ new Set([...prev, ...items.filter((m) => selectable.has(m.id)).map((m) => m.id)]));
        },
        onCancel: () => {
          endSelect();
          libBar.current?.querySelector(".pm-btn[aria-pressed]")?.focus();
        },
        onTidy: () => {
          setTidied(void 0);
          actions.dismiss(TIDY);
          setBatch(toBatchItems(picked));
        }
      }
    ) : null
  ] });
}
var libraryTabCss = `
.pm-lib { display: flex; flex-direction: column; gap: 12px; }
.pm-lib-storage { display: flex; align-items: center; min-width: 0; margin: 0; padding: 0 16px; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-lib-storage > span:first-child { flex-shrink: 0; white-space: nowrap; }
.pm-lib-storage .pm-link { flex-shrink: 0; font-size: 12px; }
.pm-lib-issues { margin: 0; padding: 0 16px; list-style: none; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); overflow-wrap: anywhere; }
.pm-lib > .pm-notice { padding: 0 16px; }
.pm-lib-quiet { margin: 0; padding: 0 16px; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-lib-scope { padding: 0; border: 0; background: none; font: inherit; color: inherit; cursor: pointer; }
.pm-lib-scope:hover { color: var(--pm-text); text-decoration: underline; text-underline-offset: 3px; }
.pm-lib-gone { opacity: .55; }
.pm-lib-result { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pm-lib-result-text { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-lib-tidied { padding: 8px 8px 8px 16px; border: .5px solid var(--pm-line-card); border-radius: 10px; }
.pm-lib-tidied:focus { outline: none; }
.pm-lib-tidied:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--pm-focus); outline-offset: 0; }
.pm-lib-tidied-title { margin: 0; font-size: 13px; line-height: 1.5; color: var(--pm-text); }
.pm-lib-bar { display: flex; align-items: center; gap: 8px; }
.pm-lib-bar > .pm-search { flex: 1; min-width: 0; }
.pm-lib-check { display: flex; align-items: center; flex-shrink: 0; height: 22px; cursor: pointer; }
.pm-lib-check input { margin: 0; accent-color: var(--pm-text); cursor: inherit; }
.pm-lib-check:has(input[aria-disabled='true']) { cursor: default; }
.pm-lib-check input[aria-disabled='true'] { opacity: .4; }
/* \u521A\u5220\u6389\u7684\u7ED3\u679C\u884C\uFF1A\u53EA\u5360\u52FE\u9009\u6846\u90A3\u4E00\u5217\u7684\u4F4D\u7F6E\uFF0C\u548C\u522B\u7684\u884C\u5BF9\u9F50 */
.pm-lib-check--blank { visibility: hidden; }
.pm-lib-row--selected { background: var(--pm-accent-tint); }
/* \u7A84\u5BBD\u5EA6\u4E0B\u884C\u6539\u6210\u4E0A\u4E0B\u6392\uFF1B\u591A\u9009\u65F6\u884C\u5C3E\u6309\u94AE\u6536\u8D77\u4E86\uFF0C\u52FE\u9009\u6846\u4ECD\u7559\u5728\u5361\u7247\u5DE6\u8FB9 */
@container (max-width: 500px) {
  .pm-list-row.pm-lib-row--selecting { flex-direction: row; }
}
/* \u4E3B\u533A\u5E95\u90E8\u7559\u767D 48px\uFF1A\u64CD\u4F5C\u6761\u6D6E\u5728\u79BB\u5E95 16px \u5904\u3002\u6EDA\u5230\u5E95\u65F6\u4E3B\u533A\u7684\u5E95\u90E8\u7559\u767D\u4E0D\u4E00\u5B9A\u7B97\u8FDB\u6EDA\u52A8\u8303\u56F4\uFF08\u5185\u5BB9\u6EA2\u51FA\u89C6\u56FE\u9762\u677F\u65F6\uFF09\uFF0C
   \u6761\u81EA\u5DF1\u5E26 16px \u4E0B\u8FB9\u8DDD\uFF0C\u505C\u5728\u539F\u4F4D\u65F6\u4E5F\u79BB\u5E95 16px\uFF0C\u4E0D\u4F1A\u88AB\u9876\u4E0A\u53BB\u538B\u4F4F\u6700\u540E\u4E00\u884C */
.pm-lib-selbar {
  position: sticky; bottom: -32px; z-index: 1; margin-bottom: 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  padding: 8px 8px 8px 16px; border: .5px solid var(--pm-line-card); border-radius: var(--dsw-radius-lg, 16px);
  background: var(--pm-bg-raised); box-shadow: var(--dsw-elevation-panel);
}
.pm-lib-selbar-count { flex: 1; min-width: 0; margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
`;

// client/MemoryPage.tsx
var import_react35 = require("react");

// client/pending/PendingTab.tsx
var import_react33 = require("react");
var import_jsx_runtime34 = require("react/jsx-runtime");
var GROUP_PREVIEW2 = 5;
var FOLDED_LEVEL = "advice";
function memoryIdsOf(item) {
  switch (item.kind) {
    case "secret":
      return [item.memory.id];
    case "conflict-horizontal":
      return [item.left?.id, item.right?.id].filter((id) => id !== void 0);
    case "conflict-vertical":
    case "promote-candidate":
      return item.memory === null ? [] : [item.memory.id];
    case "advice":
      return item.memories.map((m) => m.id);
    default:
      return [];
  }
}
var LEVEL_LABEL = {
  "must-fix": "pending.level.must-fix",
  "your-call": "pending.level.your-call",
  "advice": "pending.level.advice"
};
var JUMP_LEVELS = {
  todo: ["must-fix", "your-call"],
  advice: ["advice"],
  any: PENDING_LEVELS
};
function PendingTab({ nav, session, scope, workspacePath, seen: visitSeen, now = Date.now() }) {
  const t = useT();
  const gateway = useGateway();
  const pending = gateway.useView(session, "pending");
  const health = gateway.useView(session, "health");
  const library = gateway.useView(session, "library");
  const checkupState = gateway.useView(session, "checkups");
  const checkups = checkupState.status === "ready" ? checkupState.data : void 0;
  const current = gateway.useCurrentWorkspace();
  const config = gateway.useConfig();
  const defaultProject = workspacePath ?? (current.status === "ready" ? current.workspacePath : void 0);
  const projects = knownProjects(defaultProject, session, library.status === "ready" ? library.data : void 0);
  const [recent, setRecent] = (0, import_react33.useState)(void 0);
  const [refused, setRefused] = (0, import_react33.useState)(void 0);
  const [sending, setSending] = (0, import_react33.useState)(/* @__PURE__ */ new Map());
  const [expanded, setExpanded] = (0, import_react33.useState)(/* @__PURE__ */ new Set());
  const [batchCurrent, setBatchCurrent] = (0, import_react33.useState)(void 0);
  const requestSlots = useRequestSlots();
  const root = (0, import_react33.useRef)(null);
  const revealFocus = useRevealFocus(root);
  const [mountSeen] = (0, import_react33.useState)(readSeen);
  const seen = visitSeen ?? mountSeen;
  const newIndex = newItemIndex(checkups);
  const isNew = (item) => isNewItem(newIndex, seen, pendingItemKey(item));
  const shownNew = (0, import_react33.useRef)([]);
  shownNew.current = [];
  (0, import_react33.useEffect)(() => {
    if (checkups === void 0) return;
    markSeen(checkups, shownNew.current.flatMap((key) => (newIndex.get(key) ?? []).map((checkupId) => ({ checkupId, keys: [key] }))));
  });
  const done = (next) => {
    setRecent(next);
    setRefused(void 0);
  };
  const refuse = (item, index) => () => {
    setRefused({ key: pendingItemKey(item), index, title: titleOf(item, t, session), level: item.level });
  };
  const viewItems = (pending.status === "ready" ? pending.data.items.filter((item) => isInScope(pendingItemScopes(item), scope)) : []).map((item) => ({ item, isNew: isNew(item) })).sort((a, b) => Number(b.isNew) - Number(a.isNew)).map(({ item }) => item);
  const scopeNames = (item) => scope.kind !== "all" ? [] : pendingItemScopes(item).map((s) => scopeLabel(s, t));
  const healthScopes = health.status === "ready" ? health.data.layers.filter((h) => isInScope([h.layer], scope)) : [];
  const ignored = [...healthScopes].sort((a, b) => compareScopes(a.layer, b.layer)).flatMap((h) => h.ignored.map((item) => ({ item, scopeLabel: scope.kind === "all" ? scopeLabel(h.layer, t) : void 0 })));
  const ignoredBlock = ignored.length === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(Ignored, { entries: ignored, session });
  const typeLabel2 = useTypeLabel(session);
  const { flashId, clear } = useFlashTarget(nav, viewItems.flatMap(memoryIdsOf));
  useGroupFocus(nav, root, pending.status === "ready");
  const jump = useNewItemJump(nav, root, pending.status === "ready" && checkupState.status !== "loading", (to) => {
    const levels = JUMP_LEVELS[to];
    const hit = levels.flatMap((level) => viewItems.filter((item) => item.level === level && isNew(item)))[0];
    return hit === void 0 ? void 0 : pendingItemKey(hit);
  });
  const arrivals = useArrivals(pending.status === "ready" ? viewItems.map(pendingItemKey) : void 0);
  const recentKey = recent === void 0 ? void 0 : pendingItemKey(recent.item);
  const backInView = recentKey !== void 0 && viewItems.some((i) => pendingItemKey(i) === recentKey);
  (0, import_react33.useEffect)(() => {
    if (recent?.undone && backInView) setRecent(void 0);
  }, [recent, backInView]);
  if (pending.status !== "ready" && recent === void 0) return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(ViewMessage, { state: pending, idle: t("session.none.title"), className: "pm-page-placeholder" });
  const items = viewItems.filter((i) => recent === void 0 || recent.undone || pendingItemKey(i) !== recentKey);
  const cardRow = (item, index) => {
    const key = pendingItemKey(item);
    const isNewRow = isNew(item);
    const onSending = (isSending) => {
      setSending((prev) => {
        const next = new Map(prev);
        if (isSending) next.set(key, { item, index });
        else next.delete(key);
        return next;
      });
    };
    return {
      key,
      level: item.level,
      isItem: true,
      isNew: isNewRow,
      flashing: flashId !== void 0 && memoryIdsOf(item).includes(flashId) || jump.isFlashing && jump.key === key,
      node: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(ItemSending.Provider, { value: onSending, children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(ItemIsNew.Provider, { value: isNewRow, children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(ItemScopeNames.Provider, { value: scopeNames(item), children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(BatchSuggesting.Provider, { value: batchCurrent, children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(RequestSlotsContext.Provider, { value: requestSlots, children: renderCard(item, (outcome) => {
        done({ item, index, outcome, undone: false });
      }, refuse(item, index)) }) }) }) }) })
    };
  };
  const rows = items.map(cardRow);
  for (const { item, index } of sending.values()) {
    const key = pendingItemKey(item);
    if (key !== recentKey && !items.some((i) => pendingItemKey(i) === key)) rows.splice(Math.min(index, rows.length), 0, cardRow(item, index));
  }
  if (recent !== void 0 && !(recent.undone && backInView)) {
    rows.splice(Math.min(recent.index, rows.length), 0, recent.undone ? cardRow(recent.item, recent.index) : {
      key: `recent:${recentKey}`,
      level: recent.item.level,
      isItem: false,
      node: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(ItemScopeNames.Provider, { value: scopeNames(recent.item), children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
        ResultCard,
        {
          item: recent.item,
          outcome: recent.outcome,
          session,
          now,
          typeLabel: typeLabel2,
          onUndone: () => {
            done({ ...recent, undone: true });
          },
          onRefused: refuse(recent.item, recent.index)
        }
      ) })
    });
  }
  const isEmpty = rows.length === 0;
  const isAllDone = !isEmpty && !rows.some((row) => row.isItem);
  const refusedRow = refused === void 0 ? void 0 : {
    key: `refused:${refused.key}`,
    level: refused.level,
    isItem: false,
    node: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("p", { className: "pm-pending-refused", role: "alert", tabIndex: -1, children: t("pending.refused", { title: refused.title }) })
  };
  if (refused !== void 0 && refusedRow !== void 0 && !isEmpty) rows.splice(Math.min(refused.index, rows.length), 0, refusedRow);
  function renderCard(item, onDone, onRefused) {
    const props = { session, now, typeLabel: typeLabel2, onDone, onRefused };
    switch (item.kind) {
      case "secret":
        return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(SecretCard, { item, ...props });
      case "conflict-horizontal":
        return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(HorizontalCard, { item, ...props });
      case "conflict-vertical":
        return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(VerticalCard, { item, ...props });
      case "promote-candidate": {
        const target = config === void 0 ? void 0 : config.globalPromoteTarget === "agents-md" ? "agents-md" : "global";
        return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(PromoteCard, { item, ...props, promoteTarget: target });
      }
      case "overflow":
        return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
          OverflowCard,
          {
            item,
            ...props,
            budget: config?.snapshotTokenBudget,
            onCleanup: (target) => {
              nav.update({ view: "library", scope: target, memoryId: void 0 });
            }
          }
        );
      case "unreadable-file":
        return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(UnreadableCard, { item, ...props });
      case "advice":
        return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(AdviceCard, { item, ...props, projects, defaultProject });
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { ref: root, className: "pm-pending", tabIndex: -1, children: isEmpty ? /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)(import_jsx_runtime34.Fragment, { children: [
    refusedRow?.node,
    /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
      PendingEmpty,
      {
        isOff: health.status === "ready" && !health.data.governanceEnabled,
        lastCheckupAt: health.status === "ready" && checkupState.status !== "loading" ? lastScanAt(healthScopes, checkups?.scopes.filter((s) => isInScope([s.scope], scope)) ?? []) : void 0,
        now
      }
    ),
    ignoredBlock
  ] }) : /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)(import_jsx_runtime34.Fragment, { children: [
    isAllDone ? /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("p", { className: "pm-pending-all-done", children: [
      /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(StatusMarker, { kind: "ok" }),
      t("pending.allDone")
    ] }) : null,
    PENDING_LEVELS.map((level) => {
      const group = rows.filter((row) => row.level === level);
      const isOpen = level !== FOLDED_LEVEL || expanded.has(level) || group.slice(GROUP_PREVIEW2).some((row) => row.flashing === true);
      const shown = isOpen ? group : group.slice(0, GROUP_PREVIEW2);
      for (const row of shown) if (row.isNew === true) shownNew.current.push(row.key);
      const tail = level === "advice" ? ignoredBlock : null;
      return group.length === 0 && tail === null ? null : /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)(PendingGroup, { level, count: group.filter((row) => row.isItem).length, children: [
        level === "your-call" ? /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(SuggestAll, { items: items.filter((item) => isMissingSuggestion(item)), session, onCurrent: setBatchCurrent }) : null,
        shown.map((row) => /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
          FlashRow,
          {
            as: "div",
            className: "pm-pending-row",
            flashing: row.flashing ?? false,
            takesFocus: row.key === jump.key,
            onFlashEnd: () => {
              clear();
              jump.end();
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(Arrival, { arrivals, id: row.key, children: row.node })
          },
          row.key
        )),
        shown.length < group.length ? /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("button", { type: "button", className: "pm-pending-more", onClick: () => {
          revealFocus(level);
          setExpanded((prev) => new Set(prev).add(level));
        }, children: t("pending.more", { n: formatNumber(group.length - shown.length) }) }) : null,
        tail
      ] }, level);
    })
  ] }) });
}
function useRevealFocus(root) {
  const pending = (0, import_react33.useRef)(void 0);
  (0, import_react33.useLayoutEffect)(() => {
    const level = pending.current;
    pending.current = void 0;
    if (level === void 0) return;
    const group = root.current?.querySelector(`[data-level="${level}"]`)?.closest("section");
    const row = [...group?.children ?? []].filter((el) => el.classList.contains("pm-pending-row"))[GROUP_PREVIEW2];
    if (!(row instanceof HTMLElement)) return;
    if (!row.hasAttribute("tabindex")) {
      row.tabIndex = -1;
      row.addEventListener("blur", () => {
        row.removeAttribute("tabindex");
      }, { once: true });
    }
    row.focus();
  });
  return (level) => {
    pending.current = level;
  };
}
function useGroupFocus(nav, root, isReady) {
  const target = useNavTarget(nav);
  const handled = (0, import_react33.useRef)(void 0);
  (0, import_react33.useEffect)(() => {
    if (target.level === void 0 || !isReady || root.current === null || handled.current === target) return;
    handled.current = target;
    const spot = root.current.querySelector(`[data-level="${target.level}"]`) ?? root.current;
    spot.focus({ preventScroll: true });
    spot.scrollIntoView?.({ block: "start" });
  }, [target, isReady, root]);
}
function useNewItemJump(nav, root, isReady, firstNew) {
  const target = useNavTarget(nav);
  const handled = (0, import_react33.useRef)(void 0);
  const [key, setKey] = (0, import_react33.useState)(void 0);
  const [isFlashing, setFlashing] = (0, import_react33.useState)(false);
  (0, import_react33.useEffect)(() => {
    if (target.newItem === void 0 || !isReady || handled.current === target) return;
    handled.current = target;
    const hit = firstNew(target.newItem);
    setKey(hit);
    setFlashing(hit !== void 0);
    if (hit === void 0) root.current?.focus({ preventScroll: true });
  });
  return { key, isFlashing, end: () => {
    setFlashing(false);
  } };
}
function knownProjects(defaultProject, session, library) {
  const paths = new Set(session.kind === "ready" ? Object.values(session.workspaces ?? {}) : []);
  for (const { layer: scope } of library?.layers ?? []) if (scope.kind === "workspace") paths.add(scope.workspacePath);
  if (defaultProject !== void 0) paths.delete(defaultProject);
  const rest = [...paths].sort((a, b) => baseName(a).localeCompare(baseName(b)) || a.localeCompare(b));
  return defaultProject === void 0 ? rest : [defaultProject, ...rest];
}
function PendingGroup({ level, count, children }) {
  const t = useT();
  const titleId = (0, import_react33.useId)();
  return /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("section", { className: "pm-pending-group", "aria-labelledby": titleId, children: [
    /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("header", { className: "pm-pending-group-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("h2", { id: titleId, className: "pm-pending-group-title", "data-level": level, tabIndex: -1, children: [
        t(LEVEL_LABEL[level]),
        count > 0 ? /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)(import_jsx_runtime34.Fragment, { children: [
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("span", { className: "pm-pending-group-count", children: formatNumber(count) })
        ] }) : null
      ] }),
      level === "advice" ? /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("p", { className: "pm-pending-group-note", children: [
        /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("i", { className: "pm-sep", "aria-hidden": "true", children: "\xB7" }),
        /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("span", { children: t("pending.level.advice.note") })
      ] }) : null
    ] }),
    children
  ] });
}
function IgnoredRow({ item, scopeLabel: scopeLabel2, session }) {
  const t = useT();
  const action = useCardAction(session, {});
  return /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("li", { className: "pm-ignored-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("span", { className: "pm-ignored-text", children: [adviceTitle(item.type, t), ...item.memories.map((m) => m.name)].join(" \xB7 ") }),
    scopeLabel2 !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(Chip, { variant: "neutral", children: scopeLabel2 }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
      Button,
      {
        variant: "ghost",
        size: "sm",
        className: "pm-ignored-undo",
        unavailable: action.unavailable,
        onClick: () => {
          action.run({ cmd: "unignore-advice", type: item.type, memoryIds: item.memories.map((m) => m.id) });
        },
        children: t("pending.ignored.unignore")
      }
    ),
    action.feedback
  ] });
}
function Ignored({ entries, session }) {
  const t = useT();
  const [isOpen, setOpen] = (0, import_react33.useState)(false);
  const listId = (0, import_react33.useId)();
  const label = t("pending.ignored.count", { n: formatNumber(entries.length) });
  return /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "pm-ignored", children: [
    /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("p", { className: "pm-ignored-line", children: [
      /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("span", { children: label }),
      /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("button", { type: "button", className: "pm-ignored-toggle", "aria-expanded": isOpen, "aria-controls": listId, onClick: () => {
        setOpen(!isOpen);
      }, children: [
        t(isOpen ? "pending.ignored.hide" : "pending.ignored.show"),
        /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(Icon, { name: "chevronDownMedium", size: 12 })
      ] })
    ] }),
    isOpen ? /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("ul", { id: listId, className: "pm-ignored-list", "aria-label": label, children: entries.map(({ item, scopeLabel: scopeLabel2 }) => /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(IgnoredRow, { item, scopeLabel: scopeLabel2, session }, `${scopeLabel2 ?? ""}:${item.type}:${item.memories.map((m) => m.id).join(",")}`)) }) : null
  ] });
}
function lastScanAt(scopes, entries) {
  const times = [...scopes, ...entries].map((l) => l.lastCheckupAt).filter((v) => v !== null);
  return times.length === 0 ? null : Math.max(...times);
}
function PendingEmpty({ isOff, lastCheckupAt, now }) {
  const t = useT();
  if (isOff) return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(EmptyState, { variant: "daily", title: t("pending.off.title"), children: t("pending.off.body") });
  return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(EmptyState, { variant: "daily", title: t("pending.empty.title"), children: lastCheckupAt === void 0 ? void 0 : lastCheckupAt === null ? t("pending.empty.never") : t("pending.empty.lastScan", { date: formatDay(lastCheckupAt, now, t) }) });
}
var pendingCss = `
.pm-pending { display: flex; flex-direction: column; }
.pm-root .pm-pending:focus-visible { outline: none; }
.pm-pending-group { display: flex; flex-direction: column; }
.pm-pending-group + .pm-pending-group { margin-top: 24px; }
.pm-pending-group-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 6px; margin-top: 4px; }
.pm-pending-group-title { margin: 0; font-size: 16px; font-weight: 600; line-height: 1.5; color: var(--pm-text); }
.pm-pending-group-note { display: inline-flex; gap: 6px; margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
/* \u70B9\u4E24\u4FA7\u7684 6px \u7531\u6807\u9898\u884C\u548C\u8FD9\u4E00\u884C\u7684 gap \u7ED9\uFF0C\u70B9\u81EA\u5DF1\u7684\u5916\u8FB9\u8DDD\u6E05\u6389 */
.pm-pending-group-note .pm-sep { margin: 0; }
.pm-pending-all-done { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; font-size: 13px; line-height: 1.55; color: var(--pm-text); }
.pm-ignored { padding: 12px 0 4px; border-top: .5px solid var(--pm-line); font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-ignored-line { display: flex; align-items: center; gap: 8px; margin: 0; }
.pm-ignored-toggle {
  display: inline-flex; align-items: center; gap: 2px; padding: 0; border: 0; background: none;
  font: inherit; font-size: 12px; font-weight: 600; color: var(--pm-text); cursor: pointer;
}
.pm-ignored-toggle svg { transition: transform 120ms ease; }
.pm-ignored-toggle[aria-expanded='true'] svg { transform: rotate(180deg); }
@media (prefers-reduced-motion: reduce) { .pm-ignored-toggle svg { transition: none; } }
.pm-ignored-list { margin: 8px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.pm-ignored-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
.pm-ignored-text { min-width: 0; overflow-wrap: anywhere; }
.pm-ignored-undo { margin-left: auto; }
.pm-ignored-row .pm-pending-error { flex-basis: 100%; margin: 0; }
.pm-pending-advice-memories .pm-mc-text { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.pm-pending-advice-group { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.pm-pending-advice-side { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.pm-pending-group-count { font-weight: 400; color: var(--pm-text-2); }
.pm-pending-row { position: relative; }
.pm-pending-row + .pm-pending-row { border-top: .5px solid var(--pm-line); }
.pm-pending-row.pm-flash { margin-inline: -12px; padding-inline: 12px; border-radius: 10px; }
.pm-pending-row.pm-flash::before { left: 2px; }
.pm-pending-item { padding: 16px 0 18px; }
/* \u51B2\u7A81\u5361\uFF1A\u5E95\u90E8\u95F4\u8DDD\u7531\u8FD9\u4E00\u5C42\u7ED9\uFF0C\u88C1\u51B3\u5916\u58F3\u81EA\u5DF1\u7684\u5E95\u90E8\u5185\u8FB9\u8DDD\u6E05\u6389\uFF1B\u540E\u9762\u7684\u786E\u8BA4\u5757\u3001\u62A5\u9519\u548C\u5176\u5B83\u5361\u7684\u6B63\u6587\u4E00\u6837\u4ECE 22px \u8D77\uFF08\u53F3\u4FA7\u680F\u7684\u51B2\u7A81\u5361\u4E0D\u5728\u8FD9\u4E00\u5C42\uFF0C\u4E0D\u53D7\u5F71\u54CD\uFF09 */
.pm-pending-item > .pm-conflict { padding-bottom: 0; }
.pm-pending-item > .pm-conflict ~ * { margin-left: 22px; margin-top: 10px; }
.pm-pending-item > .pm-conflict ~ .pm-pending-error { margin-top: 16px; }
.pm-pending-head { display: flex; align-items: center; gap: 8px; min-height: 24px; margin-bottom: 12px; }
/* \u6807\u8BB0\u5217 14px\uFF08\u5BC6\u94A5\u4E09\u89D2\u7684\u5BBD\u5EA6\uFF09\uFF1A\u5706\u70B9\u3001\u4E09\u89D2\u3001\u7070\u70B9\u7684\u6807\u9898\u90FD\u4ECE 22px \u8D77\uFF0C\u548C\u72B6\u6001\u6761\u7684\u7F29\u8FDB\u4E00\u81F4 */
.pm-pending-mark { display: inline-flex; justify-content: center; flex: 0 0 14px; }
.pm-pending-title { margin: 0; flex: 0 1 auto; min-width: 0; font-size: 14px; font-weight: 600; line-height: 1.5; color: var(--pm-text); overflow-wrap: anywhere; }
/* \u6807\u9898\u6298\u6210\u4E24\u884C\u65F6\u53C9\u4ECD\u5728\u53F3\u4E0A\u89D2 */
.pm-pending-aside { position: relative; flex: 0 0 24px; align-self: flex-start; height: 24px; margin-left: auto; }
/* \u8303\u56F4\u80F6\u56CA\u53EF\u6536\u7F29\uFF1A\u6807\u9898\u3001\u9879\u76EE\u540D\u5F88\u957F\u65F6\u4E0D\u628A\u80F6\u56CA\u548C\u53F3\u4E0A\u89D2\u7684\u53C9\u6324\u51FA\u89C6\u53E3\uFF08\u540C\u8BB0\u5FC6\u5361\u5143\u4FE1\u606F\u884C\u7684\u80F6\u56CA\uFF09 */
.pm-pending-scope { display: inline-flex; flex: 0 0 auto; max-width: 50%; min-width: 0; }
.pm-pending-scope .pm-chip { min-width: 0; overflow: hidden; }
.pm-pending-body { display: flex; flex-direction: column; gap: 10px; padding-left: 16px; }
.pm-pending-item--marked .pm-pending-body { padding-left: 22px; }
.pm-pending-hint { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-pending-hint .pm-link { margin-left: 8px; font-size: 12px; }
.pm-pending-item .pm-pending-error { margin-top: 6px; }
.pm-pending-refused { margin: 0; padding: 12px 0; font-size: 12px; line-height: 1.5; color: var(--pm-text); }
.pm-pending-item--result { transition: opacity 120ms ease-out; }
@starting-style { .pm-pending-item--result { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .pm-pending-item--result { transition: none; } }
.pm-pending-path { margin: 0; font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); font-size: 12px; color: var(--pm-text); overflow-wrap: anywhere; }
.pm-pending-error-text {
  margin: 0; padding: 8px 12px; border-radius: var(--dsw-radius-sm, 8px); background: var(--pm-bg-block);
  font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); font-size: 12px; line-height: 1.5;
  color: var(--pm-text); white-space: pre-wrap; overflow-wrap: anywhere;
}
.pm-pending-option { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pm-pending-option-label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--pm-text); }
.pm-pending-input {
  width: 96px; height: 28px; padding: 0 8px; font: inherit; font-size: 13px; color: var(--pm-text); background: var(--pm-bg);
  border: .5px solid var(--pm-line-input); border-radius: var(--dsw-radius-md, 12px);
}
.pm-pending-more {
  align-self: flex-start; margin-top: 4px; padding: 6px 0; border: 0; background: none;
  font: inherit; font-size: 13px; color: var(--pm-text-2); cursor: pointer;
}
.pm-pending-more:hover { color: var(--pm-text); }
`;

// client/checkup/runs.ts
var import_react34 = require("react");
function scanCommand(scope) {
  return scope.kind === "all" ? { cmd: "scan" } : scope.kind === "global" ? { cmd: "scan", layer: { kind: "global" } } : { cmd: "scan", workspacePath: scope.workspacePath };
}
function useCheckupRuns(session, checkups) {
  const gateway = useGateway();
  const [local2, setLocal] = (0, import_react34.useState)(/* @__PURE__ */ new Map());
  const live = (0, import_react34.useRef)(true);
  (0, import_react34.useEffect)(() => () => {
    live.current = false;
  }, []);
  (0, import_react34.useEffect)(() => {
    const isStale = (e) => e.state === "busy" || e.state === "failed" && checkups !== void 0 && completedAfter(checkups, e.scope, e.failedAt);
    setLocal((prev) => [...prev.values()].some(isStale) ? new Map([...prev].filter(([, e]) => !isStale(e))) : prev);
  }, [checkups]);
  const active = [...local2].filter(([, e]) => e.state !== "failed");
  const viewBusy = (checkups?.scopes ?? []).filter((s) => s.isInProgress).map((s) => s.scope);
  const busyScope = (scope) => {
    if (active.some(([key2, e]) => key2 === checkupKey(ALL_SCOPE) && e.state === "running")) return ALL_SCOPE;
    if (scope.kind === "all") return active[0]?.[1].scope ?? viewBusy[0];
    const key = checkupKey(scope);
    return active.some(([k]) => k === key) || viewBusy.some((s) => checkupKey(s) === key) ? scope : void 0;
  };
  const failure = (scope) => {
    const entry = local2.get(checkupKey(scope));
    return entry?.state === "failed" ? entry.failure : void 0;
  };
  const run = (scope) => {
    if (session.kind !== "ready" || busyScope(scope) !== void 0) return;
    const key = checkupKey(scope);
    setLocal((prev) => new Map(prev).set(key, { scope, state: "running" }));
    void gateway.execute(session.sessionId, scanCommand(scope)).then((result) => {
      if (!live.current) return;
      setLocal((prev) => {
        const next = new Map(prev);
        if (result.ok) next.delete(key);
        else if (result.code === "busy") next.set(key, { scope, state: "busy" });
        else next.set(key, { scope, state: "failed", failure: { code: result.code, detail: result.detail }, failedAt: Date.now() });
        return next;
      });
    });
  };
  return { busyScope, failure, run };
}
function completedAfter(checkups, scope, at2) {
  if (scope.kind === "all") return (checkups.allResult?.completedAt ?? -Infinity) > at2;
  const entry = checkups.scopes.find((s) => checkupKey(s.scope) === checkupKey(scope));
  return entry !== void 0 && Math.max(entry.lastCheckupAt ?? -Infinity, entry.lastResult?.completedAt ?? -Infinity) > at2;
}

// client/MemoryPage.tsx
var import_jsx_runtime35 = require("react/jsx-runtime");
var VIEW_LABEL = { todo: "tab.todo", library: "tab.library", deleted: "tab.deleted" };
function countTodo(pending, scope, outside = false) {
  const seen = /* @__PURE__ */ new Set();
  const count = { todo: 0, advice: 0, hasSecret: false };
  for (const item of pending?.items ?? []) {
    if (isInScope(pendingItemScopes(item), scope) === outside) continue;
    const key = pendingItemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    if (item.level === "advice") count.advice += 1;
    else count.todo += 1;
    if (item.kind === "secret") count.hasSecret = true;
  }
  return count;
}
function dataOf(state) {
  return state.status === "ready" ? state.data : void 0;
}
function listScopes(library, deleted, pending, extra) {
  const projects = [];
  const add = (workspacePath) => {
    const project = { kind: "workspace", workspacePath };
    if (!projects.some((p) => sameScope(p, project))) projects.push(project);
  };
  for (const { layer: scope } of library?.layers ?? []) if (scope.kind === "workspace") add(scope.workspacePath);
  for (const { memory } of deleted?.items ?? []) if (memory.workspacePath !== void 0 && memory.scope === "workspace") add(memory.workspacePath);
  for (const item of pending?.items ?? []) for (const scope of pendingItemScopes(item)) if (scope.kind === "workspace") add(scope.workspacePath);
  for (const workspacePath of extra) add(workspacePath);
  return [{ kind: "global" }, ...projects.sort(compareScopes)];
}
function MemoryPage({ nav }) {
  const t = useT();
  const gateway = useGateway();
  const target = useNavTarget(nav);
  const current = gateway.useCurrentWorkspace();
  const chat = target.fromChat === true && current.status === "ready" ? current.workspacePath === void 0 ? { kind: "global" } : { kind: "workspace", workspacePath: current.workspacePath } : void 0;
  const resolved = target.scope ?? (target.fromChat === true ? chat : ALL_SCOPE);
  const session = gateway.useSession(resolved?.kind === "workspace" ? resolved.workspacePath : void 0);
  gateway.useFreshViews(session);
  const pendingState = gateway.useView(session, "pending");
  const library = dataOf(gateway.useView(session, "library"));
  const deleted = dataOf(gateway.useView(session, "deleted"));
  const health = dataOf(gateway.useView(session, "health"));
  const checkups = dataOf(gateway.useView(session, "checkups"));
  const pending = dataOf(pendingState);
  const runs = useCheckupRuns(session, checkups);
  const seen = useVisitSeen(resolved === void 0 ? "" : checkupKey(resolved));
  const tabsId = (0, import_react35.useId)();
  const entry = useLanding(nav);
  useChatLanding(nav, entry, target, resolved, pending);
  const canOpenSettings = useCanOpen(nav, "settings");
  const [fold] = (0, import_react35.useState)(() => /* @__PURE__ */ new Map());
  const scroll = useScrollMemory(
    resolved === void 0 ? "" : `${target.view}|${checkupKey(resolved)}`,
    target.memoryId !== void 0 || target.level !== void 0 || target.newItem !== void 0
  );
  const ownScope = resolved?.kind === "all" && target.view === "library" && target.memoryId !== void 0 ? library?.layers.find((l) => l.items.some((m) => m.id === target.memoryId))?.layer : void 0;
  (0, import_react35.useLayoutEffect)(() => {
    if (ownScope !== void 0) nav.update({ scope: ownScope });
  });
  if (session.kind === "none") {
    return /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "pm-page pm-page--empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("header", { className: "pm-page-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("h1", { className: "pm-page-title", children: t("page.title") }),
        canOpenSettings ? /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(Button, { onClick: () => {
          nav.openSettings();
        }, children: t("page.settings") }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(EmptyState, { variant: "daily", title: t("session.none.title"), children: t("session.none.body") })
    ] });
  }
  if (resolved === void 0) return /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("div", { className: "pm-page-frame", "aria-busy": "true" });
  const scope = resolved;
  const chatPath = chat?.kind === "workspace" ? chat.workspacePath : void 0;
  const scopes = listScopes(library, deleted, pending, [chatPath, scope.kind === "workspace" ? scope.workspacePath : void 0].filter((p) => p !== void 0));
  const isChat = (s) => chat?.kind === "workspace" && samePageScope(s, chat);
  const projectCount = scopes.length - 1;
  const select = (next) => {
    nav.update({ scope: next, memoryId: void 0 });
  };
  const counts = countTodo(pending, scope);
  const libraryCount = library?.layers.filter((l) => isInScope([l.layer], scope)).reduce((n, l) => n + l.items.length, 0);
  const deletedCount = deleted?.items.filter((item) => isInScope([scopeOfMemory(item.memory)].filter((s) => s !== void 0), scope)).length;
  const tabLabel = (view) => {
    const count = view === "todo" ? pending === void 0 ? void 0 : counts.todo : view === "library" ? libraryCount : deletedCount || void 0;
    return /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)(import_jsx_runtime35.Fragment, { children: [
      t(VIEW_LABEL[view]),
      count !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("span", { className: "pm-tab-count", children: formatNumber(count) }) : null,
      view === "todo" && counts.advice > 0 ? /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("span", { className: "pm-tab-count", children: t("tab.todo.advice", { n: formatNumber(counts.advice) }) }) : null
    ] });
  };
  const items = MEMORY_VIEWS.map((view) => ({
    value: view,
    label: tabLabel(view),
    id: `${tabsId}-${view}`,
    panelId: `${tabsId}-${view}-panel`
  }));
  const scopeHealth = scope.kind === "all" ? void 0 : health?.layers.find((l) => sameScope(l.layer, scope));
  const isGovernanceEnabled = (checkups ?? health)?.governanceEnabled !== false;
  const checkupScopes = health?.layers.map((l) => l.layer) ?? checkups?.scopes.filter((s) => s.isCheckable).map((s) => s.scope);
  const checkupProjectCount = checkupScopes?.filter((s) => s.kind === "workspace").length ?? projectCount;
  return /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("div", { className: "pm-page-frame", children: /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "pm-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("aside", { className: "pm-rail", children: [
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("h1", { className: "pm-page-title", children: t("page.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
        ScopeRail,
        {
          scopes: [ALL_SCOPE, ...scopes],
          selected: scope,
          onSelect: select,
          row: (s) => {
            const count = countTodo(pending, s);
            if (s.kind === "all") return { sub: allScopesSub(projectCount, t), count };
            const n = library === void 0 ? void 0 : library.layers.find((l) => sameScope(l.layer, s))?.items.length ?? 0;
            const score = isGovernanceEnabled ? scoreOf(health?.layers.find((l) => sameScope(l.layer, s))) : void 0;
            const parts = n === void 0 ? [] : [t(n === 1 ? "rail.count.one" : "rail.count", { n: formatNumber(n) })];
            if (score === "secret") parts.push(t("rail.unscored"));
            else if (score !== void 0) parts.push(t("health.score", { score: formatNumber(score) }));
            if (isChat(s)) parts.push(t("scope.currentChat"));
            return { sub: parts.join(" \xB7 "), count };
          }
        }
      ),
      canOpenSettings ? /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("div", { className: "pm-rail-foot", children: /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("button", { type: "button", className: "pm-rail-settings", onClick: () => {
        nav.openSettings();
      }, children: [
        t("rail.settings"),
        /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(Icon, { name: "chevronRight" })
      ] }) }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("main", { ref: scroll.ref, className: "pm-main", onScroll: scroll.onScroll, children: [
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
        NarrowScope,
        {
          scopes: [ALL_SCOPE, ...scopes],
          selected: scope,
          onSelect: select,
          others: scope.kind === "all" ? void 0 : countTodo(pending, scope, true),
          onSettings: canOpenSettings ? () => {
            nav.openSettings();
          } : void 0
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("header", { className: "pm-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "pm-head-main", children: [
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("h2", { className: "pm-head-title", children: scopeLabel(scope, t) }),
          isChat(scope) ? /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(Chip, { variant: "neutral", children: t("scope.currentChat") }) : null,
          scope.kind === "workspace" ? null : /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("span", { className: "pm-head-path", children: scope.kind === "all" ? allScopesSub(projectCount, t) : t("scope.global.sub") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("div", { className: "pm-head-actions", children: /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
          TitleControls,
          {
            scope,
            session,
            runs,
            checkups,
            isGovernanceEnabled,
            projectCount: checkupProjectCount,
            isEmpty: libraryCount === 0
          }
        ) })
      ] }),
      health !== void 0 && (scope.kind === "all" || scopeHealth !== void 0) ? /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
        StatusBar,
        {
          scope,
          view: target.view,
          nav,
          runs,
          seen,
          health,
          checkups,
          isGovernanceEnabled,
          memoryCount: libraryCount ?? (scope.kind === "all" ? health.layers : [scopeHealth]).reduce((n, l) => n + l.totalMemories, 0),
          projectCount,
          needs: scopes.map((s) => ({ scope: s, ...countTodo(pending, s) }))
        },
        checkupKey(scope)
      ) : null,
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(SegmentedTabs, { label: t("tabs.label"), items, value: target.view, onChange: (view) => {
        nav.update({ view, memoryId: void 0 });
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("div", { role: "tabpanel", id: `${tabsId}-${target.view}-panel`, "aria-labelledby": `${tabsId}-${target.view}`, className: "pm-page-panel", children: target.view === "todo" ? /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(PendingTab, { nav, session, scope, seen, workspacePath: scope.kind === "workspace" ? scope.workspacePath : void 0 }, checkupKey(scope)) : ownScope !== void 0 ? null : target.view === "library" ? /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(LibraryTab, { nav, scope, session, fold }, checkupKey(scope)) : /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(DeletedTab, { nav, scope, session, fold }, checkupKey(scope)) })
    ] })
  ] }) });
}
function useLanding(nav) {
  const entry = (0, import_react35.useRef)(void 0);
  const [fromEntry] = (0, import_react35.useState)(() => {
    const was = nav.takeEntry();
    if (was) entry.current = nav.get();
    return was;
  });
  (0, import_react35.useLayoutEffect)(() => {
    const drain = nav.subscribe(() => {
      if (nav.takeEntry()) entry.current = nav.get();
    });
    if (!fromEntry) nav.navigate({ view: "todo" });
    return drain;
  }, [nav]);
  return entry;
}
function useScrollMemory(key, isJump) {
  const ref = (0, import_react35.useRef)(null);
  const saved = (0, import_react35.useRef)(/* @__PURE__ */ new Map());
  const current = (0, import_react35.useRef)(key);
  current.current = key;
  (0, import_react35.useLayoutEffect)(() => {
    if (ref.current !== null && !isJump) ref.current.scrollTop = saved.current.get(key) ?? 0;
  }, [key]);
  return { ref, onScroll: () => {
    if (ref.current !== null) saved.current.set(current.current, ref.current.scrollTop);
  } };
}
function useChatLanding(nav, entry, target, scope, pending) {
  (0, import_react35.useEffect)(() => {
    if (entry.current === void 0) return;
    if (entry.current !== target || target.fromChat !== true || target.view !== "todo" || target.level !== void 0 || target.memoryId !== void 0) {
      entry.current = void 0;
      return;
    }
    if (scope === void 0 || pending === void 0) return;
    entry.current = void 0;
    const count = countTodo(pending, scope);
    if (count.todo === 0 && count.advice === 0) nav.update({ view: "library" });
  });
}
function NarrowScope({ scopes, selected, onSelect, others, onSettings }) {
  const t = useT();
  const onChange = (event) => {
    const next = scopes.find((s) => checkupKey(s) === event.target.value);
    if (next !== void 0 && !samePageScope(next, selected)) onSelect(next);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "pm-narrow", children: [
    /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "pm-narrow-bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("label", { className: "pm-narrow-scope", children: [
        t("rail.label"),
        /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("select", { value: checkupKey(scopes.find((s) => samePageScope(s, selected)) ?? selected), onChange, children: scopes.map((s) => /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("option", { value: checkupKey(s), children: scopeLabel(s, t) }, checkupKey(s))) })
      ] }),
      onSettings !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(Button, { variant: "ghost", onClick: onSettings, children: t("page.settings") }) : null
    ] }),
    others !== void 0 && others.todo > 0 ? /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("button", { type: "button", className: "pm-narrow-others", onClick: () => {
      onSelect(ALL_SCOPE);
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(StatusMarker, { kind: others.hasSecret ? "secret" : "pending" }),
      t("narrow.others", { n: formatNumber(others.todo) })
    ] }) : null
  ] });
}
function ScopeRail({ scopes, selected, onSelect, row }) {
  const t = useT();
  const list2 = (0, import_react35.useRef)(null);
  const index = Math.max(0, scopes.findIndex((s) => samePageScope(s, selected)));
  const onKeyDown = (event) => {
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = Math.min(scopes.length - 1, Math.max(0, index + step));
    list2.current?.querySelectorAll(".pm-rail-scope").item(next).focus();
    if (next !== index) onSelect(scopes[next]);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("nav", { "aria-label": t("rail.label"), className: "pm-rail-nav", children: /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("ul", { ref: list2, className: "pm-rail-list", children: scopes.map((scope, i) => {
    const isSelected = i === index;
    const { sub, count } = row(scope);
    return /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("li", { className: scope.kind === "all" ? "pm-rail-item pm-rail-item--all" : "pm-rail-item", children: /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)(
      "button",
      {
        type: "button",
        className: "pm-rail-scope",
        "aria-current": isSelected ? "true" : void 0,
        tabIndex: isSelected ? 0 : -1,
        onClick: () => {
          if (!isSelected) onSelect(scope);
        },
        onKeyDown,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("span", { className: "pm-rail-name", title: scopeLabel(scope, t), children: scopeLabel(scope, t) }),
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("span", { className: "pm-rail-sub", children: sub }),
          count.todo > 0 ? /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("span", { className: "pm-rail-badge", children: [
            /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(StatusMarker, { kind: count.hasSecret ? "secret" : "pending" }),
            /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("span", { "aria-hidden": "true", children: formatNumber(count.todo) }),
            /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("span", { className: "pm-sr-only", children: t(count.hasSecret ? "rail.badge.secret" : "rail.badge", { n: formatNumber(count.todo) }) })
          ] }) : null
        ]
      }
    ) }, checkupKey(scope));
  }) }) });
}
var memoryPageCss = `
/* \u5BBF\u4E3B\u4E2D\u680F\u662F\u7EB5\u5411 flex\uFF1A\u6839\u8981\u5360\u6EE1\u4E2D\u680F\u3001\u5141\u8BB8\u538B\u7F29\uFF0C\u9875\u9762\u91CC\u7684\u6EDA\u52A8\u533A\u624D\u6709\u56FA\u5B9A\u9AD8\u5EA6\u53EF\u6EDA\u3002 */
.pm-root--page { flex: 1 1 0; height: 100%; min-height: 0; }
/* \u9876\u90E8\u7559\u767D\u90FD\u52A0\u4E0A\u5BBF\u4E3B\u7A97\u53E3\u9876\u5E26\u7684\u4E0B\u6C89\u91CF\uFF08\u5BF9\u9F50\u5BBF\u4E3B\u5165\u53E3\u9875\uFF1B\u666E\u901A\u6D4F\u89C8\u5668\u91CC\u4E3A 0\uFF09\uFF0C\u4FA7\u680F\u6536\u8D77\u65F6\u5185\u5BB9\u4E0D\u538B\u5728\u7EA2\u7EFF\u706F\u548C\u4FA7\u680F\u5F00\u5173\u4E0B\u3002 */
.pm-page-frame { height: 100%; min-height: 0; container: pm-page / inline-size; background: var(--pm-bg); }
.pm-page { height: 100%; min-height: 0; display: grid; grid-template-columns: 240px minmax(0, 1fr); background: var(--pm-bg); }
.pm-page--empty { display: flex; flex-direction: column; gap: 16px; padding: calc(20px + var(--dsh-frame-top-clearance, 0px)) 32px 48px; overflow: auto; scrollbar-gutter: stable; }
.pm-page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pm-page-title { margin: 0; font-size: 20px; font-weight: 600; line-height: 28px; color: var(--pm-text); }
.pm-rail {
  min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: calc(20px + var(--dsh-frame-top-clearance, 0px)) 12px 12px;
  border-right: .5px solid var(--pm-line);
}
.pm-rail > .pm-page-title { padding: 0 10px; }
.pm-rail-nav { flex: 1; min-height: 0; overflow: auto; scrollbar-gutter: stable; }
.pm-rail-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 2px; }
.pm-rail-item--all { padding-bottom: 6px; margin-bottom: 4px; border-bottom: .5px solid var(--pm-line); }
.pm-rail-scope {
  width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 8px; align-items: center;
  padding: 7px 10px; border: 0; border-radius: 10px; background: transparent; font: inherit; text-align: left; color: var(--pm-text); cursor: pointer;
}
.pm-rail-scope:hover { background: var(--pm-hover); }
.pm-rail-scope[aria-current='true'] { background: var(--pm-pressed); }
.pm-rail-name { grid-column: 1; font-size: 14px; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pm-rail-scope[aria-current='true'] .pm-rail-name { font-weight: 600; }
.pm-rail-sub { grid-column: 1; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pm-rail-badge { grid-column: 2; grid-row: 1 / span 2; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; }
.pm-rail-foot { padding-top: 8px; border-top: .5px solid var(--pm-line); }
.pm-rail-settings {
  width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; border: 0; border-radius: 10px;
  background: transparent; font: inherit; font-size: 13px; color: var(--pm-text-2); cursor: pointer;
}
.pm-rail-settings:hover { background: var(--pm-hover); color: var(--pm-text); }
/* \u4E3B\u533A\u5355\u72EC\u4F5C\u5BB9\u5668\uFF08pm-main\uFF09\uFF1A\u4E3B\u533A\u91CC\u6309\u53EF\u7528\u5BBD\u5EA6\u6392\u7248\u7684\u89C4\u5219\u67E5\u5B83\uFF0C\u5BBD\u5EA6\u4E0D\u542B\u5DE6\u680F\u3002 */
.pm-main {
  min-height: 0; overflow: auto; scrollbar-gutter: stable; container: pm-main / inline-size;
  display: flex; flex-direction: column; gap: 16px; padding: calc(20px + var(--dsh-frame-top-clearance, 0px)) 32px 48px;
}
.pm-main > * { max-width: 840px; }
.pm-narrow { display: none; flex-direction: column; gap: 8px; }
.pm-narrow-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pm-narrow-scope {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 4px 0 12px; border-radius: 10px;
  background: var(--pm-bg-block); font-size: 13px; font-weight: 600; color: var(--pm-text-2);
}
.pm-narrow-scope select {
  max-width: 220px; height: 100%; border: 0; outline: none; background: transparent; font: inherit; font-weight: 600; color: var(--pm-text); cursor: pointer;
}
.pm-narrow-scope:focus-within { outline: var(--dsw-focus-ring-width, 2px) solid var(--pm-focus); outline-offset: 0; }
.pm-narrow-others {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; background: transparent;
  font: inherit; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); cursor: pointer;
}
.pm-narrow-others:hover { color: var(--pm-text); }
@container pm-page (max-width: 720px) {
  .pm-page { grid-template-columns: minmax(0, 1fr); }
  .pm-rail { display: none; }
  .pm-narrow { display: flex; }
  .pm-main { padding: calc(16px + var(--dsh-frame-top-clearance, 0px)) 16px 40px; }
}
.pm-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 12px; }
/* \u4E3B\u533A\u7A84\u5230\u653E\u4E0D\u4E0B\u8303\u56F4\u540D\u548C\u4E24\u4E2A\u63A7\u4EF6\u65F6\uFF0C\u63A7\u4EF6\u6298\u5230\u4E0B\u4E00\u884C\u9760\u53F3\uFF1B\u518D\u7A84\uFF08\u300C\u4FDD\u5B58\u5931\u8D25\u300D\u63D0\u793A\u4E5F\u5728\u65F6\uFF09\u52A8\u4F5C\u533A\u91CC\u63A5\u7740\u6298\u884C\uFF0C\u4E0D\u6491\u51FA\u6A2A\u5411\u6EDA\u52A8 */
.pm-head-main { flex: 1 1 200px; min-width: 0; display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 8px; }
.pm-head-title { min-width: 0; overflow-wrap: anywhere; margin: 0; font-size: 20px; font-weight: 600; line-height: 28px; color: var(--pm-text); }
.pm-head-path { min-width: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pm-head-actions {
  display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px;
  min-width: 0; max-width: 100%; margin-left: auto;
}
.pm-tab-count { font-weight: 400; color: var(--pm-text-2); }
.pm-page-panel { min-height: 0; }
`;

// client/settings/controls.tsx
var import_react36 = require("react");
var import_react_dom2 = require("react-dom");
var import_jsx_runtime36 = require("react/jsx-runtime");
function TextField({ id, value, onChange, error, hint, multiline = false, readOnly = false, disabled = false, inputMode }) {
  const messageId = `${id}-message`;
  const props = {
    id,
    value,
    readOnly,
    disabled,
    className: multiline ? "pm-input pm-input--multiline" : "pm-input",
    "aria-describedby": error !== void 0 || hint !== void 0 ? messageId : void 0,
    ...error !== void 0 ? { "aria-invalid": true } : {}
  };
  return /* @__PURE__ */ (0, import_jsx_runtime36.jsxs)(import_jsx_runtime36.Fragment, { children: [
    multiline ? /* @__PURE__ */ (0, import_jsx_runtime36.jsx)("textarea", { rows: 2, ...props, onChange: (event) => {
      onChange(event.target.value);
    } }) : /* @__PURE__ */ (0, import_jsx_runtime36.jsx)("input", { type: "text", inputMode, ...props, onChange: (event) => {
      onChange(event.target.value);
    } }),
    error !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime36.jsx)("p", { id: messageId, className: "pm-input-invalid", role: "status", children: error }) : hint !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime36.jsx)("p", { id: messageId, className: "pm-setting-hint", children: hint }) : null
  ] });
}
var TABBABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
function Dialog({ title, closeLabel, onClose, footer, children, onBack, backLabel }) {
  const accent = useGateway().useConfig()?.accent;
  const dialog = (0, import_react36.useRef)(null);
  const close = (0, import_react36.useRef)(onClose);
  close.current = onClose;
  (0, import_react36.useEffect)(() => {
    const opener = document.activeElement;
    const tabbable = () => [...dialog.current?.querySelectorAll("*") ?? []].filter((el) => el.matches(TABBABLE));
    const initial = tabbable().find((el) => el.matches("input, textarea")) ?? tabbable()[0];
    initial?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = tabbable();
      const first = items[0];
      const last = items.at(-1);
      if (first === void 0 || last === void 0) return;
      const active = document.activeElement;
      const isInside = dialog.current?.contains(active) ?? false;
      if (!isInside || (event.shiftKey ? active === first : active === last)) {
        event.preventDefault();
        const target = event.shiftKey && isInside ? last : first;
        target.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, []);
  return (0, import_react_dom2.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime36.jsxs)("div", { className: "pm-root pm-dialog-root", role: "presentation", "data-pm-accent": accent, children: [
    /* @__PURE__ */ (0, import_jsx_runtime36.jsx)("div", { className: "pm-dialog-mask", "aria-hidden": "true", onClick: () => {
      close.current();
    } }),
    /* @__PURE__ */ (0, import_jsx_runtime36.jsxs)("div", { ref: dialog, className: "pm-dialog", role: "dialog", "aria-modal": "true", "aria-label": title, children: [
      /* @__PURE__ */ (0, import_jsx_runtime36.jsxs)("div", { className: "pm-dialog-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime36.jsxs)("h2", { className: "pm-dialog-title", children: [
          onBack !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime36.jsx)("button", { type: "button", className: "pm-dialog-back", onClick: onBack, children: backLabel }) : null,
          title
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime36.jsx)("button", { type: "button", className: "pm-dialog-close", "aria-label": closeLabel, onClick: () => {
          close.current();
        }, children: /* @__PURE__ */ (0, import_jsx_runtime36.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", stroke: "currentColor", strokeWidth: "1.4", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime36.jsx)("path", { d: "m3.5 3.5 7 7m0-7-7 7" }) }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime36.jsx)("div", { className: "pm-dialog-body", children }),
      /* @__PURE__ */ (0, import_jsx_runtime36.jsx)("div", { className: "pm-dialog-footer", children: footer })
    ] })
  ] }), document.body);
}
var controlsCss = `
.pm-input {
  width: 100%; max-width: 320px; height: 34px; padding: 0 12px; border: .5px solid var(--pm-line-input);
  border-radius: var(--dsw-radius-md, 12px); background: var(--pm-bg-raised); font: inherit; font-size: 13px; line-height: 1.5; color: var(--pm-text);
}
.pm-input--multiline { max-width: none; height: auto; min-height: 56px; padding: 6px 12px; resize: vertical; }
.pm-input:focus-visible { outline: none; border-color: var(--dsw-alias-state-business-primary); }
.pm-input:disabled, .pm-input:read-only { color: var(--pm-text-3); cursor: default; }
.pm-input[aria-invalid='true'] { border-color: var(--pm-error); }
.pm-input-invalid { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-error); }

.pm-dialog-root {
  position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center;
  padding: max(24px, var(--dsh-frame-overlay-top, 24px)) 24px;
}
.pm-dialog-mask { position: absolute; inset: var(--dsh-frame-chrome-top, 0px) 0 0; backdrop-filter: var(--dsw-mask-blur); background: var(--dsw-alias-bg-mask-1); }
.pm-dialog-mask, .pm-dialog { animation: pm-dialog-in 200ms cubic-bezier(0.4, 0, 0.2, 1); }
@keyframes pm-dialog-in { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .pm-dialog-mask, .pm-dialog { animation: none; } }
.pm-dialog {
  position: relative; z-index: 1; display: flex; flex-direction: column; gap: 20px; width: min(440px, 100%); max-height: 100%;
  padding: 0 0 24px; overflow: hidden; border-radius: var(--dsw-radius-panel, 20px); background: var(--dsw-alias-bg-layer-2);
  box-shadow: var(--dsw-elevation-prominent);
}
.pm-dialog-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 22px 14px 0 24px; }
.pm-dialog-title { margin: 0; font-size: 16px; line-height: 24px; font-weight: 500; color: var(--pm-text); }
.pm-dialog-close {
  display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 0;
  border-radius: var(--dsw-radius-sm, 8px); background: transparent; color: var(--pm-text-2); cursor: pointer;
}
.pm-dialog-close:hover { background: var(--pm-hover); }
.pm-dialog-back {
  margin-right: 6px; padding: 0; border: 0; background: none; font: inherit; font-size: 13px; font-weight: 400;
  color: var(--pm-text-2); cursor: pointer;
}
.pm-dialog-back:hover { color: var(--pm-text); }
.pm-dialog-body { min-height: 0; overflow: auto; scrollbar-gutter: stable; padding: 0 24px; display: flex; flex-direction: column; gap: 14px; }
.pm-dialog-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 0 24px; }
.pm-field { display: flex; flex-direction: column; gap: 6px; }
`;

// client/settings/Scenes.tsx
var import_react38 = require("react");

// client/settings/CustomTypes.tsx
var import_react37 = require("react");
var import_jsx_runtime37 = require("react/jsx-runtime");
var ERROR_KEY = {
  "required": "settings.type.error.required",
  "name-format": "settings.type.error.name-format",
  "name-builtin": "settings.type.error.name-builtin",
  "name-removed-preset": "settings.type.error.name-removed-preset",
  "name-taken": "settings.type.error.name-taken",
  "name-pending": "settings.type.error.name-pending",
  "label-taken": "settings.type.error.label-taken",
  "decay-invalid": "settings.type.error.decay-invalid"
};
function TypeFormFields({ draft, errors, isNameLocked = false, onChange }) {
  const t = useT();
  const id = (0, import_react37.useId)();
  const errorOf = (field2) => {
    const code = errors?.[field2];
    return code === void 0 ? void 0 : t(ERROR_KEY[code], { label: draft.label.trim() });
  };
  const field = (key, labelKey, hintKey, extra = {}) => /* @__PURE__ */ (0, import_jsx_runtime37.jsxs)("div", { className: "pm-field", children: [
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("label", { className: "pm-setting-label", htmlFor: `${id}-${key}`, children: t(labelKey) }),
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(TextField, { id: `${id}-${key}`, value: draft[key], onChange: (text) => {
      onChange({ [key]: text });
    }, error: errorOf(key), hint: t(hintKey), ...extra })
  ] });
  const choice = (key, labelKey, hintKey, values, optionKey) => {
    const error = errorOf(key);
    return /* @__PURE__ */ (0, import_jsx_runtime37.jsxs)("div", { className: "pm-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("span", { className: "pm-setting-label", children: t(labelKey) }),
      /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(
        SegmentedControl,
        {
          id: `${id}-${key}`,
          label: t(labelKey),
          value: draft[key],
          options: values.map((v) => ({ value: v, label: t(optionKey(v)) })),
          onChange: (next) => {
            onChange({ [key]: next });
          }
        }
      ),
      error !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("p", { className: "pm-input-invalid", role: "status", children: error }) : /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("p", { className: "pm-setting-hint", children: t(hintKey) })
    ] });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime37.jsxs)(import_jsx_runtime37.Fragment, { children: [
    field("label", "settings.type.label", "settings.type.labelHint"),
    field("name", "settings.type.name", isNameLocked ? "settings.type.nameLocked" : "settings.type.nameHint", { readOnly: isNameLocked }),
    field("description", "settings.type.description", "settings.type.descriptionHint", { multiline: true }),
    field("whenToSave", "settings.type.whenToSave", "settings.type.whenToSaveHint", { multiline: true }),
    field("howToUse", "settings.type.howToUse", "settings.type.howToUseHint", { multiline: true }),
    choice("recall", "settings.type.recall", "settings.type.recallHint", RECALL_MODES, (v) => `settings.type.recall.${v}`),
    choice("governancePriority", "settings.type.priority", "settings.type.priorityHint", PRIORITIES, (v) => `settings.type.priority.${v}`),
    field("decayDays", "settings.type.decayDays", "settings.type.decayDaysHint", { inputMode: "numeric" })
  ] });
}

// client/settings/Scenes.tsx
var import_jsx_runtime38 = require("react/jsx-runtime");
var BUILTIN = BUILTIN_TYPE_NAMES;
function sceneLabel(t, id, scenes) {
  if (id === GENERAL_SCENE) return t("settings.scene.custom");
  if (isPresetScene(id)) return t(`settings.scene.${id}`);
  return Object.hasOwn(scenes, id) ? scenes[id].label : id;
}
function typeNames(t, labels) {
  return t("settings.typeOpen") + labels.join(t("settings.typeSep")) + t("settings.typeClose");
}
function typesSummary(t, names, customTypes) {
  const label = (name) => typeLabel(t, name, { customTypes });
  const builtin = names.filter((n) => BUILTIN.includes(n));
  const parts = builtin.length === BUILTIN.length ? [t("settings.scene.generalTypes")] : builtin.length > 0 ? [builtin.map(label).join(t("settings.scene.listSep"))] : [];
  return [...parts, ...names.filter((n) => !BUILTIN.includes(n)).map(label)].join(t("settings.scene.groupSep"));
}
function isPooled(pool, name) {
  if (isPresetType(name)) return !pool.removedPresets.includes(name);
  return BUILTIN.includes(name) || Object.hasOwn(pool.customTypes, name);
}
function poolOf(fields) {
  return { scenes: fields.scenes, customTypes: fields.customTypes, removedPresets: fields.removedPresets };
}
function definitionOf(customTypes, name) {
  return Object.hasOwn(customTypes, name) ? customTypes[name] : TYPE_DEFINITIONS[name];
}
function countOf(name, migrations, counts) {
  return counts === void 0 ? void 0 : memoryCountOf(name, migrations, counts);
}
function hasMemories(name, saved, migrations, counts) {
  const n = countOf(name, migrations, counts);
  if (n !== void 0) return n > 0;
  return isPresetType(name) || Object.hasOwn(saved.customTypes, name) || Object.values(migrations).some((m) => m.action === "retype" && m.to === name);
}
function SceneSection({ fields, saved, migrations, counts, canMigrate, disabled, now, onChange }) {
  const t = useT();
  const id = (0, import_react38.useId)();
  const [dialog, setDialog] = (0, import_react38.useState)(void 0);
  const [removing, setRemoving] = (0, import_react38.useState)(void 0);
  const [focusNext, focusKey] = useFocusNext();
  const ids = Object.keys(fields.scenes);
  const sceneIds = [GENERAL_SCENE, ...ids];
  const remaining = Math.max(0, MAX_SCENES - ids.length);
  const isRemoving = (kind, key) => removing?.kind === kind && removing.id === key;
  const openDialog = (mode) => {
    setRemoving(void 0);
    setDialog(mode);
  };
  const removeScene = (sceneId) => {
    const { [sceneId]: _removed, ...scenes } = fields.scenes;
    setRemoving(void 0);
    onChange({ scenes, ...fields.template === sceneId ? { template: GENERAL_SCENE } : {} });
    focusNext("group:scenes");
  };
  const sceneTile = (sceneId) => {
    const name = sceneLabel(t, sceneId, fields.scenes);
    const isSelected = fields.template === sceneId;
    const scene = sceneId === GENERAL_SCENE ? void 0 : fields.scenes[sceneId];
    const isEdited = scene !== void 0 && isPresetEdited(sceneId, scene, fields.removedPresets);
    const types = sceneTypes(fields, sceneId);
    const detailId = `${id}-${sceneId}-types`;
    return /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("li", { className: isSelected ? "pm-tile pm-tile--selected" : "pm-tile", children: [
      /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("label", { className: "pm-tile-main", children: [
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
          "input",
          {
            type: "radio",
            name: `${id}-scene`,
            className: "pm-tile-radio",
            checked: isSelected,
            disabled,
            "aria-label": name,
            "aria-describedby": detailId,
            onChange: () => {
              onChange({ template: sceneId });
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("span", { className: "pm-tile-head", children: [
          /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "pm-tile-title", children: name }),
          isEdited ? /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "pm-scene-tag", children: t("settings.scene.edited") }) : null
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "pm-tile-detail", id: detailId, children: sceneId === GENERAL_SCENE ? types.map((n) => typeLabel(t, n, { customTypes: fields.customTypes })).join(t("settings.scene.listSep")) : typesSummary(t, types, fields.customTypes) })
      ] }),
      scene === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("div", { className: "pm-tile-foot", children: isRemoving("scene", sceneId) ? /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
        LinkConfirm,
        {
          question: t(isSelected ? "settings.scene.removeCurrent" : "settings.scene.removeQuestion", { name }),
          actions: [{ label: t("settings.scene.removeConfirm"), onClick: () => {
            removeScene(sceneId);
          } }],
          cancelLabel: t("settings.scene.cancel"),
          onCancel: () => {
            setRemoving(void 0);
            focusNext(`remove:scene:${sceneId}`);
          }
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)(import_jsx_runtime38.Fragment, { children: [
        isEdited && isPresetScene(sceneId) ? /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
          Button,
          {
            variant: "quiet",
            disabled,
            "aria-label": t("settings.scene.resetAria", { name }),
            onClick: () => {
              onChange({ scenes: { ...fields.scenes, [sceneId]: { ...scene, types: presetSceneTypes(sceneId, fields.removedPresets) } } });
            },
            children: t("settings.scene.reset")
          }
        ) : null,
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
          Button,
          {
            variant: "quiet",
            disabled,
            "aria-label": t("settings.scene.editAria", { name }),
            onClick: () => {
              openDialog({ kind: "scene", id: sceneId });
            },
            children: t("settings.scene.edit")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
          Button,
          {
            variant: "quiet",
            disabled,
            "aria-label": t("settings.scene.removeAria", { name }),
            ...focusKey(`remove:scene:${sceneId}`),
            onClick: () => {
              setRemoving({ kind: "scene", id: sceneId });
            },
            children: t("settings.scene.remove")
          }
        )
      ] }) })
    ] }, sceneId);
  };
  const typeTile = (name) => {
    const label = typeLabel(t, name, { customTypes: fields.customTypes });
    const isBuiltin = BUILTIN.includes(name);
    const isPreset = isPresetType(name);
    const isEdited = isPresetTypeEdited(name, fields.customTypes);
    const users = sceneIds.filter((sid) => sceneTypes(fields, sid).includes(name)).map((sid) => sceneLabel(t, sid, fields.scenes));
    const usage = users.length > 0 ? t("settings.types.usedBy", { names: users.join(t("settings.scene.listSep")) }) : t("settings.types.unused");
    const n = countOf(name, migrations, counts);
    const resetPreset = () => {
      const { [name]: _edited, ...customTypes } = fields.customTypes;
      onChange({ customTypes });
    };
    let foot;
    if (isBuiltin) {
      foot = /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
        Button,
        {
          variant: "quiet",
          disabled,
          "aria-label": t("settings.types.viewAria", { name: label }),
          onClick: () => {
            openDialog({ kind: "view", name });
          },
          children: t("settings.types.view")
        }
      );
    } else if (isRemoving("type", name)) {
      foot = /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
        TypeRemoveConfirm,
        {
          name,
          pool: fields,
          saved,
          migrations,
          counts,
          canMigrate,
          onRemove: (action) => {
            setRemoving(void 0);
            onChange(removeType(poolOf(fields), name), action === "forget" ? forgetMigrations(migrations, name, counts) : keepMigrations(migrations, name));
            focusNext(`group:${isPreset ? "preset" : "custom"}`);
          },
          onCancel: () => {
            setRemoving(void 0);
            focusNext(`remove:type:${name}`);
          }
        }
      );
    } else {
      foot = /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)(import_jsx_runtime38.Fragment, { children: [
        isEdited ? /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(Button, { variant: "quiet", disabled, "aria-label": t("settings.scene.resetAria", { name: label }), onClick: resetPreset, children: t("settings.scene.reset") }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
          Button,
          {
            variant: "quiet",
            disabled,
            "aria-label": t("settings.types.editAria", { name: label }),
            ...focusKey(`edit:type:${name}`),
            onClick: () => {
              openDialog({ kind: "type", name });
            },
            children: t("settings.types.edit")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
          Button,
          {
            variant: "quiet",
            disabled,
            "aria-label": t("settings.types.removeAria", { name: label }),
            ...focusKey(`remove:type:${name}`),
            onClick: () => {
              setRemoving({ kind: "type", id: name });
            },
            children: t("settings.types.remove")
          }
        )
      ] });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("li", { className: "pm-tile", children: [
      /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "pm-tile-main", children: [
        /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("span", { className: "pm-tile-head", children: [
          /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "pm-tile-title", children: label }),
          isEdited ? /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "pm-scene-tag", children: t("settings.scene.edited") }) : null,
          !isBuiltin && !isPreset ? /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("code", { className: "pm-scene-code pm-tile-code", title: name, children: name }) : null
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "pm-tile-detail", children: n !== void 0 ? `${usage} \xB7 ${t("settings.types.count", { n })}` : usage })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("div", { className: "pm-tile-foot", children: foot })
    ] }, name);
  };
  const typeGroup = (group, names, extra = null, addTile = null) => /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "pm-tile-group", children: [
    /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("h4", { className: "pm-tile-group-title", id: `${id}-types-${group}`, tabIndex: -1, ...focusKey(`group:${group}`), children: t(`settings.types.group.${group}`) }),
    names.length > 0 || addTile !== null ? /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("ul", { className: "pm-tiles", "aria-labelledby": `${id}-types-${group}`, children: [
      names.map(typeTile),
      addTile
    ] }) : null,
    extra
  ] });
  const restorePreset = (name) => {
    const restored = restorePresetType(poolOf(fields), migrations, name);
    onChange(restored.pool, restored.migrations);
    focusNext(`edit:type:${name}`);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)(import_jsx_runtime38.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("section", { className: "pm-subgroup", children: [
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("h3", { className: "pm-subgroup-title", id: `${id}-scenes`, tabIndex: -1, ...focusKey("group:scenes"), children: t("settings.scene.label") }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("ul", { className: "pm-tiles", role: "radiogroup", "aria-labelledby": `${id}-scenes`, children: [
        sceneIds.map(sceneTile),
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("li", { className: "pm-tile-add-item", children: /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)(
          "button",
          {
            type: "button",
            className: "pm-tile-add",
            disabled: disabled || remaining === 0,
            "aria-label": t("settings.scene.add"),
            "aria-describedby": `${id}-remaining`,
            onClick: () => {
              openDialog({ kind: "scene" });
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("span", { className: "pm-tile-add-title", children: [
                /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(Icon, { name: "plus", size: 14 }),
                t("settings.scene.add")
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "pm-tile-add-note", id: `${id}-remaining`, children: t("settings.scene.remaining", { n: remaining }) })
            ]
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("section", { className: "pm-subgroup", "aria-labelledby": `${id}-types`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("h3", { className: "pm-subgroup-title", id: `${id}-types`, children: t("settings.types.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { className: "pm-subgroup-hint", children: t("settings.types.intro") }),
      typeGroup("general", BUILTIN),
      typeGroup("preset", PRESET_TYPE_NAMES.filter((name) => !fields.removedPresets.includes(name)), fields.removedPresets.map((name) => {
        const label = typeLabel(t, name, {});
        return /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("p", { className: "pm-tile-removed", children: [
          /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { children: t("settings.types.removedLine", { label }) }),
          /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("i", { className: "pm-sep", "aria-hidden": "true", children: "\xB7" }),
          /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
            "button",
            {
              type: "button",
              className: "pm-link pm-link--muted",
              disabled,
              "aria-label": t("settings.types.restoreAria", { name: label }),
              onClick: () => {
                restorePreset(name);
              },
              children: t("settings.types.restore")
            }
          )
        ] }, name);
      })),
      typeGroup("custom", Object.keys(fields.customTypes).filter((name) => !isPresetType(name)), null, /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("li", { className: "pm-tile-add-item", children: /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("button", { type: "button", className: "pm-tile-add", disabled, onClick: () => {
        openDialog({ kind: "type" });
      }, children: /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("span", { className: "pm-tile-add-title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(Icon, { name: "plus", size: 14 }),
        t("settings.types.create")
      ] }) }) }))
    ] }),
    dialog?.kind === "view" ? /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(TypeView, { name: dialog.name, onClose: () => {
      setDialog(void 0);
    } }) : null,
    dialog !== void 0 && dialog.kind !== "view" ? /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
      SceneDialog,
      {
        mode: dialog,
        fields,
        saved,
        migrations,
        counts,
        canMigrate,
        now,
        onCancel: () => {
          setDialog(void 0);
        },
        onCommit: (patch, next) => {
          setDialog(void 0);
          onChange(patch, next);
        }
      }
    ) : null
  ] });
}
function SceneDialog({ mode, fields, saved, migrations: initialMigrations, counts, canMigrate, now, onCancel, onCommit }) {
  const t = useT();
  const id = (0, import_react38.useId)();
  const editingId = mode.kind === "scene" ? mode.id : void 0;
  const isPreset = editingId !== void 0 && isPresetScene(editingId);
  const formFor = (customTypes, name) => ({
    kind: "form",
    original: name,
    draft: name === void 0 ? EMPTY_TYPE_DRAFT : draftOf(name, definitionOf(customTypes, name)),
    attempted: false,
    isAsking: false
  });
  const home = { kind: "pick" };
  const [pool, setPool] = (0, import_react38.useState)(() => poolOf(fields));
  const [migrations, setMigrations] = (0, import_react38.useState)(initialMigrations);
  const [scene, setScene] = (0, import_react38.useState)(() => editingId !== void 0 ? { label: fields.scenes[editingId].label, types: [...fields.scenes[editingId].types] } : { label: "", types: [...BUILTIN_TYPE_NAMES] });
  const [isSceneAttempted, setSceneAttempted] = (0, import_react38.useState)(false);
  const [view, setView] = (0, import_react38.useState)(() => mode.kind === "type" ? formFor(fields.customTypes, mode.name) : home);
  const [removing, setRemoving] = (0, import_react38.useState)(void 0);
  const [focusNext, focusKey] = useFocusNext();
  const [notice, setNotice] = (0, import_react38.useState)(void 0);
  const body = (0, import_react38.useRef)(null);
  const viewKey = view.kind === "form" ? `form:${view.original ?? ""}` : view.kind;
  const isMounted = (0, import_react38.useRef)(false);
  (0, import_react38.useEffect)(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    const items = [...body.current?.querySelectorAll("input, textarea, button:not(:disabled)") ?? []];
    (items.find((el) => el.matches("input:not([type=checkbox]), textarea")) ?? items[0])?.focus();
  }, [viewKey]);
  const selected = scene.types.filter((name) => isPooled(pool, name));
  const isFull = selected.length >= SCENE_MAX_TYPES;
  const label = (name) => typeLabel(t, name, { customTypes: pool.customTypes });
  const sceneName = (sid) => sceneLabel(t, sid, pool.scenes);
  const finishForm = (nextPool, nextScene, nextMigrations) => {
    if (mode.kind === "type") {
      onCommit(nextPool, nextMigrations);
      return;
    }
    setPool(nextPool);
    setScene(nextScene);
    setMigrations(nextMigrations);
    setView(home);
  };
  const rename = (from, to, type, action) => {
    finishForm(
      renameType(pool, from, to, type),
      { ...scene, types: scene.types.map((n) => n === from ? to : n) },
      action === void 0 ? migrations : renameMigrations(migrations, from, to, action, counts)
    );
  };
  const takenFor = (original) => ({
    names: [...PRESET_TYPE_NAMES.filter((n) => n !== original), ...Object.keys(pool.customTypes).filter((n) => n !== original && !isPresetType(n))],
    // 预设改了中文名，出厂中文名仍算占用：「恢复默认」后才不会和别的类型重名
    labels: [
      ...[...BUILTIN, ...PRESET_TYPE_NAMES].filter((n) => n !== original).map((n) => typeLabel(t, n, {})),
      ...Object.entries(pool.customTypes).filter(([n]) => n !== original).map(([, type]) => type.label)
    ],
    pending: pendingNames(migrations, original),
    removedPresets: pool.removedPresets
  });
  const confirmForm = (form) => {
    const result = validateTypeDraft(form.draft, takenFor(form.original));
    if (!result.ok) {
      setView({ ...form, attempted: true });
      return;
    }
    const { name, type } = result;
    if (form.original === void 0) {
      const isPicked = mode.kind === "scene" && !isFull;
      if (mode.kind === "scene" && isFull) setNotice(t("settings.sceneDialog.full", { max: SCENE_MAX_TYPES, name: type.label }));
      finishForm({ ...pool, customTypes: { ...pool.customTypes, [name]: type } }, isPicked ? { ...scene, types: [...scene.types, name] } : scene, migrations);
    } else if (name === form.original) {
      const { [name]: _old, ...others } = pool.customTypes;
      const isDefault = isPresetType(name) && !isPresetTypeEdited(name, { [name]: type });
      finishForm({ ...pool, customTypes: isDefault ? others : { ...pool.customTypes, [name]: type } }, scene, migrations);
    } else if (!hasMemories(form.original, saved, migrations, counts)) {
      rename(form.original, name, type);
    } else {
      setView({ ...form, isAsking: true });
    }
  };
  const remove = (name, action) => {
    setPool(removeType(pool, name));
    setScene({ ...scene, types: scene.types.filter((n) => n !== name) });
    setMigrations(action === "forget" ? forgetMigrations(migrations, name, counts) : keepMigrations(migrations, name));
    setRemoving(void 0);
    focusNext("add-type");
  };
  const removeConfirm = (name) => /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
    TypeRemoveConfirm,
    {
      name,
      pool,
      saved,
      migrations,
      counts,
      canMigrate,
      editingScene: { id: editingId },
      block: true,
      onRemove: (action) => {
        remove(name, action);
      },
      onCancel: () => {
        setRemoving(void 0);
        focusNext(`remove:${name}`);
      }
    }
  );
  const typeActions = (name) => /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("span", { className: "pm-scene-actions", children: [
    /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
      Button,
      {
        variant: "quiet",
        "aria-label": t("settings.types.editAria", { name: label(name) }),
        onClick: () => {
          setRemoving(void 0);
          setView(formFor(pool.customTypes, name));
        },
        children: t("settings.types.edit")
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
      Button,
      {
        variant: "quiet",
        "aria-label": t("settings.types.removeAria", { name: label(name) }),
        ...focusKey(`remove:${name}`),
        onClick: () => {
          setRemoving(name);
        },
        children: t("settings.types.remove")
      }
    )
  ] });
  const addType = /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("button", { type: "button", className: "pm-link pm-scene-add-type", ...focusKey("add-type"), onClick: () => {
    setRemoving(void 0);
    setNotice(void 0);
    setView(formFor(pool.customTypes));
  }, children: t("settings.types.add") });
  const confirmScene = () => {
    const others = [t("settings.scene.custom"), ...Object.keys(pool.scenes).filter((sid) => sid !== editingId).map(sceneName)];
    const result = validateSceneDraft({ label: scene.label, types: selected }, isPreset ? [] : others);
    if (!result.ok) {
      setSceneAttempted(true);
      return;
    }
    const sceneId = editingId ?? nextSceneId(Object.keys(pool.scenes), now());
    onCommit({ scenes: { ...pool.scenes, [sceneId]: result.scene }, customTypes: pool.customTypes }, migrations);
  };
  let title;
  let content;
  let footer;
  let onBack;
  if (view.kind === "form") {
    const form = view;
    const set = (patch) => {
      setView({ ...form, draft: { ...form.draft, ...patch }, isAsking: false });
    };
    const errors = form.attempted ? (() => {
      const r = validateTypeDraft(form.draft, takenFor(form.original));
      return r.ok ? void 0 : r.errors;
    })() : void 0;
    const back = mode.kind === "type" ? onCancel : () => {
      setView(home);
    };
    title = t(form.original === void 0 ? "settings.type.addTitle" : "settings.type.editTitle");
    onBack = mode.kind === "type" ? void 0 : back;
    content = /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(TypeFormFields, { draft: form.draft, errors, isNameLocked: form.original !== void 0 && isPresetType(form.original), onChange: set });
    if (form.isAsking && form.original !== void 0) {
      const original = form.original;
      const n = countOf(original, migrations, counts);
      const result = validateTypeDraft(form.draft, takenFor(original));
      const choose = (action) => {
        if (result.ok) rename(original, result.name, result.type, action);
      };
      footer = // 焦点落在「取消」（原来的「确定」被换掉了）；Esc 只收起这一问，不关弹层
      /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)(
        "div",
        {
          className: "pm-scene-ask",
          role: "group",
          "aria-label": t("settings.type.retype"),
          onKeyDown: (event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            setView({ ...form, isAsking: false });
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { className: "pm-scene-ask-text", children: n !== void 0 ? t("settings.type.renameAsk", { label: label(original), n }) : t("settings.type.renameAskUnknown", { label: label(original) }) }),
            !canMigrate ? /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { className: "pm-setting-hint", children: t("settings.type.noSession") }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "pm-scene-ask-actions", children: [
              /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(Button, { autoFocus: true, onClick: () => {
                setView({ ...form, isAsking: false });
              }, children: t("settings.sceneDialog.cancel") }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(Button, { disabled: !canMigrate, onClick: () => {
                choose("forget");
              }, children: t("settings.type.forget") }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(Button, { variant: "primary", disabled: !canMigrate, onClick: () => {
                choose("retype");
              }, children: t("settings.type.retype") })
            ] })
          ]
        }
      );
    } else {
      const autoPick = mode.kind === "scene" && form.original === void 0 && !isFull && scene.label.trim() !== "" ? t("settings.sceneDialog.autoPick", { name: isPreset ? sceneName(editingId) : scene.label.trim() }) : void 0;
      footer = /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)(import_jsx_runtime38.Fragment, { children: [
        autoPick !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "pm-scene-foot-note", children: autoPick }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(Button, { onClick: back, children: t("settings.sceneDialog.cancel") }),
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(Button, { variant: "primary", onClick: () => {
          confirmForm(form);
        }, children: t("settings.sceneDialog.confirm") })
      ] });
    }
  } else {
    title = t(editingId === void 0 ? "settings.sceneDialog.addTitle" : "settings.sceneDialog.editTitle");
    const sceneErrors = isSceneAttempted ? (() => {
      const others = [t("settings.scene.custom"), ...Object.keys(pool.scenes).filter((sid) => sid !== editingId).map(sceneName)];
      const r = validateSceneDraft({ label: scene.label, types: selected }, isPreset ? [] : others);
      return r.ok ? void 0 : r.errors;
    })() : void 0;
    const toggle = (name) => {
      setNotice(void 0);
      setScene((prev) => ({ ...prev, types: prev.types.includes(name) ? prev.types.filter((n) => n !== name) : [...prev.types, name] }));
    };
    const check = (name, isCustom) => {
      const isChecked = scene.types.includes(name);
      const checkId = `${id}-type-${name}`;
      return /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)(import_react38.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "pm-scene-check", children: [
          /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("input", { type: "checkbox", id: checkId, checked: isChecked, disabled: !isChecked && isFull, onChange: () => {
            toggle(name);
          } }),
          /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("label", { className: "pm-scene-check-label", htmlFor: checkId, children: label(name) }),
          isCustom ? /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("code", { className: "pm-scene-code", children: name }) : null,
          isCustom ? typeActions(name) : null
        ] }),
        removing === name ? removeConfirm(name) : null
      ] }, name);
    };
    const presets = PRESET_TYPE_NAMES.filter((n) => !pool.removedPresets.includes(n));
    content = /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)(import_jsx_runtime38.Fragment, { children: [
      isPreset ? null : /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "pm-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("label", { className: "pm-setting-label", htmlFor: `${id}-name`, children: t("settings.sceneDialog.name") }),
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
          TextField,
          {
            id: `${id}-name`,
            value: scene.label,
            onChange: (text) => {
              setScene((prev) => ({ ...prev, label: text }));
            },
            error: sceneErrors?.label !== void 0 ? t(`settings.sceneDialog.error.${sceneErrors.label}`) : void 0
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "pm-scene-group", role: "group", "aria-label": t("settings.sceneDialog.general"), children: [
        /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "pm-scene-group-head", children: [
          /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { children: t("settings.sceneDialog.general") }),
          /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "pm-scene-meta", role: "status", children: t("settings.sceneDialog.count", { n: selected.length, max: SCENE_MAX_TYPES }) })
        ] }),
        BUILTIN.map((name) => check(name, false))
      ] }),
      presets.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "pm-scene-group", role: "group", "aria-label": t("settings.sceneDialog.preset"), children: [
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("div", { className: "pm-scene-group-head", children: /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { children: t("settings.sceneDialog.preset") }) }),
        presets.map((name) => check(name, false))
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "pm-scene-group", role: "group", "aria-label": t("settings.sceneDialog.custom"), children: [
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("div", { className: "pm-scene-group-head", children: /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { children: t("settings.sceneDialog.custom") }) }),
        Object.keys(pool.customTypes).filter((name) => !isPresetType(name)).map((name) => check(name, true)),
        addType
      ] }),
      notice !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { className: "pm-setting-hint", role: "status", children: notice }) : null,
      sceneErrors?.types !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { className: "pm-input-invalid", role: "status", children: t(`settings.sceneDialog.error.${sceneErrors.types}`) }) : null
    ] });
    footer = /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)(import_jsx_runtime38.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "pm-scene-foot-note", children: t("settings.sceneDialog.limit", { max: SCENE_MAX_TYPES }) }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(Button, { onClick: onCancel, children: t("settings.sceneDialog.cancel") }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(Button, { variant: "primary", onClick: confirmScene, children: t("settings.sceneDialog.confirm") })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(Dialog, { title, closeLabel: t("settings.sceneDialog.close"), onClose: onCancel, footer, onBack, backLabel: t("settings.sceneDialog.back"), children: /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("div", { ref: body, className: "pm-scene-view", children: content }) });
}
function TypeView({ name, onClose }) {
  const t = useT();
  const def = TYPE_DEFINITIONS[name];
  const rows = [
    ["settings.type.label", def.label],
    ["settings.type.name", /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("code", { className: "pm-scene-code", children: name })],
    ["settings.type.description", def.description],
    ["settings.type.whenToSave", def.whenToSave],
    ["settings.type.howToUse", def.howToUse],
    ["settings.type.recall", t(`settings.type.recall.${def.recall}`)],
    ["settings.type.priority", t(`settings.type.priority.${def.governancePriority}`)],
    ["settings.type.decayDays", def.decayDays === null ? t("settings.type.noDecay") : String(def.decayDays)]
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
    Dialog,
    {
      title: typeLabel(t, name, {}),
      closeLabel: t("settings.sceneDialog.close"),
      onClose,
      footer: /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(Button, { onClick: onClose, children: t("settings.sceneDialog.close") }),
      children: /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("dl", { className: "pm-type-view", children: rows.map(([key, value]) => /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("dt", { children: t(key) }),
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("dd", { children: value })
      ] }, key)) })
    }
  );
}
function TypeRemoveConfirm({ name, pool, saved, migrations, counts, canMigrate, editingScene, block = false, onRemove, onCancel }) {
  const t = useT();
  const sceneName = (sid) => sceneLabel(t, sid, pool.scenes);
  const others = Object.entries(pool.scenes).filter(([sid]) => sid !== editingScene?.id);
  const blocking = others.find(([, s]) => s.types.includes(name) && s.types.filter((n2) => n2 !== name && isPooled(pool, n2)).length === 0)?.[0];
  if (blocking !== void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
      LinkConfirm,
      {
        question: t("settings.type.removeBlocked", { scene: sceneName(blocking) }),
        actions: [],
        cancelLabel: t("settings.scene.cancel"),
        onCancel,
        block
      }
    );
  }
  const users = scenesUsing(Object.fromEntries(others), name).map(sceneName);
  const n = countOf(name, migrations, counts);
  const isUsed = hasMemories(name, saved, migrations, counts);
  const text = [
    t("settings.type.removeQuestion", { label: typeLabel(t, name, { customTypes: pool.customTypes }) }),
    users.length > 0 ? t(editingScene !== void 0 ? "settings.type.removeAlsoUsed" : "settings.type.removeUsed", { scenes: users.join(t("settings.scene.listSep")) }) : "",
    isUsed ? n !== void 0 ? t("settings.type.removeMemories", { n }) : t("settings.type.removeMemoriesUnknown") : ""
  ].join("");
  return /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
    LinkConfirm,
    {
      question: text,
      note: isUsed && !canMigrate ? t("settings.type.noSession") : void 0,
      actions: isUsed ? [
        { label: t("settings.type.keep"), onClick: () => {
          onRemove("keep");
        } },
        { label: t("settings.type.forget"), onClick: () => {
          onRemove("forget");
        }, disabled: !canMigrate }
      ] : [{ label: t("settings.type.removeConfirm"), onClick: () => {
        onRemove("keep");
      } }],
      cancelLabel: t("settings.scene.cancel"),
      onCancel,
      block
    }
  );
}
function useFocusNext() {
  const prefix = (0, import_react38.useId)();
  const pending = (0, import_react38.useRef)(void 0);
  (0, import_react38.useEffect)(() => {
    const key = pending.current;
    if (key === void 0) return;
    pending.current = void 0;
    [...document.querySelectorAll("[data-focus]")].find((el) => el.dataset.focus === key)?.focus();
  });
  return [(key) => {
    pending.current = `${prefix}${key}`;
  }, (key) => ({ "data-focus": `${prefix}${key}` })];
}
function LinkConfirm({ question, note, actions, cancelLabel, onCancel, block = false }) {
  const questionId = (0, import_react38.useId)();
  return /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)(
    "span",
    {
      className: block ? "pm-scene-confirm pm-scene-confirm--block" : "pm-scene-confirm",
      role: "group",
      "aria-labelledby": questionId,
      onKeyDown: (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { id: questionId, children: question }),
        note !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "pm-scene-confirm-note", children: note }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("span", { className: "pm-scene-confirm-actions", children: [
          actions.map((action) => /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)(import_react38.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("button", { type: "button", className: "pm-link", disabled: action.disabled, onClick: action.onClick, children: action.label }),
            /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("i", { className: "pm-sep", "aria-hidden": "true", children: "\xB7" })
          ] }, action.label)),
          /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("button", { type: "button", className: "pm-link pm-scene-confirm-cancel", autoFocus: true, onClick: onCancel, children: cancelLabel })
        ] })
      ]
    }
  );
}
var scenesCss = `
.pm-scene-tag { flex: none; padding: 0 7px; border-radius: 999px; background: var(--pm-hover); font-size: 11px; font-weight: 400; line-height: 18px; color: var(--pm-text-2); }
.pm-scene-actions { margin-left: auto; display: inline-flex; flex: none; gap: 4px; }
.pm-scene-meta { margin-left: 6px; font-size: 12px; line-height: 1.5; color: var(--pm-text-3); }
.pm-scene-view { display: flex; flex-direction: column; gap: 14px; }
.pm-scene-group { display: flex; flex-direction: column; }
.pm-scene-group-head { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; font-weight: 600; line-height: 1.5; color: var(--pm-text-2); }
.pm-scene-group-head .pm-scene-meta { font-weight: 400; }
.pm-scene-check { display: flex; align-items: center; gap: 8px; min-height: 30px; }
.pm-scene-check input { flex: none; margin: 0; accent-color: var(--pm-text); }
.pm-scene-check input:disabled + label { color: var(--pm-text-3); }
.pm-scene-check-label { font-size: 13px; line-height: 1.5; color: var(--pm-text); }
.pm-scene-code { font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); font-size: 12px; color: var(--pm-text-3); }
.pm-tile-code { margin-left: auto; max-width: 50%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pm-subgroup-hint + .pm-tile-group { margin-top: 12px; }
.pm-tile-group + .pm-tile-group { margin-top: 16px; }
.pm-tile-group-title { margin: 0 0 8px; font-size: 12px; font-weight: 500; line-height: 1.5; color: var(--pm-text-2); }
/* \u5220\u6389\u4E00\u5F20\u5361\u540E\u7126\u70B9\u843D\u5728\u7EC4\u6807\u9898\u4E0A\uFF08\u53EA\u4F9B\u8BFB\u5C4F\u548C\u952E\u76D8\u63A5\u7740\u8D70\uFF09\uFF0C\u4E0D\u753B\u7126\u70B9\u6846 */
.pm-tile-group-title:focus, .pm-subgroup .pm-subgroup-title:focus { outline: none; }
.pm-tile-removed { display: flex; align-items: center; gap: 6px; margin: 8px 0 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-3); }
.pm-tile-group-title + .pm-tile-removed { margin-top: 0; }
.pm-tile-removed + .pm-tile-removed { margin-top: 4px; }
.pm-tile-removed .pm-sep { margin: 0; }
.pm-tile-removed .pm-link { font-weight: 600; }
.pm-type-view { display: flex; flex-direction: column; gap: 12px; margin: 0; }
.pm-type-view div { display: flex; flex-direction: column; gap: 2px; }
.pm-type-view dt { font-size: 12px; font-weight: 500; line-height: 1.5; color: var(--pm-text-2); }
.pm-type-view dd { margin: 0; font-size: 13px; line-height: 1.5; color: var(--pm-text); }
.pm-scene-add-type { align-self: flex-start; margin-top: 4px; font-size: 13px; }
.pm-scene-foot-note { margin-right: auto; font-size: 12px; line-height: 1.5; color: var(--pm-text-3); }
.pm-scene-confirm { display: flex; flex: 1; min-width: 0; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-scene-confirm--block { flex-basis: 100%; padding: 8px 12px; border-radius: var(--dsw-radius-md, 12px); background: var(--pm-bg-block); }
.pm-scene-group .pm-scene-confirm--block { margin: 2px 0 6px 23px; }
.pm-scene-confirm-note { flex-basis: 100%; color: var(--pm-text-3); }
.pm-scene-confirm-actions { display: inline-flex; align-items: center; gap: 8px; }
.pm-scene-confirm .pm-link:disabled { color: var(--pm-text-3); cursor: default; text-decoration: none; }
.pm-scene-confirm .pm-sep { margin: 0 -2px; font-style: normal; }
.pm-scene-confirm .pm-scene-confirm-cancel { font-weight: 400; color: var(--pm-text-2); }
.pm-scene-ask { display: flex; flex: 1; flex-direction: column; gap: 8px; }
.pm-scene-ask-text { margin: 0; font-size: 13px; line-height: 1.5; color: var(--pm-text); }
.pm-scene-ask-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
`;

// client/settings/SettingsPage.tsx
var import_react41 = require("react");

// client/ui/Settings.tsx
var import_react39 = require("react");
var import_jsx_runtime39 = require("react/jsx-runtime");
function SettingsForm({ state, pending, onSave, onDiscard, children }) {
  const t = useT();
  const pendingId = (0, import_react39.useId)();
  const discard = (0, import_react39.useRef)(onDiscard);
  discard.current = onDiscard;
  (0, import_react39.useEffect)(() => () => {
    discard.current();
  }, []);
  if (!state.available) return /* @__PURE__ */ (0, import_jsx_runtime39.jsx)("p", { className: "pm-form-note", role: "status", children: t("settings.unavailable") });
  return /* @__PURE__ */ (0, import_jsx_runtime39.jsxs)("div", { className: "pm-form", children: [
    !state.writable ? /* @__PURE__ */ (0, import_jsx_runtime39.jsx)("p", { className: "pm-form-note", role: "status", children: t("settings.readOnly") }) : null,
    children,
    /* @__PURE__ */ (0, import_jsx_runtime39.jsxs)("div", { className: "pm-form-footer", tabIndex: -1, children: [
      state.failed ? /* @__PURE__ */ (0, import_jsx_runtime39.jsx)("p", { className: "pm-form-failed", role: "status", children: t("settings.saveFailed") }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(
        Button,
        {
          variant: "primary",
          disabled: !state.dirty || state.invalid || state.saving || !state.writable,
          "aria-describedby": pending !== void 0 ? pendingId : void 0,
          onClick: onSave,
          children: state.saving ? t("settings.saving") : t("settings.save")
        }
      ),
      pending !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime39.jsx)("p", { className: "pm-form-pending", id: pendingId, children: pending }) : null
    ] })
  ] });
}
function SettingsGroupCard({ title, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime39.jsxs)("section", { className: "pm-group", children: [
    /* @__PURE__ */ (0, import_jsx_runtime39.jsx)("h2", { className: "pm-group-title", children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime39.jsx)("div", { className: "pm-group-card", children })
  ] });
}
function SettingsItem({ label, hint, htmlFor, disabled = false, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime39.jsxs)("div", { className: disabled ? "pm-setting pm-setting--disabled" : "pm-setting", children: [
    /* @__PURE__ */ (0, import_jsx_runtime39.jsx)("label", { className: "pm-setting-label", htmlFor, children: label }),
    children,
    hint !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime39.jsx)("p", { className: "pm-setting-hint", children: hint }) : null
  ] });
}
var settingsCss = `
.pm-form { display: flex; flex-direction: column; }
.pm-form-note { margin: 0 0 12px; font-size: 12px; line-height: 1.5; color: var(--pm-text-3); }
.pm-form-footer {
  position: sticky; bottom: -48px; z-index: 1; display: flex; align-items: center; gap: 12px;
  margin-top: 16px; padding: 12px 0; border-top: .5px solid var(--pm-line); background: var(--pm-bg-page);
}
/* \u53EA\u662F\u7126\u70B9\u843D\u70B9\uFF0C\u4E0D\u753B\u7126\u70B9\u6846\uFF08\u4E3B\u9898\u7684 [tabindex] \u7126\u70B9\u73AF\u540C\u6743\u91CD\u3001\u5148\u52A0\u8F7D\uFF0C\u8FD9\u91CC\u52A0 .pm-root \u538B\u8FC7\u5B83\uFF09 */
.pm-root .pm-form-footer:focus { outline: none; }
.pm-form-pending { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-3); }
.pm-form-failed { flex: 1; min-width: 0; margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-error); }
.pm-group + .pm-group { margin-top: 32px; }
.pm-group-title { margin: 0 0 8px; padding-left: 16px; font-size: 16px; font-weight: 500; line-height: 24px; color: var(--pm-text); }
.pm-group-card { padding: 0 16px; border: .5px solid var(--pm-line-card); border-radius: var(--dsw-radius-lg, 16px); background: var(--pm-bg); }
.pm-setting { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 14px 0; }
.pm-setting + .pm-setting { border-top: .5px solid var(--pm-line); }
.pm-setting-label { font-size: 13px; font-weight: 500; line-height: 1.5; color: var(--pm-text); }
.pm-setting-hint { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-3); }
.pm-setting--disabled .pm-setting-label { color: var(--pm-text-3); }
/* \u4E0A 14px \u540C\u8BBE\u7F6E\u9879\uFF0C\u4E0B 16px \u8BA9\u7F51\u683C\u79BB\u5916\u6846\u548C\u5206\u9694\u7EBF\u4E00\u6837\u8FDC */
.pm-subgroup { padding: 14px 0 16px; }
.pm-subgroup + .pm-subgroup { border-top: .5px solid var(--pm-line); }
.pm-subgroup-title { margin: 0 0 8px; font-size: 13px; font-weight: 500; line-height: 20px; color: var(--pm-text-2); }
.pm-subgroup-hint { margin: -4px 0 8px; font-size: 12px; line-height: 1.5; color: var(--pm-text-3); }
.pm-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(268px, 100%), 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
.pm-tile {
  display: flex; flex-direction: column; min-width: 0; border: .5px solid transparent; border-radius: var(--dsw-radius-md, 12px); background: var(--pm-bg);
  /* \u5BBF\u4E3B\u8F7B\u6295\u5F71\uFF1A\u63CF\u8FB9\u753B\u5728\u6295\u5F71\u91CC\uFF0C\u91CD\u7ED1\u6210 var(--pm-line) \u515C\u4F4F\u767D\u5E95\u4E0A\u7684\u8FB9\u754C */
  --dsw-elevation-stroke-color: var(--pm-line); box-shadow: var(--dsw-elevation-soft); transition: border-color .16s, background .16s, box-shadow .16s;
}
.pm-tile-main { position: relative; display: flex; flex: 1; flex-direction: column; gap: 4px; padding: 14px 16px; }
.pm-tile-head { display: flex; align-items: center; gap: 6px; min-width: 0; }
.pm-tile-title { min-width: 0; font-size: 13px; font-weight: 500; line-height: 1.5; color: var(--pm-text); }
.pm-tile-detail { font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-tile-foot {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 4px; padding: 8px 12px;
  /* \u5361\u811A\u7EC6\u7EBF\u540C\u5361\u7684\u5916\u6CBF\u4E00\u6837\u753B\u6210 0.5px \u6295\u5F71\uFF08border \u5728 1 \u500D\u5C4F\u4E0A\u4F1A\u53D6\u6574\u6210 1px\uFF0C\u6BD4\u5916\u6CBF\u8FD8\u91CD\uFF09\uFF1B\u6697\u8272\u53D6\u5BBF\u4E3B\u66F4\u6D45\u4E00\u7EA7\u7684\u53D1\u4E1D\u7EBF\uFF0C\u4E0D\u62A2\u8FC7\u5361\u7684\u5916\u6CBF */
  box-shadow: inset 0 .5px 0 var(--dsw-alias-border-l2-darkmode-thin);
}
.pm-tile-radio { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.pm-tile-radio:disabled { cursor: default; }
.pm-tile:not(.pm-tile--selected):has(.pm-tile-radio:enabled:hover) { background: var(--pm-hover); }
.pm-tile--selected { border-color: var(--pm-line-selected); background: var(--pm-bg-block); box-shadow: none; }
/* \u6697\u8272\u4E0B\u67D4\u5149\u51E0\u4E4E\u770B\u4E0D\u89C1\uFF0C\u9760\u63CF\u8FB9\u5206\u5F00\uFF1A\u5BF9\u9F50\u5BBF\u4E3B\u6D6E\u5C42\u9762\u7684\u505A\u6CD5\uFF0C\u63CF\u8FB9\u6DF1\u4E00\u7EA7 */
body[data-ds-dark-theme] .pm-tile { --dsw-elevation-stroke-color: var(--pm-line-card); }
.pm-tile:has(.pm-tile-radio:focus-visible) { outline: var(--dsw-focus-ring-width, 2px) solid var(--pm-focus); outline-offset: 2px; }
.pm-tile-add-item { display: flex; min-width: 0; }
/* \u72EC\u5360\u4E00\u884C\u65F6\u548C\u5E26\u5361\u811A\u7684\u666E\u901A\u5C0F\u5361\u4E00\u6837\u9AD8\uFF1A\u5361\u8EAB 14 + 19.5 + 4 + 18 + 14\uFF0C\u5361\u811A 8 + 24 + 8\uFF0C\u52A0\u4E0A\u4E0B 0.5px \u63CF\u8FB9\uFF08\u5361\u811A\u7EC6\u7EBF\u753B\u5728\u6295\u5F71\u91CC\uFF0C\u4E0D\u5360\u9AD8\u5EA6\uFF09\uFF0C\u5171 110.5px */
.pm-tile-add {
  display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-width: 0; min-height: 110.5px; padding: 14px 16px;
  border: 1px dashed var(--pm-line-card); border-radius: var(--dsw-radius-md, 12px); background: transparent;
  font: inherit; font-size: 13px; line-height: 1.5; color: var(--pm-text); cursor: pointer;
}
.pm-tile-add:hover:not(:disabled) { background: var(--pm-hover); }
.pm-tile-add:disabled { opacity: .4; cursor: default; }
.pm-tile-add-title { display: inline-flex; align-items: center; gap: 6px; }
.pm-tile-add-note { font-size: 12px; color: var(--pm-text-3); }
`;

// client/ui/HealthBanner.tsx
var import_jsx_runtime40 = require("react/jsx-runtime");
function HealthBanner({ marker, conclusion, detail, actions }) {
  return /* @__PURE__ */ (0, import_jsx_runtime40.jsxs)("section", { className: marker === void 0 ? "pm-banner pm-banner--plain" : "pm-banner", children: [
    /* @__PURE__ */ (0, import_jsx_runtime40.jsxs)("div", { className: "pm-banner-main", children: [
      /* @__PURE__ */ (0, import_jsx_runtime40.jsxs)("p", { className: "pm-banner-title", children: [
        marker !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime40.jsx)("span", { className: "pm-banner-mark", children: /* @__PURE__ */ (0, import_jsx_runtime40.jsx)(StatusMarker, { kind: marker }) }) : null,
        conclusion
      ] }),
      detail !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime40.jsx)("p", { className: "pm-banner-detail", children: detail }) : null
    ] }),
    actions !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime40.jsx)("div", { className: "pm-banner-actions", children: actions }) : null
  ] });
}
var healthBannerCss = `
.pm-banner {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  padding: 14px 16px; border-radius: var(--dsw-radius-lg, 16px); background: var(--pm-bg-block);
}
.pm-banner-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pm-banner-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 14px; font-weight: 600; line-height: 1.5; color: var(--pm-text); }
/* \u6807\u8BB0\u5360 14px \u5BBD\u7684\u5217\uFF08\u5706\u70B9\u548C\u4E09\u89D2\u540C\u5BBD\uFF09\uFF0C\u7B2C\u4E8C\u884C\u7F29\u8FDB 14 + 8 = 22px \u5BF9\u9F50\u7ED3\u8BBA\uFF0C\u548C\u72B6\u6001\u6761\u540C\u4E00\u505A\u6CD5 */
.pm-banner-mark { display: inline-flex; justify-content: center; flex-shrink: 0; width: 14px; }
.pm-banner-detail { margin: 0 0 0 22px; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-banner--plain .pm-banner-detail { margin-left: 0; }
.pm-banner-actions { display: flex; gap: 8px; flex-shrink: 0; }
`;

// client/settings/StatusCard.tsx
var import_jsx_runtime41 = require("react/jsx-runtime");
function summarize(views, governanceEnabled2, now, t) {
  const count = views.library.layers.reduce((sum, group) => sum + group.items.length, 0);
  const scannedAt = views.health.layers.reduce(
    (latest, s) => s.lastCheckupAt !== null && (latest === null || s.lastCheckupAt > latest) ? s.lastCheckupAt : latest,
    null
  );
  const countText = t(count === 1 ? "settings.status.count.one" : "settings.status.count", { n: formatNumber(count) });
  if (!governanceEnabled2) return { conclusion: t("settings.governanceOff"), detail: countText };
  const detail = `${countText} \xB7 ${scannedAt === null ? t("settings.status.neverScanned") : t("settings.status.lastScan", { date: formatDay(scannedAt, now, t) })}`;
  const items = views.pending.items;
  if (items.some((item) => item.kind === "secret")) return { marker: "secret", conclusion: t("settings.status.secret"), detail };
  const decisions = items.filter(isAwaitingDecision).length;
  if (decisions > 0) return { marker: "pending", conclusion: t("settings.status.pending", { n: formatNumber(decisions) }), detail };
  if (count === 0) return { conclusion: t("settings.status.empty") };
  if (scannedAt === null) return { conclusion: t("settings.status.unscanned"), detail };
  return { marker: "ok", conclusion: t("settings.status.ok"), detail };
}
function settled(state) {
  return state.status === "ready" ? state.data : void 0;
}
function StatusCard({ governanceEnabled: governanceEnabled2, onOpen, now = Date.now() }) {
  const t = useT();
  const gateway = useGateway();
  const session = gateway.useSession(void 0);
  const pending = settled(gateway.useView(session, "pending"));
  const health = settled(gateway.useView(session, "health"));
  const library = settled(gateway.useView(session, "library"));
  const status = session.kind === "none" ? { conclusion: t("settings.status.noSession") } : pending !== void 0 && health !== void 0 && library !== void 0 ? summarize({ pending, health, library }, governanceEnabled2, now, t) : { conclusion: t("settings.status.loading") };
  return /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(
    HealthBanner,
    {
      ...status.marker !== void 0 ? { marker: status.marker } : {},
      conclusion: status.conclusion,
      ...status.detail !== void 0 ? { detail: status.detail } : {},
      actions: /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("button", { type: "button", className: "pm-link pm-settings-link", onClick: () => {
        onOpen({ view: "todo", scope: ALL_SCOPE });
      }, children: t("settings.status.open") })
    }
  );
}

// client/settings/useSettingsDraft.ts
var import_react40 = require("react");
var IDLE3 = { edits: {}, migrations: {}, revision: void 0, saving: false, outcome: "idle" };
function useSettingsDraft(form, migrate) {
  const subscribe = (0, import_react40.useCallback)((fn) => form.subscribe(fn), [form]);
  const snapshot = (0, import_react40.useSyncExternalStore)(subscribe, (0, import_react40.useCallback)(() => form.getSnapshot(), [form]));
  const [state, setState] = (0, import_react40.useState)(IDLE3);
  const [migration, setMigration] = (0, import_react40.useState)({ status: "idle" });
  const saved = fieldsOf(snapshot.value);
  const fields = { ...saved, ...state.edits };
  const ops = buildOps(saved, fields);
  const changed = new Set(Object.keys(state.edits).filter((key) => buildOps(saved, { ...saved, [key]: fields[key] })?.length !== 0));
  const edit = (0, import_react40.useCallback)((patch, migrations2) => {
    setState((prev) => ({
      ...prev,
      edits: { ...prev.edits, ...patch },
      migrations: migrations2 ?? prev.migrations,
      revision: prev.revision ?? form.getSnapshot().revision,
      outcome: prev.outcome === "conflict" ? "conflict" : "idle"
    }));
  }, [form]);
  const discard = (0, import_react40.useCallback)(() => {
    setState(IDLE3);
  }, []);
  const runMigrations = async (pending) => {
    if (Object.keys(pending).length === 0) return;
    setMigration({ status: "running" });
    const remaining = {};
    let skippedSecrets = 0;
    for (const [from, m] of Object.entries(pending)) {
      let result = { ok: false };
      try {
        if (migrate !== void 0) result = await migrate(from, m);
      } catch {
        result = { ok: false };
      }
      if (result.ok) skippedSecrets += result.skippedSecrets ?? 0;
      else remaining[from] = m;
    }
    setMigration(Object.keys(remaining).length > 0 ? { status: "failed", remaining } : { status: "done", skippedSecrets });
  };
  const retryMigrations = async () => {
    if (migration.status === "failed") await runMigrations(migration.remaining);
  };
  const isDirty = ops === void 0 || ops.length > 0 || Object.keys(state.migrations).length > 0;
  const migrations = migration.status === "failed" ? { ...migration.remaining, ...state.migrations } : state.migrations;
  const save = async () => {
    if (ops === void 0 || !isDirty || state.saving || state.outcome === "conflict" || !snapshot.writable) return;
    const frozen = state.revision;
    setState((prev) => ({ ...prev, saving: true, outcome: "idle" }));
    let accepted = ops.length === 0;
    try {
      if (!accepted) accepted = await form.mutate(ops, frozen);
    } catch {
      accepted = false;
    }
    if (accepted) {
      const pending = migrations;
      setState(IDLE3);
      setMigration({ status: "idle" });
      await runMigrations(pending);
      return;
    }
    const conflicted = frozen !== void 0 && form.getSnapshot().revision !== frozen;
    setState((prev) => ({ ...prev, saving: false, outcome: conflicted ? "conflict" : "failed" }));
  };
  return {
    snapshot,
    saved,
    fields,
    changed,
    dirty: isDirty,
    invalid: ops === void 0 || state.outcome === "conflict",
    saving: state.saving,
    outcome: state.outcome,
    migrations,
    migration,
    edit,
    save,
    retryMigrations,
    discard
  };
}

// client/settings/SettingsPage.tsx
var import_jsx_runtime42 = require("react/jsx-runtime");
var USAGE_FIELDS = ["budget", "overflow", "evidence"];
function SettingsPage({ form, onOpenMemoryPage, now }) {
  const t = useT();
  const id = (0, import_react41.useId)();
  const gateway = useGateway();
  const session = gateway.useSession(void 0);
  const counts = useMemoryCounts(session);
  const migrate = session.kind === "ready" ? async (from, m) => {
    const command = m.action === "retype" ? { cmd: "migrate-type", from, action: "retype", to: m.to } : { cmd: "migrate-type", from, action: "forget" };
    const result = await gateway.execute(session.sessionId, command);
    return result.ok ? { ok: true, skippedSecrets: result.skippedSecrets ?? 0 } : { ok: false };
  } : void 0;
  const draft = useSettingsDraft(form, migrate);
  const { snapshot, fields: f, saved, edit } = draft;
  const [isConfirming, setConfirming] = (0, import_react41.useState)(false);
  const root = (0, import_react41.useRef)(null);
  const isFocusingFooter = (0, import_react41.useRef)(false);
  (0, import_react41.useEffect)(() => {
    if (!isFocusingFooter.current || isConfirming) return;
    isFocusingFooter.current = false;
    root.current?.querySelector(".pm-form-footer")?.focus();
  });
  if (snapshot.status === "loading") return /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("p", { className: "pm-form-note", role: "status", children: t("settings.loading") });
  const locked = !snapshot.writable || draft.saving;
  const governanceOn = governanceEnabled(snapshot.value);
  const offHint = t("settings.governanceOff");
  const budgetInvalid = f.budget !== saved.budget && parsePositiveInt(f.budget) === void 0;
  const sensitivity = SENSITIVITY_NUMBERS[f.sensitivity];
  const dropped = droppedTypes(saved, f, draft.migrations);
  const effects = [
    ...dropped.length > 0 ? [t("settings.scene.dropHint", { types: typeNames(t, dropped.map((n) => typeLabel(t, n, { customTypes: saved.customTypes }))) })] : [],
    ...USAGE_FIELDS.some((key) => draft.changed.has(key)) ? [t("settings.usage.reloadNote")] : []
  ];
  const changes = draft.dirty ? changeLines(t, saved, f, draft.changed, draft.migrations, counts) : [];
  return /* @__PURE__ */ (0, import_jsx_runtime42.jsxs)("div", { ref: root, className: "pm-settings", children: [
    /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(StatusCard, { governanceEnabled: governanceOn, onOpen: onOpenMemoryPage, ...now !== void 0 ? { now } : {} }),
    /* @__PURE__ */ (0, import_jsx_runtime42.jsxs)(
      SettingsForm,
      {
        state: {
          available: snapshot.status === "ready",
          writable: snapshot.writable,
          dirty: draft.dirty,
          invalid: draft.invalid,
          saving: draft.saving,
          failed: draft.outcome === "failed"
        },
        pending: changes.length > 0 ? t("settings.unsaved", { n: changes.length }) : void 0,
        onSave: () => {
          setConfirming(true);
        },
        onDiscard: draft.discard,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(SettingsGroupCard, { title: t("settings.group.what"), children: /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(
            SceneSection,
            {
              fields: f,
              saved,
              migrations: draft.migrations,
              counts,
              canMigrate: session.kind === "ready",
              disabled: locked,
              now: () => now ?? Date.now(),
              onChange: edit
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime42.jsxs)(SettingsGroupCard, { title: t("settings.group.how"), children: [
            /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(SettingsItem, { label: t("settings.budget.label"), htmlFor: `${id}-budget`, children: /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(
              TextField,
              {
                id: `${id}-budget`,
                value: f.budget,
                inputMode: "numeric",
                disabled: locked,
                onChange: (budget) => {
                  edit({ budget });
                },
                error: budgetInvalid ? t("settings.budget.invalid") : void 0,
                hint: t("settings.budget.hint")
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(
              SettingsItem,
              {
                label: t("settings.overflow.label"),
                hint: /* @__PURE__ */ (0, import_jsx_runtime42.jsxs)(import_jsx_runtime42.Fragment, { children: [
                  t("settings.overflow.relaxHint"),
                  /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("br", {}),
                  t("settings.overflow.strictHint")
                ] }),
                children: /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(
                  SegmentedControl,
                  {
                    id: `${id}-overflow`,
                    label: t("settings.overflow.label"),
                    value: f.overflow,
                    options: OVERFLOW_MODES2.map((v) => ({ value: v, label: t(`settings.overflow.${v}`) })),
                    disabled: locked,
                    onChange: (overflow) => {
                      edit({ overflow });
                    }
                  }
                )
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(SettingsItem, { label: t("settings.evidence.label"), hint: t("settings.evidence.hint"), children: /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(
              SegmentedControl,
              {
                id: `${id}-evidence`,
                label: t("settings.evidence.label"),
                value: f.evidence,
                options: EVIDENCE_LEVELS.map((v) => ({ value: v, label: t(`settings.evidence.${v}`) })),
                disabled: locked,
                onChange: (evidence) => {
                  edit({ evidence });
                }
              }
            ) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime42.jsxs)(SettingsGroupCard, { title: t("settings.group.manage"), children: [
            /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(
              SettingsItem,
              {
                label: t("settings.sensitivity.label"),
                hint: governanceOn ? t("settings.sensitivity.hint", { score: sensitivity.score, days: sensitivity.days }) : offHint,
                disabled: !governanceOn,
                children: /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(
                  SegmentedControl,
                  {
                    id: `${id}-sensitivity`,
                    label: t("settings.sensitivity.label"),
                    value: f.sensitivity,
                    options: SENSITIVITIES.map((v) => ({ value: v, label: t(`settings.sensitivity.${v}`) })),
                    disabled: locked || !governanceOn,
                    onChange: (next) => {
                      edit({ sensitivity: next });
                    }
                  }
                )
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(
              SettingsItem,
              {
                label: t("settings.target.label"),
                hint: !governanceOn ? offHint : f.promoteTarget === "agents-md" ? t("settings.target.agentsHint") : t("settings.target.pluginHint"),
                disabled: !governanceOn,
                children: /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(
                  SegmentedControl,
                  {
                    id: `${id}-target`,
                    label: t("settings.target.label"),
                    value: f.promoteTarget,
                    options: PROMOTE_TARGETS.map((v) => ({ value: v, label: t(`settings.target.${v}`) })),
                    disabled: locked || !governanceOn,
                    onChange: (promoteTarget) => {
                      edit({ promoteTarget });
                    }
                  }
                )
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(SettingsItem, { label: t("settings.deleted.label"), hint: t("settings.deleted.hint"), children: /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("button", { type: "button", className: "pm-link pm-settings-link", onClick: () => {
              onOpenMemoryPage({ view: "deleted", scope: ALL_SCOPE });
            }, children: t("settings.deleted.open") }) }),
            /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(SettingsItem, { label: t("settings.root.label"), hint: t("settings.root.hint"), children: /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(MemoryRoot, { configured: configuredRoot(snapshot.value) }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(SettingsGroupCard, { title: t("settings.group.look"), children: /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(SettingsItem, { label: t("settings.accent.label"), children: /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(
            SegmentedControl,
            {
              id: `${id}-accent`,
              label: t("settings.accent.label"),
              value: f.accent,
              options: ACCENTS.map((v) => ({ value: v, label: t(`settings.accent.${v}`) })),
              disabled: locked,
              onChange: (accent) => {
                edit({ accent });
              }
            }
          ) }) }),
          draft.outcome === "conflict" ? /* @__PURE__ */ (0, import_jsx_runtime42.jsxs)("div", { className: "pm-settings-conflict", role: "alert", children: [
            /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("p", { children: t("settings.conflict") }),
            /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(Button, { onClick: draft.discard, children: t("settings.conflict.reload") })
          ] }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(MigrationNote, { draft })
        ]
      }
    ),
    isConfirming ? /* @__PURE__ */ (0, import_jsx_runtime42.jsxs)(
      Dialog,
      {
        title: t("settings.confirm.title"),
        closeLabel: t("settings.confirm.close"),
        onClose: () => {
          setConfirming(false);
        },
        footer: /* @__PURE__ */ (0, import_jsx_runtime42.jsxs)(import_jsx_runtime42.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(Button, { onClick: () => {
            setConfirming(false);
          }, children: t("settings.confirm.cancel") }),
          /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(Button, { variant: "primary", onClick: () => {
            isFocusingFooter.current = true;
            setConfirming(false);
            void draft.save();
          }, children: t("settings.confirm.save") })
        ] }),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("ul", { className: "pm-settings-changes", children: changes.map((line) => /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("li", { children: line }, line)) }),
          effects.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("div", { className: "pm-settings-effects", children: effects.map((text) => /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("p", { children: text }, text)) }) : null
        ]
      }
    ) : null
  ] });
}
var FIELD_LABELS = {
  template: "settings.confirm.current",
  scenes: "settings.confirm.scenes",
  removedPresets: "settings.confirm.presets",
  customTypes: "settings.types.label",
  budget: "settings.budget.label",
  overflow: "settings.overflow.label",
  evidence: "settings.evidence.label",
  sensitivity: "settings.sensitivity.label",
  promoteTarget: "settings.target.label",
  accent: "settings.accent.label"
};
function valueText(t, key, fields) {
  switch (key) {
    case "template":
      return sceneLabel(t, fields.template, fields.scenes);
    case "budget":
      return String(parsePositiveInt(fields.budget) ?? fields.budget);
    case "overflow":
      return t(`settings.overflow.${fields.overflow}`);
    case "evidence":
      return t(`settings.evidence.${fields.evidence}`);
    case "sensitivity":
      return t(`settings.sensitivity.${fields.sensitivity}`);
    case "promoteTarget":
      return t(`settings.target.${fields.promoteTarget}`);
    case "accent":
      return t(`settings.accent.${fields.accent}`);
  }
}
function partsText(t, parts) {
  return ["added", "edited", "reset", "removed", "restored"].filter((kind) => (parts[kind]?.length ?? 0) > 0).map((kind) => t(`settings.confirm.${kind}`, { names: typeNames(t, parts[kind]) })).join(t("settings.confirm.partSep"));
}
function changeLines(t, saved, fields, changed, migrations, counts) {
  const isChanged = (key) => changed.has(key) || key === "removedPresets" && changed.has("customTypes");
  const lines = Object.keys(FIELD_LABELS).filter(isChanged).map((key) => {
    let change;
    if (key === "removedPresets") {
      const parts = presetTypeChanges(saved, fields);
      change = partsText(t, {
        edited: parts.edited.map((n) => typeLabel(t, n, { customTypes: fields.customTypes })),
        reset: parts.reset.map((n) => typeLabel(t, n, { customTypes: saved.customTypes })),
        removed: parts.removed.map((n) => typeLabel(t, n, { customTypes: saved.customTypes })),
        restored: parts.restored.map((n) => typeLabel(t, n, {}))
      });
    } else if (key === "customTypes") {
      const moved = Object.entries(migrations).flatMap(([from, m]) => m.action === "retype" ? [from, m.to] : []);
      const without = (types) => Object.fromEntries(Object.entries(types).filter(([name]) => !moved.includes(name)));
      change = partsText(t, customTypeChanges(without(saved.customTypes), without(fields.customTypes)));
    } else if (key === "scenes") {
      const ids = sceneChanges(saved.scenes, fields.scenes);
      change = partsText(t, {
        added: ids.added.map((sid) => sceneLabel(t, sid, fields.scenes)),
        edited: ids.edited.map((sid) => sceneLabel(t, sid, fields.scenes)),
        removed: ids.removed.map((sid) => sceneLabel(t, sid, saved.scenes))
      });
    } else {
      change = t("settings.confirm.change", { from: valueText(t, key, saved), to: valueText(t, key, fields) });
    }
    return change === "" ? "" : t("settings.confirm.item", { label: t(FIELD_LABELS[key]), change });
  }).filter((line) => line !== "");
  for (const [from, m] of Object.entries(migrations)) {
    const label = saved.customTypes[from]?.label ?? (m.action === "retype" ? fields.customTypes[m.to]?.label : void 0) ?? typeLabel(t, from, {});
    const n = counts?.get(from);
    if (m.action === "forget") lines.push(t("settings.confirm.forget", { label }));
    else lines.push(n === void 0 ? t("settings.confirm.retypeUnknown", { label, to: m.to }) : t("settings.confirm.retype", { label, to: m.to, n }));
  }
  return lines;
}
function useMemoryCounts(session) {
  const gateway = useGateway();
  const library = gateway.useView(session, "library");
  const deleted = gateway.useView(session, "deleted");
  if (library.status !== "ready" || deleted.status !== "ready" && deleted.status !== "missing") return void 0;
  const counts = /* @__PURE__ */ new Map();
  const add = (type) => {
    counts.set(type, (counts.get(type) ?? 0) + 1);
  };
  for (const group of library.data.layers) for (const memory of group.items) add(memory.type);
  if (deleted.status === "ready") for (const item of deleted.data.items) add(item.memory.type);
  return counts;
}
function MigrationNote({ draft }) {
  const t = useT();
  const { migration } = draft;
  if (migration.status === "running") return /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("p", { className: "pm-form-note pm-settings-note", role: "status", children: t("settings.migration.running") });
  if (migration.status === "failed") {
    return /* @__PURE__ */ (0, import_jsx_runtime42.jsxs)("div", { className: "pm-settings-conflict", role: "alert", children: [
      /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("p", { children: t("settings.migration.failed") }),
      /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(Button, { onClick: () => {
        void draft.retryMigrations();
      }, children: t("settings.migration.retry") })
    ] });
  }
  if (migration.status === "done" && migration.skippedSecrets > 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("p", { className: "pm-form-note pm-settings-note", role: "status", children: t("settings.migration.secrets", { n: migration.skippedSecrets }) });
  }
  return null;
}
function MemoryRoot({ configured }) {
  const t = useT();
  const gateway = useGateway();
  const library = gateway.useView(gateway.useSession(void 0), "library");
  const [isRefused, setRefused] = (0, import_react41.useState)(false);
  const path = library.status === "ready" ? library.data.memoryRoot : configured;
  if (path === "") return /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("span", { className: "pm-setting-hint", children: t("settings.root.unknown") });
  return /* @__PURE__ */ (0, import_jsx_runtime42.jsxs)("span", { className: "pm-settings-root", children: [
    /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("code", { className: "pm-settings-path", children: path }),
    /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("button", { type: "button", className: "pm-link pm-settings-link", onClick: () => {
      void gateway.openPath(path, "reveal").then((ok) => {
        setRefused(!ok);
      });
    }, children: t(isMac() ? "pending.unreadable.revealMac" : "pending.unreadable.revealOther") }),
    isRefused ? /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("span", { className: "pm-setting-hint", role: "status", children: t("action.openFailed") }) : null
  ] });
}
var settingsPageCss = `
.pm-settings { display: flex; flex-direction: column; gap: 32px; }
.pm-settings-note { margin: 16px 0 0; }
.pm-settings-changes { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: var(--pm-text); }
.pm-settings-effects { display: flex; flex-direction: column; gap: 6px; }
.pm-settings-effects p { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-settings-conflict { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
.pm-settings-conflict p { flex: 1; min-width: 0; margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text); }
.pm-settings-root { display: flex; align-self: stretch; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; }
.pm-settings-path {
  flex: 1 1 240px; min-width: 0;
  font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); font-size: 12px; line-height: 1.5;
  color: var(--pm-text-2); overflow-wrap: anywhere; user-select: text;
}
.pm-settings-root > .pm-setting-hint { flex-basis: 100%; }
/* \u6B21\u6587\u5B57\u8272\u7684\u53EA\u6709\u4E09\u4E2A\u8DF3\u8F6C\u94FE\u63A5\uFF1A\u72B6\u6001\u5361\u300C\u6253\u5F00\u8BB0\u5FC6\u9875 \u203A\u300D\u3001\u300C\u67E5\u770B\u6700\u8FD1\u5220\u9664 \u203A\u300D\u3001\u300C\u5728\u8BBF\u8FBE\u4E2D\u663E\u793A\u300D\uFF1B\u522B\u7684\u94FE\u63A5\uFF08\u5361\u7247\u91CC\u7684\u300C\u6062\u590D\u300D\u3001\u539F\u4F4D\u786E\u8BA4\uFF09\u7167\u666E\u901A\u94FE\u63A5 */
.pm-settings .pm-settings-link { font-size: 13px; line-height: 1.5; color: var(--pm-text-2); white-space: nowrap; }
.pm-settings .pm-settings-link:hover { color: var(--pm-text); text-decoration: none; }
`;

// client/sidebar/SidebarTab.tsx
var import_react42 = require("react");

// client/sidebar/injected-groups.ts
var ruledMemories = (r) => r.kind === "horizontal" ? [r.left, r.right] : [r.memory];
function groupInjected({ injectedIds, coreIds, titleOnlyIds, byId, ruled, conflicts, verticals }) {
  const ruledIds = new Set(ruled.map((r) => r.decisionId));
  const sides = (...list2) => list2.flatMap((m) => m === null ? [] : [m.id]);
  const candidates = [
    ...ruled.filter((r) => r.kind === "horizontal").map((r) => ({ decision: { kind: "ruled", ruled: r }, ids: sides(...ruledMemories(r)) })),
    ...conflicts.filter((c) => !ruledIds.has(c.decisionId)).map((c) => ({ decision: { kind: "conflict", item: c }, ids: sides(c.left, c.right) })),
    ...ruled.filter((r) => r.kind === "vertical").map((r) => ({ decision: { kind: "ruled", ruled: r }, ids: sides(...ruledMemories(r)) })),
    ...verticals.filter((c) => !ruledIds.has(c.decisionId)).map((c) => ({ decision: { kind: "vertical", item: c }, ids: sides(c.memory) }))
  ];
  const core = new Set(coreIds);
  const titleOnly = new Set(titleOnlyIds);
  const groups = /* @__PURE__ */ new Map();
  const decisions = [];
  const inline = /* @__PURE__ */ new Set();
  const listed = /* @__PURE__ */ new Set();
  for (const id of injectedIds) {
    for (const candidate of candidates) {
      if (listed.has(candidate) || !candidate.ids.includes(id)) continue;
      listed.add(candidate);
      decisions.push(candidate.decision);
      if (candidate.decision.kind !== "ruled") inline.add(candidate.decision.item.decisionId);
    }
    const done = ruled.find((r) => ruledMemories(r).some((m) => m.id === id));
    const memory = byId.get(id) ?? (done === void 0 ? void 0 : ruledMemories(done).find((m) => m.id === id));
    if (memory === void 0) continue;
    const group = groups.get(memory.type) ?? { memories: [], full: 0, titleOnly: 0 };
    groups.set(memory.type, {
      memories: [...group.memories, memory],
      full: group.full + (core.has(id) ? 1 : 0),
      titleOnly: group.titleOnly + (titleOnly.has(id) ? 1 : 0)
    });
  }
  return {
    groups: [...groups].map(([type, { memories, full, titleOnly: titles }]) => {
      const total = memories.length;
      const depth = full === total ? "full" : titles === total ? "titleOnly" : full === 0 && titles === 0 ? "summary" : void 0;
      return { type, depth, memories };
    }),
    decisions,
    inline
  };
}

// client/sidebar/SidebarTab.tsx
var import_jsx_runtime43 = require("react/jsx-runtime");
var outcomeOf = (result) => ({ ...result.isUnrecorded ? { isUnrecorded: true } : {}, ...result.isHardDeleted ? { isHardDeleted: true } : {} });
var USAGE_TITLE = {
  start: "sidebar.usage.title",
  resumed: "sidebar.usage.titleResumed",
  compacted: "sidebar.usage.titleCompacted",
  refreshed: "sidebar.usage.titleRefreshed"
};
var YOUR_CALL = "your-call";
var DEPTH_LABEL = {
  full: "sidebar.groups.full",
  summary: "sidebar.groups.summary",
  titleOnly: "sidebar.groups.titleOnly"
};
function inWorkspace(item, ws) {
  if (item.kind === "advice") return false;
  const own = { kind: "workspace", workspacePath: ws };
  return pendingItemScopes(item).some((s) => sameScope(s, own));
}
function SidebarTab({ sessionId, workspacePath: cwd, openPage }) {
  const t = useT();
  const gateway = useGateway();
  const session = (0, import_react42.useMemo)(() => ({ kind: "ready", sessionId, cwd }), [sessionId, cwd]);
  const sessionView = gateway.useView(session, "session");
  const library = gateway.useView(session, "library");
  const pending = gateway.useView(session, "pending");
  const health = gateway.useView(session, "health");
  const config = gateway.useConfig();
  const deletions = gateway.useDeletions();
  const [ruled, setRuled] = (0, import_react42.useState)([]);
  const ruledItems = (0, import_react42.useRef)(/* @__PURE__ */ new Map());
  const [undone, setUndone] = (0, import_react42.useState)(/* @__PURE__ */ new Map());
  const [purged, setPurged] = (0, import_react42.useState)(/* @__PURE__ */ new Set());
  const [removed, setRemoved] = (0, import_react42.useState)(/* @__PURE__ */ new Map());
  const [wroteAgentsMd, setWroteAgentsMd] = (0, import_react42.useState)(/* @__PURE__ */ new Map());
  const runner = useCommandRunner(session);
  const [refused, setRefused] = (0, import_react42.useState)(void 0);
  const [staleSuggestions, setStaleSuggestions] = (0, import_react42.useState)(/* @__PURE__ */ new Map());
  const run = (id, command, onOk) => {
    setRefused(void 0);
    runner.run(id, command, { onOk, onHandledElsewhere() {
      setRefused(id);
    } });
  };
  const settle = (item, entry) => {
    ruledItems.current.set(item.decisionId, item);
    setRuled((prev) => [...prev, entry]);
    setUndone((prev) => {
      const next = new Map(prev);
      next.delete(item.decisionId);
      return next;
    });
  };
  const adopt = (item, suggestion, verdict) => {
    const ruledOf = (result) => {
      if (item.kind === "conflict-vertical") return item.memory === null ? void 0 : { kind: "vertical", decisionId: item.decisionId, verdict, memory: item.memory, ...outcomeOf(result) };
      return item.left === null || item.right === null ? void 0 : { kind: "horizontal", decisionId: item.decisionId, verdict, left: item.left, right: item.right, ...outcomeOf(result) };
    };
    setRefused(void 0);
    runner.run(item.decisionId, { cmd: "apply-proposal", decisionId: item.decisionId, suggestionId: suggestion.id }, {
      onOk(result) {
        const entry = ruledOf(result);
        if (entry !== void 0) settle(item, entry);
      },
      onHandledElsewhere() {
        setRefused(item.decisionId);
      },
      // 建议已换了一份，或两条在建议生成后被改过：什么都没动，卡上这一份当作失效
      onFailed(failure) {
        if (failure.code !== "stale") return false;
        setStaleSuggestions((prev) => new Map(prev).set(item.decisionId, suggestion.id));
        return true;
      }
    });
  };
  const undo = (decisionId) => {
    run(decisionId, { cmd: "undo", decisionId }, () => {
      const item = ruledItems.current.get(decisionId);
      if (item !== void 0) setUndone((prev) => new Map(prev).set(decisionId, item));
      setRuled((prev) => prev.filter((r) => r.decisionId !== decisionId));
    });
  };
  const forget = (memory) => {
    const memoryId = memory.id;
    setPurged((prev) => new Set(prev).add(memoryId));
    setRemoved((prev) => new Map(prev).set(memoryId, { memory }));
    run(memoryId, { cmd: "forget", memoryId, layer: scopeOfMemory(memory) }, (_result, sent) => {
      if (sent.cmd === "forget") setPurged((prev) => {
        const next = new Set(prev);
        next.delete(memoryId);
        return next;
      });
    });
  };
  const isPurged = (id) => purged.has(id) && deletions.of(id) === "hard";
  const restore = (memory) => {
    runner.run(memory.id, { cmd: "restore", memoryId: memory.id, layer: scopeOfMemory(memory) }, {
      onFailed: "silent",
      onOk() {
        setRemoved((prev) => new Map(prev).set(memory.id, { memory, isRestored: true }));
      }
    });
  };
  const arrivals = useArrivals(sessionView.status === "ready" ? writtenSinceSnapshot(sessionView.data) : void 0, sessionId);
  const folds = useFold(void 0, "sidebar", false);
  if (library.status !== "ready") return /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("div", { className: "pm-side", children: /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(ViewMessage, { state: library, idle: t("view.loading"), className: "pm-side-hint" }) });
  const snapshot = sessionView.status === "ready" ? sessionView.data : void 0;
  const ws = snapshot?.workspacePath ?? cwd;
  const { byId, globalCount, projectCount } = sessionCards(library.data, ws);
  const settled2 = [...removed].filter(([id, entry]) => entry.isRestored === true && byId.has(id)).map(([id]) => id);
  if (settled2.length > 0) {
    setRemoved((prev) => {
      const next = new Map(prev);
      for (const id of settled2) next.delete(id);
      return next;
    });
  }
  const purgedNote = (id) => /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("p", { className: "pm-side-hint", tabIndex: -1, children: t("pending.secret.deletedNotice") }, id);
  const softRemoved = (id) => {
    const entry = removed.get(id);
    return entry !== void 0 && deletions.of(id, scopeOfMemory(entry.memory)) === "soft" ? entry.memory : void 0;
  };
  const deletedRow = (id, memory) => /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("div", { className: "pm-side-saved pm-side-saved--deleted", "data-memory-id": id, children: [
    /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("p", { className: "pm-side-hint", children: t("chat.card.deleted") }),
    /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(Button, { variant: "ghost", unavailable: runner.unavailable(id), onClick: () => {
      restore(memory);
    }, children: t("chat.card.undo") })
  ] }, id);
  const refusedNote = /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("p", { className: "pm-pending-error", role: "alert", tabIndex: -1, children: t("sidebar.action.refused") });
  if (globalCount === 0 && projectCount === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("div", { className: "pm-side", children: [
      (snapshot?.savedIds ?? []).filter(isPurged).map(purgedNote),
      (snapshot?.savedIds ?? []).flatMap((id) => {
        const memory = softRemoved(id);
        return memory === void 0 ? [] : [deletedRow(id, memory)];
      }),
      refused !== void 0 ? refusedNote : null,
      /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(EmptyState, { variant: "first", title: t("sidebar.empty.title"), children: t("sidebar.empty.body") })
    ] });
  }
  const pendingItems = pending.status === "ready" ? pending.data.items : [];
  const backInView = [...undone.keys()].filter((id) => pendingItems.some((item) => "decisionId" in item && item.decisionId === id));
  if (backInView.length > 0) {
    setUndone((prev) => {
      const next = new Map(prev);
      for (const id of backInView) next.delete(id);
      return next;
    });
  }
  const stillUndone = [...undone.values()].filter((item) => !backInView.includes(item.decisionId));
  const viewLabels = mergeTypeLabels(library, pending);
  const label = (type) => typeLabel(t, type, { viewLabels, customTypes: config?.customTypes });
  const ruledIds = new Set(ruled.map((r) => r.decisionId));
  const { groups, decisions, inline } = groupInjected({
    injectedIds: snapshot?.injectedIds ?? [],
    coreIds: snapshot?.coreIds ?? [],
    titleOnlyIds: snapshot?.titleOnlyIds ?? [],
    byId,
    ruled,
    conflicts: [...pendingItems, ...stillUndone].filter((item) => item.kind === "conflict-horizontal"),
    verticals: [...pendingItems, ...stillUndone].filter((item) => item.kind === "conflict-vertical")
  });
  const saved = (snapshot === void 0 ? [] : writtenSinceSnapshot(snapshot)).flatMap((id) => {
    if (wroteAgentsMd.has(id)) return [{ id, memory: wroteAgentsMd.get(id), isWrittenToAgentsMd: true }];
    if (isPurged(id)) return [{ id, memory: void 0 }];
    const deleted = softRemoved(id);
    if (deleted !== void 0) return [{ id, memory: deleted, isDeleted: true }];
    const entry = removed.get(id);
    const how = entry === void 0 ? void 0 : deletions.of(id, scopeOfMemory(entry.memory));
    if (isLiveWrite(id, byId, deletions)) return [{ id, memory: byId.get(id) }];
    return entry?.isRestored === true && how === void 0 ? [{ id, memory: entry.memory }] : [];
  });
  const sessionChanges = snapshot === void 0 ? [] : (library.data.modelChanges ?? []).filter((c) => c.sessionId === sessionId && c.at > snapshot.frozenAt);
  const createdHere = new Set(snapshot?.savedIds ?? []);
  const latestRewrite = /* @__PURE__ */ new Map();
  for (const c of sessionChanges) {
    if (c.kind === "rewrite" && c.at >= (latestRewrite.get(c.memoryId)?.at ?? -Infinity)) latestRewrite.set(c.memoryId, c);
  }
  const changes = sessionChanges.filter((c) => c.kind === "supersede" || !createdHere.has(c.memoryId) && latestRewrite.get(c.memoryId) === c);
  const scope = ws === void 0 ? void 0 : { kind: "workspace", workspacePath: ws };
  const restPending = ws === void 0 || pending.status !== "ready" ? 0 : pending.data.items.filter((item) => inWorkspace(item, ws) && !("decisionId" in item && (inline.has(item.decisionId) || ruledIds.has(item.decisionId)))).length;
  const now = Date.now();
  const card = (memory) => /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(MemoryCard, { memory, now, typeLabel: label(memory.type), hideScope: memory.scope === "workspace" });
  const failed2 = (id) => refused === id ? refusedNote : /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(CommandFeedback, { runner, id });
  const projectName = (m) => m.scope === "workspace" && m.workspacePath !== void 0 && !samePath(m.workspacePath, ws) ? baseName(m.workspacePath) : void 0;
  const isOwnSide = (m) => m === null || m.scope === "workspace" && projectName(m) === void 0;
  const bootedAt = health.status === "ready" ? health.data.bootedAt : void 0;
  const usageTitle = t(USAGE_TITLE[snapshot?.origin ?? "start"]);
  const usage = snapshot === void 0 ? sessionView.status === "missing" ? /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(Note, { title: t("sidebar.noSnapshot.title"), children: t("sidebar.noSnapshot.body") }) : /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(ViewMessage, { state: sessionView, idle: t("view.loading"), className: "pm-side-hint" }) : bootedAt !== void 0 && snapshot.frozenAt < bootedAt ? /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(Note, { title: t("sidebar.stale.title"), children: t("sidebar.stale.body") }) : /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)(import_jsx_runtime43.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(
      ContextBudgetBar,
      {
        count: snapshot.injectedIds.length,
        budget: snapshot.budget,
        tokens: snapshot.tokens,
        usedTokens: snapshot.usedTokens,
        droppedCount: snapshot.overflowMode === "strict" ? snapshot.omittedCount : 0,
        onHandle: () => {
          openPage({ view: "todo", ...scope === void 0 ? {} : { scope }, fromChat: true });
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("p", { className: "pm-side-hint", children: t("sidebar.usage.searchNote") })
  ] });
  const waiting = decisions.filter((d) => d.kind !== "ruled").length;
  const toPage = () => {
    openPage({ view: "todo", ...scope === void 0 ? {} : { scope }, fromChat: true, level: "your-call" });
  };
  const conflictFooter = (item, suggestion, isStale) => {
    const verdict = suggestion === void 0 ? void 0 : verdictOfAction(suggestion.action);
    const { horizontal: horizontal2, vertical: vertical2 } = CONFLICT_ACTION_VERDICTS;
    const adoptNote = verdict === void 0 ? void 0 : item.kind === "conflict-vertical" ? t(verdict === vertical2.keepBaseline ? item.memory?.hasSecret === true ? "pending.vertical.adoptNotePurge" : "pending.vertical.adoptNoteDelete" : "pending.vertical.adoptNoteKeepBoth") : verdict === horizontal2.keepBoth ? t("pending.conflict.adoptNoteKeepBoth") : t("pending.conflict.adoptNote", { drop: verdict === horizontal2.keepA ? "B" : "A" });
    return /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)(import_jsx_runtime43.Fragment, { children: [
      suggestion !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("p", { className: "pm-side-suggestion", children: [
        /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("span", { className: "pm-side-suggestion-icon", children: /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(Icon, { name: "sparkle", size: 14 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("span", { children: [
          t("sidebar.suggestion.lead"),
          /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("strong", { children: t(ACTION_LABEL[suggestion.action]) })
        ] })
      ] }) : null,
      suggestion === void 0 && !isStale && item.noSuggestion?.code === "undecided" ? /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("p", { className: "pm-side-hint", children: t("sidebar.suggestion.undecided") }) : null,
      isStale ? /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("p", { className: "pm-side-hint", role: "status", children: t("sidebar.suggestion.stale") }) : null,
      adoptNote !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(AdviceNote, { label: "note", children: adoptNote }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("div", { className: "pm-conflict-actions", children: [
        suggestion !== void 0 && verdict !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(Button, { variant: "primary", unavailable: runner.unavailable(item.decisionId), onClick: () => {
          adopt(item, suggestion, verdict);
        }, children: t("pending.conflict.adopt") }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("button", { type: "button", className: "pm-link", onClick: toPage, children: t("sidebar.footer.pendingLink") })
      ] })
    ] });
  };
  const isStaleOf = (item) => {
    const staleId = staleSuggestions.get(item.decisionId);
    return staleId !== void 0 && (item.suggestion === void 0 || item.suggestion.id === staleId);
  };
  const decision = (entry) => {
    if (entry.kind === "conflict") {
      const { item } = entry;
      const isStale = isStaleOf(item);
      const suggestion = isStale || item.left === null || item.right === null ? void 0 : item.suggestion;
      return /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(
          ConflictRuling,
          {
            layout: "narrow",
            left: item.left,
            right: item.right,
            now,
            typeLabel: label,
            hideScope: isOwnSide(item.left) && isOwnSide(item.right),
            projectName,
            footer: conflictFooter(item, suggestion, isStale)
          }
        ),
        failed2(item.decisionId)
      ] }, item.decisionId);
    }
    if (entry.kind === "vertical") {
      const { item } = entry;
      const isStale = isStaleOf(item);
      const suggestion = isStale || item.memory === null ? void 0 : item.suggestion;
      return /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(
          VerticalConflictRuling,
          {
            layout: "narrow",
            memory: item.memory,
            baselineRef: item.baselineRef,
            now,
            typeLabel: label,
            hideScope: item.memory?.scope !== "global",
            footer: conflictFooter(item, suggestion, isStale)
          }
        ),
        failed2(item.decisionId)
      ] }, item.decisionId);
    }
    const { ruled: r } = entry;
    return /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(RuledCard, { ruled: r, card, unavailable: runner.unavailable(r.decisionId), onUndo: () => {
        undo(r.decisionId);
      } }),
      failed2(r.decisionId)
    ] }, r.decisionId);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("div", { className: "pm-side", children: [
    ws !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("p", { className: "pm-side-crumb", children: [
      /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("span", { className: "pm-side-crumb-scope", children: t("sidebar.crumb.scope") }),
      " ",
      baseName(ws)
    ] }) : null,
    projectCount === 0 ? /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("p", { className: "pm-side-crumb-hint", children: t("sidebar.globalOnly") }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("section", { className: "pm-side-usage", "aria-label": usageTitle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("h2", { className: "pm-side-title", children: usageTitle }),
      usage
    ] }),
    saved.length > 0 || changes.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("section", { className: "pm-side-section", "aria-label": t("sidebar.saved.title"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("div", { className: "pm-side-section-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("h2", { className: "pm-side-title", children: t("sidebar.saved.title") }),
        /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("p", { className: "pm-side-hint", children: t("sidebar.saved.note") })
      ] }),
      saved.map(({ id, memory, isWrittenToAgentsMd, isDeleted }) => {
        const row = memory === void 0 ? purgedNote(id) : isDeleted === true ? deletedRow(id, memory) : isWrittenToAgentsMd === true ? /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(SavedRow2, { session, memory, card, state: "wrote-agents-md", children: null }, id) : /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)(
          SavedRow2,
          {
            session,
            memory,
            card,
            onWroteAgentsMd: () => {
              setWroteAgentsMd((prev) => new Map(prev).set(id, memory));
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(
                DeleteWithConfirm,
                {
                  onDelete: () => {
                    forget(memory);
                  },
                  trigger: (open) => /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(
                    Button,
                    {
                      variant: "icon",
                      "aria-label": t("sidebar.saved.delete"),
                      title: t("sidebar.saved.delete"),
                      unavailable: runner.unavailable(id),
                      onClick: open,
                      children: /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(Icon, { name: "trash", size: 14 })
                    }
                  )
                }
              ),
              failed2(id)
            ]
          },
          id
        );
        return /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(Arrival, { arrivals, id, highlight: true, children: row }, id);
      }),
      changes.map((change) => change.kind === "rewrite" ? /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("div", { className: "pm-side-change", "data-memory-id": change.memoryId, children: [
        card(byId.get(change.memoryId) ?? change.before),
        /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(ModelChangeLine, { session, change, kind: "rewrite", after: byId.get(change.memoryId), isGlobal: change.before.scope === "global" })
      ] }, change.decisionId) : /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("div", { className: "pm-side-change", "data-memory-id": change.memoryId, children: /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(
        ModelChangeLine,
        {
          session,
          change,
          kind: "supersede",
          bySubject: change.by === void 0 ? void 0 : byId.get(change.by)?.name
        }
      ) }, change.decisionId))
    ] }) : null,
    refused !== void 0 && !inline.has(refused) && !ruledIds.has(refused) ? refusedNote : null,
    decisions.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("section", { className: "pm-side-section", "aria-label": t("pending.level.your-call"), children: /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(
      Fold,
      {
        level: 2,
        className: "pm-side-title",
        isOpen: folds.isOpen(YOUR_CALL, true),
        onToggle: () => {
          folds.toggle(YOUR_CALL, folds.isOpen(YOUR_CALL, true));
        },
        heading: /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)(import_jsx_runtime43.Fragment, { children: [
          t("pending.level.your-call"),
          waiting > 0 ? /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)(import_jsx_runtime43.Fragment, { children: [
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("span", { className: "pm-side-group-count", children: formatNumber(waiting) }),
            /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(StatusMarker, { kind: "pending" })
          ] }) : null
        ] }),
        children: decisions.map(decision)
      }
    ) }) : null,
    groups.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("section", { className: "pm-side-section", "aria-label": t("sidebar.groups.title"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("h2", { className: "pm-side-title", children: t("sidebar.groups.title") }),
      groups.map(({ type, depth, memories }) => {
        const key = `type|${type}`;
        const isOpen = folds.isOpen(key, false);
        return /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("section", { className: "pm-side-group", "aria-label": label(type), children: /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(
          Fold,
          {
            level: 3,
            className: "pm-side-group-title",
            isOpen,
            onToggle: () => {
              folds.toggle(key, isOpen);
            },
            heading: /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)(import_jsx_runtime43.Fragment, { children: [
              label(type),
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("span", { className: "pm-side-group-count", children: formatNumber(memories.length) }),
              depth === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)(import_jsx_runtime43.Fragment, { children: [
                " ",
                /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("i", { className: "pm-sep", "aria-hidden": "true", children: "\xB7" }),
                /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("span", { className: "pm-side-group-depth", children: t(DEPTH_LABEL[depth]) })
              ] })
            ] }),
            children: memories.map((memory) => /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("div", { children: card(memory) }, memory.id))
          }
        ) }, type);
      })
    ] }) : null,
    scope !== void 0 && (restPending > 0 || projectCount > 0) ? /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("p", { className: "pm-side-footer", children: [
      restPending > 0 ? t("sidebar.footer.pending", { n: formatNumber(restPending) }) : t(projectCount === 1 ? "sidebar.footer.count.one" : "sidebar.footer.count", { n: formatNumber(projectCount) }),
      /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("i", { className: "pm-sep", "aria-hidden": "true", children: "\xB7" }),
      /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(
        "button",
        {
          type: "button",
          className: "pm-link",
          onClick: () => {
            openPage({ view: restPending > 0 ? "todo" : "library", scope, fromChat: true });
          },
          children: t(restPending > 0 ? "sidebar.footer.pendingLink" : "sidebar.footer.countLink")
        }
      )
    ] }) : null
  ] });
}
function SavedRow2({ session, memory, card, state, onWroteAgentsMd, children }) {
  const promote = usePromoteInPlace(session, memory, scopeOfMemory(memory), state ?? promotionOf(memory), onWroteAgentsMd);
  return /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("div", { className: "pm-side-saved", "data-memory-id": memory.id, children: [
    /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("div", { children: card(memory) }),
    children,
    /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("div", { className: "pm-side-saved-promote", children: promote })
  ] });
}
function RuledCard({ ruled, card, unavailable, onUndo }) {
  const t = useT();
  const { verdict } = ruled;
  const isBaseline = ruled.kind === "vertical" && verdict === CONFLICT_ACTION_VERDICTS.vertical.keepBaseline;
  const chipKey = ruled.kind === "vertical" ? isBaseline ? "sidebar.ruled.keepBaseline" : "sidebar.ruled.keepMemory" : verdict === "keep-left" ? "sidebar.ruled.keepA" : verdict === "keep-right" ? "sidebar.ruled.keepB" : "sidebar.ruled.keepBoth";
  const outcome = ruled.isUnrecorded ? t("sidebar.ruled.unrecorded") : ruled.isHardDeleted ? ruled.kind === "vertical" ? t("conflict.purgedMemory") : t("conflict.purgedSide", { side: verdict === "keep-left" ? "B" : "A" }) : t(ruled.kind === "vertical" ? isBaseline ? "sidebar.ruled.deletedMemory" : "sidebar.ruled.keptMemory" : verdict === "keep-left" ? "sidebar.ruled.deletedB" : verdict === "keep-right" ? "sidebar.ruled.deletedA" : "sidebar.ruled.keptBoth");
  const note = t("conflict.twoSentences", { first: t("pending.result.bySuggestion"), second: outcome });
  const isDeleting = ruled.kind === "vertical" ? isBaseline : verdict !== CONFLICT_ACTION_VERDICTS.horizontal.keepBoth;
  const kept = ruled.kind === "vertical" ? isBaseline ? [] : [ruled.memory] : verdict === "keep-left" ? [ruled.left] : verdict === "keep-right" ? [ruled.right] : [ruled.left, ruled.right];
  return /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("article", { className: "pm-side-ruled", children: [
    kept.map((memory) => /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("div", { children: card(memory) }, memory.id)),
    /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)(
      ResultLine,
      {
        chip: t(chipKey),
        undo: ruled.isUnrecorded || ruled.isHardDeleted ? void 0 : /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(Button, { variant: "ghost", unavailable, onClick: onUndo, children: t("sidebar.ruled.undo") }),
        children: [
          note,
          isDeleting ? /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)(import_jsx_runtime43.Fragment, { children: [
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("span", { children: t("sidebar.ruled.appliesLater") })
          ] }) : null
        ]
      }
    )
  ] });
}
function Fold({ level, className, heading, isOpen, onToggle, children }) {
  const bodyId = (0, import_react42.useId)();
  const isClicked = (0, import_react42.useRef)(false);
  const Heading = level === 2 ? "h2" : "h3";
  return /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)(import_jsx_runtime43.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(Heading, { className, children: /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)(
      "button",
      {
        type: "button",
        className: "pm-side-fold",
        "aria-expanded": isOpen,
        "aria-controls": bodyId,
        onClick: () => {
          isClicked.current = !isOpen;
          onToggle();
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("span", { className: "pm-side-fold-label", children: heading }),
          /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(Icon, { name: "chevronRight", size: 14 })
        ]
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("div", { id: bodyId, className: "pm-side-fold-body", hidden: !isOpen, children: isOpen ? /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(GroupBody, { clicked: isClicked, children }) : null })
  ] });
}
function Note({ title, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("div", { className: "pm-side-note", role: "status", children: [
    /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("p", { className: "pm-side-note-title", children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime43.jsx)("p", { className: "pm-side-note-body", children })
  ] });
}
var sidebarTabCss = `
.pm-side-root { height: 100%; min-height: 0; }
.pm-side {
  height: 100%; min-height: 0; overflow: auto; scrollbar-gutter: stable;
  display: flex; flex-direction: column; gap: 20px; padding: 12px 16px 24px; background: var(--pm-bg);
}
.pm-side-crumb { margin: 0; font-size: 13px; line-height: 1.5; color: var(--pm-text); overflow-wrap: anywhere; }
.pm-side-crumb-scope { color: var(--pm-text-2); }
.pm-side-crumb-hint { margin: -14px 0 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-side-hint { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-side-title { margin: 0; font-size: 13px; font-weight: 600; line-height: 1.5; color: var(--pm-text); }
.pm-side-usage { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; gap: 6px 8px; }
.pm-side-usage > .pm-budget { display: contents; }
.pm-side-usage .pm-budget-summary { grid-column: 2; grid-row: 1; }
.pm-side-usage .pm-budget-bar, .pm-side-usage .pm-budget-legend, .pm-side-usage > .pm-side-note, .pm-side-usage > .pm-side-hint { grid-column: 1 / -1; }
.pm-side-section { display: flex; flex-direction: column; gap: 12px; --pm-arrive-gap: 12px; }
.pm-side-group { display: flex; flex-direction: column; gap: 12px; }
.pm-side-group-title { margin: 4px 0 0; font-size: 12px; font-weight: 600; line-height: 1.5; color: var(--pm-text-2); }
.pm-side-group-count { margin-left: 4px; font-weight: 400; color: var(--pm-text-2); }
.pm-side-group-title .pm-sep { margin: 0 6px 0 2px; }
.pm-side-group-depth { font-weight: 400; color: var(--pm-text-2); }
.pm-side-fold {
  display: flex; align-items: center; gap: 4px; width: calc(100% + 8px); margin: 0 -4px; padding: 2px 4px;
  border: 0; border-radius: var(--dsw-radius-sm, 8px); background: transparent; font: inherit; color: inherit; text-align: left; cursor: pointer;
}
.pm-side-fold:hover { background: var(--pm-hover); }
.pm-side-fold svg { flex: none; margin-left: auto; color: var(--pm-text-2); transition: transform 120ms ease; }
.pm-side-fold[aria-expanded='true'] svg { transform: rotate(90deg); }
.pm-side-fold-label { min-width: 0; overflow-wrap: anywhere; }
.pm-side-fold-label .pm-marker { margin: -2px 0 0 6px; }
.pm-side-fold-body, .pm-side-fold-body .pm-arrive-body { display: flex; flex-direction: column; gap: 12px; }
.pm-side-fold-body[hidden] { display: none; }
.pm-side-section-head { display: flex; flex-direction: column; gap: 2px; }
.pm-side-saved { display: grid; grid-template-columns: minmax(0, 1fr) 24px; align-items: start; gap: 4px 8px; }
.pm-side-saved > .pm-pending-error, .pm-side-saved > .pm-side-saved-promote { grid-column: 1 / -1; }
.pm-side-saved--deleted { display: flex; align-items: center; justify-content: space-between; }
.pm-side-saved-promote { display: flex; flex-direction: column; gap: 8px; }
.pm-side-saved-promote:empty { display: none; }
.pm-side-change { display: flex; flex-direction: column; gap: 6px; }
.pm-side-change > .pm-change:only-child { padding-left: 0; }
/* \u4FA7\u680F\u7A84\uFF0C\u5220\u9664\u786E\u8BA4\u653E\u4E0D\u8FDB\u884C\u5C3E\uFF1A\u6362\u5230\u5361\u7247\u4E0B\u9762\u4E00\u884C\u9760\u53F3\uFF0C\u8BB0\u5FC6\u5361\u4E0D\u8DDF\u7740\u53D8\u7A84 */
.pm-side-saved > .pm-soft-confirm { grid-column: 1 / -1; justify-self: end; }
.pm-side .pm-conflict { padding-bottom: 0; }
.pm-side .pm-conflict .pm-mc-text {
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;
}
.pm-side .pm-conflict-actions .pm-btn { padding: 5px 10px; }
.pm-side .pm-conflict-footer { gap: 8px; }
/* \u5EFA\u8BAE\u7ED3\u8BBA\u4E00\u884C\uFF1A\u56FE\u6807\u548C\u6587\u5B57\u9876\u9F50\uFF0C\u7A84\u5BBD\u5EA6\u4E0B\u6587\u5B57\u6298\u884C */
.pm-side-suggestion {
  display: flex; align-items: flex-start; gap: 6px; min-width: 0; margin: 0;
  font-size: 13px; line-height: 1.5; color: var(--pm-text); overflow-wrap: anywhere;
}
/* \u6A21\u578B\u56FE\u6807\u540C\u8BB0\u5FC6\u9875\u5EFA\u8BAE\u5757\uFF1A\u4E3B\u9898\u8272\uFF1B\u9AD8\u5EA6\u540C\u4E00\u884C\u6587\u5B57\uFF0C\u548C\u7B2C\u4E00\u884C\u5C45\u4E2D */
.pm-side-suggestion-icon { display: inline-flex; flex: none; align-items: center; height: 19.5px; color: var(--pm-accent); }
.pm-side-suggestion strong { font-weight: 600; }
.pm-side-ruled { display: flex; flex-direction: column; gap: 10px; }
.pm-side-note { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: var(--dsw-radius-md, 12px); background: var(--pm-bg-block); }
.pm-side-note-title { margin: 0; font-size: 13px; font-weight: 600; line-height: 1.5; color: var(--pm-text); }
.pm-side-note-body { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pm-text-2); }
.pm-side-footer {
  margin: auto 0 0; padding-top: 12px; border-top: .5px solid var(--pm-line);
  font-size: 12px; line-height: 1.5; color: var(--pm-text-2);
}
.pm-side-footer .pm-link { font-size: 12px; }
@media (prefers-reduced-motion: reduce) {
  .pm-side-fold svg { transition: none; }
}
`;

// client/styles.ts
var SLOT_STYLES = {
  page: {
    dismissButtonCss,
    memoryPageCss,
    titleControlsCss,
    statusBarCss,
    confirmCss,
    sharedTabCss,
    groupsCss,
    libraryTabCss,
    batchEditCss,
    deletedTabCss,
    editCss,
    editModesCss,
    modelEditCss,
    moveCss,
    pendingCss,
    proposalCss,
    suggestionCss
  },
  sidebar: { confirmCss, modelChangeCss, sidebarTabCss },
  chat: { confirmCss, modelChangeCss, savedMemoriesCardCss },
  settings: { settingsCss, healthBannerCss, controlsCss, scenesCss, settingsPageCss },
  composer: { memoryButtonCss }
};
var slotCss = (slot) => Object.values(SLOT_STYLES[slot]).join("");

// client/ui/theme.ts
var themeCss = `
.pm-root {
  --pm-text: var(--dsw-alias-label-primary);
  --pm-text-2: var(--dsw-alias-label-secondary);
  --pm-text-3: var(--dsw-alias-label-tertiary);
  --pm-caption: var(--dsw-alias-label-caption);
  --pm-bg: var(--dsw-alias-bg-layer-1);
  --pm-bg-page: var(--dsw-alias-bg-base);
  --pm-bg-raised: var(--dsw-alias-bg-layer-3);
  --pm-bg-block: var(--dsw-alias-bg-module-platform);
  --pm-line: var(--dsw-alias-border-l2);
  --pm-line-card: var(--dsw-alias-border-l3);
  --pm-line-input: var(--dsw-alias-border-l4);
  --pm-line-selected: var(--dsw-static-neutral-bluish-400);
  --pm-line-soft: color-mix(in srgb, var(--dsw-alias-border-l2) 80%, transparent);
  --pm-hover: var(--dsw-alias-interactive-bg-hover);
  --pm-pressed: var(--dsw-alias-interactive-bg-active);
  --pm-track: var(--dsw-alias-interactive-bg-hover);
  --pm-warn: var(--dsw-alias-state-warn-primary);
  --pm-error: var(--dsw-alias-state-error-primary);
  --pm-success: var(--dsw-alias-state-success-primary);
  --pm-focus: var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  --pm-on-error: var(--dsw-static-neutral-bluish-00);
  --pm-accent: #887FA8;
  --pm-accent-tint: #F2F0F9;
  --pm-accent-soft: #BFB9D4;
  color: var(--pm-text);
  font-size: 13px;
  line-height: 1.55;
}
body[data-ds-dark-theme] .pm-root {
  --pm-accent: #B0A8CB;
  --pm-accent-tint: #27252C;
  --pm-accent-soft: #645F77;
}
.pm-root[data-pm-accent='blue-whale'],
body[data-ds-dark-theme] .pm-root[data-pm-accent='blue-whale'] {
  --pm-accent: var(--dsw-alias-state-business-primary);
  --pm-accent-tint: var(--dsw-alias-state-business-tertiary);
  --pm-accent-soft: color-mix(in srgb, var(--dsw-alias-state-business-primary) 50%, var(--pm-bg));
}
.pm-root *, .pm-root *::before, .pm-root *::after { box-sizing: border-box; }
.pm-root :is(button, input[type='checkbox'], [role='option'], [tabindex]):focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--pm-focus);
  outline-offset: 2px;
}
.pm-link { padding: 0; border: 0; background: none; font: inherit; font-weight: 600; color: var(--pm-text); cursor: pointer; }
.pm-link:hover { text-decoration: underline; }
/* \u9000\u4E00\u6B65\u7684\u94FE\u63A5\uFF1A\u6B21\u6587\u5B57\u8272\u3001\u5E38\u89C4\u5B57\u91CD\uFF0C\u60AC\u505C\u6362\u6B63\u6587\u8272\u3001\u4E0D\u52A0\u4E0B\u5212\u7EBF\uFF08\u300C\u53D6\u6D88\u300D\u300C\u8BE6\u60C5\u300D\u300C\u6539\u524D / \u6539\u540E\u300D\u8FD9\u7C7B\uFF09 */
.pm-link--muted { font-weight: 400; color: var(--pm-text-2); }
.pm-link--muted:hover { color: var(--pm-text); text-decoration: none; }
.pm-sep { font-style: normal; color: var(--pm-caption); margin: 0 6px; }
.pm-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
`;

// client/ui/PanelShell.tsx
var import_jsx_runtime44 = require("react/jsx-runtime");
var PM_STYLES = {
  themeCss,
  buttonCss,
  chipCss,
  statusMarkerCss,
  memoryCardCss,
  adviceCss,
  conflictRulingCss,
  contextBudgetBarCss,
  emptyStateCss,
  motionCss,
  segmentedCss
};
var PM_CSS = Object.values(PM_STYLES).join("");
function PanelShell({ gateway, t, className, children, extraCss = "" }) {
  return /* @__PURE__ */ (0, import_jsx_runtime44.jsx)(GatewayProvider, { value: gateway, children: /* @__PURE__ */ (0, import_jsx_runtime44.jsx)(TranslateProvider, { value: t, children: /* @__PURE__ */ (0, import_jsx_runtime44.jsxs)("div", { className: className === void 0 ? "pm-root" : `pm-root ${className}`, "data-pm-accent": gateway.useConfig()?.accent, children: [
    /* @__PURE__ */ (0, import_jsx_runtime44.jsx)("style", { "data-plastic-memory": "", children: PM_CSS + extraCss }),
    children
  ] }) }) });
}

// client/composer/dock.tsx
var import_jsx_runtime45 = require("react/jsx-runtime");
var COMPOSER_CSS = slotCss("composer");
var DOCK_ID = "plastic-memory";
var DOCK_ORDER = 100;
function createComposerDock(ctx, nav, bind, useTranslate) {
  return function MemoryComposerDock(props) {
    const gateway = (0, import_react43.useMemo)(() => bind(props), [props.useSessions, props.useResource]);
    const t = useTranslate();
    const canOpenTab = useCanOpen(nav, "sidebarTab");
    return /* @__PURE__ */ (0, import_jsx_runtime45.jsx)(PanelShell, { gateway, t, className: "pm-composer-root", extraCss: COMPOSER_CSS, children: /* @__PURE__ */ (0, import_jsx_runtime45.jsx)(
      MemoryButton,
      {
        sessionId: props.sessionId,
        useProjection: props.useProjection,
        onOpenTab: canOpenTab ? () => {
          nav.openSidebarTab();
        } : void 0,
        onHandle: () => {
          openMemoryPage(ctx, nav, { view: "todo", fromChat: true });
        }
      }
    ) });
  };
}

// client/chat/index.tsx
var import_react46 = require("react");

// client/chat/MemoryCommandRow.tsx
var import_react45 = require("react");

// client/chat/command-summary.ts
function actionOf(command) {
  switch (command.cmd) {
    case "info":
      return { key: "chat.command.info" };
    case "model-info":
      return { key: "chat.command.modelInfo" };
    case "refresh-views":
      return { key: "chat.command.refreshViews" };
    case "draft-edit":
      return { key: "chat.command.draftEdit" };
    case "plan-edits":
      return { key: "chat.command.planEdits" };
    case "draft-plan":
      return { key: "chat.command.draftPlan" };
    case "suggest":
      return { key: "chat.command.suggest" };
    case "draft-proposal":
      return { key: "chat.command.draftProposal" };
    case "apply-proposal":
      return { key: command.proposal !== void 0 ? "chat.command.applyRequestedProposal" : "chat.command.applyProposal" };
    case "resolve":
      return { key: command.verdict === "keep-both" ? "chat.command.resolve.both" : "chat.command.resolve.one" };
    case "undo":
      return { key: "chat.command.undo" };
    case "promote":
    case "promote-memory":
      return { key: command.target === "agents-md" ? "chat.command.promote.agentsMd" : "chat.command.promote.global" };
    case "keep-local":
    case "keep-local-memory":
      return { key: "chat.command.keepLocal" };
    case "move-memory":
      return { key: "chat.command.move", params: { name: baseName(command.workspacePath) } };
    case "forget":
      return { key: "chat.command.forget" };
    case "restore":
      return { key: "chat.command.restore" };
    case "hard-delete":
      return { key: "chat.command.hardDelete" };
    case "confirm":
      return { key: "chat.command.confirm" };
    case "edit-memory":
      return { key: "chat.command.edit" };
    case "merge-memories":
      return { key: "chat.command.merge" };
    case "apply-edits":
      return { key: "chat.command.applyEdits", params: { n: command.ops.length } };
    case "dismiss-overflow":
      return { key: "chat.command.dismissOverflow" };
    case "ignore-advice":
      return { key: "chat.command.ignoreAdvice" };
    case "unignore-advice":
      return { key: "chat.command.unignoreAdvice" };
    case "scan":
      return { key: "chat.command.scan" };
    case "set-auto-checkup":
      return { key: "chat.command.autoCheckup" };
    case "migrate-type":
      return { key: "chat.command.migrateType", params: { name: command.from } };
  }
}
var firstLine = (text) => text.split("\n", 1)[0];
var MAINTENANCE = /* @__PURE__ */ new Set(["info", "refresh-views", "model-info"]);
function isAbortedText(text) {
  if (text === void 0) return false;
  const head = text.trim();
  return /^(this|the) operation was aborted\.?$/i.test(head) || head === "signal is aborted without reason" || head === "command aborted";
}
function parseResult(text) {
  if (text === void 0) return void 0;
  try {
    return memoryCommandResultSchema.safeParse(JSON.parse(text)).data;
  } catch {
    return void 0;
  }
}
function commandLine(args, outcome) {
  const parsed = args === null ? void 0 : parseMemoryCommand(args);
  const command = parsed?.ok === true ? parsed.command : void 0;
  const action = command === void 0 ? void 0 : actionOf(command);
  if (outcome === null) return { state: "running", action };
  const result = parseResult(outcome.text);
  if (result === void 0) {
    if (outcome.kind === "error" && command !== void 0 && MAINTENANCE.has(command.cmd) && isAbortedText(outcome.text)) return { state: "ok", action };
    return outcome.kind === "success" ? { state: "ok", action } : { state: "error", action, reason: firstLine(outcome.text ?? "") };
  }
  if (result.ok) return { state: "ok", action };
  if (result.code === "busy") return { state: "ok", action, note: "busy" };
  if (result.code === "governance-disabled") return { state: "error", action, reason: { key: "settings.governanceOff" } };
  if (result.code === "llm-unavailable" && command?.cmd === "scan") return { state: "error", action, reason: { key: "checkup.result.llmUnavailable" } };
  if (command === void 0) return { state: "error", action, reason: firstLine(result.detail ?? result.code) };
  const handled = interpret(command, result);
  switch (handled.kind) {
    case "confirm-cross":
    case "confirm-secret":
    case "confirm-suspected":
      return { state: "ok", action, note: "awaiting" };
    case "handled-elsewhere":
      return { state: "ok", action, note: "elsewhere" };
    case "ok":
      return { state: "ok", action };
    case "failed":
      return { state: "error", action, reason: handled.isLocalized ? { key: handled.detail } : firstLine(handled.detail) };
  }
}
function commandInput(args) {
  const text = args?.trim() ?? "";
  if (text === "") return null;
  const space = text.search(/\s/);
  if (space === -1) return maskCard(text);
  return maskCard(`${text.slice(0, space)} ${maskedBody(text.slice(space).trim())}`);
}
function commandOutput(outcome) {
  const text = outcome?.text ?? "";
  return text === "" ? null : maskedBody(text);
}
var CARD_MASK = { severity: "suspected" };
var maskCard = (text) => maskSecrets(text, CARD_MASK);
var maskStrings = (value) => typeof value === "string" ? maskCard(value) : Array.isArray(value) ? value.map(maskStrings) : value !== null && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, maskStrings(v)])) : value;
function maskedBody(text) {
  try {
    return maskCard(JSON.stringify(maskStrings(JSON.parse(text)), null, 2));
  } catch {
    return maskCard(text);
  }
}

// client/chat/MemoryToolRow.tsx
var import_react44 = require("react");

// client/chat/tool-summary.ts
var MEMORY_TOOLS = [
  "memory_save",
  "memory_search",
  "memory_forget",
  "memory_snapshot",
  "memory_source",
  "memory_confirm",
  "memory_scan",
  "memory_health",
  "memory_promote"
];
function parseArgs(argsRaw) {
  if (argsRaw === null || argsRaw === void 0 || argsRaw === "") return void 0;
  try {
    const value = JSON.parse(argsRaw);
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
  } catch {
    return void 0;
  }
}
var str = (v) => typeof v === "string" ? v : "";
var list = (v) => Array.isArray(v) ? v : [];
function parseSaveResult(text) {
  const saved = /^已保存记忆 ([^\s（]+)（([^，）]+)，(global|workspace)）/.exec(text);
  if (saved) return { kind: "saved", id: saved[1], type: saved[2], scope: saved[3] };
  const updated = /^已更新记忆 ([^\s。（]+)(?:（(.+?)）)?。/.exec(text);
  if (updated) return { kind: "updated", id: updated[1], ...updated[2] === void 0 ? {} : { name: updated[2] } };
  return void 0;
}
function isGlobalConfirmPending(text) {
  return /^未保存：[^\n]*是全局记忆，改动会影响所有项目/.test(text);
}
function countSearchHits(text) {
  return text.split("\n\n").filter((block) => /^\[[^\]\s]+\] [^\n]*｜/.test(block)).length;
}
function forgottenCount(text) {
  const m = /已遗忘 (\d+) 条/.exec(text);
  return m ? Number(m[1]) : 0;
}
var SOURCE_MODES = ["user-explicit", "user-behavior", "environment-observed", "agent-inferred", "agent-action-confirmed"];
function savedMemoryCard(args, resultText2, time) {
  const result = parseSaveResult(resultText2);
  if (result === void 0 || args === void 0) return void 0;
  const sourceMode = SOURCE_MODES.find((mode) => mode === args.sourceMode);
  return maskSecretSurface({
    id: result.id,
    name: str(args.name) || (result.name ?? ""),
    type: result.type ?? str(args.type),
    scope: result.scope ?? (args.scope === "global" ? "global" : "workspace"),
    summary: str(args.summary),
    content: str(args.content),
    tags: list(args.tags).filter((tag) => typeof tag === "string"),
    ...sourceMode === void 0 ? {} : { sourceMode },
    createdAt: time,
    updatedAt: time,
    lastConfirmedAt: time,
    filePath: ""
  }, { severity: "suspected" });
}
function scopeSummary(args) {
  const scopes = list(args.scopes).filter((s) => typeof s === "string");
  if (scopes.length > 0) return { key: scopes.length === 1 ? "chat.scope.paths.one" : "chat.scope.paths", params: { count: scopes.length } };
  const scope = str(args.scope);
  if (scope === "") return { key: "chat.scope.workspace" };
  if (scope === "all") return { key: "chat.scope.all" };
  return { key: "chat.scope.path", params: { name: baseName(scope) } };
}
function toolSummary(toolName, args, resultText2) {
  if (args === void 0) return null;
  switch (toolName) {
    case "memory_save": {
      const name = str(args.name) || str(args.id);
      if (resultText2 === null) return { key: "chat.tool.save.running", params: { name } };
      const result = parseSaveResult(resultText2);
      const notSaved = isGlobalConfirmPending(resultText2) ? "chat.tool.save.confirmingGlobal" : "chat.tool.save.notSaved";
      return { key: result === void 0 ? notSaved : `chat.tool.save.${result.kind}`, params: { name: str(args.name) || (result?.name ?? name) } };
    }
    case "memory_search": {
      const query = str(args.query);
      if (resultText2 === null) return { key: "chat.tool.search.running", params: { query } };
      const count = countSearchHits(resultText2);
      return count === 0 ? { key: "chat.tool.search.none", params: { query } } : { key: "chat.tool.search.found", params: { count, query } };
    }
    case "memory_forget": {
      if (resultText2 === null) {
        const ids = list(args.ids).length;
        return { key: ids === 1 ? "chat.tool.forget.running.one" : "chat.tool.forget.running", params: { count: ids } };
      }
      const count = forgottenCount(resultText2);
      return count === 0 ? { key: "chat.tool.forget.none" } : { key: count === 1 ? "chat.tool.forget.done.one" : "chat.tool.forget.done", params: { count } };
    }
    case "memory_snapshot": {
      const action = str(args.action);
      if (action === "create" || action === "list") return { key: `chat.tool.snapshot.${action}` };
      if (action === "show" || action === "restore") return { key: `chat.tool.snapshot.${action}`, params: { id: str(args.snapshotId) } };
      return null;
    }
    case "memory_source":
      return { key: "chat.tool.source", params: { id: str(args.memoryId) } };
    case "memory_confirm":
      if (args.action === "resolve") return { key: "chat.tool.confirm.resolve", params: { id: str(args.decisionId) } };
      return { key: args.action === "accept-subagent" ? "chat.tool.confirm.acceptSubagent" : "chat.tool.confirm.refresh", params: { id: str(args.memoryId) } };
    case "memory_scan":
      return { key: "chat.tool.scan", scope: scopeSummary(args) };
    case "memory_health":
      return { key: "chat.tool.health", scope: scopeSummary(args) };
    case "memory_promote": {
      const count = list(args.ids).length;
      if (args.dismiss === true) return { key: "chat.tool.promote.dismiss", params: { count } };
      return { key: args.target === "agents-md" ? "chat.tool.promote.agentsMd" : "chat.tool.promote.global", params: { count } };
    }
  }
}

// client/chat/MemoryToolRow.tsx
var import_jsx_runtime46 = require("react/jsx-runtime");
function resultText(block) {
  const parts = block.content.map((b) => b.type === "text" ? b.text ?? "" : JSON.stringify(b, null, 2));
  if (parts.length === 0 && block.error !== void 0) parts.push(`${block.error.name}: ${block.error.code}`);
  return parts.join("\n");
}
var firstLine2 = (text) => text.split("\n", 1)[0];
var STATUS_KEY = {
  preparing: "row.preparing",
  running: "row.running",
  error: "row.failed",
  stopped: "row.stopped"
};
function MemoryToolRow(props) {
  const { toolName, useDisclosure, inspect, hostT } = props;
  const t = useT();
  const { expanded, toggle } = useDisclosure();
  const done = props.phase === "result";
  const argsRaw = props.phase === "result" ? props.block.call?.argsRaw ?? "" : props.phase === "start" ? props.block.argsRaw : null;
  const output = props.phase === "result" ? maskCard(resultText(props.block)) || null : null;
  const state = props.phase === "preparing" ? "preparing" : props.phase === "start" ? "running" : props.block.error?.code === "interrupted" ? "stopped" : props.block.isError ? "error" : "ok";
  const summaryText = (0, import_react44.useMemo)(() => {
    if (state === "error" && output !== null) return firstLine2(output);
    const summary = toolSummary(toolName, parseArgs(argsRaw), done ? output ?? "" : null);
    if (summary === null) return "";
    const params = { ...summary.params };
    if (summary.scope !== void 0) params.scope = t(summary.scope.key, summary.scope.params);
    return maskCard(t(summary.key, params));
  }, [state, output, toolName, argsRaw, done, t]);
  const bodyRaw = argsRaw === "" ? null : argsRaw;
  const summaryClass = state === "error" ? "pm-tr-summary pm-tr-summary--error" : state === "stopped" ? "pm-tr-summary pm-tr-summary--stopped" : "pm-tr-summary";
  return /* @__PURE__ */ (0, import_jsx_runtime46.jsx)(
    RowView,
    {
      attrs: { "data-tool": toolName },
      state,
      title: hostT("tool.title.generic"),
      summary: summaryText,
      summaryClass,
      input: bodyRaw === null ? null : maskedBody(bodyRaw),
      output,
      isOutputError: state === "error",
      expanded,
      toggle,
      inspect,
      hostT
    }
  );
}
function RowView({ attrs, state, title, summary, summaryClass, input, output, isOutputError, expanded, toggle, inspect, hostT }) {
  const expandable = state !== "preparing" && (input !== null || output !== null);
  const open = expanded && expandable;
  const status = STATUS_KEY[state];
  const onKeyDown = (event) => {
    if (!expandable || event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggle();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime46.jsxs)("div", { className: "pm-tr", ...attrs, "data-state": state, children: [
    /* @__PURE__ */ (0, import_jsx_runtime46.jsx)("style", { children: memoryToolRowCss }),
    status !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime46.jsx)("span", { className: "pm-tr-sr", children: hostT(status) }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime46.jsxs)("div", { className: "pm-tr-disclosure", "data-open": open || void 0, children: [
      /* @__PURE__ */ (0, import_jsx_runtime46.jsxs)(
        "div",
        {
          className: "pm-tr-row",
          "data-expandable": expandable || void 0,
          role: expandable ? "button" : void 0,
          tabIndex: expandable ? 0 : void 0,
          "aria-expanded": expandable ? open : void 0,
          onClick: expandable ? toggle : void 0,
          onKeyDown: expandable ? onKeyDown : void 0,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime46.jsx)("span", { className: "pm-tr-leading", children: open ? /* @__PURE__ */ (0, import_jsx_runtime46.jsx)(Icon, { name: "chevronUp", size: 14 }) : expandable ? /* @__PURE__ */ (0, import_jsx_runtime46.jsxs)(import_jsx_runtime46.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime46.jsx)("span", { className: "pm-tr-icon-idle", children: /* @__PURE__ */ (0, import_jsx_runtime46.jsx)(Icon, { name: "sparkle" }) }),
              /* @__PURE__ */ (0, import_jsx_runtime46.jsx)(Icon, { name: "chevronDown", size: 14, className: "pm-tr-chevron-hover" })
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime46.jsx)(Icon, { name: "sparkle" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime46.jsxs)("span", { className: "pm-tr-content", children: [
              /* @__PURE__ */ (0, import_jsx_runtime46.jsx)("span", { className: "pm-tr-title", children: title }),
              summary !== "" ? /* @__PURE__ */ (0, import_jsx_runtime46.jsxs)(import_jsx_runtime46.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime46.jsx)("span", { className: "pm-tr-sep", "aria-hidden": "true" }),
                /* @__PURE__ */ (0, import_jsx_runtime46.jsx)("span", { className: summaryClass, title: summary, children: summary })
              ] }) : null
            ] })
          ]
        }
      ),
      open ? /* @__PURE__ */ (0, import_jsx_runtime46.jsxs)("div", { className: "pm-tr-body", children: [
        /* @__PURE__ */ (0, import_jsx_runtime46.jsxs)("div", { className: "pm-tr-io", children: [
          input !== null ? /* @__PURE__ */ (0, import_jsx_runtime46.jsxs)("div", { className: "pm-tr-io-section", children: [
            /* @__PURE__ */ (0, import_jsx_runtime46.jsx)("span", { className: "pm-tr-io-label", children: hostT("row.input") }),
            /* @__PURE__ */ (0, import_jsx_runtime46.jsx)("span", { className: "pm-tr-io-text", children: input })
          ] }) : null,
          input !== null && output !== null ? /* @__PURE__ */ (0, import_jsx_runtime46.jsx)("span", { className: "pm-tr-io-divider", "aria-hidden": "true" }) : null,
          output !== null ? /* @__PURE__ */ (0, import_jsx_runtime46.jsxs)("div", { className: "pm-tr-io-section", children: [
            /* @__PURE__ */ (0, import_jsx_runtime46.jsx)("span", { className: "pm-tr-io-label", children: hostT("row.output") }),
            /* @__PURE__ */ (0, import_jsx_runtime46.jsx)("span", { className: "pm-tr-io-text", "data-error": isOutputError || void 0, children: output })
          ] }) : null
        ] }),
        inspect !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime46.jsx)("button", { type: "button", className: "pm-tr-inspect", onClick: inspect, children: hostT("row.inspect") }) : null
      ] }) : null
    ] })
  ] });
}
var memoryToolRowCss = `
.pm-tr { display: flex; flex-direction: column; }
.pm-tr-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.pm-tr-disclosure { display: flex; flex-direction: column; width: 100%; min-width: 0; }
.pm-tr-row {
  position: relative; overflow: hidden; display: flex; align-items: center;
  height: calc(24px + var(--dsh-content-font-delta, 0px)); min-width: 0;
  color: var(--dsw-alias-label-tertiary); transition: color 100ms ease;
}
.pm-tr-row[data-expandable] { cursor: pointer; }
.pm-tr-row:hover { color: var(--dsw-alias-label-secondary); }
.pm-tr-leading {
  position: relative; flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: calc(16px + var(--dsh-content-font-delta, 0px)); height: calc(16px + var(--dsh-content-font-delta, 0px));
  margin-right: 6px; color: inherit;
}
.pm-tr-leading svg { width: calc(14px + var(--dsh-content-font-delta, 0px)); height: calc(14px + var(--dsh-content-font-delta, 0px)); }
.pm-tr-icon-idle { display: inline-flex; opacity: 1; transition: opacity 100ms ease; }
.pm-tr-chevron-hover { position: absolute; inset: 0; margin: auto; opacity: 0; transition: opacity 100ms ease; }
.pm-tr-row:hover .pm-tr-icon-idle { opacity: 0; }
.pm-tr-row:hover .pm-tr-chevron-hover { opacity: 1; }
.pm-tr-content { display: flex; align-items: center; min-width: 0; max-width: 100%; }
.pm-tr-title {
  flex: none; font-weight: 400; font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: calc(24px + var(--dsh-content-font-delta, 0px)); color: inherit;
}
.pm-tr-sep { flex: none; width: 2px; height: 2px; border-radius: 1px; margin: 0 8px; background: var(--dsw-alias-label-caption); }
.pm-tr-summary {
  flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: var(--dsh-content-font-size-secondary, 13px); line-height: calc(24px + var(--dsh-content-font-delta, 0px));
}
.pm-tr-summary--error { color: var(--dsw-alias-state-error-primary); }
.pm-tr-summary--stopped { color: var(--dsw-alias-state-warn-label); }
.pm-tr-body { display: flex; flex-direction: column; }
.pm-tr-io {
  display: flex; flex-direction: column; margin: 4px 0 4px 4px;
  border: 0.5px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-markdown-code-block); font: var(--dsw-font-markdown-code-block-small);
}
.pm-tr-io-section {
  display: grid; grid-template-columns: max-content 1fr; column-gap: 14px; align-items: baseline;
  padding: 12px 16px; max-height: 150px; overflow-y: auto;
}
.pm-tr-io-label { position: sticky; top: 0; align-self: start; color: var(--dsw-alias-label-caption); }
.pm-tr-io-divider { flex: none; height: 0.5px; background: var(--dsw-alias-border-l2); }
.pm-tr-io-text { min-width: 0; white-space: pre-wrap; word-break: break-word; color: var(--dsw-alias-label-secondary); }
.pm-tr-io-text[data-error] { color: var(--dsw-alias-state-error-primary); }
.pm-tr-inspect {
  display: inline-flex; align-self: flex-start; align-items: center; gap: 4px; margin: 4px 0 2px 4px; padding: 2px 8px;
  border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 999px; background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; line-height: 16px; cursor: pointer;
  opacity: 0; transition: opacity 100ms ease;
}
.pm-tr:hover .pm-tr-inspect, .pm-tr-inspect:focus-visible { opacity: 1; }
.pm-tr-inspect:hover { background: var(--dsw-alias-interactive-bg-hover-solid); color: var(--dsw-alias-label-primary); }
@media (prefers-reduced-motion: reduce) { .pm-tr-row { transition: none; } }
`;

// client/chat/MemoryCommandRow.tsx
var import_jsx_runtime47 = require("react/jsx-runtime");
var NOTE_KEYS = { awaiting: "chat.command.awaiting", elsewhere: "chat.command.elsewhere", busy: "chat.command.busy" };
function MemoryCommandRow({ node, hostT }) {
  const t = useT();
  const line = (0, import_react45.useMemo)(() => commandLine(node.args, node.outcome), [node.args, node.outcome]);
  const text = (0, import_react45.useMemo)(() => {
    const action = line.action === void 0 ? t("chat.command.unknown") : t(line.action.key, line.action.params);
    if (line.state === "error") {
      const reason = typeof line.reason === "string" ? line.reason : t(line.reason.key, line.reason.params);
      return reason === "" ? t("chat.command.failed.noReason", { action }) : t("chat.command.failed", { action, reason });
    }
    if (line.state === "running") return t("chat.command.running", { action });
    return line.note === void 0 ? action : t(NOTE_KEYS[line.note], { action });
  }, [line, t]);
  const [expanded, setExpanded] = (0, import_react45.useState)(false);
  const toggle = (0, import_react45.useCallback)(() => {
    setExpanded((value) => !value);
  }, []);
  const input = (0, import_react45.useMemo)(() => commandInput(node.args), [node.args]);
  const output = (0, import_react45.useMemo)(() => commandOutput(node.outcome), [node.outcome]);
  return /* @__PURE__ */ (0, import_jsx_runtime47.jsx)(
    RowView,
    {
      attrs: node.name === null ? {} : { "data-command": node.name },
      state: line.state,
      title: t("chat.command.title"),
      summary: maskCard(text),
      summaryClass: "pm-tr-summary",
      input,
      output,
      isOutputError: false,
      expanded,
      toggle,
      hostT
    }
  );
}

// client/chat/saved-turn.ts
var SAVED_TURN_KEY = "plastic-memory-saved";
var supersedesOf = (value) => Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === "string"))] : [];
var isEdit = (value) => {
  const e = value;
  return typeof e === "object" && e !== null && typeof e.oldString === "string" && typeof e.newString === "string" && (e.replaceAll === void 0 || typeof e.replaceAll === "boolean");
};
function editArgsOf(args) {
  if (args === void 0 || args.content !== void 0 || !Array.isArray(args.edits) || !args.edits.every(isEdit)) return void 0;
  const fields = {};
  if (typeof args.name === "string") fields.name = args.name;
  if (typeof args.type === "string") fields.type = args.type;
  if (typeof args.summary === "string") fields.summary = args.summary;
  if (Array.isArray(args.tags)) fields.tags = args.tags.filter((tag) => typeof tag === "string");
  return { edits: args.edits.map(({ oldString, newString, replaceAll }) => ({ oldString, newString, ...replaceAll === void 0 ? {} : { replaceAll } })), fields };
}
var turnOf = (event) => String(event.data.turn);
var savedTurnDefinition = {
  kind: SAVED_TURN_KEY,
  match(event) {
    if (event.type === "turn/start" || event.type === "tool/call") return { id: turnOf(event), role: event.type === "turn/start" ? "start" : "update" };
    if (event.type === "tool/result" && event.surfaceOp === "append") return { id: turnOf(event), role: "update" };
    return null;
  },
  start(_context, { event }) {
    return { turn: event.data.turn, calls: /* @__PURE__ */ new Map(), saved: [] };
  },
  update({ state }, { event }) {
    if (event.type === "tool/call") {
      const call = event.data;
      if (call.name !== "memory_save") return state;
      const calls = new Map(state.calls);
      calls.set(String(call.callId), call.arguments);
      return { ...state, calls };
    }
    if (event.type !== "tool/result") return state;
    const { message } = event.data;
    const argsRaw = state.calls.get(String(message.source.callId));
    if (argsRaw === void 0 || message.isError === true) return state;
    const text = message.content.map((b) => b.type === "text" ? b.text ?? "" : "").join("\n");
    const args = parseArgs(argsRaw);
    const memory = savedMemoryCard(args, text, event.time);
    if (memory === void 0) return state;
    const isUpdate = parseSaveResult(text)?.kind === "updated";
    const edit = isUpdate ? editArgsOf(args) : void 0;
    const supersedes = supersedesOf(args?.supersedes);
    return {
      ...state,
      saved: [...state.saved, {
        callId: String(message.source.callId),
        seq: event.seq,
        memory,
        ...isUpdate ? { isUpdate: true } : {},
        ...edit !== void 0 ? { edit } : {},
        ...supersedes.length > 0 ? { supersedes } : {}
      }]
    };
  },
  buildLocationData({ state }, scope, previous) {
    if (scope !== "turn" || state === void 0 || state.saved.length === 0) return null;
    const prev = previous;
    if (prev?.kind === "turn" && prev.turn === state.turn && prev.key === SAVED_TURN_KEY && prev.value?.saved === state.saved) {
      return prev;
    }
    return { kind: "turn", turn: state.turn, key: SAVED_TURN_KEY, value: { saved: state.saved } };
  }
};

// client/chat/index.tsx
var import_jsx_runtime48 = require("react/jsx-runtime");
var CHAT_CSS = slotCss("chat");
function createToolView(ctx) {
  return function MemoryToolView(props) {
    const t = useHostTranslate(ctx.locale, NS);
    const hostT = useHostTranslate(ctx.locale, "conversation");
    return /* @__PURE__ */ (0, import_jsx_runtime48.jsx)(TranslateProvider, { value: t, children: /* @__PURE__ */ (0, import_jsx_runtime48.jsx)(MemoryToolRow, { ...props, hostT }) });
  };
}
function createCommandView(ctx) {
  return function MemoryCommandView(props) {
    const t = useHostTranslate(ctx.locale, NS);
    const hostT = useHostTranslate(ctx.locale, "conversation");
    return /* @__PURE__ */ (0, import_jsx_runtime48.jsx)(TranslateProvider, { value: t, children: /* @__PURE__ */ (0, import_jsx_runtime48.jsx)(MemoryCommandRow, { node: props.node, hostT }) });
  };
}
function createTurnTail(ctx, nav, bind) {
  const openDetail = (target) => openMemoryPage(ctx, nav, target);
  return function MemoryTurnTail(props) {
    const source = props.turn.data.source(SAVED_TURN_KEY);
    const data = (0, import_react46.useSyncExternalStore)(source.subscribe, source.getSnapshot);
    const end = props.turn.end?.seq ?? props.seq;
    const saved = (0, import_react46.useMemo)(() => (data?.saved ?? []).filter((item) => item.seq <= end), [data, end]);
    const cwd = props.useSessions((s) => s.byId[props.sessionId]?.cwd);
    const gateway = (0, import_react46.useMemo)(() => bind(props), [props.useSessions, props.useResource]);
    const t = useHostTranslate(ctx.locale, NS);
    if (saved.length === 0) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime48.jsx)(PanelShell, { gateway, t, extraCss: CHAT_CSS, children: /* @__PURE__ */ (0, import_jsx_runtime48.jsx)(SavedMemoriesCard, { sessionId: props.sessionId, cwd, saved, now: Date.now(), openDetail }) });
  };
}
function registerChatCards(ctx, nav, bind) {
  const ToolView = createToolView(ctx);
  ctx.slots.inject("tool.call.toolview", () => {
    const disposers = MEMORY_TOOLS.map((key) => ctx.slots.register({ name: "tool.call.toolview", key }, ToolView));
    return () => {
      for (const dispose of disposers) dispose();
    };
  });
  const CommandView = createCommandView(ctx);
  ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({ name: "conversation.chat.commandview", key: MEMORY_COMMAND_NAME }, CommandView));
  ctx.inject(["uiConversation"], (child) => {
    const chat = child;
    chat.uiConversation.events.register(savedTurnDefinition);
    const TurnTail = createTurnTail(chat, nav, bind);
    chat.slots.inject("conversation.chat.turnTail", () => chat.slots.register(
      { name: "conversation.chat.turnTail", id: "plastic-memory-saved", order: 30 },
      TurnTail
    ));
  });
}

// client/NavIcon.tsx
var import_jsx_runtime49 = require("react/jsx-runtime");
function NavIcon({ size }) {
  const gateway = useGateway();
  const pending = gateway.useView(gateway.useSession(void 0), "pending");
  const dot = pending.status === "ready" ? pending.data.dot : "none";
  const marker = dot === "red" ? "secret" : dot === "amber" ? "pending" : void 0;
  return /* @__PURE__ */ (0, import_jsx_runtime49.jsx)(MemoryIcon, { size, marker });
}

// client/sidebar/register.tsx
var import_react47 = require("react");
var import_jsx_runtime50 = require("react/jsx-runtime");
var SIDEBAR_CSS = slotCss("sidebar");
function GuideIcon({ size }) {
  return /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(MemoryIcon, { size: size ?? 22 });
}
function openMemoryTab(ctx) {
  ctx.sidebarRight.openTab(SIDEBAR_TAB_KIND);
}
function registerSidebarTab(ctx, nav, bind, useTranslate) {
  const t = ctx.locale.bind(NS);
  ctx.effect(() => {
    nav.provide("sidebarTab", () => {
      openMemoryTab(ctx);
    });
    return () => {
      nav.provide("sidebarTab", void 0);
    };
  }, "plastic-memory: sidebar tab exit");
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: SIDEBAR_TAB_ID,
    kind: SIDEBAR_TAB_KIND,
    title: () => t("sidebar.tab.title"),
    guide: [{
      id: "memory",
      order: 40,
      title: () => t("sidebar.guide.title"),
      description: () => t("sidebar.guide.description"),
      icon: GuideIcon
    }]
  }), "plastic-memory: sidebar tab type");
  function MemorySidebarTab(props) {
    const gateway = (0, import_react47.useMemo)(() => bind(props), [props.useSessions, props.useResource]);
    const translate = useTranslate();
    const cwd = props.useSessions((s) => s.byId[props.sessionId]?.cwd);
    return /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(PanelShell, { gateway, t: translate, className: "pm-side-root", extraCss: SIDEBAR_CSS, children: /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
      SidebarTab,
      {
        sessionId: props.sessionId,
        workspacePath: cwd,
        openPage: (target) => {
          openMemoryPage(ctx, nav, target);
        }
      }
    ) });
  }
  function MemorySidebarTitle() {
    const translate = useTranslate();
    return /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)(import_jsx_runtime50.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(MemoryIcon, { size: 16 }),
      translate("sidebar.tab.title")
    ] });
  }
  ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({ name: "sidebar.right.pane.tab", key: SIDEBAR_TAB_ID }, MemorySidebarTab));
  ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({ name: "sidebar.right.pane.tab.title", key: SIDEBAR_TAB_ID }, MemorySidebarTitle));
}

// client/settings/index.tsx
var import_react48 = require("react");
var import_jsx_runtime51 = require("react/jsx-runtime");
var SETTINGS_CSS = slotCss("settings");
function createSettingsCard(ctx, configForms, nav, bind, useTranslate) {
  return function PlasticMemorySettings(props) {
    const gateway = (0, import_react48.useMemo)(() => bind(props), [props.useSessions, props.useResource]);
    const form = (0, import_react48.useMemo)(() => configForms.get(ENTRY_ID), []);
    const t = useTranslate();
    if (props.view !== "page") return null;
    return /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(PanelShell, { gateway, t, extraCss: SETTINGS_CSS, children: /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(SettingsPage, { form, onOpenMemoryPage: (target) => {
      openMemoryPage(ctx, nav, target);
    } }) });
  };
}
function applySettings(ctx, nav, bind, useTranslate) {
  ctx.inject(["configForms"], (scope) => {
    const Card2 = createSettingsCard(ctx, scope.configForms, nav, bind, useTranslate);
    scope.slots.inject("plugins.bundle.config", () => scope.slots.register({ name: "plugins.bundle.config", key: PACKAGE_NAME }, Card2));
  });
}

// client/index.tsx
var import_jsx_runtime52 = require("react/jsx-runtime");
var PAGE_CSS = slotCss("page");
var inject = ["slots", "locale", "layout", "remote", "remote.commands", "remote.workspaceFiles", "remote.session"];
function createMainPanel(ctx, nav, bind) {
  return function MemoryMainPanel(props) {
    const gateway = (0, import_react49.useMemo)(() => bind(props), [props.useSessions, props.useResource]);
    const t = useHostTranslate(ctx.locale, NS);
    return /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(PanelShell, { gateway, t, className: "pm-root--page", extraCss: PAGE_CSS, children: /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(MemoryPage, { nav }) });
  };
}
function createNavIcon(bind) {
  return function MemoryNavIcon(props) {
    const gateway = (0, import_react49.useMemo)(() => bind(props), [props.useSessions, props.useResource]);
    return /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(GatewayProvider, { value: gateway, children: /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(NavIcon, { size: props.size, active: props.active }) });
  };
}
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "plastic-memory: dictionaries");
  const t = ctx.locale.bind(NS);
  const nav = createNavStore();
  ctx.inject(["pluginNavigation"], (scope) => {
    scope.effect(() => {
      nav.provide("settings", () => {
        scope.pluginNavigation.openBundle(PACKAGE_NAME);
      });
      return () => {
        nav.provide("settings", void 0);
      };
    }, "plastic-memory: settings exit");
  });
  const bind = createHostGateway(ctx);
  const MainPanel = createMainPanel(ctx, nav, bind);
  ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: PANEL_ID }, MainPanel));
  ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
    name: "sidebar.panellist",
    id: PANEL_ID,
    order: 20,
    label: () => t("nav.label")
  }, createNavIcon(bind)));
  const Dock = createComposerDock(ctx, nav, bind, () => useHostTranslate(ctx.locale, NS));
  ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({ name: "conversation.composer.dock", id: DOCK_ID, order: DOCK_ORDER }, Dock));
  registerChatCards(ctx, nav, bind);
  ctx.inject(["sidebarRightTabs", "sidebarRight"], (scope) => {
    registerSidebarTab(scope, nav, bind, () => useHostTranslate(ctx.locale, NS));
  });
  applySettings(ctx, nav, bind, () => useHostTranslate(ctx.locale, NS));
}
    return module.exports;
  }
});
