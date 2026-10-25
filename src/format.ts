/**
 * @file 排版规范化（不承担语法正确性）
 * @description 尖括号块的解析不依赖空行，本函数只负责"看起来整齐"：容器标签前后各留一个空行、
 *   连续空行收敛为一个。围栏代码块内的内容一律跳过；幂等（跑两遍结果一致）。
 * @created 2026-10-24 20:30
 * @updated 2026-10-24 20:30
 */

/** 独占一行的容器标签（含闭合与自闭合）；捕获缩进用于判断是否在列表上下文 */
const TAG_LINE = /^(\s*)<(\/?)([A-Z][A-Za-z0-9]*)((?:\s[^>]*)?)(\/?)>\s*$/;

/** 围栏起始（``` 或 ~~~） */
const FENCE_LINE = /^\s*(`{3,}|~{3,})/;

/**
 * 规范化 Markdown 排版
 * @param md 原文
 * @returns 规范化后的文本
 */
export function normalizeMarkdown(md: string): string {
  const lines = (md ?? "").replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let fenceChar: string | null = null;

  /** 需要时补一个空行（上一行非空才补） */
  const pushBlank = (): void => {
    if (out.length > 0 && out[out.length - 1].trim() !== "") out.push("");
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fence = FENCE_LINE.exec(line);

    if (fenceChar !== null) {
      out.push(line);
      if (fence && fence[1].startsWith(fenceChar)) fenceChar = null;
      continue;
    }
    if (fence) {
      fenceChar = fence[1][0];
      out.push(line);
      continue;
    }

    const tag = TAG_LINE.exec(line);
    // 有缩进视为列表上下文，原样保留，不做空行补齐
    if (tag && tag[1] === "") {
      pushBlank();
      out.push(line.trim());
      const next = lines[i + 1];
      if (next !== undefined && next.trim() !== "") out.push("");
      continue;
    }

    if (line.trim() === "") {
      // 连续空行收敛为一个
      if (out.length > 0 && out[out.length - 1].trim() === "") continue;
      out.push("");
      continue;
    }

    out.push(line);
  }

  // 去掉末尾空行
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  return out.join("\n");
}
