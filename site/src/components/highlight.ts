/**
 * @file 轻量语法高亮
 * @description 引擎不负责着色，只把源码写进 `data-code-raw` / `data-code-lang`，
 *   官网自己补这一层。刻意不用 shiki：它的体积与异步初始化对「打开文档页就要看到颜色」
 *   不划算。这里用单趟正则切 token，同一函数在服务端与客户端产出完全一致，不会 hydration 失配。
 * @created 2026-11-01 23:52
 * @updated 2026-11-01 23:52
 */

/** 需要着色的语言别名 → 规则集 */
const LANG_ALIAS: Readonly<Record<string, string>> = {
  js: "js",
  jsx: "js",
  ts: "js",
  tsx: "js",
  javascript: "js",
  typescript: "js",
  json: "json",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  css: "css",
  html: "html",
  md: "md",
  markdown: "md",
};

const KEYWORDS = [
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "import", "from", "export", "default", "interface", "type", "extends", "new",
  "class", "async", "await", "throw", "try", "catch", "finally", "null",
  "undefined", "true", "false", "void", "as", "of", "in", "this", "readonly",
  "typeof", "instanceof", "switch", "case", "break", "continue", "delete",
];

/** HTML 转义：高亮结果要作为 innerHTML 注入，必须先转义再插标签 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 包裹一个 token */
function span(cls: string, text: string): string {
  return `<span class="tok-${cls}">${escapeHtml(text)}</span>`;
}

/** JS / TS / TSX 规则：注释、字符串、模板串、数字、关键字、JSX 标签 */
const JS_RULE =
  /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(\d+(?:\.\d+)?)\b|\b(const|let|var|function|return|if|else|for|while|import|from|export|default|interface|type|extends|new|class|async|await|throw|try|catch|finally|null|undefined|true|false|void|as|of|in|this|readonly|typeof|instanceof)\b|(<\/?[A-Za-z][\w.:-]*)/g;

/** JSON 规则：键、字符串、数字、字面量 */
const JSON_RULE = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|\b(-?\d+(?:\.\d+)?)\b/g;

/** 通用高亮：沿正则扫描，未命中的片段按纯文本转义输出 */
function scan(
  code: string,
  rule: RegExp,
  classify: (match: RegExpExecArray) => string,
): string {
  let out = "";
  let last = 0;
  rule.lastIndex = 0;
  let match: RegExpExecArray | null = rule.exec(code);
  while (match) {
    if (match.index > last) out += escapeHtml(code.slice(last, match.index));
    out += classify(match);
    last = match.index + match[0].length;
    match = rule.exec(code);
  }
  out += escapeHtml(code.slice(last));
  return out;
}

/** JS 系分类 */
function classifyJs(match: RegExpExecArray): string {
  if (match[1]) return span("comment", match[1]);
  if (match[2]) return span("string", match[2]);
  if (match[3]) return span("number", match[3]);
  if (match[4]) return span("keyword", match[4]);
  if (match[5]) return span("tag", match[5]);
  return escapeHtml(match[0]);
}

/** Bash 分类：注释、字符串、旗标、命令 */
function highlightBash(code: string): string {
  return code.split("\n").map((line) => {
    if (line.trimStart().startsWith("#")) return span("comment", line);
    const parts = line.split(/(\s+)/);
    return parts
      .map((part, index) => {
        if (!part) return "";
        if (part.startsWith("--") || part.startsWith("-")) return span("keyword", part);
        if (index === 0 && /^[a-z][\w-]*$/.test(part)) return span("tag", part);
        if (/^".*"$/.test(part) || /^'.*'$/.test(part)) return span("string", part);
        return escapeHtml(part);
      })
      .join("");
  }).join("\n");
}

/** CSS 分类：注释、选择器行、属性名、值 */
function highlightCss(code: string): string {
  return code.split("\n").map((line) => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("//")) {
      return span("comment", line);
    }
    const decl = /^(\s*)(--?[\w-]+)(\s*:\s*)(.+?)(;?)$/.exec(line);
    if (decl) {
      return `${escapeHtml(decl[1])}${span("keyword", decl[2])}${escapeHtml(decl[3])}${span("string", decl[4])}${escapeHtml(decl[5])}`;
    }
    return escapeHtml(line);
  }).join("\n");
}

/** HTML 分类：标签名、属性名、属性值、注释 */
function highlightHtml(code: string): string {
  const rule = /(<!--[\s\S]*?-->)|(<\/?)([\w-]+)|([\w-]+)=("(?:[^"]*)"|'(?:[^']*)')/g;
  let out = "";
  let last = 0;
  let match: RegExpExecArray | null = rule.exec(code);
  while (match) {
    if (match.index > last) out += escapeHtml(code.slice(last, match.index));
    if (match[1]) out += span("comment", match[1]);
    else if (match[3]) out += `${escapeHtml(match[2])}${span("tag", match[3])}`;
    else if (match[4]) out += `${span("keyword", match[4])}=${span("string", match[5])}`;
    last = match.index + match[0].length;
    match = rule.exec(code);
  }
  out += escapeHtml(code.slice(last));
  return out;
}

/** Markdown 分类：围栏、标题、行内码、强调、链接 */
function highlightMd(code: string): string {
  return code.split("\n").map((line) => {
    if (/^\s*```/.test(line)) return span("comment", line);
    const heading = /^(#{1,6}\s.*)$/.exec(line);
    if (heading) return span("keyword", heading[1]);
    if (/^\s*>/.test(line)) return span("comment", line);
    if (/^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line)) return span("tag", line);
    return escapeHtml(line);
  }).join("\n");
}

/**
 * 高亮一段源码
 * @param code 源码原文
 * @param lang 语言标识（围栏后写的那个词）
 * @returns 可直接注入 innerHTML 的 HTML 字符串
 */
export function highlight(code: string, lang?: string): string {
  const kind = LANG_ALIAS[(lang ?? "").toLowerCase()] ?? "text";
  switch (kind) {
    case "js":
      return scan(code, new RegExp(JS_RULE.source, "g"), classifyJs);
    case "json":
      return scan(code, new RegExp(JSON_RULE.source, "g"), (m) => {
        if (m[1]) return span(m[2] ? "keyword" : "string", m[1]) + (m[2] ? escapeHtml(m[2]) : "");
        if (m[3]) return span("number", m[3]);
        if (m[4]) return span("number", m[4]);
        return escapeHtml(m[0]);
      });
    case "bash":
      return highlightBash(code);
    case "css":
      return highlightCss(code);
    case "html":
      return highlightHtml(code);
    case "md":
      return highlightMd(code);
    default:
      return escapeHtml(code);
  }
}

/**
 * 语言显示名
 * @param lang 语言标识
 * @returns 展示用的大写标签
 */
export function langLabel(lang?: string): string {
  const kind = LANG_ALIAS[(lang ?? "").toLowerCase()] ?? "text";
  if (kind === "text") return "TEXT";
  return kind.toUpperCase();
}

export { KEYWORDS };
