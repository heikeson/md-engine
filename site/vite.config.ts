/**
 * @file Vite 配置
 * @description 站点独立于发布包：root 指向 site/，构建产物进 site/dist。
 *   `@heikeson/md-engine` 一律 alias 到仓库 `src/`，改引擎立刻在官网可见，
 *   无需先 build 一遍 dist——这是官网作为「引擎回归测试」的前提。
 * @created 2026-11-01 23:30
 * @updated 2026-11-01 23:30
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const siteRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(siteRoot, "..");

/** 包名到源码路径的映射，顺序敏感：具体入口必须排在主入口之前 */
const ALIAS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^@heikeson\/md-engine$/, resolve(repoRoot, "src/index.ts")],
  [/^@heikeson\/md-engine\/editor$/, resolve(repoRoot, "src/editor/index.ts")],
  [/^@heikeson\/md-engine\/components$/, resolve(repoRoot, "src/components/index.ts")],
  [/^@heikeson\/md-engine\/mermaid$/, resolve(repoRoot, "src/mermaid/index.tsx")],
  [/^@heikeson\/md-engine\/styles\.css$/, resolve(repoRoot, "styles/index.css")],
  [/^@heikeson\/md-engine\/styles\/(.+)$/, resolve(repoRoot, "styles") + "/$1"],
];

export default defineConfig({
  root: siteRoot,
  base: "/",
  plugins: [react()],
  resolve: {
    alias: ALIAS.map(([find, replacement]) => ({ find, replacement })),
  },
  server: {
    port: 5181,
    strictPort: true,
  },
  build: {
    outDir: resolve(siteRoot, "dist"),
    emptyOutDir: true,
    target: "es2022",
    cssCodeSplit: false,
  },
  ssr: {
    // 全量打进 SSR bundle：源码以 TS 形式引用，交给 Vite 处理，避免 Node 直接吃 .ts
    noExternal: [/.*/],
  },
});
