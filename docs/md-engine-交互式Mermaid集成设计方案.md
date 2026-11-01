# md-engine 交互式 Mermaid 图表集成设计方案

> @file 交互式Mermaid集成设计方案.md
> @description 为 `@heikeson/md-engine` 增加 `<Mermaid>` 一等容器与 `/mermaid` 交互入口的完整方案，
>   含语法层（rawBody 两条路线）、渲染隔离、客户端交互、主题令牌、导出、与宿主现有围栏方案的共存迁移。
> 创建时间：2026-11-01 20:53
> 更新时间：2026-11-01 22:37（v7 图表配色全部改为跟随宿主语义变量；暗色判定改为最近 `.dark` 祖先 + 元素级取色；标题并入工具栏；修复 mermaid 注释写法与缩放重锚）
> 状态：已实施（M0–M5）·M6 待发布（放行语："可以，按文档开始开发" / 2026-11-01 21:07）
> 适用范围：`@heikeson/md-engine` **0.3.1 → 0.4.0**（一次性发布，M0–M6 全部完成后）
> 关联仓库：`blog-heikeson2026`（宿主，M6 阶段收敛，范围见 9.6）

---

## 〇、前提与边界

本文基于以下**已核实事实**（逐条对应到代码位置）：

| 事实 | 出处 | 对本方案的约束 |
|------|------|----------------|
| 入口：主入口渲染、`/editor` 独立、`/components` 独立、CSS 走 `styles.css` | `package.json` `exports` | 交互式图表必须**再开一个 `./mermaid` 入口** |
| 纯逻辑层（registry / policy / parse / serialize / format）不依赖 React 与 DOM | `src/policy.ts` 文件头、依赖树 | mermaid 的所有 DOM 操作只能落在新入口 |
| 容器名表是唯一事实来源，词法层直接读它 | `src/syntax/jsx-flow.ts:41`（`COMPONENTS`/`ITEMS`） | **新容器只需在 `registry.ts` 加一项**，词法层无需单独改名字表 |
| 渲染按 tagName 直投 components 映射 | `src/render.tsx:165`（`{...mdxComponents, ...overrides}`） | 占位骨架与使用方覆写天然可行 |
| 现有容器 **9 个**（Callout / Tabs / Steps / Cards / Accordion / Files / TypeTable / Image / div） | `src/registry.ts:65-92` | 新容器为第 10 项，`div` 也在白名单内 |
| 样式为原生 CSS + **9 个** `--lkes-*` 令牌 | `styles/tokens.css` | 图表配色只能追加令牌，不得引入 Tailwind |
| CSS 产物由 `build:css` 单文件打包 | `package.json` `build:css`（bundle `styles/index.css`） | 新增 `styles/mermaid.css` **必须被 `index.css` import**，否则不进产物 |
| 已有诊断码机制与降级策略（`degradedText` 原样回吐） | `src/policy.ts:13-31`、`src/syntax/jsx-mdast.ts:193` | 新增语法必须给诊断码，失败不吞内容 |
| 宿主已用 ` ```mermaid ` 围栏渲染图表 | `blog-heikeson2026/components/site/article/code-block.tsx:163-170` | **见第九节**：必须处理双轨共存与迁移 |
| 宿主 `securityLevel` 已因安全审计收紧为 `strict` | `blog-heikeson2026/components/site/mdx/mermaid.constants.ts:262`（审计 4.4） | 本文档不得回退为 `loose` |

> **三条铁律不变**：语法只增不改、配置只增不改、样式随包走。
> **工程约束澄清**：所谓「单文件 ≤ 200 行」在仓库中已非硬约束（`policy.ts` 211 行、`jsx-flow.ts` 574 行、
> `MarkdownEditor.tsx` 286 行、`files-icons.tsx` 289 行）。本文档的行数预估是**工作量参考**，不作为验收项；
> 真正的硬约束是「单函数 ≤ 40 行」与文件头四段注释。

---

## 一、目标与非目标

### 1.1 目标

1. **语法一等公民**：`<Mermaid>` 与现有 9 个容器同等地位——可解析、可渲染、可序列化、可定位、可往返。
2. **SSR 安全**：主入口在 Node 端渲染时不触碰 DOM、不加载 mermaid。
3. **渐进增强**：无 JS / 未装交互入口时，读者至少能看到源码，而不是空白。
4. **包体可控**：不使用图表的页面不承担 mermaid 体积。
5. **主题可接**：配色通过 `--lkes-*` 令牌接入，跟随使用方的亮暗切换。
6. **与围栏方案共存**：不破坏宿主已上线的 ` ```mermaid ` 渲染，提供可执行的迁移路径（第九节）。

### 1.2 非目标

- 不做 mermaid 语法高亮/自动补全（编辑器只提供片段插入）
- 不做服务端渲染图表（mermaid 需要 DOM，纳入会破坏"纯逻辑层不碰 DOM"）
- 不接管使用方的主题系统（引擎只暴露 `--lkes-chart-*` 令牌，取值由宿主决定；宿主侧对接见 9.4）
- **不废弃 mermaid 围栏**：围栏的代码块语义不变，共存期由宿主决定优先级（R1）
- 不内置图表类型的裁剪开关（由 mermaid 自身能力决定）

---

## 二、语法设计

### 2.1 采用容器式，而非属性式或围栏式

```md
<Mermaid title="请求流程" height="480">
graph TD
  A[开始] --> B{判断}
  B -->|是| C[执行]
</Mermaid>
```

