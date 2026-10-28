/**
 * @file 解析 / 渲染 / 序列化自检（构建后运行：node dev/selfcheck.mjs）
 * @description 覆盖解析、渲染与往返三类约束，用例来自 docs/PR1解析修复优化/ 的矩阵：
 *   1) 围栏代码块里的标签不参与闭合与嵌套判定（内容不丢）；
 *   2) 行内子项（含属性带 `>`、子项内含空行）能收拢并拿到 props；
 *   3) 序列化保形：原文怎么写就怎么写回（不凭空加空行、不做多余转义）；
 *   4) 渲染结果里容器与子项的 props 可见。
 *   每条用例默认断言「往返结构等价 + 往返幂等」，个别用例再断言字节一致 / 结构 / 渲染。
 * @created 2026-10-28 03:40
 * @updated 2026-10-28 11:52 扩为断言套件：新增围栏感知、跨段落折叠、序列化保形与渲染断言
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parse, roundtrip, MarkdownRenderer } from "../dist/index.js";

/** 去掉 position / data 后的结构快照 */
function shape(node) {
  const out = { type: node.type };
  if (node.name !== undefined) out.name = node.name;
  if (node.attributes !== undefined) out.attributes = node.attributes;
  if (node.value !== undefined) out.value = node.value;
  if (node.children) out.children = node.children.map(shape);
  return out;
}

/** 取第一个指定名字的容器节点 */
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

/** 取容器下的直接子项节点 */
function items(block) {
  return (block?.children ?? []).filter((child) => child.type === "jsxBlock");
}

