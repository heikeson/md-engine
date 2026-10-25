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
  children,
}: {
  type?: string;
  title?: string;
  children?: ReactNode;
}) {
  const meta = TYPE_MAP[type] ?? TYPE_MAP.note;
  const Icon = meta.icon;
  return (
    <div className={`callout ${meta.cls}`}>
      <div className="callout-title">
        <Icon className="callout-icon" />
        <span>{title ?? meta.label}</span>
      </div>
      <div className="callout-body">{children}</div>
    </div>
  );
}
