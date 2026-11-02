/**
 * @file 文档清单
 * @description 官网的文档源是纯 Markdown：内容由引擎自身渲染，页面外壳由站点提供。
 *   元数据（标题 / 摘要 / 分组）写在这里而不是 frontmatter——引擎不解析 frontmatter，
 *   硬塞进去会出现在正文里。
 *
 *   多语言：文档按语言分桶，分组用**语言无关的 key**（`start` / `syntax` / `advanced`），
 *   显示名由 `GROUP_TITLE` 提供。这样新增一种语言只需加一个桶，不必再动类型。
 * @created 2026-11-01 23:40
 * @updated 2026-11-01 23:40
 * @updated 2026-11-02 20:18 按语言分桶，分组改为 key + 显示名表，新增英文文档
 */

import type { SiteLocale } from "../i18n";

import editorRaw from "./docs/editor.md?raw";
import quickStartRaw from "./docs/quick-start.md?raw";
import stylingRaw from "./docs/styling.md?raw";
import syntaxRaw from "./docs/syntax.md?raw";

import editorEn from "./docs/en/editor.md?raw";
import quickStartEn from "./docs/en/quick-start.md?raw";
import stylingEn from "./docs/en/styling.md?raw";
import syntaxEn from "./docs/en/syntax.md?raw";

/** 文档分组 key（语言无关），决定侧边栏的段落顺序 */
export type DocGroupKey = "start" | "syntax" | "advanced";

/** 一篇文档 */
export interface DocEntry {
  /** 路由段，如 quick-start → /docs/quick-start */
  slug: string;
  title: string;
  summary: string;
  group: DocGroupKey;
  /** Markdown 正文 */
  body: string;
}

/** 中文文档，顺序即侧边栏顺序 */
const ZH_DOCS: readonly DocEntry[] = [
  {
    slug: "quick-start",
    title: "快速开始",
    summary: "安装、引入样式、渲染第一段内容",
    group: "start",
    body: quickStartRaw,
  },
  {
    slug: "syntax",
    title: "容器语法",
    summary: "9 种容器与书写约束",
    group: "syntax",
    body: syntaxRaw,
  },
  {
    slug: "editor",
    title: "编辑器与图表",
    summary: "MarkdownEditor 与交互式 Mermaid",
    group: "advanced",
    body: editorRaw,
  },
  {
    slug: "styling",
    title: "样式与令牌",
    summary: "9 个 --lkes-* 令牌与亮暗两套值",
    group: "advanced",
    body: stylingRaw,
  },
];

/** 英文文档，slug 与中文一一对应 */
const EN_DOCS: readonly DocEntry[] = [
  {
    slug: "quick-start",
    title: "Quick start",
    summary: "Install, import styles, render the first block",
    group: "start",
    body: quickStartEn,
  },
  {
    slug: "syntax",
    title: "Container syntax",
    summary: "Nine containers and the rules for writing them",
    group: "syntax",
    body: syntaxEn,
  },
  {
    slug: "editor",
    title: "Editor and diagrams",
    summary: "MarkdownEditor and interactive Mermaid",
    group: "advanced",
    body: editorEn,
  },
  {
    slug: "styling",
    title: "Styles and tokens",
    summary: "Nine --lkes-* tokens with light and dark values",
    group: "advanced",
    body: stylingEn,
  },
];

/** 按语言取全部文档 */
export const DOCS_BY_LOCALE: Readonly<Record<SiteLocale, readonly DocEntry[]>> = {
  "zh-CN": ZH_DOCS,
  "en-US": EN_DOCS,
};

/** 侧边栏分组顺序 */
export const GROUP_ORDER: readonly DocGroupKey[] = ["start", "syntax", "advanced"];

/** 分组显示名 */
export const GROUP_TITLE: Readonly<Record<SiteLocale, Readonly<Record<DocGroupKey, string>>>> = {
  "zh-CN": { start: "入门", syntax: "语法", advanced: "进阶" },
  "en-US": { start: "Getting started", syntax: "Syntax", advanced: "Advanced" },
};

/**
 * 取某语言的全部文档
 * @param locale 语言
 * @returns 文档列表（顺序即侧边栏顺序）
 */
export function docsOf(locale: SiteLocale): readonly DocEntry[] {
  return DOCS_BY_LOCALE[locale] ?? ZH_DOCS;
}

/**
 * 按 slug 取文档
 * @param slug 路由段
 * @param locale 语言
 * @returns 文档；不存在返回 undefined
 */
export function findDoc(slug: string, locale: SiteLocale): DocEntry | undefined {
  return docsOf(locale).find((doc) => doc.slug === slug);
}

/**
 * 取上一篇 / 下一篇
 * @param slug 当前路由段
 * @param locale 语言
 * @returns 相邻文档，边界处为 undefined
 */
export function docNeighbors(
  slug: string,
  locale: SiteLocale,
): {
  prev?: DocEntry;
  next?: DocEntry;
} {
  const docs = docsOf(locale);
  const index = docs.findIndex((doc) => doc.slug === slug);
  if (index < 0) return {};
  return { prev: docs[index - 1], next: docs[index + 1] };
}

/**
 * 某语言的全部文档逻辑路径（不含语言前缀），供预渲染遍历
 * @param locale 语言
 * @returns 逻辑路径列表
 */
export function docPaths(locale: SiteLocale): readonly string[] {
  return docsOf(locale).map((doc) => `/docs/${doc.slug}`);
}

/** 中文文档逻辑路径（兼容旧调用） */
export const DOC_PATHS: readonly string[] = docPaths("zh-CN");

/** 中文文档（兼容旧调用，新代码请用 `docsOf(locale)`） */
export const DOCS: readonly DocEntry[] = ZH_DOCS;
