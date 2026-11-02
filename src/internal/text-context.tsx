/**
 * @file 文案上下文（React 侧传递）
 * @description 渲染器在顶层按 `config.locale / config.text` 注入字典，组件经 `useUIText()` 取文案。
 *   未包 Provider 时（宿主直接用 `mdxComponents`）自动回落内置中文，SSR 安全、零配置可用。
 * @created 2026-11-02 10:00
 */

import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from "react";
import { DEFAULT_UI_TEXT, getUIText, type Locale, type UIText, type UITextPatch } from "./text";

const UITextContext = createContext<UIText>(DEFAULT_UI_TEXT);

/** Provider 参数 */
export interface UITextProviderProps {
  /** 界面语言，缺省中文 */
  locale?: Locale;
  /** 逐键覆写 */
  text?: UITextPatch;
  children?: ReactNode;
}

/**
 * 文案注入
 * @param props 语言、覆写与子树
 * @returns 带文案上下文的子树
 */
export function UITextProvider({ locale, text, children }: UITextProviderProps): ReactElement {
  const value = useMemo(() => getUIText(locale, text), [locale, text]);
  return <UITextContext.Provider value={value}>{children}</UITextContext.Provider>;
}

/**
 * 取当前文案字典
 * @returns 合并后的 UIText（无 Provider 时为内置中文）
 */
export function useUIText(): UIText {
  return useContext(UITextContext);
}
