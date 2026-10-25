/**
 * @file 类名合并工具（包内自带）
 * @description 引擎包不能依赖宿主的 `@/lib/utils` 路径别名，故在此自备一份：
 *   clsx 负责条件拼接，tailwind-merge 负责消除同组冲突类。
 * @created 2026-10-24 20:10
 * @updated 2026-10-24 20:10
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并类名并消除冲突
 * @param inputs 类名、对象或数组形式的条件类名
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
