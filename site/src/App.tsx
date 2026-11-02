/**
 * @file 应用根与路由分发
 * @description 站点外壳（顶栏 + 页脚）与页面内容分离；Playground 需要满高，单独一个外壳。
 *   标题在客户端导航时更新，首屏由预渲染脚本按路由写入静态 HTML。
 *
 *   语言来自路由前缀（`useLocalePath`）。这里也是**唯一**注入引擎语言的位置：
 *   包一层 `MdEngineProvider` 之后，子树里所有 `MarkdownRenderer` 与 `MarkdownEditor`
 *   自动跟随站点语言，调用点不必逐个传 locale。
 * @created 2026-11-02 00:50
 * @updated 2026-11-02 00:50
 * @updated 2026-11-02 19:32 接入路由级语言：注入 MdEngineProvider、双语标题、英文站只开放首页与 Playground
 */

import { useEffect, type ReactElement } from "react";
import { MdEngineProvider } from "@heikeson/md-engine";
import { findDoc } from "./content/docs";
import { DEFAULT_SITE_LOCALE, messagesOf, type SiteLocale } from "./i18n";
import { Footer } from "./layout/Footer";
import { Header } from "./layout/Header";
import { DocsPage } from "./pages/DocsPage";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { Playground } from "./pages/Playground";
import { useLocalePath } from "./router";

const TITLE_SUFFIX = "md-engine";

/**
 * 按逻辑路径解析页面
 * @param path 已去掉语言前缀的路径
 * @param locale 当前语言
 * @returns 页面元素
 * @description 英文站暂时只开放首页与 Playground（文档正文待翻译），
 *   其余路径一律给 404，避免出现「英文界面 + 中文正文」的半成品。
 */
function renderPage(path: string, locale: SiteLocale): ReactElement {
  if (path === "/" || path === "") return <Home />;
  if (path === "/playground") return <Playground />;
  if (locale === DEFAULT_SITE_LOCALE) {
    if (path === "/docs") return <DocsPage slug="" />;
    const docMatch = /^\/docs\/([\w-]+)$/.exec(path);
    if (docMatch) return <DocsPage slug={docMatch[1]} />;
  }
  return <NotFound />;
}

/**
 * 页面标题
 * @param path 已去掉语言前缀的路径
 * @param locale 当前语言
 * @returns 标题文字
 */
function titleOf(path: string, locale: SiteLocale): string {
  const messages = messagesOf(locale);
  if (path === "/" || path === "") return messages.titleHome;
  if (path === "/playground") return messages.titlePlayground;
  if (locale === DEFAULT_SITE_LOCALE) {
    if (path === "/docs") return messages.titleDocs;
    const docMatch = /^\/docs\/([\w-]+)$/.exec(path);
    if (docMatch) {
      const doc = findDoc(docMatch[1]);
      if (doc) return `${doc.title} · ${TITLE_SUFFIX}`;
    }
  }
  return messages.titleNotFound;
}

/**
 * 应用根
 * @returns 站点
 */
export default function App(): ReactElement {
  const { locale, path } = useLocalePath();
  const isPlayground = path === "/playground";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = titleOf(path, locale);
  }, [path, locale]);

  return (
    <MdEngineProvider locale={locale}>
      {isPlayground ? (
        <>
          <Header />
          <Playground />
        </>
      ) : (
        <>
          <Header />
          {renderPage(path, locale)}
          <Footer />
        </>
      )}
    </MdEngineProvider>
  );
}
