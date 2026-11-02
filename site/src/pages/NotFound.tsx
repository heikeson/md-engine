/**
 * @file 404
 * @description 静态托管下深层链接打不到文件时也可能走到这里，所以给出回首页与查文档两条路。
 *   英文站暂无文档，因此只保留回首页一条路。
 * @created 2026-11-02 00:46
 * @updated 2026-11-02 00:46
 * @updated 2026-11-02 19:32 文案走字典；英文站隐藏文档入口
 */

import type { ReactElement } from "react";
import { docsOf } from "../content/docs";
import { messagesOf } from "../i18n";
import { Link, useLocalePath } from "../router";

/**
 * 未找到页面
 * @returns 404 视图
 */
export function NotFound(): ReactElement {
  const { locale } = useLocalePath();
  const messages = messagesOf(locale);
  const firstDoc = docsOf(locale)[0];

  return (
    <main className="notfound">
      <span className="nf-code">404</span>
      <h1 className="nf-title">{messages.notFoundTitle}</h1>
      <p className="nf-sub">{messages.notFoundLead}</p>
      <div className="nf-links">
        <Link className="btn btn-primary" href="/">
          {messages.notFoundHome}
        </Link>
        {firstDoc ? (
          <Link className="btn btn-ghost" href={`/docs/${firstDoc.slug}`}>
            {messages.notFoundStart}
          </Link>
        ) : null}
      </div>
    </main>
  );
}
