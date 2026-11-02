# i18n 增补需求：dev 语言切换 + site 英文文档

> @file docs/i18n国际化/需求增补-dev语言切换与site英文文档.md
> @description 在原 i18n 需求（已实施 P1 引擎 + P2 站点）之上追加两项：dev 预览的语言切换按钮；site 四篇文档正文英文化并开放 `/en/docs`。
> @created 2026-11-02 20:17
> @updated 2026-11-02 20:22 实施完成，补记结果与验证
> @status 已实施

---

## 一、为什么单独立项

原需求文档明确把这两件事排除在外：

- 英文站「先只上 `/en` 首页 + `/en/playground`，`/en/docs` 不生成」（决策 9）
- `dev/` 预览「无需 i18n」（范围 P3 之外）

现在两项都要做，且它们依赖已完成的 `MdEngineProvider` / `languageOf` / `formatDiagnostic` 等能力，因此作为增补项执行，不改动已实施的 P1/P2 结论。

---

## 二、增补项 A：dev 预览加语言切换

### 现状

`dev/chrome.tsx` 有约 15 处硬编码中文（顶栏标题、副标题、样例切换、渲染/编辑器、亮暗、重置、诊断、往返结论四态），且诊断列表直接显示 `item.message`（中文）。`dev/main.tsx` 的挂载树**没有** `MdEngineProvider`，所以 `dev/App.tsx` 里渲染的组件文案也无法跟随语言。

### 方案

1. `dev/main.tsx` 在 `<App />` 外补一层 `<MdEngineProvider>`；语言状态由 `dev/App.tsx` 持有（`useState`），因为切换按钮在顶栏、消费方在子树。
2. **初始值从 `lkes-md-lang` 读**。dev 是纯客户端 Vite 应用，没有 SSR/hydration 约束，可以同步读；读不到则 `zh-CN`。切换后写回该键，与站点、引擎共用同一份约定。
3. 新增 `dev/i18n.ts`：dev 自己的 UI 文案字典（约 20 键，中英各一份）。**不复用**引擎 `UIText`——dev 的「样例 / 重置 / 往返一致」不是产品文案，混进去会让引擎语言包膨胀。
4. `DiagnosticList` 改用引擎的 `formatDiagnostic(t, diagnostic)`，诊断文案随语言变化；`code` 与行号保持原样（那是程序标识）。
5. 切换按钮放顶栏右侧，紧邻「亮色/暗色」，形态与现有按钮一致（`rounded-md border`）。

### 不做

- `dev/fixtures.ts` 的样例文章正文不翻译（那是测试数据，翻译后失去回归意义）
- 诊断码本身不翻译

### 验收

- 点切换后：顶栏、底栏、诊断文案、预览区组件内文案同时切换
- 刷新后语言保持（`lkes-md-lang`）
- `parse` 结果不受影响（切语言不触发重新解析）

---

## 三、增补项 B：site 四篇文档英文化

### 规模

| 文档 | 行数 | 字符数 |
|---|---|---|
| `quick-start.md` | 71 | 1954 |
| `syntax.md` | 180 | 3789 |
| `editor.md` | 105 | 2670 |
| `styling.md` | 82 | 2045 |
| 合计 | 438 | 10458 |

### 结构改造

`site/src/content/docs.ts` 现在是单一扁平数组，且分组名写死在类型里：

```ts
type DocGroup = "入门" | "语法" | "进阶";
export const DOCS: readonly DocEntry[] = [...];
export const GROUP_ORDER = ["入门", "语法", "进阶"];
```

改为按语言分桶：

```ts
export type DocGroupKey = "start" | "syntax" | "advanced";
export const DOCS_BY_LOCALE: Record<SiteLocale, readonly DocEntry[]>;
export const GROUP_TITLE: Record<SiteLocale, Record<DocGroupKey, string>>;
export function docsOf(locale): readonly DocEntry[];
export function findDoc(slug, locale): DocEntry | undefined;
export function docNeighbors(slug, locale): { prev?, next? };
export function docPaths(locale): string[];
```

`DocEntry.group` 从中文联合类型改为 `DocGroupKey`，显示名由 `GROUP_TITLE` 提供（`DocsLayout` 的 eyebrow 与分组标题都用它）。这样新增第三种语言只需加一个桶，不必再动类型。

新增 `site/src/content/docs/en/*.md` 四篇英文正文。

### 路由开放

| 位置 | 改动 |
|---|---|
| `site/src/App.tsx` | 去掉「英文不给 docs」的分支，`/en/docs`、`/en/docs/<slug>` 正常解析 |
| `site/src/entry-server.tsx` | `PAGES` 增加 4 条 `/en/docs/<slug>` + `/en/docs`，`lang: "en-US"` |
| `site/src/layout/Header.tsx` | 英文恢复「文档」导航 |
| `site/src/layout/Footer.tsx` | 英文恢复文档四列链接 |
| `site/src/pages/NotFound.tsx` | 英文恢复「从快速开始读起」 |
| `site/src/layout/DocsLayout.tsx` | 分组标题、侧边栏、翻页全部按 locale 取 |
| `site/scripts/prerender.mjs` | 无需改（按 path 落盘天然支持）；可选补 sitemap 的 `hreflang` |

