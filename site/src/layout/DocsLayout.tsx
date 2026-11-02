/**
 * @file 文档页外壳
 * @description 三栏：左侧分组目录、中间正文、右侧本页目录。
 *   正文由引擎渲染 Markdown，站点只负责外壳——文档页因此同时是一次回归测试：
 *   某个容器被改坏，这里立刻看得见。
 * @created 2026-11-02 00:12
 * @updated 2026-11-02 00:12
 */

import { useState, type ReactElement } from "react";
import { MarkdownRenderer } from "@heikeson/md-engine";
import { SITE_RENDER_CONFIG } from "../components/render-config";
import { DOCS, GROUP_ORDER, docNeighbors, type DocEntry } from "../content/docs";
import { collectToc } from "../lib/toc";
import { Link } from "../router";

/**
 * 文档页
 * @param props doc 当前文档
 * @returns 文档页布局
 */
export function DocsLayout({ doc }: { doc: DocEntry }): ReactElement {
  const toc = collectToc(doc.body);
  const { prev, next } = docNeighbors(doc.slug);
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="docs-shell">
      <aside className="docs-sidebar">
        <button
          type="button"
          className="docs-nav-toggle"
          aria-expanded={navOpen}
          aria-controls="docs-nav"
          onClick={() => setNavOpen((open) => !open)}
        >
          文档目录
          <svg
            className="docs-nav-caret"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
        <nav
          id="docs-nav"
          className={`docs-nav${navOpen ? " is-open" : ""}`}
          aria-label="文档目录"
        >
          {GROUP_ORDER.map((group) => {
            const items = DOCS.filter((item) => item.group === group);
            if (!items.length) return null;
            return (
              <div className="side-group" key={group}>
                <span className="side-group-title">{group}</span>
                {items.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/docs/${item.slug}`}
                    className={`side-link${item.slug === doc.slug ? " is-active" : ""}`}
                    onClick={() => setNavOpen(false)}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      <article className="doc-main">
        <header className="doc-head">
          <span className="doc-eyebrow">{doc.group}</span>
          <h1 className="doc-title">{doc.title}</h1>
          <p className="doc-summary">{doc.summary}</p>
        </header>

        <MarkdownRenderer content={doc.body} className="prose-site doc-prose" config={SITE_RENDER_CONFIG} />

        <nav className="doc-pager" aria-label="上下篇">
          {prev ? (
            <Link className="pager-card" href={`/docs/${prev.slug}`}>
              <span className="pager-label">上一篇</span>
              <span className="pager-title">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link className="pager-card pager-next" href={`/docs/${next.slug}`}>
              <span className="pager-label">下一篇</span>
              <span className="pager-title">{next.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>

      <aside className="doc-toc">
        <span className="toc-title">本页目录</span>
        <ul className="toc-list">
          {toc.map((item) => (
            <li key={item.id} className={`toc-item toc-level-${item.level}`}>
              <a href={`#${item.id}`}>{item.text}</a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
