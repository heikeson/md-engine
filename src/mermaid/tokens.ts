/**
 * @file 图表配色：设计令牌 → mermaid 主题变量（纯函数）
 * @description 只做"字符串进、字符串出"的映射，不读 DOM、不引 React，便于单测与复用。
 *   变量清单自宿主站点既有实现平移（含 ER 属性行、饼图 12 扇区、甘特任务条等派生型变量的
 *   逐个点名覆盖）——这些变量不显式给值就会回落到 mermaid 预设的深色/白色，暗色下不可读。
 * @created 2026-11-01 21:20
 * @updated 2026-11-01 22:31 兜底色值改为薄荷系（与 styles/tokens.css 默认值一致）
 * @updated 2026-11-01 22:37 兜底色值改为跟随宿主语义色（不再写死薄荷）
 * @updated 2026-11-01 22:51 内置亮/暗两套配色 + configureChartTheme（零宿主依赖）
 */

/** 图表可用的设计令牌（由调用方从 `--lkes-chart-*` 计算值取来） */
export interface ChartTokens {
  /** 图表底板 */
  bg: string;
  /** 图表文字 */
  fg: string;
  /** 节点 / 分支面 */
  node: string;
  /** 节点描边 */
  nodeBorder: string;
  /** 连线 */
  line: string;
  /** 序列色（至少 6 个，用于扇区与分支） */
  series: readonly string[];
  /** 正文字体栈（SVG 内文字不支持 inherit，必须给具体值） */
  fontFamily: string;
}

/** mermaid 配置（不引 mermaid 类型，避免可选依赖在类型层也被强制安装） */
export type MermaidConfigLike = Record<string, unknown>;

/** 内置亮色配色（引擎自带，不读宿主任何变量） */
export const LIGHT_TOKENS: ChartTokens = {
  bg: "#ffffff",
  fg: "#1f2937",
  node: "#e7f0ea",
  nodeBorder: "#c9d8cf",
  line: "#9aa8a0",
  series: ["#01c4b6", "#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#fb923c"],
  fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
};

/** 内置暗色配色（引擎自带） */
export const DARK_TOKENS: ChartTokens = {
  bg: "#161c22",
  fg: "#e8eef2",
  node: "#1e3037",
  nodeBorder: "#2f4a52",
  line: "#7a8a92",
  series: ["#19d3c5", "#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#fb923c"],
  fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
};

/** 亮暗两套配色 */
export interface ChartTheme {
  /** 亮色 */
  light: ChartTokens;
  /** 暗色 */
  dark: ChartTokens;
}

/** 默认配色：安装后不配置也能直接用 */
export const DEFAULT_CHART_THEME: ChartTheme = { light: LIGHT_TOKENS, dark: DARK_TOKENS };

/** 使用方显式配置的配色；null 表示使用内置默认 */
let configuredTheme: ChartTheme | null = null;

/**
 * 配置图表配色（安装时调一次即可）
 * @param theme 只想改其中一项时只传那一项，其余沿用默认
 * @returns 合并后的完整配色
 * @description JS 侧配置优先级最高；配置后再改 CSS 变量不会影响图表 SVG 的取色。
 */
export function configureChartTheme(theme: Partial<ChartTheme>): ChartTheme {
  configuredTheme = {
    light: { ...DEFAULT_CHART_THEME.light, ...(theme.light ?? {}) },
    dark: { ...DEFAULT_CHART_THEME.dark, ...(theme.dark ?? {}) },
  };
  return configuredTheme;
}

/**
 * 取当前生效的配色
 * @returns 使用方配置的或内置默认的完整配色
 */
export function getChartTheme(): ChartTheme {
  return configuredTheme ?? DEFAULT_CHART_THEME;
}

/**
 * 是否已由使用方显式配置
 * @returns 配置过返回 true
 * @description 供取色逻辑决定"以 JS 配置为准"还是"读 CSS 变量"。
 */
export function hasCustomChartTheme(): boolean {
  return configuredTheme !== null;
}

/**
 * 复位为内置默认配色
 * @returns 无
 */
export function resetChartTheme(): void {
  configuredTheme = null;
}