| 方案 | 往返无损 | 与现有语法一致性 | 结论 |
|------|----------|------------------|------|
| A. 容器体承载源码（推荐） | 原文逐字保留，最稳 | 与 9 个容器完全同构 | **采用** |
| B. `<Mermaid chart="…" />` 属性式 | 需要转义换行，容易破坏逐字一致 | 属性只支持字符串，长文本不可读 | 否 |
| C. ` ```mermaid ` 围栏 | 需改 blocks 索引与围栏语义 | 围栏在 md-engine 中语义是"代码块"，复用会冲突；**且宿主已用它渲染，改语义即破坏存量** | 否（但保留共存） |

### 2.2 属性与子项

| 属性 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `title` | 字符串 | 无 | 图表标题，渲染为 `<figcaption>` |
| `height` | 数字字符串 | `420` | 视口高度上限，正数校验后取用，非法值回落默认 |

无子项。容器体整体视为**原始文本**，不做行内 Markdown 与容器嵌套解析（见 2.4）。
`selfClosing` 不适用：`<Mermaid />` 不是"叶子组件"，而是"空源码容器 + 诊断"（见 2.5）。

### 2.3 书写约束（延续既有风格）

- 必须顶格书写，不可缩进
- 嵌套深度按容器规则计算（计入 `MAX_CONTAINER_DEPTH = 3`），但**容器体内不再解析任何标签**
- 允许 `<Mermaid />` 自闭合（等价于空源码 + `MERMAID_EMPTY` 诊断）
- 源码上限 20 KB，超限不渲染并给诊断

### 2.4 ★修订：`rawBody` 的两条实现路线（M0 原型验证后定案）

原稿写「`policy.ts` 见到 `rawBody` 时跳过 child 解析」——**这是错的**。`policy.ts` 是解析完成后的
mdast 后处理（`enforceMaxDepth` / `collectUnclosed`），此时容器体早已在词法层被当作 Markdown chunk
嚼碎、在 `jsx-mdast.ts:134` 装配成 children。要"不解析"，只能在词法层或 mdast 装配层拦。

两条路线并列如下，M1 开工前用 **M0 原型**验证后二选一。

#### 路线 A：词法层新增 rawBody 分支（正确性最高）

- **落点**：`src/syntax/jsx-flow.ts`（574 行，含 lazy / non-lazy / indent 三套状态机）
- **做法**：`contentStart` 判定容器名带 `rawBody` 时，转入一组"只逐行吃到行首 `</Mermaid>`"的状态，
  产出单个 `jsxBlockRawBody` token；`jsx-mdast.ts` 在 `exitBlock` 读该 token 写入 `data.rawBody`，`children` 保持空
- **成本**：`jsx-flow.ts` +80~120 行、`jsx-mdast.ts` +20 行、registry +8 行
- **风险**：全仓最敏感文件，三套状态机共用 `contentContinue`，改错会波及现有 9 个容器
- **收益**：容器体**彻底不进入 Markdown 解析**，`#`、`|`、`-->`、`<br/>`、行首 `-` 全部安全；往返天然逐字一致
- **影响面**：**解析层**（`parse.ts` / `render.tsx` / 编辑器全链路），不只渲染

#### 路线 B：mdast 装配层切片（成本最低）

- **落点**：`src/syntax/jsx-mdast.ts`（`exitBlock`）+ `src/registry.ts`
- **做法**：词法不动；`exitBlock` 时若节点为 rawBody 容器，按 `position` 从 source 切片取原文，
  写入 `data.rawBody`，并**清空**已生成的 `children`
- **成本**：`jsx-mdast.ts` +25 行、registry +8 行
- **风险**：容器体仍被词法消费，存在三个必须验证的点
  1. 行首 `-` / `#` 会生成子节点（随后被丢弃）——只浪费 CPU，不泄漏内容
  2. 行首 `-->` 是否被解析为 setext 标题/thematic break，导致 `position.end` 与实际闭合位置不符
  3. 字面量 `</Mermaid>` 会在**词法阶段**就截断节点，mdast 层拿不到完整区间（见 2.5）
- **收益**：改动小、零风险外溢到其他容器；用户判断「一般来说只影响渲染层面」在**产物语义上成立**
- **前提**：源码中不出现字面量 `</Mermaid>`

#### 判定标准（M0 必须给出的三个断言）

| # | 断言 | 通过条件 |
|---|------|----------|
| 1 | 行首标记不污染切片 | 源码含 `# 标题`、`- 项`、`---`、`-->` 时，`data.rawBody` 与原文逐字相等 |
| 2 | 截断可诊断 | 源码含字面量 `</Mermaid>` 时，能得到 `MERMAID_CLOSED_EARLY` 且后续内容按普通 Markdown 继续 |
| 3 | 不回归 | 现有 9 个容器的 `selfcheck` + `snapshot` 全部通过 |

> **定案规则**：B 三条全过则用 B（省 100 行、风险最小）；任一条不过则走 A。
> 无论走哪条，`registry.ts` 的 `rawBody?: boolean` 字段形态一致，上层（policy / serialize / render）
> 代码完全相同 —— 这是把路线选择隔离在语法层的设计目的。

#### ★M0 结论（2026-11-01 21:10）：**采用路线 B**

验证脚本 `dev/m0-rawbody.mjs`，12 项断言全部通过；`dev/selfcheck.mjs` 26 项全部通过（无回归）。

| 断言 | 结果 | 关键实测 |
|------|------|----------|
| 1 行首标记不污染切片 | ✅ | `#`、`-`、`---`、`-->`、`B -->\|是\|` 全部原样进 `data.rawBody`；子节点为空；属性照常解析 |
| 1' 往返 | ✅ | 逐字一致 + 幂等（文末换行差异归一后比较） |
| 2 截断可诊断 | ✅ | **行内** `</Mermaid>` 字面量不截断（只认结尾处的闭合标签）；**顶格**出现即闭合，后续正文未被吞 |
| 2' 自闭合 / 未闭合 | ✅ | `<Mermaid />` → `rawBody === ""`（须在 registry 加 `selfClosing: true`，否则被当未知 HTML）；未闭合保留全部源码且不擅自补闭合 |
| 3 不回归 | ✅ | selfcheck 26 项全过 |

**实现要点（与预估的两处偏差）**

1. 落点比预想更省：`jsx-mdast.ts` 的 `exitBlock` 能直接用 `this.sliceSerialize(token)` 拿到**块原文**，
   不需要 `source` 参数，也不必改 `jsx-flow.ts`。新增两个纯函数 `openTagEnd` / `sliceRawBody`（共约 35 行）。
2. `<Mermaid />` 自闭合必须配 `selfClosing: true`，否则 `isSelfCloseAllowed` 返回 false，`<Mermaid />`
   会退化成未知 HTML 并按文本显示。
3. `sliceRawBody` 只认**结尾处**的 `</Name>`（正则 `</Name\s*>\s*$`），因此源码里的行内
   `</Mermaid>` 字样不会截短图表 —— 这是路线 B 相对"首个闭合位置切片"的额外收益。

### 2.5 ★修订：闭合判定与诊断码

**冲突事实**：现有闭合判定是「块的原文区间内出现过 `</Name>` 即算闭合」（`src/policy.ts:127-135`）。
对 rawBody 容器而言，容器体内只要出现字面量 `</Mermaid>`，词法就会提前闭合，`UNCLOSED_TAG`
永远不会对它触发。这是**可接受**的（宁可不报也不误报），但必须写进契约，不能让使用方以为有保护。

