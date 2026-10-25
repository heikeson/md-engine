/**
 * @file 文件树图标（内联 SVG，无额外网络请求）
 * @description 供 `<Files>` 的 Folder / File 子组件复用，避免图标代码重复。
 * @created 2026-10-24 21:58
 * @updated 2026-10-24 21:58
 */

/**
 * 文件图标
 * @returns 16x16 SVG
 */
export function FileIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="files-icon">
      <path
        d="M3 1h6.293L13 4.707V14a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1z"
        fill="currentColor"
        opacity="0.25"
      />
      <path d="M9 1v3.5a.5.5 0 00.5.5H13" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

/**
 * 文件夹图标
 * @returns 16x16 SVG（展开时由父级 details[open] 控制填充）
 */
export function FolderIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="files-icon">
      <path
        d="M1 3.5A1.5 1.5 0 012.5 2h3.293a.5.5 0 01.354.146l1.207 1.208H13.5A1.5 1.5 0 0115 4.5V13a1 1 0 01-1 1H2a1 1 0 01-1-1V3.5z"
        fill="currentColor"
        opacity="0.4"
      />
      <path
        d="M2 2.5a1 1 0 00-1 1V13a.5.5 0 00.5.5h12a.5.5 0 00.5-.5V4.5a1 1 0 00-1-1H7.354"
        stroke="currentColor"
      />
    </svg>
  );
}

/**
 * 折叠箭头
 * @returns 10x10 SVG（details[open] 时由 CSS 旋转 90°）
 */
export function ChevronIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
      <path
        d="M4 2.5L7.5 6L4 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
