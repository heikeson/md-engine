/**
 * @file 时间线容器（`<Timeline>` / `<TimelineItem>`）
 * @description 聚合内层 `<TimelineItem date="…" title="…" type="…">` 为带竖线节点的竖向列表。
 *   type 只认 note / tip / warning / danger，表外取值按 note 渲染（与 Callout 同一容错口径）。
 *   节点与竖线由包内 CSS 绘制，正文为其内部 Markdown 内容。
 * @created 2026-11-27 10:20
 * @updated 2026-11-27 10:20
 */

"use client";

import { Children, isValidElement, type ReactNode } from "react";
import { cn } from "../internal/cn";

/** 允许的语气值；表外取值按 note 渲染 */
const TONES = new Set(["note", "tip", "warning", "danger"]);

/** 时间线子项的属性 */
interface TimelineItemProps {
  date?: string;
  title?: string;
  type?: string;
  children?: ReactNode;
}

/**
 * 时间线
 * @param children 内层 `<TimelineItem>` 元素集合
 * @returns 时间线节点
 */
export default function Timeline({ children }: { children?: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <div className="timeline">
      {items.map((el, i) => {
        const { date, title, type, children: body } = el.props as TimelineItemProps;
        const tone = type && TONES.has(type) ? type : "note";
        return (
          <div className={cn("timeline-item", `is-${tone}`)} key={i}>
            <span className="timeline-marker" aria-hidden="true" />
            <div className="timeline-body">
              {date || title ? (
                <div className="timeline-head">
                  {date ? <span className="timeline-date">{date}</span> : null}
                  {title ? <span className="timeline-title">{title}</span> : null}
                </div>
              ) : null}
              <div className="timeline-content">{body}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
