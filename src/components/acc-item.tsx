/**
 * @file 折叠面板子项（`<AccItem title="…">`）
 * @description 可折叠条目：标题 + 内容。带 `id` 时输出同名锚点，并响应父级传入的
 *   `defaultOpen`（父级按 URL hash 判定是否命中）。
 * @created 2026-09-03 22:17
 * @updated 2026-10-24 21:30 语法改为尖括号；新增 id 锚点与 defaultOpen
 */
"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** 子项参数 */
export interface AccItemProps {
  title?: string;
  /** 锚点 id，供 `#id` 深链定位 */
  id?: string;
  /** `open` 默认展开；`close` 或省略则默认收起 */
  type?: string;
  /** 深链命中时由父级传入，优先级高于 type */
  defaultOpen?: boolean;
  children?: ReactNode;
}

/**
 * 折叠面板子项
 * @param props 标题、锚点、默认展开标记与内容
 * @returns 可折叠条目
 */
export default function AccItem({ title, id, type, defaultOpen, children }: AccItemProps) {
  // 初始展开优先级：深链命中 > type="open" > 收起；
  // 深链变化时父级通过 key 触发重挂载，避免在 effect 里 setState
  const [open, setOpen] = useState(Boolean(defaultOpen) || type === "open");

  return (
    <div id={id} className={`accordion-item ${open ? "open" : ""}`}>
      <button
        type="button"
        className="accordion-trigger"
        aria-expanded={open}
        aria-controls={id ? `${id}-panel` : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{title}</span>
        <ChevronDown className="accordion-chevron" />
      </button>
      {/* 内容始终留在 DOM 中，用 grid 行高做展开动画；收起时 inner 高度为 0 并被裁剪 */}
      <div
        id={id ? `${id}-panel` : undefined}
        className="accordion-panel"
        data-open={open ? "true" : "false"}
      >
        <div className="accordion-panel-inner">
          <div className="accordion-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
