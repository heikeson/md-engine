/**
 * @file Playground
 * @description 左编辑右预览，直接使用包的 `/editor` 入口。
 *   编辑器只在客户端挂载：服务端输出骨架，避免把 CodeMirror 打进首屏。
 *   分享链接把全文压进 `?s=`，可用于贴复现。
 * @created 2026-11-02 00:38
 * @updated 2026-11-02 00:38
 * @updated 2026-11-09 11:40 预览按需加载图表入口，分屏内可切换 Mermaid 源码 / 图表视图
 */

import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactElement,
} from "react";
import { roundtrip, type RenderConfig } from "@heikeson/md-engine";
import { CopyButton } from "../components/CodeBlock";
import { messagesOf } from "../i18n";
import { useLocalePath } from "../router";

/** 懒加载编辑器：不进首屏 chunk */
const MarkdownEditor = lazy(() =>
  import("@heikeson/md-engine/editor").then((mod) => ({ default: mod.MarkdownEditor })),
);

/** 样例库 */
const SAMPLES = [
  {
    id: "overview",
    name: "组件总览",
    body: [
      "# 组件总览",
      "",
      "<Callout type=\"tip\" title=\"开始写\">",
      "  左边改，右边立刻生效。试一试把 `type` 改成 `warning`。",
      "</Callout>",
      "",
      "<Tabs>",
      '  <Tab value="写法">容器顶格书写，子项可同行。</Tab>',
      '  <Tab value="约束">属性只接受字符串与裸布尔。</Tab>',
      "</Tabs>",
      "",
      "<Steps>",
      '  <Step title="写内容">纯 Markdown。</Step>',
      '  <Step title="存内容">逐字不变。</Step>',
      "</Steps>",
    ].join("\n"),
  },
  {
    id: "docs",
    name: "技术文档片段",
    body: [
      "# 接入说明",
      "",
      "在客户端组件里合并覆写表，图表才会变成可交互的：",
      "",
      "```tsx",
      'import { MarkdownRenderer, mdxComponents } from "@heikeson/md-engine";',
      'import { mermaidComponents } from "@heikeson/md-engine/mermaid";',
      "",
      "const components = { ...mdxComponents, ...mermaidComponents };",
      "```",
      "",
      "<Callout type=\"warning\" title=\"键名要大写\">",
      "  写成 `mermaid` 不会报错，只会静默停留在源码骨架。",
      "</Callout>",
    ].join("\n"),
  },
  {
    id: "edge",
    name: "容错演示",
    body: [
      "# 容错",
      "",
      "下面这个容器没有闭合，引擎不会吞掉后面的内容：",
      "",
      "<Callout type=\"note\" title=\"未闭合\">",
      "  这段之后的内容照常渲染。",
      "",
      "结尾段落依然在。",
    ].join("\n"),
  },
] as const;

/** 英文样例库（与中文样例一一对应，内容为英文） */
const SAMPLES_EN = [
  {
    id: "overview",
    name: "Overview",
    body: [
      "# Overview",
      "",
      '<Callout type="tip" title="Start editing">',
      "  Edit on the left and the preview updates immediately. Try changing `type` to `warning`.",
      "</Callout>",
      "",
      "<Tabs>",
      '  <Tab value="Syntax">Containers start at column zero; children may share a line.</Tab>',
      '  <Tab value="Rules">Attributes accept strings and bare booleans only.</Tab>',
      "</Tabs>",
      "",
      "<Steps>",
      '  <Step title="Write">Plain Markdown.</Step>',
      '  <Step title="Store">Byte-for-byte identical.</Step>',
      "</Steps>",
    ].join("\n"),
  },
  {
    id: "docs",
    name: "Documentation snippet",
    body: [
      "# Integration note",
      "",
      "Merge the override map inside a client component so diagrams become interactive:",
      "",
      "```tsx",
      'import { MarkdownRenderer, mdxComponents } from "@heikeson/md-engine";',
      'import { mermaidComponents } from "@heikeson/md-engine/mermaid";',
      "",
      "const components = { ...mdxComponents, ...mermaidComponents };",
      "```",
      "",
      '<Callout type="warning" title="Key names are case sensitive">',
      "  Writing `mermaid` does not throw; the diagram silently stays in its source skeleton.",
      "</Callout>",
    ].join("\n"),
  },
  {
    id: "edge",
    name: "Fault tolerance",
    body: [
      "# Fault tolerance",
      "",
      "This container is never closed, and the engine does not swallow what follows:",
      "",
      '<Callout type="note" title="Unclosed">',
      "  Everything after this still renders.",
      "",
      "The closing paragraph survives.",
    ].join("\n"),
  },
] as const;

/** 视图 */
type View = "split" | "source" | "preview";

