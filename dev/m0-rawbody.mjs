/**
 * @file M0 原型验证：rawBody（路线 B）三条断言
 * @description 构建后运行：node dev/m0-rawbody.mjs
 *   验证方案 2.4 的三条断言：
 *   1) 行首标记不污染切片：`#`、`-`、`---`、`-->` 与普通正文原样进 data.rawBody；
 *   2) 截断可诊断：行内出现 `</Mermaid>` 字面量不截断，顶格出现时不吞内容；
 *   3) 不回归：往返逐字一致，既有容器行为不变（另由 selfcheck 覆盖）。
 * @created 2026-11-01 21:10
 * @updated 2026-11-01 21:10
 */

import { parse, roundtrip } from "../dist/index.js";

/** 断言结果收集 */
const results = [];

/**
 * 记录一条断言
 * @param name 断言名
 * @param pass 是否通过
 * @param detail 失败时附带的实际值
 * @returns 无
 */
function check(name, pass, detail) {
  results.push({ name, pass, detail });
}

/**
 * 往返文本比较：忽略文末换行的增删
 * @description `mdast-util-to-markdown` 总会在文末补一个换行，用例原文是否自带换行
 *   属于写法差异而非内容差异，不能据此判失败。
 * @param a 文本 A
 * @param b 文本 B
 * @returns 去除尾部换行后是否相等
 */
function sameText(a, b) {
  return a.replace(/\n+$/, "") === b.replace(/\n+$/, "");
}

/**
 * 取树里第一个指定名字的容器节点
 * @param tree mdast 根
 * @param name 组件名
 * @returns 节点或 null
 */
function findBlock(tree, name) {
  let found = null;
  const visit = (node) => {
    if (found) return;
    if (node.type === "jsxBlock" && node.name === name) {
      found = node;
      return;
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  return found;
}

// ── 断言 1：行首标记不污染切片 ────────────────────────────────
const CASE_MARKS = `<Mermaid title="请求流程" height="480">
# 这不是标题
- 这不是列表
---
graph TD
  A[开始] --> B{判断}
  B -->|是| C[执行]
</Mermaid>`;

const marked = findBlock(parse(CASE_MARKS).tree, "Mermaid");
const raw = marked?.data?.rawBody ?? "";
const mustKeep = [
  "# 这不是标题",
  "- 这不是列表",
  "---",
  "graph TD",
  "  A[开始] --> B{判断}",
  "  B -->|是| C[执行]",
];
check(
  "1a 行首标记全部原样保留",
  mustKeep.every((line) => raw.includes(line)),
  raw,
);
check("1b 子节点被清空", (marked?.children ?? []).length === 0, marked?.children);
check("1c 属性照常解析", marked?.attributes?.title === "请求流程" && marked?.attributes?.height === "480", marked?.attributes);
check("1d 往返逐字一致", sameText(roundtrip(CASE_MARKS), CASE_MARKS), roundtrip(CASE_MARKS));
check("1e 往返幂等", roundtrip(roundtrip(CASE_MARKS)) === roundtrip(CASE_MARKS), roundtrip(roundtrip(CASE_MARKS)));

// ── 断言 2：闭合标签字面量与提前闭合 ──────────────────────────
const CASE_INLINE_CLOSE = `<Mermaid>
graph TD
  A[提示 </Mermaid> 字面量] --> B
</Mermaid>`;
const inlineClose = findBlock(parse(CASE_INLINE_CLOSE).tree, "Mermaid");
check(
  "2a 行内 `</Mermaid>` 字面量不截断",
  (inlineClose?.data?.rawBody ?? "").includes("字面量"),
  inlineClose?.data?.rawBody,
);
check("2b 行内字面量往返无损", sameText(roundtrip(CASE_INLINE_CLOSE), CASE_INLINE_CLOSE), roundtrip(CASE_INLINE_CLOSE));

const CASE_EARLY = `<Mermaid>
graph TD
</Mermaid>
这段是容器外正文，不能被吞掉。
`;
const earlyTree = parse(CASE_EARLY).tree;
const early = findBlock(earlyTree, "Mermaid");
const keptAfter = JSON.stringify(earlyTree).includes("容器外正文");
check("2c 提前闭合并未吞掉后续正文", keptAfter, early?.data?.rawBody);
check("2d 提前闭合时容器体只到首个闭合行", (early?.data?.rawBody ?? "").includes("graph TD"), early?.data?.rawBody);

// ── 断言 2 附：自闭合与未闭合 ─────────────────────────────────
const empty = findBlock(parse("<Mermaid />").tree, "Mermaid");
check("2e 自闭合产出空源码", empty?.data?.rawBody === "" && empty?.selfClosing === true, empty?.data);

const UNCLOSED = "<Mermaid>\ngraph TD\n  A --> B\n";
const unclosed = findBlock(parse(UNCLOSED).tree, "Mermaid");
check("2f 未闭合容器保留全部源码", (unclosed?.data?.rawBody ?? "").includes("A --> B"), unclosed?.data?.rawBody);
check("2g 未闭合往返不擅自补闭合", roundtrip(UNCLOSED) === UNCLOSED, roundtrip(UNCLOSED));

// ── 输出 ─────────────────────────────────────────────────────
let failed = 0;
for (const item of results) {
  if (!item.pass) failed += 1;
  const detail = item.pass ? "" : `\n     实际：${JSON.stringify(item.detail)}`;
  console.log(`${item.pass ? "PASS" : "FAIL"}  ${item.name}${detail}`);
}
console.log(`\n${results.length - failed}/${results.length} 通过`);
process.exitCode = failed === 0 ? 0 : 1;
