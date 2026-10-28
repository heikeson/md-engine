/**
 * @file dev/use-checks.ts
 * @description 每次文本变化跑一遍 parse + roundtrip，把诊断与往返结论交给底栏展示。
 *   往返结论分四态：字节一致 / 结构一致但文本被规范化 / 样例已标注的已知差异 / 结构不一致（疑似回归）。
 *   之所以不再用「有字节差异即回归」：缩进代码块写回成围栏这类规范化不改变语义，
 *   判成回归会让底栏一直报红，反而掩盖真正的回归。
 * @created 2026-10-26 21:52
 * @updated 2026-10-28 12:20 判据改为「结构等价」优先：字节差异但结构一致时归为规范化，不再报回归
 */

import { useMemo } from "react";
import { parse, roundtrip } from "../src/index";
import type { Diagnostic } from "../src/policy";
import type { RoundtripExpectation } from "./fixtures";

/** 往返结论 */
export type RoundtripStatus = "ok" | "normalized" | "expected-diff" | "regressed";

/** 一次校验的结果 */
export interface Checks {
  /** 策略层诊断（未闭合 / 超深度 / 非法协议 / 缩进被当代码块） */
  diagnostics: Diagnostic[];
  /** 一次 parse + roundtrip 的耗时（ms） */
  durationMs: number;
  /** 往返结论 */
  roundtrip: RoundtripStatus;
  /** 首个字节差异的字符下标；一致时为 null */
  diffAt: number | null;
}

/**
 * 结构快照：去掉 position 与 data，只留类型 / 名字 / 属性 / 文本
 * @param node mdast 节点
 * @returns 可序列化比较的快照
 */
function shape(node: unknown): unknown {
  const source = node as {
    type?: string;
    name?: string;
    attributes?: unknown;
    value?: unknown;
    children?: unknown[];
  };
  const out: Record<string, unknown> = { type: source.type };
  if (source.name !== undefined) out.name = source.name;
  if (source.attributes !== undefined) out.attributes = source.attributes;
  if (source.value !== undefined) out.value = source.value;
  if (source.children) out.children = source.children.map(shape);
  return out;
}

/**
 * 找出两段文本首个不同字符的位置
 * @param a 原文
 * @param b 序列化结果
 * @returns 首个差异下标；完全相同返回 null
 */
function firstDiffIndex(a: string, b: string): number | null {
  const max = Math.min(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    if (a[i] !== b[i]) return i;
  }
  return a.length === b.length ? null : max;
}

/**
 * 计算当前文本的校验结果
 * @param source Markdown 原文
 * @param expect 当前样例的往返预期（strict 表示要求结构等价）
 * @returns 诊断、耗时与往返结论
 */
export function useChecks(source: string, expect: RoundtripExpectation): Checks {
  return useMemo(() => {
    const started = performance.now();
    const parsed = parse(source);
    const serialized = roundtrip(source);
    const diffAt = firstDiffIndex(source, serialized);

    let status: RoundtripStatus;
    if (diffAt === null) {
      status = "ok";
    } else {
      // 结构等价 → 只是文本形态被规范化（例如缩进代码块写成围栏），不算回归
      const after = parse(serialized);
      const same = JSON.stringify(shape(parsed.tree)) === JSON.stringify(shape(after.tree));
      status = same ? "normalized" : expect === "known-diff" ? "expected-diff" : "regressed";
    }

    return {
      diagnostics: parsed.diagnostics,
      durationMs: Math.round(performance.now() - started),
      roundtrip: status,
      diffAt,
    };
  }, [source, expect]);
}
