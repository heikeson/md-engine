# 样式与令牌

`@heikeson/md-engine/styles.css` 是 `styles/index.css` 打包后的单文件，内容全是原生 CSS：没有 `@apply`，不读宿主主题，不依赖 Tailwind。配色只经由 9 个 `--lkes-*` 令牌。

## 九个令牌

| 令牌 | 用途 | 亮色 | 暗色 |
|---|---|---|---|
| `--lkes-bg` | 面 | `#ffffff` | `#0f1419` |
| `--lkes-fg` | 主文字 | `#1f2937` | `#e8eef2` |
| `--lkes-muted` | 次要文字 | `#6b7280` | `#9aa8b0` |
| `--lkes-fill` | 浅底块 | `#f3f4f6` | `#1a222a` |
| `--lkes-border` | 描边 | `#e5e7eb` | `#232c34` |
| `--lkes-accent` | 强调 | `#0f766e` | `#19d3c5` |
| `--lkes-ring` | 焦点环 | `#0f766e` | `#19d3c5` |
| `--lkes-radius` | 圆角 | `0.5rem` | `0.5rem` |
| `--lkes-overlay` | 遮罩 | `rgb(0 0 0 / 0.8)` | `rgb(0 0 0 / 0.85)` |

组件样式里的 `var(--lkes-*)` 基本都带兜底值（`var(--lkes-border, #e5e7eb)`），令牌没定义时仍有可用的外观。

## 为什么是两套字面量

令牌写成 `--lkes-bg: var(--background, #fff)` 时，`var()` 在声明处（`:root`）就被替换成当时的计算结果并固化。宿主之后再给 `.dark` 改 `--background`，算好的值不会重算，暗色永远不生效。

所以 `tokens.css` 直接给两套字面量：亮色在 `:root`，暗色在 `.dark` 与 `[data-theme="dark"]` 祖先作用域。组件里的 `var(--lkes-*)` 在元素上解析，祖先加上 `.dark` 后，Callout、Tabs、Steps、Cards、Accordion、Files、TypeTable、Image、编辑器同时切换。

<Callout type="tip" title="宿主只要加一个类">
  给 `<html>` 或任意祖先加 `dark`（或 `data-theme="dark"`），不需要传配置、不需要额外引入暗色样式。
</Callout>

## 作用域

| 样式分片 | 选择器前缀 | 是否要求 `prose-site` |
|---|---|---|
| `callout` / `tabs` / `steps` / `cards` / `accordion` / `files` / `type-table` / `image` | `.prose-site …` | 要求 |
| `mermaid` | `.lkes-mermaid …` | 不要求 |
| `editor` | `.md-editor …` | 不要求 |

`MarkdownRenderer` 的外层是 `<div className={className}>`，所以 `className="prose-site"` 加在它上面即可。不给这个类时，8 个组件的 DOM 与文本照常输出，只是边框、内边距、配色全部不命中。

## 覆盖

在普通样式（不写 `@layer`）里重新声明同名变量即可。包内声明位于 `@layer lkes.tokens` 与 `@layer lkes.components`，未分层的声明优先级更高，所以不需要争引入顺序。

```css
/* 品牌色 */
:root {
  --lkes-accent: #4f46e5;
  --lkes-ring: #4f46e5;
}

.dark {
  --lkes-accent: #8b8cf0;
  --lkes-ring: #8b8cf0;
}
```

写在正文容器上就只影响那一块。

<Callout type="important" title="未分层的元素重置会盖掉组件样式">
  宿主的 `button { border: 0 }`、`* { margin: 0 }` 这类未分层规则同样优先于 `@layer lkes.components`。
  出现「某个按钮没边框」时先查宿主自己的元素重置，而不是加 `!important`。
</Callout>

`Callout` 的 5 个语义色只声明色相 `--lkes-tone`（note 蓝、tip 绿、important 紫、warning 橙、caution 红），底纹与文字由 `color-mix(in oklab, …)` 从色相派生并向 `--lkes-fg` 混合，因此亮暗共用一套值。要换某一类的颜色，改对应的 `--lkes-tone`，不要改 9 个全局令牌。

## 按组件引入

不想要整包样式时，只取需要的分片：

```ts
import "@heikeson/md-engine/styles/tokens.css";
import "@heikeson/md-engine/styles/callout.css";
```

<Files>
  <Folder name="styles" defaultOpen>
    <File name="index.css" />
    <File name="tokens.css" />
    <File name="callout.css" />
    <File name="tabs.css" />
    <File name="accordion.css" />
    <File name="cards.css" />
    <File name="files.css" />
    <File name="type-table.css" />
    <File name="image.css" />
    <File name="steps.css" />
    <File name="mermaid.css" />
    <File name="editor.css" />
    <File name="engine.css" />
  </Folder>
</Files>

- `index.css` 只做两件事：声明层顺序 `@layer lkes.tokens, lkes.components;`，然后 `@import` 各分片。
- `tokens.css` 必须排在组件分片之前，否则组件里的 `var()` 拿不到值（会退到兜底色）。
- `engine.css` 是旧路径的转发入口，内容只有 `@import "./index.css";`。

## Mermaid 的配色不走这 9 个令牌

图表用独立的一套 `--lkes-chart-*`（`bg` / `fg` / `node` / `node-border` / `line` / `series-1` … `series-6`），定义在 `.lkes-mermaid` 上，暗色在 `.dark .lkes-mermaid`。它不读宿主变量，也不读 `--lkes-*`。要改图表颜色用 `configureChartTheme`，见 **编辑器与图表**。

## 三条硬约束

<Accordion>
  <AccItem title="语法只增不改" type="open">已发布组件的名字、属性名与语义只新增，不修改。存量内容不需要迁移。</AccItem>
  <AccItem title="配置只增不改" type="close">新增配置项必须带默认值，且不改变既有行为。</AccItem>
  <AccItem title="样式随包走" type="close">类名由包提供，使用方只覆盖变量，不改类名。</AccItem>
</Accordion>

违反任一条即破坏存量内容：这个项目不做内容迁移。
