# @heikeson/md-engine

> @file README.md
> @description React Markdown 内容引擎：尖括号容器语法的解析、渲染、序列化、格式化与 CodeMirror 6 编辑器内核，单一 npm 包四个入口。
> @created 2026-10-24 19:57
> @updated 2026-10-27 19:10 版本口径对齐 0.3.0（样式原生 CSS + 令牌，样式目录改分片）
> @status v0.3.0

一个面向 React 的 Markdown 内容引擎。在标准 Markdown（GFM + 数学公式）之上，把
`<Callout>`、`<Cards><Card /></Cards>` 这类**尖括号容器**纳入解析流程，并保证
`md → AST → md` 逐字往返。适用于文档站、博客、知识库等需要「作者写 Markdown、读者看组件」的场景。

## 特性

- **容器语法是一等公民**：容器在 mdast 层是 `jsxBlock` 节点，可解析、可渲染、可序列化、可定位，不是字符串替换。
- **往返无损**：`parse` 与 `serialize` 共用同一套扩展，保存内容不会发生变形。
- **SSR 安全**：解析与渲染不依赖 `window` / `document`，可在服务端直接调用。
- **入口隔离**：编辑器代码独立入口，订阅页不会因为引入渲染器而带上 CodeMirror。
- **容错不崩**：未闭合容器、未知标签、超限嵌套一律降级显示并给出诊断码，不吞内容。
- **URL 有闸门**：`href` / `src` 在 hast 层统一过白名单，非法 scheme 被拦截，组件覆写也绕不过。

## 安装

```bash
npm install @heikeson/md-engine
```

| 项 | 要求 |
|---|---|
| React | `>=19`（peer dependency，`react` + `react-dom`） |
| Node | `>=20`（构建与发布；运行时无要求） |
| Tailwind | 不需要。包内样式为原生 CSS，颜色走 `--lkes-*` 变量，可脱离 Tailwind 独立使用 |

## 快速开始

### 渲染

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

外层的 `className` 建议带上 `prose-site`：包内样式的作用域挂在该类名下。

### 解析、序列化与格式化

```ts
import { parse, serialize, roundtrip, normalizeMarkdown } from "@heikeson/md-engine";

const { tree, blocks, diagnostics } = parse(md);
const same = serialize(tree);   // md → AST → md：形态（行内 / 块）与空行按原文保形
const again = roundtrip(md);     // 等价写法
const tidy = normalizeMarkdown(md); // 需要统一排版时用它（补空行、收敛空行），serialize 不替你改
```

`blocks` 是带全文 offset 的扁平块索引，可用来做目录、定位或分屏滚动同步。

### 编辑器

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

编辑器以 Markdown 文本为唯一真源：左 CodeMirror、右实时预览，工具栏插入的容器骨架保证「插进去即合法」。

### 自定义

```tsx
<MarkdownRenderer
  content={md}
  config={{
    // 单组件覆盖，未覆盖的仍用包内实现
    components: { Callout: MyCallout },
    // 追加插件（rehype 须为同步插件，以保证 SSR 安全）
    remarkPlugins: [],
    rehypePlugins: [],
    // 块级元素输出 data-src-start（编辑器滚动同步用，阅读页保持关闭）
    sourcePositions: false,
  }}
/>
```

## 容器语法

| 容器 | 属性 | 子项 |
|---|---|---|
| `Callout` | `type`（默认 `note`）/ `title` / `icon` | 正文 |
| `Tabs` | — | `Tab`：`value`、`default`（布尔） |
| `Steps` | — | `Step`：`title` |
| `Cards` | — | `Card`：`title`、`href`、`icon`、`description`（可自闭合） |
| `Accordion` | — | `AccItem`：`title`、`type`（`open` / `close`） |
| `Files` | — | `Folder`：`name`、`defaultOpen`（布尔）；`File`：`name`、`href`、`icon`（可自闭合） |
| `TypeTable` | — | `TypeItem`：`name`、`type`、`default`、`required`（布尔） |
| `Image` | `src` / `alt` / `align`（默认 `center`）/ `width` / `caption` / `zoom`（布尔） | 自闭合叶子 |

示例：

