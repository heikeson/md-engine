"use client";

import { Children, isValidElement, type ReactNode } from "react";

/**
 * 步骤容器：聚合内层 `<Step title="…">` 为带序号竖线的步骤列表。
 * 每个 step 的 title 取自指令属性，正文为其内部 Markdown 内容（可含任意块级元素）。
 * @param children 内层 step 元素集合
 * @created 2026-09-03 21:54
 * @updated 2026-10-24 21:32 语法改为尖括号 `<Step>`，支持任意嵌套内容
 */
export default function Steps({ children }: { children?: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <div className="steps">
      {items.map((el, i) => {
        const { title, children: body } = el.props as { title?: string; children?: ReactNode };
        return (
          <div className="step" key={i}>
            <div className="step-marker">{i + 1}</div>
            <div className="step-body">
              {title ? <div className="step-title">{title}</div> : null}
              <div className="step-content">{body}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
