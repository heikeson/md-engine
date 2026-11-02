/**
 * @file 类型表（`<TypeTable>`）
 * @description fumadocs 的 TypeTable 用对象表达式（`type={{…}}`），本项目属性只支持字符串，
 *   因此改为子项形式：每个 `<TypeItem>` 渲染一行。适合 API / 配置项说明。
 *   表头文案走 UI 文案表，随 locale 切换。
 * @created 2026-10-24 22:22
 * @updated 2026-11-02 19:32 表头接入 UI 文案表（支持多语言）
 */

"use client";

import { Children, isValidElement, type ReactNode } from "react";
import { useUIText } from "../internal/text";

/**
 * 类型表
 * @param children 内层 `<TypeItem>` 元素
 * @returns 表格
 */
export default function TypeTable({ children }: { children?: ReactNode }) {
  const text = useUIText();
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <div className="type-table">
      <table>
        <thead>
          <tr>
            <th>{text.typeTableAttr}</th>
            <th>{text.typeTableType}</th>
            <th>{text.typeTableDefault}</th>
            <th>{text.typeTableDesc}</th>
          </tr>
        </thead>
        <tbody>{items}</tbody>
      </table>
    </div>
  );
}
