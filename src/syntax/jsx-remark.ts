/**
 * @file remark 插件封装（把尖括号扩展注入 unified 管线）
 * @description `remark-parse` 的 options 不会透传 micromark 扩展，unified 生态的标准做法是
 *   在插件里往 `data.micromarkExtensions` / `data.fromMarkdownExtensions` /
 *   `data.toMarkdownExtensions` 追加（`remark-gfm` 就是这么做的）。
 * @created 2026-10-24 20:36
 * @updated 2026-10-24 20:36
 */

import type { Processor } from "unified";
import { jsxBlocks } from "./jsx-flow";
import { jsxFromMarkdown, jsxToMarkdown } from "./jsx-mdast";

/** unified data 上我们关心三个扩展槽 */
interface JsxData {
  micromarkExtensions?: unknown[];
  fromMarkdownExtensions?: unknown[];
  toMarkdownExtensions?: unknown[];
}

/**
 * 注册尖括号块的解析与序列化扩展
 * @param this unified 处理器
 * @returns 无
 */
export default function remarkJsxBlocks(this: Processor): undefined {
  const data = this.data() as JsxData;
  (data.micromarkExtensions ??= []).push(jsxBlocks());
  (data.fromMarkdownExtensions ??= []).push(jsxFromMarkdown());
  (data.toMarkdownExtensions ??= []).push(jsxToMarkdown());
  return undefined;
}
