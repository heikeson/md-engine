/**
 * @file dev/snapshot.vite.config.ts
 * @description 静态快照的 SSR 构建：把 dev/snapshot.tsx 打成 Node 可直接运行的 ESM 单文件，
 *   依赖一律 external（由 node_modules 解析），只打包仓库内源码。
 * @created 2026-10-26 21:58
 * @updated 2026-10-26 21:58
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "dev",
  plugins: [react()],
  build: {
    ssr: "snapshot.tsx",
    outDir: ".out",
    // 不清空输出目录：产物名固定，覆盖即可；清空会触发上层安全删除代理，反复失败
    emptyOutDir: false,
    target: "node20",
    rollupOptions: {
      // 只有裸包名（react / unified 等）与 node: 内置模块交给 Node 解析；
      // 相对路径、绝对路径、Windows 盘符路径与虚拟模块（\0 前缀）一律内联打包。
      external: (id: string) => {
        if (id.startsWith("\0") || id.startsWith(".") || id.startsWith("/")) return false;
        if (/^[A-Za-z]:[\\/]/.test(id)) return false;
        return true;
      },
      output: { entryFileNames: "snapshot.mjs" },
    },
  },
});
