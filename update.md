# 版本更新记录

> @file update.md
> @description `@heikeson/md-engine` 的版本更新记录，倒序累积。每次发版在此一次性写清「更新内容 + 修复内容」，不记录操作步骤。GitHub Release 正文由 `.github/workflows/release.yml` 从本文件同名版本段切出，故版本标题必须是 `## vX.Y.Z — 日期`。
> @created 2026-10-26 23:37
> @updated 2026-11-01 22:31 记录 0.4.0（含图表 UI 定稿）
> @updated 2026-11-02 20:50 记录 0.5.0（国际化、无障碍与性能增强、组件自洽外观）
> @updated 2026-11-02 21:40 记录 0.5.1（TypeItem 自闭合、类型表行丢失修复）
> @updated 2026-11-02 23:00 记录未发布的图表交互修复（整画布拖动、缩放定位）
> @updated 2026-11-02 23:14 发版 0.5.2：图表交互修复定稿（整画布拖动、初始适配居中、双指捏合、手势期直写 DOM）
> @updated 2026-11-05 22:51 标题统一为 `## vX.Y.Z — 日期`；各版本补「一句话摘要」「升级与使用」「完整变更」，供 release.yml 抽取 Release 正文
> @updated 2026-11-09 10:20 记录 0.5.3（管线收敛、诊断跳过块索引、处理器复用、katex 依赖声明）
> @note 「升级与使用」按 npm 包口径写四项：依赖 / 配置 / 产物 / 回滚。数据库项不适用（本包不落库），镜像项由「产物」承担（`dist/` 与 npm 版本），故均不单列。
> @status 0.5.3 已记录
> @readonly 由维护者（@heikeson）维护，请勿直接编辑；变更请提 issue

---

## v0.5.3 — 2026-11-09

**一句话摘要**：内部重构版：解析与渲染的扩展、后处理收敛到同一处声明，编辑器诊断跳过块索引，处理器按插件引用复用，并补上 `katex` 依赖声明。升级只需改版本号，无需改代码。

### 修复内容

| 问题 | 修复 |
|---|---|
| pnpm 等严格 `node_modules` 布局下，产物里的 `import "katex"` 可能解析失败 | `katex` 补进 `dependencies`（`^0.16.0`），不再依赖 `rehype-katex` 的私有依赖树 |
| 解析与渲染各写一套扩展与后处理，只靠注释维持「同一口径」 | 新增 `pipeline.ts`：micromark / mdast 扩展、remark 插件、`applySourceTransforms`（提升块级公式 → 深度裁剪 → 图表判定）统一声明，两条管线共用 |
| 编辑器每个输入批次解析两次，其中一次只为取诊断却做了全量块索引 | 新增 `diagnose()` 与 `parse(md, { blocks: false })`，编辑器改走只取诊断的路径 |
| 列表页每个 `<MarkdownRenderer>` 实例各建一条 unified 管线 | 处理器按「插件引用 + `sourcePositions`」缓存复用；宿主传入模块级常量插件数组时同样命中 |
| 每个尖括号块都重新编译一次闭标签正则 | 闭标签正则按「名字 + 位置」缓存；策略层的闭合判定与序列化的结尾判定共用同一份模式 |
| 6 处手写 mdast 递归、多处 `(node as { children? })` 断言 | 收敛到 `walkMdast`；`enforceMaxDepth` 与行内折叠保留自身递归（需重建子序列） |
| 类名靠模板串拼接，`cn()` 只有两个组件在用 | `callout` / `image` / `acc-item` 改走 `cn()`，输出与原来逐字一致（仅去掉尾随空格） |
| 5 个组件缺文件头，`"use client"` 位置不统一 | 补齐 `@file` / `@description`，指令统一放在文件头注释之后 |

### 更新内容

| 内容 | 说明 |
|---|---|
| `diagnose(md, options?)` | 主入口新增导出，等价于 `parse(md, { blocks: false }).diagnostics` |
| `ParseOptions.blocks` | 新增选项，默认 `true`；传 `false` 时不提取块索引，`blocks` 返回空数组 |
| 处理器缓存 | 无宿主插件时全局复用两条（开 / 关 `sourcePositions`）；宿主插件数组按引用分桶。插件数组须视为不可变值，原地改内容不会让缓存失效 |
| 依赖说明 | README 新增「依赖约定」：`katex` 与 `@types/hast`、`@types/mdast` 放在 `dependencies` 的原因 |

