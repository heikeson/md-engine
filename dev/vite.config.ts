/**
 * @file dev/vite.config.ts
 * @description 本地开发渲染的 Vite 配置：以 `dev/` 为根，直接消费 `src/` 与 `styles/engine.css` 源码，
 *   改动源码即热更新，无需构建、无需发布、不影响宿主。
 * @created 2026-10-26 21:50
 * @updated 2026-10-26 21:50
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // 相对 process.cwd()（npm 脚本在仓库根执行），dev/ 作为站点根
  root: "dev",
  publicDir: "public",
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    // 避开宿主 blog 的 3000 端口
    port: 5180,
    strictPort: true,
  },
});
