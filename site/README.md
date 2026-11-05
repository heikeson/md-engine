# 官网（site/）

`@heikeson/md-engine` 的官网与 Playground。产物是纯静态目录，文档正文由引擎自己渲染——容器改坏了，构建或页面会立刻显形。

## 命令

在仓库根目录执行：

| 命令 | 作用 | 地址 / 产物 |
|---|---|---|
| `npm run site:dev` | Vite 开发服务器，`strictPort` | http://127.0.0.1:5181 |
| `npm run site:build` | 客户端构建 → SSR 构建 → 预渲染 | `site/dist` |
| `npm run site:preview` | `vite preview` 预览构建产物 | http://127.0.0.1:4173 |

`site:build` 是三条命令串联：

1. `vite build --config site/vite.config.ts`：`root` 指向 `site/`，产物进 `site/dist`；`cssCodeSplit: false` 让整站共用一份 CSS；Playground 里的编辑器用 `lazy()` 拆成独立 chunk。
2. `vite build ... --ssr src/entry-server.tsx --outDir .ssr`：产出 `site/.ssr/entry-server.js`。`ssr.noExternal: [/.*/]` 把引擎源码一起打进 bundle，Node 不需要直接加载 `.ts`。
3. `node site/scripts/prerender.mjs`：以 `dist/index.html` 为模板，按 `PAGES` 逐路由 `renderToString`，写 `dist/<route>/index.html`，再生成 `dist/404.html` 与 `dist/sitemap.xml`。

预渲染另外做三件事：

- 按页替换 `<html lang>`、`<title>`、`<meta name="description">`——模板里那一份只属于中文首页。
- 注入 `window.__INITIAL_PATH__`，客户端 `hydrateRoot` 时读同一个值，避免首屏路径不一致。
- 校验模板里存在空的 `<div id="root"></div>`；找不到就抛错，防止把已有内容覆盖掉。

## 路由与语言

没有路由库，`src/router.tsx` 只做 history API + `popstate`：

- 默认语言中文，路径无前缀；英文一律 `/en`。`splitLocale()` 拆前缀，`usePath()` 返回去前缀的逻辑路径，`Link` 渲染时补回前缀，所以页面代码里写 `/docs/syntax` 即可。
- 可预渲染路径（`entry-server.tsx` 的 `PAGES`）：`/`、`/docs` + 4 篇中文文档、`/playground`；`/en`、`/en/docs` + 4 篇英文文档、`/en/playground`；`/404` 只生成一份，固定中文。
- `Link` 只拦截站内左键点击；修饰键、`target="_blank"`、外链交给浏览器。
- 客户端导航时更新 `document.title` 与 `<html lang>`；首屏值来自预渲染写好的静态 HTML。

## 内容

文档是纯 Markdown，没有 frontmatter——引擎不解析它，塞进去会原样出现在正文里。

| 文件 | 职责 |
|---|---|
| `src/content/docs.ts` | 文档清单：`slug` / `title` / `summary` / `group` + 正文（`?raw` 导入）。中英文分桶，分组用语言无关 key（`start` / `syntax` / `advanced`），显示名在 `GROUP_TITLE` |
| `src/content/docs/*.md` | 中文正文 4 篇 |
| `src/content/docs/en/*.md` | 英文正文，slug 与中文一一对应 |
| `src/content/home-data.ts` | 首页文案与演示用 Markdown 片段 |
| `src/lib/toc.ts` | 从原文扫 2–3 级标题生成右侧目录；id 规则照抄 github-slugger，且跳过围栏代码块 |

正文由 `MarkdownRenderer` 渲染，`className="prose-site doc-prose"`。全站只覆盖两个组件（`src/components/render-config.ts`）：

| 覆盖键 | 实现 | 原因 |
|---|---|---|
| `pre` | `CodeBlock` | 代码块要有标题栏与复制按钮 |
| `a` | `SmartLink` | 站内链接走前端路由，不整页刷新 |

