/**
 * @file dev/main.tsx
 * @description 本地开发渲染入口：挂载 React 并引入样式（Tailwind + engine.css + 最小主题令牌）。
 * @created 2026-10-26 21:55
 * @updated 2026-10-26 21:55
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./theme.css";

const container = document.getElementById("root");
if (!container) throw new Error("找不到挂载节点 #root");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
