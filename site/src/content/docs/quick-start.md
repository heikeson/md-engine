# 快速开始

把一个 `.md` 文件渲染成带组件的页面，需要三步：装包、引样式、给个类名。

<Callout type="note" title="版本口径">
  本文对应 `0.4.0`。React 需要 `>=19`（peer dependency），构建环境 Node `>=20`，运行时没有 Node 版本要求。
</Callout>

## 安装

<Tabs>
  <Tab value="npm">npm install @heikeson/md-engine</Tab>
  <Tab value="pnpm">pnpm add @heikeson/md-engine</Tab>
  <Tab value="yarn">yarn add @heikeson/md-engine</Tab>
</Tabs>

包内样式是原生 CSS，不需要 Tailwind，也不需要任何 PostCSS 配置。

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

外层 `className` 建议带上 `prose-site`：包内样式的作用域挂在它上面，少了这个类，容器会渲染成裸文本。

<Steps>
  <Step title="引入样式">`import "@heikeson/md-engine/styles.css"`，放在应用入口或页面模块顶部都行。</Step>
  <Step title="补上类名">渲染结果的外层容器加 `prose-site`，其余类名由包负责。</Step>
  <Step title="服务端直接用">解析与渲染不碰 `window`，Next、Astro、Remix 里可以直接在服务端调用。</Step>
</Steps>

## 解析与序列化

渲染之外，引擎还能把 Markdown 读成 AST 再写回来，用于保存、格式化与定位。

```ts
import { parse, serialize, roundtrip, normalizeMarkdown } from "@heikeson/md-engine";

const { tree, blocks, diagnostics } = parse(md);
const same = serialize(tree);        // md → AST → md，逐字一致
const again = roundtrip(md);          // 上一行的简写
const tidy = normalizeMarkdown(md);   // 需要统一排版时才用
```

`serialize` 只保证「不改内容」，不替你补空行、不展开行内子项。要规整排版是另一个函数，两件事分开。

<Callout type="tip" title="两件事别混用">
  用户在编辑器里按了什么，保存后就应该还是什么。`serialize` 保形、`normalizeMarkdown` 改形，混用会让用户的排版在保存时被悄悄重写。
</Callout>

## 什么时候该看下一节

如果你只关心「能渲染」，到这里就够了。要写 `<Callout>`、`<Tabs>` 这类容器，看 **容器语法**；要在后台做编辑，看 **编辑器与图表**。

<Cards>
  <Card title="容器语法" description="9 种容器、属性表与书写约束" href="/docs/syntax" />
  <Card title="编辑器与图表" description="MarkdownEditor 与交互式 Mermaid" href="/docs/editor" />
  <Card title="样式与令牌" description="9 个 --lkes-* 令牌，亮暗两套" href="/docs/styling" />
</Cards>
