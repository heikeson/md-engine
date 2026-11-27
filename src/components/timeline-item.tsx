/**
 * @file 时间线子项（`<TimelineItem date="…" title="…">`）
 * @description 透传容器：真实渲染由父组件 Timeline 读取 date / title / type / children 后统一绘制。
 * @created 2026-11-27 10:20
 * @updated 2026-11-27 10:20
 */

"use client";

import type { ReactNode } from "react";

/**
 * 时间线子项
 * @param props 含 children 及透传属性（date / title / type）
 * @returns 子元素
 */
export default function TimelineItem(props: { children?: ReactNode; [key: string]: unknown }) {
  return <>{props.children}</>;
}
