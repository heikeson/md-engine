/**
 * @file 简体中文语言包（包内默认）
 * @description 全量满足 `UIText`，编译期强制无缺键。带 `{...}` 的是 ICU 消息模板，
 *   带 `plural` 的是复数分支；纯文本消息不含花括号，格式化时走快路径。
 * @created 2026-11-02 19:32
 * @updated 2026-11-02 19:32
 */

import type { UIText } from "../internal/text";

/** 简体中文 */
export const zhCN = {
  // —— 组件 ——
  imageZoomClose: "关闭放大图片",
  // —— Mermaid ——
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
  // —— 类型表 ——
  typeTableAttr: "属性",
  typeTableType: "类型",
  typeTableDefault: "默认值",
  typeTableDesc: "说明",
  typeItemRequired: "必填",
  typeItemEmpty: "—",
  // —— 编辑器 ——
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
  editorWordCount: "{n, plural, other {# 字}}",
  editorDiagnostic: "{n, plural, other {# 条提示：}}{first}",
  editorWrapPlaceholder: "文本",
  editorPlaceholder: "在这里写 Markdown，输入尖括号可以直接插入容器",
  editorInsertBlock: "插入 {name}",
  /** @deprecated 改用 editorWordCount */
  editorWordCountUnit: "字",
  /** @deprecated 改用 editorDiagnostic */
  editorDiagnosticPrefix: "条提示：",
  // —— 诊断 ——
  diagDepthExceeded: "第 {depth} 层容器 {name} 超出上限 {max}，已按源码显示",
  diagIndentAsCode: "容器内这段内容因缩进（≥4 空格或 tab）被当成代码块；若是排版缩进，请顶格书写",
  diagUnclosedTag: "<{name}> 未闭合，已按延伸到文末处理",
  diagMermaidEmpty: "<{name}> 容器体为空，未生成图表",
  diagMermaidTooLarge: "<{name}> 源码超过 {kb} KB，已改为显示源码",
  diagUnsafeHref:
    "{kind, select, attribute {{label} 的协议不受支持，已降级为不可点击：{url}} link {链接的协议不受支持，已降级为不可点击：{url}} image {图片的协议不受支持，已降级为不可点击：{url}} other {{label} 的协议不受支持，已降级为不可点击：{url}}}",
  diagDuplicateIdAnchor: "div id=\"{id}\" 与标题生成的锚点重复，页面将出现两个同名 id",
  diagDuplicateIdDiv: "div id=\"{id}\" 与第 {first} 行的 div 重复，页面将出现两个同名 id",
  diagUnknownTag: "<{name}> 不是已注册的组件，已按文本显示",
} satisfies UIText;
