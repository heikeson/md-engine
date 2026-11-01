/**
 * @file 图表占位骨架（SSR 安全）
 * @description 主入口只渲染"可被增强的骨架"：卡片 + 工具栏文字 + 源码区。
 *   本文件不引入 mermaid、不碰 DOM，也不引用 `/mermaid` 目录下的任何模块；
 *   未接入交互入口时，读者看到的是源码而不是空白（渐进增强的降级面）。
 * @created 2026-11-01 21:12
 * @updated 2026-11-01 22:29 改为卡片式骨架（与交互视图同布局），内联源码图标以保持主入口零图表依赖
 * @updated 2026-11-01 22:37 标题并入工具栏左侧，与交互视图同布局
 * @updated 2026-11-01 23:18 height 未指定 / 空 / auto 一律自动高度（不再固定 420px）
 */

import type { ReactElement } from "react";

/**
 * 图表组件 props（占位骨架与 `/mermaid` 入口的交互组件共用同一签名）
 * @description 只增不改：新增字段必须有默认值，宿主可直接把这个签名当成契约。
 */
export interface MermaidProps {
  /** 图表源码原文（未转义） */
  raw?: string;
  /** 源码兼容别名（与宿主既有 `Mermaid code={raw}` 调用对齐） */
  code?: string;
  /** 图表标题，渲染为题注 */
  title?: string;
  /** 图表区高度上限（数字字符串，非法值回落默认） */
  height?: string;
  /** 源码超出体积上限：只显示源码，不加载图表引擎 */
  tooLarge?: boolean;
  /** hast 透传的其余属性 */
  [key: string]: unknown;
}

/**
 * 解析图表区高度上限
 * @param height 容器属性（数字 / "auto" / 空）
 * @returns 正数返回 `{n}px`；未指定、空、`"auto"` 或非法值返回 undefined（不限高，随内容自适应）
 * @description 缺省即自动高度：图表多高就多高，超长时由页面滚动接管，
 *   不再用一个写死的 420px 把大图裁掉。
 */
function viewportHeight(height?: string): string | undefined {
  const raw = (height ?? "").trim().toLowerCase();
  if (!raw || raw === "auto") return undefined;
  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric > 0 ? `${Math.round(numeric)}px` : undefined;
}

/**
 * 源码图标（内联，避免主入口引用 `/mermaid` 目录）
 * @returns 尖括号 svg
 */
function SourceIcon(): ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

/**
 * 图表占位骨架
 * @param props 源码、标题、高度与超限标记
 * @returns `figure` 骨架（题注 + 工具栏文字 + 源码），全程不产生任何 DOM 副作用
 */
export default function MermaidPlaceholder({
  raw,
  code,
  title,
  height,
  tooLarge,
}: MermaidProps): ReactElement {
  const source = raw ?? code ?? "";
  // state 供样式与宿主调试用：pending 表示等待交互入口增强，empty / too-large 是两种降级
  const state = tooLarge ? "too-large" : source.trim() ? "pending" : "empty";
  return (
    <figure className="lkes-mermaid" data-mermaid="" data-state={state}>
      <div className="lkes-mermaid-header">
        <div className="lkes-mermaid-leading">
          <span className="lkes-mermaid-mode" aria-hidden="true">
            <SourceIcon />
            <span>源码视图</span>
          </span>
          {title ? <span className="lkes-mermaid-title">{title}</span> : null}
        </div>
      </div>
      <div className="lkes-mermaid-body" style={{ maxHeight: viewportHeight(height) }}>
        <pre className="lkes-mermaid-source">
          <code>{source}</code>
        </pre>
      </div>
    </figure>
  );
}
