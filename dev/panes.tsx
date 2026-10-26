/**
 * @file dev/panes.tsx
 * @description 两种主视图：渲染页（左原文 / 右预览）与编辑器联调页（MarkdownEditor 分屏）。
 * @created 2026-10-26 21:54
 * @updated 2026-10-26 21:54
 */

import type { ReactElement } from "react";
import { MarkdownRenderer } from "../src/index";
import { MarkdownEditor } from "../src/editor/index";

/** 两种视图共用的数据契约：受控文本 */
export interface PaneProps {
  source: string;
  onSourceChange: (value: string) => void;
}

/**
 * 渲染页：左侧可编辑原文，右侧实时渲染
 * @param props 文本与变更回调
 * @returns 双栏布局
 */
export function RenderPane({ source, onSourceChange }: PaneProps): ReactElement {
  return (
    <div className="flex h-full min-h-0">
      <section className="flex w-[46%] min-w-0 flex-col border-r border-border">
        <div className="shrink-0 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
          Markdown 原文（可直接改，右侧实时渲染）
        </div>
        <textarea
          value={source}
          onChange={(event) => onSourceChange(event.target.value)}
          spellCheck={false}
          className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-xs leading-6 outline-none"
        />
      </section>
      <section className="min-h-0 flex-1 overflow-y-auto p-6">
        <MarkdownRenderer content={source} className="prose-site mx-auto max-w-3xl" />
      </section>
    </div>
  );
}

/**
 * 编辑器联调页：直接用包内 MarkdownEditor（自带分屏、工具栏、滚动同步、状态栏）
 * @param props 文本与变更回调
 * @returns 撑满高度的编辑器
 */
export function EditorPane({ source, onSourceChange }: PaneProps): ReactElement {
  return (
    <div className="h-full p-4">
      <MarkdownEditor value={source} onChange={onSourceChange} view="split" />
    </div>
  );
}
