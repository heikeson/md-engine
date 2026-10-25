/**
 * @file 渲染侧 URL 策略（包内自带）
 * @description 内容里的 `href` / `src` 来自正文属性，必须做协议白名单校验，
 *   否则 `javascript:` 之类的地址会变成可点击的 XSS（代码审计 4.3）。
 *   判定口径与宿主 `lib/url-policy.ts` 保持一致，改动须同步两边。
 * @created 2026-10-24 20:10
 * @updated 2026-10-24 20:10
 */

/**
 * 判断 href 是否可安全渲染
 * @param href 原始地址
 * @returns 仅放行锚点、站内相对路径（排除 `//host`）、http(s)/mailto/tel
 */
export function isSafeHref(href: string): boolean {
  const raw = href?.trim();
  if (!raw) return false;
  if (/^#/.test(raw)) return true;
  if (/^\/(?!\/)/.test(raw)) return true;
  if (/^(?:https?:|mailto:|tel:)/i.test(raw)) return true;
  return false;
}
