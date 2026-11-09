/**
 * @file 卡片子项（`<Card title="…" href="…" icon="…">`）
 * @description 透传容器：真实渲染由父组件 Cards 读取 title / href / icon / children 后统一绘制。
 * @created 2026-09-03 22:17
 * @updated 2026-09-03 22:17 随嵌套指令方案新增
 * @updated 2026-11-09 10:20 补齐文件头（@file / @description），统一放在 `"use client"` 之前
 */

"use client";

import type { ReactNode } from "react";

/**
 * 卡片子项
 * @param props 含 children 及指令透传的属性（title / href 等）
 * @returns 子元素
 */
export default function Card(props: { children?: ReactNode; [key: string]: unknown }) {
  return <>{props.children}</>;
}
