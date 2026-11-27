/**
 * @file 多列布局（`<Columns>` / `<Column>`）
 * @description 聚合内层 `<Column width="…">` 为横向多列。width 纯数字按比例分配（跨列宽），
 *   带单位（px / % / rem / em / ch / vw）按固定宽度；其余写法忽略、退回等分。
 *   列宽以 CSS 变量下发（--lkes-col-grow / --lkes-col-basis），窄屏堆叠由包内样式接管。
 * @created 2026-11-27 10:20
 * @updated 2026-11-27 10:20
 */

"use client";

import { Children, isValidElement, type CSSProperties, type ReactNode } from "react";

/** 接受的列宽写法：纯数字（比例）或数字 + 单位（固定宽度） */
const WIDTH_RE = /^\d+(?:\.\d+)?(?:px|%|rem|em|ch|vw)?$/;

/** 纯数字：按比例分配 */
const RATIO_RE = /^\d+(?:\.\d+)?$/;

/** 列宽自定义属性（样式层读取，不在元素上写 flex 声明，窄屏才能整条覆盖） */
interface ColumnVars extends CSSProperties {
  "--lkes-col-grow"?: number;
  "--lkes-col-basis"?: string;
}

/**
 * 把 width 属性换算成列宽变量
 * @param width 属性原文
 * @returns 自定义属性对象；未给或写法不合法时返回 undefined（等分）
 */
function columnVars(width?: string): ColumnVars | undefined {
  if (!width) return undefined;
  const value = width.trim();
  if (!WIDTH_RE.test(value)) return undefined;
  if (RATIO_RE.test(value)) {
    const ratio = Number(value);
    return ratio > 0 ? { "--lkes-col-grow": ratio } : undefined;
  }
  return { "--lkes-col-basis": value };
}

/**
 * 多列布局
 * @param children 内层 `<Column>` 元素集合
 * @returns 列布局节点
 */
export default function Columns({ children }: { children?: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <div className="columns">
      {items.map((el, i) => {
        const { width, children: body } = el.props as { width?: string; children?: ReactNode };
        return (
          <div className="column" key={i} style={columnVars(width)}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
