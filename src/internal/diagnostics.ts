/**
 * @file 诊断文案映射
 * @description 诊断码 → 文案键。领域层只产出 `code + params + 中文 message`，
 *   人类可读文本在这里（表现层侧）生成：有对应文案键就用当前语言，没有就回退中文原文。
 * @created 2026-11-02 19:32
 * @updated 2026-11-02 19:32
 */

import type { Diagnostic, DiagnosticCode } from "../policy";
import type { UIText } from "./text";

/** 诊断码 → 文案键（一码一消息） */
const KEY_BY_CODE: Readonly<Record<DiagnosticCode, keyof UIText>> = {
  UNCLOSED_TAG: "diagUnclosedTag",
  DEPTH_EXCEEDED: "diagDepthExceeded",
  UNKNOWN_TAG: "diagUnknownTag",
  UNSAFE_HREF: "diagUnsafeHref",
  INDENT_AS_CODE: "diagIndentAsCode",
  MERMAID_EMPTY: "diagMermaidEmpty",
  MERMAID_TOO_LARGE: "diagMermaidTooLarge",
  DUPLICATE_ID_ANCHOR: "diagDuplicateIdAnchor",
  DUPLICATE_ID_DIV: "diagDuplicateIdDiv",
  // 旧码保留在联合类型中，仍能翻译（按锚点冲突处理）
  DUPLICATE_ID: "diagDuplicateIdAnchor",
};

/**
 * 取诊断码对应的文案键
 * @param code 诊断码
 * @returns 文案键；未知码返回 null
 */
export function diagnosticTextKey(code: DiagnosticCode): keyof UIText | null {
  return KEY_BY_CODE[code] ?? null;
}

/**
 * 按当前语言渲染一条诊断
 * @param t 消息格式化函数（`useMessage()` 的返回值）
 * @param diagnostic 诊断记录
 * @returns 本地化文本；无对应文案键或缺参时回退中文 `message`
 */
export function formatDiagnostic(
  t: (key: keyof UIText, values?: Record<string, string | number>) => string,
  diagnostic: Diagnostic,
): string {
  const key = diagnosticTextKey(diagnostic.code);
  if (!key) return diagnostic.message;
  const rendered = t(key, diagnostic.params);
  return rendered || diagnostic.message;
}
