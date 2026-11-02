/**
 * @file 文档页
 * @description 按 slug 取文档；找不到走 404。`/docs` 落下当前语言的第一篇文章，
 *   避免一个空壳首页——侧边栏第一项高亮，路径仍保持 /docs。
 * @created 2026-11-02 00:46
 * @updated 2026-11-02 00:46
 * @updated 2026-11-02 20:18 按当前语言取文档
 */

import type { ReactElement } from "react";
import { docsOf, findDoc } from "../content/docs";
import { DocsLayout } from "../layout/DocsLayout";
import { useLocalePath } from "../router";
import { NotFound } from "./NotFound";

/**
 * 文档页
 * @param props slug 路由段；空串表示 /docs
 * @returns 文档页或 404
 */
export function DocsPage({ slug }: { slug: string }): ReactElement {
  const { locale } = useLocalePath();
  const doc = slug ? findDoc(slug, locale) : docsOf(locale)[0];
  if (!doc) return <NotFound />;
  return <DocsLayout doc={doc} />;
}