| 诊断码 | 触发点 | 触发条件 | 降级行为 |
|--------|--------|----------|----------|
| `MERMAID_EMPTY` | policy | 容器体为空或仅空白 | 渲染提示块，原文保留 |
| `MERMAID_TOO_LARGE` | policy | `data.rawBody` > 20 KB | 不渲染图表，原样显示源码 |
> **实施后取消了原稿的 `MERMAID_CLOSED_EARLY`**（附录第 18 条）：路线 B 下「顶格 `</Mermaid>` 即闭合」
> 与「作者本意未结束」不可区分；而 `sliceRawBody` 只认**结尾处**的闭合标签，源码体内行内出现的
> `</Mermaid>` 字样不再截断图表，原风险已从根上消除，不需要专用诊断码。

> 原稿把三个诊断都放在 policy，与实现不符：`CLOSED_EARLY` 是词法事件的产物，policy 拿到节点时
> 截断已经发生，只能"事后描述"、无法"判定"。

---

## 三、分层与文件规划

### 3.1 分层（严格对齐既有依赖约束）

```
Markdown
 ├ registry 声明 Mermaid（rawBody）        ← 纯逻辑，不碰 React/DOM
 ├ jsx-flow / jsx-mdast：产出 rawBody 切片 ← 纯逻辑（路线 A 在词法，路线 B 在装配）
 ├ policy：三个诊断码 + 深度裁剪           ← 纯逻辑
 ├ blocks：图表块按 source 兜底（带 offset）← 纯逻辑，不新增 kind
 ├ serialize：回写 rawBody 原文             ← 纯逻辑，保证往返无损
 ├ render（主入口）：占位骨架 + 源码兜底     ← React，SSR 安全，不碰 DOM
 └ /mermaid 入口（客户端）：懒加载 + 交互     ← 唯一允许碰 mermaid 与 DOM 的层
```

**关键决策不变**：图表渲染本身完全不进入主入口。主入口只输出"可被增强的骨架"，交互入口在客户端把它升级成图表。

### 3.2 文件清单（★行数预估按评审修正，仅作工作量参考）

| 文件 | 层 | 预估行数 | 职责 |
|------|----|---------|------|
| `src/registry.ts`（改） | 纯逻辑 | +8 | 增加 `Mermaid` 声明与 `rawBody` 字段 |
| `src/syntax/jsx-flow.ts`（改，仅路线 A） | 纯逻辑 | +80~120 | rawBody 专用状态组 |
| `src/syntax/jsx-mdast.ts`（改） | 纯逻辑 | +20~25 | `data.rawBody` 存取 + 序列化分支 |
| `src/policy.ts`（改） | 纯逻辑 | +30 | `MERMAID_EMPTY` / `MERMAID_TOO_LARGE`（深度裁剪复用现有 `walk`） |
| `src/blocks.ts`（改） | 纯逻辑 | +6 | rawBody 容器走 `kind:"source"` + `reason:"mermaid"` |
| `src/components/mermaid-placeholder.tsx` | 渲染 | ~70 | SSR 骨架：`figure` + `figcaption` + 源码 `pre` |
| `src/mermaid/index.tsx` | 客户端入口 | ~40 | 只导出，无顶层副作用 |
| `src/mermaid/viewer.tsx` | 客户端 | ~180 | 工具栏、图表/源码切换、变换容器、悬浮控制条、三态 |
| `src/mermaid/use-render.ts` | 客户端 | ~190 | 懒加载、令牌取色、净化、竞态、串行队列、缓存 |
| `src/mermaid/tokens.ts` | 纯逻辑 | ~90 | `--lkes-*` → `themeVariables`，**自宿主 `mermaid.constants.ts` 平移**（第六节） |
| `src/mermaid/export.ts` | 纯逻辑 | ~150 | 尺寸解析、根元素规范化、SVG/PNG 下载 |
| `styles/mermaid.css` | 样式 | ~120 | 类名 `lkes-mermaid-*`，仅消费令牌，**须被 `styles/index.css` import** |
| `tsup.config.ts`（改） | 构建 | +1 | `entry` 增加 `src/mermaid/index.tsx` |
| `package.json`（改） | 构建 | +6 | `exports` 增加 `./mermaid`、`./mermaid/styles.css`；版本 0.4.0 |

> `tokens.ts` / `export.ts` 放在 `/mermaid` 入口内部，但保持纯函数（不读 DOM、不引 React），便于单测与复用。

---

## 四、渲染管线改动点（★rawBody 落点已修正）

| 阶段 | 现状 | 改动 | 风险控制 |
|------|------|------|----------|
| 词法（micromark 尖括号扩展） | 从 registry 读容器名表 | registry 加一项即可；**路线 A** 另需 rawBody 状态组 | 路线 B 不碰此文件 |
| mdast | 容器 → `jsxBlock` | `jsxBlock` 增加 `data.rawBody?: string` | 可选字段，旧节点不受影响 |
| policy | 深度裁剪 + 未闭合 + 缩进诊断 | 新增 `MERMAID_EMPTY` / `MERMAID_TOO_LARGE`；**不做 rawBody 解析跳过**（时机已过） | 复用 `walk` 与 `Diagnostic` 结构 |
| blocks | 压平块索引 | rawBody 容器 → `{kind:"source", reason:"mermaid"}` | **不新增 kind 枚举值**，沿用现有 source 通道 |
| remark-rehype | 自定义 jsxBlock handler | 输出 `<figure data-mermaid data-h="…"><pre>源码</pre></figure>` | 源码转义后放入 `pre`，不做裁剪 |
| rehype 链 | 安全 URL / 锚点 / 代码元信息 / slug / katex | **不新增**（图表无 href/无锚点） | 保持链长度不变 |
| to-jsx-runtime | 组件映射 | `Mermaid` 映射到占位组件 | 交互入口通过覆写表替换 |

---

## 五、客户端交互层设计

### 5.1 接入方式：覆写映射，而非全局副作用

```ts
// 使用方代码（示意，非实现）
import { mermaidComponents } from '@heikeson/md-engine/mermaid';
<MarkdownRenderer config={{ components: { ...mdxComponents, ...mermaidComponents } }} />
```

- 不使用"模块加载即注册"的副作用写法，避免 SSR 与 tree-shaking 混乱
- `src/mermaid/index.tsx` **只导出、不执行**：不得带顶层 `import 'react-zoom-pan-pinch'`
- 未引入该入口时，`<Mermaid>` 永远停留在占位骨架

### 5.2 加载与包体

| 策略 | 做法 |
|------|------|
| 入口隔离 | mermaid 只被 `/mermaid` 入口引用，主入口零引用 |
| 按需加载 | 首个图表进入视口后再 `import('mermaid')`；同页只加载一次 |
| 失败可见 | 动态 import 失败降级为源码展示，并输出一条控制台警告 |

