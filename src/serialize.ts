/**
 * @file 序列化：mdast → Markdown
 * @description 与解析对称：解析支持的写法，序列化必须能产出。GFM（表格/删除线/任务列表）、
 *   数学公式与尖括号块各自注册 handler，空行由 handler 统一产出。
 * @created 2026-10-24 20:30
 * @updated 2026-10-26 22:02
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
 * 把 mdast 序列化为 Markdown
 * @param tree mdast 根节点
 * @returns Markdown 文本
 */
export function serialize(tree: Root): string {
  return toMarkdown(tree, {
    ...OPTIONS,
    // mathToMarkdown 直接把公式原文写回 `$…$` / `$$…$$`，不再走文本转义
    extensions: [gfmToMarkdown(), mathToMarkdown(), jsxToMarkdown()],
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
