# markdownedit-kesonoasis

> @file README.md
> @description 独立 Markdown 引擎项目（包名 `@heikeson/md-engine`）：解析、渲染、序列化、格式化、编辑器的唯一实现地。宿主站点只提供 Markdown 内容与站点级注入。
> @created 2026-10-24 19:57
> @updated 2026-10-25 02:30 新增「六、框架说明」「七、组件开发规范」
> @status 源码已迁入·待独立发布

## 一、这个项目是什么

一套自研的 Markdown 内容引擎，供 `blog-heikeson2026` 消费。三件事一起解决：

1. **容器语法**：`<Callout type="warn">`、`<Cards><Card title="…">` 这类尖括号容器，由本包解析与渲染。
2. **内容零损耗**：`md → AST → md` 逐字一致；内容永远是 Markdown 原文，不存在 HTML 中间态。
3. **无感升级**：宿主不改代码、只升包版本，新增组件与 UI 优化即可生效。

宿主侧的方案文档在 `blog-heikeson2026/docs/markdown/`，本仓库只负责引擎实现与对外契约。

## 二、包形态

> **当前状态**：源码已迁入本目录（**可独立发布**）。`blog-heikeson2026` 暂保留 `packages/md-engine` 作为本地开发副本，待本包发布到 npm 后切换为依赖 `@heikeson/md-engine`。

### 安装与使用（发布后）

```bash
npm install @heikeson/md-engine
```

```tsx
import { MarkdownRenderer, parse, serialize, normalizeMarkdown } from "@heikeson/md-engine";
import { MarkdownEditor } from "@heikeson/md-engine/editor";
import "@heikeson/md-engine/styles.css";
```

宿主前置条件：

| 项 | 要求 |
|---|---|
| React | 19+（peer dependency） |
| Tailwind | 4.x —— 包内 `engine.css` 使用 `@apply`，需由宿主的 Tailwind 管线处理 |
| 构建器 | 需支持直接消费 TS 源码（Next/Turbopack、Vite、tsup 均可） |

### 构建与发布

```bash
npm run build          # tsup → dist（JS + .d.ts + sourcemap）
npm run typecheck
npm pack --dry-run     # 核对清单：dist / styles / 文档 / LICENSE，不含 src
npm publish
```

`prepublishOnly` 已串好 `build + typecheck`，构建失败就无法发布。

**为什么要构建**：发布到 npm 后包位于 `node_modules`，Next 默认不转译依赖里的 TS，宿主得配 `transpilePackages`；构建后消费者零配置。详见 [docs/构建与发布.md](./docs/构建与发布.md)，含入口隔离、external 清单、样式为何不构建、构建期踩过的坑。

```
src/
├─ registry.ts                语法声明：组件、子项、属性、mode、深度上限（唯一事实来源）
├─ policy.ts                  策略层：深度裁剪、未闭合容错、未知标签、协议校验
├─ parse.ts                   md → { tree, blocks, diagnostics }
├─ blocks.ts                  mdast → 带全文 offset 的扁平块索引（编辑器定位用）
├─ render.tsx                 <MarkdownRenderer />
├─ serialize.ts               mdast → md（与解析对称）
├─ format.ts                  normalizeMarkdown（只整理排版，不承担语法正确性）
├─ rehype-code-meta.ts        代码块原文 / 语言 / 文件名 → data-code-* 属性
├─ rehype-source-positions.ts 块级 data-src-start（仅编辑器预览开启，滚动同步用）
├─ syntax/
│  ├─ jsx-flow.ts             micromark flow 构造：尖括号开标签 → 内容区 → 按名字闭合
│  ├─ jsx-mdast.ts            token ↔ mdast 双向（含属性解析、自闭合、序列化）
│  ├─ jsx-remark.ts           把扩展注入 unified 的标准方式（data.micromarkExtensions 等）
│  └─ jsx-types.ts            TokenTypeMap / RootContentMap 类型注册
├─ components/                8 个容器组件 + 7 个子项 + index 映射 + internal（cn / url-policy）
├─ styles/engine.css          语义类 + CSS 变量默认值（宿主只覆盖变量）
└─ editor/                    CodeMirror 封装、纯函数文本动作、插入骨架、滚动同步、工具栏

exports
├─ "."              → parse / render / serialize / format / blocks / registry（SSR 安全）
├─ "./editor"       → <MarkdownEditor />（client only）
├─ "./components"   → 组件映射（宿主自定义渲染时用）
└─ "./styles.css"   → 包自带样式
```

