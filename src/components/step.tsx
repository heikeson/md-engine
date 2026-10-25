"use client";

import type { ReactNode } from "react";

/**
 * 步骤子项（`<Step title="…">`）透传容器。
 * 真实渲染由父组件 Steps 读取其 title / children 后统一绘制，故此组件仅作占位。
 * @param props 含 children 及指令透传的属性（title 等）
 * @created 2026-09-03 22:17
 * @updated 2026-09-03 22:17 随嵌套指令方案新增
 */
export default function Step(props: { children?: ReactNode; [key: string]: unknown }) {
  return <>{props.children}</>;
}
