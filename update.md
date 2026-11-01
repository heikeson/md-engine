# 版本更新记录

> @file update.md
> @description `@heikeson/md-engine` 的版本更新记录，倒序累积。每次发版在此一次性写清「更新内容 + 修复内容」，不记录操作步骤。
> @created 2026-10-26 23:37
> @updated 2026-11-01 22:31 记录 0.4.0（含图表 UI 定稿）
> @status 0.4.0 已记录
> @readonly 由维护者（@heikeson）维护，请勿直接编辑；变更请提 issue

---

## 0.4.0 — 2026-11-01

### 更新内容

| 内容 | 说明 |
|---|---|
| 新增 `<Mermaid>` 容器 | 容器体是**原始文本**（`rawBody`），不按 Markdown 解析：`#`、`\|`、`-->`、行首 `-` 全部原样保留，`md → AST → md` 逐字一致 |
| 新增 `/mermaid` 入口 | 交互式图表：进入视口才懒加载、缩放拖动、源码/图表切换、SVG/PNG 导出。主入口零引用，不用图表的页面不承担 mermaid 体积 |
| 图表令牌 | 新增 `--lkes-chart-bg` / `-fg` / `-node` / `-node-border` / `-line` / `-series-1..6`，既有 9 个令牌语义不变 |
| 图表 UI | 卡片式：顶部工具栏（源码视图切换、复制源码、下载 SVG / PNG）+ 右下角药丸缩放条（放大 / 缩小 / 重置）；标题并入工具栏 |
| 编辑器预览支持交互图表 | `EditorConfig.rendererConfig` 整体透传给预览渲染器：传 `{ components: mermaidComponents }` 后，编辑器分屏里的 `<Mermaid>` 也是可缩放/可导出的图表；不传则显示源码骨架。`sourcePositions` 由编辑器强制开启，调用方无需关心 |
| 分屏滚动同步改为区间插值 | 原实现"贴到最近锚点顶部"，源码滚到两块之间时预览会跳到前一个块（常常是标题）。现改为：只保留最内层锚点、`posAtCoords` 取精确字符位置、相邻锚点间线性插值，预览 → 源码用 `lineBlockAt` 直接设 `scrollTop`（不再用 `scrollIntoView` 硬顶） |
| 图表高度默认自适应 | `height` 未指定 / 空串 / `auto` 一律自动高度（图表多高就多高，超长交给页面滚动），不再用固定的 420px 裁切；只有显式给正数才限高 |
| 图表配色（自带两套） | **不读宿主任何 CSS 变量**。亮/暗两套内置在 `styles/mermaid.css` 的组件作用域（`--lkes-chart-*`，祖先带 `.dark` 自动切暗）；换色用 `configureChartTheme({ light, dark })` 或覆盖同名变量，取色优先级「JS 配置 → CSS 变量 → 内置」 |

### 修复内容（暗色）

| 问题 | 修复 |
|---|---|
| 暗色页面下 Accordion 白底、TypeTable 内联块白底、Cards/Steps 白边、Files 文字偏暗 | 根因在令牌层：`--lkes-*` 曾在 `:root` 用 `var(--宿主变量, 兜底)` 定义，`var()` 在声明处替换并固化，`.dark` 之后改宿主变量无效。现改为**包内自带亮/暗两套字面量**（亮在 `:root`，暗在 `.dark` / `[data-theme="dark"]` 祖先作用域），一处改动覆盖全部组件 |
| 2 个诊断码 | `MERMAID_EMPTY`（容器体为空）、`MERMAID_TOO_LARGE`（源码 > 20 KB，改为显示源码） |
| 块索引 | 图表块按 `source` + `reason: "mermaid"` 暴露，编辑器按源码块处理，不做结构化编辑 |
| 主入口新导出 | `MermaidPlaceholder`、`MermaidProps`、`sliceRawBody`、`MERMAID_MAX_BYTES`、`Diagnostic` / `DiagnosticCode` 类型 |

### 修复内容

| 问题 | 修复 |
|---|---|
| 容器体被 Markdown 解析（新增容器引入时） | `rawBody` 容器的子节点在 mdast 装配阶段丢弃，改用 token 原文切片；序列化逐字回写，不转义、不重排 |
| 空容器渲染白屏 | 空源码/超限/渲染失败三种情况都降级为源码块，不出现空白区域 |

### 说明