### 翻译口径

- 正文、标题、摘要、分组名全部英文
- 代码块里的注释翻译成英文，代码本身（API 名、属性名）不动
- 容器示例（`<Callout>` 等）的 `title` 属性值翻译（那是显示文案）；`type` / `value` 等标识值不动
- 术语统一：容器 = container，子项 = children，往返 = round trip，降级 = degrade

### 验收

- `dist/en/docs/index.html` 与 4 个 `/en/docs/<slug>/index.html` 存在，`lang="en-US"`
- 英文文档页导航、侧边栏、翻页、目录、页脚全部英文
- 英文页扫描中文：正文与 UI 零命中（语言按钮的「中文」除外）
- 中文文档页与现状逐字一致（渲染结果不变）

---

## 四、ToDoList

| # | 任务 | 依赖 |
|---|---|---|
| 1 | `dev/i18n.ts` 双语字典（~20 键） | — |
| 2 | `dev/App.tsx` 持 locale 状态 + 读 `lkes-md-lang`，包 `MdEngineProvider` | 1 |
| 3 | `dev/chrome.tsx` 文案走字典 + 语言切换按钮 + 诊断用 `formatDiagnostic` | 2 |
| 4 | `docs.ts` 改为按 locale 分桶（结构改造） | — |
| 5 | 英文四篇正文 `site/src/content/docs/en/*.md` | 4 |
| 6 | `App.tsx` / `entry-server.tsx` 开放 `/en/docs` | 4 |
| 7 | Header / Footer / NotFound / DocsLayout 恢复英文文档入口与分组标题 | 4 |
| 8 | 端到端验证（构建 + 产物 + 中文残留扫描 + 中文页零回归） | 全部 |

---

## 五、风险

| 风险 | 应对 |
|---|---|
| `docs.ts` 结构改动牵连 `DocsPage` / `DocsLayout` / `entry-server` 四处调用 | 先改类型再逐个修调用点，靠 `typecheck` 兜底（注意根 tsconfig 不含 site，需单独跑 `tsc` 校验） |
| 英文正文的容器语法写错会直接把组件改坏 | 翻译后跑 `roundtrip` 自检 + `site:build` 目视 |
| 分组名从中文联合类型改为 key，中文侧可能显示错位 | 中文侧渲染结果必须与现状逐字一致（对比构建前后 HTML） |
| 翻译体量（1 万字符）易出现术语不一致 | 统一术语表见 §三 |

---

## 六、放行与实施结果

| 时间 | 事件 | 依据 |
|---|---|---|
| 2026-11-02 20:17 | 本文档定稿 | 等待放行 |
| 2026-11-02 20:18 | 用户放行 | 用户原话：「可以，开始开发(按 ToDoList 1→8 顺序实施：先 dev 语言切换，再 site 英文文档)」 |
| 2026-11-02 20:22 | 实施完成 | 见下表 |

**状态：已实施。**

### 验证实测

| 检查 | 结果 |
|---|---|
| `npm run typecheck`（含 `dev/`） | 通过 |
| `npm run site:build` | **14 个页面** + 404 + sitemap |
| 英文文档产物 | `dist/en/docs/index.html` 与 4 篇 `dist/en/docs/<slug>/index.html` 全部生成，`lang="en-US"` |
| 英文页中文残留 | 每个页面仅 3 处：两处源码注释 + 语言按钮上的「中文」（有意保留） |
| 中文页分组名 | 「入门 / 语法 / 进阶」显示正常，与改造前一致 |
| 英文页分组名 | 「Getting started / Syntax / Advanced」 |
| 中文页零回归 | 文档标题、分组、正文渲染与改造前一致 |

### 新增 / 改动文件

- dev 新增：`dev/i18n.ts`
- dev 改动：`dev/App.tsx`（语言状态 + `MdEngineProvider`）、`dev/chrome.tsx`（文案 + 语言按钮 + `formatDiagnostic`）、`dev/panes.tsx`（原文栏标题）
- site 新增：`site/src/content/docs/en/{quick-start,syntax,editor,styling}.md`
- site 改动：`content/docs.ts`（按 locale 分桶 + 分组 key）、`pages/DocsPage.tsx`、`layout/DocsLayout.tsx`、`App.tsx`、`entry-server.tsx`、`layout/{Header,Footer}.tsx`、`pages/NotFound.tsx`

### 实施说明

| 项 | 说明 |
|---|---|
| 诊断本地化 | `dev/chrome.tsx` 的 `DiagnosticList` 改走 `formatDiagnostic`，`code` 与行号保持原样 |
| 英文文档内的卡片链接 | 手写 `/en/docs/...`——引擎的 `Card` / `File` 不知道站点路由，不会自动加语言前缀 |
| 分组类型 | `DocGroup`（中文联合类型）→ `DocGroupKey`（`start`/`syntax`/`advanced`）+ `GROUP_TITLE` 显示名表，新增语言不必再动类型 |
| 兼容导出 | `docs.ts` 保留 `DOCS` 与 `DOC_PATHS`（指向中文），避免一次性改爆所有调用点 |
