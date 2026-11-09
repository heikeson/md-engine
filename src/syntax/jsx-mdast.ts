/**
 * @file 尖括号块的 mdast 双向扩展
 * @description 把词法层产出的 `jsxBlock` token 转成 mdast 节点（fromMarkdown），
 *   以及把节点序列化回 `<Name attr="v">` 文本（toMarkdown）。两侧必须对称：
 *   `md → mdast → md` 要逐字一致。
 * @created 2026-10-24 20:16
 * @updated 2026-10-28 11:40 序列化改为保形：按原文行距写回换行/空行，不再统一加空行；行内形态由 data.inline 决定
 * @updated 2026-11-01 21:10 rawBody 容器（Mermaid）：exitBlock 用 token 原文切片覆盖子节点，序列化逐字回写
 * @updated 2026-11-09 13:40 空行改为按原文行距逐行写回（原实现固定最多一个空行，既加也删）；
 *   新增 join：容器块与兄弟节点之间不再被库默认规则插入空行
 */

import type { Data, Parent, RootContent } from "mdast";
// 副作用导入：注册 jsxBlock 节点类型（dts 构建必须能沿依赖图找到它）
import "./jsx-types";
import { COMPONENTS } from "../registry";
import type { CompileContext, Extension as FromMarkdownExtension, Token } from "mdast-util-from-markdown";
import type { Handle, Join, Options as ToMarkdownExtension, State } from "mdast-util-to-markdown";

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
  /**
   * closed=false 表示未闭合到文件末尾（由 policy 决定是否降级）；
   * degraded=true 表示嵌套超限被降级：渲染与块索引按源码块，序列化原样输出 `degradedText`
   */
  data?: Data & {
    closed?: boolean;
    inline?: boolean;
    degraded?: boolean;
    degradedText?: string;
    /** rawBody 容器的容器体原文（不按 Markdown 解析，序列化时逐字回写） */
    rawBody?: string;
    /** 图表源码超出体积上限：渲染层据此只出源码块，不加载图表引擎 */
    mermaidTooLarge?: boolean;
  };
}

/** 开标签解析结果 */
interface OpenTag {
  name: string;
  attributes: Record<string, string | boolean>;
  selfClosing: boolean;
}

