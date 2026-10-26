/**
 * @file dev/App.tsx
 * @description 本地开发渲染的根组件：状态集中在顶部（文本 / 视图 / 明暗 / 样例），
 *   校验结果由 useChecks 派生，界面外壳与会话内容分离。
 * @created 2026-10-26 21:55
 * @updated 2026-10-26 21:55
 */

import { useState, type ReactElement } from "react";
import { FIXTURES } from "./fixtures";
import { TopBar, StatusBar, type Mode } from "./chrome";
import { RenderPane, EditorPane } from "./panes";
import { useChecks } from "./use-checks";

const FIRST = FIXTURES[0];

export default function App(): ReactElement {
  const [dark, setDark] = useState(false);
  const [mode, setMode] = useState<Mode>("render");
  const [fixtureId, setFixtureId] = useState<string>(FIRST.id);
  const [source, setSource] = useState<string>(FIRST.content);
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

  return (
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
  );
}