### 升级与使用

- **依赖**：`npm install @heikeson/md-engine@0.5.3`；新增直接依赖 `katex@^0.16.0`，`mermaid` 仍是可选 peer（11.x）。
- **配置**：无破坏性变更；`parse` 的返回值、诊断码与 `MarkdownRenderer` 的 props 均不变，新增选项都有默认值。
- **产物**：`dist/` 与 `dist/styles.css` 重新构建，宿主需重新构建一次。
- **回滚**：把依赖改回 `0.5.2` 即可，无数据迁移、无 API 变化。

**Full Changelog**: https://github.com/heikeson/md-engine/compare/v0.5.2...v0.5.3

---

## v0.5.2 — 2026-11-02

**一句话摘要**：修复 `<Mermaid>` 图表交互——整块画布可拖动、初始按容器自动适配居中、触屏支持双指捏合，手势期间直接写 DOM 不再逐帧重渲染。升级只需改版本号，无需改代码。

### 修复内容

| 问题 | 修复 |
|---|---|
| `<Mermaid>` 只有图片本身能拖，图表区空白处按住无反应 | 新增 `.lkes-mermaid-viewport` 视口层作为手势面，铺满整块图表区；变换层改为绝对定位在视口左上角 |
| 缩放时图往左上角跑；按钮缩放锚点不在视觉中心 | 变换层按内容自然尺寸渲染 + `transform-origin: 0 0`；缩放锚点统一换算到视口坐标系，按钮缩放以视口中心为锚点 |
| 大图初始被裁、没有初始适配 | 初始按容器宽（给了 `height` 时兼顾客器高）等比适配并居中；`height` 未指定时图表区高度取初始适配高度，不产生整屏空白 |
| 拖动无约束，可以把图拖丢 | 拖动期允许越界（余量 1 个视口尺寸），松手后 200ms easeOut 回弹到最近合法位置；位移 ≤ 5px 视为点击，不触发回弹 |
| 图表区与卡片之间有一条 `1rem` 空白带，画布没贴住容器 | 图表区去掉内边距，画布（视口）边界与卡片边界重合；内边距移到源码视图，源码态限高改由 `<pre>` 自身承担 |
| 放大后图形发糊 | 变换层去掉 `will-change: transform`（合成层会把 SVG 按固定倍率栅格化后再放大）；变换串固定为 2D `translate + scale` 并去掉倍率浮点尾巴，改为每帧按真实倍率重绘矢量 |

### 更新内容

| 内容 | 说明 |
|---|---|
| 图表自然尺寸解析 | `use-render` 新增 `readSvgSize`（读根 `<svg>` 的 `viewBox` / 宽高），`RenderResult` 新增 `size` 字段；解析不到时图表降级为静态显示，不白屏 |
| 触屏手势 | 新增双指捏合缩放（以两指中点为锚点，中点移动带动平移）；多指不再互相顶掉拖动会话；`touch-action` 改为 `pan-y`，图表区竖滑仍能滚页面 |
| 拖动跟手与动画 | 拖动按下即跟手（5px 阈值只用于判定点击/回弹）；按钮缩放与双击复位改为 200ms easeOut 缓动 |
| 手势性能 | 变换层 `transform` 由 `use-zoom` 直接写 DOM，手势期间不再逐帧触发 React 重新渲染；文本选择锁改为仅在拖动期间生效 |
| 样式 | 新增 `.lkes-mermaid-viewport`；`.lkes-mermaid-canvas` 改绝对定位 + 自然尺寸，mermaid 内联的 `max-width` 由包内 CSS 接管 |

### 升级与使用

- **依赖**：`npm install @heikeson/md-engine@0.5.2`；`mermaid` 仍是可选 peer（建议 11.x），版本要求未变。
- **配置**：无新增配置项；`<Mermaid>` 的 `height` 语义不变（不写 / `auto` 仍为自适应）。
- **产物**：`dist/` 与 `dist/styles.css` 重新构建（新增 `.lkes-mermaid-viewport` 规则），宿主需重新构建一次。
- **回滚**：把依赖改回 `0.5.1` 即可，无数据迁移、无 API 变化。

**Full Changelog**: https://github.com/heikeson/md-engine/compare/v0.5.1...v0.5.2

---

