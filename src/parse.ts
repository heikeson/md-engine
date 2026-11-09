/**
 * @file 唯一解析入口
 * @description Markdown → mdast（已含尖括号块与数学公式节点），再跑策略层得到诊断。
 *   渲染、序列化、编辑器块索引都基于这里产出的同一棵 mdast，避免重复解析。
 * @created 2026-10-24 20:24
 * @updated 2026-10-26 22:02
 * @updated 2026-11-01 21:47 诊断链加入 collectMermaid（图表空源码 / 超限）
 * @updated 2026-11-09 10:20 扩展与解析期后处理改为复用 pipeline 的模块级实例；新增 blocks 选项与 diagnose
 */

import { fromMarkdown } from "mdast-util-from-markdown";
import type { Root } from "mdast";
import { foldInlineItems } from "./syntax/jsx-inline";
import {
  MARKDOWN_EXTENSIONS,
  MARKDOWN_MDAST_EXTENSIONS,
  applySourceTransforms,
} from "./pipeline";
import { collectIndentAsCode, collectUnclosed, type Diagnostic } from "./policy";
import { collectDuplicateIds, collectUnknownTags, collectUnsafeUrls } from "./policy-tags";
import { extractBlocks, type Block } from "./blocks";

/** 解析选项 */
export interface ParseOptions {
  /** 覆盖默认嵌套深度上限 */
  maxDepth?: number;
  /**
   * 是否提取扁平块索引
   * @default true
   * @description 只取诊断（如编辑器输入提示）时传 `false`，可省掉一次整树转换。
   *   块索引是纯只读派生，跳过它不影响诊断、序列化与渲染。
   */
  blocks?: boolean;
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
    // 扩展在 pipeline 里构造一次并复用：GFM（表格 / 删除线 / 任务列表）、数学公式与
    // 尖括号块并列注册，解析与序列化保持同一口径。
    // math 必须在此注册：否则 `$…$` 会退化成普通文本，序列化时把 `_`、`\` 当文本转义，
    // 保存一次公式即变形（渲染侧走 remark-math，故表现为"看着正常、存下来坏了"）。
    extensions: MARKDOWN_EXTENSIONS,
    mdastExtensions: MARKDOWN_MDAST_EXTENSIONS,
  });
  // 行内子项（`<Tab value="a">A</Tab>`）收拢成 jsxBlock，否则父容器取不到 props。
  // 必须在策略层之前：深度裁剪与块索引都按收拢后的结构计数。
  foldInlineItems(tree);
  // 单行 `$$…$$` 提升、深度裁剪、图表容器判定：三件套与渲染管线共用同一实现，
  // 顺序不可调换（渲染侧同样是"提升 → 裁剪 → 图表"，见 render.tsx）。
  const transforms = applySourceTransforms(tree, source, options?.maxDepth);
  const diagnostics: Diagnostic[] = [
    ...transforms.depth,
    ...collectUnclosed(tree, source),
    ...collectUnsafeUrls(tree),
    ...collectUnknownTags(tree),
    ...collectIndentAsCode(tree, source),
    ...collectDuplicateIds(tree),
    // 图表容器：空源码 / 超限。必须排在深度裁剪之后——
    // 被深度裁剪降级的图表块不再出图，也就不该再报图表自身的诊断
    ...transforms.mermaid,
  ];
  // 块索引必须在策略层裁剪之后提取，保证区间与最终渲染一致
  const blocks = options?.blocks === false ? [] : extractBlocks(tree, source);
  return { tree, blocks, diagnostics };
}

/**
 * 只取诊断（不建块索引）
 * @param md Markdown 原文
 * @param options 解析选项（`blocks` 固定为 false）
 * @returns 诊断列表
 * @description 编辑器每次输入只需提示文案，不需要块索引：`parse` 走全量会多付出
 *   `extractBlocks` 的整树转换开销。
 */
export function diagnose(md: string, options?: ParseOptions): Diagnostic[] {
  return parse(md, { ...options, blocks: false }).diagnostics;
}