一个包、四个入口。**主入口不得导出任何编辑器代码**（否则 CodeMirror 会进入阅读页 chunk）。

## 三、技术选型（已定，不再评估）

| 层 | 选型 | 理由 |
|---|---|---|
| 解析 | `mdast-util-from-markdown` + 自研尖括号配对插件 | 语法解释权必须自持（见契约 C1） |
| 序列化 | `mdast-util-to-markdown` + 自定义 handler | 与解析对称，往返可逐字一致 |
| 渲染 | React（`react-markdown` 或直接 hast→React） | 与宿主同栈 |
| 编辑器 | CodeMirror 6 + 块级 UI | Markdown 文本即真源，零桥接 |
| 样式 | 包自带语义 CSS + CSS 变量 | 样式随包走，宿主只覆盖变量 |

**明确不引入**：fumadocs、MDX、TipTap、ProseMirror、Milkdown、MDXEditor、TUI Editor。理由见宿主侧 `05-调研与选型.md`。

## 四、依赖

| 类型 | 包 |
|---|---|
| 运行依赖 | `mdast-util-from-markdown`、`mdast-util-to-markdown`、`unist-util-visit`、`@types/mdast` |
| 渲染依赖 | `react-markdown`、`remark-gfm`、`remark-math`、`rehype-slug`、`rehype-katex`、`shiki`（按需动态加载）、`mermaid`（按需动态加载） |
| 编辑器依赖 | `@codemirror/state`、`@codemirror/view`、`@codemirror/commands`、`@codemirror/language`、`@codemirror/lang-markdown` |
| peer | `react`、`react-dom` |

不引入 `prosemirror-markdown`、`turndown`、`@tiptap/*`。

## 五、开发约定

1. **中文**：注释、错误文案、提交说明、文档全部中文。
2. **文件头**：每个文件含 `@file` / `@description` / `@created` / `@updated`（真实时间到分）。
3. **函数注释**：所有导出函数写中文注释（功能 / 参数 / 返回值）。
4. **体量**：单文件 ≤ 200 行，单函数 ≤ 40 行；超限先拆。
5. **纯净**：`registry` / `policy` / `parse` / `serialize` / `format` 不依赖 React 与 DOM，可脱离浏览器运行。
6. **验证**：每次改动跑 typecheck + 往返用例；`md → AST → md` 必须逐字一致。

## 六、框架说明

### 6.1 数据流（单向管线，收发对称）

正向：

```
Markdown 文本
  ├ fromMarkdown（+ gfm + jsxBlocks 词法扩展）
  │    → mdast：容器是 jsxBlock 节点，子项是其子节点
  ├ policy：深度裁剪（超限层降级）+ 未闭合诊断
  │    → { tree, diagnostics }
  ├ blocks：压平为带全文 offset 的块索引
  │    → { blocks }
  ├ remark-rehype（自定义 handler：jsxBlock → hast 元素）
  ├ rehypeSourcePositions   → data-src-start（可选，编辑器预览）
  ├ rehypeCodeMeta          → data-code-raw / -lang / -title
  ├ rehypeSlug → 宿主插件 → rehype-katex
  │    → hast
  └ hast-util-to-jsx-runtime + components 映射
       → React
```

反向（保存 / 往返校验）：

```
mdast → toMarkdown（+ gfm + jsxToMarkdown handler）→ Markdown
```

### 6.2 模块边界

