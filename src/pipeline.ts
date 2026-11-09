/**
 * @file 共享管线（解析与渲染的唯一口径）
 * @description 两条管线（`parse.ts` 的 fromMarkdown、`render.tsx` 的 unified）必须使用
 *   同一套 micromark / mdast 扩展与同一组解析期后处理，否则会出现「能解析的渲染不出来」
 *   这类分叉（历史上已有「编辑器提示超限、页面照样出图」）。
 *   扩展实例在模块加载时构造一次：扩展是纯描述对象，可被多次解析复用。
 *   后处理的顺序是硬约束：块级公式提升 → 深度裁剪 → 图表容器判定，不可调换。
 * @created 2026-11-09 10:20
 * @updated 2026-11-09 10:20
 */

import type { Extension as MicromarkExtension } from "micromark-util-types";
import type { Extension as FromMarkdownExtension } from "mdast-util-from-markdown";
import type { PluggableList } from "unified";
import type { Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { math } from "micromark-extension-math";
import { mathFromMarkdown } from "mdast-util-math";
import { jsxBlocks } from "./syntax/jsx-flow";
import { jsxFromMarkdown } from "./syntax/jsx-mdast";
import remarkJsxBlocks from "./syntax/jsx-remark";
import remarkInlineItems from "./syntax/jsx-inline";
import remarkHtmlAsText from "./syntax/html-text";
import { promoteBlockMath } from "./syntax/math-block";
import { collectMermaid, enforceMaxDepth, type Diagnostic } from "./policy";

/**
 * fromMarkdown 的 micromark 扩展（GFM / 数学 / 尖括号块）
 * @description 模块级常量：每次 parse 复用同一批扩展，不再重建状态机
 */
export const MARKDOWN_EXTENSIONS: MicromarkExtension[] = [gfm(), math(), jsxBlocks()];

/** mdast 扩展项：`gfmFromMarkdown()` 返回扩展数组，math / jsx 返回单个扩展 */
type MdastExtensionItem = FromMarkdownExtension | FromMarkdownExtension[];

/** fromMarkdown 的 mdast 扩展，与 `MARKDOWN_EXTENSIONS` 一一对应 */
export const MARKDOWN_MDAST_EXTENSIONS: MdastExtensionItem[] = [
  gfmFromMarkdown(),
  mathFromMarkdown(),
  jsxFromMarkdown(),
];

/**
 * 渲染管线的解析阶段插件（顺序固定）
 * @description 尖括号扩展必须先注册，GFM / 数学随后叠加；三者都是往 unified data
 *   追加扩展，不产生 transform，因此可安全地合并为一个 use 调用。
 */
export const REMARK_PARSE_PLUGINS: PluggableList = [remarkJsxBlocks, remarkGfm, remarkMath];

/**
 * 渲染管线的 mdast 后处理插件（顺序固定）
 * @description 行内子项收拢依赖 `remarkJsxBlocks` 产出的节点；白名单外 HTML 转文本
 *   必须在其后，否则未收拢的行内标签会被当成纯文本吞掉。
 */
export const REMARK_TRANSFORMS: PluggableList = [remarkInlineItems, remarkHtmlAsText];

/**
 * 解析期后处理产生的诊断分组
 * @description 按分组返回是为了让 `parse()` 保持既有的诊断顺序：
 *   深度诊断在前、图表诊断在末尾，中间插入其余只读诊断。
 */
export interface SourceTransformDiagnostics {
  /** 深度裁剪产生的 `DEPTH_EXCEEDED` */
  depth: Diagnostic[];
  /** 图表容器的 `MERMAID_EMPTY` / `MERMAID_TOO_LARGE` */
  mermaid: Diagnostic[];
}

/**
 * 执行两条管线共用的解析期后处理（原地修改 mdast）
 * @param tree mdast 根节点
 * @param source 原始 Markdown（块级公式与深度裁剪都要按原文切片）
 * @param maxDepth 深度上限，缺省用注册表值
 * @returns 两组诊断；渲染侧不需要诊断文案，但必须执行以拿到副作用
 * @description 渲染侧同样要跑，否则会出现「编辑器提示超限、页面照样出图」的分叉。
 */
export function applySourceTransforms(
  tree: Root,
  source: string,
  maxDepth?: number,
): SourceTransformDiagnostics {
  promoteBlockMath(tree, source);
  const depth = enforceMaxDepth(tree, source, maxDepth);
  const mermaid = collectMermaid(tree);
  return { depth, mermaid };
}
