/**
 * @file 语言标识与消息格式化（纯函数，SSR 安全）
 * @description 只做四件事：BCP-47 标识规范化与回退链、书写方向判定、ICU 消息格式化、
 *   客户端语言探测工具。**不含任何全局可变状态**，不在模块顶层访问 window/navigator，
 *   因此可在服务端渲染与并发请求中安全复用。
 * @created 2026-11-02 19:32
 * @updated 2026-11-02 19:32
 */

import { IntlMessageFormat } from "intl-messageformat";

/** 包内默认语言（与内置语言包保持一致） */
export const DEFAULT_LOCALE = "zh-CN";

/** 书写方向为从右到左的语言主标签 */
const RTL_LANGUAGES = new Set(["ar", "arc", "ckb", "dv", "fa", "he", "ks", "ps", "sd", "ug", "ur", "yi"]);

/**
 * 规范化 BCP-47 标识：下划线转连字符，语言小写、地区大写、文字标题大小写
 * @param input 原始标识，如 `zh_CN` / `en-us` / `zh-hans-cn`
 * @returns 规范化标识；空输入返回空串
 */
export function normalizeLocale(input: string): string {
  const raw = String(input ?? "").trim().replace(/_/g, "-");
  if (!raw) return "";
  return raw
    .split("-")
    .map((part, index) => {
      if (index === 0) return part.toLowerCase();
      if (/^[A-Za-z]{4}$/.test(part)) return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      if (/^[A-Za-z]{2}$/.test(part)) return part.toUpperCase();
      return part.toLowerCase();
    })
    .join("-");
}

/**
 * 取语言主标签（小写）
 * @param locale 规范化或不规范的标识
 * @returns 主标签，如 `zh-CN` → `zh`
 */
export function languageOf(locale: string): string {
  return normalizeLocale(locale).split("-")[0] ?? "";
}

/**
 * 生成回退候选序列（由具体到泛化）
 * @param locale 目标标识
 * @returns 候选数组，如 `zh-Hans-CN` → `["zh-Hans-CN","zh-Hans","zh"]`
 */
export function localeCandidates(locale: string): string[] {
  const normalized = normalizeLocale(locale);
  if (!normalized) return [];
  const parts = normalized.split("-");
  const out: string[] = [];
  for (let end = parts.length; end >= 1; end -= 1) out.push(parts.slice(0, end).join("-"));
  return out;
}

/** 各语言的默认书写系统（用于识别 `zh-Hant` 与简体不属于同一变体） */
const DEFAULT_SCRIPT: Readonly<Record<string, string>> = {
  zh: "hans",
  en: "latn",
  ja: "jpan",
  ko: "kore",
  ru: "cyrl",
  ar: "arab",
  he: "hebr",
  hi: "deva",
  th: "thai",
  el: "grek",
};

/**
 * 取标识里的书写系统子标签（小写）
 * @param locale 规范化标识
 * @returns 书写系统，如 `Hans` → `hans`；无则 undefined
 */
function scriptOf(locale: string): string | undefined {
  const part = locale.split("-").find((segment) => /^[A-Za-z]{4}$/.test(segment));
  return part?.toLowerCase();
}

/**
 * 在可用语言集合里按回退链匹配
 * @param locale 目标标识
 * @param available 可用标识列表（可为内置语言包键）
 * @returns 命中的可用标识（保持 available 里的原始写法）；未命中返回 null
 * @description 两段匹配：先按 `zh-Hans-CN → zh-Hans → zh` 精确回退，再做语言级近似
 *   （`en-GB → en-US` 这类同语言不同地区）。近似时若书写系统冲突（`zh-Hant` 对简体包）则放弃，
 *   避免把繁体用户按简体渲染却自以为命中。
 */
export function matchLocale(locale: string, available: readonly string[]): string | null {
  const table = new Map<string, string>();
  for (const item of available) table.set(normalizeLocale(item), item);

  for (const candidate of localeCandidates(locale)) {
    const hit = table.get(candidate);
    if (hit) return hit;
  }

  const target = normalizeLocale(locale);
  const language = languageOf(target);
  if (!language) return null;

  const targetScript = scriptOf(target) ?? DEFAULT_SCRIPT[language];
  for (const item of available) {
    const normalized = normalizeLocale(item);
    if (languageOf(normalized) !== language) continue;
    const itemScript = scriptOf(normalized) ?? DEFAULT_SCRIPT[language];
    if (targetScript && itemScript && targetScript !== itemScript) continue;
    return item;
  }
  return null;
}

