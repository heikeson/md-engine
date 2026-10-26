/**
 * @file 文件树图标（内联 SVG，无额外网络请求）
 * @description 供 `<Files>` 的 Folder / File 子组件复用，避免图标代码重复：
 *   Folder 为自绘双形态（CSS 依 details[open] 切换）；File 按扩展名映射到 lucide 图标，
 *   未命中回退自绘 FileIcon。映射为纯函数，SSR 安全、零客户端 JS。
 * @created 2026-10-24 21:58
 * @updated 2026-10-26 23:24 新增文件类型映射（12 类）与 `icon` 属性覆盖
 */

import {
  FileArchive,
  FileBraces,
  FileCode,
  FileImage,
  FileKey,
  FileLock,
  FileMusic,
  FilePlay,
  FileSpreadsheet,
  FileTerminal,
  FileText,
  FileType,
  type LucideIcon,
} from "lucide-react";

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

/** 文件类型类别（同时是 `icon` 属性的合法取值） */
export type FileTypeKey =
  | "code"
  | "text"
  | "data"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "sheet"
  | "script"
  | "lock"
  | "key"
  | "font";

/**
 * 类别 → lucide 图标
 * 只选本版本已确认导出的 `File*` 主名，避免别名在依赖升级后失效
 */
const FILE_TYPE_ICONS: Record<FileTypeKey, LucideIcon> = {
  code: FileCode,
  text: FileText,
  data: FileBraces,
  image: FileImage,
  video: FilePlay,
  audio: FileMusic,
  archive: FileArchive,
  sheet: FileSpreadsheet,
  script: FileTerminal,
  lock: FileLock,
  key: FileKey,
  font: FileType,
};

/**
 * 扩展名 → 类别（键一律小写）
 * 覆盖真实写作场景；未列出的扩展名回退自绘 FileIcon
 */
const EXT_TO_TYPE: Record<string, FileTypeKey> = {
  // 源码 / 标记 / 样式
  ts: "code",
  tsx: "code",
  js: "code",
  jsx: "code",
  mjs: "code",
  cjs: "code",
  vue: "code",
  svelte: "code",
  py: "code",
  go: "code",
  rs: "code",
  java: "code",
  c: "code",
  cpp: "code",
  h: "code",
  css: "code",
  scss: "code",
  less: "code",
  html: "code",
  htm: "code",
  // 文档
  md: "text",
  mdx: "text",
  txt: "text",
  rst: "text",
  pdf: "text",
  // 数据 / 配置
  json: "data",
  jsonc: "data",
  yaml: "data",
  yml: "data",
  toml: "data",
  ini: "data",
  env: "data",
  sql: "data",
  db: "data",
  sqlite: "data",
  // 图片
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  avif: "image",
  bmp: "image",
  ico: "image",
  svg: "image",
  // 视频
  mp4: "video",
  webm: "video",
  mov: "video",
  mkv: "video",
  avi: "video",
  // 音频
  mp3: "audio",
  wav: "audio",
  flac: "audio",
  ogg: "audio",
  m4a: "audio",
  aac: "audio",
  // 归档
  zip: "archive",
  tar: "archive",
  gz: "archive",
  tgz: "archive",
  "7z": "archive",
  rar: "archive",
  // 表格
  csv: "sheet",
  tsv: "sheet",
  xlsx: "sheet",
  xls: "sheet",
  // 脚本
  sh: "script",
  bash: "script",
  zsh: "script",
  ps1: "script",
  bat: "script",
  cmd: "script",
  // 锁文件
  lock: "lock",
  // 密钥 / 证书
  pem: "key",
  key: "key",
  crt: "key",
  cer: "key",
  p12: "key",
  pfx: "key",
  // 字体
  woff: "font",
  woff2: "font",
  ttf: "font",
  otf: "font",
  eot: "font",
};

/**
 * 取文件名的扩展名（小写）
 * @param name 文件名，允许带路径（取最后一段）
 * @returns 扩展名；无扩展名或点开头的无扩展名文件（`.gitignore`）返回空串
 */
function extensionOf(name?: string): string {
  if (!name) return "";
  const base = name.split("/").pop() ?? name;
  const dot = base.lastIndexOf(".");
  // dot <= 0：无点，或形如 `.gitignore`；dot 在末尾：形如 `file.`
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

/**
 * 解析文件行应使用的图标
 * 优先级：`icon` 指定（类别键或扩展名）→ 扩展名匹配 → null（调用方回退 FileIcon）
 * 未知 `icon` 值静默回退到自动匹配，不产诊断
 * @param name 文件名
 * @param icon 显式覆盖值（`auto` / 类别键 / 扩展名）
 * @returns lucide 图标组件或 null
 */
export function resolveFileIcon(name?: string, icon?: string): LucideIcon | null {
  const override = typeof icon === "string" ? icon.trim().toLowerCase() : "";
  // `auto` 与历史写法 `none` 都按"未覆盖"处理：文件行始终有图标，不存在无图标状态
  if (override && override !== "auto" && override !== "none") {
    if (override in FILE_TYPE_ICONS) return FILE_TYPE_ICONS[override as FileTypeKey];
    const byOverrideExt = EXT_TO_TYPE[override];
    if (byOverrideExt) return FILE_TYPE_ICONS[byOverrideExt];
  }
  const ext = extensionOf(name);
  const type = ext ? EXT_TO_TYPE[ext] : undefined;
  return type ? FILE_TYPE_ICONS[type] : null;
}

/**
 * 文件行图标（命中类型用 lucide，未命中回退自绘 FileIcon）
 * 描边固定 1.5：lucide 默认 2 在 16px 下偏粗，与自绘图标不协调
 * @param props 文件名与可选 `icon` 覆盖值
 * @returns 16x16 图标
 */
export function FileTypeIcon({ name, icon }: { name?: string; icon?: string }) {
  const Icon = resolveFileIcon(name, icon);
  if (!Icon) return <FileIcon />;
  return <Icon className="files-icon" strokeWidth={1.5} aria-hidden="true" />;
}
