# 容器语法总览

覆盖 11 个容器与 9 个子项，另含通用 `div`，用于本地逐项核对样式与交互。

## Callout 标题形态

有 `title`：图标与标题一行，正文在下；可含 **强调** 与 `行内代码`。

<Callout type="note" title="带标题的提示">

默认语气，正文从标题下方开始。

</Callout>

自定义图标：`icon` 接受字符串（emoji 或短文本），有标题时图标在标题左侧。

<Callout type="tip" icon="🚀" title="自定义图标">

`icon="🚀"` 会替换左侧默认图标。

</Callout>

自定义图标 + 无标题：图标与正文同行。

<Callout type="note" icon="✅">

`icon="✅"` 作为图标，与正文同一行。

</Callout>

无 `title`：图标与正文同行，不补默认标签。

<Callout type="info">

info 语气，无标题时图标与正文同一行。

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

无标题且正文多段：首段与图标对齐，后续段落继续缩进在同一栏。

<Callout type="warn">

第一段：无标题的多段内容。

第二段：仍然与图标左侧对齐。

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

行内形态：标签与内容写在同一行，保存时按原形态写回。

<Tabs>
<Tab value="行内一">内容一</Tab>
<Tab value="行内二">内容二</Tab>
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

<Card title="带图标的卡片" icon="⚡" description="icon 支持 emoji 或短文本" href="/about" />

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

<AccItem title="可深链的条目" id="acc-demo">

访问 `#acc-demo` 会自动展开本项，优先级高于 `type`。

</AccItem>

</Accordion>

## Files 文件树

<Files>

<Folder name="src" defaultOpen>

<File name="index.ts" href="/about" />

<File name="theme.css" />

<File name="data.json" />

<File name="logo.png" />

<File name=".gitignore" />

</Folder>

<Folder name="packages">

<Folder name="engine" defaultOpen>

<File name="index.ts" />

</Folder>

<File name="README.md" />

</Folder>

<File name="run.sh" />

<File name="report" icon="sheet" />

<File name="types" icon="ts" />

<File name="unknown.custom" />

</Files>

## TypeTable

<TypeTable>

<TypeItem name="content" type="string" required>

正文 Markdown 原文。

</TypeItem>

<TypeItem name="className" type="string" default="prose-site">

外层容器类名。

</TypeItem>

自闭合写法：说明列留空。

<TypeItem name="zoom" type="boolean" default="false" />

</TypeTable>

## Image

<Image src="/dev-logo.svg" alt="占位图" caption="本地占位图，来自 dev/public/dev-logo.svg；width 纯数字按像素" width="320" zoom />

<Image src="dev-logo.svg" alt="相对路径图" caption="相对路径不应被协议闸门降级" />

宽度支持占比、像素与自动，`align` 决定整块位置：

<Image src="/dev-logo.svg" alt="占比六成" caption="width 写 60%，整块靠左" width="60%" align="left" />

<Image src="/dev-logo.svg" alt="三分之一宽" caption="width 写 1/3，整块靠右" width="1/3" align="right" />

<Image src="/dev-logo.svg" alt="自动宽度" caption="width 写 auto，原始尺寸居中" width="auto" align="center" />

## Columns

按比例分列：`width="2"` 与 `width="1"` 各占 2 份与 1 份。

<Columns>

<Column width="2">

宽列：正文照常按 Markdown 解析，`行内码` 与会 **强调** 都可用。

</Column>

<Column width="1">

窄列：列表也可用。

- 项一
- 项二

</Column>

</Columns>

不写 `width` 时等分；窄屏（<640px）自动堆叠成单列。

<Columns>

<Column>

左列内容。

</Column>

<Column>

右列内容。

</Column>

</Columns>

带单位的 `width` 按固定宽度，其余列自动占满剩余空间：

<Columns>

<Column width="220px">

固定 220px 的列。

</Column>

<Column>

自适应列。

</Column>

</Columns>

## Timeline

时间线节点按 `type` 取色，表外取值按 `note` 渲染。

<Timeline>

<TimelineItem date="2026-10-24" title="解析层">

容器进 mdast，带 `position`，可序列化回原文。

</TimelineItem>

<TimelineItem date="2026-11-18" title="渲染层" type="tip">

渲染与解析共用同一套扩展，SSR 安全。

</TimelineItem>

<TimelineItem date="2026-11-27" title="注意事项" type="warning">

嵌套最多 3 层，超限整块降级为源码。

</TimelineItem>

<TimelineItem title="未写 date" type="danger">

只有标题的条目也能正常渲染。

</TimelineItem>

条目正文可以是多段内容：

<TimelineItem date="2026-11-27" title="富正文" type="note">

第一段：列表也能用。

- 项一
- 项二

第二段：围栏代码块原样保留。

```ts
const depth = 3;
```

</TimelineItem>

</Timeline>

## Video

自闭合叶子：`src` 与 `poster` 走与 `Image` 相同的协议白名单。

<Video src="/dev-logo.svg" poster="/dev-logo.svg" caption="本地占位素材，仅用于核对排版" width="480" />

未给 `src`（或协议不合规）时不加载视频，只保留题注：

<Video caption="没有来源的视频" />

宽度写法与 `Image` 一致：`auto` / `60%` / `1/3` / `360` / `20rem`。

<Video src="/dev-logo.svg" poster="/dev-logo.svg" caption="占比一半" width="50%" />

<Video src="/dev-logo.svg" caption="三分之一宽，不写 poster" width="1/3" />

## div 通用分块

需要挂 `class` / `id` 的一层分块时用它：属性透传到 DOM，内容照常按 Markdown 解析。

<div class="note-block" id="div-demo">

`div` 不是组件，宿主的类名可以直接接管样式。

</div>

## 嵌套容器

容器内可再套容器，最多 3 层（超限见「容错降级」样例）。

<Callout type="note" title="嵌套示例">

<Columns>

<Column width="1">

左列放列表：

- 项一
- 项二

</Column>

<Column width="2">

右列放引用：

> 容器里的内容仍然是 Markdown。

</Column>

</Columns>

</Callout>
