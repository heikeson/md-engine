/**
 * @file 图表顶部工具栏（客户端）
 * @description 左：模式切换（图表 / 源码）；右：复制源码、下载 SVG、下载 PNG。
 *   与代码块工具栏保持同一视觉语言（图标 + 文字、次要色、悬停加重）。
 * @created 2026-11-01 22:29
 * @updated 2026-11-01 22:29
 * @updated 2026-11-01 22:37 左侧增加图表标题（不再单独占一行）
 * @updated 2026-11-02 10:00 工具栏文案改经 useUIText 取（i18n）
 */

"use client";

import { useRef, useState, type ReactElement } from "react";
import { useUIText } from "../internal/text-context";
import { CodeIcon, CopyIcon, DownloadIcon, ImageIcon } from "./icons";

/** 工具栏参数 */
export interface MermaidHeaderProps {
  /** 当前是否在源码态 */
  showSource: boolean;
  /** 是否已有可导出的图（渲染成功） */
  canExport: boolean;
  /** 图表源码（复制用） */
  source: string;
  /** 图表标题：并入工具栏左侧，不再单独占一行 */
  title?: string;
  /** 切换图表 / 源码 */
  onToggleView: () => void;
  /** 导出 SVG */
  onExportSvg: () => void;
  /** 导出 PNG */
  onExportPng: () => void;
}

/**
 * 图表顶部工具栏
 * @param props 状态与各操作回调
 * @returns 工具栏元素
 * @description 「源码视图 / 图表视图」是同一个按钮的两种文案：按 aria-pressed 表达当前是否处于源码态。
 */
export default function MermaidHeader(props: MermaidHeaderProps): ReactElement {
  const { showSource, canExport, source, title, onToggleView, onExportSvg, onExportPng } = props;
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  const text = useUIText();

  /** 复制源码到剪贴板；成功后在按钮上反馈 1.5 秒 */
  const onCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用（非安全上下文等）时静默忽略，不打断阅读 */
    }
  };

  return (
    <div className="lkes-mermaid-header">
      <div className="lkes-mermaid-leading">
        <button
          type="button"
          className="lkes-mermaid-mode"
          onClick={onToggleView}
          aria-pressed={showSource}
          title={showSource ? text.switchToChart : text.viewSource}
        >
          <CodeIcon />
          <span>{showSource ? text.chartView : text.sourceView}</span>
        </button>
        {title ? <span className="lkes-mermaid-title">{title}</span> : null}
      </div>
      <div className="lkes-mermaid-actions">
        <button type="button" onClick={onCopy}>
          <CopyIcon />
          <span>{copied ? text.copied : text.copySource}</span>
        </button>
        <button type="button" onClick={onExportSvg} disabled={!canExport}>
          <DownloadIcon />
          <span>{text.downloadSvg}</span>
        </button>
        <button type="button" onClick={onExportPng} disabled={!canExport}>
          <ImageIcon />
          <span>{text.downloadPng}</span>
        </button>
      </div>
    </div>
  );
}
