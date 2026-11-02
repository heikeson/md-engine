/**
 * @file UI 文案表（可覆写）
 * @description 包内所有面向用户的固定文案（组件 aria、图表工具栏、编辑器工具栏）集中在此，
 *   宿主通过 `config.text` 局部覆写（渲染器 / 编辑器各自生效，互不串扰）。
 *   约定：只增不改——新增键必须带中文默认值；覆写是浅合并，未给的键保持默认。
 * @created 2026-11-02 10:30
 * @updated 2026-11-02 10:30
 */

"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

/** UI 文案键（全部必填；覆写时传 Partial） */
export interface UIText {
  // —— 组件 ——
  /** Image 放大遮罩的关闭按钮 aria-label */
  imageZoomClose: string;
  /** Mermaid 源码态视图名（占位骨架与交互视图共用） */
  mermaidSourceView: string;
  // —— Mermaid 交互视图 ——
  mermaidLoading: string;
  /** 渲染失败提示前缀（后接错误详情） */
  mermaidErrorPrefix: string;
  /** 渲染失败提示后缀 */
  mermaidErrorSuffix: string;
  /** 非 Error 异常兜底文案 */
  mermaidFallbackError: string;
  /** 渲染超时 */
  mermaidTimeout: string;
  mermaidZoomGroup: string;
  mermaidZoomIn: string;
  mermaidZoomOut: string;
  mermaidZoomReset: string;
  /** 重置按钮 title（与 aria 区分：title 更短） */
  mermaidResetTitle: string;
  /** 当前源码态时按钮的 title */
  mermaidToChart: string;
  /** 当前图表态时按钮的 title */
  mermaidToSource: string;
  /** 当前源码态时按钮文字（点击切到图表） */
  mermaidChartView: string;
  mermaidCopied: string;
  mermaidCopySource: string;
  mermaidDownloadSvg: string;
  mermaidDownloadPng: string;
  // —— 编辑器 ——
  editorBold: string;
  editorItalic: string;
  editorStrike: string;
  editorCode: string;
  editorH2: string;
  editorQuote: string;
  editorList: string;
  editorViewGroup: string;
  editorViewSource: string;
  editorViewSplit: string;
  editorViewPreview: string;
  editorFullscreen: string;
  editorExitFullscreen: string;
  /** 状态栏字数单位（渲染为 `{n} {unit}`） */
  editorWordCountUnit: string;
  /** 状态栏诊断前缀（渲染为 `{n} {prefix}{首条消息}`） */
  editorDiagnosticPrefix: string;
  /** 空选区包裹时的占位文字 */
  editorWrapPlaceholder: string;
}

/** 中文默认文案 */
export const DEFAULT_UI_TEXT: UIText = {
  imageZoomClose: "关闭放大图片",
  mermaidSourceView: "源码视图",
  mermaidLoading: "正在渲染图表…",
  mermaidErrorPrefix: "图表渲染失败：",
  mermaidErrorSuffix: "（已显示源码）",
  mermaidFallbackError: "图表渲染失败",
  mermaidTimeout: "图表渲染超时",
  mermaidZoomGroup: "缩放控制",
  mermaidZoomIn: "放大",
  mermaidZoomOut: "缩小",
  mermaidZoomReset: "重置缩放",
  mermaidResetTitle: "重置",
  mermaidToChart: "切换到图表",
  mermaidToSource: "查看源码",
  mermaidChartView: "图表视图",
  mermaidCopied: "已复制",
  mermaidCopySource: "复制源码",
  mermaidDownloadSvg: "下载 SVG",
  mermaidDownloadPng: "下载 PNG",
  editorBold: "粗体",
  editorItalic: "斜体",
  editorStrike: "删除线",
  editorCode: "行内码",
  editorH2: "H2",
  editorQuote: "引用",
  editorList: "列表",
  editorViewGroup: "视图切换",
  editorViewSource: "编辑",
  editorViewSplit: "分屏",
  editorViewPreview: "预览",
  editorFullscreen: "全屏",
  editorExitFullscreen: "退出全屏",
  editorWordCountUnit: "字",
  editorDiagnosticPrefix: "条提示：",
  editorWrapPlaceholder: "文本",
};

/** 文案覆写类型（浅合并） */
export type UITextPatch = Partial<UIText>;

const TextContext = createContext<UIText>(DEFAULT_UI_TEXT);

/**
 * 合并覆写（浅合并，未覆写的键保持默认）
 * @param patch 覆写片段
 * @returns 完整文案表
 */
export function mergeUIText(patch?: UITextPatch): UIText {
  if (!patch) return DEFAULT_UI_TEXT;
  return { ...DEFAULT_UI_TEXT, ...patch };
}

/**
 * 文案上下文 Provider（无覆写时直接透传 children，不产生额外元素）
 * @param props text 覆写片段、children 子树
 */
export function UITextProvider({
  text,
  children,
}: {
  text?: UITextPatch;
  children: ReactNode;
}): ReactNode {
  const merged = useMemo(() => mergeUIText(text), [text]);
  if (!text) return children;
  return <TextContext.Provider value={merged}>{children}</TextContext.Provider>;
}

/**
 * 读取当前生效文案（不在 Provider 内时返回中文默认值）
 * @returns 完整文案表
 */
export function useUIText(): UIText {
  return useContext(TextContext);
}
