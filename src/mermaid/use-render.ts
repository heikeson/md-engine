/**
 * @file 图表渲染（客户端）：懒加载、串行队列、唯一 id、超时、缓存、净化
 * @description mermaid 是全局单例：`initialize` 改的是全局配置，并发渲染会互相覆盖主题；
 *   `render(id)` 又按 id 在文档里找节点，重复 id 会命中原节点（表现为拿到旧结果或图被删掉）。
 *   因此本模块把渲染收敛成一条串行链 + 每次唯一 id，并把失败收敛成可展示的错误。
 * @created 2026-11-01 21:24
 * @updated 2026-11-01 21:24
 * @updated 2026-11-01 22:37 令牌三级回落（引擎令牌→宿主语义变量→内置）+ oklch/hsl 归一；取色改按图表元素
 * @updated 2026-11-01 22:51 取色改为「JS 配置 → 组件自带 --lkes-chart-* → 内置」，不再读宿主变量
 */

"use client";

import { useEffect, useState, type RefObject } from "react";
import DOMPurify from "dompurify";
import type { ChartTokens } from "./tokens";
import { buildMermaidConfig, getChartTheme, hasCustomChartTheme, tokenFingerprint } from "./tokens";

/** mermaid 模块的最小接口（不引 mermaid 类型：它是可选 peer，未装也能构建） */
interface MermaidLike {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, text: string) => Promise<{ svg: string }>;
}

/** 渲染状态 */
export type RenderStatus = "idle" | "loading" | "ready" | "error";

/** 渲染结果 */
export interface RenderResult {
  status: RenderStatus;
  /** 已净化的 SVG 标记 */
  svg: string;
  /** 失败原因（可直接展示） */
  error: string;
}

/** 单次渲染超时（毫秒）：一张卡死不能拖垮整页 */
const RENDER_TIMEOUT = 10_000;

/** 渲染产物缓存：键为「令牌指纹 + 源码」 */
const CACHE = new Map<string, string>();

/** 渲染 id 自增序号 */
let seq = 0;

/** 串行链（mermaid 全局单例，必须串行） */
let chain: Promise<unknown> = Promise.resolve();

/** mermaid 模块只加载一次 */
let loader: Promise<MermaidLike> | null = null;

/**
 * 取下一个渲染 id
 * @returns 形如 `lkes-mermaid-7` 的唯一 id
 */
function nextId(): string {
  seq += 1;
  return `lkes-mermaid-${seq}`;
}

/**
 * 把任务排进串行链
 * @param task 待执行任务
 * @returns 任务结果
 */
function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  const result = chain.then(task, task);
  chain = result.catch(() => undefined);
  return result;
}

/**
 * 给 Promise 加超时
 * @param task 原任务
 * @param ms 超时毫秒数
 * @returns 原结果或超时异常
 */
function withTimeout<T>(task: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("图表渲染超时")), ms);
    task.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * 懒加载 mermaid（同页只加载一次）
 * @returns mermaid 默认导出
 */
function loadMermaid(): Promise<MermaidLike> {
  loader ??= import("mermaid").then((mod) => mod.default as unknown as MermaidLike);
  return loader;
}

/**
 * 净化图表 SVG
 * @param svg mermaid 产物
 * @returns 净化后的标记
 * @description 保留 `<style>` 与 SVG 命名空间（扒光样式图会走形），禁掉脚本与事件属性。
 *   `securityLevel: strict` 已让 mermaid 不输出 HTML/事件，这里是第二道兜底。
 */
function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["style"],
    ADD_ATTR: ["dominant-baseline"],
  });
}

/**
 * 判断字符串是否为 mermaid 能直接解析的颜色字面量
 * @param value CSS 变量值
 * @returns 是否 hex / rgb / rgba
 */
function isParsableColor(value: string): boolean {
  return /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) || /^rgba?\([^)]*\)$/i.test(value);
}

