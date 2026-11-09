/**
 * @file 渲染器（SSR 安全）
 * @description 一条 unified 管线：remark-parse（挂尖括号扩展）→ gfm / math → mdast-to-hast
 *   （自定义 jsxBlock handler）→ slug / katex → React 元素。渲染与解析共用同一套扩展，
 *   保证"能解析的就能渲染"。
 * @created 2026-10-24 20:24
 * @updated 2026-10-24 20:24
 * @updated 2026-11-01 21:47 rawBody 容器把源码以 props 交给组件；渲染侧同步 collectMermaid 标记
 * @updated 2026-11-02 10:33 新增 config.text 文案覆写；components/plugins 浅比较稳定化（内联配置不再击穿 memo）
 */

import { useMemo, type ComponentType, type ReactElement } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { unified, type PluggableList } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { Element, Properties, Root as HastRoot } from "hast";
import type { State as HastState } from "mdast-util-to-hast";
import type { Root } from "mdast";
import { mdxComponents } from "./components";
import { REMARK_PARSE_PLUGINS, REMARK_TRANSFORMS, applySourceTransforms } from "./pipeline";
import { rehypeSafeUrls } from "./rehype-safe-urls";
import { rehypeSafeAnchors } from "./rehype-safe-anchors";
import type { JsxBlock } from "./syntax/jsx-mdast";
import { rehypeCodeMeta } from "./rehype-code-meta";
import { rehypeSourcePositions } from "./rehype-source-positions";
import { MdEngineProvider, type UITextPatch } from "./internal/text";
import { useShallowStable } from "./internal/use-shallow-stable";

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
  /**
   * UI 文案覆写（逐键浅合并，未给的键继承 locale 语言包）
   * @description 只影响包内固定文案（aria-label、图表工具栏等），不碰正文内容
   * @deprecated 语义已由 `messages` 承接；两者同时给出时 `messages` 优先
   */
  text?: UITextPatch;
  /** 文案逐键覆写（优先于 `text` 与内置语言包） */
  messages?: UITextPatch;
  /**
   * 语言标识（BCP-47）
   * @description 不给时继承外层 `MdEngineProvider`；再退到 zh-CN。库内不做任何环境探测，
   *   服务端与客户端必须拿到同一个值，否则会产生 hydration mismatch。
   */
  locale?: string;
  /** 目标语言未内置时的回退语言（默认 zh-CN） */
  fallbackLocale?: string;
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
  // 超限降级：按源码块展示（不进组件），与块索引的 source(depth-exceeded) 口径一致
  if (node.data?.degraded && typeof node.data.degradedText === "string") {
    return {
      type: "element",
      tagName: "pre",
      properties: { className: ["md-degraded"] },
      children: [
        {
          type: "element",
          tagName: "code",
          properties: {},
          children: [{ type: "text", value: node.data.degradedText }],
        },
      ],
    };
  }

  const properties: Properties = {};
  for (const [key, value] of Object.entries(node.attributes ?? {})) {
    properties[key] = value;
  }
  // rawBody 容器（Mermaid）：源码以 props 交给组件，不落 DOM 属性——
  // 源码里的 `<`、`&` 若变成 HTML 属性会被解析/转义，且会撑大首屏标记
  if (typeof node.data?.rawBody === "string") {
    properties.raw = node.data.rawBody;
    properties.code = node.data.rawBody;
    if (node.data.mermaidTooLarge) properties.tooLarge = true;
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
    // 与 parse() 共用同一组扩展与 mdast 后处理（pipeline.ts）：
    // 行内子项收拢、白名单外 HTML 转文本、GFM / 数学 / 尖括号扩展都在那里声明，
    // 避免两处各写一遍后逐步漂移（渲染侧丢标签就是这么来的）
    .use(REMARK_PARSE_PLUGINS)
    .use(REMARK_TRANSFORMS)
    .use(extraRemark ?? [])
    .use(remarkRehype, { handlers: { jsxBlock: jsxBlockToHast as never } })
    // 紧跟 remark-rehype：此刻所有节点的 href/src 都在，一次清洗即可覆盖
    // 容器属性、普通链接/图片与宿主插件产物，宿主覆盖 a/img 也拿不到危险地址
    .use(rehypeSafeUrls)
    // 紧接其后：把锚点的 percent-encoding 还原，使 href 与 rehype-slug 生成的 id 字面一致
    .use(rehypeSafeAnchors)
    // 紧跟 remark-rehype：此时 hast 节点还带 mdast 的 position
    .use(sourcePositions ? [rehypeSourcePositions] : [])
    .use(rehypeCodeMeta)
    .use(rehypeSlug)
    .use(extraRehype ?? [])
    .use(rehypeKatex);
}

