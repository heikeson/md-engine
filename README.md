# @heikeson/md-engine

> @file README.md
> @description React Markdown 内容引擎：尖括号容器语法的解析、渲染、序列化、格式化与 CodeMirror 6 编辑器内核，单一 npm 包按子路径拆分入口（主入口 / editor / components / mermaid / styles.css，另有 locales/zh-CN 与 locales/en-US）。
> @created 2026-10-24 19:57
> @updated 2026-11-05 23:52 校对到 0.5.2 源码：入口按子路径列全；样式作用域与令牌来源；诊断码细分；Callout type 补 info
> @updated 2026-11-09 10:20 补充「依赖约定」（katex / @types 的位置原因）与 diagnose 用法
> @status v0.5.3

一个面向 React 的 Markdown 内容引擎。在标准 Markdown（GFM + 数学公式）之上，把
`<Callout>`、`<Cards><Card /></Cards>` 这类**尖括号容器**纳入解析流程，并
`md → AST → md` 逐字往返。适用于文档站、博客、知识库等需要「作者写 Markdown、读者看组件」的场景。

## 特性

- **容器是真正的节点**：容器在 mdast 层是 `jsxBlock` 节点，可解析、可渲染、可序列化、可定位，不是字符串替换。
- **往返保形**：`parse` 与 `serialize` 共用同一套扩展，`md → AST → md` 逐字一致。
- **SSR 安全**：解析与渲染不读 `window` / `document`，可在服务端直接调用。
- **入口隔离**：编辑器代码在独立入口，只引渲染器不会带上 CodeMirror。
- **容错降级**：未闭合容器、未知标签、超限嵌套降级显示并给出诊断码，不吞内容。
- **URL 白名单**：`href` / `src` 在 hast 层统一过白名单，非法 scheme 被拦截，组件覆写也绕不过。

## 安装

```bash
npm install @heikeson/md-engine
```

| 项 | 要求 |
|---|---|
| React | `>=19`（peer dependency，`react` + `react-dom`） |
| Node | `>=20`（构建与发布；运行时无要求） |
| Tailwind | 不需要。包内样式为原生 CSS，颜色走 `--lkes-*` 变量，可脱离 Tailwind 独立使用 |
| 模块格式 | **ESM-only**：`exports` 只提供 `import` 条件，无 CJS 入口。CommonJS 项目（老 Jest、webpack4）需经 ESM 互操作层或打包后使用 |

### 依赖约定

| 依赖 | 位置 | 说明 |
|---|---|---|
| `katex` | `dependencies` | 构建时被 external，产物里保留 `import "katex"`；由本包直接声明，避免在严格 `node_modules`（pnpm）下由 `rehype-katex` 的私有依赖树解析 |
| `@types/hast` / `@types/mdast` | `dependencies` | **有意为之**：`dist/*.d.ts` 直接引用 `hast` / `mdast` 模块类型，宿主 `skipLibCheck: false` 时需要能解析到它们。不要移到 `devDependencies` |
| `clsx` / `tailwind-merge` | `dependencies` | 仅用于包内 `cn()` 合并类名，宿主的同名依赖互不影响 |
| `mermaid` / `dompurify` | 可选 peer（`/mermaid` 入口） | 只在引入 `/mermaid` 时才需要，未安装时图表降级为源码 |

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

外层的 `className` 要带上 `prose-site`：8 个容器样式（callout / tabs / steps / cards / accordion / files / type-table / image）的作用域挂在该类名下。`Mermaid` 用 `.lkes-mermaid`、编辑器用 `.md-editor`，两者不要求这个类。

### 解析、序列化与格式化

```ts
import { parse, diagnose, serialize, roundtrip, normalizeMarkdown } from "@heikeson/md-engine";

const { tree, blocks, diagnostics } = parse(md);
const same = serialize(tree);   // md → AST → md：形态（行内 / 块）与空行按原文保形
const again = roundtrip(md);     // 等价写法
const tidy = normalizeMarkdown(md); // 需要统一排版时用它（补空行、收敛空行），serialize 不替你改

const onlyDiagnostics = diagnose(md);        // 只要诊断：跳过块索引
const noBlocks = parse(md, { blocks: false }); // 同上，等价写法
```

`blocks` 是带全文 offset 的扁平块索引，可用来做目录、定位或分屏滚动同步。
输入时只需提示（如编辑器）就用 `diagnose()`：省掉 `extractBlocks` 的整树转换。

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

编辑器以 Markdown 文本为唯一真源：左 CodeMirror、右实时预览；工具栏插入的容器骨架由 `registry.ts` 生成，属性名与子项名不会与解析规则脱节。