/**
 * 把任意 CSS 颜色写法归一成 mermaid 能解析的 rgb
 * @param value 变量原始值（可能是 oklch / hsl / 命名色）
 * @returns rgb(a) 字符串；无法归一返回空串
 * @description Tailwind v4 等主题的变量常是 `oklch(...)`，mermaid 的取色器不认，
 *   这里借一个临时元素让浏览器算成 rgb——只在渲染时跑几次，开销可忽略。
 */
function normalizeColor(value: string): string {
  if (isParsableColor(value)) return value;
  if (typeof document === "undefined" || !document.body) return "";
  const probe = document.createElement("span");
  probe.style.color = value;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  return isParsableColor(rgb) ? rgb : "";
}

/**
 * 解析当前生效的图表配色
 * @param dark 是否暗色
 * @param element 图表元素（用于读取 CSS 层的 `--lkes-chart-*` 覆盖）
 * @returns 该明暗下的完整配色
 * @description 优先级：**JS 配置**（`configureChartTheme`）→ 包自带的 `--lkes-chart-*` → 内置默认。
 *   全程不读宿主的 `--card` / `--foreground` / `--muted` 等语义变量：
 *   装完即可用，宿主换主题也不会让图表串色。
 */
export function resolveChartTokens(dark: boolean, element?: HTMLElement | null): ChartTokens {
  const theme = getChartTheme();
  const base = dark ? theme.dark : theme.light;
  if (hasCustomChartTheme() || typeof window === "undefined") return base;
  const style = getComputedStyle(element ?? document.documentElement);
  const read = (name: string, fallback: string): string => {
    const value = style.getPropertyValue(name).trim();
    if (!value) return fallback;
    return normalizeColor(value) || fallback;
  };
  return {
    bg: read("--lkes-chart-bg", base.bg),
    fg: read("--lkes-chart-fg", base.fg),
    node: read("--lkes-chart-node", base.node),
    nodeBorder: read("--lkes-chart-node-border", base.nodeBorder),
    line: read("--lkes-chart-line", base.line),
    series: base.series.map((fallback, index) => read(`--lkes-chart-series-${index + 1}`, fallback)),
    fontFamily: base.fontFamily,
  };
}

/**
 * 渲染一张图表（命中缓存则同步返回）
 * @param source 图表源码
 * @param tokens 令牌取值
 * @returns 净化后的 SVG 标记
 */
export async function renderChart(source: string, tokens: ChartTokens): Promise<string> {
  const key = `${tokenFingerprint(tokens)}#${source}`;
  const cached = CACHE.get(key);
  if (cached) return cached;
  const mermaid = await loadMermaid();
  const svg = await runExclusive(async () => {
    mermaid.initialize(buildMermaidConfig(tokens));
    const out = await withTimeout(mermaid.render(nextId(), source), RENDER_TIMEOUT);
    return out.svg;
  });
  const clean = sanitizeSvg(svg);
  // 失败产物不入缓存：下次挂载自动重试
  CACHE.set(key, clean);
  return clean;
}

/**
 * 渲染 hook
 * @param source 图表源码
 * @param enabled 是否已进入视口（false 时保持 idle，不加载 mermaid）
 * @param dark 是否暗色
 * @returns 渲染结果
 */
export function useMermaidRender(
  source: string,
  enabled: boolean,
  dark: boolean,
  elementRef?: RefObject<HTMLElement | null>,
): RenderResult {
  const [state, setState] = useState<RenderResult>({ status: "idle", svg: "", error: "" });

  useEffect(() => {
    if (!enabled) return;
    // 竞态标记：卸载或源码/主题变化后不再写状态
    let cancelled = false;
    setState((prev) => (prev.status === "ready" ? prev : { ...prev, status: "loading", error: "" }));
    void (async () => {
      try {
        const svg = await renderChart(source, resolveChartTokens(dark, elementRef?.current ?? null));
        if (!cancelled) setState({ status: "ready", svg, error: "" });
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "图表渲染失败";
          // 失败要可见：降级成源码，并在控制台留一条可诊断的记录
          console.warn("[md-engine] mermaid 渲染失败，已降级为源码：", message);
          setState({ status: "error", svg: "", error: message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, enabled, dark]);

  return state;
}
