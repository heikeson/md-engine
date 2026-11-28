/**
 * @file 插入片段模板
 * @description 组件名一律取自 `registry`，模板只描述"骨架"（标签 + 子项 + 空行），
 *   禁止在别处硬编码 `<Callout` 之类的字符串。
 *
 *   骨架里的**占位文字**（正文、标题、图表节点…）随生效语言变化：文案键带 `editorSnippet`
 *   前缀，默认值取中文语言包。未显式传 `SnippetTexts` 时退回中文默认值，宿主自建工具栏
 *   只需把 `useUIText()` 的结果透传进来即可。
 * @created 2026-10-24 21:12
 * @updated 2026-11-28 14:10 骨架占位文字改由语言包提供，不再硬编码中文
 */

import { COMPONENTS } from "../registry";
import { zhCN } from "../locales/zh-CN";
import type { UIText } from "../internal/text";

/** Callout 的默认类型 */
const DEFAULT_CALLOUT_TYPE = "note";

/**
 * 骨架占位文字（`UIText` 中的 `editorSnippet*` 子集）
 * @description 单独取子集，宿主自建工具栏时可以只准备这几项；完整文案表天然满足。
 */
export type SnippetTexts = Pick<
  UIText,
  | "editorSnippetContent"
  | "editorSnippetTitle"
  | "editorSnippetTabLabel"
  | "editorSnippetChartTitle"
  | "editorSnippetDiagramStart"
  | "editorSnippetDiagramDecision"
  | "editorSnippetDiagramAction"
  | "editorSnippetDiagramYes"
  | "editorSnippetPropId"
  | "editorSnippetPropLabel"
>;

/** 缺省占位文字（中文语言包，与 `UIText` 同一份来源） */
const DEFAULT_SNIPPET_TEXTS: SnippetTexts = zhCN;

/** 文件树骨架：容器必须顶格（缩进 ≥4 空格会被当成缩进代码块） */
const FILES_SNIPPET = `<Files>
<Folder name="src" defaultOpen>
<File name="index.ts" />
<File name="app.tsx" />
</Folder>
<File name="package.json" />
</Files>
`;

/**
 * 生成容器的插入骨架
 * @param name 组件名（须存在于 registry）
 * @param texts 骨架占位文字（默认中文）
 * @returns 可直接插入的 Markdown 片段；未知组件返回空串
 */
export function blockSnippet(
  name: string,
  texts: SnippetTexts = DEFAULT_SNIPPET_TEXTS,
): string {
  const spec = COMPONENTS[name];
  if (!spec) return "";

  const {
    editorSnippetContent: content,
    editorSnippetTitle: title,
    editorSnippetTabLabel: tabLabel,
    editorSnippetChartTitle: chartTitle,
    editorSnippetDiagramStart: start,
    editorSnippetDiagramDecision: decision,
    editorSnippetDiagramAction: action,
    editorSnippetDiagramYes: yes,
    editorSnippetPropId: propId,
    editorSnippetPropLabel: propLabel,
  } = texts;

  // 图表容器：容器体是原始文本（不走 Markdown 解析），给一段可直接改的流程图骨架。
  // 必须在 selfClosing 分支之前——Mermaid 允许 `<Mermaid />`，但骨架不能是自闭合形态。
  if (spec.rawBody) {
    return `<${name} title="${chartTitle}">\ngraph TD\n  A[${start}] --> B{${decision}}\n  B -->|${yes}| C[${action}]\n</${name}>\n`;
  }

  if (spec.selfClosing) {
    // 自闭合叶子里只有 Video 没有 alt；其余（Image）沿用图片骨架
    return name === "Video" ? '<Video src="" caption="" />\n' : `<${name} src="" alt="" />\n`;
  }

  if (name === "Files") return FILES_SNIPPET;

  if (name === "Columns") {
    // 多列骨架：两列各占 1 份，改 width 即可调比例
    return `<Columns>
<Column width="1">
${content}
</Column>
<Column width="1">
${content}
</Column>
</Columns>
`;
  }

  if (name === "Timeline") {
    // 时间线骨架：date / title 写在属性里，正文是条目内容
    return `<Timeline>
<TimelineItem date="2026-01" title="${title}">
${content}
</TimelineItem>
</Timeline>
`;
  }

  if (name === "TypeTable") {
    return `<TypeTable>
<TypeItem name="id" type="string" required>
${propId}
</TypeItem>
<TypeItem name="label" type="string" default="—">
${propLabel}
</TypeItem>
</TypeTable>
`;
  }

  const itemNames = spec.items
    ? Array.isArray(spec.items)
      ? spec.items
      : [spec.items as string]
    : [];

  if (itemNames.length > 0) {
    const item = itemNames[0];
    const attr = item === "Tab" ? `value="${tabLabel}"` : `title="${title}"`;
    return `<${name}>\n<${item} ${attr}>\n${content}\n</${item}>\n</${name}>\n`;
  }

  const attrs = name === "Callout" ? ` type="${DEFAULT_CALLOUT_TYPE}"` : "";
  return `<${name}${attrs}>\n${content}\n</${name}>\n`;
}

/** 工具栏里可一键插入的容器顺序 */
export const INSERTABLE_BLOCKS = [
  "Callout",
  "Tabs",
  "Steps",
  "Cards",
  "Accordion",
  "Files",
  "TypeTable",
  "Columns",
  "Timeline",
  "Image",
  "Video",
  "Mermaid",
] as const;
