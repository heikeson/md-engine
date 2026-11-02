/**
 * @file 站点顶栏
 * @description 标识 + 导航 + 主题切换，右侧不挂安装按钮——安装命令在首屏和收尾各出现一次就够了。
 *   品牌后的版本号取自共享模块（根 package.json），与页脚同源。
 * @created 2026-11-02 00:05
 * @updated 2026-11-01 23:55 品牌版本号改读共享模块，去掉硬编码 0.4.0
 */

import { useEffect, useRef, useState, type ReactElement } from "react";
import { Link, usePath } from "../router";
import { toggleTheme } from "../theme";
import { ENGINE_VERSION } from "../version";

/**
 * 主题切换按钮
 * @description 两个图标都由 CSS 控制显隐（`.dark` 祖先作用域），
 *   不在 JS 里判断主题，否则服务端与客户端首帧必然不一致。
 * @returns 按钮
 */
function ThemeToggle(): ReactElement {
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => toggleTheme()}
      aria-label="切换亮暗主题"
      title="切换亮暗主题"
    >
      <svg className="icon-sun" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
      </svg>
      <svg className="icon-moon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}

/**
 * 顶栏
 * @returns 站点头部
 */
export function Header(): ReactElement {
  const path = usePath();
  const isDocs = path.startsWith("/docs");
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // 菜单展开时：点击外部或按 Esc 关闭
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: PointerEvent): void => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const navLinks = (
    <>
      <Link
        href="/docs"
        className={`nav-link${isDocs ? " is-active" : ""}`}
        onClick={() => setMenuOpen(false)}
      >
        文档
      </Link>
      <Link
        href="/playground"
        className={`nav-link${path === "/playground" ? " is-active" : ""}`}
        onClick={() => setMenuOpen(false)}
      >
        Playground
      </Link>
      <a
        className="nav-link"
        href="https://www.npmjs.com/package/@heikeson/md-engine"
        target="_blank"
        rel="noreferrer"
        onClick={() => setMenuOpen(false)}
      >
        npm
      </a>
      <a
        className="nav-link"
        href="https://github.com/heikeson/md-engine"
        target="_blank"
        rel="noreferrer"
        onClick={() => setMenuOpen(false)}
      >
        GitHub
      </a>
    </>
  );

  return (
    <header className="site-header" ref={headerRef}>
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="md-engine 首页">
          <span className="brand-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 6.5 3.5 12l5 5.5M15.5 6.5 20.5 12l-5 5.5" />
            </svg>
          </span>
          <span>md-engine</span>
          <span className="brand-version">{ENGINE_VERSION}</span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            {menuOpen ? (
              <path d="M6 6l12 12M18 6 6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>

        <nav
          id="site-nav"
          className={`site-nav${menuOpen ? " is-open" : ""}`}
          aria-label="主导航"
        >
          {navLinks}
        </nav>

        <div className="header-actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
