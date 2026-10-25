/**
 * @file Markdown 编辑器（文本即真源）
 * @description 左源码（CodeMirror）右预览：编辑器只改 Markdown 文本，不做 HTML 中间态。
 *   容器块通过「工具栏插入 + 文本编辑」维护，没有第二套文档模型。
 *   声明顺序按「refs → 动作 → 编辑器实例 → 派生状态」组织，避免在声明前引用。
 * @created 2026-10-24 21:12
 * @updated 2026-10-24 21:10 补齐图片上传、修复 hook 依赖与声明顺序
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MarkdownRenderer from "../render";
import { parse } from "../parse";
import { normalizeMarkdown } from "../format";
import {
  insertBlockAt,
  toggleLinePrefix,
  wrapSelection,
  type EditResult,
  type Selection,
} from "./actions";
import { createEditor, type EditorHandle } from "./codemirror";
import { createScrollSync } from "./scroll-sync";
import { INSERTABLE_BLOCKS, blockSnippet } from "./snippets";

/** 编辑器配置（只增不改） */
export interface EditorConfig {
  /** 图片上传（宿主注入），返回可访问 URL */
  uploadImage?: (file: File) => Promise<string>;
  placeholder?: string;
  readOnly?: boolean;
}

/** 视图 */
export type EditorView = "split" | "source" | "preview";

/** 编辑器参数 */
export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** 初始视图；挂载后由工具栏切换按钮控制 */
  view?: EditorView;
  config?: EditorConfig;
  /** 当前是否全屏（宿主控制，传入才显示按钮） */
  fullscreen?: boolean;
  /** 全屏切换回调 */
  onToggleFullscreen?: () => void;
}

/** 视图切换项 */
const VIEW_OPTIONS: ReadonlyArray<{ value: EditorView; label: string }> = [
  { value: "source", label: "编辑" },
  { value: "split", label: "分屏" },
  { value: "preview", label: "预览" },
];

/** 工具栏：包裹类 */
const WRAP_ITEMS = [
  { key: "bold", label: "粗体", before: "**", after: "**" },
  { key: "italic", label: "斜体", before: "*", after: "*" },
  { key: "strike", label: "删除线", before: "~~", after: "~~" },
  { key: "code", label: "行内码", before: "`", after: "`" },
] as const;

/** 工具栏：行首前缀类 */
const LINE_ITEMS = [
  { key: "h2", label: "H2", prefix: "## " },
  { key: "quote", label: "引用", prefix: "> " },
  { key: "list", label: "列表", prefix: "- " },
] as const;

/**
 * Markdown 编辑器
 * @param props 文本、变更回调、视图与配置
 * @returns 编辑器元素
 */
