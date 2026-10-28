/**
 * @file 未识别的 HTML 片段按文本呈现（mdast 层，仅渲染管线）
 * @description `remark-rehype` 默认丢弃 `html` 节点（没有 `rehype-raw`），
 *   于是「白名单外的标签 + 它的正文」在页面上会整块消失——与契约「按文本显示」相反。
 *   这里在 mdast 阶段把 `html` 节点换成文本节点：标签变成可见字面量，正文照常渲染，
 *   既不引入 `rehype-raw`（不执行 HTML），也不改动 `parse()` 的树（诊断与块索引仍按原文）。
 *   合法的通用容器 `div` 已在 registry 里注册，走正常容器路径，不经过这里。
 * @created 2026-10-28 12:35
 * @updated 2026-10-28 12:35
 */

import type { Root, RootContent } from "mdast";
import type { Processor } from "unified";
import { visit } from "unist-util-visit";

/**
 * remark 插件封装：把 html 节点替换成等值文本节点
 * @param this unified 处理器
 * @returns 转换函数
 */
export default function remarkHtmlAsText(this: Processor) {
  return (tree: Root): undefined => {
    visit(tree, "html", (node, index, parent) => {
      if (typeof index !== "number" || !parent) return;
      const replacement: RootContent = { type: "text", value: node.value };
      if (node.position) replacement.position = node.position;
      parent.children[index] = replacement;
    });
    return undefined;
  };
}
