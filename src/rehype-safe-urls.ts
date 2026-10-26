/**
 * @file 渲染期 URL 统一闸门（hast 层）
 * @description 根治点：所有元素的 `href` / `src` 在交给 React（或宿主覆盖的组件）**之前**
 *   统一过协议白名单。放在这一步的好处：
 *   1. 覆盖了容器属性、普通链接/图片、宿主注入插件生成的所有节点；
 *   2. 宿主用 `RenderConfig.components` 覆盖 `a` / `img` 也拿不到危险地址，无需再自证清白；
 *   3. 判定口径与诊断共用 `isSafeHref`，不会两套逻辑漂移。
 *   降级策略：`href` 改写为 `#`（文本与结构保留、点击无效）；`src` 直接移除（不加载）。
 * @created 2026-10-26 22:26
 * @updated 2026-10-26 22:26
 */

import { visit } from "unist-util-visit";
import type { Element, Root as HastRoot } from "hast";
import { isSafeHref } from "./internal/url-policy";

/** 需要校验的 URL 属性 */
const URL_PROPS = ["href", "src"] as const;

/**
 * 生成 rehype 插件：就地清洗非法地址
 * @returns unified 插件
 */
export function rehypeSafeUrls() {
  return (tree: HastRoot): void => {
    visit(tree, "element", (node: Element) => {
      for (const key of URL_PROPS) {
        const value = node.properties[key];
        if (typeof value !== "string" || value.length === 0) continue;
        if (isSafeHref(value)) continue;
        if (key === "href") node.properties[key] = "#";
        else delete node.properties[key];
      }
    });
  };
}
