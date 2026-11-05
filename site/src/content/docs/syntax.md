# 容器语法

容器在 mdast 里是 `jsxBlock` 节点，不是字符串替换：同一个节点被解析、渲染、序列化，也在块索引里带 offset。语法声明只有一处——`src/registry.ts` 的 `COMPONENTS` / `ITEMS`，属性名不在别处硬编码。

## 总览

| 容器 | 属性 | 子项 |
|---|---|---|
| `Callout` | `type` / `title` / `icon` | 正文 |
| `Tabs` | — | `Tab`：`value`（必填）、`default`（布尔） |
| `Steps` | — | `Step`：`title` |
| `Cards` | — | `Card`：`title` / `href` / `icon` / `description`，可自闭合 |
| `Accordion` | — | `AccItem`：`title` / `type` |
| `Files` | — | `Folder`：`name` / `defaultOpen`；`File`：`name` / `href` / `icon`，可自闭合 |
| `TypeTable` | — | `TypeItem`：`name` / `type` / `default` / `required`（布尔），可自闭合 |
| `Image` | `src` / `alt` / `align` / `width` / `caption` / `zoom` | 自闭合 |
| `Mermaid` | `title` / `height` | 原始文本 |
| `div` | `class` / `id` | 正文 |

「九个容器加一个通用 `div`」的口径来自这张表：`div` 的属性原样透传到 DOM，内容照常按 Markdown 解析。

## Callout

`type` 有 7 个取值，缺省 `note`；表外取值按 `note` 渲染。

| 值 | 配色分支 |
|---|---|
| `note` / `info` | note |
| `tip` | tip |
| `important` | important |
| `warning` | warning |
| `caution` / `danger` | caution |

`warn`、`error`、`success`、`idea` 是别名，分别复用 warning、caution、tip、tip 的配色，不新增视觉分支。

<TypeTable>
  <TypeItem name="type" type="note | info | tip | important | warning | caution | danger" default="note" />
  <TypeItem name="title" type="string" />
  <TypeItem name="icon" type="string" />
</TypeTable>

不写 `title` 时图标与正文同行，不会补出「注意」之类的默认标题。

```md
<Callout type="tip" title="提示">
  正文支持完整 Markdown，包括 `行内码` 与 [链接](https://example.com)。
</Callout>
```

渲染结果：

<Callout type="tip" title="提示">
  正文支持完整 Markdown，包括 `行内码` 与 [链接](https://example.com)。
</Callout>

`icon` 给字符串时包在固定 16×16 的盒子里（与 lucide 图标同尺寸），可以用 emoji 或单个字符。

## Tabs

`value` 既是页签文案，也是这一页的身份。`default` 只决定初始选中项。

<TypeTable>
  <TypeItem name="value" type="string" required />
  <TypeItem name="default" type="boolean" default="第一项" />
</TypeTable>

```md
<Tabs>
  <Tab value="npm">npm install @heikeson/md-engine</Tab>
  <Tab value="pnpm" default>pnpm add @heikeson/md-engine</Tab>
</Tabs>
```

渲染结果（默认停在 `pnpm`）：

<Tabs>
  <Tab value="npm">npm install @heikeson/md-engine</Tab>
  <Tab value="pnpm" default>pnpm add @heikeson/md-engine</Tab>
</Tabs>

- 没有 `default` 时打开第 1 项；写多个时只认文档序第一个。
- 点到其他页签后不会被拉回默认项。
- 键盘：`←` / `→` 循环切换，`Home` / `End` 跳首尾，焦点跟随选中项（roving tabindex，未选中项 `tabIndex=-1`）。
- 子项可同行书写，也可展开成块；块形态里允许空行，按跨段落处理，保存时按原形态写回。

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

`Card` 可自闭合，内容全部放进属性，适合做导航网格。

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

`AccItem` 的 `type` 取 `open` 或 `close`，决定初始展开状态；写 `close` 或不写都是收起。子项另可带 `id`，`#id` 命中时自动展开——该属性未写进注册表的属性白名单，编辑器不会提示。

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

`Folder` 可嵌套，`defaultOpen` 控制默认展开；`File` 自闭合，图标按扩展名匹配，`icon` 可覆盖。

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

本页每张属性表都由它渲染。属性只接受字符串，所以拆成子项而不是对象表达式。

```md
<TypeTable>
  <TypeItem name="content" type="string" required />
  <TypeItem name="className" type="string" />
</TypeTable>
```

`TypeItem` 两种写法等价：自闭合时说明列留空，块形态则在标签之间写说明。

## Image

自闭合叶子。`align` 缺省 `center`；`zoom` 是布尔，写了才能点击放大、按 `Esc` 关闭。

```md
<Image src="/cover.svg" alt="封面" caption="题注写在这里" width="360" />
```

## Mermaid

容器体是**原始文本**：`#`、`|`、`-->`、行首 `-` 都不按 Markdown 解析，保存在节点 `data.rawBody`，序列化逐字写回。

```md
<Mermaid title="渲染管线">
flowchart LR
  A[Markdown] --> B[mdast]
  B --> C[hast]
  C --> D[React]
</Mermaid>
```

- `height` 给数字按像素限高；不写、空或 `auto` 都按内容适配。
- 主入口只渲染源码骨架。要缩放、拖拽、导出的图表，必须接 `/mermaid` 入口，见 **编辑器与图表**。
- 源码超过 20 KB 不渲染图表，改为显示源码并给 `MERMAID_TOO_LARGE`；`<Mermaid />` 等价于空源码，给 `MERMAID_EMPTY`。

## div

需要一层能挂 `class` / `id` 的分块时用它。属性透传到 DOM，不套组件。

```md
<div class="note-block" id="anchor">
  这里的内容仍然按 Markdown 渲染。
</div>
```

## 书写约束

- 属性只接受字符串（`a="b"`）与裸布尔（`a`）：不支持 `{…}` 表达式、数组、对象；属性值里可以有 `>`；名字区分大小写。
- 容器顶格书写。子项可按层缩进；**正文行**缩进 ≥4 空格（或 tab）会被 CommonMark 判成缩进代码块，`parse` 给出 `INDENT_AS_CODE`，内容不改写。
- 白名单外的标签连同正文按文本显示（`UNKNOWN_TAG`），不丢内容，也不执行 HTML。
- 容器嵌套上限 3 层，子项不计层；超限那一层整块降级为原文（`DEPTH_EXCEEDED`）。
- 只有 `Image`、`Card`、`File`、`TypeItem`、`Mermaid` 允许 `<X />`，其余必须写闭合标签。
- `normalizeMarkdown` 只给**大写开头**的独立标签行补空行，`div` 这类小写标签不参与排版整理。
