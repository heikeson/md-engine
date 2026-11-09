/**
 * @file 编辑器文本动作（纯函数，无 DOM）
 * @description 编辑器只改 Markdown 文本，不维护第二份文档模型。这里提供三个基础动作：
 *   选区包裹、行首前缀切换、光标处插入。全部返回新文本与新选区，由调用方写回。
 * @created 2026-10-24 21:12
 * @updated 2026-10-24 21:12
 * @updated 2026-11-09 12:40 块级插入沿用当前行缩进，光标落到内容占位处（正文占位文字选中），不再停在闭标签之后
 */

/** 选区（全文 offset，end 不含） */
export interface Selection {
  start: number;
  end: number;
}

/** 动作结果 */
export interface EditResult {
  value: string;
  selection: Selection;
}

/**
 * 在选区两侧包裹标记（粗体 / 斜体 / 行内码等）
 * @param value 全文
 * @param selection 当前选区
 * @param before 前置标记
 * @param after 后置标记
 * @param placeholder 空选区时填充的占位文字
 * @returns 新文本与新选区（选中原来那段内容）
 */
export function wrapSelection(
  value: string,
  selection: Selection,
  before: string,
  after: string,
  placeholder = "文本",
): EditResult {
  const selected = value.slice(selection.start, selection.end) || placeholder;
  const next = value.slice(0, selection.start) + before + selected + after + value.slice(selection.end);
  const start = selection.start + before.length;
  return { value: next, selection: { start, end: start + selected.length } };
}

/**
 * 切换行首前缀（标题 / 引用 / 列表）
 * @description 选区内所有行都有该前缀则移除，否则统一加上（用于「再点一次取消」）
 * @param value 全文
 * @param selection 当前选区
 * @param prefix 行首前缀，如 `## `、`- `、`> `
 * @returns 新文本与新选区
 */
export function toggleLinePrefix(value: string, selection: Selection, prefix: string): EditResult {
  const lineStart = value.lastIndexOf("\n", selection.start - 1) + 1;
  const nextBreak = value.indexOf("\n", selection.end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const allHave = lines.every((line) => line.startsWith(prefix));
  const changed = lines
    .map((line) => (allHave ? line.slice(prefix.length) : prefix + line))
    .join("\n");
  const next = value.slice(0, lineStart) + changed + value.slice(lineEnd);
  return { value: next, selection: { start: lineStart, end: lineStart + changed.length } };
}

/**
 * 在光标处插入片段（字符级，用于行内内容）
 * @param value 全文
 * @param position 插入位置（通常为选区起点）
 * @param snippet 片段文本
 * @returns 新文本与光标位置（落在片段之后）
 */
export function insertAtCursor(value: string, position: number, snippet: string): EditResult {
  const next = value.slice(0, position) + snippet + value.slice(position);
  const cursor = position + snippet.length;
  return { value: next, selection: { start: cursor, end: cursor } };
}

/**
 * 取一行开头的缩进（空格或 tab）
 * @param line 行文本
 * @returns 行首空白；无缩进时为空串
 */
function leadingIndent(line: string): string {
  return /^[ \t]*/.exec(line)?.[0] ?? "";
}

/**
 * 给片段逐行加上缩进（空行不加）
 * @param snippet 片段文本
 * @param indent 缩进前缀
 * @returns 加好缩进的片段
 */
function indentSnippet(snippet: string, indent: string): string {
  if (indent === "") return snippet;
  return snippet
    .split("\n")
    .map((line) => (line === "" ? "" : indent + line))
    .join("\n");
}

/**
 * 求插入后光标/选区应落的位置（相对片段起点）
 * @param body 片段文本（已加缩进、以换行结尾）
 * @returns 选区：内容占位行只有一行正文时整段选中，其余情况是插入点
 * @description 光标不能停在 `</X>` 之后（那样续写会挂到闭标签同一行），要落到内容占位处：
 *   逐层穿过内层开标签，找到第一行正文；`<Files>` 这类骨架的第一行是自闭合子项，就停在那里。
 */
function contentSelection(body: string): Selection {
  const lines = body.split("\n");
  const starts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }
  // 只有开标签一行（自闭合片段，如 `<Image />`）：光标落在该行行末
  if (lines.length <= 2) {
    const end = starts[0] + (lines[0] ?? "").length;
    return { start: end, end };
  }

  for (let index = 1; index < lines.length; index += 1) {
    const text = lines[index] ?? "";
    const trimmed = text.trim();
    const at = starts[index] + leadingIndent(text).length;
    // 空行、闭合标签、自闭合子项：内容占位就到这里为止
    if (trimmed === "" || trimmed.startsWith("</") || trimmed.endsWith("/>")) {
      return { start: at, end: at };
    }
    if (trimmed.startsWith("<")) continue; // 内层开标签：继续往下找正文
    // 正文行：下一行就是闭合标签时整段选中，键入即替换占位文字
    const next = (lines[index + 1] ?? "").trim();
    return { start: at, end: next.startsWith("</") ? starts[index] + text.trimEnd().length : at };
  }

  const end = Math.max(0, body.length - 1);
  return { start: end, end };
}

/**
 * 在光标所在行插入块级片段（容器组件专用）
 * @description 容器是块级构造：与前后内容隔开空行、并按当前行缩进对齐。
 *   按字符插入会把 `<Callout>` 塞进行中间，导致整块解析失败或落到错误的层级；
 *   缩进同理——在列表项或容器内部插入时不带缩进会把整块提到列 0，容器直接被截断。
 * @param value 全文
 * @param position 光标位置（取其所在行的行首作为插入点）
 * @param snippet 片段文本（通常以换行结尾）
 * @returns 新文本与新选区（落在内容占位处，正文占位文字会被选中）
 */
export function insertBlockAt(value: string, position: number, snippet: string): EditResult {
  const lineStart = value.lastIndexOf("\n", position - 1) + 1;
  const before = value.slice(0, lineStart);
  const after = value.slice(lineStart);
  // 沿用当前行的缩进：列表项、容器内部插入时不自作主张顶格
  const indent = leadingIndent(after);

  // 前导：与上文之间留且只留一个空行
  const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  // 片段自身保证以换行结尾，并补齐当前行的缩进
  const body = indentSnippet(snippet.endsWith("\n") ? snippet : `${snippet}\n`, indent);
  // 尾部：后文不是空行时补一个，避免紧跟正文
  const tail = after === "" || after.startsWith("\n") ? "" : "\n";

  const inserted = lead + body + tail;
  const next = before + inserted + after;
  const caret = contentSelection(body);
  const base = before.length + lead.length;
  return { value: next, selection: { start: base + caret.start, end: base + caret.end } };
}
