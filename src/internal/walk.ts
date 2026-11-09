/**
 * @file mdast 遍历（统一递归口径）
 * @description 策略层与诊断层此前各写一套递归，每处都要重复
 *   `(node as { children?: RootContent[] }).children` 断言。这里收敛成一处，
 *   顺序与原有各处一致：先访问子节点，再递归它的子树（前序 DFS）。
 * @created 2026-11-09 10:20
 * @updated 2026-11-09 10:20
 */

import type { Root, RootContent } from "mdast";

/** 带 children 的节点（root 与任意 parent 的宽口径） */
interface MaybeParent {
  children?: RootContent[];
}

/**
 * 取节点的子节点
 * @param node mdast 节点
 * @returns 子节点数组；叶子节点返回 undefined
 */
export function childrenOf(node: Root | RootContent): RootContent[] | undefined {
  return (node as MaybeParent).children;
}

/**
 * 深度优先遍历所有后代节点（不含起始节点本身）
 * @param node 起始节点（通常是 root）
 * @param visit 对每个后代节点执行的回调
 * @description 遍历期间修改节点自身的 `data` 是安全的；增删 children 会改变遍历结果，
 *   需要重建子节点序列的场合（如深度裁剪）应自行实现递归。
 */
export function walkMdast(node: Root | RootContent, visit: (child: RootContent) => void): void {
  const children = childrenOf(node);
  if (!children) return;
  for (const child of children) {
    visit(child);
    walkMdast(child, visit);
  }
}