| 层 | 文件 | 允许依赖 | 禁止 |
|---|---|---|---|
| 声明 | `registry.ts` | 无 | React / DOM |
| 词法 | `syntax/jsx-flow.ts` | micromark 工具 | mdast / React |
| 桥接 | `syntax/jsx-mdast.ts` | mdast | React |
| 策略 | `policy.ts` | registry | DOM |
| 组装 | `parse.ts` / `blocks.ts` | 以上各层 | React |
| 渲染 | `render.tsx` | unified / React | 浏览器 API（必须 SSR 安全） |
| 编辑器 | `editor/*` | React / CodeMirror | 被主入口导出 |

### 6.3 为什么管线是这个顺序

| 顺序约束 | 原因 |
|---|---|
| `rehypeSourcePositions` 紧跟 `remark-rehype` | 只有此刻 hast 节点还带 mdast 的 `position`；再往后节点可能被替换或移动 |
| `rehypeCodeMeta` 在 `rehypeSlug` 之前 | 它只读 `pre > code` 的文本与 meta，与标题锚点无关，先做更省遍历 |
| `rehypeKatex` 放最后 | 它生成的节点最多，放最后避免被其它插件重复遍历 |

### 6.4 容错与降级（原则：不崩、不吞内容）

| 输入 | 行为 | 诊断 |
|---|---|---|
| 未知组件名 `<Foo>` | 交回内置 HTML flow，按文本显示 | — |
| 未闭合的容器 | 渲染到文末（内容不丢） | `UNCLOSED_TAG` |
| 嵌套超过 3 层 | 超限那一层整块降级为原文文本 | `DEPTH_EXCEEDED` |
| 容器写在列表项内 | 按文本显示（缩进上下文不支持） | — |
| 属性里非法协议 | `href` 降级为不可点击 | `UNSAFE_HREF` |

### 6.5 编辑器架构

```
MarkdownEditor（受控组件）
├─ 真源：CodeMirror 文档本身，不维护第二份模型
├─ 工具栏：纯函数 actions 算新文本 + 选区 → dispatch 最小差异 patch
├─ 预览：同一个 MarkdownRenderer（开启 sourcePositions）
├─ 滚动同步：块级 data-src-start 锚点，双向，120ms 归属锁抑回环
└─ 状态栏：parse().diagnostics
```

三条硬规则（踩过坑，写死）：

1. **所有编辑走 `diffChange` 最小 patch**，禁止 `from: 0, to: len` 全量替换 —— 那会让 CodeMirror 重测整个文档、视口被打回顶部
2. **按钮读编辑器实时 doc / selection**，不读 props 与 state —— `onChange` 回流之前它们是滞后的
3. **块级插入走 `insertBlockAt`**，保证顶格、前后空行、光标落在组件末尾；行内容才用字符级插入

## 七、组件开发规范

### 7.1 新增一个组件：七步

以新增 `<Badge>` 为例。

| 步 | 位置 | 做什么 |
|---|---|---|
| 1 | `registry.ts` | 在 `COMPONENTS` 加声明；若有子项，同时在 `ITEMS` 加子项声明 |
| 2 | `components/badge.tsx` | 实现组件；props 即 registry 里声明的属性名；内容走 `children` |
| 3 | `components/index.ts` | import 并登记到 `mdxComponents`，**键必须与 registry 名完全一致** |
| 4 | `styles/engine.css` | 加 `.prose-site .badge { … }`，用 `@apply` + 主题变量 |
| 5 | `editor/snippets.ts` | 加入 `INSERTABLE_BLOCKS`（可选，加了就必须能在工具栏插入） |
| 6 | 宿主文档 | 同步 `docs/markdown/02-语法规范.md` 的组件表与示例 |
| 7 | 验证 | typecheck + 往返用例 + 渲染用例（见 7.6） |

`registry` 声明示例：

```ts
// 容器
Badge: { name: "Badge", mode: "visual", attrs: ["text", "tone"] },

// 子项
BadgeItem: { name: "BadgeItem", attrs: ["label"] },
```

`components/index.ts` 登记：

```ts
export const mdxComponents = {
  // …
  Badge,
  BadgeItem,
};
```

### 7.2 硬约束

