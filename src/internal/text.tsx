/**
 * @file UI 文案表与语言上下文
 * @description 包内所有面向用户的固定文案的**类型契约**，以及把 locale → 语言包 → 逐键覆写
 *   解析成完整文案表的 Context。
 *
 *   解析优先级（高 → 低）：`messages`（props 逐键覆写）> 内置包[locale] > 内置包[fallbackLocale]
 *   > 内置包[zh-CN]。`localStorage` 只在 props 与外层 Provider 都未显式给 locale 时兜底，
 *   且只在客户端挂载后读取（服务端没有 localStorage，读了必然导致 hydration mismatch）。
 *
 *   约定：键只增不改——新增键必须带中英文默认值；`@deprecated` 的旧键保留并单向投影。
 * @created 2026-11-02 10:30
 * @updated 2026-11-02 19:32 引入 locale 解析链、ICU 消息、根级 Provider（MdEngineProvider）与 useMessage
 */

"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, formatMessage, isRTL, matchLocale, normalizeLocale } from "./locale";
import { createLocaleStorage, type LocaleStorage } from "./storage";
import { useShallowStable } from "./use-shallow-stable";
import { zhCN } from "../locales/zh-CN";
import { enUS } from "../locales/en-US";

/** UI 文案键（全部必填；覆写时传 Partial） */
export interface UIText {
  // —— 组件 ——
  /** Image 放大遮罩的关闭按钮 aria-label */
  imageZoomClose: string;
  // —— Mermaid 交互视图 ——
  /** Mermaid 源码态视图名（占位骨架与交互视图共用） */
  mermaidSourceView: string;
  mermaidLoading: string;
  /** 渲染失败提示前缀（后接错误详情） */
  mermaidErrorPrefix: string;
  /** 渲染失败提示后缀 */
  mermaidErrorSuffix: string;
  /** 非 Error 异常兜底文案 */
  mermaidFallbackError: string;
  /** 渲染超时 */
  mermaidTimeout: string;
  mermaidZoomGroup: string;
  mermaidZoomIn: string;
  mermaidZoomOut: string;
  mermaidZoomReset: string;
  /** 重置按钮 title（与 aria 区分：title 更短） */
  mermaidResetTitle: string;
  /** 当前源码态时按钮的 title */
  mermaidToChart: string;
  /** 当前图表态时按钮的 title */
  mermaidToSource: string;
  /** 当前源码态时按钮文字（点击切到图表） */
  mermaidChartView: string;
  mermaidCopied: string;
  mermaidCopySource: string;
  mermaidDownloadSvg: string;
  mermaidDownloadPng: string;
  // —— 类型表 ——
  /** TypeTable 表头：属性 */
  typeTableAttr: string;
  /** TypeTable 表头：类型 */
  typeTableType: string;
  /** TypeTable 表头：默认值 */
  typeTableDefault: string;
  /** TypeTable 表头：说明 */
  typeTableDesc: string;
  /** TypeItem 必填标记 */
  typeItemRequired: string;
  /** TypeItem 空值占位 */
  typeItemEmpty: string;
  // —— 编辑器 ——
  editorBold: string;
  editorItalic: string;
  editorStrike: string;
  editorCode: string;
  editorH2: string;
  editorQuote: string;
  editorList: string;
  editorViewGroup: string;
  editorViewSource: string;
  editorViewSplit: string;
  editorViewPreview: string;
  editorFullscreen: string;
  editorExitFullscreen: string;
  /** 状态栏字数（ICU 复数，渲染为 `{n}` 个字符） */
  editorWordCount: string;
  /** 状态栏诊断前缀（ICU 复数，`{n}` 条与 `{first}` 首条消息） */
  editorDiagnostic: string;
  /** 空选区包裹时的占位文字 */
  editorWrapPlaceholder: string;
  /** 编辑器为空时的占位提示 */
  editorPlaceholder: string;
  /** 插入容器按钮的提示（`{name}` 为组件标识符，不翻译） */
  editorInsertBlock: string;
  /** @deprecated 句子碎片，改用 `editorWordCount`；仅保留以兼容既有覆写 */
  editorWordCountUnit: string;
  /** @deprecated 句子碎片，改用 `editorDiagnostic` */
  editorDiagnosticPrefix: string;
  // —— 诊断（`Diagnostic.code` 即消息键） ——
  diagDepthExceeded: string;
  diagIndentAsCode: string;
  diagUnclosedTag: string;
  diagMermaidEmpty: string;
  diagMermaidTooLarge: string;
  diagUnsafeHref: string;
  diagDuplicateIdAnchor: string;
  diagDuplicateIdDiv: string;
  diagUnknownTag: string;
}

