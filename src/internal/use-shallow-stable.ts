/**
 * @file 引用不稳定 props 的浅比较稳定化
 * @description 宿主常以内联对象/数组传 `components`、`remarkPlugins` 等配置
 *   （README 示例即如此），每次渲染都是新引用，会击穿渲染器的 useMemo 导致整条
 *   unified 管线重建。本 hook 在浅层等价时保持旧引用，让 memo 依赖真正稳定。
 *   语义上等价于 useMemo 的依赖比较，ref 写入仅用于"与上次比较"，不参与渲染输出。
 * @created 2026-11-02 10:32
 * @updated 2026-11-02 10:32
 */

import { useRef } from "react";

/**
 * 浅比较两个对象/数组（一层，Object.is）
 * @param a 前值
 * @param b 后值
 * @returns 是否等价
 */
function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const key of ka) {
    if (!Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  return true;
}

/**
 * 值浅层等价时返回上一次引用
 * @param value 本次渲染收到的值（可为 undefined）
 * @returns 稳定化后的值
 */
export function useShallowStable<T>(value: T): T {
  const ref = useRef<T>(value);
  if (shallowEqual(ref.current, value)) return ref.current;
  ref.current = value;
  return value;
}
