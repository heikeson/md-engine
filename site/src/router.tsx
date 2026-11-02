/**
 * @file 极简路由（带语言前缀）
 * @description 官网只有个位数页面，不引入路由库：history API + popstate 足够，
 *   且服务端渲染时由 Provider 直接注入当前路径，客户端 hydrate 后接管。
 *   语言由路径前缀决定（默认语言无前缀、英文 `/en`）：`usePath` 返回**去掉前缀**的逻辑路径，
 *   `Link` 负责在渲染时补回前缀，因此页面代码不必到处判断语言。
 * @created 2026-11-01 23:34
 * @updated 2026-11-02 19:32 引入语言前缀：上下文同时提供 locale 与去前缀路径，Link 自动补前缀
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { DEFAULT_SITE_LOCALE, localePath, splitLocale, type SiteLocale } from "./i18n";

/** 路由状态：语言 + 去前缀路径 */
interface RouteState {
  locale: SiteLocale;
  path: string;
}

const RouteContext = createContext<RouteState>({ locale: DEFAULT_SITE_LOCALE, path: "/" });

/**
 * 路径提供者
 * @param props initialPath 服务端注入的初始路径（含语言前缀）；children 子树
 * @returns 提供当前路径与语言的上下文
 */
export function RouterProvider({
  initialPath,
  children,
}: {
  initialPath?: string;
  children: ReactNode;
}): ReactElement {
  const [rawPath, setRawPath] = useState<string>(
    () => initialPath ?? (typeof window === "undefined" ? "/" : window.location.pathname),
  );

  useEffect(() => {
    /** 浏览器前进后退时同步路径 */
    const sync = (): void => setRawPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const value = useMemo<RouteState>(() => splitLocale(rawPath), [rawPath]);

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

/**
 * 读取当前逻辑路径（已去掉语言前缀）
 * @returns 归一化的逻辑路径（无尾斜杠，根为 /）
 */
export function usePath(): string {
  return useContext(RouteContext).path;
}

/**
 * 读取当前语言与逻辑路径
 * @returns 语言与去前缀路径
 */
export function useLocalePath(): { locale: SiteLocale; path: string } {
  return useContext(RouteContext);
}

/**
 * 跳转（接收完整路径，含语言前缀）
 * @param to 目标路径
 * @param replace 是否替换当前历史记录
 * @returns 无
 */
export function navigate(to: string, replace = false): void {
  if (typeof window === "undefined") return;
  const current = window.location.pathname + window.location.search;
  if (current === to) return;
  if (replace) window.history.replaceState({}, "", to);
  else window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * 取"按当前语言跳转"的函数
 * @returns 接收逻辑路径的跳转函数
 * @description 传入 `/docs/x` 这类不含语言前缀的路径，内部补齐当前语言前缀。
 */
export function useNavigate(): (to: string, replace?: boolean) => void {
  const { locale } = useLocalePath();
  return useCallback(
    (to: string, replace = false): void => navigate(localePath(to, locale), replace),
    [locale],
  );
}

/** 站内链接属性 */
type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/**
 * 站内链接
 * @description 修饰键点击、外链与 target=_blank 交给浏览器原生行为，不拦截；
 *   `href` 传逻辑路径，渲染时自动补当前语言前缀。
 * @param props href 与其余 a 标签属性
 * @returns 锚点元素
 */
export function Link({ href, onClick, children, ...rest }: LinkProps): ReactElement {
  const { locale } = useLocalePath();
  const target = localePath(href, locale);

  const handle = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>): void => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.button !== 0) return;
      if (rest.target === "_blank" || /^https?:/.test(href)) return;
      event.preventDefault();
      navigate(target);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    },
    [href, onClick, rest.target, target],
  );

  return (
    <a href={target} onClick={handle} {...rest}>
      {children}
    </a>
  );
}

/**
 * 归一化路径：去掉尾斜杠与 index.html
 * @param raw 原始路径
 * @returns 归一化后的路径
 */
export function normalizePath(raw: string): string {
  let path = raw.split("?")[0].split("#")[0];
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path === "/index.html") return "/";
  return path || "/";
}