### 5.3 渲染稳定性（四条硬要求）

1. **串行队列**：mermaid 是全局单例，`initialize` 改全局配置；同页多图必须串行，否则主题互相覆盖。
2. **每次唯一渲染 id**：`render(id)` 会按 id 在文档中查找节点，与已渲染 SVG 同 id 会命中原节点，表现为"拿到旧结果"或"图被删掉"。
3. **单次超时**：10 秒超时并放行队列，避免一张卡死拖垮全页。
4. **竞态标记**：effect 内 `cancelled` 标记 + cleanup 置位，卸载后不再写状态。

### 5.4 交互规则

| 操作 | 行为 | 理由 |
|------|------|------|
| 直接滚轮 | 不缩放、不拦截，页面正常滚动 | 文档阅读优先 |
| 按住左键拖动 + 滚轮 | 以光标为锚点缩放 | 避免误触 |
| Ctrl / ⌘ + 滚轮 | 触控板捏合，缩放并阻止整页缩放 | 符合直觉 |
| 双击 | 关闭 | 与文档选择文本冲突 |
| 悬浮控制条 | 放大 / 缩小 / 重置 | 重置按钮不可位于变换层内 |

### 5.5 缩放算法（不依赖库内置滚轮）

- 关闭库自带 wheel（其语义是"倍率 + 符号 × 步长 × 竖直增量"，步长被设备增量相乘放大，鼠标一格可达 +8 倍）
- 自管：`next = current × exp(-normalizedDelta × k)`，`k ≈ 0.0015`
- `deltaMode` 归一化：像素 ×1、行 ×16、页 ×100
- 单次限幅 `[0.75, 1.33]`，防极端事件跳变
- 累积基准：库把倍率取整两位小数，碎增量需累计到 `0.01` 再提交，否则触控板慢滚完全无反应
- 拖动中缩放后**重建拖动基准**（库的平移按"按下时基准"绝对重算位置，不重建会把缩放结果顶回去）

### 5.6 缓存

- 键：`实例 id + 令牌指纹 + 源码`
- 命中的产物同步替换，无异步等待
- 失败产物不入缓存，下次挂载自动重试
- 不做"空闲预热另一套主题"：会与使用方切换主题时的渲染抢串行队列

---

## 六、主题与样式令牌（★修订：与宿主既有映射对齐）

### 6.1 新增令牌（只增不改，现有 9 个保持语义）

| 令牌 | 用途 | 与宿主 `--*` 的对应 |
|------|------|---------------------|
| `--lkes-chart-bg` | 图表底板 | `--card` |
| `--lkes-chart-fg` | 图表文字 | `--foreground` |
| `--lkes-chart-node` | 节点/分支面 | `--muted` → `--card`（跟随主题；不写死品牌色） |
| `--lkes-chart-node-border` | 节点描边 | `--border` → `--muted-foreground` |
| `--lkes-chart-line` | 连线 | `--muted-foreground` → `--border` |

> **取值一律落在 var() 链上**（`--card` / `--foreground` / `--muted` / `--border` / `--muted-foreground`），
> 宿主切换 `.dark` 时自动跟随，不写死任何品牌色。暗色块 `html.dark` 只给"宿主连这些变量都没提供"的场景兜底。
| `--lkes-chart-series-1..6` | 扇区/分支序列色 | 取宿主 12 档 `CHART_PALETTE` 的偶数位，保证两套观感一致 |

### 6.2 ★必须显式覆盖的 mermaid 变量（清单直接平移宿主实现）

宿主 `blog-heikeson2026/components/site/mdx/mermaid.constants.ts` 已通过安全审计与多轮暗色调试，
形成 60+ 变量的覆盖清单。**引擎的 `tokens.ts` 必须以此为基底平移**，不得重新推导：

| 派生型变量 | 默认来源 | 症状 | 宿主已有解法 |
|------------|----------|------|--------------|
| `pieTitleTextColor` / `pieLegendTextColor` | 台面深色 | 暗色下标题、图例不可见 | `foreground` |
| `signalTextColor` / `labelTextColor` / `loopTextColor` | 正文色 | 序列图消息不可见 | `foreground` |
| `rowOdd` / `rowEven` | `lighten(mainBkg, 75)` | **ER 属性行整条发白** | `muted` / `card` |
| `attributeBackgroundColorOdd/Even` | 硬编码 `#fff` / `#f2f2f2` | 类图属性行白底浅字 | `muted` / `card` |
| `altSectionBkgColor` / `gridColor` / `doneTaskBkgColor` | 硬编码 `white` / `lightgrey` | 甘特图出现白色色块 | `muted` / `mutedForeground` |
| `pie1..12` / `cScale0..11` | 由主色系列派生 | 扇区、分支几乎同色 | 12 档 `CHART_PALETTE` |
| `useGradient` | `true` | 渐变与站点规范冲突 | 固定 `false` |
| `background` | 白/深 | 出现与页面不同色的矩形 | 固定 `transparent` |

> **教训不变**：先去渲染器源码确认变量名再改。ER 读 `rowOdd/rowEven`，不是只看 `attributeBackgroundColor*`。
> 差异只能从源码得到答案。随 mermaid 大版本升级时按此清单回归。

### 6.3 亮暗切换的取值时机

不使用框架主题上下文的解析值（未就绪时为空，会退化成亮色渲染）。两条硬要求：

1. **判定**：`useIsDark(elementRef)` 从图表元素**向上找最近的 `.dark`**，而不是只看 `<html>`。
   站点可能把主题类挂在 body、布局容器或局部区域上（`dev/` 就是 `<div class="dark">`），
   只看 `documentElement` 会永远判成亮色。class 变化用**一个共享 MutationObserver**（`subtree: true`）订阅，
   不要每张图各建一个。
2. **取色**：`getComputedStyle(图表元素)`，不是 `documentElement`——变量可能在容器作用域里被覆盖，
   读根元素拿到的是亮色值。`--lkes-chart-*` 是 `var()` 链，若浏览器返回未替换的 token 文本，
   再按「`--muted` → `--card` → 内置」逐级回落；遇到 `oklch()` / `hsl()` 用临时元素归一成 `rgb()`。

### 6.4 配色值的合法性校验

令牌值可能被使用方改成 `oklch()` 等 mermaid 无法解析的格式，此时**静默回落为常量**而不是渲染报错
（宿主 `isParsableColor` 的实现可直接平移）。

---

## 七、导出设计

