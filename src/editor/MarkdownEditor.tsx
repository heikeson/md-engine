/**
 * @file Markdown 编辑器（文本即真源）
 * @description 左源码（CodeMirror）右预览：编辑器只改 Markdown 文本，不做 HTML 中间态。
 *   容器块通过「工具栏插入 + 文本编辑」维护，没有第二套文档模型。
 *   声明顺序按「refs → 动作 → 编辑器实例 → 派生状态」组织，避免在声明前引用。
 *
 *   多语言：外壳只负责把 locale / 文案交给 Provider，真正的 UI 在 Provider 内部读取。
 *   语言切换属于**热更新**——重建依赖只含结构性因素（视图、只读），占位提示走
 *   CodeMirror 的 Compartment 重配，因此切语言不会丢光标、选区、滚动位置与撤销栈。
 * @created 2026-10-24 21:12
 * @updated 2026-10-24 21:10 补齐图片上传、修复 hook 依赖与声明顺序
 * @updated 2026-11-01 23:02 EditorConfig 增加 rendererConfig：预览区可透传组件覆盖（如 mermaidComponents）
 * @updated 2026-11-02 10:44 预览与诊断改用 useDeferredValue（长文输入不卡键）；新增 config.text 文案覆写；工具栏动作补快捷键
 * @updated 2026-11-02 19:32 接入 locale/messages；字数与诊断走 ICU 复数；placeholder 接线并改为热更新
 */

"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import MarkdownRenderer, { type RenderConfig } from "../render";
import { diagnose } from "../parse";
import { normalizeMarkdown } from "../format";
import {
  MdEngineProvider,
  useMessage,
  useUIText,
  type UITextPatch,
} from "../internal/text";
import { formatDiagnostic } from "../internal/diagnostics";
import { useShallowStable } from "../internal/use-shallow-stable";
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
  /**
   * 编辑器空文档时的占位提示
   * @description 优先于 `messages.editorPlaceholder`
   */
  placeholder?: string;
  readOnly?: boolean;
  /**
   * 预览侧渲染配置（整体透传给 `MarkdownRenderer`）
   * @description 想在内置预览里看到交互式图表，传 `{ components: mermaidComponents }` 即可；
   *   `sourcePositions` 由编辑器强制开启（滚动同步依赖它），调用方无需传。
   *   编辑器入口不直接依赖 `/mermaid`，否则 CodeMirror 入口会连带 mermaid 一起进产物。
   */
  rendererConfig?: RenderConfig;
  /**
   * UI 文案覆写（工具栏 / 状态栏 / 预览内组件文案，逐键浅合并）
   * @deprecated 语义已由 `messages` 承接；两者同时给出时 `messages` 优先
   */
  text?: UITextPatch;
  /** 文案逐键覆写（优先于 `text` 与内置语言包） */
  messages?: UITextPatch;
  /** 语言标识（BCP-47）；不给时继承外层 `MdEngineProvider`，再退到 zh-CN */
  locale?: string;
  /** 目标语言未内置时的回退语言（默认 zh-CN） */
  fallbackLocale?: string;
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

/** 视图切换项（label 取 UIText 键） */
const VIEW_OPTIONS: ReadonlyArray<{ value: EditorView; labelKey: "editorViewSource" | "editorViewSplit" | "editorViewPreview" }> = [
  { value: "source", labelKey: "editorViewSource" },
  { value: "split", labelKey: "editorViewSplit" },
  { value: "preview", labelKey: "editorViewPreview" },
];

/** 工具栏：包裹类 */
const WRAP_ITEMS = [
  { key: "bold", labelKey: "editorBold", before: "**", after: "**" },
  { key: "italic", labelKey: "editorItalic", before: "*", after: "*" },
  { key: "strike", labelKey: "editorStrike", before: "~~", after: "~~" },
  { key: "code", labelKey: "editorCode", before: "`", after: "`" },
] as const;

/** 工具栏：行首前缀类 */
const LINE_ITEMS = [
  { key: "h2", labelKey: "editorH2", prefix: "## " },
  { key: "quote", labelKey: "editorQuote", prefix: "> " },
  { key: "list", labelKey: "editorList", prefix: "- " },
] as const;

/**
 * Markdown 编辑器
 * @param props 文本、变更回调、视图与配置
 * @returns 编辑器元素
 * @description 外壳只做配置解析与 Provider 挂载；UI 在 Provider 内部，才能读到生效语言。
 */
