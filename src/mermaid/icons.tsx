/**
 * @file 图表界面图标
 * @description 内联 SVG（stroke 走 currentColor），不引图标库：包内已有自绘图标的先例，
 *   少一个运行时依赖，体积也只有几百字节。
 * @created 2026-11-01 22:29
 * @updated 2026-11-01 22:29
 */

import type { ReactElement, ReactNode } from "react";

/** 图标公共属性 */
interface IconProps {
  /** 视觉尺寸（px），默认 16 */
  size?: number;
}

/** 统一描边参数：1.75 在 16px 下清晰但不显笨重 */
const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/**
 * 图标外壳
 * @param props 尺寸与图形
 * @returns svg 元素
 */
function Svg({ size = 16, children }: IconProps & { children: ReactNode }): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...STROKE}>
      {children}
    </svg>
  );
}

/**
 * 代码尖括号图标（表示"源码"）
 * @param props 尺寸
 * @returns 图标
 */
export function CodeIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </Svg>
  );
}

/**
 * 复制图标
 * @param props 尺寸
 * @returns 图标
 */
export function CopyIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  );
}

/**
 * 下载图标
 * @param props 尺寸
 * @returns 图标
 */
export function DownloadIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </Svg>
  );
}

/**
 * 图片图标（表示导出 PNG）
 * @param props 尺寸
 * @returns 图标
 */
export function ImageIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
    </Svg>
  );
}

/**
 * 放大图标（放大镜带加号）
 * @param props 尺寸
 * @returns 图标
 */
export function ZoomInIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.7" y2="16.7" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </Svg>
  );
}

/**
 * 缩小图标（放大镜带减号）
 * @param props 尺寸
 * @returns 图标
 */
export function ZoomOutIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.7" y2="16.7" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </Svg>
  );
}

/**
 * 重置图标（逆时针回环箭头）
 * @param props 尺寸
 * @returns 图标
 */
export function ResetIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <polyline points="3 3.5 3 9.5 9 9.5" />
    </Svg>
  );
}