## v0.5.1 — 2026-11-02

**一句话摘要**：`<TypeItem>` 支持自闭合写法，修复 `<TypeTable>` 只渲染表头、数据行整块丢失。升级只需改版本号。

### 更新内容

| 内容 | 说明 |
|---|---|
| `TypeItem` 支持自闭合写法（细节优化） | `<TypeTable>` 的行可写成 `<TypeItem name="…" type="…" default="…" />`，只给属性、说明列留空；与 `Card` / `File` 用同一套自闭合机制，`required` 布尔属性照常生效。原有 `<TypeItem>正文</TypeItem>` 块形态不变 |

### 修复内容

| 问题 | 修复 |
|---|---|
| `<TypeTable>` 只渲染出表头，数据行整块丢失且无诊断 | `ITEMS.TypeItem` 未声明 `selfClosing`，`<TypeItem … />` 退回 CommonMark 的 HTML 块，被渲染管线当文本丢弃。补上声明后按容器子项正常解析，块索引的 `items` 也如实给出每一行 |
| 站点文档 8 张属性表空白 | 中英文 `syntax` / `editor` 四份文档均使用自闭合写法，随上一条一并恢复，无需改内容 |

### 升级与使用

- **依赖**：`npm install @heikeson/md-engine@0.5.1`。
- **配置**：无新增配置项；自闭合写法属语法新增（C1 只增不改），原有块形态照旧可用。
- **产物**：`dist/` 与 `dist/styles.css` 重新构建，宿主需重新构建一次。
- **回滚**：把依赖改回 `0.5.0` 即可；已用自闭合写法写的文章在旧版本下会退化成 HTML 块，回滚前请核对正文。

**Full Changelog**: https://github.com/heikeson/md-engine/compare/v0.5.0...v0.5.1

---

## v0.5.0 — 2026-11-02

**一句话摘要**：新增国际化（i18n）与 RTL 支持、编辑器快捷键与性能优化、无障碍补强；组件外观自洽，宿主不再写样式补丁。不传 `locale` 的存量代码行为不变（默认 `zh-CN`）。

### 更新内容

| 内容 | 说明 |
|---|---|
| 新增国际化（i18n） | `RenderConfig` 增加 `locale` / `messages` / `fallbackLocale`；解析链 `messages → 内置语言包[locale] → fallbackLocale → zh-CN`。文案改用 ICU MessageFormat（`intl-messageformat`），复数按 CLDR 规则处理 |
| 根级 `MdEngineProvider` | 应用根节点包一层即全局生效：子树里所有 `MarkdownRenderer` / `MarkdownEditor` 自动继承语言；`useLocale()` 读取当前语言 |
| 内置语言包 | `zh-CN` / `en-US` 以 `./locales/zh-CN`、`./locales/en-US` 子路径导出；主入口另导出 `zhCN` / `enUS` / `BUILTIN_LOCALES` |
| 语言工具链 | 新增 `formatMessage` / `useMessage` / `resolveLocale` / `matchLocale` / `normalizeLocale` / `detectLocale` / `isRTL` / `languageOf` / `localeCandidates` / `supportsIntlLocale` / `toRouteSegment` / `fromRouteSegment` / `createLocaleStorage` |
| 文案表 `UIText` | 包内固定文案（aria-label、图表工具栏、编辑器工具栏/状态栏）集中到 `UIText`，键**只增不改**；主入口导出 `defaultUIText` / `useUIText` / `mergeUIText`。`config.text` 保留为 `messages` 别名 |
| 诊断文案外置 | `Diagnostic` 新增 `params`，文案由 `diagnosticTextKey` / `formatDiagnostic` 按语言取，领域层不再内联中文 |
| 编辑器快捷键 | `Mod+B/I/E` 粗体/斜体/行内码、`Mod+Shift+S` 删除线、`Mod+1` 二级标题、`Mod+Shift+Q` 引用、`Mod+Shift+L` 列表；与工具栏按钮共用同一组纯函数 |
| 编辑器 `config.placeholder` | 接线并改走 CodeMirror `Compartment` 热替换，切语言不再重建编辑器 |
| RTL 支持 | `styles/` 18 处物理方向属性迁移为逻辑属性，`isRTL` 决定书写方向 |
| 渲染配置稳定化 | `components` / `remarkPlugins` / `rehypePlugins` / 文案补丁做浅比较，内联配置不再击穿管线缓存 |
| 编辑器性能 | 预览与诊断改用 `useDeferredValue`，长文输入不再每键全量解析；mermaid 渲染缓存加 LRU 上限（32） |
| 无障碍 | Tabs 补齐 WAI-ARIA Tabs：tab/panel id 关联、←/→ 循环与 Home/End、roving tabindex；Image 放大遮罩可聚焦，Enter/Space 关闭 |
| 组件外观自洽 | 链接形态的 `Card`（`a.card`）与文件树文件名（`a.files-name`）自带颜色与 `text-decoration: none`，不再继承宿主的链接色/下划线；`.card-title` 改用 `--lkes-fg` 令牌。宿主无需再写样式补丁 |
| 新诊断 `DUPLICATE_ID` | `div id` 与标题锚点或彼此重复时提示（只提示不改写），随 i18n 拆为 `DUPLICATE_ID_ANCHOR` / `DUPLICATE_ID_DIV` |
| 工程化 | 新增 CI 门禁（typecheck + build + selfcheck + pack）与 changesets；`build` 改为 `clean-dist → tsup → build:css`；新增依赖 `github-slugger`（重复 id 诊断）与 `intl-messageformat`（ICU） |

