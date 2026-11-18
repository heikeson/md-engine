/**
 * @file 后处理链：一次遍历完成 URL 清洗、锚点还原、源码位置与代码块元信息
 * @description 这四个动作都只读写单个元素的属性、互不依赖树结构变化，因此合并成一次
 *   `visit` 即可，省掉三次整树遍历。**次序不可调换**：原链是
 *   `safeUrls → safeAnchors → sourcePositions → codeMeta`，属性写入顺序经
 *   `toJsxRuntime` 传到 React props、再传到 SSR 输出，调换会让 HTML 属性顺序变化。
 *   `rehypeSlug`（github-slugger 有跨节点去重状态）与 `rehypeKatex` 仍在其后单独执行。
 * @created 2026-11-18 10:20
 * @updated 2026-11-18 10:20
 */

import { visit } from "unist-util-visit";
import type { Element, Root } from "hast";
import { sanitizeUrlProps } from "./rehype-safe-urls";
import { restoreAnchors } from "./rehype-safe-anchors";
import { applySourcePosition } from "./rehype-source-positions";
import { applyCodeMeta } from "./rehype-code-meta";

/** 后处理选项 */
export interface RehypePostprocessOptions {
  /** 是否写入 `data-src-start`（编辑器滚动同步用，前台文章不需要） */
  sourcePositions?: boolean;
}

/**
 * 生成后处理插件
 * @param options 选项
 * @returns unified 插件
 */
export function rehypePostprocess(options?: RehypePostprocessOptions) {
  const withPositions = options?.sourcePositions === true;
  return (tree: Root): void => {
    visit(tree, "element", (node: Element) => {
      // 次序即契约：见文件头说明
      sanitizeUrlProps(node);
      restoreAnchors(node);
      if (withPositions) applySourcePosition(node);
      applyCodeMeta(node);
    });
  };
}
