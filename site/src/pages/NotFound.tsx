/**
 * @file 404
 * @description 静态托管下深层链接打不到文件时也可能走到这里，所以给出回首页与查文档两条路。
 * @created 2026-11-02 00:46
 * @updated 2026-11-02 00:46
 */

import type { ReactElement } from "react";
import { DOCS } from "../content/docs";
import { Link } from "../router";

/**
 * 未找到页面
 * @returns 404 视图
 */
export function NotFound(): ReactElement {
  return (
    <main className="notfound">
      <span className="nf-code">404</span>
      <h1 className="nf-title">这一页不存在</h1>
      <p className="nf-sub">链接可能来自旧版本，或者地址打错了一个字符。</p>
      <div className="nf-links">
        <Link className="btn btn-primary" href="/">
          回到首页
        </Link>
        <Link className="btn btn-ghost" href={`/docs/${DOCS[0].slug}`}>
          从快速开始读起
        </Link>
      </div>
    </main>
  );
}
