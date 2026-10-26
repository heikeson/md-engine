/**
 * @file 尖括号块的 mdast 双向扩展
 * @description 把词法层产出的 `jsxBlock` token 转成 mdast 节点（fromMarkdown），
 *   以及把节点序列化回 `<Name attr="v">` 文本（toMarkdown）。两侧必须对称：
 *   `md → mdast → md` 要逐字一致。
 * @created 2026-10-24 20:16
 * @updated 2026-10-24 20:16
 */

import type { Data, Parent, RootContent } from "mdast";
// 副作用导入：注册 jsxBlock 节点类型（dts 构建必须能沿依赖图找到它）
import "./jsx-types";
import type { CompileContext, Extension as FromMarkdownExtension, Token } from "mdast-util-from-markdown";
import type { Handle, Options as ToMarkdownExtension, State } from "mdast-util-to-markdown";

/** 尖括号块节点 */
export interface JsxBlock extends Parent {
  type: "jsxBlock";
  /** 组件名（首字母大写） */
  name: string;
  /** 属性表：字符串或布尔（true 表示无值写法） */
  attributes: Record<string, string | boolean>;
  /** 是否为自闭合叶子（`<Image />`） */
  selfClosing: boolean;
  children: RootContent[];
  /** closed=false 表示未闭合到文件末尾（由 policy 决定是否降级） */
  data?: Data & { closed?: boolean };
}

/** 开标签解析结果 */
interface OpenTag {
  name: string;
  attributes: Record<string, string | boolean>;
  selfClosing: boolean;
}

const OPEN_TAG_RE = /^<([A-Za-z][\w]*)([\s\S]*?)(\/?)>$/;
const ATTR_RE = /([A-Za-z_][\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;

/**
 * 解析开标签原文为名字、属性与自闭合标记
 * @param raw 开标签原文，如 `<Card title="A" href="/x">`
 * @returns 解析结果；格式异常时 name 为空串
 */
export function parseOpenTag(raw: string): OpenTag {
  const match = OPEN_TAG_RE.exec(raw.trim());
  if (!match) return { name: "", attributes: {}, selfClosing: false };
  const attributes: Record<string, string | boolean> = {};
  const rest = match[2] ?? "";
  ATTR_RE.lastIndex = 0;
  let item: RegExpExecArray | null;
  while ((item = ATTR_RE.exec(rest)) !== null) {
    const key = item[1];
    if (!key) continue;
    const value = item[2] ?? item[3];
    attributes[key] = value === undefined ? true : value;
  }
  return { name: match[1], attributes, selfClosing: match[3] === "/" };
}

/**
 * 生成 fromMarkdown 扩展
 * @returns 供 mdast-util-from-markdown 使用的扩展
 */
export function jsxFromMarkdown(): FromMarkdownExtension {
  return {
    enter: {
      jsxBlock: enterBlock,
    },
    exit: {
      jsxBlockOpenTag: exitOpenTag,
      jsxBlock: exitBlock,
    },
  };
}

/**
 * 生成 toMarkdown 扩展
 * @returns 供 mdast-util-to-markdown 使用的扩展
 */
export function jsxToMarkdown(): ToMarkdownExtension {
  return {
    handlers: {
      jsxBlock: handleJsxBlock as unknown as Handle,
    },
  };
}

/**
 * 进入块节点
 * @param this 编译上下文
 * @param token jsxBlock token
 */
function enterBlock(this: CompileContext, token: Token): void {
  const node: JsxBlock = {
    type: "jsxBlock",
    name: "",
    attributes: {},
    selfClosing: false,
    children: [],
  };
  this.enter(node, token);
}

/**
 * 退出开标签：写入名字、属性与自闭合标记
 * @param this 编译上下文
 * @param token jsxBlockOpenTag token
 */
function exitOpenTag(this: CompileContext, token: Token): void {
  const node = this.stack[this.stack.length - 1] as unknown as JsxBlock;
  const parsed = parseOpenTag(this.sliceSerialize(token));
  node.name = parsed.name;
  node.attributes = parsed.attributes;
  node.selfClosing = parsed.selfClosing;
  // 默认按已闭合处理；只有 tokenizer 判定未闭合时才由 exitUnclosed 改回 false
  node.data = { closed: true };
}

/**
 * 未闭合判定已移至 `policy.collectUnclosed`：直接比对块的原文区间是否以 `</Name>` 结尾。
 * @description 原实现在 `exit(jsxBlockCloseTag)` 里标记 `closed`，但嵌套时 token 栈顶
 *   可能是外层节点（内层 `</Folder>` 打到了外层），导致内层永远被判未闭合。
 */

/**
 * 退出块节点
 * @param this 编译上下文
 * @param token jsxBlock token
 */
function exitBlock(this: CompileContext, token: Token): void {
  this.exit(token);
}

/**
 * 属性序列化
 * @param attributes 属性表
 * @returns 形如 ` title="A" href="/x" default` 的字符串（无属性时为空串）
 */
function serializeAttributes(attributes: Record<string, string | boolean>): string {
  return Object.entries(attributes)
    .map(([key, value]) => {
      if (value === true) return ` ${key}`;
      return ` ${key}="${String(value).replace(/"/g, "&quot;")}"`;
    })
    .join("");
}

/**
 * 序列化 jsxBlock 节点
 * @param node 节点
 * @param _parent 父节点
 * @param state 序列化状态
 * @param info 序列化信息
 * @returns Markdown 文本
 */
function handleJsxBlock(
  node: JsxBlock,
  _parent: unknown,
  state: State,
  info: unknown,
): string {
  const attrs = serializeAttributes(node.attributes ?? {});
  if (node.selfClosing) return `<${node.name}${attrs} />`;
  const inner = state.containerFlow(node, info as never);
  // 原文未闭合时不补闭合标签：内容原样保留，不在保存时"顺手修好"用户内容
  if (node.data?.closed === false) return `<${node.name}${attrs}>\n\n${inner}`;
  return `<${node.name}${attrs}>\n\n${inner}\n\n</${node.name}>`;
}
