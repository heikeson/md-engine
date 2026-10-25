/**
 * @file 编辑器入口（client only）
 * @description 只能从 `@heikeson/md-engine/editor` 引入，禁止从主入口 re-export，
 *   否则编辑器代码会进入阅读页 chunk。
 * @created 2026-10-24 21:12
 * @updated 2026-10-24 21:12
 */

export { default as MarkdownEditor } from "./MarkdownEditor";
export type { EditorConfig, EditorView, MarkdownEditorProps } from "./MarkdownEditor";

export { blockSnippet, INSERTABLE_BLOCKS } from "./snippets";
export { insertAtCursor, toggleLinePrefix, wrapSelection } from "./actions";
export type { EditResult, Selection } from "./actions";
