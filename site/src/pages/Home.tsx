/**
 * @file 首页
 * @description 结构按信息密度排：一句定位 + 一组源码/结果对照 + 一张语法表 + 包结构 + 与 MDX 的差别。
 *   没有 eyebrow、没有编号卡片、没有居中大 CTA——那些都在替读者做判断。
 *   文案与演示数据按语言切换；中文首段的行内码保留独立分支，英文用纯文本版本。
 * @created 2026-11-02 00:30
 * @updated 2026-11-05 23:52 首段改为「标准 Markdown 之上的一层扩展」表述
 */

import type { ReactElement } from "react";
import { MarkdownRenderer } from "@heikeson/md-engine";
import { CodePanel, CopyButton } from "../components/CodeBlock";
import { highlight } from "../components/highlight";
import { SITE_RENDER_CONFIG } from "../components/render-config";
import {
  ENTRIES,
  ENTRIES_EN,
  HERO_MD,
  HERO_MD_EN,
  INSTALL,
  MD_SAMPLE,
  MD_SAMPLE_EN,
  MDX_SAMPLE,
  MDX_SAMPLE_EN,
  PACK_MD,
  ROWS,
  ROWS_EN,
} from "../content/home-data";
import { messagesOf } from "../i18n";
import { Link, useLocalePath } from "../router";

/**
 * 首页
 * @returns 首页全部区块
 */
export function Home(): ReactElement {
  const { locale } = useLocalePath();
  const messages = messagesOf(locale);
  const isZh = locale === "zh-CN";

  const heroMd = isZh ? HERO_MD : HERO_MD_EN;
  // 两套数据的字面量类型不同，显式收窄成同一结构，避免 map 的联合类型不可调用
  const rows: ReadonlyArray<{ tag: string; attrs: string; items: string; note: string }> = isZh
    ? ROWS
    : ROWS_EN;
  const entries: ReadonlyArray<{ path: string; desc: string; note: string }> = isZh
    ? ENTRIES
    : ENTRIES_EN;
  const mdxSample = isZh ? MDX_SAMPLE : MDX_SAMPLE_EN;
  const mdSample = isZh ? MD_SAMPLE : MD_SAMPLE_EN;

  return (
    <main className="home">
      <section className="hero">
        <h1 className="hero-title">{messages.homeHeroTitle}</h1>
        {isZh ? (
          <p className="hero-lead">
            在标准 Markdown（GFM + 数学公式）之上加一层尖括号容器：
            <code>&lt;Callout&gt;</code>、<code>&lt;Tabs&gt;</code>、<code>&lt;Mermaid&gt;</code>
            解析为 mdast 节点，渲染成 React 组件，<code>md → AST → md</code> 逐字一致。作者写 Markdown，不写 JSX。
          </p>
        ) : (
          <p className="hero-lead">{messages.homeHeroLead}</p>
        )}

        <div className="install-line">
          <code>{INSTALL}</code>
          <CopyButton code={INSTALL} />
        </div>

        <p className="hero-meta">{messages.homeHeroMeta}</p>

        <div className="hero-actions">
          <Link className="btn btn-primary" href="/docs/quick-start">
            {messages.homeReadDocs}
          </Link>
          <Link className="btn btn-ghost" href="/playground">
            {messages.homeTryBrowser}
          </Link>
        </div>

        <div className="split-demo">
          <div className="split-col">
            <div className="split-bar">
              <span>article.md</span>
            </div>
            <pre className="split-code">
              <code dangerouslySetInnerHTML={{ __html: highlight(heroMd, "md") }} />
            </pre>
          </div>
          <div className="split-col">
            <div className="split-bar">
              <span>{messages.homeRenderResult}</span>
            </div>
            <div className="split-render">
              <MarkdownRenderer content={heroMd} className="prose-site" config={SITE_RENDER_CONFIG} />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">{messages.homeContainerTitle}</h2>
          <p className="section-note">{messages.homeContainerNote}</p>
        </div>
        <div className="syntax-table">
          <div className="syntax-row syntax-head">
            <span>{messages.homeTheoryTag}</span>
            <span>{messages.homeTheoryAttrs}</span>
            <span>{messages.homeTheoryItems}</span>
            <span>{messages.homeTheoryNote}</span>
          </div>
          {rows.map((row) => (
            <div className="syntax-row" key={row.tag}>
              <code className="syntax-tag">{row.tag}</code>
              <span className="syntax-attrs" data-label={messages.homeTheoryAttrs}>
                {row.attrs}
              </span>
              <span className="syntax-items" data-label={messages.homeTheoryItems}>
                {row.items}
              </span>
              <span className="syntax-note" data-label={messages.homeTheoryNote}>
                {row.note}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">{messages.homePackTitle}</h2>
          <p className="section-note">{messages.homePackNote}</p>
        </div>
        <div className="pack-grid">
          <div className="pack-visual">
            <MarkdownRenderer content={PACK_MD} className="prose-site" config={SITE_RENDER_CONFIG} />
          </div>
          <div className="pack-list">
            {entries.map((entry) => (
              <div className="pack-item" key={entry.path}>
                <code className="pack-path">{entry.path}</code>
                <span className="pack-desc">{entry.desc}</span>
                <span className="pack-note">{entry.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">{messages.homeCompareTitle}</h2>
          <p className="section-note">{messages.homeCompareNote}</p>
        </div>
        <div className="compare-grid">
          <div className="compare-col">
            <span className="compare-label">{messages.homeCompareMdx}</span>
            <CodePanel code={mdxSample} lang="tsx" title="page.tsx" />
          </div>
          <div className="compare-col">
            <span className="compare-label">{messages.homeCompareHere}</span>
            <CodePanel code={mdSample} lang="md" title="article.md" />
          </div>
        </div>
        <p className="compare-foot">{messages.homeCompareFoot}</p>
      </section>

      <section className="section closing">
        <h2 className="section-title">{messages.homeStartTitle}</h2>
        <div className="install-line">
          <code>{INSTALL}</code>
          <CopyButton code={INSTALL} />
        </div>
        <p className="closing-note">
          {messages.homeClosingBefore}
          <Link href="/docs/quick-start">{messages.footerQuickStart}</Link>
          {messages.homeClosingMiddle}
          <Link href="/playground">{messages.navPlayground}</Link>
          {messages.homeClosingAfter}
        </p>
      </section>
    </main>
  );
}
