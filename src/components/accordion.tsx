/**
 * @file 折叠面板容器（`<Accordion>` / `<AccItem>`）
 * @description 聚合内层 `<AccItem title="…" id="…">` 为可折叠列表。
 *   子项带 `id` 时支持深链：URL hash 命中即自动展开（`#id`）。
 * @created 2026-09-03 21:54
 * @updated 2026-10-24 21:30 语法改为尖括号；新增 id 深链展开
 */
"use client";

import { Children, isValidElement, useEffect, useState, type ReactNode } from "react";
import AccItem from "./acc-item";

/**
 * 折叠面板
 * @param children 内层 `<AccItem>` 元素集合
 */
export default function Accordion({ children }: { children?: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement);
  const [activeId, setActiveId] = useState<string | null>(null);

  // 深链：hash 变化时记录命中的子项 id（点击锚点或直接访问 #id 都会展开）
  useEffect(() => {
    const applyHash = (): void => {
      const raw = window.location.hash.replace(/^#/, "");
      setActiveId(raw ? decodeURIComponent(raw) : null);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  return (
    <div className="accordion">
      {items.map((el, i) => {
        const { title, id, type, children: body } = el.props as {
          title?: string;
          id?: string;
          type?: string;
          children?: ReactNode;
        };
        // key 带上命中标记：hash 切换时只有命中项重挂载，其余项保留用户的展开状态
        const hit = Boolean(id && id === activeId);
        return (
          <AccItem
            key={`${i}:${hit ? "open" : "closed"}`}
            title={title}
            id={id}
            type={type}
            defaultOpen={hit}
          >
            {body}
          </AccItem>
        );
      })}
    </div>
  );
}