- 围栏 ` ```mermaid ` 语义不变，仍是代码块，宿主既有的围栏渲染不受影响；两种写法可并存。
- `/mermaid` 的产物**不含** `"use client"` 指令（打包器会剥离模块级指令），须由使用方的**客户端组件**引入。
- 依赖：`mermaid` 为可选 peer（建议 11.x），`dompurify` 为直接依赖（随包安装）。
- 诊断只做"空源码"与"超限"两条：源码里出现字面量 `</Mermaid>` 时行为已由"只认结尾处的闭合标签"约束，无需额外诊断码。

## 0.3.1 — 2026-10-28

### 更新内容

| 内容 | 说明 |
|---|---|
| 行内子项写法 | `<Tab value="npm">npm install</Tab>` 这类同行写法收拢成结构化子项并保留属性；子项内含空行也按跨段落收拢。此前只剩 inline html，父容器取不到 props |
| 新增 `div` 通用容器 | `<div class="…" id="…">` 作为一层可挂样式/锚点的分块，属性透传到 DOM，内容照常按 Markdown 解析 |
| 新增 `INDENT_AS_CODE` 诊断 | 容器内正文被缩进（≥4 空格或 tab）判成代码块时给出提示；**只提示，不改写原文** |
| 序列化保形 | 按原文行距写回换行/空行，行内写法保留行内形态，空容器保持开闭标签各占一行；不再凭空加空行，`#`、`1.` 开头不再被多余转义 |
| 块索引递归 | `VisualBlock.blocks` 递归进 `list` / `listItem` / `blockquote`，列表与引用里的容器可在索引中定位 |
| 自检与开发页 | 新增 `npm run selfcheck`（26 项断言：结构 / 渲染 / 结构等价 / 幂等 / 字节一致 / 诊断 / 块索引）；dev 页加错误边界，渲染异常显示错误而不是白屏 |

### 修复内容

| 问题 | 修复 |
|---|---|
| 白名单外标签的内容整块消失 | `remark-rehype` 默认丢弃 `html` 节点，导致标签与正文一起没渲染。现按契约「按文本显示」：标签成可见字面量、正文照常渲染，不引入 `rehype-raw`、不执行 HTML |
| 代码块里的 `</Name>` 把容器提前关掉 | 统一口径：**行首 `</Name>` 即容器结束**，代码块不豁免（想展示该字样请用行内代码） |
| 嵌套超限后往返不闭合、原文被加反斜杠 | 超限层改为保留节点并标记 `data.degraded`：渲染按源码块、序列化原样输出、块索引按 `source(depth-exceeded)` |
| 行内子项属性含 `>` 时 props 全丢 | 删除第二份开标签正则，统一走 `parseOpenTag` |
| 子项内含空行时子项塌陷成多个 | 折叠粒度由「段落内」提升到「父节点子序列」 |
| dev 页整页白屏 | 缩进探测违反 micromark 的调用契约（未消费即前进、空 token 即 exit），dev 构建下抛断言导致 React 卸载整棵树；两处均已修正 |

### 说明

