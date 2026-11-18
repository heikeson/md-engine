/**
 * @file 锚点形态统一（hast 层）
 * @description `mdast-util-to-hast` 会对链接地址做 percent-encode（`#动手` → `#%E5%8A%A8%E6%89%8B`），
 *   而 `rehype-slug` 生成的 `id` 是原文（`id="动手"`），同一篇文档里出现两种形态。
 *   浏览器定位时会解码 fragment，所以点击能跳；但任何按字符串比对 id 的消费方（自写滚动定位、
 *   目录高亮、静态导出后再处理）都会失效。这里把 `#` 后的编码还原，使 `href` 与 `id` 字面一致。
 *   **只还原多字节 UTF-8 序列**：`%2F`、`%20`、`%22` 这类 ASCII 转义保持原样，
 *   否则 `#a%2Fb` 会被改写成本不存在的 `#a/b`。
 *   只改链接写法，不动 id，也不影响 `md → AST → md` 往返。
 * @created 2026-10-26 23:05
 * @updated 2026-11-18 10:20 改为按节点还原（供 rehype-postprocess 复用一个 visit）；
 *   收窄为只解码多字节序列，ASCII 转义保持原样
 */

import type { Element } from "hast";

/**
 * 读取 `index` 处的 percent 编码字节
 * @param text 待读文本
 * @param index 位置（必须指向 `%`）
 * @returns 字节值与下一个位置；不是合法 `%XX` 时返回 null
 */
function percentByteAt(text: string, index: number): { byte: number; next: number } | null {
  if (text[index] !== "%") return null;
  const hex = text.slice(index + 1, index + 3);
  if (!/^[0-9A-Fa-f]{2}$/.test(hex)) return null;
  return { byte: parseInt(hex, 16), next: index + 3 };
}

/**
 * 由首字节推算 UTF-8 序列长度
 * @param lead 首字节
 * @returns 序列字节数；非多字节首字节返回 1
 */
function sequenceLength(lead: number): number {
  if (lead >= 0xc2 && lead <= 0xdf) return 2;
  if (lead >= 0xe0 && lead <= 0xef) return 3;
  if (lead >= 0xf0 && lead <= 0xf4) return 4;
  return 1;
}

/**
 * 还原 fragment 中的多字节 UTF-8 序列
 * @param fragment `#` 之后的原文
 * @returns 还原后的 fragment（ASCII 转义与非编码字符保持原样）
 */
function restoreMultibyte(fragment: string): string {
  if (!fragment.includes("%")) return fragment;
  let out = "";
  let index = 0;
  while (index < fragment.length) {
    const lead = percentByteAt(fragment, index);
    const size = lead ? sequenceLength(lead.byte) : 1;
    if (lead && size > 1) {
      let cursor = lead.next;
      const bytes = [lead.byte];
      let complete = true;
      for (let step = 1; step < size; step++) {
        const cont = percentByteAt(fragment, cursor);
        if (!cont || cont.byte < 0x80 || cont.byte > 0xbf) {
          complete = false;
          break;
        }
        bytes.push(cont.byte);
        cursor = cont.next;
      }
      if (complete) {
        try {
          out += decodeURIComponent(fragment.slice(index, cursor));
          index = cursor;
          continue;
        } catch {
          // 残缺 / 非法序列：落到原样输出
        }
      }
    }
    out += fragment[index];
    index += 1;
  }
  return out;
}

/**
 * 还原单个元素锚点里的 percent-encoding
 * @param node hast 元素（就地修改）
 * @returns 无
 */
export function restoreAnchors(node: Element): void {
  const href = node.properties?.href;
  if (typeof href !== "string" || !href.startsWith("#")) return;
  const fragment = href.slice(1);
  const restored = restoreMultibyte(fragment);
  if (restored !== fragment) node.properties.href = `#${restored}`;
}
