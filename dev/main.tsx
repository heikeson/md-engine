/**
 * @file dev/main.tsx
 * @description 本地开发渲染入口：挂载 React 并引入样式（Tailwind + 引擎样式 + 最小主题令牌）。
 *   额外套一层错误边界：渲染抛错时把错误画在页面上，避免 React 直接卸载整棵树导致「整页白屏、无任何线索」。
 * @created 2026-10-26 21:55
 * @updated 2026-10-28 11:52 增加 dev 错误边界，白屏改为可读错误
 */

import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./theme.css";

/** 错误边界状态 */
interface BoundaryState {
  /** 错误文本；null 表示未出错 */
  message: string | null;
}

/**
 * dev 专用错误边界
 * @description 只在开发页使用：捕获渲染阶段异常并在页面上展示，控制台同时打印组件栈。
 */
class DevErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { message: null };

  /**
   * 由 React 在子树抛错时调用
   * @param error 抛出的异常
   * @returns 新的边界状态
   */
  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { message: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }

  /**
   * 出错后的副作用：把完整异常与组件栈打到控制台
   * @param error 抛出的异常
   * @param info React 提供的组件栈
   */
  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("[dev] 渲染失败", error, info.componentStack);
  }

  /**
   * 渲染：出错时展示错误面板，否则透传子树
   * @returns 页面内容
   */
  render(): ReactNode {
    const { message } = this.state;
    if (!message) return this.props.children;
    return (
      <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13, lineHeight: 1.7 }}>
        <strong style={{ color: "#c0392b" }}>dev 渲染失败</strong>
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{message}</pre>
        <p style={{ color: "#666" }}>完整异常与组件栈已打印到控制台；改完源码后保存即可热更新重试。</p>
      </div>
    );
  }
}

const container = document.getElementById("root");
if (!container) throw new Error("找不到挂载节点 #root");

createRoot(container).render(
  <StrictMode>
    <DevErrorBoundary>
      <App />
    </DevErrorBoundary>
  </StrictMode>,
);
