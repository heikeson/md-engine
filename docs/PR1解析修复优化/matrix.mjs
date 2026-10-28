/**
 * @file docs/PR1解析修复优化/matrix.mjs
 * @description 全组件 × 多写法的解析/渲染/往返矩阵（只读探查，不改源码）。
 *   运行：npm run build 之后 `node docs/PR1解析修复优化/matrix.mjs`
 * @created 2026-10-28 11:24
 * @updated 2026-10-28 11:24
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parse, roundtrip, extractBlocks, MarkdownRenderer } from "../../dist/index.js";

/** 结构快照：去掉 position / data，只留语义 */
function shape(node) {
  const out = { type: node.type };
  if (node.name !== undefined) out.name = node.name;
  if (node.attributes !== undefined) out.attributes = node.attributes;
  if (node.value !== undefined) out.value = node.value;
  if (node.children) out.children = node.children.map(shape);
  return out;
}

/** 紧凑结构树：`jsxBlock(Tab){value}[paragraph[text:A]]` */
function compact(node) {
  const head = node.type + (node.name ? `(${node.name})` : "");
  const attrs = node.attributes && Object.keys(node.attributes).length ? `{${Object.entries(node.attributes).map(([k, v]) => `${k}=${v}`).join(",")}}` : "";
  const value = typeof node.value === "string" ? `:${node.value.replace(/\n/g, "⏎").slice(0, 18)}` : "";
  const inner = node.children && node.children.length ? `[${node.children.map(compact).join(",")}]` : "";
  return head + attrs + value + inner;
}

/** HTML 压缩为文本骨架，便于人眼比对 */
function skeleton(html) {
  return html
    .replace(/<div class="([^"]*)"/g, '<[$1]')
    .replace(/<button[^>]*>/g, "<btn>")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 容器内子项数量（blocks 索引口径） */
function itemCount(md) {
  const blocks = extractBlocks(parse(md).tree, md);
  const counts = [];
  const walk = (list) => {
    for (const block of list) {
      if (block.kind === "container") {
        counts.push(`${block.name}:${block.items.length}`);
        walk(block.blocks);
        for (const item of block.items) walk(item.blocks);
      }
    }
  };
  walk(blocks);
  return counts.join(",");
}

