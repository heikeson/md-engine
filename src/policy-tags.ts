/**
 * @file 属性与标签类诊断
 * @description 三件事：① 校验内容里的 `href` / `src`（容器属性与普通链接、图片）是否符合协议白名单，
 *   不合法产出 `UNSAFE_HREF`；② 把不在 registry 里的尖括号标签识别为 `UNKNOWN_TAG`；
 *   ③ 检查 `div` 手写 `id` 与标题锚点或彼此冲突，产出 `DUPLICATE_ID`。
 *   渲染行为不在这里改：降级分别由组件（`isSafeHref`）与渲染期 remark 插件负责。
 * @created 2026-10-26 22:20
 * @updated 2026-10-26 22:20
 * @updated 2026-11-02 10:48 新增 DUPLICATE_ID：div 手写 id 与标题锚点（rehype-slug）或彼此冲突时提示
 */

import type { Image as MdImage, Link, Root, RootContent, Text } from "mdast";
import GithubSlugger from "github-slugger";
import { COMPONENTS, ITEMS } from "./registry";
import type { JsxBlock } from "./syntax/jsx-mdast";
import type { Diagnostic } from "./policy";
import { isSafeHref } from "./internal/url-policy";
import { walkMdast } from "./internal/walk";

/** 需要协议校验的属性名 */
const URL_ATTRS = ["href", "src"] as const;

/** html 节点里的大写开头标签（未知组件名会落成 html 节点） */
const HTML_OPEN_TAG = /^<([A-Z][A-Za-z0-9]*)/;

/** registry 里所有合法名字（容器 + 子项） */
const KNOWN_NAMES = new Set<string>([...Object.keys(COMPONENTS), ...Object.keys(ITEMS)]);

/**
 * 收集非法协议诊断
 * @description 覆盖三条来源：容器属性、普通 Markdown 链接、普通 Markdown 图片
 * @param tree mdast 根节点
 * @returns 诊断列表
 */
export function collectUnsafeUrls(tree: Root): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  /**
   * 记一条 UNSAFE_HREF
   * @param line 行号
   * @param kind 来源形态：容器属性 / 普通链接 / 普通图片（供文案分性别措辞）
   * @param label 展示用标签（属性形态为 `<Callout href>` 这类标识符）
   * @param url 被拒的地址
   */
  const report = (
    line: number,
    kind: "attribute" | "link" | "image",
    label: string,
    url: string,
  ): void => {
    diagnostics.push({
      code: "UNSAFE_HREF",
      level: "warn",
      line,
      message: `${label} 的协议不受支持，已降级为不可点击：${url}`,
      params: { kind, label, url },
    });
  };

  walkMdast(tree, (node) => {
    const line = node.position?.start.line ?? 1;
    if (node.type === "jsxBlock") {
      const block = node as JsxBlock;
      for (const key of URL_ATTRS) {
        const value = block.attributes?.[key];
        if (typeof value === "string" && value.length > 0 && !isSafeHref(value)) {
          report(line, "attribute", `<${block.name} ${key}>`, value);
        }
      }
      return;
    }
    if (node.type === "link" || node.type === "image") {
      const url = (node as Link | MdImage).url;
      const isLink = node.type === "link";
      if (!isSafeHref(url)) report(line, isLink ? "link" : "image", isLink ? "链接" : "图片", url);
    }
  });

  return diagnostics;
}

/**
 * 取节点的纯文本（标题 slug 用）
 * @param node mdast 节点
 * @returns 拼接后的文本
 */
function nodeText(node: RootContent | RootContent[]): string {
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (node.type === "text" || node.type === "inlineCode") return (node as Text).value;
  const children = (node as { children?: RootContent[] }).children;
  return children ? nodeText(children) : "";
}

/**
 * 收集重复 id 诊断
 * @description `div id="x"` 原样透传到 DOM，标题 id 由 rehype-slug 按同一算法（github-slugger）
 *   生成。两者撞车或两个 div 写同一个 id 时，页面出现重复 id：锚点跳转行为未定义、
 *   无障碍引用失效。只提示、不改写（与其余诊断同一容错哲学）。
 *   两遍扫描：先按文档序算出全部标题 slug（与 rehype-slug 的去重后缀口径一致），再查 div。
 * @param tree mdast 根节点
 * @returns 诊断列表
 */
export function collectDuplicateIds(tree: Root): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const slugger = new GithubSlugger();
  const headingSlugs = new Set<string>();

  // 第一遍：文档序生成标题 slug（rehype-slug 同名标题会加 -1/-2 后缀，这里保持同口径）
  walkMdast(tree, (node) => {
    if (node.type === "heading") headingSlugs.add(slugger.slug(nodeText(node)));
  });

  // 第二遍：div 的手写 id 查重（div 之间 + 与标题锚点之间）
  const seen = new Map<string, number>();
  walkMdast(tree, (node) => {
    if (node.type !== "jsxBlock") return;
    const block = node as JsxBlock;
    if (block.name !== "div") return;
    const id = block.attributes?.id;
    const line = block.position?.start.line ?? 1;
    if (typeof id !== "string" || id.length === 0) return;
    const first = seen.get(id);
    if (headingSlugs.has(id)) {
      diagnostics.push({
        code: "DUPLICATE_ID_ANCHOR",
        level: "warn",
        line,
        message: `div id="${id}" 与标题生成的锚点重复，页面将出现两个同名 id`,
        params: { id },
      });
    } else if (first !== undefined) {
      diagnostics.push({
        code: "DUPLICATE_ID_DIV",
        level: "warn",
        line,
        message: `div id="${id}" 与第 ${first} 行的 div 重复，页面将出现两个同名 id`,
        params: { id, first },
      });
    } else {
      seen.set(id, line);
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

  walkMdast(tree, (node) => {
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
      params: { name },
    });
  });

  return diagnostics;
}