### 修复内容

| 问题 | 修复 |
|---|---|
| 切语言丢光标与撤销栈 | 编辑器重建依赖收敛，placeholder 走 `Compartment` 热替换，切语言不再重挂载 |
| `tsup` 自动 clean 与 d.ts 竞争 | 移除 `tsup` 的 `clean`，改由 `dev/clean-dist.mjs` 在构建前统一清理 |

### 升级与使用

- **依赖**：`npm install @heikeson/md-engine@0.5.0`；新增直接依赖 `github-slugger`、`intl-messageformat`，随包安装，无需手工处理；`mermaid` 仍为可选 peer。
- **配置**：新增可选 `locale` / `messages` / `fallbackLocale` 与编辑器 `placeholder`，全部带默认值（缺省等于原有 `zh-CN` 文案）；要换语言在根节点包一层 `MdEngineProvider`。
- **产物**：`dist/` 与 `dist/styles.css` 重新构建；新增 `./locales/zh-CN`、`./locales/en-US` 两个子路径导出，宿主需重新构建一次。
- **回滚**：把依赖改回 `0.4.0` 即可；仅用到默认中文文案的项目无需改动代码，自建 `messages` 补丁的项目回滚后失效。

**Full Changelog**: https://github.com/heikeson/md-engine/compare/v0.4.0...v0.5.0

---

## v0.4.0 — 2026-11-01

**一句话摘要**：新增 `<Mermaid>` 容器与 `/mermaid` 交互图表入口（懒加载、缩放拖动、SVG/PNG 导出），图表配色改为包内自带亮/暗两套。不用图表的页面可完全忽略，主入口零引用。

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

### 升级与使用

- **依赖**：`npm install @heikeson/md-engine@0.4.0`；`mermaid` 升为可选 peer（建议 11.x），`dompurify` 为直接依赖；不用图表则无需安装 `mermaid`。
- **配置**：无破坏性配置变更；编辑器要显示交互图表需传 `rendererConfig: { components: mermaidComponents }`，图表换色用 `configureChartTheme({ light, dark })`。
- **产物**：`dist/` 与 `dist/styles.css` 重新构建，新增 `/mermaid` 入口产物；该入口不含 `"use client"`，须由宿主的客户端组件引入。
- **回滚**：把依赖改回 `0.3.1` 即可；已写 `<Mermaid>` 的文章在旧版本下会被当成未知标签按文本显示，回滚前请先摘掉或保留围栏写法。

**Full Changelog**: https://github.com/heikeson/md-engine/compare/v0.3.1...v0.4.0

---

## v0.3.1 — 2026-10-28

**一句话摘要**：新增 `div` 通用容器与行内子项写法；修复白名单外标签内容整块消失、嵌套超限往返不闭合等解析问题。升级只需改版本号。

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

### 升级与使用

- **依赖**：`npm install @heikeson/md-engine@0.3.1`，依赖清单无变化。
- **配置**：无新增配置项；新增诊断码 `INDENT_AS_CODE`（只提示不改写，可按需在诊断面板过滤）。
- **产物**：`dist/` 与 `dist/styles.css` 重新构建；`npm run selfcheck` 仅供开发自检，不进发布包。
- **回滚**：把依赖改回 `0.3.0` 即可；已用 `<div>` 容器或行内子项写法的文章在旧版本下会退化为文本/HTML 块，回滚前请核对正文。

