/**
 * @file UI 文案字典（i18n 基底，纯函数无 React）
 * @description 引擎内置中文（默认）与英文两套界面文案；所有用户可见的界面字符串都从这里取，
 *   组件内不得再写死文案。诊断消息（policy 层）不在本字典内——面向写作者的排错提示保持中文。
 *   优先级：`text` 逐键覆写 > `locale` 语言包 > 内置 zh。
 *   带 `{name}` 占位的模板由 `formatText` 填充，覆写时须保留占位符。
 * @created 2026-11-02 10:00
 */

/** 支持的界面语言 */
export type Locale = "zh" | "en";

/** 界面文案全集（值为字符串；含占位的键见注释） */
export interface UIText {
  /** 图表工具栏：源码态标签 */
  sourceView: string;
  /** 图表工具栏：图表态标签 */
  chartView: string;
  /** 图表工具栏 title：源码态时点击切回图表 */
  switchToChart: string;
  /** 图表工具栏 title：图表态时点击看源码 */
  viewSource: string;
  /** 复制源码按钮 */
  copySource: string;
  /** 复制成功反馈 */
  copied: string;
  /** 下载 SVG 按钮 */
  downloadSvg: string;
  /** 下载 PNG 按钮 */
  downloadPng: string;
  /** 图表渲染中提示 */
  mermaidLoading: string;
  /** 图表渲染失败提示，占位：{error} */
  mermaidFailed: string;
  /** 缩放按钮组 aria-label */
  zoomControls: string;
  /** 放大 */
  zoomIn: string;
  /** 缩小 */
  zoomOut: string;
  /** 重置缩放（aria-label） */
  resetZoom: string;
  /** 重置（title） */
  reset: string;
  /** 图片放大遮罩 aria-label */
  closeZoomImage: string;
  /** TypeTable 表头：属性 */
  thProp: string;
  /** TypeTable 表头：类型 */
  thType: string;
  /** TypeTable 表头：默认值 */
  thDefault: string;
  /** TypeTable 表头：说明 */
  thDesc: string;
  /** TypeItem 必填标记 */
  required: string;
  /** 编辑器视图：编辑 */
  viewEdit: string;
  /** 编辑器视图：分屏 */
  viewSplit: string;
  /** 编辑器视图：预览 */
  viewPreview: string;
  /** 编辑器视图切换组 aria-label */
  viewSwitch: string;
  /** 工具栏：粗体 */
  bold: string;
  /** 工具栏：斜体 */
  italic: string;
  /** 工具栏：删除线 */
  strike: string;
  /** 工具栏：行内码 */
  inlineCode: string;
  /** 工具栏：引用 */
  quote: string;
  /** 工具栏：列表 */
  list: string;
  /** 全屏按钮 */
  fullscreen: string;
  /** 退出全屏按钮 */
  exitFullscreen: string;
  /** 状态栏字数，占位：{count} */
  charCount: string;
  /** 状态栏首条诊断，占位：{count}、{message} */
  diagnosticsHint: string;
  /** 空选区包裹时插入的占位文字 */
  wrapPlaceholder: string;
}

/** 内置中文（默认语言包） */
export const DEFAULT_UI_TEXT: UIText = {
  sourceView: "源码视图",
  chartView: "图表视图",
  switchToChart: "切换到图表",
  viewSource: "查看源码",
  copySource: "复制源码",
  copied: "已复制",
  downloadSvg: "下载 SVG",
  downloadPng: "下载 PNG",
  mermaidLoading: "正在渲染图表…",
  mermaidFailed: "图表渲染失败：{error}（已显示源码）",
  zoomControls: "缩放控制",
  zoomIn: "放大",
  zoomOut: "缩小",
  resetZoom: "重置缩放",
  reset: "重置",
  closeZoomImage: "关闭放大图片",
  thProp: "属性",
  thType: "类型",
  thDefault: "默认值",
  thDesc: "说明",
  required: "必填",
  viewEdit: "编辑",
  viewSplit: "分屏",
  viewPreview: "预览",
  viewSwitch: "视图切换",
  bold: "粗体",
  italic: "斜体",
  strike: "删除线",
  inlineCode: "行内码",
  quote: "引用",
  list: "列表",
  fullscreen: "全屏",
  exitFullscreen: "退出全屏",
  charCount: "{count} 字",
  diagnosticsHint: "{count} 条提示：{message}",
  wrapPlaceholder: "文本",
};

/** 内置英文 */
export const EN_UI_TEXT: UIText = {
  sourceView: "Source",
  chartView: "Diagram",
  switchToChart: "Switch to diagram",
  viewSource: "View source",
  copySource: "Copy source",
  copied: "Copied",
  downloadSvg: "Download SVG",
  downloadPng: "Download PNG",
  mermaidLoading: "Rendering diagram…",
  mermaidFailed: "Diagram failed: {error} (source shown)",
  zoomControls: "Zoom controls",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  resetZoom: "Reset zoom",
  reset: "Reset",
  closeZoomImage: "Close enlarged image",
  thProp: "Prop",
  thType: "Type",
  thDefault: "Default",
  thDesc: "Description",
  required: "Required",
  viewEdit: "Edit",
  viewSplit: "Split",
  viewPreview: "Preview",
  viewSwitch: "View switcher",
  bold: "Bold",
  italic: "Italic",
  strike: "Strikethrough",
  inlineCode: "Code",
  quote: "Quote",
  list: "List",
  fullscreen: "Fullscreen",
  exitFullscreen: "Exit fullscreen",
  charCount: "{count} characters",
  diagnosticsHint: "{count} issue(s): {message}",
  wrapPlaceholder: "text",
};

/** 语言包查表；未知 locale 回落中文 */
const LOCALE_PACKS: Record<Locale, UIText> = {
  zh: DEFAULT_UI_TEXT,
  en: EN_UI_TEXT,
};

/** 逐键覆写补丁 */
export type UITextPatch = Partial<UIText>;

/**
 * 取合并后的文案：locale 选基底，text 逐键覆写
 * @param locale 界面语言，缺省中文
 * @param patch 逐键覆写（宿主改措辞用）
 * @returns 完整文案字典
 */
export function getUIText(locale?: Locale, patch?: UITextPatch): UIText {
  const base = (locale && LOCALE_PACKS[locale]) || DEFAULT_UI_TEXT;
  return patch ? { ...base, ...patch } : base;
}

/**
 * 填充模板占位（`{name}` 形式）
 * @param template 含占位的模板串
 * @param params 占位值；缺失的占位原样保留
 * @returns 填充后的字符串
 */
export function formatText(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}
