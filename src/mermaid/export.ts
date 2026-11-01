/**
 * @file 图表导出（SVG / PNG）
 * @description 导出用的就是页面显示的那一份产物，不重新渲染，避免"看到的和下载的不一致"。
 *   PNG 空白的三条根因都在这里处理：净化后丢失 `xmlns`、仍挂着自适应宽度、文本走
 *   `foreignObject` 时 Canvas 不绘制（后者由 `securityLevel: strict` 关闭 HTML 标签解决）。
 * @created 2026-11-01 21:28
 * @updated 2026-11-01 21:28
 */

"use client";

/** 规范化后的产物 */
export interface PreparedSvg {
  /** 带命名空间、显式宽高的标记 */
  markup: string;
  width: number;
  height: number;
}

/** SVG 命名空间 */
const XMLNS = "http://www.w3.org/2000/svg";
/** xlink 命名空间 */
const XLINK = "http://www.w3.org/1999/xlink";
/** PNG 放大倍数：Canvas 宽高 ×2 后再 scale(2,2)，避免文字发糊 */
const PNG_SCALE = 2;
/** 尺寸兜底 */
const FALLBACK_SIZE = { width: 800, height: 600 };

/**
 * 从 viewBox / width / height 取尺寸
 * @param svg SVG 根元素
 * @returns 宽高（px）
 */
function sizeOf(svg: Element): { width: number; height: number } {
  const viewBox = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  if (viewBox.length === 4 && Number.isFinite(viewBox[2]) && Number.isFinite(viewBox[3])) {
    const width = viewBox[2] as number;
    const height = viewBox[3] as number;
    if (width > 0 && height > 0) return { width, height };
  }
  const width = Number.parseFloat(svg.getAttribute("width") ?? "");
  const height = Number.parseFloat(svg.getAttribute("height") ?? "");
  return {
    width: Number.isFinite(width) && width > 0 ? width : FALLBACK_SIZE.width,
    height: Number.isFinite(height) && height > 0 ? height : FALLBACK_SIZE.height,
  };
}

/**
 * 规范化 SVG 根元素
 * @param source 净化后的 SVG 标记
 * @returns 带命名空间与显式宽高的标记和尺寸
 */
export function prepareSvg(source: string): PreparedSvg {
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const svg = doc.documentElement;
  if (!svg || svg.nodeName !== "svg") return { markup: source, ...FALLBACK_SIZE };
  const { width, height } = sizeOf(svg);
  // 净化可能丢掉命名空间：缺了它 Canvas 绘制必空白，单独打开 SVG 也会报错
  svg.setAttribute("xmlns", XMLNS);
  svg.setAttribute("xmlns:xlink", XLINK);
  // 去掉自适应宽度，改显式宽高；否则导出图会按容器宽度缩成 0
  const style = (svg.getAttribute("style") ?? "").replace(/max-width\s*:[^;]+;?/gi, "").trim();
  if (style) svg.setAttribute("style", style);
  else svg.removeAttribute("style");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  return { markup: new XMLSerializer().serializeToString(svg), width, height };
}

/**
 * 生成下载文件名
 * @param ext 扩展名（不含点）
 * @returns `mermaid-<时间戳>.<ext>`
 */
function fileName(ext: string): string {
  return `mermaid-${Date.now()}.${ext}`;
}

/**
 * 触发浏览器下载
 * @param blob 内容
 * @param name 文件名
 */
function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  link.click();
  // 立刻 revoke 会让部分浏览器下载失败，延后释放
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * 下载 SVG
 * @param source 净化后的 SVG 标记
 */
export function downloadSvg(source: string): void {
  const { markup } = prepareSvg(source);
  downloadBlob(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), fileName("svg"));
}

/**
 * 把 SVG 画到 Canvas 并转成 PNG
 * @param source 净化后的 SVG 标记
 * @param background 画布底色（与图表底板一致，透明底在部分看图软件里显示为黑）
 * @returns PNG Blob
 */
export async function svgToPngBlob(source: string, background: string): Promise<Blob> {
  const { markup, width, height } = prepareSvg(source);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * PNG_SCALE);
  canvas.height = Math.round(height * PNG_SCALE);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建画布上下文");
  ctx.scale(PNG_SCALE, PNG_SCALE);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await image.decode();
  ctx.drawImage(image, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG 生成失败"))), "image/png");
  });
}

/**
 * 下载 PNG
 * @param source 净化后的 SVG 标记
 * @param background 画布底色
 */
export async function downloadPng(source: string, background: string): Promise<void> {
  const blob = await svgToPngBlob(source, background);
  downloadBlob(blob, fileName("png"));
}
