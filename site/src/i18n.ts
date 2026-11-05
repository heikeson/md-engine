/**
 * @file 站点国际化（路由级）
 * @description 两件事：① 路径前缀与语言标识互转；② 站点自身 UI 文案字典。
 *   **默认语言（中文）不带前缀**，英文一律 `/en/...`——已有线上 URL 与索引因此不受影响。
 *   语言只由路由决定：URL 可分享、可索引、预渲染时已知，不存在首屏语言闪烁。
 * @created 2026-11-02 19:32
 * @updated 2026-11-05 23:52 首页文案改为陈述实现，去掉「Markdown 语法的一部分」与入口数量等夸大说法
 */

/** 站点支持的语言 */
export type SiteLocale = "zh-CN" | "en-US";

/** 全部语言（顺序即切换器顺序） */
export const SITE_LOCALES: readonly SiteLocale[] = ["zh-CN", "en-US"];

/** 默认语言：不带 URL 前缀 */
export const DEFAULT_SITE_LOCALE: SiteLocale = "zh-CN";

/** 英文前缀段 */
const EN_PREFIX = "/en";

/**
 * 判断是否为受支持的语言
 * @param value 候选值
 * @returns 是否受支持
 */
export function isSiteLocale(value: string): value is SiteLocale {
  return (SITE_LOCALES as readonly string[]).includes(value);
}

/**
 * 从原始路径拆出语言前缀
 * @param rawPath 原始路径，如 `/en/docs/x`
 * @returns 语言与去掉前缀后的路径（根为 `/`）
 */
export function splitLocale(rawPath: string): { locale: SiteLocale; path: string } {
  if (rawPath === EN_PREFIX) return { locale: "en-US", path: "/" };
  if (rawPath.startsWith(`${EN_PREFIX}/`)) {
    return { locale: "en-US", path: rawPath.slice(EN_PREFIX.length) };
  }
  return { locale: DEFAULT_SITE_LOCALE, path: rawPath || "/" };
}

/**
 * 给站内路径加语言前缀
 * @param path 逻辑路径（不含语言前缀），如 `/docs/x`
 * @param locale 目标语言
 * @returns 实际路径；默认语言原样返回
 * @description 只处理以 `/` 开头的站内路径，query / hash 原样保留。
 */