const CASES = {
  // ---------- Callout ----------
  "Callout 块写法": `<Callout type="tip" title="提示">\n\n正文 **粗**\n\n</Callout>`,
  "Callout 紧凑无空行": `<Callout type="tip">\n正文\n</Callout>`,
  "Callout 内容缩进2": `<Callout type="tip">\n  正文\n</Callout>`,
  "Callout 内容缩进4": `<Callout type="tip">\n    正文\n</Callout>`,
  "Callout 同行写法": `<Callout type="tip">正文</Callout>`,
  // ---------- Tabs ----------
  "Tabs 块写法": `<Tabs>\n\n<Tab value="npm">\n\nnpm install\n\n</Tab>\n\n<Tab value="pnpm">\n\npnpm add\n\n</Tab>\n\n</Tabs>`,
  "Tabs 紧凑": `<Tabs>\n<Tab value="npm">\n\nnpm install\n\n</Tab>\n<Tab value="pnpm">\n\npnpm add\n\n</Tab>\n</Tabs>`,
  "Tabs 行内子项": `<Tabs>\n<Tab value="npm">npm install</Tab>\n<Tab value="pnpm">pnpm add</Tab>\n</Tabs>`,
  "Tabs 行内子项缩进2": `<Tabs>\n  <Tab value="npm">npm install</Tab>\n  <Tab value="pnpm">pnpm add</Tab>\n</Tabs>`,
  "Tabs 行内子项缩进4": `<Tabs>\n    <Tab value="npm">npm install</Tab>\n    <Tab value="pnpm">pnpm add</Tab>\n</Tabs>`,
  "Tabs 行内+属性含>": `<Tabs>\n<Tab value="a" title="x>y">A</Tab>\n</Tabs>`,
  "Tabs 行内+空行": `<Tabs>\n<Tab value="a">第一段\n\n第二段</Tab>\n</Tabs>`,
  "Tabs 行内+多行": `<Tabs>\n<Tab value="a">第一行\n第二行</Tab>\n</Tabs>`,
  // ---------- Steps ----------
  "Steps 行内子项": `<Steps>\n<Step title="一">先这样</Step>\n<Step title="二">再那样</Step>\n</Steps>`,
  "Steps 紧凑": `<Steps>\n<Step title="一">\n\n先这样\n\n</Step>\n</Steps>`,
  // ---------- Cards ----------
  "Cards 自闭合": `<Cards>\n<Card title="A" description="a" href="/a" />\n</Cards>`,
  "Cards 行内": `<Cards>\n<Card title="B">正文</Card>\n</Cards>`,
  "Cards 缩进4内自闭合": `<Cards>\n    <Card title="A" description="a" />\n</Cards>`,
  // ---------- Accordion ----------
  "Accordion 行内": `<Accordion>\n<AccItem title="Q" type="open">A</AccItem>\n</Accordion>`,
  "Accordion 紧凑": `<Accordion>\n<AccItem title="Q">\n\nA\n\n</AccItem>\n</Accordion>`,
  // ---------- Files ----------
  "Files README 原样": `<Files>\n  <Folder name="src">\n    <File name="index.ts" />\n  </Folder>\n</Files>`,
  "Files 全部顶格": `<Files>\n<Folder name="src">\n<File name="a.ts" />\n</Folder>\n<File name="README.md" />\n</Files>`,
  "Files 正文+子项缩进": `<Files>\n  <Folder name="src">\n    说明文字\n    <File name="a.ts" />\n  </Folder>\n</Files>`,
  "Files 缩进8": `<Files>\n    <Folder name="src">\n        <File name="a.ts" />\n    </Folder>\n</Files>`,
  // ---------- TypeTable ----------
  "TypeTable 行内": `<TypeTable>\n<TypeItem name="content" type="string" required>内容</TypeItem>\n</TypeTable>`,
  "TypeTable 行内+空行": `<TypeTable>\n<TypeItem name="a" type="string">第一段\n\n第二段</TypeItem>\n</TypeTable>`,
  // ---------- Image ----------
  "Image 顶层": `<Image src="/a.png" alt="图" caption="说明" />`,
  "Image 在 Callout 内": `<Callout type="tip">\n<Image src="/a.png" alt="图" />\n</Callout>`,
  // ---------- 框架级 ----------
  "围栏代码含闭合标签": `<Callout type="tip">\n\n\`\`\`md\n</Callout>\n\`\`\`\n\n</Callout>`,
  "围栏代码含开标签": `<Callout type="tip">\n\n\`\`\`md\n<Callout>\n\`\`\`\n\n</Callout>`,
  "列表内容器": `- 列表项\n\n  <Files>\n    <Folder name="src">\n      <File name="a.ts" />\n    </Folder>\n  </Files>`,
  "同名嵌套 Folder": `<Files>\n<Folder name="a">\n<Folder name="b">\n<File name="x.ts" />\n</Folder>\n</Folder>\n</Files>`,
  "四层嵌套超限": `<Callout type="tip">\n<Callout type="tip">\n<Callout type="tip">\n<Callout type="tip">\n四层\n</Callout>\n</Callout>\n</Callout>\n</Callout>`,
  "未知标签 div": `<div class="x">\n正文\n</div>`,
  "未闭合容器": `<Callout type="tip">\n正文`,
  "CRLF 行尾": `<Tabs>\r\n<Tab value="a">A</Tab>\r\n</Tabs>`,
  "tab 缩进子项": `<Tabs>\n\t<Tab value="a">A</Tab>\n</Tabs>`,
  "正文混排行内容器": `前缀文字<Callout type="tip">正文</Callout>后缀`,
  "空容器": `<Callout type="tip">\n</Callout>`,
};

console.log("case\ttree\thtml\tblocks\trt-equivalent\trt-idempotent");
for (const [name, md] of Object.entries(CASES)) {
  let tree = "";
  let html = "";
  let blocks = "";
  let equiv = "";
  let idem = "";
  try {
    const parsed = parse(md);
    tree = compact(parsed.tree);
    blocks = itemCount(md);
    const once = roundtrip(md);
    const twice = roundtrip(once);
    equiv = JSON.stringify(shape(parse(once).tree)) === JSON.stringify(shape(parsed.tree)) ? "是" : "否";
    idem = twice === once ? "是" : "否";
    html = skeleton(renderToStaticMarkup(React.createElement(MarkdownRenderer, { content: md })));
  } catch (error) {
    tree = `ERROR ${error.message}`;
  }
  console.log(`${name}\t${tree}\t${html}\t${blocks}\t${equiv}\t${idem}`);
}
