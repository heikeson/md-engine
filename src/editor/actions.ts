/**
 * @file 编辑器文本动作（纯函数，无 DOM）
 * @description 编辑器只改 Markdown 文本，不维护第二份文档模型。这里提供三个基础动作：
 *   选区包裹、行首前缀切换、光标处插入。全部返回新文本与新选区，由调用方写回。
 * @created 2026-10-24 21:12
 * @updated 2026-10-24 21:12
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
 * 在光标所在行插入块级片段（容器组件专用）
 * @description 容器是块级构造：必须顶格、并与前后内容隔开空行。
 *   按字符插入会把 `<Callout>` 塞进行中间，导致整块解析失败或落到错误的层级。
 * @param value 全文
 * @param position 光标位置（取其所在行的行首作为插入点）
 * @param snippet 片段文本（通常以换行结尾）
 * @returns 新文本与新光标（落在开标签的下一行行首，即内容占位处）
 */
export function insertBlockAt(value: string, position: number, snippet: string): EditResult {
  const lineStart = value.lastIndexOf("\n", position - 1) + 1;
  const before = value.slice(0, lineStart);
  const after = value.slice(lineStart);

  // 前导：与上文之间留且只留一个空行
  const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  // 片段自身保证以换行结尾
  const body = snippet.endsWith("\n") ? snippet : `${snippet}\n`;
  // 尾部：后文不是空行时补一个，避免紧跟正文
  const tail = after === "" || after.startsWith("\n") ? "" : "\n";

  const inserted = lead + body + tail;
  const next = before + inserted + after;
  // 光标落在组件末尾（闭合标签之后），而不是骨架内部或下一行
  const bodyWithoutBreak = body.replace(/\n+$/, "");
  const cursor = before.length + lead.length + bodyWithoutBreak.length;
  return { value: next, selection: { start: cursor, end: cursor } };
}
