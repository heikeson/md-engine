/**
 * @file dev/App.tsx
 * @description 本地开发渲染的根组件：状态集中在顶部（文本 / 视图 / 明暗 / 样例 / 语言），
 *   校验结果由 useChecks 派生，界面外壳与会话内容分离。
 *   语言在这里持有并包一层 `MdEngineProvider`：外壳与预览区因此共用同一个 locale，
 *   预览里的组件文案（图表工具栏、TypeTable 表头等）随切换即时变化。
 * @created 2026-10-26 21:55
 * @updated 2026-10-26 21:55
 * @updated 2026-11-02 20:18 新增语言状态与 MdEngineProvider，初始值读 `lkes-md-lang`
 */

import { useState, type ReactElement } from "react";
import { MdEngineProvider } from "../src/index";
import { FIXTURES } from "./fixtures";
import { TopBar, StatusBar, type Mode } from "./chrome";
import { readDevLocale, writeDevLocale, type DevLocale } from "./i18n";
import { RenderPane, EditorPane } from "./panes";
import { useChecks } from "./use-checks";

const FIRST = FIXTURES[0];

export default function App(): ReactElement {
  const [dark, setDark] = useState(false);
  const [mode, setMode] = useState<Mode>("render");
  const [fixtureId, setFixtureId] = useState<string>(FIRST.id);
  const [source, setSource] = useState<string>(FIRST.content);
  const [locale, setLocale] = useState<DevLocale>(() => readDevLocale());
  // 往返预期跟随所选样例：改文本不改变口径，换样例才换
  const expectation = FIXTURES.find((item) => item.id === fixtureId)?.roundtrip ?? "strict";
  const checks = useChecks(source, expectation);

  /** 切换样例：同时重置文本与下拉选中项 */
  const handleFixtureChange = (id: string): void => {
    const next = FIXTURES.find((item) => item.id === id);
    if (!next) return;
    setFixtureId(next.id);
    setSource(next.content);
  };

  /** 重置：把当前样例的原文重新灌回编辑器 */
  const handleReset = (): void => {
    handleFixtureChange(fixtureId);
  };

  /**
   * 切换语言
   * @param next 目标语言
   * @description 写回 `lkes-md-lang` 后再更新状态，刷新后保持；文本内容不受影响，不触发重新解析。
   */
  const handleLocaleChange = (next: DevLocale): void => {
    writeDevLocale(next);
    setLocale(next);
  };

  return (
    <MdEngineProvider locale={locale}>
      <div className={dark ? "dark" : ""}>
        <div className="flex h-screen flex-col bg-background text-foreground">
          <TopBar
            mode={mode}
            onModeChange={setMode}
            fixtureId={fixtureId}
            onFixtureChange={handleFixtureChange}
            dark={dark}
            onToggleDark={() => setDark((prev) => !prev)}
            onReset={handleReset}
            locale={locale}
            onLocaleChange={handleLocaleChange}
          />
          <main className="min-h-0 flex-1">
            {mode === "render" ? (
              <RenderPane source={source} onSourceChange={setSource} />
            ) : (
              <EditorPane source={source} onSourceChange={setSource} />
            )}
          </main>
          <StatusBar checks={checks} />
        </div>
      </div>
    </MdEngineProvider>
  );
}
