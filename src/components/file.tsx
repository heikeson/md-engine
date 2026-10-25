/**
 * @file 文件树叶子（`<File name="index.ts" />`）
 * @description 自闭合叶子；给了 `href` 且协议合规时渲染为链接，否则为纯文本行。
 * @created 2026-10-24 21:58
 * @updated 2026-10-24 21:58
 */
import { isSafeHref } from "../internal/url-policy";
import { FileIcon } from "./files-icons";

/** 文件参数 */
export interface FileProps {
  /** 文件名 */
  name?: string;
  /** 可选链接；协议不合规时降级为不可点击（审计 4.3） */
  href?: string;
}

/**
 * 文件行
 * @param props 文件名与可选链接
 * @returns 文件节点
 */
export default function File({ name, href }: FileProps) {
  const safeHref = href && isSafeHref(href) ? href : undefined;
  return (
    <div className="files-row files-file-row">
      <span className="files-spacer" aria-hidden="true" />
      <FileIcon />
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
