/**
 * @file 图片（`<Image />`）
 * @description 自闭合叶子组件：对齐、宽度、题注，可选 `zoom` 点击放大。
 *   外链图片来源不确定，用原生 img 而非 next/image（后者需要逐域配置且对未知尺寸不友好）。
 * @created 2026-09-03 21:54
 * @updated 2026-10-24 22:20 新增 zoom（点击全屏放大，Esc 关闭）
 * @updated 2026-11-02 10:41 遮罩可聚焦、Enter/Space 可关闭并在打开时接管焦点；关闭文案走 UIText
 */
"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { isSafeHref } from "../internal/url-policy";
import { useUIText } from "../internal/text";

/** 图片参数 */
export interface ImageProps {
  src?: string;
  alt?: string;
  align?: "left" | "center" | "right";
  width?: string | number;
  caption?: string;
  /** 点击放大（布尔属性，写 `zoom` 即为真） */
  zoom?: boolean;
  children?: ReactNode;
}

/**
 * 图片（含题注）
 * @param props 图片来源、对齐、宽度、题注与缩放开关
 * @returns 图片元素
 */
export default function Image({
  src,
  alt,
  align = "center",
  width,
  caption,
  zoom,
  children,
}: ImageProps) {
  const [open, setOpen] = useState(false);
  const maskRef = useRef<HTMLDivElement>(null);
  const text = useUIText();
  // 属性来自正文，不能直接信任：协议白名单不过就不加载（诊断在 policy-tags 里给）
  const safeSrc = src && isSafeHref(src) ? src : undefined;
  const w = width ? (typeof width === "number" ? `${width}px` : width) : undefined;
  const figStyle: CSSProperties = { width: w };
  if (align === "center" && !width) figStyle.marginInline = "auto";

  // 放大态：Esc 关闭（点击遮罩同样关闭）
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 打开即把焦点移入遮罩：键盘用户能立刻感知到放大态，且 Enter/Space 可关闭
  useEffect(() => {
    if (open) maskRef.current?.focus();
  }, [open]);

  return (
    <figure className={`image align-${align}`} style={figStyle}>
      {safeSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeSrc}
          alt={alt ?? ""}
          style={{ width: w }}
          className={zoom ? "image-img image-img-zoomable" : "image-img"}
          onClick={zoom ? () => setOpen(true) : undefined}
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
          role="button"
          tabIndex={0}
          aria-label={text.imageZoomClose}
          onClick={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(false);
            }
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt ?? ""} className="image-zoom-img" />
        </div>
      ) : null}
    </figure>
  );
}
