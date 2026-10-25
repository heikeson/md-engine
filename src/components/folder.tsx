/**
 * @file 文件树目录（`<Folder name="src" defaultOpen>`）
 * @description 可折叠目录：右侧显示直接子项数量，`defaultOpen` 布尔控制默认展开；
 *   内部可继续嵌套 `<Folder>` 或 `<File>`。
 * @created 2026-10-24 21:58
 * @updated 2026-10-24 21:58
 */
import { Children, type ReactNode } from "react";
import { ChevronIcon, FolderIcon } from "./files-icons";

/** 目录参数 */
export interface FolderProps {
  /** 目录名 */
  name?: string;
  /** 默认展开（布尔属性，写 `defaultOpen` 即为真） */
  defaultOpen?: boolean;
  children?: ReactNode;
}

/**
 * 可折叠目录
 * @param props 目录名、默认展开与子项
 * @returns 目录节点
 */
export default function Folder({ name, defaultOpen, children }: FolderProps) {
  const count = Children.toArray(children).filter(Boolean).length;
  return (
    <details className="files-folder" open={defaultOpen}>
      <summary className="files-row files-folder-row">
        <span className="files-chevron" aria-hidden="true">
          <ChevronIcon />
        </span>
        <FolderIcon />
        <span className="files-name files-folder-name">{name}</span>
        {count > 0 ? <span className="files-count">{count}</span> : null}
      </summary>
      <div className="files-children">{children}</div>
    </details>
  );
}