**Full Changelog**: https://github.com/heikeson/md-engine/compare/v0.3.0...v0.3.1

---

## v0.3.0 — 2026-10-27

**一句话摘要**：样式改为原生 CSS 并产出 `dist/styles.css`，宿主不装 Tailwind 也能正常显示；配色收敛为 9 个 `--lkes-*` 令牌。升级后宿主改引 `styles.css` 即可，组件与属性未变。

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

### 升级与使用

- **依赖**：`npm install @heikeson/md-engine@0.3.0`，依赖清单无变化。
- **配置**：无新增配置项；配色走 9 个 `--lkes-*` 令牌，不配也有默认值。宿主没装 Tailwind 时不再报错，装了也可继续用同名变量覆盖。
- **产物**：`dist/styles.css` 为新生效的样式入口，宿主只需引入一次 `@heikeson/md-engine/styles.css`；旧 `styles/engine.css` 保留为转发入口，无需立刻改。
- **回滚**：把依赖改回 `0.2.1` 即可；回滚后样式需宿主自带 Tailwind 4 管线，否则样式失效。

**Full Changelog**: https://github.com/heikeson/md-engine/compare/v0.2.1...v0.3.0

---

## v0.2.1 — 2026-10-26

**一句话摘要**：仅文档与元数据：重写 README、新增 `AGENT.md`，`dist/` 与 `0.2.0` 行为一致。可不升级。

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

### 升级与使用

- **依赖**：无代码变更，不必升级；要同步文档执行 `npm install @heikeson/md-engine@0.2.1` 即可。
- **配置**：无。
- **产物**：`dist/` 与 `0.2.0` 完全一致，随包文档与元数据更新。
- **回滚**：无必要（`0.2.0` 行为相同）。

**Full Changelog**: https://github.com/heikeson/md-engine/compare/v0.2.0...v0.2.1

---

## v0.2.0 — 2026-10-26

**一句话摘要**：新增 `Callout` / `File` 图标能力、文件夹图标开合双形态、`UNSAFE_HREF` / `UNKNOWN_TAG` 诊断与末端的链接闸门；数学公式往返不再被转义。无破坏性变更。

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

### 升级与使用

- **依赖**：`npm install @heikeson/md-engine@0.2.0`；`mdast-util-math`、`micromark-extension-math` 升为直接依赖，随包自动安装。
- **配置**：无新增配置项；URL 校验放宽（放行相对路径与 `//host`），仍拒绝 `javascript:`、`data:` 等非白名单 scheme。
- **产物**：`dist/` 与样式产物重新构建，宿主需重新构建一次。
- **回滚**：把依赖改回 `0.1.0` 即可，无数据迁移；已经使用 `icon` 属性或 `div` 之外新诊断的文章需摘掉相关用法。

**Full Changelog**: https://github.com/heikeson/md-engine/compare/v0.1.0...v0.2.0

---

## v0.1.0 — 2026-10-25

**一句话摘要**：首次发布到 npm，提供容器语法解析、渲染、序列化与格式化，`dist/` 三入口 + `.d.ts`，源码不入包。

首次发布到 npm。

- 包形态：`tsup` 产出 `dist/`（主入口 / `editor` / `components` 三个入口，含 `.d.ts`），源码不入包；样式保留 `@apply` 源码，由宿主 Tailwind 4 管线处理。
- 基础能力：尖括号容器语法解析、渲染、序列化与格式化；`Callout`、`Accordion`、`Cards` 等容器组件与组件属性表。
- 内容保证：`md → AST → md` 逐字一致；节点保留 `position`，支持块索引与滚动同步。

### 升级与使用

- **依赖**：`npm install @heikeson/md-engine@0.1.0`；`react` / `react-dom` 为 peer（>=19）。
- **配置**：无；样式为 `@apply` 源码，需宿主自带 Tailwind 4 管线。
- **产物**：`dist/` 三入口（主入口 / `editor` / `components`）含 `.d.ts`，源码不入包。
- **回滚**：不适用（首发版本）。

**Full Changelog**：首发版本，无上一 tag 可对比。