| 约束 | 内容 | 违反后果 |
|---|---|---|
| **语法只增不改**（C1） | 已发布组件的名字、属性名、属性语义永不修改，只能新增 | 老文章渲染崩，且本项目不做数据迁移 |
| 属性只接受字符串与裸布尔 | `<X a="b">` / `<X a>`；不支持 `{…}` 表达式、数组、对象 | 解析降级为文本 |
| 必须可序列化回原样 | `md → AST → md` 逐字一致才算合格 | 保存即变形 |
| 节点必须保留 `position` | 自建节点要自己拼 start/end | 块索引失效、滚动同步错位 |
| 不引用宿主别名 | 包内只用相对路径，禁止 `@/…` | 包无法独立发布 |
| 外链必须过 `isSafeHref` | 属性里的 `href` / `src` 不直接信任 | XSS |
| 样式只写 `engine.css` | 类名带 `.prose-site` 作用域，不依赖宿主 Tailwind 扫描包源码 | 宿主升级后样式丢失 |

### 7.3 自闭合规则

| 允许自闭合 | 说明 |
|---|---|
| `<Image />`、`<File />`、`<Card />` | 叶子节点，无 children |
| 其它容器 | 必须写 `</Name>`；写成 `/>` 会被 `nok` 回退为文本 |

### 7.4 深度计数口径

只统计**容器**，子项不计层：

```
<Tabs><Tab>                      → 1 层
<Tabs><Tab><Cards><Card>         → 2 层（Cards 算第 2 层）
```

上限 `MAX_CONTAINER_DEPTH = 3`，超限那层整块降级为原文，不报错、不丢内容。

### 7.5 命名与样式约定

| 项 | 规则 | 示例 |
|---|---|---|
| 组件名 | PascalCase，渲染层按名字查表 | `<Callout>`（不是 `<callout>`） |
| 属性名 | 全小写或 camelCase | `type`、`defaultOpen` |
| 子项属性 | 对齐 fumadocs：`Tab` 用 `value`，其余用 `title` | `<Tab value="安装">` |
| CSS 类 | 组件名小写连字符，挂在 `.prose-site` 下 | `.prose-site .type-table` |
| 颜色 / 圆角 | 只能用主题变量或 Tailwind 语义类 | `bg-muted`、`text-foreground` |

### 7.6 验收清单

新增或修改组件后逐条确认：

- [ ] `registry` 声明完整（`attrs` / `boolAttrs` / `selfClosing` / `items`）
- [ ] `md → AST → md` 往返逐字一致（自闭合、嵌套各测一次）
- [ ] 渲染产物正确，**无尖括号源码泄漏**
- [ ] 未闭合 / 未知组件 / 超限嵌套三种输入不崩、不吞内容
- [ ] 样式写在 `engine.css`，宿主未新增类名依赖
- [ ] 工具栏插入骨架**插进去即合法**（能被解析为该容器且零诊断）
- [ ] 文档同步：语法规范组件表 + 示例文章对应章节
- [ ] `npm run typecheck` 零错误

## 八、验收

| # | 项 | 判据 |
|---|---|---|
| 1 | 往返 | 每个组件的样例 `md → AST → md` 与原文逐字一致；`normalizeMarkdown()` 幂等 |
| 2 | 容错 | 未闭合、未知标签、无空行且紧贴段落（应正常解析）、超限嵌套 四种情形均不崩、不吞内容 |
| 3 | 对称 | 解析支持的写法，序列化必须能产出；反之亦然 |
| 4 | SSR | 主入口可在 Node 环境直接调用，不需要 DOM |
| 5 | 边界 | 主入口不含编辑器代码；编辑器入口标 `"use client"` |
| 6 | 定位 | 任意容器与子项节点的 `start`/`end` 与原文 offset 精确对应 |

## 九、版本与兼容

对外契约的三条约束写在 [对接契约](./对接契约.md) 第 1 节：**语法只增不改**、**配置只增不改**、**样式随包走**。

破坏其中任何一条，意味着宿主的历史内容无法渲染，且本项目明确不做内容转换，因此视为不可接受的破坏性变更。
