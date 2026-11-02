/**
 * @file 类型表（`<TypeTable>`）
 * @description fumadocs 的 TypeTable 用对象表达式（`type={{…}}`），本项目属性只支持字符串，
 *   因此改为子项形式：每个 `<TypeItem>` 渲染一行。适合 API / 配置项说明。
 * @created 2026-10-24 22:22
 * @updated 2026-10-24 22:22
 * @updated 2026-11-02 10:00 表头文案改经 useUIText 取（i18n）
 */
import { Children, isValidElement, type ReactNode } from "react";
import { useUIText } from "../internal/text-context";

/**
 * 类型表
 * @param children 内层 `<TypeItem>` 元素
 * @returns 表格
 */
export default function TypeTable({ children }: { children?: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement);
  const text = useUIText();
  return (
    <div className="type-table">
      <table>
        <thead>
          <tr>
            <th>{text.thProp}</th>
            <th>{text.thType}</th>
            <th>{text.thDefault}</th>
            <th>{text.thDesc}</th>
          </tr>
        </thead>
        <tbody>{items}</tbody>
      </table>
    </div>
  );
}
