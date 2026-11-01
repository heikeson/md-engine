/**
 * @file `/mermaid` 入口：交互式图表
 * @description 唯一允许接触 mermaid、dompurify 与 DOM 的层。主入口零引用，
 *   不用图表的页面不承担这些体积；未引入本入口时 `<Mermaid>` 停留在源码骨架。
 *   本文件只做导出，不执行任何副作用（不注册全局、不带 'use client' 之外的语句）。
 * @created 2026-11-01 21:32
 * @updated 2026-11-01 21:32
 * @updated 2026-11-01 22:51 导出配色配置 API（configureChartTheme / getChartTheme / DEFAULT_CHART_THEME）
 */

"use client";

import type { ComponentType } from "react";
import type { MermaidProps } from "../components/mermaid-placeholder";
import MermaidChart from "./viewer";

/** 单个图表组件 */
export { default as MermaidChart } from "./viewer";

/** 组件 props 契约（与占位骨架同一签名） */
export type { MermaidProps } from "../components/mermaid-placeholder";

/**
 * 使用方覆写表
 * @example
 * const components = { ...mdxComponents, ...mermaidComponents };
 * @description 键必须与容器名完全一致（首字母大写）：渲染层按 hast tagName 查表，
 *   写成小写不会报错，只会静默停留在源码骨架。
 */
export const mermaidComponents: Record<string, ComponentType<MermaidProps>> = {
  Mermaid: MermaidChart as ComponentType<MermaidProps>,
};

/** 配色：内置亮暗两套，`configureChartTheme` 可在安装时整体替换 */
export {
  buildMermaidConfig,
  buildThemeVariables,
  configureChartTheme,
  DEFAULT_CHART_THEME,
  DARK_TOKENS,
  getChartTheme,
  hasCustomChartTheme,
  LIGHT_TOKENS,
  resetChartTheme,
  tokenFingerprint,
} from "./tokens";
export type { ChartTheme, ChartTokens, MermaidConfigLike } from "./tokens";

/** 导出能力（使用方也可以自己做按钮时直接调用） */
export { downloadPng, downloadSvg, prepareSvg, svgToPngBlob } from "./export";

/** 配色解析与明暗订阅 */
export { resolveChartTokens } from "./use-render";
export { useIsDark } from "./use-dark";