```md
<Callout type="tip" title="提示">
  正文支持完整的 Markdown，包括 `行内码` 与 [链接](https://example.com)。
</Callout>

<Tabs>
  <Tab value="npm">npm install @heikeson/md-engine</Tab>
  <Tab value="pnpm">pnpm add @heikeson/md-engine</Tab>
</Tabs>

<Cards>
  <Card title="快速开始" description="五分钟跑通渲染" href="/docs/start" />
</Cards>

<Files>
  <Folder name="src">
    <File name="index.ts" />
  </Folder>
</Files>
```

书写约束：

- 属性只接受字符串（`a="b"`）与裸布尔（`a`），不支持 `{…}` 表达式、数组、对象；属性值里可以有 `>`。
- 子项可以**同行书写**（`<Tab value="npm">npm install</Tab>`），也可以展开成块；子项内容里可以有空行（按跨段落处理）。保存时按原形态写回，不会强行加空行或展开。
- 容器**顶格**书写；子项可按层缩进（行首是已知标签时会自动归位）。**正文行**缩进 ≥4 空格仍按 CommonMark 判成缩进代码块，代码请用围栏。
- 放进列表时对齐内容列（`- ` 后 2 空格、`1. ` 后 3 空格）。
- 容器嵌套上限 3 层（子项不计层），超限那一层整块降级为原文。
- 只有 `Image`、`Card`、`File` 等叶子允许 `<X />`，其余容器必须写 `</X>`。

## API

### 主入口 `@heikeson/md-engine`

| 导出 | 说明 |
|---|---|
| `parse(md, { maxDepth? })` | 返回 `{ tree, blocks, diagnostics }` |
| `serialize(tree)` | mdast → Markdown，与解析对称 |
| `roundtrip(md)` | `serialize(parse(md).tree)` 的简写 |
| `normalizeMarkdown(md)` | 幂等的排版整理 |
| `extractBlocks(tree, source)` | 从 mdast 提取扁平块索引 |
| `MarkdownRenderer` | `{ content, className?, config? }` |
| `mdxComponents` | 组件映射表，自定义渲染或按需取单个组件 |
| `COMPONENTS` / `ITEMS` / `MAX_CONTAINER_DEPTH` | 语法注册表（唯一事实来源） |
| `getComponent` / `getItemSpec` / `listComponents` / `isContainerWithItems` | 注册表查询 |
| `jsxBlocks` / `remarkJsxBlocks` / `jsxFromMarkdown` / `jsxToMarkdown` / `parseOpenTag` | 自行组装 unified 管线时用 |

主入口不导出任何编辑器代码。

### 编辑器入口 `@heikeson/md-engine/editor`

| 导出 | 说明 |
|---|---|
| `MarkdownEditor` | `{ value, onChange, view?, config?, fullscreen?, onToggleFullscreen? }` |
| `EditorConfig` / `EditorView` / `MarkdownEditorProps` | 类型 |
| `INSERTABLE_BLOCKS` / `blockSnippet(name)` | 可插入的容器与骨架文本 |
| `insertAtCursor` / `toggleLinePrefix` / `wrapSelection` | 纯函数文本动作，可脱离编辑器复用 |

### 样式入口 `@heikeson/md-engine/styles.css`

引入一次即可，类名均挂在 `.prose-site` 作用域下。配色由独立命名空间 `--lkes-*` 控制（9 个令牌），
默认跟随宿主的 `--background` / `--foreground` / `--border` / `--primary` 等变量，宿主不配置也能正常显示；
覆盖方式与变量清单见 [`对接契约.md`](./对接契约.md) 第 9 节。

需要按组件引入时：

```ts
import "@heikeson/md-engine/styles/callout.css"; // 只取 Callout
```

## 设计要点

### 数据流

```
Markdown
  ├ fromMarkdown（gfm + math + 尖括号扩展）→ mdast（容器为 jsxBlock）
  ├ policy：深度裁剪 + 未闭合判定 → { tree, diagnostics }
  ├ blocks：压平为带 offset 的块索引
  ├ remark-rehype（自定义 jsxBlock handler）
  ├ rehypeSafeUrls → rehypeSafeAnchors → [sourcePositions] → rehypeCodeMeta → rehypeSlug → rehypeKatex
  └ hast-util-to-jsx-runtime + 组件映射 → React
```

