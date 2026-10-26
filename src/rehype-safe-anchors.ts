/**
 * @file 锚点形态统一（hast 层）
 * @description `mdast-util-to-hast` 会对链接地址做 percent-encode（`#动手` → `#%E5%8A%A8%E6%89%8B`），
 *   而 `rehype-slug` 生成的 `id` 是原文（`id="动手"`），同一篇文档里出现两种形态。
 *   浏览器定位时会解码 fragment，所以点击能跳；但任何按字符串比对 id 的消费方（自写滚动定位、
 *   目录高亮、静态导出后再处理）都会失效。这里把 `#` 后的编码还原，使 `href` 与 `id` 字面一致。
 *   只改链接写法，不动 id，也不影响 `md → AST → md` 往返。
 * @created 2026-10-26 23:05
 * @updated 2026-10-26 23:05
 */

import { visit } from "unist-util-visit";
import type { Element, Root } from "hast";

/**
 * 生成 rehype 插件：还原锚点里的 percent-encoding
 * @returns unified 插件
 */
export function rehypeSafeAnchors() {
  return (tree: Root): void => {
    visit(tree, "element", (node: Element) => {
      const href = node.properties?.href;
      if (typeof href !== "string" || !href.startsWith("#")) return;
      try {
        node.properties.href = `#${decodeURIComponent(href.slice(1))}`;
      } catch {
        // 残缺编码（如 `#a%2`）保持原样，不抛错、不改内容
      }
    });
  };
}
