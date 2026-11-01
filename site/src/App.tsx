/**
 * @file 应用根与路由分发
 * @description 站点外壳（顶栏 + 页脚）与页面内容分离；Playground 需要满高，单独一个外壳。
 *   标题在客户端导航时更新，首屏由预渲染脚本按路由写入静态 HTML。
 * @created 2026-11-02 00:50
 * @updated 2026-11-02 00:50
 */

import { useEffect, type ReactElement } from "react";
import { findDoc } from "./content/docs";
import { Footer } from "./layout/Footer";
import { Header } from "./layout/Header";
import { DocsPage } from "./pages/DocsPage";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { Playground } from "./pages/Playground";
import { usePath } from "./router";

const TITLE_SUFFIX = "md-engine";

/**
 * 按路径解析页面
 * @param path 当前路径
 * @returns 页面元素
 */
function renderPage(path: string): ReactElement {
  if (path === "/" || path === "") return <Home />;
  if (path === "/docs") return <DocsPage slug="" />;
  const docMatch = /^\/docs\/([\w-]+)$/.exec(path);
  if (docMatch) return <DocsPage slug={docMatch[1]} />;
  if (path === "/playground") return <Playground />;
  return <NotFound />;
}

/**
 * 页面标题
 * @param path 当前路径
 * @returns 标题文字
 */
function titleOf(path: string): string {
  if (path === "/") return `${TITLE_SUFFIX} · React 的 Markdown 内容引擎`;
  if (path === "/playground") return `Playground · ${TITLE_SUFFIX}`;
  if (path === "/docs") return `文档 · ${TITLE_SUFFIX}`;
  const docMatch = /^\/docs\/([\w-]+)$/.exec(path);
  if (docMatch) {
    const doc = findDoc(docMatch[1]);
    if (doc) return `${doc.title} · ${TITLE_SUFFIX}`;
  }
  return `页面不存在 · ${TITLE_SUFFIX}`;
}

/**
 * 应用根
 * @returns 站点
 */
export default function App(): ReactElement {
  const path = usePath();
  const isPlayground = path === "/playground";

  useEffect(() => {
    document.title = titleOf(path);
  }, [path]);

  if (isPlayground) {
    return (
      <>
        <Header />
        <Playground />
      </>
    );
  }

  return (
    <>
      <Header />
      {renderPage(path)}
      <Footer />
    </>
  );
}
