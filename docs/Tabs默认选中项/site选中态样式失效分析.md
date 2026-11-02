# site 里 Tabs 看不出选中项（分析）

> @file docs/Tabs默认选中项/site选中态样式失效分析.md
> @description 站点文档页的 Tabs 没有选中态下划线/配色，dev 调试页正常；定位为宿主未分层 `button` 重置压过包内 `@layer lkes.components`，与渲染链路无关。
> @created 2026-11-02 20:33
> @updated 2026-11-02 20:47 按用户选定方案 A 落地：站点重置进 `@layer reset`，层序在入口声明
> @status 已实施

---

## 1. 现象

| 环境 | 表现 |
|---|---|
| `site`（文档页） | 页签文字颜色一致、没有底部高亮下划线，读不出当前是哪一项（外框与 header 分隔线正常） |
| `dev`（调试页） | 当前项有 accent 下划线、非当前项为灰字，正常 |

## 2. 先排除"宿主自己实现 Tabs"的猜测

**站点走的就是引擎渲染器**，没有宿主自建的 Tabs：

- `site/src/layout/DocsLayout.tsx:94` → `<MarkdownRenderer content={doc.body} className="prose-site doc-prose" config={SITE_RENDER_CONFIG} />`
- `SITE_RENDER_CONFIG` 只覆写了 `pre` 与 `a`（`site/src/components/render-config.ts`），没有覆盖 `Tabs`

预渲染产物也证明**组件逻辑与标记都正确**：

```html
<!-- site/dist/docs/index.html -->
<button type="button" role="tab" aria-selected="true" tabindex="0" class="tab-btn active">npm</button>
<button type="button" role="tab" aria-selected="false" tabindex="-1" class="tab-btn">pnpm</button>
```

`active` 类、`aria-selected`、`role="tabpanel"` 全部在位，面板切换（React state）也正常。**缺的只有视觉**。

## 3. 根因：CSS 层叠层 vs 未分层重置

引擎样式全部包在 `@layer lkes.components` 内（`styles/index.css:12` 声明 `@layer lkes.tokens, lkes.components`），
且其文件头写明设计意图："两层都低于宿主未分层的声明，宿主覆盖无需抢顺序"。

而站点 `site/src/styles/base.css:45` 有一条**未分层**的全局按钮重置：

```css
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
```

CSS 层叠规则：**未分层（unlayered）声明永远胜过任何 `@layer` 内的声明，与选择器特异性无关**。
于是这条 `border: 0` 与 `color: inherit` 直接盖掉了：

| 被盖掉的规则（`styles/tabs.css`） | 后果 |
|---|---|
| `.prose-site .tab-btn { border-bottom: 2px solid transparent }` | 下划线占位被清零 |
| `.prose-site .tab-btn.active { border-bottom-color: var(--lkes-accent) }` | 当前项没有 accent 下划线 |
| `.prose-site .tab-btn { color: var(--lkes-muted) }` / `.active { color: var(--lkes-fg) }` | 所有页签同色，选中态消失 |

构建产物里两者确实并存，可复现：

```css
/* site/dist/assets/style-*.css（同一份文件内） */
@layer lkes.components { .prose-site .tab-btn{color:var(--lkes-muted);border:0;border-bottom:2px solid #0000;…} }
button{font:inherit;color:inherit;cursor:pointer;background:0 0;border:0}   /* ← 未分层，优先级更高 */
```

`dev/theme.css` 没有未分层的 `button` 重置（Tailwind preflight 在自己的层里，其余写在 `@layer components` 内），
所以 `dev` 正常。这也解释了两边"同一份组件、不同表现"。

## 4. 影响面（不止 Tabs）

凡是引擎内以 `<button>` 承载外观的组件，在本站点都会丢边框/底色/文字色：

| 组件 | 受影响表现 |
|---|---|
| `Tabs` | 选中态下划线、选中/未选中配色（本次现象） |
| `Image` | 灯箱关闭/缩放按钮的外观 |
| `Mermaid`（`/mermaid` 入口） | 工具栏、缩放条按钮的悬停底色与文字色 |

