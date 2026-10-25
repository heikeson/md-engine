/**
 * @file 卡片网格（`<Cards>` / `<Card>`）
 * @description 聚合内层 `<Card title="…" href="…" icon="…">` 为卡片：title 取自属性；
 *   href 存在时整卡可点击（`<a>` 包裹），否则为普通 div；icon 为短文本或 emoji，显示在标题左侧。
 *   属性值不经标准 Markdown 链接的协议白名单重写，故此处补渲染侧兜底（审计 4.3）。
 * @created 2026-09-03 21:54
 * @updated 2026-10-24 21:30 语法改为尖括号；新增 icon 支持
 */
"use client";

import { Children, isValidElement, type ReactNode } from "react";
import { cn } from "../internal/cn";
import { isSafeHref } from "../internal/url-policy";

/**
 * 卡片网格
 * @param children 内层 `<Card>` 元素集合
 */
export default function Cards({ children }: { children?: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <div className="cards">
      {items.map((el, i) => {
        const { title, href, icon, description, children: body } = el.props as {
          title?: string;
          href?: string;
          icon?: string;
          /** fumadocs 风格：无正文时可只写描述 */
          description?: string;
          children?: ReactNode;
        };
        // 属性未经外链白名单处理：协议不合规时降级为不可点击卡片，而不是原样输出 href
        const safeHref = href && isSafeHref(href) ? href : undefined;
        const cls = cn("card", safeHref && "card-link");
        const inner = (
          <>
            {title || icon ? (
              <div className="card-title">
                {icon ? (
                  <span className="card-icon" aria-hidden="true">
                    {icon}
                  </span>
                ) : null}
                {title}
              </div>
            ) : null}
            <div className="card-body">{body ?? description}</div>
          </>
        );
        return safeHref ? (
          <a key={i} href={safeHref} className={cls}>
            {inner}
          </a>
        ) : (
          <div key={i} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
