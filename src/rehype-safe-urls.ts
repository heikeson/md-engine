/**
 * @file 渲染期 URL 统一闸门（hast 层）
 * @description 根治点：所有元素的 URL 属性在交给 React（或宿主覆盖的组件）**之前**
 *   统一过协议白名单。放在这一步的好处：
 *   1. 覆盖了容器属性、普通链接/图片与宿主注入插件生成的所有节点；
 *   2. 宿主用 `RenderConfig.components` 覆盖 `a` / `img` 也拿不到危险地址，无需再自证清白；
 *   3. 判定口径与诊断共用 `isSafeHref`，不会两套逻辑漂移。
 *   降级策略：`href` 改写为 `#`（文本与结构保留、点击无效）；其余属性直接移除（不加载）。
 *   覆盖范围：`href` / `src` / `poster` / `formAction` / `srcSet`。
 * @created 2026-10-26 22:26
 * @updated 2026-11-18 10:20 改为按节点清洗（供 rehype-postprocess 复用一个 visit）；
 *   补齐 poster / formAction / srcSet，`srcSet` 逐候选校验、任一不合规则整条移除
 */

import type { Element } from "hast";
import { isSafeHref } from "./internal/url-policy";

/** 需要校验的 URL 属性（hast 属性名，camelCase） */
const URL_PROPS = ["poster", "formAction"] as const;

/** `formAction` 的手写拼写：宿主插件可能直接写连字符形式 */
const FORM_ACTION_LEGACY = "formaction";

/** `srcset` 在 hast / 手写插件里的两种拼写 */
const SRCSET_PROPS = ["srcSet", "srcset"] as const;

/**
 * 校验一条 srcset
 * @param value 原始属性值
 * @returns 全部候选地址合规返回 true
 * @description 候选格式为 `url [descriptor]`，以逗号分隔（`data:` 地址本身含逗号，
 *   但它必然命中 scheme 白名单拒绝，因此被整条移除，不会被拆错而误放行）。
 */
function isSafeSrcset(value: string): boolean {
  const candidates = value
    .split(",")
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate.length > 0);
  // 空值视为无地址可用，与 `src` 的空值口径一致：移除
  if (candidates.length === 0) return false;
  return candidates.every((candidate) => {
    const url = candidate.split(/\s+/)[0] ?? "";
    return isSafeHref(url);
  });
}

/**
 * 清洗单个元素上的 URL 属性
 * @param node hast 元素（就地修改）
 * @returns 无
 */
export function sanitizeUrlProps(node: Element): void {
  const properties = node.properties;
  if (!properties) return;

  // 非字符串值一律按不安全处理：宿主插件把地址写成数组时，React 会把它拼成字符串，
  // 而字符串校验看不出数组里的各项，等于开了一条绕过通道。
  const href = properties.href;
  if (href !== undefined && href !== null) {
    if (typeof href !== "string" || (href.length > 0 && !isSafeHref(href))) {
      properties.href = "#";
    }
  }

  for (const key of URL_PROPS) {
    const value = properties[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") {
      delete properties[key];
      continue;
    }
    if (value.length > 0 && !isSafeHref(value)) delete properties[key];
  }

  const legacyAction = properties[FORM_ACTION_LEGACY];
  if (legacyAction !== undefined && legacyAction !== null) {
    if (typeof legacyAction !== "string" || (legacyAction.length > 0 && !isSafeHref(legacyAction))) {
      delete properties[FORM_ACTION_LEGACY];
    }
  }

  const src = properties.src;
  if (src !== undefined && src !== null) {
    if (typeof src !== "string" || (src.length > 0 && !isSafeHref(src))) {
      delete properties.src;
    }
  }

  for (const key of SRCSET_PROPS) {
    const value = properties[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string" || !isSafeSrcset(value)) delete properties[key];
  }
}
