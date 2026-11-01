/**
 * @file 主题切换
 * @description 亮暗由 `<html>` 上的 `dark` 类决定：引擎令牌与站点样式都挂在祖先作用域上，
 *   所以只改一个类名，组件、图表、代码块同时切换。
 *   初始值由 index.html 的内联脚本在首帧前写入，避免闪白；图标显隐交给 CSS，不做 JS 分支，
 *   否则服务端与客户端首次渲染必然不一致。
 * @created 2026-11-01 23:38
 * @updated 2026-11-01 23:38
 */

const STORAGE_KEY = "md-engine-theme";

/** 读取当前是否暗色 */
export function isDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/**
 * 切换主题并持久化
 * @returns 切换后是否为暗色
 */
export function toggleTheme(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  const next = !root.classList.contains("dark");
  root.classList.toggle("dark", next);
  root.classList.toggle("theme-light", !next);
  root.style.colorScheme = next ? "dark" : "light";
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  } catch {
    /* 隐私模式下写入失败不影响本次切换 */
  }
  return next;
}