反向只需一条：`mdast → toMarkdown（gfm + math + jsx handler）→ Markdown`。

### 模块边界

| 层 | 文件 | 允许依赖 | 禁止 |
|---|---|---|---|
| 声明 | `registry.ts` | 无 | React / DOM |
| 词法 | `syntax/jsx-flow.ts` | micromark 工具 | mdast / React |
| 桥接 | `syntax/jsx-mdast.ts` | mdast | React |
| 策略 | `policy.ts` | registry | DOM |
| 组装 | `parse.ts` / `blocks.ts` | 以上各层 | React |
| 渲染 | `render.tsx` | unified / React | 浏览器 API |
| 编辑器 | `editor/*` | React / CodeMirror | 被主入口导出 |

### 容错与诊断

| 输入 | 行为 | 诊断码 |
|---|---|---|
| 未注册的标签 | 交回内置 HTML flow 按文本显示，内容不丢 | `UNKNOWN_TAG` |
| 未闭合容器 | 渲染到文末，序列化不补闭合标签 | `UNCLOSED_TAG` |
| 嵌套超过 3 层 | 超限那层整块降级为原文 | `DEPTH_EXCEEDED` |
| 非白名单协议的 `href` / `src` | `href` → `#`、`src` 移除 | `UNSAFE_HREF` |

协议白名单为 `http(s)` / `mailto` / `tel`，以及任意无 scheme 的引用（相对路径、`//host`、`#锚点`、`?查询`）。

## 开发

```bash
npm run dev        # Vite playground，http://127.0.0.1:5180（渲染 + 编辑器联调）
npm run snapshot   # 静态快照 dev/.out/preview.html + 往返与诊断自检
npm run selfcheck  # 构建后跑解析 / 渲染 / 序列化断言套件（dev/selfcheck.mjs）
npm run typecheck  # tsc --noEmit
npm run build      # tsup → dist（JS + .d.ts + sourcemap）+ build:css → dist/styles.css
npm run build:css  # 只打包样式：esbuild 内联 styles/*.css → dist/styles.css
npm pack --dry-run # 核对发布清单
```

`dev/` 与 `docs/` 均不进发布包，`files` 白名单只含 `dist` / `styles` / `README.md` / `对接契约.md` / `LICENSE`。

目录：

```
src/
├─ registry.ts                语法声明（唯一事实来源）
├─ policy.ts / policy-tags.ts 深度裁剪、未闭合、诊断
├─ parse.ts / blocks.ts       md → { tree, blocks, diagnostics }
├─ render.tsx / serialize.ts / format.ts
├─ rehype-*.ts                URL 闸门 / 锚点还原 / 代码元信息 / 源码位置
├─ syntax/                    micromark 尖括号扩展（词法 → mdast → remark 注入）
├─ components/                8 容器 + 7 子项 + 映射
├─ internal/                  cn、isSafeHref
└─ editor/                    CodeMirror 封装、文本动作、滚动同步、工具栏
styles/*.css                  原生 CSS 分片（按组件拆分，index.css 汇总；engine.css 为旧路径转发）
```

开发约定：注释与文档中文；每个文件含 `@file` / `@description` / `@created` / `@updated`；
导出函数写中文注释（功能 / 参数 / 返回值）；单文件 ≤ 200 行、单函数 ≤ 40 行；
纯逻辑层（registry / policy / parse / serialize / format）不得依赖 React 与 DOM。

## 版本与兼容

发版内容记录在 [`update.md`](./update.md)。

对外契约见 [`对接契约.md`](./对接契约.md)，三条硬约束：

1. **语法只增不改**：已发布组件的名字、属性名与语义永不修改，只新增。
2. **配置只增不改**：新增配置项必须带默认值，不得改变既有行为。
3. **样式随包走**：样式类与变量由包提供，使用方只覆盖变量，不改类名。

违反任一条即视为破坏性变更——存量内容会失效，而本项目不做内容迁移。

## 许可

[MIT](./LICENSE)