- 缩进仍不参与排版：容器内正文顶格书写；被当成缩进代码块时由 `INDENT_AS_CODE` 提示，内容不改写。
- 缩进代码块写回为围栏（` ``` `）、CRLF 归一为 LF，属既有规范化，语义不变。

## 0.3.0 — 2026-10-27

### 更新内容

| 内容 | 说明 |
|---|---|
| 样式改为原生 CSS | 全部 `@apply` 改写为原生 CSS，包内样式不再依赖宿主 Tailwind；`styles/engine.css` 拆为 `tokens` / `callout` / `tabs` / `accordion` / `image` / `type-table` / `steps` / `cards` / `files` / `editor` 分片，由 `styles/index.css` 汇总 |
| 样式产物 `dist/styles.css` | 新增 `build:css`（esbuild 打包 `styles/index.css`），`build` 变为 `tsup && build:css`；`styles.css` 入口指向该产物，宿主引入一次即拿到完整样式，不依赖其打包器解析包内相对 `@import` |
| 按组件引入 | 新增 `./styles/*` 导出，可只取一个分片，例如 `@heikeson/md-engine/styles/callout.css` |
| 配色令牌 `--lkes-*` | 收敛为 9 个令牌（`bg` / `fg` / `muted` / `fill` / `border` / `accent` / `ring` / `radius` / `overlay`），默认优先读宿主既有语义变量（`--background` / `--foreground` / `--border` / `--primary` / `--ring` / `--radius` 等），读不到用包内中性色，宿主什么都不配也能正常显示 |
| 编辑器字色 | CodeMirror 行内字色改用 `--lkes-muted`，与正文令牌同源 |

### 修复内容

| 问题 | 修复 |
|---|---|
| 宿主未装 Tailwind 时样式不可用 | 旧版样式是带 `@apply` 的源码，宿主没有 Tailwind 管线会直接编译失败；现改为原生 CSS + 令牌默认值，无需 Tailwind 即可显示 |

### 说明

- 向后兼容：组件名、属性语义、语义类名、四个导出路径均未变，`styles/engine.css` 保留为转发入口，旧引入路径继续可用。
- 样式实现方式调整，视觉以同一套语义类与令牌为准；宿主既有的类级覆盖继续有效。

---

## 0.2.1 — 2026-10-26

### 更新内容

| 内容 | 说明 |
|---|---|
| README 重写 | 改为「安装 / 快速开始 / 容器语法 / API / 设计要点 / 开发 / 兼容」六段结构；补充样式作用域与自定义渲染的说明，对外表述统一为中性的独立库描述 |
| `AGENT.md` | 新增 AI 协作者约束入口：发布规范收敛到 `docs/构建与发布.md` 第七节，明确对接契约 C1/C2/C3、入口即契约与禁止动作清单 |

### 修复内容

| 问题 | 修复 |
|---|---|
| 文档残留下游项目名称 | README 与 `docs/项目结构.md` 移除下游项目名称，版本口径统一对齐 tag |

### 说明

- 本版不含代码变更：`dist/` 产物与 `0.2.0` 行为一致，差异仅在随包文档与元数据，无破坏性变更。

---

## 0.2.0 — 2026-10-26

### 新增内容

| 能力 | 说明 |
|---|---|
| `Callout` 的 `icon` 属性 | 可传字符串（emoji / 短文本）或 React 节点；不写 `title` 时图标与正文同行，且不补默认标签 |
| `File` 的 `icon` 属性 | 按扩展名映射 12 类图标（code / text / data / image / video / audio / archive / sheet / script / lock / key / font）；可按类别键或扩展名覆盖，未命中回退自绘 `FileIcon`，文件行始终有图标 |
| 文件夹图标开合双形态 | 闭合 / 敞口两组图形随 `details[open]` 互斥显示，纯 CSS 驱动，保持零客户端 JS 与 SSR 首帧正确 |
| 诊断项 `UNSAFE_HREF` / `UNKNOWN_TAG` | 收集链接与图片的非法协议、未注册标签；`hast` 层统一 URL 闸门（`rehype-safe-urls`）在渲染末端生效，宿主覆盖组件也绕不过 |
| `rehype-safe-anchors` | 还原锚点的 percent-encoding，使 `href` 与 `rehype-slug` 生成的 `id` 字面一致，中文标题跳转不再失效 |
| 本地开发渲染环境 | Vite playground（5180）+ fixtures 样例 + 静态快照与往返自检脚本；仅供开发，不进发布包 |

### 修复内容

| 问题 | 修复 |
|---|---|
| 数学公式往返被转义 | parse / serialize 对称接入 math 扩展，公式原样保留；`mdast-util-math`、`micromark-extension-math` 升为直接依赖 |
| 未闭合容器序列化补出多余闭合标签 | `collectUnclosed` 回写 `data.closed=false`，序列化据此不补闭合标签；同时补充诊断汇总输出与容错用例 |
| Tabs 首个选项紧贴左边框 | 头部内边距由 `px-0` 改为 `px-3`，文字左边界与正文 `p-4` 对齐 |

### 行为口径调整

- **URL 校验放宽**：放行相对路径与 `//host`，仍拒绝非白名单 scheme（`javascript:`、`data:` 等）。
- **新增直接依赖**：`mdast-util-math`、`micromark-extension-math`（此前仅经 `remark-math` 传递引入），宿主 `npm install` 自动安装，无需手工处理。

### 升级提示

- 无破坏性变更：已发布组件的名字与属性语义未改，语法只增不改，存量文章无需迁移。
- 宿主升级到 `^0.2.0` 并 `npm install` 即可获得上述全部能力；引擎 `dist/` 已重新构建，样式仍随包走 `styles/engine.css`。

---

## 0.1.0 — 2026-10-25

首次发布到 npm。

- 包形态：`tsup` 产出 `dist/`（主入口 / `editor` / `components` 三个入口，含 `.d.ts`），源码不入包；样式保留 `@apply` 源码，由宿主 Tailwind 4 管线处理。
- 基础能力：尖括号容器语法解析、渲染、序列化与格式化；`Callout`、`Accordion`、`Cards` 等容器组件与组件属性表。
- 内容保证：`md → AST → md` 逐字一致；节点保留 `position`，支持块索引与滚动同步。
