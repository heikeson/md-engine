/**
 * @file 源码位置透传（rehype 插件）
 * @description 把 mdast 的 `position.start.offset` 写到块级元素的 `data-src-start`，
 *   供编辑器分屏做"按内容对齐"的滚动同步（不是按比例）。
 *   默认不启用：前台文章不需要这些属性（每块约 20 字节），只在编辑器预览里开。
 * @created 2026-10-25 01:40
 * @updated 2026-10-25 01:40
 */
import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

/** 需要打锚点的块级标签（行内元素与自定义容器不打） */
const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "table",
  "figure",
  "hr",
]);

/**
 * 给块级元素写入源码起始位置
 * @returns rehype transformer
 */
export function rehypeSourcePositions() {
  return (tree: Root): undefined => {
    visit(tree, "element", (node: Element) => {
      const tag = node.tagName.toLowerCase();
      if (!BLOCK_TAGS.has(tag)) return;
      const start = node.position?.start.offset;
      if (typeof start !== "number") return;
      node.properties = node.properties ?? {};
      // data-* 属性在 hast 里直接用连字符键名，序列化时原样输出
      node.properties["data-src-start"] = String(start);
    });
    return undefined;
  };
}