/** 文案覆写类型（逐键，浅合并） */
export type UITextPatch = Partial<UIText>;

/** 书写方向 */
export type TextDirection = "ltr" | "rtl";

/** 中文默认文案（与内置 zh-CN 语言包同一对象） */
export const DEFAULT_UI_TEXT: UIText = zhCN;

/** 内置语言包注册表（模块级常量，不可变） */
const PACKS: Readonly<Record<string, UIText>> = { "zh-CN": zhCN, "en-US": enUS };

/** 内置语言标识列表 */
export const BUILTIN_LOCALES: readonly string[] = Object.freeze(Object.keys(PACKS));

/**
 * 按回退链选内置语言包
 * @param locale 目标语言标识
 * @returns 命中的语言包；未命中返回 null
 */
function pickPack(locale: string): UIText | null {
  const hit = matchLocale(locale, BUILTIN_LOCALES);
  return hit ? PACKS[hit] : null;
}

/**
 * 解析出完整文案表
 * @param locale 目标语言
 * @param fallbackLocale 目标语言未内置时的回退语言
 * @param messages 逐键覆写
 * @returns 完整文案表（永不缺键）
 */
function resolveText(locale: string, fallbackLocale: string, messages?: UITextPatch): UIText {
  const base = pickPack(locale) ?? pickPack(fallbackLocale) ?? zhCN;
  if (!messages) return base;

  const overrides = messages as Record<string, unknown>;
  const keys = Object.keys(overrides);
  if (keys.length === 0) return base;

  const merged: UIText = { ...base };
  let changed = false;
  for (const key of keys) {
    const value = overrides[key];
    // 只有字符串才算有效覆写：undefined / null 保持基础值，避免把类型契约击穿成 undefined
    if (typeof value === "string") {
      (merged as unknown as Record<string, string>)[key] = value;
      changed = true;
    }
  }
  return changed ? merged : base;
}

/** 上下文值 */
interface LocaleContextValue {
  /** 生效语言 */
  locale: string;
  /** 书写方向 */
  direction: TextDirection;
  /** 回退语言 */
  fallbackLocale: string;
  /** 本层是否由 props 显式指定了语言（决定是否允许 localStorage 兜底） */
  explicit: boolean;
  /** 逐键覆写（已与外层叠加） */
  messages?: UITextPatch;
  /** 解析后的完整文案表 */
  text: UIText;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  direction: "ltr",
  fallbackLocale: DEFAULT_LOCALE,
  explicit: false,
  messages: undefined,
  text: zhCN,
});

/** 根级 Provider 参数 */
export interface MdEngineProviderProps {
  /** 语言标识（BCP-47）。不给时依次尝试：外层 Provider → localStorage → zh-CN */
  locale?: string;
  /** 目标语言未内置时的回退语言，默认 zh-CN */
  fallbackLocale?: string;
  /** 逐键文案覆写（与外层叠加，本层优先） */
  messages?: UITextPatch;
  /** 语言偏好存取器，默认 localStorage + `lkes-md-lang` */
  storage?: LocaleStorage;
  children?: ReactNode;
}

