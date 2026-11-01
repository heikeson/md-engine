/**
 * @file 分屏滚动同步（区间插值版）
 * @description 用块级 `data-src-start`（源码 offset）建锚点，但**不再"贴锚点顶部"**：
 *   锚点之间按源码字符进度线性插值，源码滚到两个块中间时预览也停在那两块中间，
 *   不会一格一格地跳到标题上。
 *
 *   - 锚点：只保留**最内层**带 `data-src-start` 的元素（祖先锚点会被后代覆盖，留着会让插值跳变），
 *     按源码 offset 排序，并丢弃 top 非单调的脏点。
 *   - 源码 → 预览：`posAtCoords` 取视口顶部**精确字符位置**，在相邻锚点区间内插值出目标像素。
 *   - 预览 → 源码：在相邻锚点区间内按像素进度插值出源码 offset，再用 `lineBlockAt` 直接设
 *     `scrollTop`（不用 `scrollIntoView`，后者会把目标行硬顶到视口顶端、造成逐块跳动）。
 *   - 回环抑制：120ms 归属锁 + 程序性滚动不反向驱动。
 *
 * @created 2026-10-25 01:42
 * @updated 2026-11-01 23:10 重写：锚点区间插值（原实现按"最近锚点顶部"跳转，表现为以标题为锚点）
 */
import { EditorView } from "@codemirror/view";

/** 归属锁时长：这段时间内只有发起方驱动，避免两侧互推抖动 */
const LOCK_MS = 120;

/** 一个滚动锚点（源码 offset ↔ 预览像素位置） */
interface Anchor {
  /** 源码起始 offset */
  offset: number;
  /** 相对预览内容顶部的像素位置 */
  top: number;
}

/** 区间插值结果 */
interface Segment {
  /** 区间起点锚点 */
  a: Anchor;
  /** 区间终点锚点；最后一个锚点之后为 null */
  b: Anchor | null;
  /** 区间内进度 0–1 */
  t: number;
}

/** 同步句柄 */
export interface ScrollSyncHandle {
  /** 解绑所有监听 */
  destroy(): void;
}

/**
 * 在已排序锚点里找最后一个 `offset <= pos` 的下标
 * @param list 锚点（按 offset 升序）
 * @param pos 源码 offset
 * @returns 下标，-1 表示全部大于 pos
 */
