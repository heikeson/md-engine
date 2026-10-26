/**
 * @file dev/chrome.tsx
 * @description 页面外壳：顶栏（样例切换 / 视图切换 / 明暗 / 重置）与底栏（诊断 + 往返一致性）。
 * @created 2026-10-26 21:54
 * @updated 2026-10-26 21:54
 */

import type { ReactElement } from "react";
import type { Diagnostic } from "../src/policy";
import type { Checks, RoundtripStatus } from "./use-checks";
import { FIXTURES } from "./fixtures";

/** 往返结论的文案与配色 */
const ROUNDTRIP_VIEW: Readonly<Record<RoundtripStatus, { text: string; cls: string }>> = {
  ok: { text: "往返逐字一致", cls: "text-emerald-600" },
  "expected-diff": { text: "往返差异（样例已标注为已知差异）", cls: "text-amber-600" },
  "unexpected-diff": { text: "往返有差异（疑似回归）", cls: "text-red-600" },
};

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
}

/** 顶栏分段按钮 */
const MODES: ReadonlyArray<{ value: Mode; label: string }> = [
  { value: "render", label: "渲染" },
  { value: "editor", label: "编辑器" },
];

/**
 * 视图切换按钮组
 * @param props 当前视图与切换回调
 * @returns 分段按钮
 */
function ModeSwitch({ mode, onModeChange }: Pick<TopBarProps, "mode" | "onModeChange">): ReactElement {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
      {MODES.map((item) => (
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
 * @param props 样例、视图、明暗与重置回调
 * @returns 页面头部
 */
export function TopBar(props: TopBarProps): ReactElement {
  const { mode, onModeChange, fixtureId, onFixtureChange, dark, onToggleDark, onReset } = props;
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-2">
      <h1 className="text-sm font-semibold">md-engine 本地开发渲染</h1>
      <span className="hidden text-xs text-muted-foreground sm:inline">改 src/ 或 styles/ 即时生效</span>
      <div className="ml-auto flex items-center gap-2">
        <select
          value={fixtureId}
          onChange={(event) => onFixtureChange(event.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          aria-label="切换样例"
        >
          {FIXTURES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <ModeSwitch mode={mode} onModeChange={onModeChange} />
        <button
          type="button"
          onClick={onToggleDark}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {dark ? "亮色" : "暗色"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          重置样例
        </button>
      </div>
    </header>
  );
}

/**
 * 诊断列表
 * @param props 诊断数组
 * @returns 每条诊断的 code / 行号 / 文案
 */
function DiagnosticList({ diagnostics }: { diagnostics: Diagnostic[] }): ReactElement {
  if (diagnostics.length === 0) {
    return <span className="text-emerald-600">无诊断</span>;
  }
  return (
    <ul className="flex items-center gap-3">
      {diagnostics.map((item, index) => (
        <li key={`${item.code}-${item.line}-${index}`} className="whitespace-nowrap">
          <span className="font-mono text-amber-600">{item.code}</span>
          <span className="ml-1">
            L{item.line} {item.message}
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
  const view = ROUNDTRIP_VIEW[checks.roundtrip];
  return (
    <footer className="flex shrink-0 items-center gap-4 overflow-x-auto border-t border-border px-4 py-1.5 text-xs text-muted-foreground">
      <span className="shrink-0">诊断 {checks.diagnostics.length}</span>
      <span className={`shrink-0 ${view.cls}`}>
        {view.text}
        {checks.diffAt === null ? "" : ` @${checks.diffAt}`}
      </span>
      <span className="shrink-0">{checks.durationMs} ms</span>
      <DiagnosticList diagnostics={checks.diagnostics} />
    </footer>
  );
}
