/**
 * @file CodeMirror 封装
 * @description 只做三件事：挂载编辑器、把文本变更回传、把选区回传。
 *   文档模型就是 Markdown 文本本身，不引入第二份 AST。
 *   主题走 CSS 变量（`--lkes-*`），不写死色值。
 * @created 2026-10-24 21:02
 * @updated 2026-10-24 21:02
 * @updated 2026-11-02 10:46 新增 Markdown 动作快捷键（加粗/斜体/删除线/行内码/标题/引用/列表）
 */

"use client";

import { Compartment, EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  keymap,
  lineNumbers,
  placeholder as placeholderExtension,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { toggleLinePrefix, wrapSelection, type EditResult, type Selection } from "./actions";

/** 快捷键定义：与工具栏按钮共用 actions 纯函数，保证行为一致 */
interface ShortcutDef {
  key: string;
  run: (doc: string, sel: Selection) => EditResult;
}

/**
 * 构建快捷键表（包裹类需要占位文案，由调用方从 UIText 传入）
 * @param wrapPlaceholder 空选区包裹时的占位文字
 * @returns 快捷键定义
 */
function buildShortcuts(wrapPlaceholder: string): ShortcutDef[] {
  return [
    { key: "Mod-b", run: (d, s) => wrapSelection(d, s, "**", "**", wrapPlaceholder) },
    { key: "Mod-i", run: (d, s) => wrapSelection(d, s, "*", "*", wrapPlaceholder) },
    { key: "Mod-e", run: (d, s) => wrapSelection(d, s, "`", "`", wrapPlaceholder) },
    { key: "Mod-Shift-s", run: (d, s) => wrapSelection(d, s, "~~", "~~", wrapPlaceholder) },
    { key: "Mod-1", run: (d, s) => toggleLinePrefix(d, s, "## ") },
    { key: "Mod-Shift-q", run: (d, s) => toggleLinePrefix(d, s, "> ") },
    { key: "Mod-Shift-l", run: (d, s) => toggleLinePrefix(d, s, "- ") },
  ];
}

/**
 * 在编辑器上执行一次文本动作（与工具栏同一 diff-patch 通道，撤销栈与光标行为一致）
 * @param view CodeMirror 视图
 * @param run 动作纯函数
 * @returns 是否消费了该按键（只读态不消费）
 */
function runTextAction(view: EditorView, run: (doc: string, sel: Selection) => EditResult): boolean {
  if (view.state.readOnly) return false;
  const doc = view.state.doc.toString();
  const { from, to } = view.state.selection.main;
  const result = run(doc, { start: from, end: to });
  const change = diffChange(doc, result.value);
  view.dispatch({
    changes: change ?? undefined,
    selection: { anchor: result.selection.start, head: result.selection.end },
    scrollIntoView: true,
  });
  return true;
}

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
  /**
   * 热替换占位提示（切换语言时调用，不重建实例）
   * @param next 新占位文案
   */
  setPlaceholder(next: string): void;
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
  /** 空选区包裹快捷键的占位文案（来自 UIText；缺省用「文本」） */
  wrapPlaceholder?: string;
  /** 文档为空时的占位提示（来自 UIText / EditorConfig.placeholder） */
  placeholder?: string;
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
    color: "var(--lkes-muted, #6b7280)",
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
  const { parent, value, onChange, onSelection, onImage, readOnly, wrapPlaceholder, placeholder } =
    options;

  // 占位提示单独放在 Compartment 里：切换语言时只重配这一项，不重建实例（保住光标与撤销栈）
  const placeholderCompartment = new Compartment();

  // 自定义快捷键放在 defaultKeymap 之前：同名组合（如 Mod-b）以本表为准
  const shortcutKeymap = keymap.of(
    buildShortcuts(wrapPlaceholder ?? "文本").map((item) => ({
      key: item.key,
      preventDefault: true,
      run: (view: EditorView) => runTextAction(view, item.run),
    })),
  );

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        drawSelection(),
        EditorView.lineWrapping,
        shortcutKeymap,
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
        placeholderCompartment.of(placeholderExtension(placeholder ?? "")),
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
    setPlaceholder: (next) => {
      view.dispatch({
        effects: placeholderCompartment.reconfigure(placeholderExtension(next)),
      });
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
