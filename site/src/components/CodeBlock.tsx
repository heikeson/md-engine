/**
 * @file 代码块
 * @description 覆盖引擎默认的 `pre`：默认实现只有源码与语言属性，没有标题栏、复制与着色。
 *   源码从 `data-code-raw` 取——这正是 rehypeCodeMeta 存在的理由，宿主不必自己去解析子节点。
 * @created 2026-11-01 23:58
 * @updated 2026-11-01 23:58
 */

import { useState, type HTMLAttributes, type ReactElement, type ReactNode } from "react";
import { highlight, langLabel } from "./highlight";

/** 带 data-* 的 pre 属性 */
type PreProps = HTMLAttributes<HTMLPreElement> & Record<string, unknown>;

/**
 * 从子节点里兜底提取纯文本
 * @param node React 子节点
 * @returns 文本内容
 */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

/**
 * 复制按钮
 * @param props code 要复制的文本
 * @returns 按钮
 */
export function CopyButton({ code, label = "复制" }: { code: string; label?: string }): ReactElement {
  const [done, setDone] = useState(false);

  /** 写入剪贴板；失败时退回选中文本，不抛错 */
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      setDone(true);
      window.setTimeout(() => setDone(false), 1600);
    } catch {
      setDone(false);
    }
  };

  return (
    <button type="button" className="copy-btn" onClick={copy} aria-label={label}>
      {done ? "已复制" : label}
    </button>
  );
}

/**
 * 代码面板（可直接传字符串，不依赖引擎）
 * @param props code 源码；lang 语言；title 标题栏文案
 * @returns 带标题栏的代码块
 */
export function CodePanel({
  code,
  lang,
  title,
}: {
  code: string;
  lang?: string;
  title?: string;
}): ReactElement {
  const trimmed = code.replace(/\n$/, "");
  return (
    <figure className="code-block">
      <figcaption className="code-bar">
        <span className="code-title">{title ?? langLabel(lang)}</span>
        <CopyButton code={trimmed} />
      </figcaption>
      <pre className="code-body">
        <code dangerouslySetInnerHTML={{ __html: highlight(trimmed, lang) }} />
      </pre>
    </figure>
  );
}

/**
 * 代码块（引擎 pre 的覆盖实现）
 * @param props 引擎透传的 pre 属性
 * @returns 带标题栏的代码块
 */
export function CodeBlock(props: PreProps): ReactElement {
  const raw = typeof props["data-code-raw"] === "string" ? props["data-code-raw"] : textOf(props.children);
  const lang = typeof props["data-code-lang"] === "string" ? props["data-code-lang"] : undefined;
  const title = typeof props["data-code-title"] === "string" ? props["data-code-title"] : undefined;

  return <CodePanel code={raw} lang={lang} title={title} />;
}
