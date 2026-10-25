/**
 * @file 策略层（纯函数，不依赖 React / DOM）
 * @description 负责"不崩、不丢内容"的部分：嵌套深度裁剪、未闭合与超限诊断。
 *   与渲染实现解耦——将来换渲染方式，这里不用动。
 * @created 2026-10-24 20:24
 * @updated 2026-10-24 20:24
 */

import type { Root, RootContent, Text } from "mdast";
import { COMPONENTS, MAX_CONTAINER_DEPTH } from "./registry";
import type { JsxBlock } from "./syntax/jsx-mdast";

/** 诊断码 */
export type DiagnosticCode = "UNCLOSED_TAG" | "DEPTH_EXCEEDED" | "UNKNOWN_TAG" | "UNSAFE_HREF";

/** 一条诊断 */
export interface Diagnostic {
  code: DiagnosticCode;
  level: "warn" | "error";
  /** 行号（1 起） */
  line: number;
  /** 中文提示 */
  message: string;
  /** 全文 offset 区间 */
  range?: [number, number];
}

/** 判断节点是否为尖括号块 */
function isJsxBlock(node: RootContent): node is JsxBlock {
  return node.type === "jsxBlock";
}

/**
 * 按原文切片还原某个节点的文本
 * @param source 原始 Markdown
 * @param node 节点
 * @returns 原文片段；缺少 position 时返回空串
 */
function sliceNode(source: string, node: RootContent): string {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (typeof start !== "number" || typeof end !== "number") return "";
  return source.slice(start, end);
}

/**
 * 递归裁剪超限嵌套：超限那层整块降级为文本（原样保留内容）
 * @param parent 父节点
 * @param source 原始 Markdown（用于取原文）
 * @param depth 当前容器深度
 * @param maxDepth 上限
 * @param out 诊断收集器
 */
function walk(
  parent: Root | RootContent,
  source: string,
  depth: number,
  maxDepth: number,
  out: Diagnostic[],
): void {
  const children = (parent as { children?: RootContent[] }).children;
  if (!children) return;
  const next: RootContent[] = [];
  for (const child of children) {
    if (!isJsxBlock(child)) {
      walk(child, source, depth, maxDepth, out);
      next.push(child);
      continue;
    }
    // 只有容器计层，子项（Tab/Step/Card/AccItem）不计数
    const isContainer = Boolean(COMPONENTS[child.name]);
    const childDepth = depth + (isContainer ? 1 : 0);
    if (isContainer && childDepth > maxDepth) {
      const text = sliceNode(source, child);
      const line = child.position?.start.line ?? 1;
      out.push({
        code: "DEPTH_EXCEEDED",
        level: "warn",
        line,
        message: `第 ${childDepth} 层容器 ${child.name} 超出上限 ${maxDepth}，已按源码显示`,
        range: [child.position?.start.offset ?? 0, child.position?.end.offset ?? 0],
      });
      const fallback: Text = { type: "text", value: text };
      next.push(fallback);
      continue;
    }
    walk(child, source, childDepth, maxDepth, out);
    next.push(child);
  }
  (parent as { children?: RootContent[] }).children = next;
}

/**
 * 执行深度裁剪并产出对应诊断
 * @param tree mdast 根节点（原地修改）
 * @param source 原始 Markdown
 * @param maxDepth 深度上限，缺省用注册表值
 * @returns 诊断列表
 */
export function enforceMaxDepth(
  tree: Root,
  source: string,
  maxDepth: number = MAX_CONTAINER_DEPTH,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  walk(tree, source, 0, maxDepth, diagnostics);
  return diagnostics;
}

/**
 * 判断块的原文区间内是否出现过对应的闭合标签
 * @description 直接比对原文而非依赖 token 栈：嵌套时 token 栈顶可能是外层节点，
 *   用栈判断会把标记打到错误的块上。这里用"区间内出现 `</Name>`"而非"以它结尾"，
 *   因为同名容器嵌套（`<Folder>` 套 `<Folder>`）时内层区间会被拉长到外层闭合处，
 *   按结尾判断会误报——宁可少报，也不要对能正常显示的块报错。
 * @param block 尖括号块
 * @param source 原始 Markdown
 * @returns 区间内出现过 `</Name>` 返回 true
 */
function hasCloseTag(block: JsxBlock, source: string): boolean {
  const start = block.position?.start.offset ?? 0;
  const end = block.position?.end.offset ?? 0;
  if (end <= start) return false;
  const body = new RegExp(`</${block.name}\\s*>`);
  if (body.test(source.slice(start, end))) return true;
  // 同名嵌套时内层区间会止于闭合标签之前，紧跟其后的 `</Name>` 同样算作它的闭合
  return new RegExp(`^\\s*</${block.name}\\s*>`).test(source.slice(end, end + 64));
}

/**
 * 收集未闭合诊断
 * @description 自闭合叶子（`<Image />`、`<File />`）不参与判断
 * @param tree mdast 根节点
 * @param source 原始 Markdown（用于比对闭合标签）
 * @returns 诊断列表
 */
export function collectUnclosed(tree: Root, source: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const visit = (node: Root | RootContent): void => {
    if (node.type === "jsxBlock") {
      const block = node as JsxBlock;
      if (!block.selfClosing && !hasCloseTag(block, source)) {
        diagnostics.push({
          code: "UNCLOSED_TAG",
          level: "warn",
          line: block.position?.start.line ?? 1,
          message: `<${block.name}> 未闭合，已按延伸到文末处理`,
          range: [block.position?.start.offset ?? 0, block.position?.end.offset ?? 0],
        });
      }
    }
    const children = (node as { children?: RootContent[] }).children;
    if (children) for (const child of children) visit(child);
  };
  visit(tree);
  return diagnostics;
}
