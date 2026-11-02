# 容器语法

容器是这套引擎和普通 Markdown 渲染器的差别所在：`<Callout>` 这类标签在 mdast 里是一个真正的节点，不是字符串替换。所以它能被解析、渲染、序列化，也能定位到源码里的位置。

## 总览

| 容器 | 用途 | 子项 |
|---|---|---|
| `Callout` | 提示块 | 正文 |
| `Tabs` | 选项卡 | `Tab` |
| `Steps` | 分步说明 | `Step` |
| `Cards` | 卡片导航 | `Card` |
| `Accordion` | 折叠面板 | `AccItem` |
| `Files` | 文件树 | `Folder` / `File` |
| `TypeTable` | API 属性表 | `TypeItem` |
| `Image` | 图片（带题注） | 自闭合 |
| `Mermaid` | 图表 | 原始文本 |
| `div` | 通用分块 | 正文 |

## Callout

`type` 决定配色与图标，不写则按 `note` 处理。

<TypeTable>
  <TypeItem name="type" type="note | tip | important | warning | caution | danger" default="note" />
  <TypeItem name="title" type="string" />
  <TypeItem name="icon" type="string" />
</TypeTable>

```md
<Callout type="tip" title="提示">
  正文支持完整 Markdown，包括 `行内码` 与 [链接](https://example.com)。
</Callout>
```

渲染结果：

<Callout type="tip" title="提示">
  正文支持完整 Markdown，包括 `行内码` 与 [链接](https://example.com)。
</Callout>

<Callout type="important" title="别名不新增视觉分支">
  `warn`、`error`、`success`、`idea` 只是既有配色的别名，不新增视觉分支。
</Callout>

## Tabs

子项 `Tab` 的 `value` 是标签文案，`default` 指定初始选中项。

```md
<Tabs>
  <Tab value="npm">npm install @heikeson/md-engine</Tab>
  <Tab value="pnpm">pnpm add @heikeson/md-engine</Tab>
</Tabs>
```

子项也可以展开成块，内容里允许有空行，按跨段落处理。保存时按原形态写回，不会强行展开或加空行。

## Steps

```md
<Steps>
  <Step title="安装依赖">npm install @heikeson/md-engine</Step>
  <Step title="引入样式">import "@heikeson/md-engine/styles.css"</Step>
</Steps>
```

<Steps>
  <Step title="安装依赖">npm install @heikeson/md-engine</Step>
  <Step title="引入样式">import "@heikeson/md-engine/styles.css"</Step>
</Steps>

## Cards

`Card` 可以自闭合：把所有内容放进属性里，适合做导航网格。

```md
<Cards>
  <Card title="快速开始" description="完成首次渲染" href="/docs/quick-start" />
  <Card title="样式与令牌" description="换色只需修改变量" href="/docs/styling" />
</Cards>
```

<Cards>
  <Card title="快速开始" description="完成首次渲染" href="/docs/quick-start" />
  <Card title="样式与令牌" description="换色只需修改变量" href="/docs/styling" />
</Cards>

## Accordion

`type` 取 `open` 或 `close`，控制初始展开状态。

```md
<Accordion>
  <AccItem title="默认收起" type="close">默认收起，点击展开。</AccItem>
  <AccItem title="默认展开" type="open">默认展开。</AccItem>
</Accordion>
```

<Accordion>
  <AccItem title="默认收起" type="close">默认收起，点击展开。</AccItem>
  <AccItem title="默认展开" type="open">默认展开。</AccItem>
</Accordion>

## Files

`Folder` 可嵌套，`defaultOpen` 控制默认展开；`File` 自闭合，`href` 可选，图标按扩展名自动匹配。

```md
<Files>
  <Folder name="src" defaultOpen>
    <File name="index.ts" />
    <File name="render.tsx" />
  </Folder>
  <File name="README.md" href="/docs/quick-start" />
</Files>
```

<Files>
  <Folder name="src" defaultOpen>
    <File name="index.ts" />
    <File name="render.tsx" />
  </Folder>
  <File name="README.md" href="/docs/quick-start" />
</Files>

## TypeTable

本页每个组件下方的属性表就是它渲染的，写法上要求属性只传字符串，所以拆成子项而不是对象表达式。

```md
<TypeTable>
  <TypeItem name="content" type="string" required />
  <TypeItem name="className" type="string" />
</TypeTable>
```

## Image

自闭合叶子组件，`zoom` 是布尔属性，写了就能点击放大、按 Esc 关闭。

```md
<Image src="/cover.svg" alt="封面" caption="题注写在这里" width="360" />
```

## Mermaid

容器体是**原始文本**：里面的 `#`、`|`、`-->`、行首 `-` 都不会被当成 Markdown 语法，保存时逐字写回。

```md
<Mermaid title="渲染管线">
flowchart LR
  A[Markdown] --> B[mdast]
  B --> C[hast]
  C --> D[React]
</Mermaid>
```

主入口只渲染源码骨架，要变成可缩放、可导出的图表，得额外接入 `/mermaid` 入口，见 **编辑器与图表**。

## div

需要一层能挂 `class` / `id` 的分块时用它，属性原样透传到 DOM，内容照常按 Markdown 解析。

```md
<div class="note-block" id="anchor">
  这里的内容仍然按 Markdown 渲染。
</div>
```

## 书写约束

<Callout type="warning" title="书写时的常见约束">
  容器**顶格**书写；正文行缩进 4 空格以上会被 CommonMark 判成缩进代码块，引擎会给出 `INDENT_AS_CODE` 提示但不改写内容。要写代码请用围栏。
</Callout>

- 属性只接受字符串（`a="b"`）与裸布尔（`a`），不支持 `{…}` 表达式、数组、对象；属性值里可以有 `>`。
- 白名单外的标签连同正文**按文本原样显示**，不丢内容、也不执行 HTML。
- 容器嵌套上限 3 层，超限那一层整块降级为原文。
- 只有 `Image`、`Card`、`File`、`Mermaid` 允许 `<X />`，其余必须写闭合标签。
