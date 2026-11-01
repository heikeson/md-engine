/**
 * @file 图表渲染（客户端）：懒加载、串行队列、唯一 id、超时、缓存、净化
 * @description mermaid 是全局单例：`initialize` 改的是全局配置，并发渲染会互相覆盖主题；
 *   `render(id)` 又按 id 在文档里找节点，重复 id 会命中原节点（表现为拿到旧结果或图被删掉）。
 *   因此本模块把渲染收敛成一条串行链 + 每次唯一 id，并把失败收敛成可展示的错误。
 * @created 2026-11-01 21:24
 * @updated 2026-11-01 21:24
 * @updated 2026-11-01 22:37 令牌三级回落（引擎令牌→宿主语义变量→内置）+ oklch/hsl 归一；取色改按图表元素
 */

"use client";

import { useEffect, useState, type RefObject } from "react";
import DOMPurify from "dompurify";
import type { ChartTokens } from "./tokens";
import { DARK_TOKENS, LIGHT_TOKENS, buildMermaidConfig, tokenFingerprint } from "./tokens";

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
 * 把颜色解析成 RGB 三元组
 * @param color hex 或 rgb(a) 字符串
 * @returns [r, g, b]（0–255）；无法解析返回 null
 */
function toTriplet(color: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color);
  if (hex) {
    const value = hex[1] as string;
    // #RGB / #RGBA 先展开成 6/8 位；带 alpha 的只取前 6 位
    const full = value.length <= 4 ? value.split("").map((ch) => ch + ch).join("") : value;
    return [
      Number.parseInt(full.slice(0, 2), 16),
      Number.parseInt(full.slice(2, 4), 16),
      Number.parseInt(full.slice(4, 6), 16),
    ];
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(color);
  if (rgb) {
    const parts = (rgb[1] as string).split(/[\s,/]+/).map(Number).filter((n) => !Number.isNaN(n));
    if (parts.length >= 3) return [parts[0] as number, parts[1] as number, parts[2] as number];
  }
  return null;
}

/**
 * 两色混合
 * @param from 起始色（底板）
 * @param to 目标色（主色）
 * @param weight 目标色占比（0–1）
 * @returns `rgb(...)`；解析失败返回空串
 */
function mixColor(from: string, to: string, weight: number): string {
  const a = toTriplet(from);
  const b = toTriplet(to);
  if (!a || !b) return "";
  const out = a.map((value, index) => Math.round(value + ((b[index] as number) - value) * weight));
  return `rgb(${out[0]}, ${out[1]}, ${out[2]})`;
}

/**
 * 从根元素读取图表令牌实际取值
 * @param dark 是否暗色
 * @returns 令牌取值；未定义或非颜色时回落内置值
 * @description 每个色值按「引擎令牌 → 宿主语义变量 → 内置」三级回落：
 *   `--lkes-chart-*` 在包内是 `var(--card)` 这类链，若浏览器返回的是未替换的 token 文本，
 *   就直接读宿主的 `--card` / `--muted` / `--border` 等，保证跟着宿主主题（含暗色）走。
 */
export function readChartTokens(dark: boolean, element?: HTMLElement | null): ChartTokens {
  const base = dark ? DARK_TOKENS : LIGHT_TOKENS;
  if (typeof window === "undefined") return base;
  // 取色必须基于图表元素本身：主题可能挂在某个容器上（`<div class="dark">`），
  // 此时根元素上读到的仍是亮色变量。
  const style = getComputedStyle(element ?? document.documentElement);
  const read = (names: readonly string[], fallback: string): string => {
    for (const name of names) {
      const value = style.getPropertyValue(name).trim();
      if (!value) continue;
      const color = normalizeColor(value);
      if (color) return color;
    }
    return fallback;
  };
  const series = base.series.map((fallback, index) =>
    read([`--lkes-chart-series-${index + 1}`], fallback),
  );
  const bg = read(["--lkes-chart-bg", "--card", "--background"], base.bg);
  const fg = read(["--lkes-chart-fg", "--foreground"], base.fg);
  // 主色：图表节点必须以它着色。全用 --muted / --card 会让整块 UI 灰成一片、没有层次
  const primary = read(["--primary", "--lkes-accent"], dark ? "#19d3c5" : "#0f766e");
  // 节点面：显式覆盖优先；否则「底板 + 主色 12%」——亮色是薄荷，暗色是深青，都带品牌色
  const nodeExplicit = read(["--lkes-chart-node"], "");
  const node = nodeExplicit || mixColor(bg, primary, 0.12) || base.node;
  // 节点描边：显式覆盖优先；否则「底板 + 主色 32%」，比节点面深一档、边界清晰
  const borderExplicit = read(["--lkes-chart-node-border"], "");
  const nodeBorder = borderExplicit || mixColor(bg, primary, 0.32) || base.nodeBorder;
  return {
    bg,
    fg,
    node,
    nodeBorder,
    line: read(["--lkes-chart-line", "--muted-foreground", "--border"], base.line),
    series,
    fontFamily: style.getPropertyValue("font-family").trim() || base.fontFamily,
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
        const svg = await renderChart(source, readChartTokens(dark, elementRef?.current ?? null));
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
