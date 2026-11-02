/**
 * @file 选项卡容器
 * @description 聚合内层 `<Tab value="…">` 子项为可切换面板。子项标题取 `value`（与 fumadocs 命名一致），
 *   带 `default` 布尔的子项为默认激活项。
 * @created 2026-09-03 21:54
 * @updated 2026-10-24 20:27 子项属性由 label 改为 value，随尖括号语法切换
 * @updated 2026-11-02 10:40 补齐 WAI-ARIA Tabs 键盘规范：tab/panel id 关联、方向键切换、roving tabindex
 */
"use client";

import {
  Children,
  isValidElement,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "../internal/cn";

/**
 * 选项卡容器
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
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // 键盘规范：←/→ 循环移动，Home/End 跳首尾；焦点跟随激活项（roving tabindex）
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const count = items.length;
    if (count === 0) return;
    let next = -1;
    if (event.key === "ArrowRight") next = (active + 1) % count;
    else if (event.key === "ArrowLeft") next = (active - 1 + count) % count;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    if (next < 0) return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  if (items.length === 0) return null;
  return (
    <div className="tabs">
      <div className="tabs-header" role="tablist" onKeyDown={onKeyDown}>
        {items.map((el, i) => {
          const { value } = el.props as { value?: string };
          return (
            <button
              key={i}
              type="button"
              role="tab"
              id={`${baseId}-tab-${i}`}
              aria-selected={active === i}
              aria-controls={`${baseId}-panel-${i}`}
              tabIndex={active === i ? 0 : -1}
              ref={(node) => {
                tabRefs.current[i] = node;
              }}
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
            <div
              key={i}
              role="tabpanel"
              id={`${baseId}-panel-${i}`}
              aria-labelledby={`${baseId}-tab-${i}`}
              hidden={active !== i}
              className="tab-panel"
            >
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
