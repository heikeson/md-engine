/**
 * @file dev/snapshot.css.vite.config.ts
 * @description 静态快照的样式构建：以 dev/theme.css 为入口产出 preview.css（Tailwind 已编译，@apply 不复存在）。
 *   与 SSR 构建分开跑，避免 SSR 构建是否输出 CSS 的不确定性。
 * @created 2026-10-26 21:58
 * @updated 2026-10-26 21:58
 */

import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "dev",
  plugins: [tailwindcss()],
  build: {
    outDir: ".out/assets",
    emptyOutDir: false,
    rollupOptions: {
      input: "theme.css",
      output: {
        // 只给样式定名；KaTeX 的 woff2 字体保持原名放进 fonts/，否则会被重命名成 previewN.css
        assetFileNames: (info) => {
          const name = info.names?.[0] ?? "";
          return name.endsWith(".css") ? "preview.css" : "fonts/[name][extname]";
        },
      },
    },
  },
});
