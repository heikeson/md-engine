# 版本更新记录

> @file update.md
> @description `@heikeson/md-engine` 的版本更新记录，倒序累积。每次发版在此一次性写清「更新内容 + 修复内容」，不记录操作步骤。
> @created 2026-10-26 23:37
> @updated 2026-10-27 19:10
> @status 0.3.0 已记录

---

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
