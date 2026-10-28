/**
 * @file 行内子项的收拢（mdast 层）
 * @description 词法层的 flow 构造只在「整行就是标签」时触发，`<Tab value="a">A</Tab>` 这种
 *   标签与内容同行的写法会退化成一串 inline html，父容器按 `Children.toArray` 取子项时
 *   读不到任何 props（表现为 label 为空、多个子项合并成一个）。
 *   本模块在 mdast 层把「开标签 + 内容 + 闭标签」还原成 `jsxBlock`：
 *   同段落内收拢的节点标记 `data.inline`（按行内形态写回）；跨段落收拢的节点按块形态写回。
 *   开标签解析复用 `parseOpenTag`，不再另写正则——两份实现是属性含 `>` 时 props 丢失的根因。
 * @created 2026-10-28 03:40
 * @updated 2026-10-28 11:40 折叠粒度由「段落内」提升到「父节点子序列」；标签解析统一走 parseOpenTag
 */

import type { Paragraph, Root, RootContent, Text } from "mdast";
import type { Processor } from "unified";
import { COMPONENTS } from "../registry";
import { parseOpenTag, type JsxBlock } from "./jsx-mdast";

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

/** 节点序列是否全为空白（空序列也算） */
function allBlank(nodes: RootContent[]): boolean {
  return nodes.every((node) => isBlank(node));
}

/**
 * 用首尾节点拼出覆盖两端的 position
 * @param first 首节点
 * @param last 尾节点（只有一个节点时与 first 相同）
 * @returns 合并后的 position；任一缺失时返回 undefined
 */
function spanPosition(first: RootContent | undefined, last: RootContent | undefined): NonNullable<RootContent["position"]> | undefined {
  const start = first?.position?.start;
  const end = last?.position?.end;
  if (!start || !end) return undefined;
  return { start, end };
}

/**
 * 生成子项节点
 * @param name 子项名
 * @param raw 开标签原文
 * @param selfClosing 是否自闭合
 * @param children 子节点（同段落收拢时为单个 paragraph）
 * @param inline 是否按行内形态写回
 * @param open 开标签节点
 * @param close 闭标签节点（自闭合时与 open 相同）
 * @returns jsxBlock 节点
 */
function makeItem(
  name: string,
  raw: string,
  selfClosing: boolean,
  children: RootContent[],
  inline: boolean,
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
  };
  node.data = inline ? { closed: true, inline: true } : { closed: true };
  const position = spanPosition(open, close);
  if (position) node.position = position;
  return node;
}

/**
 * 把一段行内节点包装成段落
 * @param nodes 行内节点
 * @param fallback 位置回退（无首尾位置时使用）
 * @returns 段落；全为空白时返回 null
 */
function toParagraph(
  nodes: RootContent[],
  fallback: Paragraph["position"],
): Paragraph | null {
  if (nodes.length === 0 || allBlank(nodes)) return null;
  const position = spanPosition(nodes[0], nodes[nodes.length - 1]) ?? fallback;
  const paragraph: Paragraph = { type: "paragraph", children: nodes as Paragraph["children"] };
  if (position) paragraph.position = position;
  return paragraph;
}

/** 折叠结果：替换掉 consume 个子节点，换成 nodes */
interface FoldResult {
  nodes: RootContent[];
  consume: number;
  /** 折出的子项在 nodes 中的下标（用于让扫描跳过它、继续处理残留段落） */
  itemOffset: number;
}

/**
 * 段落里从 index 起的第一个非空白节点
 * @param nodes 段落子节点
 * @param from 起始下标
 * @returns 下标；没有时返回 -1
 */
function firstMeaningful(nodes: RootContent[], from: number): number {
  for (let index = from; index < nodes.length; index += 1) {
    if (!isBlank(nodes[index] as RootContent)) return index;
  }
  return -1;
}

/**
 * 从节点序列的 index 起找同名闭标签
 * @param nodes 子节点
 * @param from 起始下标
 * @param name 子项名
 * @returns 闭标签下标；未找到返回 -1
 */
function findClose(nodes: RootContent[], from: number, name: string): number {
  for (let index = from; index < nodes.length; index += 1) {
    const candidate = nodes[index] as RootContent;
    if (candidate.type !== "html") continue;
    const match = CLOSE_TAG_RE.exec(String(candidate.value).trim());
    if (match && match[1] === name) return index;
  }
  return -1;
}

/**
 * 尝试在 children[index] 处折叠一个子项
 * @param children 父节点子节点
 * @param index 起始下标
 * @param allowed 允许的子项名
 * @returns 折叠结果；此处不是可折叠的行内子项时返回 null
 */
