/**
 * @file 分屏滚动同步（按内容对齐）
 * @description 用块级 `data-src-start`（源码 offset）做锚点，把两侧滚到"同一个块"，
 *   不做百分比映射——源码行高与预览块高不成比例，按比例会越滚越偏。
 *
 *   - 源码 → 预览：取编辑器视口顶部那一行的 offset，找 `top <= scrollTop` 的最后一个锚点
 *   - 预览 → 源码：取预览里最后一个"顶部已滚过"的锚点，用它的 offset 滚到该行
 *   - 双向联动靠"120ms 归属锁"抑制回环（程序性滚动不会再推回对面）
 *
 * @created 2026-10-25 01:42
 * @updated 2026-10-25 01:42
 */
import { EditorView } from "@codemirror/view";

/** 归属锁时长：这段时间内只有发起方驱动，避免两侧互推抖动 */
const LOCK_MS = 120;

/** 一个滚动锚点 */
interface Anchor {
  /** 元素 */
  el: HTMLElement;
  /** 源码起始 offset */
  offset: number;
  /** 相对预览内容顶部的像素位置 */
  top: number;
}

/** 同步句柄 */
export interface ScrollSyncHandle {
  /** 解绑所有监听 */
  destroy(): void;
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
   * @description 用 `getBoundingClientRect` 换算成"相对预览内容原点"的位置，
   *   不用 `offsetTop`——后者依赖 offsetParent，容易算到外层坐标导致整体偏移。
   *   只在内容/尺寸变化后调用，滚动过程中直接读缓存（每帧查询 DOM 太贵）。
   */
  function rebuild(): void {
    const nodes = preview.querySelectorAll<HTMLElement>("[data-src-start]");
    // 内容原点 = 容器顶部 - 已滚动距离
    const origin = preview.getBoundingClientRect().top - preview.scrollTop;
    const list: Anchor[] = [];
    for (const el of nodes) {
      const offset = Number(el.dataset.srcStart);
      if (!Number.isFinite(offset)) continue;
      list.push({ el, offset, top: el.getBoundingClientRect().top - origin });
    }
    list.sort((a, b) => a.top - b.top);
    cache = list;
  }

  /** 取锚点（必要时重建） */
  function anchors(): Anchor[] {
    if (!cache) rebuild();
    return cache ?? [];
  }

  /**
   * 按像素位置二分：找最后一个 `top <= y` 的锚点
   * @param y 预览内容中的像素位置
   * @returns 命中的锚点
   */
  function findByTop(y: number): Anchor | null {
    const list = anchors();
    if (list.length === 0) return null;
    let low = 0;
    let high = list.length - 1;
    let found = 0;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (list[mid].top <= y) {
        found = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return list[found];
  }

  /**
   * 按源码 offset 二分：找最后一个 `offset <= pos` 的锚点
   * @param pos 源码 offset
   * @returns 命中的锚点
   */
  function findByOffset(pos: number): Anchor | null {
    const list = anchors();
    if (list.length === 0) return null;
    let low = 0;
    let high = list.length - 1;
    let found = 0;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (list[mid].offset <= pos) {
        found = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return list[found];
  }

  /** 源码 → 预览 */
  function syncPreviewFromSource(): void {
    // lineBlockAtHeight 的参数是相对**文档顶部**的像素高度，不是相对视口；
    // 传 0 会永远返回第一行（表现为"右侧一直停在第一行"），必须加上已滚动距离。
    const viewportTop = view.scrollDOM.scrollTop;
    const block = view.lineBlockAtHeight(viewportTop);
    const pos = view.state.doc.lineAt(block.from).from;
    const hit = findByOffset(pos);
    preview.scrollTop = hit ? hit.top : 0;
  }

  /** 预览 → 源码 */
  function syncSourceFromPreview(): void {
    const hit = findByTop(preview.scrollTop + 1);
    if (!hit) return;
    view.dispatch({ effects: EditorView.scrollIntoView(hit.offset, { y: "start" }) });
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

  // 图片加载、折叠展开、渲染内容替换都会改变锚点位置
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
