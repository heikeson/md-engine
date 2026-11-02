/**
 * @file 页脚
 * @description 版本与许可放左边，三列小链接放右边。不写品牌简介——
 *   页脚不是自我介绍的地方。版本号取自根 package.json（经共享模块），
 *   版权年份取「项目起始年–本年」区间，均避免写死后逐年/逐版过期。
 *   链接标签走站点文案字典，随路由语言切换。
 * @created 2026-11-02 00:08
 * @updated 2026-11-01 23:55 版本走共享模块；版权改为 2026–本年 区间
 * @updated 2026-11-02 19:32 文案走字典
 */

import type { ReactElement } from "react";
import { messagesOf } from "../i18n";
import { Link, useLocalePath } from "../router";
import { ENGINE_VERSION } from "../version";

/** 项目版权起始年，固定不变 */
const COPYRIGHT_BASE_YEAR = 2026;

/** 版权区间：起始年–本年；若仍是起始年则只显示一年，避免「2026–2026」冗余 */
const COPYRIGHT_RANGE: string =
  new Date().getFullYear() === COPYRIGHT_BASE_YEAR
    ? String(COPYRIGHT_BASE_YEAR)
    : `${COPYRIGHT_BASE_YEAR}–${new Date().getFullYear()}`;

/**
 * 页脚
 * @returns 站点底部
 */
export function Footer(): ReactElement {
  const { locale } = useLocalePath();
  const messages = messagesOf(locale);

  const columns = [
    {
      title: messages.footerDocs,
      links: [
        { label: messages.footerQuickStart, href: "/docs/quick-start" },
        { label: messages.footerSyntax, href: "/docs/syntax" },
        { label: messages.footerEditor, href: "/docs/editor" },
        { label: messages.footerStyling, href: "/docs/styling" },
      ],
    },
    {
      title: messages.footerResources,
      links: [
        { label: "npm", href: "https://www.npmjs.com/package/@heikeson/md-engine" },
        { label: "GitHub", href: "https://github.com/heikeson/md-engine" },
        { label: messages.footerIssues, href: "https://github.com/heikeson/md-engine/issues" },
      ],
    },
    {
      title: messages.footerConventions,
      links: [
        {
          label: messages.footerContract,
          href: "https://github.com/heikeson/md-engine/blob/main/%E5%AF%B9%E6%8E%A5%E5%A5%91%E7%BA%A6.md",
        },
        { label: messages.footerLicense, href: "https://github.com/heikeson/md-engine/blob/main/LICENSE" },
      ],
    },
  ];

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-meta">
          <span className="footer-title">md-engine</span>
          <code className="footer-version">v{ENGINE_VERSION}</code>
          <span>© {COPYRIGHT_RANGE} kesonoasis · powered by heikeson</span>
        </div>
        <div className="footer-cols">
          {columns.map((column) => (
            <div className="footer-col" key={column.title}>
              <span className="footer-col-title">{column.title}</span>
              {column.links.map((link) =>
                link.href.startsWith("http") ? (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.label} href={link.href}>
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
