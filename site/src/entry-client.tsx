/**
 * @file 客户端入口
 * @description 对预渲染出的 HTML 做 hydrate，而不是重新挂载整棵树。
 *   初始路径由服务端注入后序列化到 window，客户端读取同一个值，避免不一致。
 * @created 2026-11-02 00:52
 * @updated 2026-11-02 00:52
 */

import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import App from "./App";
import { RouterProvider, normalizePath } from "./router";

declare global {
  interface Window {
    __INITIAL_PATH__?: string;
  }
}

const container = document.getElementById("root");
const initialPath = normalizePath(window.__INITIAL_PATH__ ?? window.location.pathname);

if (container) {
  hydrateRoot(
    container,
    <StrictMode>
      <RouterProvider initialPath={initialPath}>
        <App />
      </RouterProvider>
    </StrictMode>,
  );
}
