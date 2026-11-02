/**
 * @file 预渲染脚本
 * @description 以客户端构建产物 index.html 为模板，逐个路由渲染并按目录写出静态文件：
 *   /docs/syntax → dist/docs/syntax/index.html。静态托管按目录取 index.html，
 *   因此深层链接刷新不会 404，也不需要服务端重写规则。
 *   每页替换标题与描述——模板里那一份只属于首页。
 * @created 2026-11-02 00:57
 * @updated 2026-11-02 02:46 按页写 title / description
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(siteRoot, "dist");

// Windows 下动态 import 绝对路径必须显式转成 file:// URL
const ssrEntry = pathToFileURL(resolve(siteRoot, ".ssr/entry-server.js")).href;
const { render, PAGES } = await import(ssrEntry);

const template = await readFile(resolve(distDir, "index.html"), "utf8");
if (!template.includes('<div id="root"></div>')) {
  throw new Error("模板里找不到空的 #root 容器，预渲染会覆盖用户内容，已中止");
}

/**
 * HTML 转义
 * @param text 原始文本
 * @returns 可安全放进属性的字符串
 */
function esc(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/**
 * 替换标题、描述与文档语言
 * @param html 模板
 * @param meta 页面元信息
 * @returns 替换后的文档
 * @description `<html lang>` 必须按页替换：模板里那一份属于中文首页，
 *   英文页面若沿用 `zh-CN`，读屏器与搜索引擎会按中文处理。
 */
function withMeta(html, meta) {
  const lang = meta.lang ?? "zh-CN";
  return html
    .replace(/<html([^>]*?)\slang="[^"]*"/, `<html$1 lang="${esc(lang)}"`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${esc(meta.description)}" />`,
    );
}

/**
 * 把渲染结果注入模板
 * @param html 页面 HTML
 * @param meta 页面元信息
 * @returns 完整文档
 */
function compose(html, meta) {
  const filled = template.replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  return withMeta(filled, meta).replace(
    "</head>",
    `<script>window.__INITIAL_PATH__=${JSON.stringify(meta.path).replace(/</g, "\\u003c")}</script></head>`,
  );
}

/**
 * 写出一个页面
 * @param meta 页面元信息
 * @param fileName 相对 dist 的输出文件
 * @returns 写出的文件路径
 */
async function emit(meta, fileName) {
  const html = compose(render(meta.path), meta);
  const target = resolve(distDir, fileName);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
  return target;
}

let count = 0;
for (const page of PAGES) {
  const fileName = page.path === "/" ? "index.html" : `${page.path.slice(1)}/index.html`;
  await emit(page, fileName);
  count += 1;
}

// 404 与 sitemap：静态托管通常认得 404.html
await emit(
  { path: "/404", title: "页面不存在 · md-engine", description: "这一页不存在。" },
  "404.html",
);
const urls = [...PAGES.map((page) => page.path), "/404"]
  .map((route) => `  <url><loc>https://md-engine.pages.dev${route === "/" ? "/" : route}</loc></url>`)
  .join("\n");
await writeFile(
  resolve(distDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  "utf8",
);

console.log(`预渲染完成：${count} 个页面 + 404 + sitemap.xml`);
