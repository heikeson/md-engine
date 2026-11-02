/**
 * @file 英语语言包
 * @description 全量满足 `UIText`，编译期强制无缺键。复数分支按 CLDR 区分 one/other。
 *   消息内不使用 ASCII 单引号（ICU 转义符），需要引号处用双引号或改写。
 * @created 2026-11-02 19:32
 * @updated 2026-11-02 19:32
 */

import type { UIText } from "../internal/text";

/** 英语（美国） */
export const enUS = {
  // —— 组件 ——
  imageZoomClose: "Close zoomed image",
  // —— Mermaid ——
  mermaidSourceView: "Source view",
  mermaidLoading: "Rendering diagram…",
  mermaidErrorPrefix: "Diagram failed to render: ",
  mermaidErrorSuffix: " (showing source)",
  mermaidFallbackError: "Diagram failed to render",
  mermaidTimeout: "Diagram rendering timed out",
  mermaidZoomGroup: "Zoom controls",
  mermaidZoomIn: "Zoom in",
  mermaidZoomOut: "Zoom out",
  mermaidZoomReset: "Reset zoom",
  mermaidResetTitle: "Reset",
  mermaidToChart: "Switch to chart",
  mermaidToSource: "View source",
  mermaidChartView: "Chart view",
  mermaidCopied: "Copied",
  mermaidCopySource: "Copy source",
  mermaidDownloadSvg: "Download SVG",
  mermaidDownloadPng: "Download PNG",
  // —— 类型表 ——
  typeTableAttr: "Property",
  typeTableType: "Type",
  typeTableDefault: "Default",
  typeTableDesc: "Description",
  typeItemRequired: "Required",
  typeItemEmpty: "—",
  // —— 编辑器 ——
  editorBold: "Bold",
  editorItalic: "Italic",
  editorStrike: "Strikethrough",
  editorCode: "Inline code",
  editorH2: "H2",
  editorQuote: "Quote",
  editorList: "List",
  editorViewGroup: "View mode",
  editorViewSource: "Edit",
  editorViewSplit: "Split",
  editorViewPreview: "Preview",
  editorFullscreen: "Fullscreen",
  editorExitFullscreen: "Exit fullscreen",
  editorWordCount: "{n, plural, one {# character} other {# characters}}",
  editorDiagnostic: "{n, plural, one {# issue} other {# issues}}: {first}",
  editorWrapPlaceholder: "Text",
  editorPlaceholder: "Write Markdown here. Type an angle bracket to insert a container.",
  editorInsertBlock: "Insert {name}",
  /** @deprecated 改用 editorWordCount */
  editorWordCountUnit: "characters",
  /** @deprecated 改用 editorDiagnostic */
  editorDiagnosticPrefix: "issues: ",
  // —— 诊断 ——
  diagDepthExceeded:
    "Container {name} at depth {depth} exceeds the limit of {max}; rendered as source instead",
  diagIndentAsCode:
    "This content was parsed as a code block because of indentation (4+ spaces or a tab). Outdent it if you meant a paragraph.",
  diagUnclosedTag: "<{name}> is not closed; treated as extending to the end of the document",
  diagMermaidEmpty: "<{name}> is empty; no diagram was generated",
  diagMermaidTooLarge: "<{name}> source exceeds {kb} KB; showing source instead",
  diagUnsafeHref:
    "{kind, select, attribute {{label} has an unsupported protocol and was disabled: {url}} link {The link has an unsupported protocol and was disabled: {url}} image {The image has an unsupported protocol and was disabled: {url}} other {{label} was disabled: {url}}}",
  diagDuplicateIdAnchor:
    "div id=\"{id}\" duplicates a heading anchor; the page will contain two identical ids",
  diagDuplicateIdDiv:
    "div id=\"{id}\" duplicates the div on line {first}; the page will contain two identical ids",
  diagUnknownTag: "<{name}> is not a registered component; rendered as plain text",
} satisfies UIText;
