"use client";

import {
  AlertCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

type CalloutType = "note" | "tip" | "important" | "warning" | "caution" | "info" | "danger";

const TYPE_MAP: Record<CalloutType | string, { icon: LucideIcon; cls: string; label: string }> = {
  note: { icon: Info, cls: "callout-note", label: "注意" },
  info: { icon: Info, cls: "callout-note", label: "信息" },
  tip: { icon: Lightbulb, cls: "callout-tip", label: "提示" },
  important: { icon: AlertCircle, cls: "callout-important", label: "重要" },
  warning: { icon: AlertTriangle, cls: "callout-warning", label: "警告" },
  caution: { icon: XCircle, cls: "callout-caution", label: "小心" },
  danger: { icon: XCircle, cls: "callout-caution", label: "危险" },
  // fumadocs 风格别名：只映射到既有配色，不新增视觉分支（语法只增不改）
  warn: { icon: AlertTriangle, cls: "callout-warning", label: "警告" },
  error: { icon: XCircle, cls: "callout-caution", label: "错误" },
  success: { icon: Lightbulb, cls: "callout-tip", label: "成功" },
  idea: { icon: Lightbulb, cls: "callout-tip", label: "想法" },
};

export default function Callout({
  type = "note",
  title,
  icon,
  children,
}: {
  type?: string;
  title?: string;
  /** 自定义图标：字符串（emoji / 短文本，Markdown 属性可用）或 React 节点（TSX 直接使用时可用） */
  icon?: ReactNode;
  children?: ReactNode;
}) {
  const meta = TYPE_MAP[type] ?? TYPE_MAP.note;
  const Icon = meta.icon;
  // 字符串图标包一层固定尺寸的 span（与 lucide 图标同为 16×16，对齐规则一致）；
  // 节点原样渲染，交给使用方控制样式
  const iconNode =
    icon === undefined || icon === null || icon === ""
      ? <Icon className="callout-icon" />
      : typeof icon === "string"
        ? <span className="callout-icon-text" role="img" aria-label={icon}>{icon}</span>
        : icon;

  return (
    <div className={`callout ${meta.cls}`}>
      {title ? (
        <>
          <div className="callout-title">
            {iconNode}
            <span>{title}</span>
          </div>
          <div className="callout-body">{children}</div>
        </>
      ) : (
        // 无标题：图标与正文同行，不补默认标签（避免凭空多出"注意/警告"一行）
        <div className="callout-inline">
          {iconNode}
          <div className="callout-body">{children}</div>
        </div>
      )}
    </div>
  );
}
