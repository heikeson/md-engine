/**
 * @file 尖括号块的 mdast 双向扩展
 * @description 把词法层产出的 `jsxBlock` token 转成 mdast 节点（fromMarkdown），
 *   以及把节点序列化回 `<Name attr="v">` 文本（toMarkdown）。两侧必须对称：
 *   `md → mdast → md` 要逐字一致。
 * @created 2026-10-24 20:16
 * @updated 2026-10-28 11:40 序列化改为保形：按原文行距写回换行/空行，不再统一加空行；行内形态由 data.inline 决定
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
  data?: Data & { closed?: boolean; inline?: boolean };
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
 * 是否为行内形态（原写法是单行 `<X a="b">内容</X>`）
 * @param node 尖括号块节点
 * @returns 行内形态返回 true
 */
export function isInlineLayout(node: JsxBlock): boolean {
  return node.data?.inline === true;
}

/**
 * 两行之间是否需要空行
 * @param prevLine 上一段结束行（1 起）
 * @param nextLine 下一段开始行（1 起）
 * @returns 行距大于 1（中间有空行）或无位置信息时返回 true
 * @description 无位置信息（宿主手工构造的节点）回退为规范形态，保证输出可读。
 */
function needsBlankLine(prevLine?: number, nextLine?: number): boolean {
  if (typeof prevLine !== "number" || typeof nextLine !== "number") return true;
  return nextLine - prevLine > 1;
}

/**
 * 序列化 jsxBlock 节点（保形）
 * @param node 节点
 * @param _parent 父节点
 * @param state 序列化状态
 * @param info 序列化信息
 * @returns Markdown 文本
 * @description 三种形态都按原文还原，不凭空增删空行：
 *   行内（`data.inline`）→ `<X>内容</X>`；块形态 → 按子节点与标签的行距决定 `\n` 还是 `\n\n`。
 *   需要统一成规范排版时用 `normalizeMarkdown`，不要在这里替用户决定。
 */
function handleJsxBlock(
  node: JsxBlock,
  _parent: unknown,
  state: State,
  info: unknown,
): string {
  const attrs = serializeAttributes(node.attributes ?? {});
  const open = `<${node.name}${attrs}>`;
  if (node.selfClosing) return `<${node.name}${attrs} />`;

  const children = node.children ?? [];
  // 空容器：开闭标签必须各占一行，写成 `<X></X>` 会退回行内 html（flow 构造要求开标签后换行）
  if (children.length === 0) {
    const position = node.position;
    const sameLine = position ? position.start.line === position.end.line : false;
    return sameLine ? `${open}</${node.name}>` : `${open}\n</${node.name}>`;
  }

  // 行内形态：内容与标签同一行，正文按行内序列化（before/after 说明正文夹在 `>` 与 `<` 之间，
  // 否则序列化器会以为在行首而加上 `\#`、`1\.` 这类多余转义）
  if (isInlineLayout(node)) {
    const flat = children.flatMap((child) => (child.type === "paragraph" ? child.children : [child]));
    if (flat.length === 0) return `${open}</${node.name}>`;
    const body = state.containerPhrasing(
      { type: "paragraph", children: flat } as never,
      { ...(info as Record<string, unknown>), before: ">", after: "<" } as never,
    );
    return `${open}${body}</${node.name}>`;
  }

  // 块形态：自己拼子节点，才能按原文行距决定空行（containerFlow 固定用空行连接）
  const tracker = state.createTracker(info as never);
  let body = "";
  let prevEnd = node.position?.start.line;
  for (const child of children) {
    const gap = needsBlankLine(prevEnd, child.position?.start.line) ? "\n\n" : "\n";
    const piece = state.handle(child, node, state, {
      before: "\n",
      after: "\n",
      ...tracker.current(),
    } as never);
    body += gap + tracker.move(piece);
    prevEnd = child.position?.end.line;
  }

  // 原文未闭合时不补闭合标签：内容原样保留，不在保存时"顺手修好"用户内容
  if (node.data?.closed === false) return `${open}${body}`;
  const closeGap = needsBlankLine(prevEnd, node.position?.end.line) ? "\n\n" : "\n";
  return `${open}${body}${closeGap}</${node.name}>`;
}
