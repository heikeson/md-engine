/**
 * @file 交互式图表视图（客户端）
 * @description 卡片结构：顶部工具栏 + 图表区（或源码区）+ 右下角悬浮缩放条。
 *   未出图前一律显示源码——无 JS、加载失败、超限、空源码四种情况都不会白屏。
 *   图表区里手势绑在「视口」层：整块区域都能拖，不再只有图片本身能拖。
 * @created 2026-11-01 21:30
 * @updated 2026-11-01 22:29 改为「顶部工具栏 + 右下角缩放条」的卡片式布局
 * @updated 2026-11-01 22:37 标题并入工具栏；暗色与取色按图表容器判定；手势仅在出图后启用
 * @updated 2026-11-01 22:51 导出 PNG 底色改走 resolveChartTokens
 * @updated 2026-11-01 23:18 height 未指定 / 空 / auto 一律自动高度
 * @updated 2026-11-02 10:38 固定文案改走 UIText（config.text 可覆写）
 * @updated 2026-11-02 22:58 新增视口层：手势面铺满图表区，初始按适配比例居中
 * @updated 2026-11-02 23:12 变换层改用回调 ref，transform 交由 use-zoom 直写（手势期不再触发重渲染）
 */

"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { useUIText } from "../internal/text";
import type { MermaidProps } from "../components/mermaid-placeholder";
import { downloadPng, downloadSvg } from "./export";
import MermaidHeader from "./header";
import { ResetIcon, ZoomInIcon, ZoomOutIcon } from "./icons";
import { useIsDark } from "./use-dark";
import { resolveChartTokens, useMermaidRender } from "./use-render";
import { usePanZoom } from "./use-zoom";

/** 进入视口前预留的余量，提前触发加载 */
const PRELOAD_MARGIN = "200px 0px";

/**
 * 解析图表区高度上限
 * @param height 容器属性（数字 / "auto" / 空）
 * @returns 正数返回像素值；未指定、空、`"auto"` 或非法值返回 undefined（按初始适配高度自适应）
 * @description 缺省即自动高度：大图不再被 420px 裁掉，超长交给页面滚动。
 */
function viewportHeight(height?: string): number | undefined {
  const raw = (height ?? "").trim().toLowerCase();
  if (!raw || raw === "auto") return undefined;
  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : undefined;
}

/**
 * 交互式图表
 * @param props 源码、标题、高度与超限标记（与占位骨架同一签名）
 * @returns 卡片式图表视图
 */
export default function MermaidChart({ raw, code, title, height, tooLarge }: MermaidProps): ReactElement {
  const source = String(raw ?? code ?? "");
  const disabled = Boolean(tooLarge) || source.trim() === "";
  const text = useUIText();
  const frameRef = useRef<HTMLDivElement>(null);
  // 暗色判定与取色都基于图表所在容器：站点可能把 .dark 挂在局部容器上
  const dark = useIsDark(frameRef);
  const [visible, setVisible] = useState(false);
  const [showSource, setShowSource] = useState(disabled);
  const { status, svg, size, error } = useMermaidRender(source, visible && !disabled, dark, frameRef);
  const canExport = status === "ready";
  const ready = canExport && !showSource;
  const heightLimit = viewportHeight(height);
  // 手势只在「图已挂载且尺寸已知」时启用：视口未渲染时 ref 为空，提前绑定滚轮会绑不到元素；
  // 尺寸解析不到时无法算适配比例，宁可不缩放也不错位
  const zoom = usePanZoom(ready && size !== null, size, heightLimit);

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
      {/* 不留内边距：画布（视口）边界与卡片边界重合；图表态高度由视口自己给，限高只作用于源码态 */}
      <div ref={frameRef} className="lkes-mermaid-body">
        {ready ? (
          // 视口层：手势面铺满整块图表区，空白处也能拖
          <div
            ref={zoom.ref}
            className="lkes-mermaid-viewport"
            data-dragging={zoom.dragging ? "true" : undefined}
            style={zoom.viewportHeight ? { height: `${Math.round(zoom.viewportHeight)}px` } : undefined}
            onPointerDown={zoom.onPointerDown}
            onPointerMove={zoom.onPointerMove}
            onPointerUp={zoom.onPointerUp}
            onPointerCancel={zoom.onPointerUp}
            onDoubleClick={zoom.reset}
          >
            <div
              ref={zoom.stage}
              className="lkes-mermaid-canvas"
              data-static={size ? undefined : "true"}
              style={{
                // 自然尺寸：变换层坐标原点即视口左上角，缩放锚点才与指针一致。
                // transform 不放在这里：手势期间由 use-zoom 直写，避免每帧 React 重渲染
                width: size ? `${Math.round(size.width)}px` : undefined,
                height: size ? `${Math.round(size.height)}px` : undefined,
                // 尺寸算出来前先不亮相，避免先 1:1 再跳成适配视图；
                // 尺寸根本解析不到时不做适配，也不能把它藏起来
                visibility: size && !zoom.ready ? "hidden" : undefined,
              }}
              // 产物已在 use-render 中经 DOMPurify 净化（禁脚本与事件属性）
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        ) : (
          // 限高直接落在源码块上，body 不限高，百分比高度才不会失效（`overflow` 仍能滚动）
          <pre className="lkes-mermaid-source" style={{ maxHeight: heightLimit ? `${heightLimit}px` : undefined }}>
            <code>{source}</code>
          </pre>
        )}
      </div>
      {status === "loading" ? <p className="lkes-mermaid-hint">{text.mermaidLoading}</p> : null}
      {error ? (
        <p className="lkes-mermaid-error">
          {text.mermaidErrorPrefix}
          {error}
          {text.mermaidErrorSuffix}
        </p>
      ) : null}
      {ready ? (
        <div className="lkes-mermaid-zoom" role="group" aria-label={text.mermaidZoomGroup}>
          <button type="button" onClick={zoom.zoomIn} aria-label={text.mermaidZoomIn} title={text.mermaidZoomIn}>
            <ZoomInIcon />
          </button>
          <button type="button" onClick={zoom.zoomOut} aria-label={text.mermaidZoomOut} title={text.mermaidZoomOut}>
            <ZoomOutIcon />
          </button>
          <button
            type="button"
            onClick={zoom.reset}
            aria-label={text.mermaidZoomReset}
            title={text.mermaidResetTitle}
          >
            <ResetIcon />
          </button>
        </div>
      ) : null}
    </figure>
  );
}
