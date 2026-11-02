/**
 * @file dev 预览文案与语言存取
 * @description dev 自己的 UI 文案（样例切换、视图、往返结论等）。**刻意不复用**引擎的 `UIText`：
 *   这些是开发工具用语，不是产品文案，混进引擎语言包会让它无限膨胀。
 *   语言值走 `lkes-md-lang`，与站点、引擎共用同一份约定；dev 是纯客户端应用，可以同步读。
 * @created 2026-11-02 20:18
 * @updated 2026-11-02 20:18
 */

import { createLocaleStorage } from "../src/index";

/** dev 支持的语言 */
export type DevLocale = "zh-CN" | "en-US";

/** 语言偏好存取（默认键 `lkes-md-lang`） */
const storage = createLocaleStorage();

/** dev UI 文案 */
export interface DevMessages {
  title: string;
  subtitle: string;
  fixtureLabel: string;
  modeRender: string;
  modeEditor: string;
  themeToLight: string;
  themeToDark: string;
  reset: string;
  languageLabel: string;
  languageOther: string;
  sourcePane: string;
  noDiagnostics: string;
  /** 诊断计数模板，`{n}` 为数量 */
  diagnosticCount: string;
  roundtripOk: string;
  roundtripNormalized: string;
  roundtripExpectedDiff: string;
  roundtripRegressed: string;
}

const zh: DevMessages = {
  title: "md-engine 本地开发渲染",
  subtitle: "改 src/ 或 styles/ 即时生效",
  fixtureLabel: "切换样例",
  modeRender: "渲染",
  modeEditor: "编辑器",
  themeToLight: "亮色",
  themeToDark: "暗色",
  reset: "重置样例",
  languageLabel: "切换语言",
  languageOther: "English",
  sourcePane: "Markdown 原文（可直接改，右侧实时渲染）",
  noDiagnostics: "无诊断",
  diagnosticCount: "诊断 {n}",
  roundtripOk: "往返逐字一致",
  roundtripNormalized: "往返有差异（结构一致，属规范化：如缩进代码块 ↔ 围栏）",
  roundtripExpectedDiff: "往返差异（样例已标注为已知差异）",
  roundtripRegressed: "往返结构不一致（疑似回归）",
};

const en: DevMessages = {
  title: "md-engine local rendering",
  subtitle: "Edits under src/ or styles/ apply immediately",
  fixtureLabel: "Switch fixture",
  modeRender: "Render",
  modeEditor: "Editor",
  themeToLight: "Light",
  themeToDark: "Dark",
  reset: "Reset fixture",
  languageLabel: "Change language",
  languageOther: "中文",
  sourcePane: "Markdown source (edit here, preview updates on the right)",
  noDiagnostics: "No diagnostics",
  diagnosticCount: "Diagnostics {n}",
  roundtripOk: "Round trip is byte-identical",
  roundtripNormalized: "Round trip differs (same structure, normalized: indented code ↔ fences)",
  roundtripExpectedDiff: "Round trip differs (fixture is marked as a known difference)",
  roundtripRegressed: "Round trip structure mismatch (possible regression)",
};

/** 文案字典 */
export const DEV_MESSAGES: Readonly<Record<DevLocale, DevMessages>> = {
  "zh-CN": zh,
  "en-US": en,
};

/**
 * 按语言取 dev 文案
 * @param locale 语言标识（任意 BCP-47）
 * @returns 文案；非英文一律中文
 */
export function devMessages(locale: string): DevMessages {
  return locale.startsWith("en") ? DEV_MESSAGES["en-US"] : DEV_MESSAGES["zh-CN"];
}

/**
 * 读取已保存的语言
 * @returns 语言；未保存过则为中文
 */
export function readDevLocale(): DevLocale {
  const stored = storage.get();
  return stored && stored.startsWith("en") ? "en-US" : "zh-CN";
}

/**
 * 保存语言选择
 * @param locale 语言
 */
export function writeDevLocale(locale: DevLocale): void {
  storage.set(locale);
}
