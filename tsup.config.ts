import { defineConfig } from "tsup";

/**
 * 构建配置
 * @description 三个入口分别产出，保证编辑器代码不会被打进主入口
 *   （否则阅读页会连带加载 CodeMirror）。
 *   依赖一律 external：避免重复打包，也避免宿主与本包各持一份实例
 *   （CodeMirror 的 state 与 unified 的 processor 都必须唯一）。
 *   样式不参与 JS 构建：`styles/` 为原生 CSS（无 @apply、无 Tailwind 依赖），
 *   由 `npm run build:css`（esbuild）单独打包成 `dist/styles.css`；
 *   源码分片同时随包发布，可按需单独引入。
 */
export default defineConfig({
  entry: ["src/index.ts", "src/editor/index.ts", "src/components/index.ts"],
  format: ["esm"],
  target: "es2022",
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  external: [
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
  ],
});