/**
 * 从候选列表里挑第一个可用的语言（解析 Accept-Language 等场景）
 * @param candidates 候选标识（按优先级）
 * @param available 可用标识；省略时取候选里第一个有效值
 * @returns 命中的标识；全部无效时返回默认语言
 * @description 不在库内隐式调用，由宿主显式使用
 */
export function resolveLocale(candidates: readonly string[], available?: readonly string[]): string {
  const list = candidates.map(normalizeLocale).filter(Boolean);
  if (available && available.length > 0) {
    for (const candidate of list) {
      const hit = matchLocale(candidate, available);
      if (hit) return hit;
    }
    return DEFAULT_LOCALE;
  }
  return list[0] ?? DEFAULT_LOCALE;
}

/**
 * 客户端一次性语言探测：`html[lang]` → `navigator.languages` → 默认
 * @param fallback 探测失败时的返回值
 * @returns 语言标识
 * @description **只能在 effect / 事件回调里调用**。服务端调用恒返回 fallback，
 *   因此不可用于首屏渲染，否则服务端与客户端结果不一致会产生 hydration mismatch。
 */
export function detectLocale(fallback: string = DEFAULT_LOCALE): string {
  if (typeof document !== "undefined") {
    const declared = document.documentElement?.lang;
    if (declared) return normalizeLocale(declared);
  }
  if (typeof navigator !== "undefined") {
    const languages = navigator.languages;
    if (languages && languages.length > 0) return normalizeLocale(languages[0]);
    if (navigator.language) return normalizeLocale(navigator.language);
  }
  return normalizeLocale(fallback) || DEFAULT_LOCALE;
}

/**
 * 判断书写方向
 * @param locale 语言标识
 * @returns 是否从右到左
 */
export function isRTL(locale: string): boolean {
  return RTL_LANGUAGES.has(languageOf(locale));
}

/**
 * 语言标识 → URL 段
 * @param locale 语言标识，如 `zh-CN`
 * @returns URL 段，如 `zh`
 */
export function toRouteSegment(locale: string): string {
  return languageOf(locale) || languageOf(DEFAULT_LOCALE);
}

/**
 * URL 段 → 语言标识（在可用集合里匹配）
 * @param segment URL 段，如 `en`
 * @param available 可用标识列表
 * @returns 命中的标识；空段或未命中返回 null
 */
export function fromRouteSegment(segment: string, available: readonly string[]): string | null {
  const value = normalizeLocale(String(segment ?? ""));
  if (!value) return null;
  return matchLocale(value, available);
}

/**
 * 判断运行环境是否提供该语言的 Intl 数据
 * @param locale 语言标识
 * @returns 是否支持
 * @description 用于 Node small-icu 构建的降级判断：缺数据时复数规则会静默退化为 en。
 */
export function supportsIntlLocale(locale: string): boolean {
  try {
    return Intl.PluralRules.supportedLocalesOf(normalizeLocale(locale) || DEFAULT_LOCALE).length > 0;
  } catch {
    return false;
  }
}

/** ICU 消息格式化器缓存（键为 locale + 模板；同输入恒同输出，属纯函数缓存） */
const formatterCache = new Map<string, IntlMessageFormat>();

/**
 * 取格式化器（带缓存，语法错误时返回 null）
 * @param locale 语言标识
 * @param template ICU 消息模板
 * @returns 格式化器或 null
 */
function getFormatter(locale: string, template: string): IntlMessageFormat | null {
  const key = `${locale}\u0000${template}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;
  try {
    const formatter = new IntlMessageFormat(template, locale);
    formatterCache.set(key, formatter);
    return formatter;
  } catch {
    return null;
  }
}

/**
 * 按 ICU 语法格式化消息
 * @param locale 语言标识（决定复数与数字格式）
 * @param template ICU 消息模板，可含 `{name}` 插值与 `{n, plural, ...}`
 * @param values 插值参数；省略且模板无占位符时直接返回模板
 * @returns 格式化结果；语法错误或缺参时回退为模板原文，绝不抛错
 */
export function formatMessage(
  locale: string,
  template: string,
  values?: Record<string, string | number>,
): string {
  if (typeof template !== "string" || template.length === 0) return "";
  // 无占位符的快路径：绝大多数文案是纯文本，不必进入解析与缓存
  if (!template.includes("{")) return template;
  const effective = normalizeLocale(locale) || DEFAULT_LOCALE;
  const formatter = getFormatter(effective, template);
  if (!formatter) return template;
  try {
    const output = formatter.format(values ?? {});
    // 纯文本消息返回 string；富文本消息返回片段数组，本包不使用富文本，统一拼平
    if (typeof output === "string") return output;
    if (Array.isArray(output)) return output.map(String).join("");
    return String(output);
  } catch {
    return template;
  }
}
