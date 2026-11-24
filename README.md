# @heikeson/md-engine

[简体中文](./README.md) | [English](./README.en.md)

React 的 Markdown 渲染器，外加一个基于 CodeMirror 6 的编辑器。GFM 和数学公式都支持，
重点在下面这种写法：

```md
<Callout type="tip" title="提示">
  正文照样是 Markdown，`行内码`、[链接](https://example.com) 都正常。
</Callout>
```

这类尖括号容器不是渲染时拿正则抠出来的，而是跟标题、列表一样进 mdast。因此它们有位置信息，
可以序列化回原文，也可以整块换成你自己的组件。`md → AST → md` 走一遍，文本一个字都不变。

## 安装

```bash
npm install @heikeson/md-engine
```

需要 React 19 及以上。包里只有 ESM 入口，老 Jest 或 webpack 4 这类环境得自己过一层互操作。
样式是原生 CSS，跟 Tailwind 无关，宿主不配任何主题变量也能正常显示。

## 渲染

```tsx
import { MarkdownRenderer } from "@heikeson/md-engine";
import "@heikeson/md-engine/styles.css";

export default function Article({ content }: { content: string }) {
  return <MarkdownRenderer content={content} className="prose-site" />;
}
```

`prose-site` 别省，八个容器的样式都挂在它下面。Mermaid 用 `.lkes-mermaid`，编辑器用
`.md-editor`，这两个不需要。

解析和渲染都不碰 `window`、`document`，服务端可以直接调。

## 容器

| 容器 | 属性 | 子项 |
| --- | --- | --- |
| `Callout` | `type`（`note` `info` `tip` `important` `warning` `caution` `danger`，默认 `note`）、`title`、`icon` | 正文 |
| `Tabs` | 无 | `Tab`：`value`、`default` |
| `Steps` | 无 | `Step`：`title` |
| `Cards` | 无 | `Card`：`title`、`href`、`icon`、`description` |
| `Accordion` | 无 | `AccItem`：`title`、`type`（`open` / `close`） |
| `Files` | 无 | `Folder`：`name`、`defaultOpen`；`File`：`name`、`href`、`icon` |
| `TypeTable` | 无 | `TypeItem`：`name`、`type`、`default`、`required` |
| `Image` | `src`、`alt`、`align`、`width`、`caption`、`zoom` | 自闭合 |
| `Mermaid` | `title`、`height` | 原始文本，内部不按 Markdown 解析 |
| `div` | `class`、`id` | 正文，属性透传到 DOM |

```md
<Tabs>
  <Tab value="npm">npm install @heikeson/md-engine</Tab>
  <Tab value="pnpm">pnpm add @heikeson/md-engine</Tab>
</Tabs>

<Cards>
  <Card title="快速开始" description="渲染一节的最小示例" href="/docs/start" />
</Cards>
```

有几条是硬规则，写错了不报错但会变形：

- 容器顶格。子项可以缩进，正文行缩进到 4 格会被 CommonMark 判成代码块。
- 属性只认 `a="b"` 和裸布尔，`{...}` 表达式不支持。
- 白名单外的标签，连同里面的内容按文本原样显示。想要一个能挂 `class` 的分块，用 `div`。
- `Image`、`Card`、`File` 能自闭合，其他容器必须写结束标签。
- 嵌套最多 3 层，超出的那层按原文输出。

## 解析与序列化

```ts
import { parse, serialize, roundtrip, normalizeMarkdown, diagnose } from "@heikeson/md-engine";

const { tree, blocks, diagnostics } = parse(md);
serialize(tree);          // 回到 Markdown，形态和空行按原文保留
roundtrip(md);            // 上面两行的简写
normalizeMarkdown(md);    // 需要统一排版时用；serialize 不替你改排版
diagnose(md);             // 只要诊断，等价于 parse(md, { blocks: false }).diagnostics
```

`blocks` 是带全文 offset 的扁平块索引，做目录、定位、滚动同步都能用。编辑器里只想要诊断时
用 `diagnose()`，省掉一次整树转换。

## 编辑器

```tsx
"use client";

import { useState } from "react";
import { MarkdownEditor } from "@heikeson/md-engine/editor";
import "@heikeson/md-engine/styles.css";

export default function EditorPage() {
  const [value, setValue] = useState("");
  return (
    <MarkdownEditor
      value={value}
      onChange={setValue}
      view="split"
      config={{ placeholder: "开始写作…" }}
    />
  );
}
```

