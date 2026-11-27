/**
 * @file 宽度写法解析（Image / Video 共用）
 * @description 属性值来自正文，不能直接拼进 style，故在这里统一校验并归一：
 *   `auto`（或空 / 缺省）→ undefined（按原始尺寸）；`60%` / `1/3` → 百分比（超过 100% 收敛到 100%）；
 *   `360` → 像素；`20rem` 等 → 原样返回。
 *   本模块是纯函数，不依赖 React / DOM，SSR 与浏览器同一结果。
 * @created 2026-11-27 11:50
 * @updated 2026-11-27 11:50
 */

/** 接受的长度写法：纯数字（按像素）或数字 + 单位 */
const LENGTH_RE = /^\d+(?:\.\d+)?(?:px|%|rem|em|ch|vw)?$/;

/** 纯数字：按像素补齐单位 */
const BARE_NUMBER_RE = /^\d+(?:\.\d+)?$/;

/** 分数占比：`1/2`、`2/3`、`3/4` */
const FRACTION_RE = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/;

/** 百分比上限：超过按满宽处理，避免撑破正文容器 */
const MAX_PERCENT = 100;

/**
 * 把宽度属性换算成 CSS 宽度
 * @param value 属性原文（宿主也可直接传数字）
 * @returns CSS 宽度；`auto`、未给或写法不合法时返回 undefined（按原始尺寸）
 */
export function parseWidth(value?: string | number): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = typeof value === "number" ? String(value) : value.trim();
  if (text === "" || text === "auto") return undefined;

  // 分数占比：1/2 → 50%
  const fraction = FRACTION_RE.exec(text);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    if (!(numerator > 0) || !(denominator > 0)) return undefined;
    const percent = Math.min(MAX_PERCENT, (numerator / denominator) * MAX_PERCENT);
    return `${Number(percent.toFixed(2))}%`;
  }

  if (!LENGTH_RE.test(text)) return undefined;
  // 百分比收敛到 100%
  if (text.endsWith("%")) {
    const percent = Number(text.slice(0, -1));
    if (!Number.isFinite(percent)) return undefined;
    return `${Number(Math.min(MAX_PERCENT, percent).toFixed(2))}%`;
  }
  return BARE_NUMBER_RE.test(text) ? `${text}px` : text;
}
