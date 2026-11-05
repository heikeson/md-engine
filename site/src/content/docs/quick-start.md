# 快速开始

渲染一段带容器的 Markdown 需要三步：安装、引入样式、给外层容器加 `prose-site`。

<Callout type="note" title="版本与环境">
  本页对 `0.5.2`。peer 依赖 `react` / `react-dom` 为 `>=19`，`engines.node` 为 `>=20`（只约束构建与发布，运行时不检查）。
  包是 ESM-only：`exports` 只提供 `import` 条件，没有 CJS 入口。
</Callout>

## 安装

<Tabs>
  <Tab value="npm">npm install @heikeson/md-engine</Tab>
  <Tab value="pnpm">pnpm add @heikeson/md-engine</Tab>
  <Tab value="yarn">yarn add @heikeson/md-engine</Tab>
</Tabs>

样式是原生 CSS（`dist/styles.css`），不含 `@apply`，不需要 Tailwind，也不需要 PostCSS 配置。

## 渲染第一段内容

```tsx
import { MarkdownRenderer } from "@heikeson/md-engine";
import "@heikeson/md-engine/styles.css";

const content = `
<Callout type="warn" title="注意">
  这里的 <Callout> 由引擎解析，而不是当成 HTML。
</Callout>
`;

export default function Article() {
  return <MarkdownRenderer content={content} className="prose-site" />;
}
```

`MarkdownRenderer` 的输出结构就是 `<div className={className}>…</div>`，所以 `prose-site` 加在这一层才会有样式：

| 样式来源 | 作用域 | 不给 `prose-site` 的结果 |
|---|---|---|
| `callout / tabs / steps / cards / accordion / files / type-table / image.css` | `.prose-site …` | DOM 与文本照常输出，边框、内边距、配色不生效 |
| `mermaid.css` | `.lkes-mermaid` | 不受影响（不需要 `prose-site`） |
| `editor.css` | `.md-editor` | 不受影响（不需要 `prose-site`） |

## 解析与序列化

```ts
import { parse, serialize, roundtrip, normalizeMarkdown } from "@heikeson/md-engine";

const { tree, blocks, diagnostics } = parse(md);
const same = serialize(tree);        // md → mdast → md
const again = roundtrip(md);         // 等价于 serialize(parse(md).tree)
const tidy = normalizeMarkdown(md);  // 只在需要统一排版时调用
```

- `serialize` 与解析共用同一套扩展（GFM + 数学公式 + 尖括号块），不补空行、不展开行内子项。
- `normalizeMarkdown` 才改排版：容器标签前后各留一个空行、连续空行收敛为一个、围栏代码块内不动；幂等。
- `blocks` 是带全文 offset 的扁平块索引，编辑器用它做分屏滚动同步。
- 保存用户内容用 `serialize`。改用 `normalizeMarkdown` 会在保存时重排用户写好的空行。

<Callout type="tip" title="服务端可直接调用">
  `parse` / `serialize` / `normalizeMarkdown` 与 `MarkdownRenderer` 都不读 `window`。
  本站的文档页就是在构建时用 `renderToString` 预渲染出来的。
</Callout>

## 诊断

`parse` 不抛异常，问题以 `diagnostics` 返回，每条为 `{ code, level, line, message, params?, range? }`，`level` 只有 `warn` 与 `error`。

| 诊断码 | 触发条件 | 引擎的处理 |
|---|---|---|
| `UNCLOSED_TAG` | 容器没有闭合标签 | 渲染到文末，序列化不补闭合标签 |
| `DEPTH_EXCEEDED` | 容器嵌套超过 3 层 | 超限那一层整块降级为原文 |
| `UNKNOWN_TAG` | 白名单外的标签 | 连同正文按文本输出，不丢内容 |
| `UNSAFE_HREF` | `href` / `src` 用了非白名单协议 | `href` 改为 `#`，`src` 被移除 |
| `INDENT_AS_CODE` | 正文行缩进 ≥4 空格或 tab | 按 CommonMark 判为缩进代码块，内容不改写 |
| `MERMAID_EMPTY` | `<Mermaid>` 容器体为空 | 渲染源码块与提示 |
| `MERMAID_TOO_LARGE` | 图表源码超过 20 KB（`MERMAID_MAX_BYTES`） | 不渲染图表，原样显示源码 |
| `DUPLICATE_ID_ANCHOR` / `DUPLICATE_ID_DIV` | `div id` 与标题锚点重复 / `div id` 彼此重复 | 照常渲染，只提示不改写 |

## 下一步

<Tabs>
  <Tab value="写容器">看 **容器语法**：10 个容器的属性、子项与书写约束。</Tab>
  <Tab value="做后台">看 **编辑器与图表**：`MarkdownEditor` 的参数、快捷键与滚动同步。</Tab>
  <Tab value="改配色">看 **样式与令牌**：9 个 `--lkes-*` 令牌与覆盖方式。</Tab>
</Tabs>
