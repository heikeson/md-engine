/**
 * @file 类型表行（`<TypeItem name="…" type="…" default="…" required>`）
 * @description 作为 `<TypeTable>` 的子项渲染成 `<tr>`；说明文字用正文（children）。
 *   「必填」标记与空值占位走 UI 文案表。
 * @created 2026-10-24 22:22
 * @updated 2026-11-02 19:32 必填标记与空值占位接入 UI 文案表
 */

"use client";

import type { ReactNode } from "react";
import { useUIText } from "../internal/text";

/** 行参数 */
export interface TypeItemProps {
  /** 属性名 */
  name?: string;
  /** 类型表达式，如 `string` / `"a" | "b"` */
  type?: string;
  /** 默认值 */
  default?: string;
  /** 是否必填（布尔属性） */
  required?: boolean;
  /** 说明 */
  children?: ReactNode;
}

/**
 * 类型表行
 * @param props 属性名、类型、默认值、必填标记与说明
 * @returns 表格行
 */
export default function TypeItem({ name, type, default: defaultValue, required, children }: TypeItemProps) {
  const text = useUIText();
  const empty = text.typeItemEmpty;
  return (
    <tr className="type-item">
      <td className="type-cell-name">
        <code>{name}</code>
        {required ? <span className="type-required">{text.typeItemRequired}</span> : null}
      </td>
      <td>
        <code>{type ?? empty}</code>
      </td>
      <td className="type-cell-default">{defaultValue ?? empty}</td>
      <td className="type-cell-desc">{children}</td>
    </tr>
  );
}