export default function MarkdownEditor(props: MarkdownEditorProps) {
  const { config } = props;
  const textPatch = useShallowStable(config?.text);
  const messages = useShallowStable(config?.messages);

  // 旧 `text` 与新 `messages` 合并，新字段优先；都未给时保持 undefined，避免无谓重建
  const patch = useMemo<UITextPatch | undefined>(() => {
    if (!textPatch) return messages;
    if (!messages) return textPatch;
    return { ...textPatch, ...messages };
  }, [textPatch, messages]);

  return (
    <MdEngineProvider
      locale={config?.locale}
      fallbackLocale={config?.fallbackLocale}
      messages={patch}
    >
      <EditorShell {...props} />
    </MdEngineProvider>
  );
}

/**
 * 编辑器内部实现（运行在 Provider 之内，可读生效语言与文案）
 * @param props 与 `MarkdownEditor` 相同
 * @returns 编辑器元素
 */
function EditorShell({ value, onChange, view = "split", config, fullscreen, onToggleFullscreen }: MarkdownEditorProps) {
  // 生效文案与消息格式化：随 Provider 的 locale 变化
  const text = useUIText();
  const t = useMessage();

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

  /** 占位提示：宿主显式值 > 文案表 */
  const placeholder = config?.placeholder ?? text.editorPlaceholder;

  // 预览与诊断走延迟值：长文档每次按键全量 parse + 渲染会拖住输入，
  // useDeferredValue 让 React 优先保证输入流畅，重活在后台帧完成
  const deferredValue = useDeferredValue(value);

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

  // 挂载 / 卸载编辑器（仅视图或只读变化时重建）
  // 注意：`placeholder` 故意不放进重建依赖——语言变化只走下面的 setPlaceholder 热更新，
  // 否则切语言会销毁实例，丢光标、选区、滚动位置与撤销栈。
  // 重建发生时闭包总是当次渲染的，因此占位提示仍是最新值。
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
      wrapPlaceholder: text.editorWrapPlaceholder,
      placeholder,
    });
    handleRef.current = handle;
    return () => {
      handle.destroy();
      handleRef.current = null;
    };
  }, [viewMode, config?.readOnly, text.editorWrapPlaceholder]);

  // 占位提示随语言热更新（不重建实例）
  useEffect(() => {
    handleRef.current?.setPlaceholder(placeholder);
  }, [placeholder]);

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

  // 只要诊断文案：走 diagnose 跳过块索引（extractBlocks），输入批次少一次整树转换
  const diagnostics = useMemo(() => diagnose(deferredValue), [deferredValue]);

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
            onClick={() =>
              applyLive((doc, sel) =>
                wrapSelection(doc, sel, item.before, item.after, text.editorWrapPlaceholder),
              )
            }
            disabled={config?.readOnly}
          >
            {text[item.labelKey]}
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
            {text[item.labelKey]}
          </button>
        ))}
        <span className="md-editor-sep" />
        {INSERTABLE_BLOCKS.map((name) => (
          <button
            key={name}
            type="button"
            // 按钮文字是 Markdown 里的组件标识符，不翻译；提示文案本地化
            title={t("editorInsertBlock", { name })}
            onClick={() => applyLive((doc, sel) => insertBlockAt(doc, sel.start, blockSnippet(name)))}
            disabled={config?.readOnly}
          >
            {name}
          </button>
        ))}
        <span className="md-editor-grow" />
        <div className="md-editor-views" role="group" aria-label={text.editorViewGroup}>
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              data-active={viewMode === option.value}
              aria-pressed={viewMode === option.value}
              onClick={() => setViewMode(option.value)}
            >
              {text[option.labelKey]}
            </button>
          ))}
        </div>
        {onToggleFullscreen ? (
          <button type="button" onClick={onToggleFullscreen}>
            {fullscreen ? text.editorExitFullscreen : text.editorFullscreen}
          </button>
        ) : null}
      </div>

      <div className="md-editor-body" onBlur={handleBlur}>
        {viewMode !== "preview" && <div ref={hostRef} className="md-editor-source" />}
        {viewMode !== "source" && (
          <div ref={previewRef} className="md-editor-preview">
            {/* sourcePositions：给块级元素写 data-src-start，供滚动同步按内容对齐；
                components 由宿主注入（传 mermaidComponents 后图表在编辑器里也是交互视图）；
                locale 与文案继承外层 Provider，无需重复传；content 用延迟值：输入帧先渲染旧预览 */}
            <MarkdownRenderer
              content={deferredValue}
              className="prose-site"
              config={{ ...config?.rendererConfig, sourcePositions: true }}
            />
          </div>
        )}
      </div>

      <div className="md-editor-status">
        <span>{t("editorWordCount", { n: value.length })}</span>
        {diagnostics.length > 0 && (
          <span className="md-editor-status-warn">
            {t("editorDiagnostic", {
              n: diagnostics.length,
              first: formatDiagnostic(t, diagnostics[0]),
            })}
          </span>
        )}
      </div>
    </div>
  );
}