function tryFoldAt(children: RootContent[], index: number, allowed: readonly string[]): FoldResult | null {
  const paragraph = children[index];
  if (paragraph.type !== "paragraph") return null;

  const nodes = paragraph.children as RootContent[];
  const openIndex = firstMeaningful(nodes, 0);
  if (openIndex === -1) return null;

  const openNode = nodes[openIndex] as RootContent;
  if (openNode.type !== "html") return null;

  const parsed = parseOpenTag(String(openNode.value).trim());
  if (!parsed.name || !allowed.includes(parsed.name)) return null;

  // 自闭合子项（`<Card … />`、`<File … />`）：就地变成一个节点
  if (parsed.selfClosing) {
    const head = toParagraph(nodes.slice(0, openIndex), paragraph.position);
    const tail = toParagraph(nodes.slice(openIndex + 1), paragraph.position);
    const item = makeItem(parsed.name, String(openNode.value).trim(), true, [], true, openNode, openNode);
    return { nodes: [...(head ? [head] : []), item, ...(tail ? [tail] : [])], consume: 1, itemOffset: head ? 1 : 0 };
  }

  // 同段落内闭合：行内形态
  const inlineClose = findClose(nodes, openIndex + 1, parsed.name);
  if (inlineClose !== -1) {
    const inner = toParagraph(nodes.slice(openIndex + 1, inlineClose), paragraph.position);
    const head = toParagraph(nodes.slice(0, openIndex), paragraph.position);
    const tail = toParagraph(nodes.slice(inlineClose + 1), paragraph.position);
    const closeNode = nodes[inlineClose] as RootContent;
    const item = makeItem(parsed.name, String(openNode.value).trim(), false, inner ? [inner] : [], true, openNode, closeNode);
    return { nodes: [...(head ? [head] : []), item, ...(tail ? [tail] : [])], consume: 1, itemOffset: head ? 1 : 0 };
  }

  // 跨段落：向后扫兄弟节点，只接受段落；遇到其它类型立即放弃（不做跨结构猜测）
  for (let probe = index + 1; probe < children.length; probe += 1) {
    const sibling = children[probe];
    if (sibling.type !== "paragraph") return null;
    const siblingNodes = sibling.children as RootContent[];
    const closeIndex = findClose(siblingNodes, 0, parsed.name);
    const inner: RootContent[] = [];

    const firstBody = toParagraph(nodes.slice(openIndex + 1), paragraph.position);
    if (firstBody) inner.push(firstBody);
    for (let middle = index + 1; middle < probe; middle += 1) inner.push(children[middle]);

    const head = toParagraph(nodes.slice(0, openIndex), paragraph.position);

    if (closeIndex !== -1) {
      const lastBody = toParagraph(siblingNodes.slice(0, closeIndex), sibling.position);
      if (lastBody) inner.push(lastBody);
      const tail = toParagraph(siblingNodes.slice(closeIndex + 1), sibling.position);
      const item = makeItem(
        parsed.name,
        String(openNode.value).trim(),
        false,
        inner,
        false,
        openNode,
        siblingNodes[closeIndex] as RootContent,
      );
      return {
        nodes: [...(head ? [head] : []), item, ...(tail ? [tail] : [])],
        consume: probe - index + 1,
        itemOffset: head ? 1 : 0,
      };
    }
  }

  // 未闭合：保持原样，交给 policy 产 UNCLOSED_TAG，不在这里猜
  return null;
}

/**
 * 收拢一个父节点下的行内子项
 * @param parent 当前节点（根或任意 jsxBlock）
 */
function foldChildren(parent: Root | JsxBlock): void {
  const allowed = parent.type === "jsxBlock" ? itemsOf(parent.name) : [];
  if (allowed.length === 0) return;

  const children = parent.children as RootContent[];
  let index = 0;
  while (index < children.length) {
    const folded = tryFoldAt(children, index, allowed);
    if (!folded) {
      index += 1;
      continue;
    }
    children.splice(index, folded.consume, ...folded.nodes);
    // 只跳过折出来的子项本身：它后面的残留段落里可能还有下一个子项
    index += folded.itemOffset + 1;
  }
}

/**
 * 递归收拢所有容器下的行内子项
 * @param parent 当前节点（根或任意父节点）
 */
function walk(parent: Root | RootContent): void {
  if (parent.type === "root" || parent.type === "jsxBlock") foldChildren(parent as Root | JsxBlock);
  const children = (parent as { children?: RootContent[] }).children;
  if (!children) return;
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
