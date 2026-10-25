/**
 * @file rehype 插件：把代码原文与语言写到 `<pre>` 属性上
 * @description 渲染器用的 `hast-util-to-jsx-runtime` 不会把 hast 节点传给组件
 *   （没有 `passNode` 选项），组件因此拿不到 `node`，无法提取代码原文。
 *   这里在 mdast → hast 之后、转 React 之前，把 `pre > code` 的原文、语言、
 *   文件名写进 `pre` 的 `data-code-*` 属性，组件从 props 读取即可。
 *   每个 `pre` 独立处理，保证「一个代码块对应一个渲染结果」。
 * @created 2026-10-24 20:48
 * @updated 2026-10-24 20:48
 */

import { visit } from "unist-util-visit";
import type { Element, ElementContent, Root } from "hast";

/**
 * 递归收集元素的纯文本
 * @param node hast 元素
 * @returns 文本内容
 */
function textOf(node: Element): string {
  let out = "";
  for (const child of node.children ?? []) {
    if (child.type === "text") out += child.value;
    else if (child.type === "element") out += textOf(child);
  }
  return out;
}

/**
 * 从 code 元素取语言标识
 * @param code code 元素
 * @returns 语言名（缺省 text）
 */
function langOf(code: Element): string {
  const classes = code.properties?.className;
  const list = Array.isArray(classes) ? classes.map(String) : [];
  const found = list.find((item) => item.startsWith("language-"));
  return found ? found.slice("language-".length) : "text";
}

/**
 * 从 code 元素取文件名（```ts title="demo.ts"）
 * @param code code 元素
 * @returns 文件名或 undefined
 */
function titleOf(code: Element): string | undefined {
  const meta = (code.data as { meta?: string } | undefined)?.meta;
  if (typeof meta !== "string") return undefined;
  const matched = /title=["']?([^"'\s]+)["']?/.exec(meta);
  return matched ? matched[1] : undefined;
}

/**
 * 判断子节点是否为 code 元素
 * @param child hast 子节点
 * @returns 是 code 元素返回 true
 */
function isCodeElement(child: ElementContent): child is Element {
  return child.type === "element" && child.tagName === "code";
}

/**
 * 插件主体
 * @returns rehype 转换函数
 */
export function rehypeCodeMeta() {
  return (tree: Root): undefined => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "pre") return;
      const code = (node.children ?? []).find(isCodeElement);
      if (!code) return;
      const title = titleOf(code);
      node.properties = {
        ...node.properties,
        "data-code-raw": textOf(code),
        "data-code-lang": langOf(code),
        ...(title ? { "data-code-title": title } : {}),
      };
    });
    return undefined;
  };
}