function indexByOffset(list: readonly Anchor[], pos: number): number {
  let low = 0;
  let high = list.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if ((list[mid] as Anchor).offset <= pos) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

/**
 * 在已排序锚点里找最后一个 `top <= y` 的下标
 * @param list 锚点（按 top 升序）
 * @param y 预览内容中的像素位置
 * @returns 下标，-1 表示全部大于 y
 */
function indexByTop(list: readonly Anchor[], y: number): number {
  let low = 0;
  let high = list.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if ((list[mid] as Anchor).top <= y) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

/**
 * 把下标转成区间 + 区间内进度
 * @param list 锚点
 * @param index 命中下标
 * @param metric 取值函数（offset 或 top）
 * @param value 当前值
 * @returns 区间；无锚点返回 null
 */
function segmentOf(
  list: readonly Anchor[],
  index: number,
  metric: (anchor: Anchor) => number,
  value: number,
): Segment | null {
  if (list.length === 0) return null;
  if (index < 0) return { a: list[0] as Anchor, b: null, t: 0 };
  const a = list[index] as Anchor;
  const b = list[index + 1] ?? null;
  if (!b) return { a, b: null, t: 1 };
  const span = metric(b) - metric(a);
  const t = span > 0 ? Math.min(1, Math.max(0, (value - metric(a)) / span)) : 0;
  return { a, b, t };
}

/**
 * 建立分屏滚动同步
 * @param view CodeMirror 实例
 * @param preview 预览容器（内部滚动，且须为定位父级）
 * @returns 句柄，卸载时调用 `destroy`
 */
export function createScrollSync(view: EditorView, preview: HTMLElement): ScrollSyncHandle {
  /** 当前驱动方；非空时另一侧的滚动事件被忽略 */
  let owner: "source" | "preview" | null = null;
  let releaseTimer = 0;
  let frame = 0;
  let cache: Anchor[] | null = null;

  /**
   * 重建锚点缓存
   * @description 只保留最内层锚点并过滤脏点，保证 offset 与 top 同时单调——
   *   否则插值会算出负数或倒退。滚动过程直接读缓存，避免每帧查 DOM。
   */
  function rebuild(): void {
    const nodes = Array.from(preview.querySelectorAll<HTMLElement>("[data-src-start]"));
    // 内容原点 = 容器顶部 - 已滚动距离
    const origin = preview.getBoundingClientRect().top - preview.scrollTop;
    const raw: Anchor[] = [];
    for (const el of nodes) {
      // 有后代锚点就跳过：祖先区间会被后代覆盖，留着会让插值在父子之间反复跳
      if (el.querySelector("[data-src-start]")) continue;
      const offset = Number(el.dataset.srcStart);
      if (!Number.isFinite(offset)) continue;
      raw.push({ offset, top: el.getBoundingClientRect().top - origin });
    }
    raw.sort((a, b) => a.offset - b.offset || a.top - b.top);
    const list: Anchor[] = [];
    for (const item of raw) {
      const last = list[list.length - 1];
      // 源码顺序与视觉顺序必须一致：遇到位置回退的点丢弃（浮动/绝对定位才会出现）
      if (last && item.top < last.top) continue;
      list.push(item);
    }
    cache = list;
  }

  /** 取锚点（必要时重建） */
  function anchors(): Anchor[] {
    if (!cache) rebuild();
    return cache ?? [];
  }

  /**
   * 源码 offset → 预览像素位置
   * @param pos 源码 offset
   * @returns 目标 scrollTop；无锚点时返回 null
   */
  function yForOffset(pos: number): number | null {
    const list = anchors();
    const seg = segmentOf(list, indexByOffset(list, pos), (anchor) => anchor.offset, pos);
    if (!seg) return null;
    if (!seg.b) return seg.a.top;
    return seg.a.top + seg.t * (seg.b.top - seg.a.top);
  }

  /**
   * 预览像素位置 → 源码 offset
   * @param y 预览内容中的像素位置
   * @returns 源码 offset；无锚点时返回 null
   */
  function posForTop(y: number): number | null {
    const list = anchors();
    const seg = segmentOf(list, indexByTop(list, y), (anchor) => anchor.top, y);
    if (!seg) return null;
    if (!seg.b) return seg.a.offset;
    return Math.round(seg.a.offset + seg.t * (seg.b.offset - seg.a.offset));
  }

  /**
   * 取编辑器视口顶部的源码位置
   * @returns 精确字符 offset
   * @description 用 `posAtCoords` 而不是 `lineBlockAtHeight`：后者只给"块"，
   *   长段落里滚动时位置不变，会显得预览不动。
   */
  function sourceTopPos(): number {
    const rect = view.scrollDOM.getBoundingClientRect();
    const pos = view.posAtCoords({ x: rect.left + 4, y: rect.top + 1 });
    if (pos !== null) return pos;
    // 视口顶部落在空白区（长行右侧等）时拿不到坐标，退回"顶部所在块"的起点，
    // 不要返回 0——那会把预览硬拉回文首
    return view.lineBlockAtHeight(view.scrollDOM.scrollTop).from;
  }

  /** 源码 → 预览 */
  function syncPreviewFromSource(): void {
    const y = yForOffset(sourceTopPos());
    if (y === null) return;
    // 末尾区域会被 clamp，属正常；不做二次修正以免回环
    preview.scrollTop = y;
  }

  /** 预览 → 源码 */
  function syncSourceFromPreview(): void {
    const pos = posForTop(preview.scrollTop + 1);
    if (pos === null) return;
    // 直接设 scrollTop：scrollIntoView 会把目标行硬顶到顶端，表现为逐块跳动
    const block = view.lineBlockAt(pos);
    view.scrollDOM.scrollTop = block.top;
  }

  /**
   * 抢占归属锁
   * @param who 发起方
   */
  function lock(who: "source" | "preview"): void {
    owner = who;
    window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(() => {
      owner = null;
    }, LOCK_MS);
  }

  /**
   * 逐帧节流执行
   * @param run 实际同步动作
   */
  function schedule(run: () => void): void {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      run();
    });
  }

  /** 源码侧滚动 */
  function onSourceScroll(): void {
    if (owner === "preview") return;
    lock("source");
    schedule(syncPreviewFromSource);
  }

  /** 预览侧滚动 */
  function onPreviewScroll(): void {
    if (owner === "source") return;
    lock("preview");
    schedule(syncSourceFromPreview);
  }

  /** 内容或尺寸变化后锚点位置失效 */
  function invalidate(): void {
    cache = null;
  }

  // scroll 事件不冒泡，所以在编辑器外层容器上用 capture 阶段兜住——
  // 这样无论 CodeMirror 把滚动放在 scrollDOM 还是其它子元素，都能收到。
  const sourceHost = view.dom.parentElement ?? view.scrollDOM;
  view.scrollDOM.addEventListener("scroll", onSourceScroll, { passive: true });
  sourceHost.addEventListener("scroll", onSourceScroll, { capture: true, passive: true });
  preview.addEventListener("scroll", onPreviewScroll, { passive: true });

  // 首次挂载后主动对齐一次（此时两侧高度已确定）
  const initialFrame = window.requestAnimationFrame(() => {
    syncPreviewFromSource();
  });

  // 图片加载、折叠展开、渲染内容替换（含图表出图）都会改变锚点位置
  const resizeObserver = new ResizeObserver(invalidate);
  resizeObserver.observe(preview);
  const mutationObserver = new MutationObserver(invalidate);
  mutationObserver.observe(preview, { childList: true, subtree: true });

  return {
    destroy(): void {
      view.scrollDOM.removeEventListener("scroll", onSourceScroll);
      sourceHost.removeEventListener("scroll", onSourceScroll, { capture: true } as EventListenerOptions);
      preview.removeEventListener("scroll", onPreviewScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.clearTimeout(releaseTimer);
      if (frame) window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(initialFrame);
    },
  };
}