export default function MarkdownEditor({
  value,
  onChange,
  view = "split",
  config,
  fullscreen,
  onToggleFullscreen,
}: MarkdownEditorProps) {
  // 视图由内部状态持有，宿主只给初始值（编辑 / 分屏 / 预览）
  const [viewMode, setViewMode] = useState<EditorView>(view);
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<EditorHandle | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  /** 图片处理最新实现（编辑器实例只建一次，经 ref 转发） */
  const imageHandlerRef = useRef<(file: File) => void>(() => {});
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });

  // 最新值与回调写入 ref（render 期间禁止写 ref）
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [value, onChange]);

  /**
   * 应用一次文本动作
   * @description 走 CodeMirror 事务，保证光标与撤销栈正确；实例缺失时退化为直接回调
   * @param result 新文本与新选区
   */
  const apply = useCallback((result: EditResult): void => {
    const handle = handleRef.current;
    if (handle) handle.apply(result.value, result.selection);
    else onChangeRef.current(result.value);
  }, []);

  /**
   * 用编辑器**当前**文档与选区执行动作
   * @description 不能读 props.value / state.selection：它们在 onChange 回流前是滞后的，
   *   连点按钮或快速输入时会基于旧文本计算，导致内容被覆盖、插入位置错乱。
   * @param run 接收最新文档与选区、返回编辑结果
   */
  const applyLive = useCallback(
    (run: (doc: string, sel: Selection) => EditResult): void => {
      const handle = handleRef.current;
      const doc = handle?.getDoc() ?? valueRef.current;
      const sel = handle?.getSelection() ?? selection;
      apply(run(doc, sel));
    },
    [apply, selection],
  );

  /**
   * 上传图片并插入 `<Image />`
   * @param file 图片文件
   */
  const handleImage = useCallback(
    async (file: File): Promise<void> => {
      const upload = config?.uploadImage;
      if (!upload) return;
      try {
        const url = await upload(file);
        const alt = file.name.replace(/\.[^.]+$/, "") || "image";
        const handle = handleRef.current;
        const current = handle?.getDoc() ?? valueRef.current;
        const position = handle?.getSelection().start ?? current.length;
        // 图片是块级自闭合组件，同样按块插入（顶格 + 前后空行）
        apply(insertBlockAt(current, position, `<Image src="${url}" alt="${alt}" />`));
      } catch {
        /* 上传失败由宿主统一提示，编辑器不弹窗 */
      }
    },
    [apply, config?.uploadImage],
  );

  // 把最新图片处理实现交给编辑器实例
  useEffect(() => {
    imageHandlerRef.current = (file) => {
      void handleImage(file);
    };
  }, [handleImage]);

  // 挂载 / 卸载编辑器（视图或只读变化时重建）
  useEffect(() => {
    if (viewMode === "preview") return;
    const host = hostRef.current;
    if (!host) return;
    const handle = createEditor({
      parent: host,
      value: valueRef.current,
      onChange: (next) => onChangeRef.current(next),
      onSelection: setSelection,
      onImage: (file) => imageHandlerRef.current(file),
      readOnly: config?.readOnly,
    });
    handleRef.current = handle;
    return () => {
      handle.destroy();
      handleRef.current = null;
    };
  }, [viewMode, config?.readOnly]);

  // 分屏时建立"按内容对齐"的双向滚动同步（块级锚点，非比例映射）
  useEffect(() => {
    if (viewMode !== "split") return;
    const handle = handleRef.current;
    const preview = previewRef.current;
    if (!handle || !preview) return;
    const sync = createScrollSync(handle.view, preview);
    return () => sync.destroy();
  }, [viewMode]);

  // 外部值同步（内部编辑回流时内容相同，setDoc 内部会跳过）
  useEffect(() => {
    handleRef.current?.setDoc(value);
  }, [value]);

  const diagnostics = useMemo(() => parse(value).diagnostics, [value]);

  /** 失焦时整理排版（补空行、收敛空行），不改语义 */
  const handleBlur = useCallback((): void => {
    const current = valueRef.current;
    const normalized = normalizeMarkdown(current);
    if (normalized === current) return;
    onChangeRef.current(normalized);
    handleRef.current?.setDoc(normalized);
  }, []);

  return (
    <div className="md-editor">
      <div className="md-editor-toolbar">
        {WRAP_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => applyLive((doc, sel) => wrapSelection(doc, sel, item.before, item.after))}
            disabled={config?.readOnly}
          >
            {item.label}
          </button>
        ))}
        <span className="md-editor-sep" />
        {LINE_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => applyLive((doc, sel) => toggleLinePrefix(doc, sel, item.prefix))}
            disabled={config?.readOnly}
          >
            {item.label}
          </button>
        ))}
        <span className="md-editor-sep" />
        {INSERTABLE_BLOCKS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => applyLive((doc, sel) => insertBlockAt(doc, sel.start, blockSnippet(name)))}
            disabled={config?.readOnly}
          >
            {name}
          </button>
        ))}
        <span className="md-editor-grow" />
        <div className="md-editor-views" role="group" aria-label="视图切换">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              data-active={viewMode === option.value}
              aria-pressed={viewMode === option.value}
              onClick={() => setViewMode(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {onToggleFullscreen ? (
          <button type="button" onClick={onToggleFullscreen}>
            {fullscreen ? "退出全屏" : "全屏"}
          </button>
        ) : null}
      </div>

      <div className="md-editor-body" onBlur={handleBlur}>
        {viewMode !== "preview" && <div ref={hostRef} className="md-editor-source" />}
        {viewMode !== "source" && (
          <div ref={previewRef} className="md-editor-preview">
            {/* sourcePositions：给块级元素写 data-src-start，供滚动同步按内容对齐 */}
            <MarkdownRenderer
              content={value}
              className="prose-site"
              config={{ sourcePositions: true }}
            />
          </div>
        )}
      </div>

      <div className="md-editor-status">
        <span>{value.length} 字</span>
        {diagnostics.length > 0 && (
          <span className="md-editor-status-warn">
            {diagnostics.length} 条提示：{diagnostics[0].message}
          </span>
        )}
      </div>
    </div>
  );
}