export function localePath(path: string, locale: SiteLocale): string {
  if (locale === DEFAULT_SITE_LOCALE) return path;
  if (!path.startsWith("/")) return path;
  if (path === "/") return EN_PREFIX;
  const hashIndex = path.search(/[?#]/);
  const clean = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const rest = hashIndex === -1 ? "" : path.slice(hashIndex);
  return `${EN_PREFIX}${clean}${rest}`;
}

/**
 * 计算「同一页面在另一种语言下的路径」
 * @param logicalPath 已去掉语言前缀的路径
 * @param target 目标语言
 * @returns 目标语言下的路径
 */
export function localePathIn(logicalPath: string, target: SiteLocale): string {
  return localePath(logicalPath, target);
}

/** 站点 UI 文案 */
export interface SiteMessages {
  /** 顶栏品牌链接的无障碍标签 */
  brandHomeLabel: string;
  themeToggle: string;
  openMenu: string;
  closeMenu: string;
  mainNav: string;
  /** 语言切换按钮的提示 */
  languageSwitch: string;
  /** 当前语言的显示名 */
  languageName: string;
  /** 切换到另一种语言的显示名 */
  languageOtherName: string;
  // —— 导航 ——
  navDocs: string;
  navPlayground: string;
  // —— 页脚 ——
  footerDocs: string;
  footerResources: string;
  footerConventions: string;
  footerQuickStart: string;
  footerSyntax: string;
  footerEditor: string;
  footerStyling: string;
  footerIssues: string;
  footerContract: string;
  footerLicense: string;
  // —— 文档页 ——
  docsCatalog: string;
  docsPager: string;
  docsPrev: string;
  docsNext: string;
  docsToc: string;
  // —— 通用 ——
  copy: string;
  copied: string;
  // —— 404 ——
  notFoundTitle: string;
  notFoundLead: string;
  notFoundHome: string;
  notFoundStart: string;
  // —— 页面标题 ——
  titleHome: string;
  titleDocs: string;
  titlePlayground: string;
  titleNotFound: string;
  // —— 首页 ——
  homeHeroTitle: string;
  /** 英文首页首段的纯文本版本（中文版含行内码，走独立分支） */
  homeHeroLead: string;
  homeHeroMeta: string;
  homeReadDocs: string;
  homeTryBrowser: string;
  homeRenderResult: string;
  homeContainerTitle: string;
  homeContainerNote: string;
  homeTheoryTag: string;
  homeTheoryAttrs: string;
  homeTheoryItems: string;
  homeTheoryNote: string;
  homePackTitle: string;
  homePackNote: string;
  homeCompareTitle: string;
  homeCompareNote: string;
  homeCompareMdx: string;
  homeCompareHere: string;
  homeCompareFoot: string;
  homeStartTitle: string;
  homeClosingBefore: string;
  homeClosingMiddle: string;
  homeClosingAfter: string;
  // —— Playground ——
  pgSamples: string;
  pgPickSample: string;
  pgShared: string;
  pgViews: string;
  pgSplit: string;
  pgSource: string;
  pgPreview: string;
  pgRoundtripOk: string;
  pgRoundtripDiff: string;
  pgShare: string;
  pgCopyAll: string;
  pgLoading: string;
  pgPlaceholder: string;
  pgSkeletonHint: string;
  pgBadLink: string;
  pgSharedNotice: string;
  pgCopyFail: string;
}

/** 中文文案 */
const zh: SiteMessages = {
  brandHomeLabel: "md-engine 首页",
  themeToggle: "切换亮暗主题",
  openMenu: "打开导航菜单",
  closeMenu: "关闭导航菜单",
  mainNav: "主导航",
  languageSwitch: "切换语言",
  languageName: "中文",
  languageOtherName: "English",
  navDocs: "文档",
  navPlayground: "Playground",
  footerDocs: "文档",
  footerResources: "资源",
  footerConventions: "约定",
  footerQuickStart: "快速开始",
  footerSyntax: "容器语法",
  footerEditor: "编辑器与图表",
  footerStyling: "样式与令牌",
  footerIssues: "问题反馈",
  footerContract: "对接契约",
  footerLicense: "MIT 许可",
  docsCatalog: "文档目录",
  docsPager: "上下篇",
  docsPrev: "上一篇",
  docsNext: "下一篇",
  docsToc: "本页目录",
  copy: "复制",
  copied: "已复制",
  notFoundTitle: "这一页不存在",
  notFoundLead: "链接可能来自旧版本，或者地址打错了一个字符。",
  notFoundHome: "回到首页",
  notFoundStart: "从快速开始读起",
  titleHome: "md-engine · React 的 Markdown 内容引擎",
  titleDocs: "文档 · md-engine",
  titlePlayground: "Playground · md-engine",
  titleNotFound: "页面不存在 · md-engine",
  homeHeroTitle: "把尖括号容器解析成 mdast 节点的 Markdown 引擎",
  homeHeroLead: "",
  homeHeroMeta: "React 19+ · 原生 CSS，不依赖 Tailwind · MIT",
  homeReadDocs: "读文档",
  homeTryBrowser: "在浏览器里试",
  homeRenderResult: "渲染结果",
  homeContainerTitle: "容器清单",
  homeContainerNote:
    "九个容器加一个通用 div。属性只能传字符串和裸布尔，子项写成嵌套标签，所以内容始终保持纯文本。",
  homeTheoryTag: "标签",
  homeTheoryAttrs: "属性",
  homeTheoryItems: "子项",
  homeTheoryNote: "说明",
  homePackTitle: "包里有什么",
  homePackNote:
    "入口按子路径分开导出：主入口不含编辑器代码，阅读页不会带上 CodeMirror；图表入口在未安装 mermaid 时降级为源码块。",
  homeCompareTitle: "和 MDX 的差别",
  homeCompareNote:
    "MDX 把正文编译成组件树，页面里写的是 JSX；这里容器是普通 mdast 节点，正文始终是文本。",
  homeCompareMdx: "MDX",
  homeCompareHere: "这里",
  homeCompareFoot:
    "限制：不支持表达式与自定义逻辑，属性仅接受字符串。需要动态内容时，在 React 层覆盖组件，而非在正文里写代码。",
  homeStartTitle: "开始使用",
  homeClosingBefore: "完整步骤见",
  homeClosingMiddle: "；想直接试改一段内容，打开",
  homeClosingAfter: "即可。",
  pgSamples: "样例",
  pgPickSample: "选择样例",
  pgShared: "分享内容",
  pgViews: "视图",
  pgSplit: "分屏",
  pgSource: "源码",
  pgPreview: "预览",
  pgRoundtripOk: "往返一致",
  pgRoundtripDiff: "存在差异",
  pgShare: "分享链接",
  pgCopyAll: "复制全文",
  pgLoading: "正在加载编辑器…",
  pgPlaceholder: "开始写 Markdown，容器可以直接敲尖括号…",
  pgSkeletonHint: "编辑器在浏览器里加载，首屏不承担 CodeMirror 的体积。",
  pgBadLink: "链接内容无法解析，已载入默认样例",
  pgSharedNotice: "链接已复制，包含当前全文",
  pgCopyFail: "复制失败，地址栏已更新",
};

/** 英文文案 */
const en: SiteMessages = {
  brandHomeLabel: "md-engine home",
  themeToggle: "Toggle light and dark theme",
  openMenu: "Open navigation menu",
  closeMenu: "Close navigation menu",
  mainNav: "Main navigation",
  languageSwitch: "Change language",
  languageName: "English",
  languageOtherName: "中文",
  navDocs: "Docs",
  navPlayground: "Playground",
  footerDocs: "Docs",
  footerResources: "Resources",
  footerConventions: "Conventions",
  footerQuickStart: "Quick start",
  footerSyntax: "Container syntax",
  footerEditor: "Editor and diagrams",
  footerStyling: "Styles and tokens",
  footerIssues: "Issues",
  footerContract: "Integration contract",
  footerLicense: "MIT license",
  docsCatalog: "Documentation",
  docsPager: "Previous and next",
  docsPrev: "Previous",
  docsNext: "Next",
  docsToc: "On this page",
  copy: "Copy",
  copied: "Copied",
  notFoundTitle: "This page does not exist",
  notFoundLead: "The link may be from an older version, or one character is off.",
  notFoundHome: "Back to home",
  notFoundStart: "Start with the quick start",
  titleHome: "md-engine · a Markdown content engine for React",
  titleDocs: "Docs · md-engine",
  titlePlayground: "Playground · md-engine",
  titleNotFound: "Page not found · md-engine",
  homeHeroTitle: "A Markdown engine that parses angle-bracket containers into mdast nodes",
  homeHeroLead:
    "Tags such as <Callout>, <Tabs> and <Mermaid> are parsed into mdast nodes, rendered as React components, and written back verbatim. Authors write Markdown, not JSX.",
  homeHeroMeta: "React 19+ · plain CSS, no Tailwind · MIT",
  homeReadDocs: "Read the docs",
  homeTryBrowser: "Try it in the browser",
  homeRenderResult: "Rendered",
  homeContainerTitle: "Containers",
  homeContainerNote:
    "Nine containers plus a generic div. Attributes accept strings and bare booleans only, children are nested tags, so the content stays plain text throughout.",
  homeTheoryTag: "Tag",
  homeTheoryAttrs: "Attributes",
  homeTheoryItems: "Children",
  homeTheoryNote: "Description",
  homePackTitle: "What is in the box",
  homePackNote:
    "Entries are split by subpath: the main entry contains no editor code, so reading pages do not carry CodeMirror; without mermaid installed, the diagram entry degrades to a source block.",
  homeCompareTitle: "How it differs from MDX",
  homeCompareNote:
    "MDX compiles prose into a component tree, so pages are written as JSX. Here containers are ordinary mdast nodes and the prose stays text.",
  homeCompareMdx: "MDX",
  homeCompareHere: "Here",
  homeCompareFoot:
    "Limits: no expressions or custom logic, attributes accept strings only. For dynamic behaviour, override components in React instead of writing code in prose.",
  homeStartTitle: "Get started",
  homeClosingBefore: "See the",
  homeClosingMiddle: "for the full steps; to edit something right away, open the",
  homeClosingAfter: ".",
  pgSamples: "Samples",
  pgPickSample: "Choose a sample",
  pgShared: "Shared content",
  pgViews: "View",
  pgSplit: "Split",
  pgSource: "Source",
  pgPreview: "Preview",
  pgRoundtripOk: "Round trip is lossless",
  pgRoundtripDiff: "Differences found",
  pgShare: "Share link",
  pgCopyAll: "Copy all",
  pgLoading: "Loading editor…",
  pgPlaceholder: "Start writing Markdown. Type an angle bracket to insert a container…",
  pgSkeletonHint: "The editor loads in the browser, so the first paint does not carry CodeMirror.",
  pgBadLink: "The shared link could not be decoded; the default sample was loaded",
  pgSharedNotice: "Link copied, including the current content",
  pgCopyFail: "Copy failed; the address bar has been updated",
};

/** 文案字典 */
export const SITE_MESSAGES: Readonly<Record<SiteLocale, SiteMessages>> = {
  "zh-CN": zh,
  "en-US": en,
};

/**
 * 取某语言的文案
 * @param locale 语言
 * @returns 文案字典
 */
export function messagesOf(locale: SiteLocale): SiteMessages {
  return SITE_MESSAGES[locale];
}