受控组件，`value` 就是 Markdown 文本，左边编辑右边预览。工具栏插入的骨架由 `registry.ts`
生成，跟解析规则同名同属性，不会对不上。快捷键跟按钮走同一个实现：`Mod+B`、`Mod+I`、
`Mod+E` 分别是粗体、斜体、行内码，`Mod+Shift+S` 删除线，`Mod+1` 二级标题，`Mod+Shift+Q`
引用，`Mod+Shift+L` 列表。

## 图表

`<Mermaid>` 默认只出源码骨架。要在页面上出图，在客户端组件里合并覆写表：

```tsx
"use client";
import { MarkdownRenderer, mdxComponents } from "@heikeson/md-engine";
import { mermaidComponents } from "@heikeson/md-engine/mermaid";

const components = { ...mdxComponents, ...mermaidComponents };

<MarkdownRenderer content={md} config={{ components }} />;
```

键名是 `Mermaid`，大写开头，写小写不报错，图表会一直停在骨架。`mermaid` 是可选 peer，
没装的话渲染降级成源码，解析和序列化不受影响。

## 语言

内置 `zh-CN` 和 `en-US`，`config.locale` 选语言包，`config.messages` 逐条改文案。想在根节点
设一次，包一层 Provider：

```tsx
import { MdEngineProvider } from "@heikeson/md-engine";

<MdEngineProvider locale={locale}>
  <App />
</MdEngineProvider>
```

`locale` 得是服务端和客户端一致的受控值，通常从 URL 段或请求头取。库不读 `navigator`、
cookie、`<html lang>`，那些在 SSR 下会让首屏语言对不上。确实要在客户端探测，用 `detectLocale()`，
放在 effect 里。

## 换组件

```tsx
<MarkdownRenderer
  content={md}
  config={{
    components: { Callout: MyCallout }, // 只换这一个，其余走包内实现
    remarkPlugins: [],
    rehypePlugins: [],                  // 必须是同步插件，否则 SSR 不安全
    sourcePositions: false,             // 只有编辑器滚动同步要开
  }}
/>
```

自己写的组件里，`useUIText()` 取文案，`useMessage()` 按 ICU 语法格式化。

## 样式

引一次 `@heikeson/md-engine/styles.css`。配色走独立的 `--lkes-*` 变量，九个令牌，亮暗各一套
字面量，祖先加 `.dark` 或者 `[data-theme="dark"]` 就整体切暗色。变量清单和覆盖写法在
[对接契约.md](./对接契约.md) 第 9 节。

按组件拆分也行，`styles/*.css` 在 npm 包里是原样发布的。但令牌单独放在 `tokens.css`，
只引分片就拿不到 `--lkes-*`，暗色失效、颜色退回兜底值。顺序也有讲究，`tokens` 得在前，
`components` 层才能压过令牌层：

```ts
import "@heikeson/md-engine/styles/tokens.css";
import "@heikeson/md-engine/styles/callout.css";
```

## 开发

```bash
npm run dev        # playground，渲染和编辑器联调
npm run snapshot   # 静态快照，附带往返和诊断自检
npm run selfcheck  # 构建后跑解析、渲染、序列化断言
npm run typecheck  # tsc --noEmit
npm run build      # dist 和 dist/styles.css
```

`dev/`、`docs/`、`site/` 都不进发布包，`files` 里只有 `dist`、`styles`、`README.md`、
`README.en.md`、`对接契约.md`、`LICENSE`。

```
src/
├─ registry.ts      语法声明，唯一事实来源
├─ policy.ts        深度裁剪、未闭合判定、诊断
├─ parse.ts / blocks.ts
├─ render.tsx / serialize.ts / format.ts
├─ syntax/          micromark 尖括号扩展
├─ components/      容器组件与映射
├─ mermaid/         /mermaid 入口
├─ editor/          CodeMirror 封装、工具栏、滚动同步
└─ locales/         语言包
styles/             原生 CSS 分片
```

## 入口

```
@heikeson/md-engine                 解析、序列化、MarkdownRenderer、Provider
@heikeson/md-engine/editor          MarkdownEditor
@heikeson/md-engine/mermaid         交互式图表
@heikeson/md-engine/components      单个容器组件
@heikeson/md-engine/locales/zh-CN   语言包
@heikeson/md-engine/locales/en-US
@heikeson/md-engine/styles.css      整套样式
```

主入口不导出任何编辑器代码。完整的函数签名、诊断码、CSS 变量见
[对接契约.md](./对接契约.md)，版本变更见 [update.md](./update.md)。

## 兼容

已发布的东西不改：组件名、属性名、语义只增不改，新增配置项必须带默认值，样式类名和变量
由包提供。要改就是破坏性变更，得发大版本。

## 许可

MIT
