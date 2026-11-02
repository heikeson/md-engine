/**
 * @file 首页
 * @description 结构按信息密度排：一句定位 + 一组源码/结果对照 + 一张语法表 + 包结构 + 与 MDX 的差别。
 *   没有 eyebrow、没有编号卡片、没有居中大 CTA——那些都在替读者做判断。
 * @created 2026-11-02 00:30
 * @updated 2026-11-02 02:12 重做版式与文案
 */

import type { ReactElement } from "react";
import { MarkdownRenderer } from "@heikeson/md-engine";
import { CodePanel, CopyButton } from "../components/CodeBlock";
import { highlight } from "../components/highlight";
import { SITE_RENDER_CONFIG } from "../components/render-config";
import {
  ENTRIES,
  HERO_MD,
  INSTALL,
  MD_SAMPLE,
  MDX_SAMPLE,
  PACK_MD,
  ROWS,
} from "../content/home-data";
import { Link } from "../router";

/**
 * 首页
 * @returns 首页全部区块
 */
export function Home(): ReactElement {
  return (
    <main className="home">
      <section className="hero">
        <h1 className="hero-title">尖括号容器，是 Markdown 语法的一部分</h1>
        <p className="hero-lead">
          把 <code>&lt;Callout&gt;</code>、<code>&lt;Tabs&gt;</code>、<code>&lt;Mermaid&gt;</code>
          这类标签解析成 mdast 节点，渲染成 React 组件，写回时逐字还原。作者只写 Markdown，不必接触 JSX。
        </p>

        <div className="install-line">
          <code>{INSTALL}</code>
          <CopyButton code={INSTALL} />
        </div>

        <p className="hero-meta">React 19+ · 原生 CSS，不依赖 Tailwind · MIT</p>

        <div className="hero-actions">
          <Link className="btn btn-primary" href="/docs/quick-start">
            读文档
          </Link>
          <Link className="btn btn-ghost" href="/playground">
            在浏览器里试
          </Link>
        </div>

        <div className="split-demo">
          <div className="split-col">
            <div className="split-bar">
              <span>article.md</span>
            </div>
            <pre className="split-code">
              <code dangerouslySetInnerHTML={{ __html: highlight(HERO_MD, "md") }} />
            </pre>
          </div>
          <div className="split-col">
            <div className="split-bar">
              <span>渲染结果</span>
            </div>
            <div className="split-render">
              <MarkdownRenderer content={HERO_MD} className="prose-site" config={SITE_RENDER_CONFIG} />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">容器清单</h2>
          <p className="section-note">
            九个容器加一个通用 div。属性只能传字符串和裸布尔，子项写成嵌套标签，所以内容始终保持纯文本。
          </p>
        </div>
        <div className="syntax-table">
          <div className="syntax-row syntax-head">
            <span>标签</span>
            <span>属性</span>
            <span>子项</span>
            <span>说明</span>
          </div>
          {ROWS.map((row) => (
            <div className="syntax-row" key={row.tag}>
              <code className="syntax-tag">{row.tag}</code>
              <span className="syntax-attrs" data-label="属性">{row.attrs}</span>
              <span className="syntax-items" data-label="子项">{row.items}</span>
              <span className="syntax-note" data-label="说明">{row.note}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">包里有什么</h2>
          <p className="section-note">
            五个入口分开打包。主入口不引编辑器，阅读页就不会带上 CodeMirror；不装 mermaid，产物里也没有图表代码。
          </p>
        </div>
        <div className="pack-grid">
          <div className="pack-visual">
            <MarkdownRenderer content={PACK_MD} className="prose-site" config={SITE_RENDER_CONFIG} />
          </div>
          <div className="pack-list">
            {ENTRIES.map((entry) => (
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
          <h2 className="section-title">和 MDX 的差别</h2>
          <p className="section-note">
            MDX 把内容编译成组件树，作者需要掌握 JSX，内容存回去要经过一次格式化。这里把容器当普通节点处理，内容从头到尾都是文本。
          </p>
        </div>
        <div className="compare-grid">
          <div className="compare-col">
            <span className="compare-label">MDX</span>
            <CodePanel code={MDX_SAMPLE} lang="tsx" title="page.tsx" />
          </div>
          <div className="compare-col">
            <span className="compare-label">这里</span>
            <CodePanel code={MD_SAMPLE} lang="md" title="article.md" />
          </div>
        </div>
        <p className="compare-foot">
          限制：不支持表达式与自定义逻辑，属性仅接受字符串。需要动态内容时，在 React 层覆盖组件，而非在正文里写代码。
        </p>
      </section>

      <section className="section closing">
        <h2 className="section-title">开始使用</h2>
        <div className="install-line">
          <code>{INSTALL}</code>
          <CopyButton code={INSTALL} />
        </div>
        <p className="closing-note">
          完整步骤见<Link href="/docs/quick-start">快速开始</Link>；想直接试改一段内容，打开
          <Link href="/playground">Playground</Link>即可。
        </p>
      </section>
    </main>
  );
}
