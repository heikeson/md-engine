/**
 * @file CodeMirror 封装
 * @description 只做三件事：挂载编辑器、把文本变更回传、把选区回传。
 *   文档模型就是 Markdown 文本本身，不引入第二份 AST。
 *   主题走 CSS 变量（`--md-*` / 宿主 `--color-*`），不写死色值。
 * @created 2026-10-24 21:02
 * @updated 2026-10-24 21:02
 */

"use client";

import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import type { Selection } from "./actions";

/** 编辑器句柄 */
export interface EditorHandle {
  /** 底层 EditorView（滚动同步、定位等需要直接操作） */
  readonly view: EditorView;
  /** 当前文本 */
  getDoc(): string;
  /** 当前选区 */
  getSelection(): Selection;
  /** 一次性替换全文并设置选区（工具栏动作用） */
  apply(next: string, selection: Selection): void;
  /** 仅同步外部值（不改变选区语义） */
  setDoc(next: string): void;
  /** 聚焦 */
  focus(): void;
  /** 销毁 */
  destroy(): void;
}

/** 创建参数 */
export interface CreateEditorOptions {
  parent: HTMLElement;
  value: string;
  onChange: (value: string) => void;
  onSelection: (selection: Selection) => void;
  /** 粘贴/拖拽图片回调（由上层负责上传并插入 Markdown） */
  onImage?: (file: File) => void;
  readOnly?: boolean;
}

/** 编辑器外观：全部引用 CSS 变量，随宿主主题走 */
const THEME = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
    backgroundColor: "transparent",
    color: "inherit",
  },
  ".cm-scroller": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    lineHeight: "1.7",
    overflow: "auto",
  },
  ".cm-content": { padding: "16px 8px" },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--md-muted, #9ca3af)",
  },
  ".cm-activeLine": { backgroundColor: "transparent" },
  // 文本光标：默认 1px 太细不容易看见，加粗到 2px 并跟随主题前景色
  ".cm-cursor, .cm-dropCursor": {
    borderLeftWidth: "2px",
    borderLeftColor: "currentColor",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftWidth: "2px",
    borderLeftColor: "currentColor",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "color-mix(in oklab, currentColor 12%, transparent)",
  },
});

/**
 * 创建编辑器实例
 * @param options 挂载点、初始值、变更与选区回调、只读标记
 * @returns 句柄
 */
export function createEditor(options: CreateEditorOptions): EditorHandle {
  const { parent, value, onChange, onSelection, onImage, readOnly } = options;

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        drawSelection(),
        EditorView.lineWrapping,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown({ base: markdownLanguage }),
        THEME,
        // 粘贴 / 拖拽图片：拦截后交给上层上传，避免二进制内容落进文本
        EditorView.domEventHandlers({
          paste: (event) => {
            const file = Array.from(event.clipboardData?.files ?? []).find((item) =>
              item.type.startsWith("image/"),
            );
            if (!file || !onImage) return false;
            event.preventDefault();
            onImage(file);
            return true;
          },
          drop: (event) => {
            const file = Array.from(event.dataTransfer?.files ?? []).find((item) =>
              item.type.startsWith("image/"),
            );
            if (!file || !onImage) return false;
            event.preventDefault();
            onImage(file);
            return true;
          },
        }),
        EditorState.readOnly.of(Boolean(readOnly)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange(update.state.doc.toString());
          if (update.selectionSet || update.docChanged) {
            const main = update.state.selection.main;
            onSelection({ start: main.from, end: main.to });
          }
        }),
      ],
    }),
  });

  return {
    view,
    getDoc: () => view.state.doc.toString(),
    getSelection: () => {
      const main = view.state.selection.main;
      return { start: main.from, end: main.to };
    },
    apply: (next, selection) => {
      const change = diffChange(view.state.doc.toString(), next);
      view.dispatch({
        // 只替换差异段：全量替换会让 CodeMirror 重新测量整个文档，视口被重置到顶部
        changes: change ?? undefined,
        selection: { anchor: selection.start, head: selection.end },
        // 让光标（插入点）保持可见，而不是把视口丢回文档开头
        scrollIntoView: true,
      });
      view.focus();
    },
    setDoc: (next) => {
      const change = diffChange(view.state.doc.toString(), next);
      if (!change) return;
      // 外部同步同理：patch 而非重建，避免光标与滚动位置被打回开头
      view.dispatch({ changes: change });
    },
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}

/**
 * 计算两段文本的最小差异（公共前后缀之外的区间）
 * @param prev 编辑器当前文本
 * @param next 目标文本
 * @returns CodeMirror changes；文本相同返回 null
 */
function diffChange(prev: string, next: string): { from: number; to: number; insert: string } | null {
  if (prev === next) return null;
  let start = 0;
  const limit = Math.min(prev.length, next.length);
  while (start < limit && prev.charCodeAt(start) === next.charCodeAt(start)) start += 1;
  let prevEnd = prev.length;
  let nextEnd = next.length;
  while (
    prevEnd > start &&
    nextEnd > start &&
    prev.charCodeAt(prevEnd - 1) === next.charCodeAt(nextEnd - 1)
  ) {
    prevEnd -= 1;
    nextEnd -= 1;
  }
  return { from: start, to: prevEnd, insert: next.slice(start, nextEnd) };
}