`a` / `code` 的重置影响较小（引擎只在子元素上给颜色），但同属一类风险。

## 5. 修复方案对比

| 方案 | 做法 | 评价 |
|---|---|---|
| **A（推荐）站点重置下移到更低的层** | `site/src/styles/site.css` 顶部（`@import` 之前）加 `@layer reset, lkes.tokens, lkes.components;`；把 `base.css` 里的元素级重置（`*`、`html`、`body`、`a`、`button`、`code`）包进 `@layer reset { … }` | 一次修好全部引擎组件；宿主仍可用未分层声明覆盖引擎样式（约定不变）；改动集中在站点样式，不碰引擎 |
| B（最小改动）只处理 `button` | `base.css` 中把 `button` 那条放进 `@layer reset`，其余不动 | 改动最小，但同类问题（`a` / `code`）以后还会再犯 |
| C 缩窄重置范围 | `button:not(.tab-btn)` 逐个排除引擎类名 | 类名会扩散，维护成本高，不推荐 |
| D 改引擎：去掉 `@layer` | 让组件样式回到未分层 | 破坏"宿主覆盖无需抢顺序"的既有设计，属破坏性变更（违反 C3），不推荐 |
| E 打补丁 | `.tab-btn.active` 改用 `box-shadow` | 治标：宿主未来任何 `box-shadow` 重置又会失效，且不解决配色 |

## 6. 建议

采用 **方案 A**，并顺带在 `styles/index.css` 的层序说明里补一句风险提示（宿主不得用未分层 reset 触碰引擎组件元素），
避免下一个宿主再踩。

### 验收

| # | 检查 | 判定 |
|---|---|---|
| 1 | 站点文档页 Tabs | 当前项有 accent 下划线、未选中项为灰字 |
| 2 | 站点其他组件 | Image 灯箱按钮、Mermaid 工具栏外观恢复 |
| 3 | 站点自身按钮 | `.copy-btn` / `.icon-btn` / `.pg-*` 外观无回归 |
| 4 | 覆盖能力 | 站点未分层声明仍能覆盖 `--lkes-*` 与引擎样式 |
| 5 | 暗色 | 加 `.dark` 后 Tabs 选中态仍正确 |

---

## 7. 实施记录（方案 A）

| 文件 | 改动 |
|---|---|
| `site/src/styles/site.css` | 顶部（所有 `@import` 之前）新增 `@layer reset, lkes.tokens, lkes.components;` |
| `site/src/styles/base.css` | 元素级重置（`*` / `html` / `body` / `h1-h4` / `p` / `a` / `button` / `code` / `img` / `::selection` / `::focus-visible`）整体移入 `@layer reset { … }`；站点组件类（`.btn` / `.section` / `.sr-only` 等）保持未分层 |
| `styles/index.css` | 仅补文件头层序风险提示（无规则改动） |

校验（不落盘，esbuild 内存打包 `site/src/styles/site.css`）：

- 产物首条为 `@layer reset, lkes.tokens, lkes.components, lkes.tokens, lkes.components;`（重复名无害，顺序为先出现者优先）；
- 宿主 `button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer }` 已位于 `@layer reset { … }` 块内；
- 引擎 `.tab-btn` / `.tab-btn.active` 仍在 `@layer lkes.components` 内。

结论：`reset` 层优先级最低，引擎组件样式重新生效；站点未分层声明依旧能覆盖引擎样式（约定不变）。
浏览器端的最终目验需在已开着的站点服务里看文档页 Tabs（不重启用户的 dev server）。

### 遗留提醒（同类根因，本次未动）

`site/src/styles/docs.css` 里 `.doc-prose table` / `.doc-prose th` / `.doc-prose td` 仍是未分层声明，
会压过 `styles/type-table.css` 的分层规则（`.prose-site .type-table thead th` 等）——站点文档里的 `TypeTable`
实际用的是站点表格样式，不是包内样式。要不要收进层属于站点排版取舍，需单独确认后再改。
