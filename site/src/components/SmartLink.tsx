/**
 * @file 站内链接（渲染器覆盖用）
 * @description 引擎输出的 `a` 是原生锚点，点站内链接会整页刷新。
 *   这里只拦截「以 / 开头且非锚点」的地址，其余（外链、mailto、#锚点）原样交给浏览器。
 * @created 2026-11-02 01:48
 * @updated 2026-11-02 01:48
 */

import type { AnchorHTMLAttributes, ReactElement } from "react";
import { Link } from "../router";

/** 锚点属性（引擎透传） */
type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string };

/**
 * 智能链接
 * @param props 引擎透传的 a 属性
 * @returns 站内走路由、站外交给浏览器
 */
export function SmartLink({ href, children, ...rest }: AnchorProps): ReactElement {
  const external = !href || /^([a-z]+:)?\/\//i.test(href) || href.startsWith("#") || href.startsWith("?");
  if (external) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
