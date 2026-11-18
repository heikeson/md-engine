/**
 * @file 序列化：mdast → Markdown
 * @description 与解析对称：解析支持的写法，序列化必须能产出。GFM（表格/删除线/任务列表）、
 *   数学公式与尖括号块各自注册 handler，空行由 handler 统一产出。
 * @created 2026-10-24 20:30
 * @updated 2026-11-18 10:10 扩展表提为模块级常量：三个工厂返回的是纯描述对象，无需每次重建
 */

import { toMarkdown } from "mdast-util-to-markdown";
import { gfmToMarkdown } from "mdast-util-gfm";
import { mathToMarkdown } from "mdast-util-math";
import type { Root } from "mdast";
import { jsxToMarkdown } from "./syntax/jsx-mdast";
import { parse } from "./parse";

/** 序列化选项：保持与项目既有风格一致（`-` 列表、`*` 强调、围栏代码块） */
const OPTIONS = {
  bullet: "-",
  emphasis: "*",
  strong: "*",
  rule: "-",
  fences: true,
  listItemIndent: "one",
} as const;

/**
 * 序列化扩展表
 * @description 三个工厂都只返回描述对象（handlers / join / unsafe），与输入无关，
 *   因此在模块级构造一次即可。`toMarkdown` 会把它们拷进每次调用的新 state，
 *   不会回写本对象（见 mdast-util-to-markdown 的 configure）。
 */
const EXTENSIONS = [gfmToMarkdown(), mathToMarkdown(), jsxToMarkdown()];

/**
 * 把 mdast 序列化为 Markdown
 * @param tree mdast 根节点
 * @returns Markdown 文本
 */
export function serialize(tree: Root): string {
  return toMarkdown(tree, {
    ...OPTIONS,
    // mathToMarkdown 直接把公式原文写回 `$…$` / `$$…$$`，不再走文本转义
    extensions: EXTENSIONS,
  });
}

/**
 * 便捷往返：Markdown → mdast → Markdown
 * @param md 原文
 * @returns 序列化结果（用于验收 `md → AST → md` 是否一致）
 */
export function roundtrip(md: string): string {
  return serialize(parse(md).tree);
}
