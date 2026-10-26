/**
 * @file dev/fixtures.ts
 * @description 样例文章清单：三篇覆盖容器全量、容错降级、常规语法，供下拉切换。
 *   每篇标注往返预期：`strict` 要求 `md → AST → md` 逐字一致；`known-diff` 表示该样例
 *   本身会触发降级或已知缺陷，底栏按「预期差异」呈现，不算回归。
 * @created 2026-10-26 21:52
 * @updated 2026-10-26 21:57
 */

import containers from "./fixtures/containers.md?raw";
import edgeCases from "./fixtures/edge-cases.md?raw";
import kitchenSink from "./fixtures/kitchen-sink.md?raw";
import realWorld from "./fixtures/real-world.md?raw";

/** 往返预期 */
export type RoundtripExpectation = "strict" | "known-diff";

/** 一篇样例文章 */
export interface Fixture {
  /** 唯一键，下拉框 value */
  id: string;
  /** 展示名 */
  label: string;
  /** Markdown 原文 */
  content: string;
  /** 往返预期口径 */
  roundtrip: RoundtripExpectation;
  /** 已知差异的说明（仅 known-diff 需要） */
  note?: string;
}

/** 全部样例文章 */
export const FIXTURES: readonly Fixture[] = [
  {
    id: "containers",
    label: "容器全量",
    content: containers,
    roundtrip: "strict",
  },
  {
    id: "edge-cases",
    label: "容错降级",
    content: edgeCases,
    roundtrip: "known-diff",
    note: "未闭合与超深嵌套会按设计降级，序列化必然与原文不同",
  },
  {
    id: "kitchen-sink",
    label: "常规语法",
    content: kitchenSink,
    roundtrip: "strict",
  },
  {
    id: "real-world",
    label: "真实文章",
    content: realWorld,
    roundtrip: "known-diff",
    note: "按自然写作习惯书写，容器内的空行会被序列化补全（内容不变）",
  },
];