/**
 * 根级语言 Provider：包住应用根节点一次，子树内所有组件自动继承
 * @param props 语言、回退语言、文案覆写、存取器与子节点
 * @returns 带上下文的子树
 * @description 可嵌套：`locale` 就近覆盖，`messages` 逐键叠加。不含全局可变状态，
 *   服务端并发请求复用同一模块不会串语言。
 */
export function MdEngineProvider({
  locale,
  fallbackLocale,
  messages,
  storage,
  children,
}: MdEngineProviderProps): ReactNode {
  const outer = useContext(LocaleContext);
  const stableMessages = useShallowStable(messages);
  const stableStorage = useShallowStable(storage);

  const ownLocale = normalizeLocale(locale ?? "");
  // 外层显式指定的语言视同本层显式：都不允许被 localStorage 覆盖
  const explicitLocale = ownLocale || (outer.explicit ? outer.locale : "");

  const [storedLocale, setStoredLocale] = useState<string>("");

  useEffect(() => {
    if (explicitLocale) return;
    const store = stableStorage ?? createLocaleStorage();
    const value = store.get();
    if (value) setStoredLocale(normalizeLocale(value));
  }, [explicitLocale, stableStorage]);

  const effectiveLocale = explicitLocale || storedLocale || DEFAULT_LOCALE;
  const effectiveFallback = normalizeLocale(fallbackLocale ?? outer.fallbackLocale) || DEFAULT_LOCALE;

  // 内外两层 messages 逐键叠加（本层优先）
  const layeredMessages = useMemo<UITextPatch | undefined>(() => {
    const outerMessages = outer.messages;
    if (!outerMessages) return stableMessages;
    if (!stableMessages) return outerMessages;
    return { ...outerMessages, ...stableMessages };
  }, [outer.messages, stableMessages]);

  const text = useMemo(
    () => resolveText(effectiveLocale, effectiveFallback, layeredMessages),
    [effectiveLocale, effectiveFallback, layeredMessages],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale: effectiveLocale,
      direction: isRTL(effectiveLocale) ? "rtl" : "ltr",
      fallbackLocale: effectiveFallback,
      explicit: Boolean(explicitLocale),
      messages: layeredMessages,
      text,
    }),
    [effectiveLocale, effectiveFallback, explicitLocale, layeredMessages, text],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * 兼容入口：旧版只覆写文案的 Provider
 * @param props text 覆写片段、children 子树
 * @returns 带上下文的子树
 * @deprecated 新增代码请用 `MdEngineProvider`（可同时设置 locale）
 */
export function UITextProvider({
  text,
  children,
}: {
  text?: UITextPatch;
  children: ReactNode;
}): ReactNode {
  return <MdEngineProvider messages={text}>{children}</MdEngineProvider>;
}

/**
 * 合并覆写（与中文默认浅合并，未覆写的键保持默认）
 * @param patch 覆写片段
 * @returns 完整文案表
 */
export function mergeUIText(patch?: UITextPatch): UIText {
  return resolveText(DEFAULT_LOCALE, DEFAULT_LOCALE, patch);
}

/**
 * 读取当前生效的完整文案表（不在 Provider 内时返回中文默认值）
 * @returns 完整文案表
 */
export function useUIText(): UIText {
  return useContext(LocaleContext).text;
}

/**
 * 读取当前语言信息
 * @returns 语言、书写方向、回退语言
 */
export function useLocale(): { locale: string; direction: TextDirection; fallbackLocale: string } {
  const { locale, direction, fallbackLocale } = useContext(LocaleContext);
  return { locale, direction, fallbackLocale };
}

/**
 * 取消息格式化函数
 * @returns `t(key, values)`，按当前语言与 ICU 语法格式化
 * @description 返回的函数引用按 (locale, 文案表) 记忆化，可安全放进依赖数组。
 */
export function useMessage(): (
  key: keyof UIText,
  values?: Record<string, string | number>,
) => string {
  const { locale, text } = useContext(LocaleContext);
  return useMemo(
    () =>
      (key: keyof UIText, values?: Record<string, string | number>): string =>
        formatMessage(locale, text[key], values),
    [locale, text],
  );
}
