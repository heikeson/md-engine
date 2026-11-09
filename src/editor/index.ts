/**
 * @file 编辑器入口（client only）
 * @description 只能从 `@heikeson/md-engine/editor` 引入，禁止从主入口 re-export，
 *   否则编辑器代码会进入阅读页 chunk。
 * @created 2026-10-24 21:12
 * @updated 2026-10-24 21:12
 * @updated 2026-11-02 10:50 re-export 文案类型（EditorConfig.text 用）
 * @updated 2026-11-09 12:40 补出块级插入动作 `insertBlockAt`（工具栏与图片上传共用，宿主可复用）
 */

export { default as MarkdownEditor } from "./MarkdownEditor";
export type { EditorConfig, EditorView, MarkdownEditorProps } from "./MarkdownEditor";

export { blockSnippet, INSERTABLE_BLOCKS } from "./snippets";
export { insertAtCursor, insertBlockAt, toggleLinePrefix, wrapSelection } from "./actions";
export type { EditResult, Selection } from "./actions";
export type { UIText, UITextPatch } from "../internal/text";
