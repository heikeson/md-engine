/**
 * @file 文档清单
 * @description 官网的文档源是纯 Markdown：内容由引擎自身渲染，页面外壳由站点提供。
 *   元数据（标题 / 摘要 / 分组）写在这里而不是 frontmatter——引擎不解析 frontmatter，
 *   硬塞进去会出现在正文里。
 * @created 2026-11-01 23:40
 * @updated 2026-11-01 23:40
 */

import editorRaw from "./docs/editor.md?raw";
import quickStartRaw from "./docs/quick-start.md?raw";
import stylingRaw from "./docs/styling.md?raw";
import syntaxRaw from "./docs/syntax.md?raw";

/** 文档分组，决定侧边栏的段落顺序 */
export type DocGroup = "入门" | "语法" | "进阶";

/** 一篇文档 */
export interface DocEntry {
  /** 路由段，如 quick-start → /docs/quick-start */
  slug: string;
  title: string;
  summary: string;
  group: DocGroup;
  /** Markdown 正文 */
  body: string;
}

/** 全部文档，顺序即侧边栏顺序 */
export const DOCS: readonly DocEntry[] = [
  {
    slug: "quick-start",
    title: "快速开始",
    summary: "安装、引入样式、渲染第一段内容",
    group: "入门",
    body: quickStartRaw,
  },
  {
    slug: "syntax",
    title: "容器语法",
    summary: "9 种容器与书写约束",
    group: "语法",
    body: syntaxRaw,
  },
  {
    slug: "editor",
    title: "编辑器与图表",
    summary: "MarkdownEditor 与交互式 Mermaid",
    group: "进阶",
    body: editorRaw,
  },
  {
    slug: "styling",
    title: "样式与令牌",
    summary: "9 个 --lkes-* 令牌与亮暗两套值",
    group: "进阶",
    body: stylingRaw,
  },
] as const;

/** 侧边栏分组顺序 */
export const GROUP_ORDER: readonly DocGroup[] = ["入门", "语法", "进阶"];

/**
 * 按 slug 取文档
 * @param slug 路由段
 * @returns 文档；不存在返回 undefined
 */
export function findDoc(slug: string): DocEntry | undefined {
  return DOCS.find((doc) => doc.slug === slug);
}

/**
 * 取上一篇 / 下一篇
 * @param slug 当前路由段
 * @returns 相邻文档，边界处为 undefined
 */
export function docNeighbors(slug: string): {
  prev?: DocEntry;
  next?: DocEntry;
} {
  const index = DOCS.findIndex((doc) => doc.slug === slug);
  if (index < 0) return {};
  return { prev: DOCS[index - 1], next: DOCS[index + 1] };
}

/** 全部文档路由，供预渲染遍历 */
export const DOC_PATHS: readonly string[] = DOCS.map((doc) => `/docs/${doc.slug}`);
