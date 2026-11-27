/**
 * @file 视频（`<Video />`）
 * @description 自闭合叶子组件：来源、封面、题注与宽度。属性同样来自正文，
 *   故与 Image 一样在组件内补一层协议白名单兜底（hast 层闸门之外的第二道）。
 *   宽度只接受数字（按像素）或 px / % / rem / em / ch / vw，其余写法忽略。
 * @created 2026-11-27 10:20
 * @updated 2026-11-27 10:20
 */

import type { ReactNode } from "react";
import { isSafeHref } from "../internal/url-policy";

/** 视频参数 */
export interface VideoProps {
  /** 视频地址 */
  src?: string;
  /** 封面图地址 */
  poster?: string;
  /** 题注；也可用正文补充说明 */
  caption?: string;
  /** 宽度：纯数字按像素，其余按 CSS 长度 */
  width?: string;
  children?: ReactNode;
}

/** 接受的宽度写法 */
const WIDTH_RE = /^\d+(?:\.\d+)?(?:px|%|rem|em|ch|vw)?$/;

/** 纯数字：按像素补齐单位 */
const BARE_NUMBER_RE = /^\d+(?:\.\d+)?$/;

/**
 * 把 width 属性换算成 CSS 长度
 * @param width 属性原文
 * @returns CSS 长度；未给或写法不合法时返回 undefined
 */
function widthOf(width?: string): string | undefined {
  if (!width) return undefined;
  const value = width.trim();
  if (!WIDTH_RE.test(value)) return undefined;
  return BARE_NUMBER_RE.test(value) ? `${value}px` : value;
}

/**
 * 视频（含题注）
 * @param props 视频来源、封面、题注与宽度
 * @returns 视频元素
 */
export default function Video({ src, poster, caption, width, children }: VideoProps) {
  // 属性来自正文，不能直接信任：协议白名单不过就不加载（诊断在 policy-tags 里给）
  const safeSrc = src && isSafeHref(src) ? src : undefined;
  const safePoster = poster && isSafeHref(poster) ? poster : undefined;
  const w = widthOf(width);
  return (
    <figure className="video" style={w ? { width: w } : undefined}>
      {safeSrc ? (
        <video
          className="video-el"
          src={safeSrc}
          poster={safePoster}
          controls
          preload="metadata"
          playsInline
        />
      ) : null}
      {caption ? (
        <figcaption>{caption}</figcaption>
      ) : children ? (
        <figcaption>{children}</figcaption>
      ) : null}
    </figure>
  );
}
