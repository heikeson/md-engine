/**
 * @file 渲染器（SSR 安全）
 * @description 一条 unified 管线：remark-parse（挂尖括号扩展）→ gfm / math → mdast-to-hast
 *   （自定义 jsxBlock handler）→ slug / katex → React 元素。渲染与解析共用同一套扩展，
 *   保证"能解析的就能渲染"。
 * @created 2026-10-24 20:24
 * @updated 2026-10-24 20:24
 */

import { useMemo, type ComponentType, type ReactElement } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { unified, type PluggableList } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { Element, Properties, Root as HastRoot } from "hast";
import type { State as HastState } from "mdast-util-to-hast";
import type { Root } from "mdast";
import { mdxComponents } from "./components";
import remarkJsxBlocks from "./syntax/jsx-remark";
import type { JsxBlock } from "./syntax/jsx-mdast";
import { enforceMaxDepth } from "./policy";
import { rehypeCodeMeta } from "./rehype-code-meta";
import { rehypeSourcePositions } from "./rehype-source-positions";

/** 宿主可覆盖的组件类型 */
type AnyComponent = ComponentType<Record<string, unknown>>;

/** 渲染配置（只增不改，新增项必须有默认值） */
export interface RenderConfig {
  /** 单组件覆盖逃生舱；未覆盖的继续用包内默认实现 */
  components?: Partial<Record<string, AnyComponent>>;
  /** 宿主自定义 rehype 插件（须为同步插件，保证 SSR 安全） */
  rehypePlugins?: PluggableList;
  /** 宿主自定义 remark 插件（在 mdast → hast 之前执行） */
  remarkPlugins?: PluggableList;
  /**
   * 是否在块级元素上输出 `data-src-start`（源码起始 offset）
   * @default false
   * @description 仅供编辑器分屏做内容对齐的滚动同步；前台文章保持关闭以省体积
   */
  sourcePositions?: boolean;
}

/** 渲染器参数 */
export interface MarkdownRendererProps {
  content: string;
  className?: string;
  config?: RenderConfig;
}

/**
 * jsxBlock 节点 → hast 元素
 * @description tagName 直接用组件名（大小写敏感），attributes 原样转 properties，
 *   子节点交给 state.all 递归处理
 * @param state mdast-to-hast 状态
 * @param node 尖括号块节点
 * @returns hast 元素
 */
function jsxBlockToHast(state: HastState, node: JsxBlock): Element {
  const properties: Properties = {};
  for (const [key, value] of Object.entries(node.attributes ?? {})) {
    properties[key] = value;
  }
  return {
    type: "element",
    tagName: node.name,
    properties,
    children: state.all(node),
  };
}

/**
 * 装配管线
 * @param extraRemark 宿主额外 remark 插件（可选）
 * @param extraRehype 宿主额外 rehype 插件（可选）
 * @returns unified 处理器
 */
function createProcessor(
  extraRemark?: PluggableList,
  extraRehype?: PluggableList,
  sourcePositions?: boolean,
) {
  return unified()
    .use(remarkParse)
    .use(remarkJsxBlocks)
    .use(remarkGfm)
    .use(remarkMath)
    .use(extraRemark ?? [])
    .use(remarkRehype, { handlers: { jsxBlock: jsxBlockToHast as never } })
    // 紧跟 remark-rehype：此时 hast 节点还带 mdast 的 position
    .use(sourcePositions ? [rehypeSourcePositions] : [])
    .use(rehypeCodeMeta)
    .use(rehypeSlug)
    .use(extraRehype ?? [])
    .use(rehypeKatex);
}

/**
 * 渲染 Markdown 为 React 元素
 * @param props 内容、外层类名与配置
 * @returns 渲染结果
 */
export default function MarkdownRenderer({
  content,
  className,
  config,
}: MarkdownRendererProps): ReactElement {
  const overrides = config?.components;
  const extraRemark = config?.remarkPlugins;
  const extraRehype = config?.rehypePlugins;
  const sourcePositions = config?.sourcePositions;
  const processor = useMemo(
    () => createProcessor(extraRemark, extraRehype, sourcePositions),
    [extraRemark, extraRehype, sourcePositions],
  );
  const rendered = useMemo(() => {
    const source = content ?? "";
    const mdast = processor.parse(source) as Root;
    enforceMaxDepth(mdast, source);
    const hast = processor.runSync(mdast) as HastRoot;
    return toJsxRuntime(hast, {
      Fragment,
      jsx,
      jsxs,
      components: { ...mdxComponents, ...overrides } as never,
    });
  }, [content, overrides, processor]);

  return <div className={className}>{rendered}</div>;
}
