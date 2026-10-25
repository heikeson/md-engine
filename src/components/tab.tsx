"use client";

import type { ReactNode } from "react";

/**
 * 选项卡子项（`<Tab value="…">`）透传容器。
 * 真实渲染由父组件 Tabs 读取其 label / children 后统一绘制。
 * @param props 含 children 及指令透传的属性（label 等）
 * @created 2026-09-03 22:17
 * @updated 2026-09-03 22:17 随嵌套指令方案新增
 */
export default function Tab(props: { children?: ReactNode; [key: string]: unknown }) {
  return <>{props.children}</>;
}
