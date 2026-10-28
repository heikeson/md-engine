/**
 * @file 行内子项的收拢（mdast 层）
 * @description 词法层的 flow 构造只在「整行就是标签」时触发，`<Tab value="a">A</Tab>` 这种
 *   标签与内容同行的写法会退化成一串 inline html，父容器按 `Children.toArray` 取子项时
 *   读不到任何 props（表现为 label 为空、多个子项合并成一个）。本模块在 mdast 层把
 *   「开标签 + 内容 + 闭标签」的段落序列还原成 `jsxBlock`（data.inline 标记），
 *   渲染与序列化都按原写法处理，避免"看着能写、存下来就散了"。
 * @created 2026-10-28 03:40
 * @updated 2026-10-28 03:40
 */

import type { Paragraph, Root, RootContent, Text } from "mdast";
import type { Processor } from "unified";
import { COMPONENTS } from "../registry";
import { parseOpenTag, type JsxBlock } from "./jsx-mdast";

/** 行内开标签：`<Name ...>` 或 `<Name ... />` */
const OPEN_TAG_RE = /^<([A-Za-z][\w]*)([^>]*?)(\/?)>$/;
/** 行内闭标签：`</Name>` */
const CLOSE_TAG_RE = /^<\/([A-Za-z][\w]*)\s*>$/;

/**
 * 取容器声明的子项名列表
 * @param name 容器名
 * @returns 子项名数组；不是带子项的容器时返回空数组
 */
function itemsOf(name: string): readonly string[] {
  const items = COMPONENTS[name]?.items;
  if (!items) return [];
  return typeof items === "string" ? [items] : items;
}

/** 是否为纯空白文本节点（行内子项之间的换行/空格） */
function isBlank(node: RootContent): boolean {
  return node.type === "text" && !String((node as Text).value).trim();
}

/**
 * 用开标签与闭标签节点拼出覆盖两端的 position
 * @param open 开标签节点
 * @param close 闭标签节点（自闭合时与 open 相同）
 * @returns 合并后的 position；任一缺失时返回 undefined
 */
function spanPosition(open: RootContent, close: RootContent): NonNullable<RootContent["position"]> | undefined {
  const start = open.position?.start;
  const end = close.position?.end;
  if (!start || !end) return undefined;
  return { start, end };
}

/**
 * 生成行内子项节点
 * @param name 子项名
 * @param raw 开标签原文
 * @param selfClosing 是否自闭合
 * @param children 子节点（行内子项为单个 paragraph）
 * @param open 开标签节点
 * @param close 闭标签节点
 * @returns jsxBlock 节点
 */
function makeInlineItem(
  name: string,
  raw: string,
  selfClosing: boolean,
  children: RootContent[],
  open: RootContent,
  close: RootContent,
): JsxBlock {
  const { attributes } = parseOpenTag(raw);
  const node: JsxBlock = {
    type: "jsxBlock",
    name,
    attributes,
    selfClosing,
    children,
    data: { closed: true, inline: true },
  };
  const position = spanPosition(open, close);
  if (position) node.position = position;
  return node;
}

/**
 * 收拢单个段落里的行内子项
 * @param paragraph 段落
 * @param allowed 允许的子项名（由父容器声明决定）
 * @returns 收拢后的节点序列；段落内没有可收拢的子项时返回 null
 */
function foldParagraph(paragraph: Paragraph, allowed: readonly string[]): RootContent[] | null {
  const nodes = paragraph.children;
  const out: RootContent[] = [];
  let index = 0;
  let converted = false;

  while (index < nodes.length) {
    const node = nodes[index] as RootContent;
    if (node.type !== "html") {
      out.push(node);
      index += 1;
      continue;
    }
    const raw = String(node.value).trim();
    const open = OPEN_TAG_RE.exec(raw);
    if (!open || !allowed.includes(open[1])) {
      out.push(node);
      index += 1;
      continue;
    }
    const name = open[1];
    // 自闭合子项（`<Card … />`、`<File … />`）
    if (open[3] === "/") {
      out.push(makeInlineItem(name, raw, true, [], node, node));
      converted = true;
      index += 1;
      continue;
    }
    // 非自闭合：在同一段落里找同名闭标签
    let closeIndex = -1;
    for (let probe = index + 1; probe < nodes.length; probe += 1) {
      const candidate = nodes[probe] as RootContent;
      if (candidate.type !== "html") continue;
      const close = CLOSE_TAG_RE.exec(String(candidate.value).trim());
      if (close && close[1] === name) {
        closeIndex = probe;
        break;
      }
    }
    // 未闭合：保持原样，交给 policy 产 UNCLOSED_TAG，不在这里猜
    if (closeIndex === -1) {
      out.push(node);
      index += 1;
      continue;
    }
    const inner = nodes.slice(index + 1, closeIndex).filter((n) => !isBlank(n as RootContent));
    const children: RootContent[] =
      inner.length > 0
        ? [
            {
              type: "paragraph",
              children: inner as Paragraph["children"],
              position: paragraph.position,
            },
          ]
        : [];
    out.push(
      makeInlineItem(name, raw, false, children, node, nodes[closeIndex] as RootContent),
    );
    converted = true;
    index = closeIndex + 1;
  }

  if (!converted) return null;
  // 子项之间的换行/空格在块级层面没有意义，丢掉；段落里还有正文时保留原文
  const hasContent = out.some((n) => n.type !== "jsxBlock" && !isBlank(n));
  return hasContent ? out : out.filter((n) => n.type === "jsxBlock");
}

/**
 * 递归收拢所有容器下的行内子项
 * @param parent 当前节点（根或任意父节点）
 */
function walk(parent: Root | RootContent): void {
  const children = (parent as { children?: RootContent[] }).children;
  if (!children) return;

  const allowed = parent.type === "jsxBlock" ? itemsOf((parent as JsxBlock).name) : [];
  if (allowed.length > 0) {
    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      if (child.type !== "paragraph") continue;
      const folded = foldParagraph(child, allowed);
      if (!folded) continue;
      children.splice(i, 1, ...folded);
      i += folded.length - 1;
    }
  }
  for (const child of children) walk(child);
}

/**
 * 把 `jsxBlock` 内的行内子项收拢成结构化节点
 * @param tree mdast 根节点（原地修改）
 */
export function foldInlineItems(tree: Root): void {
  walk(tree);
}

/**
 * remark 插件封装：渲染管线里收拢行内子项
 * @param this unified 处理器
 * @returns 转换函数
 */
export default function remarkInlineItems(this: Processor) {
  return (tree: Root): undefined => {
    foldInlineItems(tree);
    return undefined;
  };
}
