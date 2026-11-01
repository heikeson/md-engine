/**
 * @file 站点明暗订阅（客户端）
 * @description 判据是 `.dark` 类，但**不假设它只挂在 `<html>` 上**：站点主题可能挂在 body、
 *   某个布局容器，甚至只在局部区域切换（开发台就是 `<div class="dark">`）。
 *   因此按「从图表元素向上找最近的 `.dark`」判定，并订阅整棵树的 class 变化。
 * @created 2026-11-01 21:22
 * @updated 2026-11-01 22:37 支持容器级 `.dark`（不再只看 html），改用单例 MutationObserver
 */

"use client";

import { useEffect, useState, type RefObject } from "react";

/** 订阅者集合：一个 observer 服务所有图表，避免每图一个全局监听 */
const listeners = new Set<() => void>();

/** 共享的 MutationObserver */
let observer: MutationObserver | null = null;

/**
 * 广播 class 变化
 * @returns 无
 */
function notify(): void {
  for (const listener of listeners) listener();
}

/**
 * 订阅根元素及其子树的 class 变化
 * @param listener 变化回调
 * @returns 取消订阅函数
 */
function subscribe(listener: () => void): () => void {
  if (typeof MutationObserver !== "undefined" && !observer) {
    observer = new MutationObserver(notify);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
    });
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 当前是否处于暗色
 * @param element 图表元素（用于向上查找最近的 `.dark`）
 * @returns 是否为暗色；SSR 恒为 false
 */
function isDarkNow(element?: HTMLElement | null): boolean {
  if (typeof document === "undefined") return false;
  if (element && element.closest(".dark")) return true;
  return (
    document.documentElement.classList.contains("dark") || document.body.classList.contains("dark")
  );
}

/**
 * 跟随站点明暗
 * @param elementRef 图表容器（可选；不给则只看 html / body）
 * @returns 当前是否为暗色
 * @description 首帧返回 false 与服务端一致，避免水合不一致；挂载后立即按真实祖先链校正。
 */
export function useIsDark(elementRef?: RefObject<HTMLElement | null>): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const compute = (): void => setDark(isDarkNow(elementRef?.current ?? null));
    compute();
    return subscribe(compute);
  }, [elementRef]);

  return dark;
}