其余容器一律用包内实现：官网覆盖得越多，越不能当回归测试用。站点外壳文案走 `src/i18n.ts` 的字典，语言只由路由决定，不读 `navigator`，因此预渲染与 hydrate 一致。

## 主题

`<html>` 上的 `dark` 类决定亮暗：引擎令牌、站点样式、图表一起切换。初始值由 `index.html` 的内联脚本在首帧前写入，键为 `md-engine-theme`，无存储时读 `prefers-color-scheme`；`src/theme.ts` 只负责切换与持久化。图标显隐交给 CSS，避免服务端与客户端首帧不一致。

## 与引擎源码的绑定

`vite.config.ts` 的 alias 把包名直接指向仓库源码，**顺序敏感**（具体入口必须排在主入口之前）：

| 请求 | 指向 |
|---|---|
| `@heikeson/md-engine` | `src/index.ts` |
| `@heikeson/md-engine/editor` | `src/editor/index.ts` |
| `@heikeson/md-engine/components` | `src/components/index.ts` |
| `@heikeson/md-engine/mermaid` | `src/mermaid/index.tsx` |
| `@heikeson/md-engine/styles.css` | `styles/index.css` |
| `@heikeson/md-engine/styles/*` | `styles/*` |

`site/tsconfig.json` 用 `paths` 做同样的映射（外加 `@site/*`），但它不并入根 `typecheck`：发版校验只看引擎源码。

改引擎源码无需先 `npm run build`，官网直接读到新代码。

## 目录

```
site/
├─ index.html               外壳、首帧主题脚本、#root
├─ vite.config.ts           root=site、alias 指向仓库 src/ 与 styles/
├─ tsconfig.json            站点独立编译口径（不并入根 typecheck）
├─ scripts/prerender.mjs    逐路由写静态文件 + 404 + sitemap
├─ public/favicon.svg
└─ src/
   ├─ entry-client.tsx      hydrateRoot，读 __INITIAL_PATH__
   ├─ entry-server.tsx      renderToString + PAGES（标题 / 描述 / lang）
   ├─ App.tsx               路由分发 + MdEngineProvider（全站唯一的 locale 注入点）
   ├─ router.tsx            history API、语言前缀、navigate / Link
   ├─ i18n.ts               语言解析 + 站点文案字典
   ├─ theme.ts              dark 类切换与持久化
   ├─ version.ts            版本号取自仓库根 package.json
   ├─ content/              文档清单、正文、首页数据
   ├─ lib/toc.ts            目录提取
   ├─ layout/               Header / Footer / DocsLayout（三栏 + 翻页）
   ├─ pages/                Home / DocsPage / Playground / NotFound
   ├─ components/           CodeBlock / highlight / SmartLink / render-config
   └─ styles/               base / code / docs / home / layout / playground / site / tokens
```

## Playground

`/playground` 直接使用包的 `/editor` 入口：编辑器 `lazy()` 加载，服务端只输出骨架，首屏不承担 CodeMirror 的体积。

- 顶部状态取 `roundtrip(value) === value`，实时显示往返是否一致。
- 「分享链接」把全文 UTF-8 → base64 写进当前路径的 `?s=`，路径取 `window.location.pathname`，所以 `/en/playground` 的分享链接不会指回中文站。
- 切换三档视图靠给 `MarkdownEditor` 换 `key`——`view` 只在挂载时读一次。

## 部署

| 项 | 值 |
|---|---|
| 构建命令 | `npm run site:build` |
| 输出目录 | `site/dist` |
| 404 | `dist/404.html`（静态托管按该文件名识别） |
| sitemap | `dist/sitemap.xml`，URL 前缀写死 `https://md-engine.pages.dev`，换域名要改 `prerender.mjs` |
| base | `/`，需部署在域名根路径 |

每个路由都落成 `dist/<route>/index.html`，静态托管按目录取索引，深层链接刷新不会 404，也不需要重写规则。