内置快捷键（与工具栏按钮同一动作实现）：`Mod+B/I/E` 粗体/斜体/行内码、`Mod+Shift+S` 删除线、
`Mod+1` 二级标题、`Mod+Shift+Q` 引用、`Mod+Shift+L` 列表。

预览要出交互式图表时透传渲染配置：`config={{ rendererConfig: { components: mermaidComponents } }}`；
文案分两层：`config.locale` 决定用哪套内置语言包（并驱动 ICU 复数规则与书写方向），`config.messages` 逐键覆写个别词。两者都可省略，省略时继承外层 `MdEngineProvider`，再退到 `zh-CN`。

想在应用里设一次、全局生效，用根级 Provider 包住根节点即可——子树里所有渲染器与编辑器自动继承：

```tsx
import { MdEngineProvider } from "@heikeson/md-engine";

<MdEngineProvider locale={locale}>
  <App />
</MdEngineProvider>
```

语言值必须是**服务端与客户端一致**的受控输入（通常来自 URL 段或请求头）。库不读 `navigator`、`<html lang>` 或 cookie：隐式探测在 SSR 下必然导致首屏语言不一致。需要客户端探测时显式调用 `detectLocale()`（只能放在 `effect` 里）。

### 自定义

```tsx
<MarkdownRenderer
  content={md}
  config={{
    // 单组件覆盖，未覆盖的仍用包内实现
    // 提示：覆写表请提为模块级常量（如 README 图表一节的 `components`），
    // 内联字面量虽已被浅比较兜住，但常量写法语义最清晰
    components: { Callout: MyCallout },
    // 追加插件（rehype 须为同步插件，以保证 SSR 安全）
    remarkPlugins: [],
    rehypePlugins: [],
    // 块级元素输出 data-src-start（编辑器滚动同步用，阅读页保持关闭）
    sourcePositions: false,
    // 语言：选内置语言包 + ICU 复数规则 + 书写方向
    locale: "en-US",
    // 文案逐键覆写（优先于语言包；旧字段 text 仍兼容，两者同时给时以 messages 为准）
    messages: { imageZoomClose: "Close zoomed image" },
  }}
/>
```

自定义组件里可用 `useUIText()` 读文案、`useMessage()` 按 ICU 语法格式化，保持与包内组件同一口径：

```tsx
const t = useMessage();
t("editorWordCount", { n: 12 }); // "12 characters"（en-US）/ "12 字"（zh-CN）
```

消息模板支持 ICU 复数，`zh-CN` 只有 `other` 分支，`en-US` 区分 `one` / `other`：

```
editorWordCount: "{n, plural, one {# character} other {# characters}}"
```

### 图表（`/mermaid` 入口）

`<Mermaid>` 默认只渲染**源码骨架**（不加载 mermaid）。要变成可缩放、可导出的图表，在**客户端组件**里合并覆写表：

```tsx
"use client";
import { MarkdownRenderer, mdxComponents } from "@heikeson/md-engine";
import { mermaidComponents } from "@heikeson/md-engine/mermaid";
import "@heikeson/md-engine/styles.css";

const components = { ...mdxComponents, ...mermaidComponents };

<MarkdownRenderer content={md} config={{ components }} />;
```

- `mermaid` 是**可选 peer**（未装则不打包、运行时降级为源码）；`dompurify` 为直接依赖。
- 键必须是 `Mermaid`（大写开头）：写成小写不报错，只会静默停留在骨架。
- 解析、渲染、序列化在主入口全部可用，与本入口无关；未接入时 `parse` / `roundtrip` 行为完全一致。

## 容器语法

