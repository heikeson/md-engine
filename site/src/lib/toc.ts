/**
 * @file 目录提取
 * @description 从 Markdown 原文扫出二三级标题，生成右侧目录。
 *   锚点 id 必须与 rehype-slug 的产物一致，否则点击跳不过去：
 *   github-slugger 的做法是「小写 → 去标点 → 空格转连字符 → 重名追加序号」，这里照抄。
 * @created 2026-11-02 00:02
 * @updated 2026-11-02 00:02
 */

/** 目录项 */
export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * 生成与 github-slugger 一致的 id
 * @param text 标题文本
 * @returns 锚点 id
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

/**
 * 提取目录
 * @param markdown 文档原文
 * @returns 二三级标题列表
 */
export function collectToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const seen = new Map<string, number>();
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const text = match[2].replace(/`/g, "").replace(/\[(.*?)\]\(.*?\)/g, "$1");
    const base = slugify(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);

    items.push({
      id: count === 0 ? base : `${base}-${count}`,
      text,
      level: match[1].length === 2 ? 2 : 3,
    });
  }

  return items;
}
