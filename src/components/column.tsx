/**
 * @file 列子项（`<Column width="…">`）
 * @description 透传容器：真实渲染由父组件 Columns 读取 width / children 后统一绘制。
 * @created 2026-11-27 10:20
 * @updated 2026-11-27 10:20
 */

"use client";

import type { ReactNode } from "react";

/**
 * 列子项
 * @param props 含 children 及透传属性（width 等）
 * @returns 子元素
 */
export default function Column(props: { children?: ReactNode; [key: string]: unknown }) {
  return <>{props.children}</>;
}
