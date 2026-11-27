/**
 * @file 图片（`<Image />`）
 * @description 自闭合叶子组件：对齐、宽度、题注，可选 `zoom` 点击放大。
 *   外链图片来源不确定，用原生 img 而非 next/image（后者需要逐域配置且对未知尺寸不友好）。
 *   宽度只接受纯数字（按像素补齐单位）或 px / % / rem / em / ch / vw；对齐只认 left / center / right，
 *   表外取值退回 center——属性值来自正文，不能直接拼进 className 或 style。
 * @created 2026-09-03 21:54
 * @updated 2026-11-27 11:10 宽度补单位与白名单、align 白名单、懒加载、放大态键盘可达 + 滚动锁 + 焦点归还
 */
"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../internal/cn";
import { isSafeHref } from "../internal/url-policy";
import { useUIText } from "../internal/text";

/** 允许的对齐方式 */
const ALIGNS = ["left", "center", "right"] as const;

/** 对齐方式 */
type Align = (typeof ALIGNS)[number];

/** 接受的宽度写法：纯数字（按像素）或数字 + 单位 */
const WIDTH_RE = /^\d+(?:\.\d+)?(?:px|%|rem|em|ch|vw)?$/;

/** 纯数字：按像素补齐单位 */
const BARE_NUMBER_RE = /^\d+(?:\.\d+)?$/;

/** 图片参数 */
export interface ImageProps {
  src?: string;
  alt?: string;
  align?: "left" | "center" | "right";
  /** 宽度：纯数字按像素，其余按 CSS 长度 */
  width?: string | number;
  caption?: string;
  /** 点击放大（布尔属性，写 `zoom` 即为真） */
  zoom?: boolean;
  children?: ReactNode;
}

/**
 * 取合法对齐方式
 * @param value 属性原文
 * @returns 白名单内的值；否则 center
 */
function alignOf(value?: string): Align {
  return value && (ALIGNS as readonly string[]).includes(value) ? (value as Align) : "center";
}

/**
 * 把 width 属性换算成 CSS 长度
 * @param value 属性原文（宿主也可直接传数字）
 * @returns CSS 长度；未给或写法不合法时返回 undefined
 */
function widthOf(value?: string | number): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = typeof value === "number" ? String(value) : value.trim();
  if (!WIDTH_RE.test(text)) return undefined;
  return BARE_NUMBER_RE.test(text) ? `${text}px` : text;
}

/**
 * 图片（含题注）
 * @param props 图片来源、对齐、宽度、题注与缩放开关
 * @returns 图片元素
 */
export default function Image({
  src,
  alt,
  align: alignProp,
  width,
  caption,
  zoom,
  children,
}: ImageProps) {
  const [open, setOpen] = useState(false);
  const maskRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLImageElement>(null);
  /** 是否曾经打开过：用来区分「首次渲染的关闭态」与「用户关闭」，避免挂载时抢焦点 */
  const wasOpen = useRef(false);
  const text = useUIText();
  // 属性来自正文，不能直接信任：协议白名单不过就不加载（诊断在 policy-tags 里给）
  const safeSrc = src && isSafeHref(src) ? src : undefined;
  const align = alignOf(alignProp);
  const w = widthOf(width);
  const figStyle: CSSProperties = {};
  if (w) figStyle.width = w;

  // 放大态：Esc 关闭；打开期间锁滚动，关闭后把焦点还给触发图
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) {
        wasOpen.current = false;
        triggerRef.current?.focus();
      }
      return;
    }
    wasOpen.current = true;
    maskRef.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 既没有可显示的图，也没有题注：不留一个空 figure 占位
  if (!safeSrc && !caption && !children) return null;

  return (
    <figure className={cn("image", `align-${align}`)} style={w ? figStyle : undefined}>
      {safeSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={triggerRef}
          src={safeSrc}
          alt={alt ?? ""}
          loading="lazy"
          decoding="async"
          style={w ? { width: w } : undefined}
          className={cn("image-img", zoom && "image-img-zoomable")}
          // 放大触发面：用 role/tabIndex 补键盘可达，不额外套按钮以免破坏宿主已有的 img 选择器
          role={zoom ? "button" : undefined}
          tabIndex={zoom ? 0 : undefined}
          aria-label={zoom ? text.imageZoomOpen : undefined}
          aria-haspopup={zoom ? "dialog" : undefined}
          onClick={zoom ? () => setOpen(true) : undefined}
          onKeyDown={
            zoom
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setOpen(true);
                  }
                }
              : undefined
          }
        />
      ) : null}
      {caption ? (
        <figcaption>{caption}</figcaption>
      ) : children ? (
        <figcaption>{children}</figcaption>
      ) : null}
      {zoom && open && safeSrc ? (
        <div
          ref={maskRef}
          className="image-zoom-mask"
          role="dialog"
          aria-modal="true"
          aria-label={text.imageZoomClose}
          tabIndex={-1}
          onClick={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(false);
            }
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={safeSrc} alt={alt ?? ""} className="image-zoom-img" />
        </div>
      ) : null}
    </figure>
  );
}
