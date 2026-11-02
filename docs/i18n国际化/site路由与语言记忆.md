# site 文档站：路由级语言与语言记忆

> @file docs/i18n国际化/site路由与语言记忆.md
> @description 文档站按"路径前缀"区分语言的实施方案：前缀策略、路由解析、Link 前缀自动拼接、Provider 单点注入、SSG 预渲染改造、内容分桶，以及与 localStorage `lkes-md-lang` 的分工。
> @created 2026-11-02 19:29
> @updated 2026-11-02 19:29
> @status 已实施

---

## 一、前缀策略：默认语言无前缀

```
/                      中文首页（现状，不改）
/docs                  中文文档
/docs/quick-start      中文文档页
/playground            中文 Playground + 编辑器

/en                    英文首页
/en/docs               英文文档
/en/docs/quick-start   英文文档页
/en/playground         英文 Playground + 编辑器
```

选"中文无前缀"而不是 `/zh/` `/en/` 双语前缀，理由：

- site 已有线上 URL 与索引（`https://md-engine.pages.dev/docs/...`），加前缀等于所有中文页面 URL 变更，需要重定向表，`PAGES`/sitemap/预渲染产物全部翻倍重排。
- `site/index.html:2` 已是 `lang="zh-CN"`，站点主语言就是中文。
- 代价是"默认语言"概念要写进解析函数里（`无前缀 ⇒ zh-CN`），可接受。

---

## 二、路由解析：一个纯函数收口

`site/src/App.tsx:26-33` 现在是直接正则匹配 `path`。改造方式是**先剥离语言前缀，再走原逻辑**：

```ts
/** 从 path 解析出 locale 与去前缀的 path */
function splitLocale(path: string): { locale: Locale; path: string } {
  const m = /^\/en(?=\/|$)/.exec(path);
  if (!m) return { locale: "zh-CN", path };
  return { locale: "en-US", path: path.slice(3) || "/" };
}
```

`site/src/router.tsx` 需要配套改动：

| 位置 | 现状 | 改法 |
|---|---|---|
| `router.tsx:107-112` `normalizePath` | 去 query/hash、去尾斜杠 | 保持不变（前缀是路径的一部分，不该在此剥） |
| `router.tsx:80-100` `Link` | 直接用 `href` | 站内相对 href **自动拼当前 locale 前缀**（默认语言不加），绝对 URL / 外链不拼 |

`Link` 自动拼前缀是关键：Header/DocsLayout/Footer 里有大量 `href={/docs/${slug}}`（如 `DocsLayout.tsx:67`），逐处手改必然漏。自动拼接后，现有调用一行不改，在 `/en/docs/x` 页面里点侧边栏跳到的就是 `/en/docs/y`。

> `Header.tsx:46` 的 `isDocs = path.startsWith("/docs")` 在 `/en/docs` 下会失效，必须换成"剥离前缀后的 path"判断。这类前缀判断在 site 里可能不止一处，实施时用 `useLocalePath()` 统一提供 `{ locale, path }`，避免各处自己 `slice`。

---

## 三、单点注入：组件与编辑器自动识别路由语言

用户要求"site 中的组件、编辑器自动要识别路由的语言自动设置"。实现位置只有一处——`site/src/App.tsx` 的页面外壳：

```tsx
const { locale, path } = useLocalePath();

return (
  <MdEngineProvider locale={locale} messages={SITE_MESSAGES[locale]}>
    <Header />
    {renderPage(path)}
    <Footer />
  </MdEngineProvider>
);
```

覆盖情况（对照调研）：

| 调用点 | 是否自动生效 | 说明 |
|---|---|---|
| `DocsLayout.tsx:87` `<MarkdownRenderer config={SITE_RENDER_CONFIG}>` | ✅ | 无需改。`SITE_RENDER_CONFIG` 仍只放 components 覆盖，与 locale 无关，模块常量不变，不破坏 `useShallowStable` |
| `Home.tsx:69`、`:109` | ✅ | 同上 |
| `Playground.tsx:201` `<MarkdownEditor>` | ✅ | 工具栏/状态栏/placeholder 自动跟随；`placeholder` 那行中文硬编码需改成走 `messages` |

**这就是根级 Provider 的实际收益**：4 个调用点零改动，以后新增用法天然继承。

---

## 四、SSG 预渲染必须改的三处

`entry-server.tsx:33-50` 的 `PAGES` 是预渲染路径的唯一来源，`prerender.mjs:80-84` 按 `path` 落盘（`/en/docs/x` 自然写成 `dist/en/docs/x/index.html`，无需改映射逻辑）。要改的是：

1. **`PAGES` 加倍**：中文 6 条 + 英文 6 条，且每条要带 `locale` 字段（或从 path 推导），title/description 也要按语言给。
2. **`prerender.mjs:42-49` 的 `withMeta`**：现在只替换 `<title>` 和 `<meta name="description">`。必须再加 **`<html lang>` 替换**（英文页写 `lang="en"`），以及可选的 `dir` 注入。否则英文页面的 HTML 根声明仍是 `zh-CN`，读屏器与搜索引擎会按中文处理。
3. **`prerender.mjs:87-90` 的 404**：只有一份 `404.html`，**404 无法按路径区分语言**。保持中文（或做双语文案），不要试图生成 `en/404.html`（运行时找不到对应 URL 就没有意义）。
4. **sitemap（`prerender.mjs:91-98`）**：可选加 `xhtml:link hreflang` 互指，让搜索引擎知道两个语言版本是同一页面。不做也能收录，只是少了语言关联信号。

