/**
 * @file 文件树叶子（`<File name="index.ts" />`）
 * @description 自闭合叶子；给了 `href` 且协议合规时渲染为链接，否则为纯文本行。
 *   图标按扩展名自动匹配，`icon` 属性可覆盖为其他类型（见 files-icons 的映射表）。
 * @created 2026-10-24 21:58
 * @updated 2026-10-26 23:24 图标改为按扩展名映射，支持 `icon` 覆盖
 */
import { isSafeHref } from "../internal/url-policy";
import { FileTypeIcon } from "./files-icons";

/** 文件参数 */
export interface FileProps {
  /** 文件名 */
  name?: string;
  /** 可选链接；协议不合规时降级为不可点击（审计 4.3） */
  href?: string;
  /** 图标覆盖：类别键（code/text/data/…）或扩展名；不写则按 name 自动匹配 */
  icon?: string;
}

/**
 * 文件行
 * @param props 文件名、可选链接与图标覆盖值
 * @returns 文件节点
 */
export default function File({ name, href, icon }: FileProps) {
  const safeHref = href && isSafeHref(href) ? href : undefined;
  return (
    <div className="files-row files-file-row">
      <span className="files-spacer" aria-hidden="true" />
      <FileTypeIcon name={name} icon={icon} />
      {safeHref ? (
        <a className="files-name" href={safeHref}>
          {name}
        </a>
      ) : (
        <span className="files-name">{name}</span>
      )}
    </div>
  );
}