/**
 * 无宿主插件时的处理器缓存
 * @description 处理器只在 `sourcePositions` 开关两种形态下不同，可跨实例复用：
 *   列表页一次渲染 N 篇内容时，不再各建一条 unified 管线（含 katex / slug 插件实例）。
 *   宿主自定义插件的引用无法稳定比较，给定时仍按实例新建。
 */
type RenderProcessor = ReturnType<typeof createProcessor>;

const processorCache = new Map<"default" | "source-positions", RenderProcessor>();

/**
 * 取处理器（有缓存则复用）
 * @param extraRemark 宿主额外 remark 插件
 * @param extraRehype 宿主额外 rehype 插件
 * @param sourcePositions 是否输出源码 offset
 * @returns unified 处理器
 */
function getProcessor(
  extraRemark?: PluggableList,
  extraRehype?: PluggableList,
  sourcePositions?: boolean,
): RenderProcessor {
  if (extraRemark || extraRehype) return createProcessor(extraRemark, extraRehype, sourcePositions);
  const key = sourcePositions ? "source-positions" : "default";
  const cached = processorCache.get(key);
  if (cached) return cached;
  const created = createProcessor(undefined, undefined, sourcePositions);
  processorCache.set(key, created);
  return created;
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
  const overrides = useShallowStable(config?.components);
  const extraRemark = useShallowStable(config?.remarkPlugins);
  const extraRehype = useShallowStable(config?.rehypePlugins);
  const sourcePositions = config?.sourcePositions;
  const text = useShallowStable(config?.text);
  const messages = useShallowStable(config?.messages);
  // 旧 `text` 与新 `messages` 合并，新字段优先；两者都未给时保持 undefined，避免无谓重建
  const textPatch = useMemo<UITextPatch | undefined>(() => {
    if (!text) return messages;
    if (!messages) return text;
    return { ...text, ...messages };
  }, [text, messages]);
  const processor = useMemo(
    () => getProcessor(extraRemark, extraRehype, sourcePositions),
    [extraRemark, extraRehype, sourcePositions],
  );
  const rendered = useMemo(() => {
    const source = content ?? "";
    const mdast = processor.parse(source) as Root;
    // 与 parse() 共用的解析期后处理（提升块级公式 → 深度裁剪 → 图表判定）。
    // 必须在 runSync 之前：此处能拿到原文，而 unified 的 runSync(tree) 会新建空 vfile，
    // 插件里读不到 source。诊断本身在渲染侧用不上，只取副作用——
    // 少了这一步就会出现"编辑器提示超限、页面照样出图"的分叉
    applySourceTransforms(mdast, source);
    const hast = processor.runSync(mdast) as HastRoot;
    return toJsxRuntime(hast, {
      Fragment,
      jsx,
      jsxs,
      components: { ...mdxComponents, ...overrides } as never,
    });
  }, [content, overrides, processor]);

  return (
    <MdEngineProvider
      locale={config?.locale}
      fallbackLocale={config?.fallbackLocale}
      messages={textPatch}
    >
      <div className={className}>{rendered}</div>
    </MdEngineProvider>
  );
}
