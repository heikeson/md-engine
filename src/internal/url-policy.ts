/**
 * @file 渲染侧 URL 策略（包内自带）
 * @description 内容里的 `href` / `src` 来自正文属性，必须做协议校验，否则 `javascript:` 之类的地址
 *   会变成可点击的 XSS（代码审计 4.3）。判定口径：
 *   1. 白名单 scheme（http / https / mailto / tel）放行；
 *   2. 其它任何带 scheme 的地址一律拒绝（javascript / data / blob / file / ftp / chrome …）；
 *   3. 不带 scheme 的引用一律放行：锚点 `#x`、纯查询 `?q=1`、相对路径 `a.png` / `./a.png` / `../a.png`、
 *      站内绝对路径 `/uploads/a.png`、协议相对 `//cdn.example.com/a.png`。
 *   宿主另有一份 `lib/url-policy.ts`，服务友链 / 图库 / 右键菜单等站点自有场景，与本包互不依赖；
 *   本文件是 Markdown 渲染的唯一口径。
 * @created 2026-10-24 20:10
 * @updated 2026-10-26 22:35 放宽口径：放行相对路径与协议相对地址，仍拒绝一切非白名单 scheme
 */

/** 允许的协议 */
const SAFE_SCHEME = /^(?:https?|mailto|tel):/i;

/** 任何 scheme（`name:` 形式），命中且不在白名单即拒绝 */
const ANY_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * 判断 href / src 是否可安全渲染
 * @param href 原始地址
 * @returns 可渲染返回 true；空值与非白名单 scheme 返回 false
 */
export function isSafeHref(href: string): boolean {
  // 去掉首尾空白与前导控制字符：`" javascript:…"` 这类绕过写法同样要被识别
  const raw = (href ?? "").trim().replace(/^[\u0000-\u001f\s]+/, "");
  if (!raw) return false;
  if (SAFE_SCHEME.test(raw)) return true;
  // 其余 scheme 一律拒绝：javascript / data / blob / file / ftp / chrome …
  if (ANY_SCHEME.test(raw)) return false;
  // 无 scheme：锚点、查询、相对路径、站内绝对路径、协议相对地址都放行
  return true;
}