/** 令牌键 → mermaid 变量名（页面/节点/文字/线四类） */
const VAR_TOKENS: Record<string, keyof Omit<ChartTokens, "series" | "fontFamily">> = {
  primaryColor: "node",
  mainBkg: "node",
  nodeBkg: "node",
  actorBkg: "node",
  stateBkg: "node",
  rectBkgColor: "node",
  compositeTitleBackground: "node",
  compositeBackground: "bg",
  secondaryColor: "node",
  tertiaryColor: "node",
  clusterBkg: "node",
  activationBkgColor: "node",
  labelBoxBkgColor: "node",
  primaryBorderColor: "nodeBorder",
  nodeBorder: "nodeBorder",
  actorBorder: "nodeBorder",
  compositeBorder: "line",
  clusterBorder: "line",
  border1: "line",
  border2: "line",
  labelBoxBorderColor: "line",
  noteBorderColor: "line",
  taskBorderColor: "line",
  activationBorderColor: "line",
  doneTaskBorderColor: "line",
  primaryTextColor: "fg",
  textColor: "fg",
  nodeTextColor: "fg",
  titleColor: "fg",
  actorTextColor: "fg",
  stateLabelColor: "fg",
  signalTextColor: "fg",
  labelTextColor: "fg",
  loopTextColor: "fg",
  transitionLabelColor: "fg",
  classText: "fg",
  taskTextColor: "fg",
  taskTextLightColor: "fg",
  taskTextDarkColor: "fg",
  taskTextOutsideColor: "fg",
  pieTitleTextColor: "fg",
  pieLegendTextColor: "fg",
  pieStrokeColor: "bg",
  lineColor: "line",
  defaultLinkColor: "line",
  arrowheadColor: "line",
  transitionColor: "line",
  signalColor: "line",
  actorLineColor: "line",
  gridColor: "line",
  vertLineColor: "line",
  specialStateColor: "line",
  innerEndBackground: "line",
  noteBkgColor: "node",
  noteTextColor: "fg",
  edgeLabelBackground: "bg",
  sequenceNumberColor: "bg",
  sectionBkgColor: "node",
  sectionBkgColor2: "node",
  altSectionBkgColor: "node",
  altBackground: "node",
  taskBkgColor: "node",
  activeTaskBkgColor: "node",
  doneTaskBkgColor: "node",
  excludeBkgColor: "node",
  rowOdd: "node",
  rowEven: "bg",
  attributeBackgroundColorOdd: "node",
  attributeBackgroundColorEven: "bg",
};

/** 取序列色（越界时循环取，保证 12 扇区不越界） */
function seriesAt(tokens: ChartTokens, index: number): string {
  const list = tokens.series.length > 0 ? tokens.series : LIGHT_TOKENS.series;
  return list[index % list.length] as string;
}

/**
 * 6 色错位循环：相邻扇区不同色（1,4,2,5,3,6…）
 * @param tokens 令牌
 * @param index 扇区序号（0 起）
 * @returns 颜色值
 */
function pieColor(tokens: ChartTokens, index: number): string {
  const half = Math.max(1, Math.floor(tokens.series.length / 2));
  const offset = index % 2 === 0 ? index / 2 : half + Math.floor(index / 2);
  return seriesAt(tokens, offset);
}

/**
 * 构建 mermaid `themeVariables`
 * @param tokens 设计令牌取值
 * @returns mermaid 主题变量表
 */
export function buildThemeVariables(tokens: ChartTokens): Record<string, string | boolean> {
  const vars: Record<string, string | boolean> = {
    // 图底透明：页面正文底即图底，避免出现与页面不同色的矩形；项目规范禁用渐变
    background: "transparent",
    fontSize: "16px",
    useGradient: false,
    fontFamily: tokens.fontFamily,
  };
  for (const [name, key] of Object.entries(VAR_TOKENS)) vars[name] = tokens[key];
  // 甘特：主色描边、今天线与里程碑用序列末色（对应宿主 destructive 的位置）
  vars.activeTaskBorderColor = seriesAt(tokens, 0);
  vars.todayLineColor = seriesAt(tokens, tokens.series.length - 1);
  vars.critBkgColor = seriesAt(tokens, tokens.series.length - 1);
  vars.critBorderColor = seriesAt(tokens, tokens.series.length - 1);
  vars.taskTextClickableColor = seriesAt(tokens, 0);
  // 分类色阶与饼图：cScale0..11 与 pie1..12 必须逐个给值，否则由主色派生会几乎同色
  vars.fillType0 = tokens.bg;
  vars.fillType1 = tokens.node;
  for (let i = 0; i < 12; i += 1) {
    vars[`cScale${i}`] = pieColor(tokens, i);
    vars[`pie${i + 1}`] = pieColor(tokens, i);
    if (i >= 2 && i < 8) vars[`fillType${i}`] = pieColor(tokens, i);
  }
  return vars;
}

/**
 * 构建 mermaid 初始化配置
 * @param tokens 设计令牌取值
 * @returns `mermaid.initialize` 参数
 * @description `securityLevel` 固定为 `strict`：禁用图表源码里的 HTML 标签与点击事件，
 *   与宿主安全审计结论一致，不随调用方改变。
 */
export function buildMermaidConfig(tokens: ChartTokens): MermaidConfigLike {
  return {
    startOnLoad: false,
    theme: "base",
    securityLevel: "strict",
    // 文本一律用 SVG <text>，不用 <foreignObject>：
    // ① 净化时（DOMPurify svg profile）foreignObject 里的 HTML 会被清空 —— 表现为"图有线没字"；
    // ② Canvas 不绘制 foreignObject —— 导出 PNG 必空白。
    htmlLabels: false,
    themeVariables: buildThemeVariables(tokens),
    fontFamily: tokens.fontFamily,
    flowchart: { useMaxWidth: true, htmlLabels: false },
    sequence: { useMaxWidth: true, htmlLabels: false },
    state: { useMaxWidth: true },
    er: { useMaxWidth: true },
    class: { useMaxWidth: true, htmlLabels: false },
    gantt: { useMaxWidth: true },
  };
}

/**
 * 令牌指纹（用于渲染缓存键）
 * @param tokens 设计令牌取值
 * @returns 稳定字符串
 */
export function tokenFingerprint(tokens: ChartTokens): string {
  return [tokens.bg, tokens.fg, tokens.node, tokens.nodeBorder, tokens.line, tokens.series.join(","), tokens.fontFamily].join("|");
}
