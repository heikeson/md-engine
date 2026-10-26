/**
 * @file dev/use-checks.ts
 * @description 每次文本变化跑一遍 parse + roundtrip，把诊断与往返一致性交给底栏展示。
 *   往返结论分三态：一致 / 与标注相符的已知差异 / 未预期的差异（回归）。
 * @created 2026-10-26 21:52
 * @updated 2026-10-26 21:57
 */

import { useMemo } from "react";
import { parse, roundtrip } from "../src/index";
import type { Diagnostic } from "../src/policy";
import type { RoundtripExpectation } from "./fixtures";

/** 往返结论 */
export type RoundtripStatus = "ok" | "expected-diff" | "unexpected-diff";

/** 一次校验的结果 */
export interface Checks {
  /** 策略层诊断（未闭合 / 超深度 / 非法协议） */
  diagnostics: Diagnostic[];
  /** 一次 parse + roundtrip 的耗时（ms） */
  durationMs: number;
  /** 往返结论 */
  roundtrip: RoundtripStatus;
  /** 首个差异的字符下标；一致时为 null */
  diffAt: number | null;
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
 * @param expect 当前样例的往返预期
 * @returns 诊断、耗时与往返结论
 */
export function useChecks(source: string, expect: RoundtripExpectation): Checks {
  return useMemo(() => {
    const started = performance.now();
    const { diagnostics } = parse(source);
    const diffAt = firstDiffIndex(source, roundtrip(source));
    return {
      diagnostics,
      durationMs: Math.round(performance.now() - started),
      roundtrip: resolveStatus(diffAt, expect),
      diffAt,
    };
  }, [source, expect]);
}

/**
 * 把「有无差异」与「预期」合成结论
 * @param diffAt 首个差异下标（null 表示一致）
 * @param expect 预期口径
 * @returns 三态结论
 */
function resolveStatus(diffAt: number | null, expect: RoundtripExpectation): RoundtripStatus {
  if (diffAt === null) return "ok";
  return expect === "known-diff" ? "expected-diff" : "unexpected-diff";
}
