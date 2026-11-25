// register.js —— 工具注册：把工具定义变成宿主的 spec。
//
// 照旧插件的写法（宿主 tools.register() 强校验 output{schema,render}，
// 少了这一层整条注册被拒）。
//
// 【核心工具只给白名单会话】
//   改自己的核心这件事，只有她的会话该有。别的会话（工作会话）不给，
//   免得那边也去改她自己的东西。

import { TOOLS } from './tools.js'
// 参数→schema 的实现在 src/tools.js（上一级），两个 tools.js 别混了
import { paramsToSchema } from '../tools.js'

/**
 * 注册一个工具。
 *
 * @param {object} registrar 宿主的工具服务
 * @param {object} tool       工具定义 {name, description, params, run, render}
 * @param {object} opts
 * @param {string} opts.dataDir      核心文件所在目录
 * @param {Function} opts.isAllowed  这个会话在不在白名单
 */
export function registerTool(registrar, tool, { dataDir, isAllowed = () => true, getMemeDir = () => '' } = {}) {
  // 参数可以写简写 'string'，也可以写 { type, description, required, enum, items }。
  // 两种写法、两处注册都交给同一个 paramsToSchema，别再各写一份。
  const schema = paramsToSchema(tool.params)

  // 宿主强校验 output{schema,render}。返回结构是动态的，
  // schema 用宽松 additionalProperties，免得返回值被判不合法。
  const output = {
    schema: { type: 'object', additionalProperties: true },
    render: (_args, value) => [{ type: 'text', text: tool.render(value) }],
  }

  const spec = {
    name: tool.name,
    description: tool.description,
    parameters: schema,
    output,
    async execute(args, exec) {
      try {
        // 官方给的第二参数 exec：exec.agent 就是当前会话
        const sid = String(exec?.agent?.session?.id ?? exec?.agent?.session?.header?.id ?? '')
        // 核心只给白名单会话：改自己的东西，别的工作会话用不着
        if (!isAllowed(sid)) {
          return { ok: false, reason: '这个会话不要使用此工具。' }
        }
        // 有的工具要多一份自己的目录（比如表情清单），由定义里的 needs 声明
        const extra = tool.needs === 'meme' ? { memeDir: String(getMemeDir?.() ?? '') } : {}
        return tool.run(dataDir, args ?? {}, extra)
      } catch (error) {
        return { ok: false, reason: String(error?.message ?? error) }
      }
    },
  }

  // 新宿主只有 register()（强校验 output）；旧宿主是 registerTool/define。
  // 顺序很关键：先认 register，否则 register 不在时才会掉到旧接口。
  if (typeof registrar.register === 'function') registrar.register(spec)
  else if (typeof registrar.registerTool === 'function') registrar.registerTool(spec)
  else if (typeof registrar.define === 'function') registrar.define(spec)
  else if (typeof registrar === 'function') registrar(spec)
  else throw new Error('认不出宿主的工具注册接口')
}

/** 注册全部工具。 */
export function registerTools(registrar, opts = {}) {
  for (const tool of (opts.tools ?? TOOLS)) {
    registerTool(registrar, tool, opts)
  }
}
