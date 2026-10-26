/**
 * @file dev/snapshot.tsx
 * @description 静态快照（方案 B）：SSR 把三篇 fixtures 渲染成一份 HTML，写到 dev/.out/preview.html。
 *   用途是渲染回归比对——改渲染逻辑后重新生成，diff 一眼看出差异；不依赖浏览器，可进 CI。
 *   CSS 由 dev/snapshot.css.vite.config.ts 单独构建，这里负责内联，保证单文件可双击打开。
 * @created 2026-10-26 21:58
 * @updated 2026-10-26 21:58
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownRenderer, roundtrip } from "../src/index";
import { FIXTURES } from "./fixtures";

/** 产物目录（npm 脚本在仓库根执行） */
const OUT_DIR = join(process.cwd(), "dev", ".out");
/** 样式文件（由 CSS 构建单独产出） */
const CSS_FILE = join(OUT_DIR, "assets", "preview.css");

/**
 * 读取构建好的样式并内联
 * @returns CSS 文本；缺失时返回空串
 */
function readCss(): string {
  if (!existsSync(CSS_FILE)) return "";
  return readFileSync(CSS_FILE, "utf8");
}

/**
 * 渲染全部 fixtures 为 HTML 片段
 * @returns 各篇的 section 拼接结果
 */
function renderSections(): string {
  return FIXTURES.map((item) => {
    const body = renderToStaticMarkup(<MarkdownRenderer content={item.content} className="prose-site" />);
    return [
      `<section class="snapshot-section" data-fixture="${item.id}">`,
      `<h2 class="snapshot-title">${item.label}</h2>`,
      body,
      "</section>",
    ].join("\n");
  }).join("\n");
}

/**
 * 拼出完整页面
 * @param css 内联样式
 * @returns 完整 HTML 文档
 */
function renderPage(css: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>md-engine 静态渲染快照</title>
<style>${css}</style>
<style>
  body { margin: 0; background: #fff; }
  .snapshot-section { max-width: 48rem; margin: 0 auto; padding: 24px 16px 40px; border-bottom: 1px dashed #e6ebed; }
  .snapshot-title { font-size: 13px; font-weight: 600; color: #5b6b78; text-transform: uppercase; letter-spacing: .08em; }
</style>
</head>
<body>
${renderSections()}
</body>
</html>
`;
}

/**
 * 往返自检：逐篇比对 `md → AST → md` 是否逐字一致
 * @description 不一致时把序列化结果落到 `dev/.out/roundtrip-<id>.md`，
 *   方便用 diff 工具对比原文，定位是写法问题还是 handler 问题。
 * @returns 不一致的条目（空数组表示全部通过）
 */
function checkRoundtrip(): string[] {
  const failures: string[] = [];
  for (const item of FIXTURES) {
    const out = roundtrip(item.content);
    if (out === item.content) continue;
    let at = 0;
    while (at < item.content.length && item.content[at] === out[at]) at += 1;
    writeFileSync(join(OUT_DIR, `roundtrip-${item.id}.md`), out, "utf8");
    const detail = `${item.id}：首个差异 @${at}（见 roundtrip-${item.id}.md）`;
    // 样例标注为已知差异的不算回归，只提示
    if (item.roundtrip === "strict") failures.push(detail);
    else console.log(`[snapshot] 已知差异（${item.note ?? "无说明"}）→ ${detail}`);
  }
  return failures;
}

mkdirSync(OUT_DIR, { recursive: true });
const css = readCss();
const target = join(OUT_DIR, "preview.html");
writeFileSync(target, renderPage(css), "utf8");

const failures = checkRoundtrip();
console.log(`[snapshot] ${FIXTURES.length} 篇 → ${target}${css ? "（样式已内联）" : "（警告：未找到 preview.css，页面无样式）"}`);
if (failures.length === 0) {
  console.log("[snapshot] 往返自检：标注为 strict 的样例全部逐字一致");
} else {
  for (const line of failures) console.warn(`[snapshot] 往返不一致 → ${line}`);
}