| 输出 | 关键点 |
|------|--------|
| SVG | 直接使用规范化后的产物（与页面显示同一份），不重新渲染 |
| PNG | SVG → Image → Canvas；Canvas 宽高 ×2 后 `ctx.scale(2,2)`；绘制前填 `--lkes-chart-bg`；`toBlob` 下载 |
| 根元素规范化 | 补 `xmlns` / `xmlns:xlink`（净化后可能丢失，缺了 Canvas 绘制必空白）；去掉自适应宽度内联样式，改显式宽高 |
| PNG 空白根因 | 文本默认走 `foreignObject`，Canvas 不绘制 → 渲染时必须关闭 HTML 标签 |
| 文件名 | `mermaid-<timestamp>.svg\|png` |

---

## 八、安全边界（★修订：安全等级不得回退）

| 关注点 | 处理 |
|--------|------|
| `securityLevel` | **`strict`**，与宿主审计结论（`mermaid.constants.ts:262`，审计 4.4）一致。原稿写 `loose` 属安全回退，不予采纳 |
| 注入 SVG 的 XSS | `strict` 已禁用图表源码中的 HTML 标签与点击事件；`DOMPurify` 作为**第二道兜底**（防 mermaid 升级回归），白名单保留 `<style>` 与命名空间 |
| 为什么不能"最严格白名单" | 榨干 `<style>` 会导致图表完全走形；安全边界应落在"禁用脚本与事件"上 |
| 未来若支持用户输入图表 | 另起净化链路，并考虑独立域名/沙箱，不复用本文档口径 |
| URL 白名单 | 图表为 SVG 内联内容，不经过 `href` 通道；`Image` 容器的白名单逻辑不变 |
| 宿主 CSP | `next.config.ts` 因 mermaid 运行时样式保留 `unsafe-inline`；引擎侧不得新增 `eval` / `new Function`，也不得要求放宽 CSP |

---

## 九、★新增：与现有 mermaid 围栏方案的共存与迁移

### 9.1 现状（已核实）

| 事实 | 出处 |
|------|------|
| 宿主在 `pre` 组件覆盖里按 `lang === "mermaid"` 分流到 `Mermaid` 组件，跳过 shiki 高亮 | `blog-heikeson2026/components/site/article/code-block.tsx:129,163-170` |
| `Mermaid` 实现：动态 import + 每次 `initialize` + 随机 id + `innerHTML` 直插 | `components/site/mdx/mermaid.tsx:27-48` |
| 现有能力：加载态、错误兜底、跟随亮暗重渲染（渲染期保留旧图） | 同上 |
| 现有缺失：无缩放/拖动、无导出、无缓存、无串行队列、**无渲染超时**、无 DOMPurify | 同上 |
| 主题：60+ 变量显式覆盖，`securityLevel: strict` | `components/site/mdx/mermaid.constants.ts` |
| mermaid `11.17.2` 已在宿主 dependencies | `blog-heikeson2026/package.json:48` |
| **引擎 `src/` 目前零 mermaid 代码**，仅契约第 4 条要求"图表必须动态加载" | 全仓检索结果 |

### 9.2 影响分析

| # | 影响 | 严重度 | 说明 |
|---|------|--------|------|
| 1 | **双轨并存** | 高 | 新容器走引擎 `/mermaid` 入口，存量围栏走宿主 `CodeBlock`；两套主题映射与两套交互必然漂移 |
| 2 | **主题清单双源** | 高 | 宿主的 `VAR_TOKENS` 是踩过坑的成果；引擎另起 `tokens.ts` 若不与之对齐，暗色问题会重现一次 |
| 3 | **存量文章不可自动迁移** | 中 | 「语法只增不改」下围栏语义不能改；只能作者逐步改写，或宿主侧做一次性批量替换 |
| 4 | **串行队列跨两套实例** | 中 | 同页既有围栏图又有容器图时，两条路径各自 `initialize`，主题切换会互相覆盖 —— 这是现状就存在、新方案会放大的问题 |
| 5 | **安全口径** | 高 | 宿主已 `strict`；引擎若按原稿走 `loose` + 净化，等于在两套实现间开了个低标准后门 |
| 6 | **编辑器体验** | 低 | 现有 `blocks.ts` 对 mermaid 围栏只给 `kind:"source"` 兜底，新容器同样走该通道，不会倒退 |
| 7 | **宿主升级成本** | 中 | 需升 md-engine 到 0.4.0、接 `/mermaid` 入口、改 `mermaidComponents` 覆写、处理 CSP 不变式 |

### 9.3 建议

