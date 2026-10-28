/**
 * @file 单行块公式的提升（mdast 层）
 * @description `remark-math` 把同一行内的 `$$E=mc^2$$` 当成行内公式（inlineMath），
 *   `mathToMarkdown` 再按行内形态写回 `$E=mc^2$`，作者写一次块公式就被降级成行内公式。
 *   这里把「整段只有一行 `$$…$$`」的段落提升为块级 `math` 节点，序列化即回到 `$$` 形态。
 * @created 2026-10-28 03:40
 * @updated 2026-10-28 03:40
 */

import type { Paragraph, Root } from "mdast";
import { visit } from "unist-util-visit";

/**
 * 判断原文片段是否为单行块公式写法
 * @param raw 段落原文（已 trim）
 * @returns 是 `$$…$$` 且内部不含 `$$` 时返回 true
 */
function isSingleLineBlockMath(raw: string): boolean {
  if (!raw.startsWith("$$") || !raw.endsWith("$$")) return false;
  if (raw.length <= 4) return false;
  return !raw.slice(2, -2).includes("$$");
}

/**
 * 把单行 `$$…$$` 段落提升为块级公式节点
 * @param tree mdast 根节点（原地修改）
 * @param source 原始 Markdown（用于判断原文写法）
 */
export function promoteBlockMath(tree: Root, source: string): void {
  visit(tree, "paragraph", (node: Paragraph, index, parent) => {
    if (typeof index !== "number" || !parent) return;
    if (node.children.length !== 1) return;
    const only = node.children[0];
    if (only.type !== "inlineMath") return;
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (typeof start !== "number" || typeof end !== "number") return;
    if (!isSingleLineBlockMath(source.slice(start, end).trim())) return;
    // 形状与 mdast-util-math 的 math 节点完全一致（含 data.hName / hChildren）：
    // 宿主若拿 parse() 的树自建 toHast 管线，缺了这层 data 公式会渲染成空。
    parent.children[index] = {
      type: "math",
      meta: null,
      value: only.value,
      data: {
        hName: "pre",
        hChildren: [
          {
            type: "element",
            tagName: "code",
            properties: { className: ["language-math", "math-display"] },
            children: [{ type: "text", value: only.value }],
          },
        ],
      },
      position: node.position,
    } as never;
  });
}
