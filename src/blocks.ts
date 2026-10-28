/**
 * @file 块索引（供编辑器定位与出块 UI）
 * @description 把 mdast 压平成带全文 offset 的块列表：容器块带子项、普通块只留类型与区间。
 *   编辑器据此"点哪块改哪块"，不需要自己再遍历一遍树。
 *   区间一律是原文 offset（0 起，end 不含），可直接用于 `source.slice(start, end)`。
 * @created 2026-10-24 21:06
 * @updated 2026-10-24 21:06
 */

import type { Root, RootContent } from "mdast";
import { COMPONENTS } from "./registry";
import type { JsxBlock } from "./syntax/jsx-mdast";

/** 容器属性表 */
export type Attrs = Readonly<Record<string, string | boolean>>;

/** 降级为源码块的原因 */
export type SourceReason = "html" | "definition" | "unknown" | "list-context" | "depth-exceeded";

/** 可视化块（标题、段落、列表、表格、代码块等） */
export interface VisualBlock {
  kind: "visual";
  /** mdast 节点类型，如 heading / paragraph / table */
  type: string;
  start: number;
  end: number;
  /**
   * 子块（仅 list / blockquote / listItem 这类容器型可视化块带）
   * @description 列表、引用里的尖括号容器只有靠这个字段才拿得到区间，
   *   否则编辑器对「列表里的 <Files>」无法做定位、分屏同步与出块。
   */
  blocks?: Block[];
}

/** 源码块（原样保留，不做可视化） */
export interface SourceBlock {
  kind: "source";
  /** 原文片段 */
  text: string;
  reason: SourceReason;
  start: number;
  end: number;
}

/** 容器子项（Tab / Step / Card / AccItem） */
export interface ContainerItem {
  name: string;
  attrs: Attrs;
  blocks: Block[];
  start: number;
  end: number;
}

/** 容器块（Callout / Tabs / Steps / Cards / Accordion / FileTree / Image） */
export interface ContainerBlock {
  kind: "container";
  name: string;
  attrs: Attrs;
  /** 容器深度，1 起；子项不计层 */
  depth: number;
  /** 直接内容块（Callout / FileTree 这类无子项的容器） */
  blocks: Block[];
  /** 子项（仅 Tabs / Steps / Cards / Accordion 有） */
  items: ContainerItem[];
  start: number;
  end: number;
}

/** 块 */
export type Block = VisualBlock | SourceBlock | ContainerBlock;

/** 需要递归取子块的可视化容器（列表 / 列表项 / 引用） */
const CONTAINERISH = new Set(["list", "listItem", "blockquote"]);

/**
 * 判断节点是否为尖括号块
 * @param node mdast 节点
 * @returns 是则返回 true
 */
function isJsxBlock(node: RootContent): node is JsxBlock {
  return node.type === "jsxBlock";
}

/**
 * 取节点的全文区间
 * @param node mdast 节点
 * @returns [start, end]，缺 position 时为 [0, 0]
 */
function rangeOf(node: RootContent): [number, number] {
  const start = node.position?.start.offset ?? 0;
  const end = node.position?.end.offset ?? start;
  return [start, end];
}

/**
 * 把一组子节点转成块列表
 * @param children mdast 子节点
 * @param source 原文
 * @param depth 当前容器深度
 * @returns 块列表
 */
function toBlocks(children: RootContent[], source: string, depth: number): Block[] {
  return children.map((child) => toBlock(child, source, depth));
}

/**
 * 单个节点转块
 * @param node mdast 节点
 * @param source 原文
 * @param depth 所属容器深度（顶层为 1）
 * @returns 块
 */
function toBlock(node: RootContent, source: string, depth: number): Block {
  const [start, end] = rangeOf(node);

  if (isJsxBlock(node)) {
    // 嵌套超限降级：按源码块暴露，渲染与序列化都原样，编辑器口径与 DEPTH_EXCEEDED 一致
    if (node.data?.degraded) {
      return { kind: "source", text: source.slice(start, end), reason: "depth-exceeded", start, end };
    }
    const spec = COMPONENTS[node.name];
    const children = (node.children ?? []) as RootContent[];
    // items 支持单一子项名或数组（Files 混用 Folder / File）
    const itemNames = spec?.items
      ? Array.isArray(spec.items)
        ? spec.items
        : [spec.items as string]
      : [];
    // 有 items 声明的容器：子节点都是子项，子项内再递归；子项不计入深度
    if (itemNames.length > 0) {
      const items: ContainerItem[] = children
        .filter(isJsxBlock)
        .filter((child) => itemNames.includes(child.name))
        .map((child) => {
        const [itemStart, itemEnd] = rangeOf(child);
        return {
          name: child.name,
          attrs: child.attributes,
          // 子项内部再出现的容器属于下一层（与 policy 的计数口径一致）
          blocks: toBlocks((child.children ?? []) as RootContent[], source, depth + 1),
          start: itemStart,
          end: itemEnd,
        };
      });
      return {
        kind: "container",
        name: node.name,
        attrs: node.attributes,
        depth,
        blocks: [],
        items,
        start,
        end,
      };
    }
    // 无子项的容器（Callout / FileTree / Image）：内容直接作为块列表
    return {
      kind: "container",
      name: node.name,
      attrs: node.attributes,
      depth,
      blocks: toBlocks(children, source, depth + 1),
      items: [],
      start,
      end,
    };
  }

  if (node.type === "html") {
    return { kind: "source", text: source.slice(start, end), reason: "html", start, end };
  }
  if (node.type === "definition") {
    return { kind: "source", text: source.slice(start, end), reason: "definition", start, end };
  }

  // 列表 / 引用的子节点里可能藏着尖括号容器：递归暴露，容器深度不变（列表不计层）
  if (CONTAINERISH.has(node.type)) {
    const children = ((node as { children?: RootContent[] }).children ?? []) as RootContent[];
    return { kind: "visual", type: node.type, start, end, blocks: toBlocks(children, source, depth) };
  }

  return { kind: "visual", type: node.type, start, end };
}

/**
 * 从 mdast 提取块索引
 * @param tree mdast 根节点（应在策略层裁剪之后）
 * @param source 原始 Markdown
 * @returns 顶层块列表
 */
export function extractBlocks(tree: Root, source: string): Block[] {
  return toBlocks(tree.children, source, 1);
}