const OPEN_TAG_RE = /^<([A-Za-z][\w]*)([\s\S]*?)(\/?)>$/;
const ATTR_RE = /([A-Za-z_][\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;

/** 整串匹配的闭标签：`</Name>`（行内收拢用它判定节点是不是闭标签） */
export const CLOSE_TAG_RE = /^<\/([A-Za-z][\w]*)\s*>$/;

/** 闭标签正则缓存：按「位置 + 名字」缓存，避免每个块都重新编译 */
const CLOSE_TAG_CACHE = new Map<string, RegExp>();

/** 闭标签的匹配位置 */
export type CloseTagWhere =
  /** 区间内任意处 */
  | "any"
  /** 以它结尾（`</Name>` 后只允许空白） */
  | "end"
  /** 紧跟其后（前面只允许空白） */
  | "start";

/**
 * 转义正则元字符
 * @param value 原始字符串
 * @returns 可安全嵌入正则的字符串
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 取匹配 `</Name>` 的正则（按名字缓存）
 * @param name 组件名
 * @param where 匹配位置，默认区间内任意处
 * @returns 无 `g` 标志的正则（可安全重复 `test` / `exec`）
 * @description 序列化的「结尾闭标签」与策略层的「区间内闭合判定」共用同一份模式，
 *   避免两处对空白的容忍度不一致。
 */
export function closeTagRe(name: string, where: CloseTagWhere = "any"): RegExp {
  const key = `${where}:${name}`;
  const cached = CLOSE_TAG_CACHE.get(key);
  if (cached) return cached;
  const escaped = escapeRegExp(name);
  const pattern =
    where === "end"
      ? `</${escaped}\\s*>\\s*$`
      : where === "start"
        ? `^\\s*</${escaped}\\s*>`
        : `</${escaped}\\s*>`;
  const created = new RegExp(pattern);
  CLOSE_TAG_CACHE.set(key, created);
  return created;
}

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
    // 容器块与兄弟节点之间按原文行距连接，不替用户补空行
    join: [joinJsxBlocks as unknown as Join],
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
 * 找开标签的结束 `>`（跳过引号内的 `>`，属性值里可能出现）
 * @param raw 块原文
 * @returns `>` 的下标；找不到返回 -1
 */
function openTagEnd(raw: string): number {
  let quote = "";
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (quote) {
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ">") return i;
  }
  return -1;
}

/**
 * 从块原文中切出容器体（原始文本）
 * @param raw 块原文（含开闭标签）
 * @param name 组件名
 * @param selfClosing 是否自闭合写法
 * @returns 容器体原文；自闭合或无开标签时返回空串
 * @description 只认**结尾处**的 `</Name>`：源码体内行内出现的同名闭合字面量不参与截断，
 *   否则 mermaid 文本里的 `</Mermaid>` 字样会把图表截短。
 */
export function sliceRawBody(raw: string, name: string, selfClosing: boolean): string {
  if (selfClosing) return "";
  const openEnd = openTagEnd(raw);
  if (openEnd < 0) return "";
  const bodyStart = openEnd + 1;
  const close = closeTagRe(name, "end").exec(raw);
  if (!close) return raw.slice(bodyStart);
  return raw.slice(bodyStart, close.index);
}

/**
 * 退出块节点
 * @param this 编译上下文
 * @param token jsxBlock token
 * @description rawBody 容器（如 Mermaid）在此时丢弃已按 Markdown 解析出来的子节点，
 *   改用 token 原文切片重建 `data.rawBody`。容器体在词法阶段已作为子文档被消费，
 *   这是改动面最小、且不影响其他容器行为的落点（方案 2.4 路线 B）。
 */
function exitBlock(this: CompileContext, token: Token): void {
  const node = this.stack[this.stack.length - 1] as unknown as JsxBlock;
  if (node && COMPONENTS[node.name]?.rawBody) {
    node.children = [];
    const rawBody = sliceRawBody(this.sliceSerialize(token), node.name, node.selfClosing);
    node.data = { ...(node.data ?? {}), rawBody };
  }
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
 * 取两行之间应写回的换行符
 * @param prevLine 上一段结束行（1 起）
 * @param nextLine 下一段开始行（1 起）
 * @returns 与原文行距等量的换行符；无位置信息时给一个空行兜底
 * @description 原文隔几行就写回几行：不加、不删、不合并。
 *   无位置信息（宿主手工构造的节点）回退为规范形态，保证输出可读。
 */
function lineBreaks(prevLine?: number, nextLine?: number): string {
  if (typeof prevLine !== "number" || typeof nextLine !== "number") return "\n\n";
  return "\n".repeat(Math.max(1, nextLine - prevLine));
}

/**
 * 序列化 jsxBlock 节点（保形）
 * @param node 节点
 * @param _parent 父节点
 * @param state 序列化状态
 * @param info 序列化信息
 * @returns Markdown 文本
 * @description 三种形态都按原文还原，不增删空行：
 *   行内（`data.inline`）→ `<X>内容</X>`；块形态 → 按子节点与标签的行距逐行写回（隔几行写几行）。
 *   引擎不做排版整理：用户写了几行空行就写回几行，不加也不删。
 */
function handleJsxBlock(
  node: JsxBlock,
  _parent: unknown,
  state: State,
  info: unknown,
): string {
  const attrs = serializeAttributes(node.attributes ?? {});
  const open = `<${node.name}${attrs}>`;
  // 超限降级：原样吐回原文，不重新拼装、不做转义（降级是显示口径，不是改写用户内容）
  if (node.data?.degraded && typeof node.data.degradedText === "string") return node.data.degradedText;
  if (node.selfClosing) return `<${node.name}${attrs} />`;
  // rawBody 容器：开标签按属性重建，容器体逐字回写（不转义、不重排、不增删空行），
  // 原文未闭合时不补闭合标签——与普通容器的保形口径一致
  if (typeof node.data?.rawBody === "string") {
    const closing = node.data.closed === false ? "" : `</${node.name}>`;
    return `${open}${node.data.rawBody}${closing}`;
  }

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

  // 块形态：自己拼子节点，才能按原文行距写回换行（containerFlow 固定用空行连接）
  const tracker = state.createTracker(info as never);
  let body = "";
  let prevEnd = node.position?.start.line;
  for (const child of children) {
    const gap = lineBreaks(prevEnd, child.position?.start.line);
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
  return `${open}${body}${lineBreaks(prevEnd, node.position?.end.line)}</${node.name}>`;
}

/**
 * 容器块与相邻块的连接符（join）
 * @param left 左侧节点
 * @param right 右侧节点
 * @returns 需要的空行数（0 表示只换行）；不归本函数管时返回 undefined
 * @description `mdast-util-to-markdown` 默认用空行连接 flow 子节点，会把原文紧贴的组件撑开。
 *   这里只接管「有容器块参与」的一对节点：原文隔几行就写回几行，不加不删；
 *   其余组合（表格、围栏等构造本身需要空行）仍走库的默认规则，避免产出解析不回来的写法。
 */
function joinJsxBlocks(left: RootContent, right: RootContent): number | undefined {
  if (left.type !== "jsxBlock" && right.type !== "jsxBlock") return undefined;
  const endLine = left.position?.end.line;
  const startLine = right.position?.start.line;
  if (typeof endLine !== "number" || typeof startLine !== "number") return undefined;
  return Math.max(0, startLine - endLine - 1);
}
