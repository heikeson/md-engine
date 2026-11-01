## 命令

在仓库根目录执行：

```bash
npm run site:dev      # 开发，http://127.0.0.1:5181
npm run site:build    # 客户端构建 + SSR 构建 + 预渲染
npm run site:preview  # 预览构建产物，http://127.0.0.1:4173
```

`site:build` 三步：

1. `vite build` 出客户端产物到 `site/dist`，编辑器因 `lazy()` 被拆成独立 chunk。
2. `vite build --ssr` 出 `site/.ssr/entry-server.js`。
3. `node site/scripts/prerender.mjs` 逐路由 `renderToString`，按目录写 `dist/<route>/index.html`，并生成 `404.html` 与 `sitemap.xml`。

## 目录

```
site/
├─ index.html              外壳与首帧主题脚本
├─ vite.config.ts          alias 指向仓库 src/
├─ scripts/prerender.mjs   预渲染
└─ src/
   ├─ entry-client.tsx     hydrate
   ├─ entry-server.tsx     renderToString + ROUTES
   ├─ App.tsx              路由分发
   ├─ router.tsx           history API 极简路由
   ├─ theme.ts             亮暗切换（CSS 驱动图标）
   ├─ content/
   │  ├─ docs.ts           文档清单（标题 / 摘要 / 分组）
   │  ├─ docs/*.md         文档正文
   │  └─ home-data.ts      首页文案与演示 Markdown
   ├─ layout/              顶栏 / 页脚 / 文档三栏
   ├─ pages/               首页 / 文档 / Playground / 404
   ├─ components/          代码块、着色、演示面板、站内链接
   └─ styles/              原生 CSS 分片
```

## 部署

| 项 | 值 |
|---|---|
| 构建命令 | `npm run site:build` |
| 输出目录 | `site/dist` |

