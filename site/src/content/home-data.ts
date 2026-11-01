/**
 * @file 首页数据
 * @description 演示用的 Markdown 与表格数据。文案原则：只陈述产品做了什么，
 *   不写「五分钟」「零成本」这类承诺，也不做对仗句——页面上每一句都能被代码验证。
 * @created 2026-11-02 00:24
 * @updated 2026-11-02 02:05 重写文案与数据结构
 */

/** 安装命令 */
export const INSTALL = "npm i @heikeson/md-engine";

/** Hero 里源码那一栏的内容 */
export const HERO_MD = [
  '<Callout type="tip" title="提示">',
  "  容器里的内容照样是 Markdown，可以写 `行内码`、写列表。",
  "</Callout>",
  "",
  "<Tabs>",
  '  <Tab value="npm">npm i @heikeson/md-engine</Tab>',
  '  <Tab value="pnpm">pnpm add @heikeson/md-engine</Tab>',
  "</Tabs>",
].join("\n");

/** 容器清单：表格的每一行 */
export const ROWS = [
  { tag: "Callout", attrs: "type · title · icon", items: "—", note: "提示块，type 有 7 种" },
  { tag: "Tabs", attrs: "—", items: "Tab", note: "选项卡，value 是标签文案" },
  { tag: "Steps", attrs: "—", items: "Step", note: "分步说明，title 是步骤名" },
  { tag: "Cards", attrs: "—", items: "Card", note: "卡片组，子项可自闭合" },
  { tag: "Accordion", attrs: "—", items: "AccItem", note: "折叠面板，type 控默认开合" },
  { tag: "Files", attrs: "—", items: "Folder / File", note: "文件树，图标按扩展名匹配" },
  { tag: "TypeTable", attrs: "—", items: "TypeItem", note: "属性表" },
  { tag: "Image", attrs: "src · alt · align · width · caption · zoom", items: "—", note: "自闭合叶子" },
  { tag: "Mermaid", attrs: "title · height", items: "—", note: "容器体是原始文本" },
  { tag: "div", attrs: "class · id", items: "—", note: "通用分块，属性透传到 DOM" },
] as const;

/** 包结构演示：用 Files 渲染自己 */
export const PACK_MD = [
  "<Files>",
  '  <Folder name="dist" defaultOpen>',
  '    <File name="index.js" />',
  '    <File name="components/index.js" />',
  '    <File name="editor/index.js" />',
  '    <File name="mermaid/index.js" />',
  '    <File name="styles.css" />',
  "  </Folder>",
  "</Files>",
].join("\n");

/** 五个入口 */
export const ENTRIES = [
  { path: ".", desc: "解析、渲染、序列化、格式化", note: "阅读页" },
  { path: "./editor", desc: "MarkdownEditor，含 CodeMirror 与滚动同步", note: "后台写作" },
  { path: "./components", desc: "组件映射表，做单组件覆盖时取", note: "自定义" },
  { path: "./mermaid", desc: "交互式图表：缩放、源码切换、导出", note: "需要图表" },
  { path: "./styles.css", desc: "打包好的原生 CSS，引入一次就够", note: "必选" },
] as const;

/** MDX 写法 */
export const MDX_SAMPLE = [
  'import { Callout } from "@/ui";',
  "",
  "export default function Page() {",
  "  return (",
  '    <Callout type="tip" title="提示">',
  "      内容写成了组件树，保存时要过一遍编译。",
  "    </Callout>",
  "  );",
  "}",
].join("\n");

/** 这里的写法 */
export const MD_SAMPLE = [
  '<Callout type="tip" title="提示">',
  "  内容还是文本，存进数据库就是这段字符。",
  "</Callout>",
].join("\n");
