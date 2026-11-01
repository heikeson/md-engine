/**
 * @file 交互式图表视图（客户端）
 * @description 卡片结构：顶部工具栏 + 图表区（或源码区）+ 右下角悬浮缩放条。
 *   未出图前一律显示源码——无 JS、加载失败、超限、空源码四种情况都不会白屏。
 * @created 2026-11-01 21:30
 * @updated 2026-11-01 22:29 改为「顶部工具栏 + 右下角缩放条」的卡片式布局
 * @updated 2026-11-01 22:37 标题并入工具栏；暗色与取色按图表容器判定；手势仅在出图后启用
 * @updated 2026-11-01 22:51 导出 PNG 底色改走 resolveChartTokens
 */

"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import type { MermaidProps } from "../components/mermaid-placeholder";
import { downloadPng, downloadSvg } from "./export";
import MermaidHeader from "./header";
import { ResetIcon, ZoomInIcon, ZoomOutIcon } from "./icons";
import { useIsDark } from "./use-dark";
import { resolveChartTokens, useMermaidRender } from "./use-render";
import { usePanZoom } from "./use-zoom";

/** 默认视口高度上限（px） */
const DEFAULT_HEIGHT = 420;

/** 进入视口前预留的余量，提前触发加载 */
const PRELOAD_MARGIN = "200px 0px";

/**
 * 把 height 属性解析成图表区高度上限
 * @param height 容器属性值
 * @returns `{n}px`，非法值回落默认
 */
function viewportHeight(height?: string): string {
  const value = Number(height);
  return Number.isFinite(value) && value > 0 ? `${Math.round(value)}px` : `${DEFAULT_HEIGHT}px`;
}

/**
 * 交互式图表
 * @param props 源码、标题、高度与超限标记（与占位骨架同一签名）
 * @returns 卡片式图表视图
 */
export default function MermaidChart({ raw, code, title, height, tooLarge }: MermaidProps): ReactElement {
  const source = String(raw ?? code ?? "");
  const disabled = Boolean(tooLarge) || source.trim() === "";
  const frameRef = useRef<HTMLDivElement>(null);
  // 暗色判定与取色都基于图表所在容器：站点可能把 .dark 挂在局部容器上
  const dark = useIsDark(frameRef);
  const [visible, setVisible] = useState(false);
  const [showSource, setShowSource] = useState(disabled);
  const { status, svg, error } = useMermaidRender(source, visible && !disabled, dark, frameRef);
  const canExport = status === "ready";
  const ready = canExport && !showSource;
  // 手势只在「图已挂载」时启用：canvas 未渲染时 ref 为空，提前绑定滚轮会绑不到元素
  const zoom = usePanZoom(ready);

  // 进入视口才加载 mermaid：不使用图表的页面不承担它的体积与主线程开销
  useEffect(() => {
    const node = frameRef.current;
    if (!node || disabled) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [disabled]);

  // 渲染失败降级为源码：错误提示 + 源码比白屏可诊断
  useEffect(() => {
    if (status === "error") setShowSource(true);
  }, [status]);

  const state = disabled ? (tooLarge ? "too-large" : "empty") : showSource ? "source" : status;

  return (
    <figure className="lkes-mermaid" data-mermaid="" data-state={state}>
      <MermaidHeader
        showSource={showSource}
        canExport={canExport}
        source={source}
        title={title}
        onToggleView={() => setShowSource((prev) => !prev)}
        onExportSvg={() => downloadSvg(svg)}
        onExportPng={() => void downloadPng(svg, resolveChartTokens(dark, frameRef.current).bg)}
      />
      <div ref={frameRef} className="lkes-mermaid-body" style={{ maxHeight: viewportHeight(height) }}>
        {ready ? (
          <div
            ref={zoom.ref}
            className="lkes-mermaid-canvas"
            style={{ transform: `translate(${zoom.transform.x}px, ${zoom.transform.y}px) scale(${zoom.transform.scale})` }}
            onPointerDown={zoom.onPointerDown}
            onPointerMove={zoom.onPointerMove}
            onPointerUp={zoom.onPointerUp}
            onPointerCancel={zoom.onPointerUp}
            onDoubleClick={zoom.reset}
            // 产物已在 use-render 中经 DOMPurify 净化（禁脚本与事件属性）
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <pre className="lkes-mermaid-source">
            <code>{source}</code>
          </pre>
        )}
      </div>
      {status === "loading" ? <p className="lkes-mermaid-hint">正在渲染图表…</p> : null}
      {error ? <p className="lkes-mermaid-error">图表渲染失败：{error}（已显示源码）</p> : null}
      {ready ? (
        <div className="lkes-mermaid-zoom" role="group" aria-label="缩放控制">
          <button type="button" onClick={zoom.zoomIn} aria-label="放大" title="放大">
            <ZoomInIcon />
          </button>
          <button type="button" onClick={zoom.zoomOut} aria-label="缩小" title="缩小">
            <ZoomOutIcon />
          </button>
          <button type="button" onClick={zoom.reset} aria-label="重置缩放" title="重置">
            <ResetIcon />
          </button>
        </div>
      ) : null}
    </figure>
  );
}
