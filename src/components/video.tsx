/**
 * @file 视频（`<Video />`）
 * @description 自闭合叶子组件：来源、封面、题注与宽度。属性同样来自正文，
 *   故与 Image 一样在组件内补一层协议白名单兜底（hast 层闸门之外的第二道）。
 *   宽度写法与 Image 同一套（`auto` / `60%` / `1/3` / `360` / `20rem`），解析见 `internal/width`。
 * @created 2026-11-27 10:20
 * @updated 2026-11-27 11:50 宽度改用共用的 parseWidth：支持 auto 与分数占比，超过 100% 收敛
 */

import type { ReactNode } from "react";
import { isSafeHref } from "../internal/url-policy";
import { parseWidth } from "../internal/width";

/** 视频参数 */
export interface VideoProps {
  /** 视频地址 */
  src?: string;
  /** 封面图地址 */
  poster?: string;
  /** 题注；也可用正文补充说明 */
  caption?: string;
  /** 宽度：写法同 `Image`（`auto` / 占比 / 像素 / 长度） */
  width?: string | number;
  children?: ReactNode;
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
  const w = parseWidth(width);
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
