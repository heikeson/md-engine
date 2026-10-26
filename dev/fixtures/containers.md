# 容器语法总览

覆盖 8 个容器与 7 个子项，用于本地逐项核对样式与交互。

## Callout 五种语气

<Callout type="note" title="提示">

默认语气，正文可含 **强调** 与 `行内代码`。

</Callout>

<Callout type="info">

info 语气。

</Callout>

<Callout type="tip">

tip 语气。

</Callout>

<Callout type="warn">

warn 语气，注意别踩坑。

</Callout>

<Callout type="danger">

danger 语气，破坏性操作。

</Callout>

## Tabs

<Tabs>

<Tab value="安装" default>

用 `npm install @heikeson/md-engine` 安装。

</Tab>

<Tab value="使用">

引入 MarkdownRenderer 即可。

</Tab>

</Tabs>

## Steps

<Steps>

<Step title="第一步">

在宿主的 `globals.css` 里 `@import "@heikeson/md-engine/styles.css"`。

</Step>

<Step title="第二步">

前台渲染换成 `<MarkdownRenderer />`。

</Step>

<Step title="第三步">

后台编辑换成 `<MarkdownEditor />`。

</Step>

</Steps>

## Cards

<Cards>

<Card title="叶子卡片" description="描述写在属性里，自闭合写法" href="/about" />

<Card title="带正文的卡片">

卡片正文可以写多段内容。

</Card>

</Cards>

## Accordion

<Accordion>

<AccItem title="默认收起">

收起项的内容。

</AccItem>

<AccItem title="默认展开" type="open">

展开项的内容。

</AccItem>

</Accordion>

## Files 文件树

<Files>

<Folder name="src" defaultOpen>

<File name="index.ts" href="/about" />

<File name="theme.css" />

</Folder>

<File name="README.md" />

</Files>

## TypeTable

<TypeTable>

<TypeItem name="content" type="string" required>

正文 Markdown 原文。

</TypeItem>

<TypeItem name="className" type="string" default="prose-site">

外层容器类名。

</TypeItem>

</TypeTable>

## Image

<Image src="/dev-logo.svg" alt="占位图" caption="本地占位图，来自 dev/public/dev-logo.svg" zoom />
