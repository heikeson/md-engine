import { defineConfig, type Options } from "tsup";

/**
 * 构建配置
 * @description 四个入口分别产出，保证编辑器与图表代码不会被打进主入口
 *   （否则阅读页会连带加载 CodeMirror 或 mermaid）。
 *   依赖一律 external：避免重复打包，也避免宿主与本包各持一份实例
 *   （CodeMirror 的 state 与 unified 的 processor 都必须唯一）。
 *   样式不参与 JS 构建：`styles/` 为原生 CSS（无 @apply、无 Tailwind 依赖），
 *   由 `npm run build:css`（esbuild）单独打包成 `dist/styles.css`；
 *   源码分片同时随包发布，可按需单独引入。
 * @note 产物不带 `"use client"` 指令：打包器会把它当模块级指令剥掉（加 banner 也会被
 *   rollup 再处理时丢弃，且拆双配置会与 clean 竞争导致 d.ts 丢失）。
 *   因此 `/mermaid` 入口须由使用方的**客户端组件**引入——这一点写在对接契约里。
 */

/** 一律外置的依赖（含两个可选 peer：mermaid 与 dompurify） */
const external: Options["external"] = [
  /^react$/,
  /^react-dom/,
  /^react\/jsx-runtime/,
  /^@codemirror\//,
  "lucide-react",
  "unified",
  /^remark-/,
  /^rehype-/,
  /^mdast-/,
  /^micromark-/,
  "mdast-util-from-markdown",
  "mdast-util-to-markdown",
  "mdast-util-to-hast",
  "mdast-util-gfm",
  "hast-util-to-jsx-runtime",
  "unist-util-visit",
  "clsx",
  "tailwind-merge",
  "katex",
  // 可选 peer：使用方自己安装，未安装时本入口的产物仍然可解析（运行时才失败并降级）
  "mermaid",
  "dompurify",
];

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "editor/index": "src/editor/index.ts",
    "components/index": "src/components/index.ts",
    // 图表入口独立产出：mermaid 与 dompurify 只从这条入口进入产物
    "mermaid/index": "src/mermaid/index.tsx",
  },
  format: ["esm"],
  target: "es2022",
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  external,
});
