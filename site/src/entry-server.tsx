/**
 * @file 服务端渲染入口
 * @description 供预渲染脚本调用：给定路径返回整页 HTML。
 *   页面元信息（标题 / 描述 / 语言）也在这里定义——静态页面各有一份，不能都沿用模板的标题。
 *   引擎本身 SSR 安全，构建过程因此顺便验证了「服务端能跑」这条承诺。
 *
 *   语言维度：默认语言（中文）路径无前缀，英文一律 `/en`。英文站暂只开放首页与 Playground，
 *   文档站等英文正文就绪后再开，避免出现「英文界面 + 中文正文」的半成品。
 * @created 2026-11-02 00:54
 * @updated 2026-11-02 02:44 输出按页元信息
 * @updated 2026-11-02 19:32 生成英文路由（/en、/en/playground）并输出页面语言
 */

import { renderToString } from "react-dom/server";
import App from "./App";
import { DOCS } from "./content/docs";
import { messagesOf, type SiteLocale } from "./i18n";
import { RouterProvider, normalizePath } from "./router";

/** 一页的静态元信息 */
export interface PageMeta {
  path: string;
  title: string;
  description: string;
  /** 页面语言，写入 `<html lang>` */
  lang: SiteLocale;
}

const BRAND = "md-engine";

/** 英文站文案 */
const EN = messagesOf("en-US");

/** 首页 */
const HOME_META: PageMeta = {
  path: "/",
  title: `${BRAND} · React 的 Markdown 内容引擎`,
  description:
    "把 <Callout>、<Tabs> 这类尖括号容器解析成 mdast 节点，渲染成 React 组件，写回时逐字还原。",
  lang: "zh-CN",
};

/** 全部需要生成静态文件的路由 */
export const PAGES: readonly PageMeta[] = [
  HOME_META,
  {
    path: "/docs",
    title: `文档 · ${BRAND}`,
    description: "安装、容器语法、编辑器与图表、样式与令牌。",
    lang: "zh-CN",
  },
  ...DOCS.map((doc) => ({
    path: `/docs/${doc.slug}`,
    title: `${doc.title} · ${BRAND}`,
    description: doc.summary,
    lang: "zh-CN" as SiteLocale,
  })),
  {
    path: "/playground",
    title: `Playground · ${BRAND}`,
    description: "在浏览器里直接编辑 Markdown，看容器实时渲染，并检查往返是否一致。",
    lang: "zh-CN",
  },
  {
    path: "/en",
    title: EN.titleHome,
    description:
      "Parses angle-bracket containers such as <Callout> and <Tabs> into mdast nodes, renders them as React components, and writes them back verbatim.",
    lang: "en-US",
  },
  {
    path: "/en/playground",
    title: EN.titlePlayground,
    description:
      "Edit Markdown in the browser, watch containers render live, and check whether the round trip is lossless.",
    lang: "en-US",
  },
];

/** 兼容旧调用：仅路径列表 */
export const ROUTES: readonly string[] = PAGES.map((page) => page.path);

/**
 * 渲染一个路径
 * @param path 目标路径
 * @returns HTML 字符串（不含外壳）
 */
export function render(path: string): string {
  return renderToString(
    <RouterProvider initialPath={normalizePath(path)}>
      <App />
    </RouterProvider>,
  );
}
