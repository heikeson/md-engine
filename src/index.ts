/**
 * @file 引擎主入口（SSR 安全）
 * @description 导出语法注册表、解析、渲染与 mdast 双向扩展；序列化（serialize）与格式化（format）
 *   在 P0 后续接入。主入口**禁止**导出编辑器代码（`./editor` 单独入口），否则 CodeMirror 会进入阅读页 chunk。
 * @created 2026-10-24 20:07
 * @updated 2026-10-24 20:27
 * @updated 2026-11-02 10:00 导出 i18n 文案 API（locale 字典 / Provider / useUIText）
 */

export {
  MAX_CONTAINER_DEPTH,
  ITEMS,
  COMPONENTS,
  getComponent,
  getItemSpec,
  listComponents,
  isContainerWithItems,
} from "./registry";

export type { ComponentMode, ComponentSpec, ItemSpec } from "./registry";

export { jsxBlocks } from "./syntax/jsx-flow";
export { default as remarkJsxBlocks } from "./syntax/jsx-remark";
export { jsxFromMarkdown, jsxToMarkdown, parseOpenTag, sliceRawBody } from "./syntax/jsx-mdast";
export type { JsxBlock } from "./syntax/jsx-mdast";

export { MERMAID_MAX_BYTES } from "./policy";
export type { Diagnostic, DiagnosticCode } from "./policy";

export { parse } from "./parse";
export type { ParseOptions, ParseResult } from "./parse";
export { extractBlocks } from "./blocks";
export type { Block, ContainerBlock, ContainerItem, SourceBlock, VisualBlock, Attrs, SourceReason } from "./blocks";

export { serialize, roundtrip } from "./serialize";
export { normalizeMarkdown } from "./format";

export { default as MarkdownRenderer } from "./render";
export type { MarkdownRendererProps, RenderConfig } from "./render";

export { mdxComponents, MermaidPlaceholder } from "./components";
export type { MermaidProps } from "./components";

/**
 * 界面文案（i18n）：内置 zh/en 语言包 + 逐键覆写
 * @description 常规用法只需 `config.locale` / `config.text`；
 *   宿主直接用 `mdxComponents` 时可自包 `UITextProvider` 注入文案
 */
export {
  DEFAULT_UI_TEXT as defaultUIText,
  EN_UI_TEXT as enUIText,
  formatText,
  getUIText,
} from "./internal/text";
export { UITextProvider, useUIText } from "./internal/text-context";
export type { Locale, UIText, UITextPatch } from "./internal/text";
export type { UITextProviderProps } from "./internal/text-context";