| # | 建议 | 理由 |
|---|------|------|
| R1 | **共存期定优先级：容器优先于围栏**。宿主 `code-block.tsx` 的围栏分支保留但标注"过渡写法"，待存量清零后删除 | 不留破窗，也不做破坏性改动 |
| R2 | **主题上吸而非并行**：把宿主 `mermaid.constants.ts` 的 `VAR_TOKENS` 平移为引擎 `tokens.ts`（取值改为读 `--lkes-chart-*`），宿主改为消费引擎导出 | 消灭双源，暗色回归只需维护一份 |
| R3 | **安全口径统一 `strict`**，`DOMPurify` 降为兜底而非主力 | 与审计结论一致 |
| R4 | **迁移工具不进引擎**：由宿主侧（`scripts/`）提供一次性改写 ` ```mermaid ` → `<Mermaid>`，且只对"源码不含字面量 `</Mermaid>`"的文章执行，改写前输出清单待人工确认 | 引擎保持纯内容层，不做仓库级重写 |
| R5 | **阶段化切换**：M1–M2 只上语法与占位（宿主不受影响，围栏照旧）；M3–M4 宿主接 `/mermaid` 入口，两套并存观察；M5 起按 R4 迁移。若宿主不愿承担实现成本，走第十二节 Plan B（注册式），引擎只提供骨架 | 每一步都可回退 |

### 9.4 本次范围内：宿主收敛清单（形态已定「A 内置」）

> 决策：引擎提供完整 `/mermaid` 交互入口，宿主同步**收敛到引擎实现**——删除本地 `Mermaid` 组件与主题常量，
> 不保留第二套实现。执行阶段：**M6**（引擎 0.4.0 发布之后）。

| # | 文件 | 动作 | 要点 |
|---|------|------|------|
| 1 | `package.json` | 升级 `@heikeson/md-engine` → `0.4.0`；移除宿主 `mermaid` 依赖 | 版本跟引擎走，避免宿主与引擎用两个 mermaid 大版本 |
| 2 | `components/site/article/markdown-content.tsx:117-152` | `components` 合并 `Mermaid: mermaidComponents.Mermaid` | **key 必须是 `Mermaid`（大写 M）**：引擎 hast tagName 原样透传，写成小写即静默失效、页面只剩骨架；`pre` 覆盖保持不变（围栏过渡期仍走 CodeBlock） |
| 3 | `components/site/mdx/mermaid.tsx` | **删除** | 交互与渲染由引擎 `viewer.tsx` 接管 |
| 4 | `components/site/mdx/mermaid.constants.ts` | **删除**（内容上吸引擎 `tokens.ts`） | 删除前逐条核对 6.2 清单已被引擎覆盖，尤其 `rowOdd/rowEven`、`pie1..12`、`useGradient:false`、`background:transparent` |
| 5 | `components/site/article/code-block.tsx` | 移除 `import Mermaid`（18 行）、effect 短路（129 行）、围栏分支（163-172 行） | 过渡期可先改为"迁移提示 + 源码"卡片，存活一个版本后再彻底删除 |
| 6 | `styles/prose-code.css:27-63` | **迁移到引擎 `styles/mermaid.css`**，类名改写为 `lkes-mermaid-*` | **最易漏项**：这 5 组规则覆盖的是 mermaid 变量管不到的表现属性——甘特 `rect.task`/`rect.section`/`rect.today` 默认蓝、`activeTask`、序列图 `stickTopArrowHead` 的 `stroke="black"`、ER `marker.er circle` 的 `fill="white"`。不迁 = 甘特暗色退回默认蓝 |
| 7 | `components/site/layout/use-dark-mode.ts` | 保留 | 引擎判据相同（`<html>.dark`）；若引擎导出 `useIsDark`，宿主改为消费同一份，省掉重复的 MutationObserver |
| 8 | `next.config.ts` CSP | 复核 | 新入口不引入 `eval`；DOMPurify 仍走 `innerHTML`，`unsafe-inline` 维持不变 |
| 9 | 宿主文档 `docs/markdown/02-语法规范.md`、`WRITING_GUIDE.md`、`update.md` | 追加 `<Mermaid>` 写法与"围栏为过渡写法" | 与引擎 `对接契约.md` 口径必须一致 |
| 10 | 存量文章 | 按 R4 一次性批量改写，改写前输出清单人工确认 | 只处理"源码不含字面量 `</Mermaid>`"的文章 |

### 9.5 占位组件 props 契约（宿主覆写时必须知道）

主入口渲染 `<Mermaid>` 元素时向下传递的 props（**只增不改**，新增项必须有默认值）：

| prop | 类型 | 来源 | 说明 |
|------|------|------|------|
| `raw` | `string` | `data.rawBody` | 图表源码原文（不转义）；空串对应 `MERMAID_EMPTY` |
| `title` | `string?` | 容器属性 | 渲染为 `figcaption` |
| `height` | `string?` | 容器属性 | 已校验的正整数字符串；非法值此处为空 |
| `code` | `string?` | 兼容别名 | 与宿主既有 `Mermaid code={raw}` 调用对齐，省略时取 `raw` |

> `mermaidComponents.Mermaid` 的签名必须与上表完全一致，宿主直接展开即可，不必再写适配层。

### 9.6 双仓库操作范围与回滚

| 项 | 约定 |
|----|------|
| 仓库 A `markdownedit-kesonoasis` | 只写 `docs/**`、`src/**`、`styles/**`、`tsup.config.ts`、`package.json`、`update.md`、`对接契约.md`、`dev/**` |
| 仓库 B `blog-heikeson2026` | 只写 9.4 表内列出的 10 类文件；**不动**数据库、`app/**` 路由逻辑、后台设置页、`.codebuddy/**` |
| 禁止 | 不 `git push`、不删分支、不动远端 tag、不自行起停 dev server（实测沿用用户已开的服务） |
| 回滚 | A 未发布 → 直接 revert；已发布出问题 → B 锁回 `0.3.1` 并保留 `code-block.tsx` 围栏分支（故第 5 项须等 0.4.0 稳定后再删） |
| 顺序 | A: M0→M5 → 发布 0.4.0 → B: M6 收敛 → 观察一个版本 → 删围栏分支 |

---

## 十、兼容、发版与文档（★修正）

| 项 | 动作 |
|----|------|
| 版本 | **`0.3.1` → `0.4.0`，一次性发布**（M0–M5 全部完成后），不做中间 patch 预发；宿主收敛（M6）在其后独立进行，不回写引擎版本号 |
| 兼容性 | 只增不改：9 个容器行为、围栏代码块语义、现有 9 个令牌全部不变；<br>`<Mermaid>` 未接交互入口时退化为源码骨架，不影响存量渲染 |
| `package.json` `exports` | **必须新增** `"./mermaid"`（types + import）；若样式需单独引用，再增 `"./mermaid/styles.css"` |
| `tsup.config.ts` | **`entry` 必须新增** `"src/mermaid/index.tsx"`，否则不产出 `dist/mermaid/index.js` |
| `package.json` `files` | `dist` 已覆盖，无需改动 |
| 依赖 | `mermaid` 放 **`peerDependencies` + `peerDependenciesMeta.optional: true`**（使用方自控版本，11.x）；<br>`react-zoom-pan-pinch`、`dompurify` 进 **`dependencies`**（由 `/mermaid` 入口自带，tsup 会 external，使用方随包安装） |
| `styles/index.css` | `@import` 新增的 `mermaid.css`，否则「样式随包走」落空 |
| `update.md` | 追加条目：新增 `<Mermaid>` 容器、`/mermaid` 入口、6 个图表令牌、3 个诊断码、与围栏的共存策略 |
| `对接契约.md` | 新增「Mermaid 容器」章节：语法、属性、诊断码、令牌清单、入口用法、**`securityLevel: strict` 与"体内为原始文本"两条边界**；第 4 条补一句"围栏为过渡写法" |
| `selfcheck.mjs` | 增加断言：rawBody 往返逐字一致、空源码诊断、超限诊断、SSR 输出含源码 `pre`、**现有 9 容器快照无变化** |
| CI | 保持现有工作流；新增断言"未安装 mermaid 时主入口构建通过"，守住包体隔离 |

---

## 十一、验收清单

| 类别 | 检查项 |
|------|--------|
| 语法 | 容器可解析；`rawBody` 不被 Markdown 解释（`#`/`\|`/`-->`/行首 `-` 全部原样）；往返 `md → AST → md` 逐字一致 |
| 降级 | 空源码 / 超限两种情况均有诊断码且不吞内容；顶格提前闭合不吞掉后续正文 |
| SSR | Node 端渲染不报错、不加载 mermaid；输出含源码 `pre` |
| 包体 | 未引入 `/mermaid` 入口时，产物不含 mermaid；引入后仅在图表进入视口时加载 |
| 交互 | 滚轮默认只滚页面；按住左键缩放后继续拖动不跳；三控件可用 |
| 稳定性 | 同页 8 图切换主题不错乱；快速连点无控制台报错；单图失败不影响其它图 |
| 可读性 | 暗色下饼图标题/图例、序列图消息、ER 属性行、甘特任务均可读 |
| 导出 | PNG 非空白、字清晰、底色正确；SVG 单独打开正常 |
| 安全 | `securityLevel === "strict"` 生效；含 `<script>` 的图表源码不执行 |
| 打包 | `dist/mermaid/index.js` 与 `.d.ts` 存在；`import '@heikeson/md-engine/mermaid'` 可解析 |
| 共存 | 同一页面围栏图与容器图并存时主题一致、互不干扰 |
| 契约 | 三条铁律无违反；新令牌只增不改；类名由包提供 |

---

## 十二、里程碑拆分（★新增 M0 与 M6）

| 阶段 | 内容 | 产出 | 依赖 |
|------|------|------|------|
| **M0** ✅<br>2026-11-01 21:10 | **rawBody 路线原型验证**（2.4 的三个断言） | 定案 **路线 B**；`dev/m0-rawbody.mjs` 12/12、`selfcheck` 26/26 | 无 |
| **M1** ✅<br>2026-11-01 21:47 | 语法与往返：registry / jsx-mdast / policy / blocks / serialize + 2 个诊断码 | `selfcheck` 29/29；`MERMAID_EMPTY` / `MERMAID_TOO_LARGE` 生效 | M0 |
| **M2** ✅<br>2026-11-01 21:47 | SSR 占位：`mermaid-placeholder.tsx` + rawBody 以 props 透传 + props 契约 | Node 端渲染出 `figure` + 源码 `pre`，主入口不含 mermaid | M1 |
| **M3** ✅<br>2026-11-01 21:52 | 交互入口：exports / tsup 打通、懒加载、串行队列、唯一 id、超时、缓存、净化 | `dist/mermaid/index.js` 19 KB + `.d.ts`；`npm pack` 清单核对通过 | M2 |
| **M4** ✅<br>2026-11-01 21:52 | 主题与令牌：10 个图表令牌 + 60 余项变量映射 + 5 组 CSS 兜底 | 暗色清单自宿主平移；`styles/mermaid.css` 进 `dist/styles.css` | M3 |
| **M5** ✅<br>2026-11-01 21:54 | 导出与文档：SVG/PNG、`对接契约.md` §12、`update.md` 0.4.0、`README` | 版本号 `0.4.0`，可发布 | M4 |
| **M6** ⏸ 待发布 | **宿主收敛**（另一仓库）：升 0.4.0、接 `Mermaid` 覆写、删本地实现、迁 CSS、存量改写 | 站点图表由引擎统一渲染，围栏进入退役倒计时 | **阻塞：0.4.0 尚未发布到 registry** |

> M6 的阻塞是硬性的：宿主改完后要 `import "@heikeson/md-engine/mermaid"`，而 registry 上仍是 `0.3.1`（无该入口），
> 先动宿主会让站点构建直接失败。按 9.6 的顺序，必须「A 发布 0.4.0 → B 收敛」。宿主侧改动清单已在 9.4 逐条列好，发布后可直接执行。

每阶段独立可验收，避免最后一起爆。

---

## 十三、风险与备选

| 风险 | 影响 | 应对 |
|------|------|------|
| rawBody 走 B 时 `position` 失真 | 切片错位，图表内容被截断 | M0 断言 1 卡住；不过则转 A |
| 改词法（路线 A）波及现有容器 | 9 个容器解析回归 | 只用 registry 驱动、不改共用状态出口；selfcheck + snapshot 全跑 |
| mermaid 大版本升级改变变量名/派生规则 | 暗色回归、导出失效 | 固化 6.2 清单并加入快照回归；升级前先跑 M4 验收项 |
| mermaid 体积偏大 | 使用方包体增长 | 入口隔离 + 进入视口才加载；契约明确"按需引入" |
| 主线程渲染阻塞 | 长文档同页多图卡顿 | 视口内才懒渲染；必要时限制单页同时渲染数量 |
| 与宿主围栏双轨漂移 | 同页两种图表观感不一致 | R1 + R2：主题上吸、优先级定死、迁移阶段化 |
| 只增不改约束下做错语法 | 无法回退 | M1 阶段先在小版本内试跑语法形态，再对外承诺 0.4.0 |

**备选方案（Plan B）**：不内置 mermaid，改为"注册式渲染器"接口——`<Mermaid>` 交给使用方在 `components` 覆写中自行实现，包只提供占位骨架与源码回退。适用于：使用方已有图表方案（**宿主当前正是此类**）、或不想承担 mermaid 体积。代价是开箱即用性下降。

---

## 十四、本次可以直接复用的实现结论

| 结论 | 一句话 |
|------|--------|
| 乘法缩放优于加法 | 任何倍率下每格观感一致，不受设备增量量级影响 |
| 交叉操作要重建基准 | 基准式手势库（按下锁定起点）在外部改状态后必须重锚 |
| 派生型变量是深色模式主因 | 逐个点名覆盖，别指望换 `theme` |
| 单例库必须串行 + 唯一 id | 否则并发覆盖配置、命中旧节点 |
| 显示与导出共用一份产物 | 避免"看到的"和"下载的"不一致 |
| 失败要有可见降级 | 错误卡片 + 源码，比白屏可诊断 |
| 主题清单只准有一份 | 宿主已有的 60+ 变量映射要上吸，不要各维护一套 |
| 安全等级只准升不准降 | 宿主审计结论是 `strict`，引擎不得回退为 `loose` |

---

## 附录 A：评审记录（v2 / v3）

| # | 原稿内容 | 问题 | 修订 |
|---|----------|------|------|
| 1 | 2.4「`policy.ts` 跳过 child 解析」 | 落点错误：body 在词法阶段已被解析，policy 是后处理 | 改为 jsx-flow（路线 A）/ jsx-mdast（路线 B）二选一，M0 验证 |
| 2 | 2.5 三个诊断码全在 policy | `CLOSED_EARLY` 是词法事件，policy 无法判定 | 触发点分别标注；说明与 `hasCloseTag` 的冲突 |
| 3 | 九、打包「`files` 跟随 dist，无需改动」 | 漏 `exports` 与 `tsup entry`，缺一即无法 import | 第十节列为必改项 |
| 4 | 版本 0.3.0 → 0.4.0 | 实际为 `0.3.1`；发版粒度已定一次性 | 修正基线，明确一次性发布 |
| 5 | 依赖「自带」表述含糊 | `react-zoom-pan-pinch`/`dompurify` 归属不明（放 devDeps 会发布即崩） | 明确 `dependencies`；mermaid 为可选 peer |
| 6 | 八、`securityLevel: loose` | 与宿主审计结论（`strict`）冲突，属安全回退 | 改为 `strict`，DOMPurify 降为兜底 |
| 7 | 六、令牌与配色 | 宿主已有 60+ 变量映射与 12 档色板，原稿另起 6 色错位循环 | 改为平移宿主清单，令牌与宿主 `--*` 建立对应 |
| 8 | 四、blocks `kind: 'mermaid'` | 现有模型已有 `kind:"source"` + `reason`，无需扩枚举 | 改为 `reason:"mermaid"` |
| 9 | 全文「8 个容器」「单文件 ≤200 行」 | 实为 9 个容器；200 行约束在仓库中已不成立 | 修正数字，行数降为工作量参考 |
| 10 | 全文未提宿主围栏现状 | 存量围栏渲染已上线，双轨问题未处理 | 新增第九节（现状 / 影响 / 建议 / 宿主改动清单） |
| 11 | 1.2「不接管使用方主题系统」 | 与「宿主收敛到引擎」的形态决策相冲突 | 表述改为「只暴露令牌」，同时新增 M6 明确宿主侧对接 |
| 12 | 9.4「非本次范围」 | 形态已定 A 内置，且要求宿主一并收敛 | 升级为 M6 范围内的精确清单（10 项，含行号） |
| 13 | 全文未定义占位组件 props | 宿主覆写时不知道取哪个字段（现宿主用 `code`） | 新增 9.5 props 契约，含 `code` 兼容别名 |
| 14 | 六 只列 `themeVariables` 覆盖 | 宿主还有 5 组 CSS 兜底（甘特任务蓝、序列图箭头、ER 空心圆）是变量管不到的 | 6.2 与 9.4-6 明确要求一并迁移，否则甘特暗色退回默认蓝 |
| 15 | 缺跨仓库操作边界 | 收敛涉及两个仓库，无范围与回滚约定 | 新增 9.6（写入范围、禁止项、回滚、执行顺序） |
| 16 | 2.4 预估「路线 A 需改 jsx-flow.ts」 | 实测 `sliceSerialize(token)` 已能拿到块原文，无需 source 参数 | **M0 定案路线 B**：只改 `registry.ts` + `jsx-mdast.ts`，`jsx-flow.ts` 未动 |
| 17 | 九、依赖含 `react-zoom-pan-pinch` | 方案 5.5 已要求"关闭库自带 wheel、自管缩放、拖动中重建基准"，库的核心价值被抵消，只剩依赖与 React 19 兼容风险 | **不引该库**：`use-zoom.ts` 自实现（约 150 行），锁文件里没有这个包 |
| 18 | 2.5 三个诊断码 | `MERMAID_CLOSED_EARLY` 在路线 B 下无法可靠判定（顶格闭合与"作者本意"不可区分） | **只实现 2 个**（`MERMAID_EMPTY` / `MERMAID_TOO_LARGE`）；同时 `sliceRawBody` 只认结尾闭合标签，行内 `</Mermaid>` 字样不再截断图表，原风险已消除 |
| 19 | 未预估 `"use client"` 指令的打包行为 | 打包器把模块级指令当错误剥掉；加 `banner` 也会被 rollup 丢弃，拆双配置更会与 `clean` 竞争导致 `dist/mermaid/index.d.ts` 丢失 | 产物**不带**指令，契约 §12.4 明确"须由宿主客户端组件引入"；`tsup` 保持单配置 |
| 20 | 首版 UI 是"底部文字工具栏 + 中性节点色" | 与参考站（`docs.heikeson.com/docs/modle/writing-mermaid`）不一致：参考是**卡片 + 顶部图标工具栏 + 右下角药丸缩放条** | 按参考重做：`header.tsx` / `icons.tsx` 新增内联 SVG 图标；布局改为「顶部工具栏（`</>` 源码视图｜复制源码 / 下载 SVG / 下载 PNG）+ 图表区 + 右下角三圆钮」 |
| 21 | 节点色写死薄荷、暗色只看 `<html>`、标题独占一行 | ① 违反"颜色跟随系统变量"；② `dev/` 把 `.dark` 挂在 `<div>` 上，判定永远为亮色、取色读到亮色值；③ 标题在卡片里多出一块 | ① 令牌全改 `var()` 链（`--card`/`--foreground`/`--muted`/`--border`/`--muted-foreground`）；② `useIsDark` 改为「最近祖先 `.dark`」+ 共享 observer，取色改 `getComputedStyle(图表元素)` 并支持 oklch/hsl → rgb；③ 标题并入顶部工具栏左侧 |
| 22 | `dev/fixtures/mermaid.md` 用 `#` 写"mermaid 注释" | mermaid 的注释是 `%%`，`#` 行会让整块报 `No diagram type detected`，表现为一进页面就是错误卡片 | 改 `%%`；错误提示加中文前缀「图表渲染失败：」并保留源码降级 |
| 23 | 图表配色写成 `--lkes-chart-node: var(--muted)` 这类链 | **自定义属性里的 var() 在声明处（:root）就完成替换并固化**，子元素继承的是当时的亮色值——`.dark` 之后再改 `--muted` 不影响它。所以"改成读元素 computed style"也救不回来，这是暗色失效的真正根因 | 5 个颜色令牌**不再在 `:root` 定义**；`readChartTokens` 在图表元素上直接读 `--card` / `--foreground` / `--muted` / `--border` / `--muted-foreground`（元素级解析），CSS 兜底同样改为元素级 var 链；`--lkes-chart-*` 退化为"显式覆盖入口" |
| 24 | 未关 `htmlLabels` | mermaid 默认把节点文字放进 `<foreignObject>` 的 HTML 里，DOMPurify 的 svg profile 会清空这部分 HTML → **图有线没字**；且 Canvas 不绘制 foreignObject，导出 PNG 必空白 | 全图表 `htmlLabels: false`，文字改走 SVG `<text>` |

> 本文档状态为「已定稿·待放行」。按流程，未获明确放行语前不动 `src/**`、`styles/**`、
> 配置文件，也不动宿主 `blog-heikeson2026` 的任何文件。
