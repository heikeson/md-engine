/**
 * @file 文件树容器（`<Files>`）
 * @description 子项为 `<Folder>` 与 `<File>`，按书写顺序渲染成树。
 *   目录用原生 `<details>` 折叠（服务端友好、零客户端 JS）。
 * @created 2026-09-03 21:54
 * @updated 2026-10-24 21:58 语法改为 fumadocs 风格 Files / Folder / File
 */
import type { ReactNode } from "react";

/**
 * 文件树
 * @param children 内层 `<Folder>` / `<File>` 元素
 */
export default function Files({ children }: { children?: ReactNode }) {
  return <div className="files">{children}</div>;
}