/** UTF-8 → base64（分块，避免长内容爆栈） */
function encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** base64 → UTF-8 */
function decode(value: string): string {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * Playground 主体
 * @returns 编辑器页
 */
export function Playground(): ReactElement {
  const { locale } = useLocalePath();
  const messages = messagesOf(locale);
  // 两套样例的字面量类型不同，显式收窄成同一结构，避免 map / find 的联合类型不可调用
  const sampleList: ReadonlyArray<{ id: string; name: string; body: string }> =
    locale === "zh-CN" ? SAMPLES : SAMPLES_EN;
  const [mounted, setMounted] = useState(false);
  const [sampleId, setSampleId] = useState<string>(sampleList[0].id);
  const [view, setView] = useState<View>("split");
  const [value, setValue] = useState<string>(sampleList[0].body);
  const [notice, setNotice] = useState("");
  /** 预览用组件覆写：图表入口按需加载，加载前由引擎渲染源码骨架 */
  const [chartComponents, setChartComponents] = useState<RenderConfig["components"]>();

  // 放在客户端：图表入口不进首屏 chunk；未装 mermaid / dompurify 时保持骨架
  useEffect(() => {
    let alive = true;
    void import("@heikeson/md-engine/mermaid")
      .then((mod) => {
        if (!alive) return;
        // 覆写表按 tagName 查表，props 由引擎按容器属性透传，这里只做一次类型适配
        setChartComponents({
          Mermaid: mod.mermaidComponents.Mermaid as ComponentType<Record<string, unknown>>,
        });
      })
      .catch(() => {
        /* mermaid / dompurify 未安装：保持引擎默认的源码骨架 */
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get("s");
    if (shared) {
      try {
        setValue(decode(shared));
        setSampleId("shared");
      } catch {
        setNotice(messages.pgBadLink);
      }
    }
    setMounted(true);
  }, []);

  const intact = useMemo(() => {
    try {
      return roundtrip(value) === value;
    } catch {
      return false;
    }
  }, [value]);

  /** 切换样例 */
  const pickSample = (id: string): void => {
    const sample = sampleList.find((item) => item.id === id);
    if (!sample) return;
    setSampleId(sample.id);
    setValue(sample.body);
    setNotice("");
  };

  /**
   * 把当前内容写进地址栏
   * @description 路径取 `window.location.pathname`：英文站是 `/en/playground`，
   *   写死 `/playground` 会把分享链接指回中文站。
   */
  const share = (): void => {
    const path = window.location.pathname;
    const url = `${window.location.origin}${path}?s=${encode(value)}`;
    window.history.replaceState({}, "", `${path}?s=${encode(value)}`);
    navigator.clipboard
      .writeText(url)
      .then(() => setNotice(messages.pgSharedNotice))
      .catch(() => setNotice(messages.pgCopyFail));
  };

  return (
    <main className="playground">
      <div className="pg-bar">
        <div className="pg-group">
          <span className="pg-label">{messages.pgSamples}</span>
          <select
            className="pg-select"
            value={sampleId}
            onChange={(event) => pickSample(event.target.value)}
            aria-label={messages.pgPickSample}
          >
            {sampleList.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.name}
              </option>
            ))}
            {sampleId === "shared" ? <option value="shared">{messages.pgShared}</option> : null}
          </select>
        </div>

        <div className="pg-group pg-views" role="group" aria-label={messages.pgViews}>
          {(["split", "source", "preview"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`pg-view${view === item ? " is-active" : ""}`}
              onClick={() => setView(item)}
            >
              {item === "split"
                ? messages.pgSplit
                : item === "source"
                  ? messages.pgSource
                  : messages.pgPreview}
            </button>
          ))}
        </div>

        <div className="pg-group pg-actions">
          <span className={`pg-status${intact ? " is-ok" : " is-warn"}`}>
            {intact ? messages.pgRoundtripOk : messages.pgRoundtripDiff}
          </span>
          <button type="button" className="btn btn-small" onClick={share}>
            {messages.pgShare}
          </button>
          <CopyButton code={value} label={messages.pgCopyAll} />
        </div>
      </div>

      {notice ? <div className="pg-notice">{notice}</div> : null}

      <div className="pg-stage">
        {mounted ? (
          <div className="pg-editor">
            <Suspense fallback={<div className="pg-loading">{messages.pgLoading}</div>}>
              <MarkdownEditor
                key={view}
                value={value}
                onChange={setValue}
                view={view}
                config={{
                  placeholder: messages.pgPlaceholder,
                  rendererConfig: { components: chartComponents },
                }}
              />
            </Suspense>
          </div>
        ) : (
          <div className="pg-skeleton">
            <div className="pg-skeleton-pane">
              <span className="pg-skeleton-line" />
              <span className="pg-skeleton-line short" />
              <span className="pg-skeleton-line" />
            </div>
            <div className="pg-skeleton-pane">
              <span className="pg-skeleton-line" />
              <span className="pg-skeleton-line short" />
            </div>
            <p className="pg-skeleton-hint">{messages.pgSkeletonHint}</p>
          </div>
        )}
      </div>
    </main>
  );
}
