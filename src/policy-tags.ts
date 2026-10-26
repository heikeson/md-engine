/**
 * @file 属性与标签类诊断
 * @description 两件事：① 校验内容里的 `href` / `src`（容器属性与普通链接、图片）是否符合协议白名单，
 *   不合法产出 `UNSAFE_HREF`；② 把不在 registry 里的尖括号标签识别为 `UNKNOWN_TAG`。
 *   渲染行为不在这里改：降级分别由组件（`isSafeHref`）与渲染期 remark 插件负责。
 * @created 2026-10-26 22:20
 * @updated 2026-10-26 22:20
 */

import type { Image as MdImage, Link, Root, RootContent } from "mdast";
import { COMPONENTS, ITEMS } from "./registry";
import type { JsxBlock } from "./syntax/jsx-mdast";
import type { Diagnostic } from "./policy";
import { isSafeHref } from "./internal/url-policy";

/** 需要协议校验的属性名 */
const URL_ATTRS = ["href", "src"] as const;

/** html 节点里的大写开头标签（未知组件名会落成 html 节点） */
const HTML_OPEN_TAG = /^<([A-Z][A-Za-z0-9]*)/;

/** registry 里所有合法名字（容器 + 子项） */
const KNOWN_NAMES = new Set<string>([...Object.keys(COMPONENTS), ...Object.keys(ITEMS)]);

/**
 * 深度优先遍历所有节点
 * @param node 起始节点
 * @param fn 对每个子节点执行的回调（不含 root 本身）
 */
function forEachNode(node: Root | RootContent, fn: (child: RootContent) => void): void {
  if (node.type !== "root") fn(node as RootContent);
  const children = (node as { children?: RootContent[] }).children;
  if (!children) return;
  for (const child of children) forEachNode(child, fn);
}

/**
 * 收集非法协议诊断
 * @description 覆盖三条来源：容器属性、普通 Markdown 链接、普通 Markdown 图片
 * @param tree mdast 根节点
 * @returns 诊断列表
 */
export function collectUnsafeUrls(tree: Root): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  /** 记一条 UNSAFE_HREF */
  const report = (line: number, label: string, url: string): void => {
    diagnostics.push({
      code: "UNSAFE_HREF",
      level: "warn",
      line,
      message: `${label} 的协议不受支持，已降级为不可点击：${url}`,
    });
  };

  forEachNode(tree, (node) => {
    const line = node.position?.start.line ?? 1;
    if (node.type === "jsxBlock") {
      const block = node as JsxBlock;
      for (const key of URL_ATTRS) {
        const value = block.attributes?.[key];
        if (typeof value === "string" && value.length > 0 && !isSafeHref(value)) {
          report(line, `<${block.name} ${key}>`, value);
        }
      }
      return;
    }
    if (node.type === "link" || node.type === "image") {
      const url = (node as Link | MdImage).url;
      if (!isSafeHref(url)) report(line, node.type === "link" ? "链接" : "图片", url);
    }
  });

  return diagnostics;
}

/**
 * 收集未知标签诊断
 * @description 未注册的标签会被词法层交回 HTML flow，渲染时退化为文本；这里只补提示
 * @param tree mdast 根节点
 * @returns 诊断列表
 */
export function collectUnknownTags(tree: Root): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  forEachNode(tree, (node) => {
    if (node.type !== "html") return;
    const match = HTML_OPEN_TAG.exec(String(node.value ?? "").trim());
    if (!match) return;
    const name = match[1];
    if (KNOWN_NAMES.has(name)) return;
    diagnostics.push({
      code: "UNKNOWN_TAG",
      level: "warn",
      line: node.position?.start.line ?? 1,
      message: `<${name}> 不是已注册的组件，已按文本显示`,
    });
  });

  return diagnostics;
}
