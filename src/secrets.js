// secrets.js —— 密钥嗅探（思想抄 plastic-memory，精简到 30 行）。
//
// 写入 mem_write 前过一遍：
//   · 明确的密钥（sk-、AKIA、Bearer 头、私钥块）→ 一律拒存
//   · 疑似（长随机串 + 密钥类字样）→ 返回 needsConfirm，调用方问过主人再 force

const HARD_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,                          // OpenAI / siliconflow 风格
  /\bAKIA[0-9A-Z]{16}\b/,                               // AWS
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,                 // 私钥块
  /\bBearer\s+[A-Za-z0-9._-]{20,}\b/i,                   // Bearer 头
  /\bxox[bp]-[A-Za-z0-9-]{10,}\b/,                      // Slack
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,                     // GitHub
]

const SOFT_HINTS = /(api[-_ ]?key|token|secret|password|密钥|口令)/i
const LONG_RANDOM = /^[A-Za-z0-9_-]{24,}$//**
 * @returns {{verdict:'clean'|'hard'|'soft'}}
 *   clean 直接放行；hard 一律拒；soft 要主人确认后带 force 重发。
 */
export function sniffSecret(text) {
  const t = String(text ?? '')
  for (const re of HARD_PATTERNS) {
    if (re.test(t)) return { verdict: 'hard' }
  }
  // 疑似：「密钥类字样 + 一段长随机」出现在同一条里
  if (SOFT_HINTS.test(t)) {
    for (const token of t.split(/[\s,，;；"'`（）()【】\[\]<>《》：:＝=是为]+/)) {
      if (LONG_RANDOM.test(token)) return { verdict: 'soft' }
    }
  }
  return { verdict: 'clean' }
}