---

## 五、内容分桶与英文内容缺口

现在 `site/src/content/docs.ts` 是**单一扁平数组**：

```ts
type DocGroup = "入门" | "语法" | "进阶";        // 分组名写死在类型里
export const DOCS: readonly DocEntry[] = [...]     // :30-59
export const GROUP_ORDER = ["入门","语法","进阶"]   // :62
```

改造方向：`DOCS` → `DOCS_BY_LOCALE: Record<Locale, readonly DocEntry[]>`，`DocGroup`/`GROUP_ORDER` 按 locale 取；`findDoc`/`docNeighbors`/`DOC_PATHS` 全部加 locale 参数。

**这里有一个无法靠代码解决的问题**：`site/src/content/docs/` 下 4 篇中文文档（`quick-start` / `syntax` / `editor` / `styling`）需要英文版正文。选项：

| 选项 | 结果 |
|---|---|
| A. 全量翻译 4 篇 | 英文站完整，工作量在内容侧（非代码） |
| B. 英文站先只上 UI + 导航，文档正文回退中文 | 英文界面里嵌入中文正文，观感差但可用 |
| C. 英文站先只放 `/en` 首页 + `/en/playground`，`/en/docs` 暂不生成 | 避免半成品，导航里隐藏英文文档入口 |

默认倾向 C（不做半成品），但需你定。

---

## 六、localStorage 与路由的分工

用户要求：持久化走 localStorage，键名 `lkes-md-lang`，不走 cookie。

在"路由决定语言"的站里，两者职责必须分清：

| 场景 | 谁决定 | 说明 |
|---|---|---|
| 文档页 `/docs/x`、`/en/docs/x` | **路由** | URL 是事实。可分享、可索引、预渲染一致、零闪烁 |
| Playground `/playground`、`/en/playground` | **路由** | 同上（有英文版就不需要 localStorage） |
| 语言切换器 | 路由 + 写入记忆 | 点击 → `localeStorage.set(next)` → `navigate(带前缀的等价 URL)` |
| 切换器选中态 | 路由（只读） | 显示态永远跟 URL 一致，不跟 localStorage，否则 URL 与界面会打架 |
| 裸用引擎（宿主没有路由 i18n） | localStorage → 默认 | 客户端挂载后生效 |

### 根路径 `/` 要不要按记忆自动跳转

这是唯一有争议的点：

| 方案 | 好处 | 代价 |
|---|---|---|
| **不自动跳转**（推荐） | 零闪烁、SEO 干净、URL 永远可预测 | 老用户每次从 `/` 进来都看到中文，要手动切 |
| 内联脚本预跳转 | 记性好 | `<head>` 里塞 `location.replace`，首屏必然一次跳转；爬虫与回溯历史都受影响 |
| 挂载后 `navigate` | 实现简单 | 明显闪烁（先渲染中文再跳） |

倾向"不自动跳转 + 在 Header 放语言切换器"，因为站点的流量主体是搜索引擎与首次访问者，URL 确定性优先。若你更看重回访体验，选内联脚本方案，但要在文档里写明这是有意接受的代价。

---

## 七、UI 文案改造面（约 90 处）

按调研结果，site 硬编码中文分布：

| 文件 | 大致处数 | 典型内容 |
|---|---|---|
| `layout/Header.tsx` | ~17 | 导航、主题切换 title、无障碍 aria |
| `layout/Footer.tsx` | ~19 | 三列标题与全部链接 label |
| `layout/DocsLayout.tsx` | ~13 | 目录、上一篇/下一篇、aria |
| `pages/Home.tsx` | ~30 | 首页正文、表格表头 |
| `pages/Playground.tsx` | ~20 | 样例名、按钮、notice、placeholder |
| `pages/NotFound.tsx` | 4 | 全部文案 |
| `components/CodeBlock.tsx` | 2 | `复制` / `已复制` |
| `App.tsx` + `entry-server.tsx` + `prerender.mjs` | ~10 | 页面 title / description 模板 |

这些**不复用引擎的 `UIText`**（两者文案集合不同，混在一起会让引擎语言包膨胀），而是 site 自己的 `SITE_MESSAGES` 字典。命名与引擎保持同样约定（扁平 camelCase），便于将来合并审视。

`components/highlight.ts:187` 的 `"TEXT"` 是代码块语言标签，语言无关，不翻译。

---

## 八、分期建议

| 期 | 内容 | 依赖 |
|---|---|---|
| P1 | 引擎：消息层 + locale + 诊断 params + `lkes-md-lang` + RTL 逻辑属性 | 无 |
| P2 | site：路由前缀 + `Link` 拼接 + Provider 注入 + prerender `lang` + site UI 文案 | P1 的 Provider |
| P3 | site 英文文档正文（内容工作） | P2 |

P1 与 P2 的边界就是"引擎 API 稳定"这一条：P2 只消费 P1 导出的 Provider 与 `createLocaleStorage`。

---

## 九、待你定

1. 英文文档正文：全量翻译 / 先回退中文 / 先只上 `/en` 首页与 Playground（倾向第三）。
2. 根路径 `/` 是否按 `lkes-md-lang` 自动跳转（倾向不跳，改用切换器）。
3. 语言切换器放 Header 哪个位置（主题切换旁？还是独立下拉？）。
