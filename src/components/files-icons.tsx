/**
 * @file 文件树图标（内联 SVG，无额外网络请求）
 * @description 供 `<Files>` 的 Folder / File 子组件复用，避免图标代码重复。
 * @created 2026-10-24 21:58
 * @updated 2026-10-26 23:15 FolderIcon 拆为闭合 / 打开双形态，由 CSS 依 details[open] 切换
 */

/**
 * 打开形态的前盖轮廓（16x16 坐标系）
 * 左侧起点抬高、右端下沉，形成"盖子向前下方张开"的透视梯形；与闭合形态共用底边基线。
 */
const OPEN_LID_PATH =
  "M1 12.3L2.5 9.95A1.4 1.4 0 013.7 9.3h10.05a1.25 1.25 0 011.2 1.6l-1.13 3.3a1.4 1.4 0 01-1.32.93H2.4A1.4 1.4 0 011 13.73V12.3z";

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
 * 文件夹图标（闭合 / 打开双形态）
 * 两组图形同时存在于 DOM，由 CSS 依 `.files-folder[open]` 互斥显示，
 * 因此无需客户端 JS 与 hydration，SSR 首帧即正确。
 * @returns 16x16 SVG
 */
export function FolderIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="files-icon">
      {/* 闭合形态：与原实现一致，保证收起时观感不回退 */}
      <g className="files-shape-closed">
        <path
          d="M1 3.5A1.5 1.5 0 012.5 2h3.293a.5.5 0 01.354.146l1.207 1.208H13.5A1.5 1.5 0 0115 4.5V13a1 1 0 01-1 1H2a1 1 0 01-1-1V3.5z"
          fill="currentColor"
          opacity="0.4"
        />
        <path
          d="M2 2.5a1 1 0 00-1 1V13a.5.5 0 00.5.5h12a.5.5 0 00.5-.5V4.5a1 1 0 00-1-1H7.354"
          stroke="currentColor"
        />
      </g>
      {/* 打开形态：后部文件夹轮廓（浅描边）+ 前部向前下方敞开的斜盖 */}
      <g className="files-shape-open">
        <path
          d="M1 11.4V3.5A1.5 1.5 0 012.5 2h3.293a.5.5 0 01.354.146l1.207 1.208H13.5A1.5 1.5 0 0115 5v4.9"
          stroke="currentColor"
          opacity="0.55"
        />
        <path
          d={OPEN_LID_PATH}
          fill="currentColor"
          fillOpacity="0.35"
          stroke="currentColor"
          strokeLinejoin="round"
        />
      </g>
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