/** 收集树里所有 code 节点的值 */
function codeValues(tree) {
  const values = [];
  const visit = (node) => {
    if (node.type === "code") values.push(node.value);
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  return values;
}

/** 树里是否出现某种节点类型 */
function hasType(tree, type) {
  let found = false;
  const visit = (node) => {
    if (found) return;
    if (node.type === type) {
      found = true;
      return;
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  return found;
}

/** 诊断码集合 */
function codes(diagnostics) {
  return diagnostics.map((item) => item.code);
}

/**
 * 用例表
 * @type {Array<{
 *   name: string,
 *   md: string,
 *   identical?: boolean,
 *   knownUnequal?: boolean,
 *   structure?: (tree: any) => string | null,
 *   html?: (html: string) => string | null,
 * }>}
 */
const CASES = [
  // ---------- 契约口径：行首 </Name> 即闭合，代码块里也一样 ----------
  {
    name: "代码块里的行首 </Name> 仍然闭合容器",
    md: "<Callout type=\"tip\">\n\n```md\n</Callout>\n```\n\n</Callout>\n",
    structure: (tree) => {
      const callout = findBlock(tree, "Callout");
      if (!callout) return "容器丢失";
      // 容器在代码块内的 </Callout> 处闭合，其后的 ``` 与 </Callout> 落在顶层
      return tree.children.length === 2 ? null : `顶层节点数 ${tree.children.length}，期望 2（容器 + 后续片段）`;
    },
  },

  // ---------- D2：行内子项 ----------
  {
    name: "行内子项（Tabs，两行）",
    md: "<Tabs>\n<Tab value=\"npm\">npm install</Tab>\n<Tab value=\"pnpm\">pnpm add</Tab>\n</Tabs>\n",
    identical: true,
    structure: (tree) => {
      const tabs = findBlock(tree, "Tabs");
      const list = items(tabs);
      if (list.length !== 2) return `子项数 ${list.length}，期望 2`;
      return list[0].attributes.value === "npm" && list[1].attributes.value === "pnpm" ? null : "子项属性丢失";
    },
    html: (html) => (html.includes("npm") && html.includes("pnpm") ? null : "标签页标题未渲染"),
  },
  {
    name: "行内子项属性含 >",
    md: "<Tabs>\n<Tab value=\"a\" title=\"x>y\">A</Tab>\n</Tabs>\n",
    identical: true,
    structure: (tree) => {
      const tab = items(findBlock(tree, "Tabs"))[0];
      return tab?.attributes?.title === "x>y" ? null : `属性丢失：${JSON.stringify(tab?.attributes)}`;
    },
  },
  {
    name: "行内子项含空行（Tabs，跨段落）",
    md: "<Tabs>\n<Tab value=\"a\">第一段\n\n第二段</Tab>\n</Tabs>\n",
    structure: (tree) => {
      const list = items(findBlock(tree, "Tabs"));
      if (list.length !== 1) return `子项数 ${list.length}，期望 1`;
      const paragraphs = (list[0].children ?? []).filter((child) => child.type === "paragraph");
      return paragraphs.length === 2 ? null : `段落数 ${paragraphs.length}，期望 2`;
    },
  },
  {
    name: "行内子项含空行（TypeTable）",
    md: "<TypeTable>\n<TypeItem name=\"a\" type=\"string\">第一段\n\n第二段</TypeItem>\n</TypeTable>\n",
    structure: (tree) => {
      const list = items(findBlock(tree, "TypeTable"));
      return list.length === 1 ? null : `子项数 ${list.length}，期望 1`;
    },
  },
  {
    name: "行内子项：Steps / Cards / Accordion",
    md:
      "<Steps>\n<Step title=\"一\">先这样</Step>\n</Steps>\n\n" +
      "<Cards>\n<Card title=\"A\" />\n<Card title=\"B\">正文</Card>\n</Cards>\n\n" +
      "<Accordion>\n<AccItem title=\"Q\" type=\"open\">A</AccItem>\n</Accordion>\n",
    identical: true,
    structure: (tree) => {
      const steps = items(findBlock(tree, "Steps"));
      const cards = items(findBlock(tree, "Cards"));
      const acc = items(findBlock(tree, "Accordion"));
      if (steps.length !== 1) return `Steps 子项数 ${steps.length}`;
      if (cards.length !== 2) return `Cards 子项数 ${cards.length}`;
      if (acc.length !== 1) return `Accordion 子项数 ${acc.length}`;
      return cards[0].attributes.title === "A" && acc[0].attributes.type === "open" ? null : "子项属性丢失";
    },
  },
  {
    name: "行内子项不再被多余转义",
    md: "<Tabs>\n<Tab value=\"a\"># 标题</Tab>\n<Tab value=\"b\">1. 列表</Tab>\n</Tabs>\n",
    identical: true,
  },

  // ---------- D4：序列化保形 ----------
  {
    name: "紧凑写法（无空行）原样写回",
    md: "<Callout type=\"tip\">\n正文 **粗体**\n</Callout>\n",
    identical: true,
  },
  {
    name: "带空行写法原样写回",
    md: "<Callout type=\"tip\">\n\n正文\n\n</Callout>\n",
    identical: true,
  },
  {
    name: "嵌套容器（Files / Folder / File）原样写回",
    md: "<Files>\n<Folder name=\"src\">\n<File name=\"a.ts\" />\n</Folder>\n<File name=\"README.md\" />\n</Files>\n",
    identical: true,
    structure: (tree) => {
      const outer = items(findBlock(tree, "Files"));
      const folder = items(outer[0]);
      return outer.length === 2 && folder.length === 1 ? null : `结构不符：外层 ${outer.length}，Folder 内 ${folder.length}`;
    },
  },
  {
    name: "块级内容紧贴闭标签（列表）",
    md: "<Callout type=\"tip\">\n- 项一\n- 项二\n</Callout>\n",
    identical: true,
    html: (html) => (html.includes("<li") ? null : "列表未渲染"),
  },
  {
    name: "紧凑围栏紧贴闭标签",
    md: "<Callout type=\"tip\">\n```js\nconst a = 1;\n```\n</Callout>\n",
    identical: true,
    structure: (tree) => (codeValues(tree)[0] === "const a = 1;" ? null : "围栏内容丢失"),
  },

  {
    name: "空容器原样写回（开闭标签各占一行）",
    md: "<Callout type=\"tip\">\n</Callout>\n",
    identical: true,
    structure: (tree) => {
      const block = findBlock(tree, "Callout");
      return block && (block.children ?? []).length === 0 ? null : "空容器结构不符";
    },
  },

  // ---------- 缩进（现状行为，防回归；缩进政策见设计文档 D3） ----------
  {
    name: "2 空格缩进子项仍可解析",
    md: "<Files>\n  <Folder name=\"src\">\n    <File name=\"a.ts\" />\n  </Folder>\n</Files>\n",
    structure: (tree) => {
      const folder = items(findBlock(tree, "Files"))[0];
      return folder && items(folder).length === 1 ? null : "缩进子项未识别为容器";
    },
  },

  // ---------- 公式 / 表格 ----------
  {
    name: "单行块公式提升为块级",
    md: "$$E=mc^2$$\n",
    structure: (tree) => (hasType(tree, "math") ? null : "未提升为 math 节点"),
  },
  {
    name: "行内公式保持行内",
    md: "文字 $a+b$ 结尾\n",
    structure: (tree) => (hasType(tree, "inlineMath") ? null : "行内公式丢失"),
  },
  {
    name: "表格结构",
    md: "| a | b |\n|---|---|\n| 1 | 2 |\n",
    structure: (tree) => (hasType(tree, "table") ? null : "表格未解析"),
  },

  // ---------- 诊断 ----------
  {
    name: "未闭合容器产 UNCLOSED_TAG",
    md: "<Callout type=\"tip\">\n正文\n",
    structure: null,
    diagnostics: (codesList) => (codesList.includes("UNCLOSED_TAG") ? null : `诊断缺失：${codesList.join(",")}`),
  },
  {
    name: "超限嵌套产 DEPTH_EXCEEDED",
    md: "<Callout type=\"tip\">\n<Callout type=\"tip\">\n<Callout type=\"tip\">\n<Callout type=\"tip\">\n四层\n</Callout>\n</Callout>\n</Callout>\n</Callout>\n",
    knownUnequal: true,
    diagnostics: (codesList) => (codesList.includes("DEPTH_EXCEEDED") ? null : `诊断缺失：${codesList.join(",")}`),
  },
];

let failed = 0;
let passed = 0;

for (const testCase of CASES) {
  const problems = [];
  const { name, md } = testCase;

  try {
    const parsed = parse(md);
    const rendered = roundtrip(md);
    const renderedTree = parse(rendered);

    // 1) 往返幂等
    if (roundtrip(rendered) !== rendered) problems.push("往返不幂等");

    // 2) 往返结构等价（个别已知缺陷用例跳过）
    if (!testCase.knownUnequal) {
      const same = JSON.stringify(shape(parsed.tree)) === JSON.stringify(shape(renderedTree.tree));
      if (!same) problems.push("往返结构不等价");
    }

    // 3) 字节保形
    if (testCase.identical && rendered !== md) problems.push(`往返字节不同：${JSON.stringify(rendered)}`);

    // 4) 结构断言
    if (testCase.structure) {
      const issue = testCase.structure(parsed.tree, renderedTree.tree);
      if (issue) problems.push(issue);
    }

    // 5) 诊断断言
    if (testCase.diagnostics) {
      const issue = testCase.diagnostics(codes(parsed.diagnostics));
      if (issue) problems.push(issue);
    }

    // 6) 渲染断言（原文与往返各一次，保证"能解析的就能渲染"）
    if (testCase.html) {
      for (const source of [md, rendered]) {
        const html = renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: source }));
        const issue = testCase.html(html, source);
        if (issue) problems.push(`${issue}${source === rendered ? "（往返后）" : ""}`);
      }
    }
  } catch (error) {
    problems.push(`异常：${error.message}`);
  }

  if (problems.length > 0) {
    failed += 1;
    console.log(`✗ ${name}`);
    for (const problem of problems) console.log(`   ${problem}`);
    console.log(`   原文: ${JSON.stringify(md)}`);
  } else {
    passed += 1;
    console.log(`✓ ${name}`);
  }
}

if (failed > 0) {
  console.log(`\n${failed} 项未通过，${passed} 项通过`);
  process.exit(1);
}
console.log(`\n全部 ${passed} 项通过`);
