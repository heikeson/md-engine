/**
 * @file 文件树（`<FileTree>`）
 * @description 从 Markdown 列表推断目录结构：**名称以 `/` 结尾视为目录**，其余为文件；
 *   目录用原生 `<details>` 折叠（服务端友好、零客户端 JS），嵌套层级用缩进线表示。
 *   列表项若写成链接（`- [server.js](/view/x)`），文件行即为可点击链接。
 *   视觉参考 `docs/文件树组件/file-tree.tsx`（图标、折叠箭头、子项计数、缩进线），
 *   但数据来源是正文列表而非扫描结果，故不引入 hrefPrefix / activePath。
 * @created 2026-09-03 21:54
 * @updated 2026-10-24 21:46 重写为 details 折叠 + 图标 + 缩进线 + 子项计数
 */
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";

/** 树节点（由列表推断而来） */
interface TreeNode {
  /** 显示名称（目录保留末尾 `/`） */
  name: string;
  /** 是否目录 */
  isDir: boolean;
  /** 文件链接（列表项写成链接时存在） */
  href?: string;
  children: TreeNode[];
}

/** 元素的 props 形状（React 19 的 props 为 unknown，需要断言） */
type Props = { children?: ReactNode; href?: string };

/**
 * 递归收集元素的文本与子列表
 * @param node React 节点
 * @param acc 收集器
 */
function collect(
  node: ReactNode,
  acc: { text: string; list: ReactElement | null; href?: string },
): void {
  if (node === null || node === undefined || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    acc.text += String(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) collect(child, acc);
    return;
  }
  if (!isValidElement(node)) return;
  const element = node as ReactElement<Props>;
  // 子列表单独提取，不参与名称拼接
  if (element.type === "ul" || element.type === "ol") {
    acc.list = element;
    return;
  }
  if (element.type === "a" && typeof element.props.href === "string") {
    acc.href = element.props.href;
  }
  collect(element.props.children, acc);
}

/**
 * 解析 `<ul>` 为节点数组
 * @param list ul / ol 元素
 * @returns 节点数组
 */
function parseList(list: ReactElement<Props>): TreeNode[] {
  return Children.toArray(list.props.children)
    .filter(isValidElement)
    .filter((child) => (child as ReactElement).type === "li")
    .map((child) => parseItem(child as ReactElement<Props>));
}

/**
 * 解析单个 `<li>`
 * @param item li 元素
 * @returns 节点
 */
function parseItem(item: ReactElement<Props>): TreeNode {
  const acc: { text: string; list: ReactElement | null; href?: string } = {
    text: "",
    list: null,
  };
  collect(item.props.children, acc);
  const name = acc.text.trim();
  return {
    name,
    isDir: name.endsWith("/"),
    href: acc.href,
    children: acc.list ? parseList(acc.list as ReactElement<Props>) : [],
  };
}

/** 文件图标 */
function FileIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="file-tree-icon">
      <path
        d="M3 1h6.293L13 4.707V14a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1z"
        fill="currentColor"
        opacity="0.25"
      />
      <path d="M9 1v3.5a.5.5 0 00.5.5H13" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

/** 文件夹图标（展开时填充更实） */
function DirIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="file-tree-icon">
      <path
        d="M1 3.5A1.5 1.5 0 012.5 2h3.293a.5.5 0 01.354.146l1.207 1.208H13.5A1.5 1.5 0 0115 4.5V13a1 1 0 01-1 1H2a1 1 0 01-1-1V3.5z"
        fill="currentColor"
        opacity="0.4"
      />
      <path d="M2 2.5a1 1 0 00-1 1V13a.5.5 0 00.5.5h12a.5.5 0 00.5-.5V4.5a1 1 0 00-1-1H7.354" stroke="currentColor" />
    </svg>
  );
}

/**
 * 递归渲染节点
 * @param nodes 当前层级节点
 * @returns 列表元素
 */
function renderNodes(nodes: TreeNode[]): ReactElement {
  return (
    <ul className="file-tree-list">
      {nodes.map((node, index) =>
        node.isDir ? (
          <li key={`${node.name}-${index}`}>
            <details className="file-tree-dir" open>
              <summary className="file-tree-row">
                <span className="file-tree-chevron" aria-hidden="true">
                  <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
                    <path
                      d="M4 2.5L7.5 6L4 9.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <DirIcon />
                <span className="file-tree-name file-tree-dir-name">{node.name}</span>
                {node.children.length > 0 && (
                  <span className="file-tree-count">{node.children.length}</span>
                )}
              </summary>
              {renderNodes(node.children)}
            </details>
          </li>
        ) : (
          <li key={`${node.name}-${index}`}>
            <div className="file-tree-row file-tree-file-row">
              <span className="file-tree-spacer" aria-hidden="true" />
              <FileIcon />
              {node.href ? (
                <a className="file-tree-name" href={node.href}>
                  {node.name}
                </a>
              ) : (
                <span className="file-tree-name">{node.name}</span>
              )}
            </div>
          </li>
        ),
      )}
    </ul>
  );
}

/**
 * 文件树容器
 * @param props.children Markdown 列表渲染结果
 * @returns 文件树
 */
export default function FileTree({ children }: { children?: ReactNode }) {
  const list = Children.toArray(children)
    .filter(isValidElement)
    .find((child) => (child as ReactElement).type === "ul");
  const nodes = list ? parseList(list as ReactElement<Props>) : [];
  if (nodes.length === 0) return null;
  return <div className="file-tree">{renderNodes(nodes)}</div>;
}
