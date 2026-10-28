/**
 * @file 解析/序列化自检（构建后运行：node dev/selfcheck.mjs）
 * @description 覆盖三类回归：行内子项收拢、容器内缩进、单行块公式提升。
 *   判据统一为「parse(x) 与 parse(roundtrip(x)) 结构等价」——比逐字比对更能反映真实约束，
 *   因为空行与表格分隔符本来就允许被规范化。
 * @created 2026-10-28 03:40
 * @updated 2026-10-28 03:40
 */

import { parse, roundtrip } from "../dist/index.js";

/** 去掉 position / data 后的结构快照，用于比较语义是否一致 */
function shape(node) {
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "position" || key === "data") continue;
    out[key] = Array.isArray(value) ? value.map((item) => (item && typeof item === "object" ? shape(item) : item)) : value;
  }
  return out;
}

/** 用例：名称 → Markdown */
const CASES = {
  "Tabs 行内子项": `<Tabs>\n  <Tab value="npm">npm install</Tab>\n  <Tab value="pnpm">pnpm add</Tab>\n</Tabs>`,
  "Steps 行内子项": `<Steps>\n  <Step title="一">先这样</Step>\n  <Step title="二">再那样</Step>\n</Steps>`,
  "Cards 自闭合 + 行内": `<Cards>\n  <Card title="A" description="a" href="/a" />\n  <Card title="B">正文</Card>\n</Cards>`,
  "Accordion 行内子项": `<Accordion>\n  <AccItem title="Q" type="open">A</AccItem>\n</Accordion>`,
  "TypeTable 行内子项": `<TypeTable>\n  <TypeItem name="content" type="string" required>内容</TypeItem>\n</TypeTable>`,
  "Files 缩进 4": `<Files>\n  <Folder name="src">\n    <File name="a.ts" />\n    <File name="b.ts" href="/b" />\n  </Folder>\n  <File name="README.md" />\n</Files>`,
  "Callout 基础": `<Callout type="warn" title="注意">\n正文 **粗体**\n</Callout>`,
  "单行块公式": `$$E=mc^2$$`,
  "三行块公式": `$$\nE=mc^2\n$$`,
  "行内公式": `文字 $a+b$ 结尾`,
  "表格": `| a | b |\n|---|---|\n| 1 | 2 |\n`,
};

let failed = 0;

for (const [name, md] of Object.entries(CASES)) {
  const before = shape(parse(md).tree);
  const once = roundtrip(md);
  const after = shape(parse(once).tree);
  const stable = roundtrip(once) === once;
  const same = JSON.stringify(before) === JSON.stringify(after);
  if (!same || !stable) {
    failed += 1;
    console.log(`✗ ${name}  结构等价=${same} 幂等=${stable}`);
    console.log(`  原文: ${JSON.stringify(md)}`);
    console.log(`  往返: ${JSON.stringify(once)}`);
  } else {
    console.log(`✓ ${name}`);
  }
}

/** 缩进容器里每个子项都应成为 jsxBlock，而不是 code */
const tree = parse(CASES["Files 缩进 4"]).tree;
const folder = tree.children[0]?.children?.[0];
const filesOk = folder?.name === "Folder" && folder.children.every((child) => child.type === "jsxBlock");
if (!filesOk) {
  failed += 1;
  console.log("✗ Files 缩进 4：Folder 子项未全部识别为 jsxBlock");
}

if (failed > 0) {
  console.log(`\n${failed} 项未通过`);
  process.exit(1);
}
console.log(`\n全部 ${Object.keys(CASES).length} 项通过`);