| 容器 | 属性 | 子项 |
|---|---|---|
| `Callout` | `type`（`note` / `info` / `tip` / `important` / `warning` / `caution` / `danger`，默认 `note`）/ `title` / `icon` | 正文 |
| `Tabs` | — | `Tab`：`value`、`default`（布尔） |
| `Steps` | — | `Step`：`title` |
| `Cards` | — | `Card`：`title`、`href`、`icon`、`description`（可自闭合） |
| `Accordion` | — | `AccItem`：`title`、`type`（`open` / `close`） |
| `Files` | — | `Folder`：`name`、`defaultOpen`（布尔）；`File`：`name`、`href`、`icon`（可自闭合） |
| `TypeTable` | — | `TypeItem`：`name`、`type`、`default`、`required`（布尔），可自闭合 |
| `Image` | `src` / `alt` / `align`（默认 `center`）/ `width` / `caption` / `zoom`（布尔） | 自闭合叶子 |
| `div` | `class` / `id` | 正文（属性透传到 DOM，用于局部样式或锚点） |
| `Mermaid` | `title` / `height`（默认自动高度；给数字才限高） | **原始文本**：容器体不按 Markdown 解析，整段是图表源码 |

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
- 白名单外的标签（如 `<section>`、`<Foo>`）连同正文**按文本原样显示**，不会丢内容、也不执行 HTML；需要一层可挂 `class` / `id` 的分块用 `div`。
- 子项可以**同行书写**（`<Tab value="npm">npm install</Tab>`），也可以展开成块；子项内容里可以有空行（按跨段落处理）。保存时按原形态写回，不会强行加空行或展开。
- 容器**顶格**书写；子项可按层缩进（行首是已知标签时会自动归位）。**正文行**缩进 ≥4 空格（或 tab）仍按 CommonMark 判成缩进代码块，此时 `parse` 会给出 `INDENT_AS_CODE` 提示，内容不会被改写；要写代码请用围栏。
- 放进列表时对齐内容列（`- ` 后 2 空格、`1. ` 后 3 空格）。
- 容器嵌套上限 3 层（子项不计层），超限那一层整块降级为原文。
- 只有 `Image`、`Card`、`File` 等叶子允许 `<X />`，其余容器必须写 `</X>`；`<Mermaid />` 是特例：等价于空源码（产 `MERMAID_EMPTY`）。
- `Mermaid` 的容器体是**原始文本**：里面的 `#`、`|`、`-->`、行首 `-` 都不会被当成 Markdown 语法，保存时逐字写回。

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
| `MdEngineProvider` / `useLocale` / `useMessage` | 根级语言 Provider；读取当前语言与按 ICU 格式化 |
| `defaultUIText` / `useUIText` / 类型 `UIText` / `UITextPatch` | 包内固定文案表与覆写口径 |
| `formatMessage` / `resolveLocale` / `detectLocale` / `isRTL` / `toRouteSegment` / `fromRouteSegment` / `normalizeLocale` / `matchLocale` / `languageOf` / `localeCandidates` / `supportsIntlLocale` / `DEFAULT_LOCALE` / `BUILTIN_LOCALES` | 语言标识、回退匹配、方向判定与 ICU 格式化（纯函数，库内不做隐式探测） |
| `createLocaleStorage` / `DEFAULT_LOCALE_STORAGE_KEY` / 类型 `LocaleStorage` | 语言偏好存取（默认键 `lkes-md-lang`，宿主可换实现） |
| `zhCN` / `enUS`（子路径 `./locales/zh-CN`、`./locales/en-US`） | 内置语言包 |
| `COMPONENTS` / `ITEMS` / `MAX_CONTAINER_DEPTH` | 语法注册表（唯一事实来源） |
| `getComponent` / `getItemSpec` / `listComponents` / `isContainerWithItems` | 注册表查询 |
| `jsxBlocks` / `remarkJsxBlocks` / `jsxFromMarkdown` / `jsxToMarkdown` / `parseOpenTag` | 自行组装 unified 管线时用 |

主入口不导出任何编辑器代码。

### 编辑器入口 `@heikeson/md-engine/editor`

| 导出 | 说明 |
|---|---|
| `MarkdownEditor` | `{ value, onChange, view?, config?, fullscreen?, onToggleFullscreen? }`；`config` 支持 `uploadImage` / `placeholder` / `readOnly` / `rendererConfig` / `locale` / `fallbackLocale` / `messages`（旧 `text` 兼容） |
| `EditorConfig` / `EditorView` / `MarkdownEditorProps` | 类型 |
| `INSERTABLE_BLOCKS` / `blockSnippet(name)` | 可插入的容器与骨架文本 |
| `insertAtCursor` / `toggleLinePrefix` / `wrapSelection` | 纯函数文本动作，可脱离编辑器复用 |

### 样式入口 `@heikeson/md-engine/styles.css`

引入一次即可。8 个容器的类名挂在 `.prose-site` 作用域下；`Mermaid` 与编辑器分别用 `.lkes-mermaid` / `.md-editor`，不要求该类名。
配色由独立命名空间 `--lkes-*` 控制（9 个令牌，亮暗两套字面量），不读宿主的 `--background` / `--foreground` 等变量，宿主不配置也能正常显示；
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
| `<Mermaid>` 容器体为空 | 渲染为源码块 + 提示，不白屏 | `MERMAID_EMPTY` |
| `<Mermaid>` 源码 > 20 KB | 不渲染图表，原样显示源码 | `MERMAID_TOO_LARGE` |
| `div id` 与标题锚点重复 | 照常渲染（提示重复 id 风险），不改写内容 | `DUPLICATE_ID_ANCHOR` |
| `div id` 彼此重复 | 同上 | `DUPLICATE_ID_DIV` |

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
├─ components/                容器组件 + 子项 + 映射（含图表占位骨架）
├─ mermaid/                   /mermaid 入口：交互视图、渲染队列、令牌映射、导出
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
