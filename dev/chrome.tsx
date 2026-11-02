/**
 * @file dev/chrome.tsx
 * @description 页面外壳：顶栏（样例切换 / 视图切换 / 语言 / 明暗 / 重置）与底栏（诊断 + 往返一致性）。
 *   文案走 `dev/i18n`，诊断文本走引擎的 `formatDiagnostic`（按当前语言把 `code + params` 渲染成句子）。
 * @created 2026-10-26 21:54
 * @updated 2026-10-26 21:54
 * @updated 2026-11-02 20:18 接入语言切换与双语文案；诊断不再直接显示中文 message
 */

import type { ReactElement } from "react";
import { formatDiagnostic, useLocale, useMessage } from "../src/index";
import type { Diagnostic } from "../src/policy";
import type { Checks, RoundtripStatus } from "./use-checks";
import { FIXTURES } from "./fixtures";
import { devMessages, type DevLocale, type DevMessages } from "./i18n";

/** 往返结论的配色 */
const ROUNDTRIP_CLS: Readonly<Record<RoundtripStatus, string>> = {
  ok: "text-emerald-600",
  normalized: "text-muted-foreground",
  "expected-diff": "text-amber-600",
  regressed: "text-red-600",
};

/**
 * 取往返结论文案
 * @param status 往返状态
 * @param messages dev 文案
 * @returns 文案
 */
function roundtripText(status: RoundtripStatus, messages: DevMessages): string {
  if (status === "ok") return messages.roundtripOk;
  if (status === "normalized") return messages.roundtripNormalized;
  if (status === "expected-diff") return messages.roundtripExpectedDiff;
  return messages.roundtripRegressed;
}

/** 主视图：渲染页 / 编辑器联调 */
export type Mode = "render" | "editor";

/** 顶栏参数 */
interface TopBarProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  fixtureId: string;
  onFixtureChange: (id: string) => void;
  dark: boolean;
  onToggleDark: () => void;
  onReset: () => void;
  locale: DevLocale;
  onLocaleChange: (locale: DevLocale) => void;
}

/**
 * 视图切换按钮组
 * @param props 当前视图、切换回调与文案
 * @returns 分段按钮
 */
function ModeSwitch({
  mode,
  onModeChange,
  messages,
}: Pick<TopBarProps, "mode" | "onModeChange"> & { messages: DevMessages }): ReactElement {
  const modes: ReadonlyArray<{ value: Mode; label: string }> = [
    { value: "render", label: messages.modeRender },
    { value: "editor", label: messages.modeEditor },
  ];
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
      {modes.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onModeChange(item.value)}
          className={`rounded px-2 py-1 text-xs transition-colors ${
            mode === item.value ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 顶栏
 * @param props 样例、视图、语言、明暗与重置回调
 * @returns 页面头部
 */
export function TopBar(props: TopBarProps): ReactElement {
  const {
    mode,
    onModeChange,
    fixtureId,
    onFixtureChange,
    dark,
    onToggleDark,
    onReset,
    locale,
    onLocaleChange,
  } = props;
  const messages = devMessages(locale);
  const nextLocale: DevLocale = locale === "zh-CN" ? "en-US" : "zh-CN";

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-2">
      <h1 className="text-sm font-semibold">{messages.title}</h1>
      <span className="hidden text-xs text-muted-foreground sm:inline">{messages.subtitle}</span>
      <div className="ml-auto flex items-center gap-2">
        <select
          value={fixtureId}
          onChange={(event) => onFixtureChange(event.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          aria-label={messages.fixtureLabel}
        >
          {FIXTURES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <ModeSwitch mode={mode} onModeChange={onModeChange} messages={messages} />
        <button
          type="button"
          onClick={() => onLocaleChange(nextLocale)}
          aria-label={messages.languageLabel}
          title={messages.languageLabel}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {messages.languageOther}
        </button>
        <button
          type="button"
          onClick={onToggleDark}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {dark ? messages.themeToLight : messages.themeToDark}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {messages.reset}
        </button>
      </div>
    </header>
  );
}

/**
 * 诊断列表
 * @param props 诊断数组
 * @returns 每条诊断的 code / 行号 / 本地化文案
 * @description 文案由 `code + params` 生成，切语言即变；`code` 与行号是程序标识，不翻译。
 */
function DiagnosticList({ diagnostics }: { diagnostics: Diagnostic[] }): ReactElement {
  const t = useMessage();
  const { locale } = useLocale();
  const messages = devMessages(locale);

  if (diagnostics.length === 0) {
    return <span className="text-emerald-600">{messages.noDiagnostics}</span>;
  }
  return (
    <ul className="flex items-center gap-3">
      {diagnostics.map((item, index) => (
        <li key={`${item.code}-${item.line}-${index}`} className="whitespace-nowrap">
          <span className="font-mono text-amber-600">{item.code}</span>
          <span className="ml-1">
            L{item.line} {formatDiagnostic(t, item)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * 底栏
 * @param props 校验结果
 * @returns 诊断与往返一致性状态条
 */
export function StatusBar({ checks }: { checks: Checks }): ReactElement {
  const { locale } = useLocale();
  const messages = devMessages(locale);
  const status = checks.roundtrip;

  return (
    <footer className="flex shrink-0 items-center gap-4 overflow-x-auto border-t border-border px-4 py-1.5 text-xs text-muted-foreground">
      <span className="shrink-0">
        {messages.diagnosticCount.replace("{n}", String(checks.diagnostics.length))}
      </span>
      <span className={`shrink-0 ${ROUNDTRIP_CLS[status]}`}>
        {roundtripText(status, messages)}
        {checks.diffAt === null ? "" : ` @${checks.diffAt}`}
      </span>
      <span className="shrink-0">{checks.durationMs} ms</span>
      <DiagnosticList diagnostics={checks.diagnostics} />
    </footer>
  );
}
