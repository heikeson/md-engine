/**
 * @file 插入片段模板
 * @description 组件名一律取自 `registry`，模板只描述"骨架"（标签 + 子项 + 空行），
 *   禁止在别处硬编码 `<Callout` 之类的字符串。
 * @created 2026-10-24 21:12
 * @updated 2026-10-24 21:58 容器子项支持数组（Files 混用 Folder / File）
 */

import { COMPONENTS } from "../registry";

/** Callout 的默认类型 */
const DEFAULT_CALLOUT_TYPE = "note";

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
 * @returns 可直接插入的 Markdown 片段；未知组件返回空串
 */
export function blockSnippet(name: string): string {
  const spec = COMPONENTS[name];
  if (!spec) return "";

  if (spec.selfClosing) {
    return `<${name} src="" alt="" />\n`;
  }

  if (name === "Files") return FILES_SNIPPET;

  if (name === "TypeTable") {
    return `<TypeTable>
<TypeItem name="id" type="string" required>
唯一标识
</TypeItem>
<TypeItem name="label" type="string" default="—">
显示名称
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
    const attr = item === "Tab" ? 'value="标签"' : 'title="标题"';
    return `<${name}>\n<${item} ${attr}>\n内容\n</${item}>\n</${name}>\n`;
  }

  const attrs = name === "Callout" ? ` type="${DEFAULT_CALLOUT_TYPE}"` : "";
  return `<${name}${attrs}>\n内容\n</${name}>\n`;
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
  "Image",
] as const;
