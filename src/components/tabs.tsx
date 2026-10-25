/**
 * @file 选项卡容器
 * @description 聚合内层 `<Tab value="…">` 子项为可切换面板。子项标题取 `value`（与 fumadocs 命名一致），
 *   带 `default` 布尔的子项为默认激活项。
 * @created 2026-09-03 21:54
 * @updated 2026-10-24 20:27 子项属性由 label 改为 value，随尖括号语法切换
 */
"use client";

import { Children, isValidElement, useState, type ReactNode } from "react";
import { cn } from "../internal/cn";

/**
 * 选项卡
 * @param children 内层 Tab 元素集合
 */
export default function Tabs({ children }: { children?: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement);
  // 有 default 的子项作为初始激活项，否则激活第一项
  const initial = Math.max(
    0,
    items.findIndex((el) => (el.props as { default?: boolean }).default === true),
  );
  const [active, setActive] = useState(initial);
  if (items.length === 0) return null;
  return (
    <div className="tabs">
      <div className="tabs-header" role="tablist">
        {items.map((el, i) => {
          const { value } = el.props as { value?: string };
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active === i}
              className={cn("tab-btn", active === i && "active")}
              onClick={() => setActive(i)}
            >
              {value}
            </button>
          );
        })}
      </div>
      <div className="tabs-body">
        {items.map((el, i) => {
          const { children: body } = el.props as { children?: ReactNode };
          return (
            <div key={i} role="tabpanel" hidden={active !== i} className="tab-panel">
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
