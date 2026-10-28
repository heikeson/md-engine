/**
 * @file 唯一解析入口
 * @description Markdown → mdast（已含尖括号块与数学公式节点），再跑策略层得到诊断。
 *   渲染、序列化、编辑器块索引都基于这里产出的同一棵 mdast，避免重复解析。
 * @created 2026-10-24 20:24
 * @updated 2026-10-26 22:02
 */

import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { math } from "micromark-extension-math";
import { mathFromMarkdown } from "mdast-util-math";
import type { Root } from "mdast";
import { jsxBlocks } from "./syntax/jsx-flow";
import { jsxFromMarkdown } from "./syntax/jsx-mdast";
import { foldInlineItems } from "./syntax/jsx-inline";
import { promoteBlockMath } from "./syntax/math-block";
import { collectIndentAsCode, collectUnclosed, enforceMaxDepth, type Diagnostic } from "./policy";
import { collectUnknownTags, collectUnsafeUrls } from "./policy-tags";
import { extractBlocks, type Block } from "./blocks";

/** 解析选项 */
export interface ParseOptions {
  /** 覆盖默认嵌套深度上限 */
  maxDepth?: number;
}

/** 解析结果 */
export interface ParseResult {
  /** mdast 根节点（容器已是 jsxBlock 节点） */
  tree: Root;
  /** 扁平块索引，编辑器用于定位与出块 UI */
  blocks: Block[];
  /** 诊断列表，供编辑器提示 */
  diagnostics: Diagnostic[];
}

/**
 * 解析 Markdown 为 mdast 并执行策略层
 * @param md Markdown 原文
 * @param options 解析选项
 * @returns mdast 与诊断
 */
export function parse(md: string, options?: ParseOptions): ParseResult {
  const source = md ?? "";
  const tree = fromMarkdown(source, {
    // GFM（表格 / 删除线 / 任务列表）、数学公式与尖括号块并列注册，解析与序列化保持同一口径。
    // math 必须在此注册：否则 `$…$` 会退化成普通文本，序列化时把 `_`、`\` 当文本转义，
    // 保存一次公式即变形（渲染侧走 remark-math，故表现为"看着正常、存下来坏了"）。
    extensions: [gfm(), math(), jsxBlocks()],
    mdastExtensions: [gfmFromMarkdown(), mathFromMarkdown(), jsxFromMarkdown()],
  });
  // 两个纯 mdast 后处理，必须在策略层之前：
  // 1) 行内子项（`<Tab value="a">A</Tab>`）收拢成 jsxBlock，否则父容器取不到 props；
  // 2) 单行 `$$…$$` 提升为块级公式，否则序列化会降级成 `$…$`。
  // 渲染管线（render.tsx）挂的是同样的两个 transform，保证"能解析的就能渲染"。
  foldInlineItems(tree);
  promoteBlockMath(tree, source);
  const diagnostics: Diagnostic[] = [
    ...enforceMaxDepth(tree, source, options?.maxDepth),
    ...collectUnclosed(tree, source),
    ...collectUnsafeUrls(tree),
    ...collectUnknownTags(tree),
    ...collectIndentAsCode(tree, source),
  ];
  // 块索引必须在策略层裁剪之后提取，保证区间与最终渲染一致
  const blocks = extractBlocks(tree, source);
  return { tree, blocks, diagnostics };
}
