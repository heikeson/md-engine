/**
 * @file 极简路由
 * @description 官网只有个位数页面，不引入路由库：history API + popstate 足够，
 *   且服务端渲染时由 Provider 直接注入当前路径，客户端 hydrate 后接管。
 * @created 2026-11-01 23:34
 * @updated 2026-11-01 23:34
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

const PathContext = createContext<string>("/");

/**
 * 路径提供者
 * @param props initialPath 服务端注入的初始路径；children 子树
 * @returns 提供当前路径的上下文
 */
export function RouterProvider({
  initialPath,
  children,
}: {
  initialPath?: string;
  children: ReactNode;
}): ReactElement {
  const [path, setPath] = useState<string>(
    () => initialPath ?? (typeof window === "undefined" ? "/" : window.location.pathname),
  );

  useEffect(() => {
    /** 浏览器前进后退时同步路径 */
    const sync = (): void => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  return <PathContext.Provider value={path}>{children}</PathContext.Provider>;
}

/**
 * 读取当前路径
 * @returns 已归一化的路径（无尾斜杠，根为 /）
 */
export function usePath(): string {
  return useContext(PathContext);
}

/**
 * 跳转
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

/** 站内链接属性 */
type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/**
 * 站内链接
 * @description 修饰键点击、外链与 target=_blank 交给浏览器原生行为，不拦截
 * @param props href 与其余 a 标签属性
 * @returns 锚点元素
 */
export function Link({ href, onClick, children, ...rest }: LinkProps): ReactElement {
  const handle = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>): void => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.button !== 0) return;
      if (rest.target === "_blank" || /^https?:/.test(href)) return;
      event.preventDefault();
      navigate(href);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    },
    [href, onClick, rest.target],
  );

  return (
    <a href={href} onClick={handle} {...rest}>
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
