/**
 * @file 图表缩放与拖动（客户端，自管手势）
 * @description 不引手势库：缩放用乘法（`scale × exp(-Δ × k)`），任何倍率下每格观感一致；
 *   直接滚轮不拦截，只有「Ctrl/⌘ + 滚轮」或「按住左键 + 滚轮」才缩放，避免劫持页面滚动。
 *   交叉操作必须重建基准：拖动中缩放后平移基准仍指向按下时的坐标，不重锚会把缩放结果顶回去。
 * @created 2026-11-01 21:26
 * @updated 2026-11-01 21:26
 * @updated 2026-11-01 22:37 拖动中缩放重锚到当前指针位置；滚轮绑定改为「出图后」再挂
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 变换状态（CSS `translate` + `scale`） */
export interface Transform {
  scale: number;
  x: number;
  y: number;
}

/** 单位变换 */
export const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };

/** 缩放上下限 */
const MIN_SCALE = 0.25;
const MAX_SCALE = 8;

/** 单次事件限幅：防极端增量导致跳变 */
const STEP_MIN = 0.75;
const STEP_MAX = 1.33;

/** 缩放灵敏度 */
const K = 0.0015;

/** 拖动会话 */
interface DragSession {
  pointerId: number;
  /** 按下时的变换基准 */
  baseX: number;
  baseY: number;
  /** 按下时的指针坐标 */
  startX: number;
  startY: number;
}

/**
 * 归一化滚轮增量
 * @param event 滚轮事件
 * @returns 像素当量
 */
function normalizeDelta(event: WheelEvent): number {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * 100;
  return event.deltaY;
}

/**
 * 把缩放限制在允许区间
 * @param value 原始倍率
 * @returns 限幅后的倍率
 */
function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

/**
 * 图表缩放拖动
 * @param active 是否启用（未渲染出图或正在看源码时禁用）
 * @returns 容器 ref、当前变换、缩放与重置操作
 */
export function usePanZoom(active: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const drag = useRef<DragSession | null>(null);

  /**
   * 以某点为锚点缩放
   * @param factor 倍率因子
   * @param point 锚点（相对容器左上角）
   * @param cursor 当前指针的页面坐标（拖动中缩放时用来重锚）
   */
  const zoomAt = useCallback(
    (factor: number, point: { x: number; y: number }, cursor?: { x: number; y: number }) => {
      setTransform((prev) => {
        const next = clampScale(prev.scale * factor);
        if (next === prev.scale) return prev;
        const ratio = next / prev.scale;
        const moved = {
          scale: next,
          x: point.x - (point.x - prev.x) * ratio,
          y: point.y - (point.y - prev.y) * ratio,
        };
        // 拖动中缩放：把平移基准重锚到「当前指针位置 + 新的变换」。
        // 只改 baseX 不改 startX，下一次 pointermove 会把已累计的拖动位移算进去，表现为图被顶回去。
        const session = drag.current;
        if (session && cursor) {
          drag.current = {
            pointerId: session.pointerId,
            baseX: moved.x,
            baseY: moved.y,
            startX: cursor.x,
            startY: cursor.y,
          };
        }
        return moved;
      });
    },
    [],
  );

  // 滚轮：只有 Ctrl/⌘ 或按住左键时才缩放，其余交还给页面滚动。
  // active 依赖「已出图」：canvas 挂载前 ref 为空，提前绑定会绑不到元素。
  useEffect(() => {
    const node = ref.current;
    if (!node || !active) return;
    const onWheel = (event: WheelEvent): void => {
      if (!event.ctrlKey && !event.metaKey && drag.current === null) return;
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const factor = Math.min(STEP_MAX, Math.max(STEP_MIN, Math.exp(-normalizeDelta(event) * K)));
      zoomAt(
        factor,
        { x: event.clientX - rect.left, y: event.clientY - rect.top },
        { x: event.clientX, y: event.clientY },
      );
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [active, zoomAt]);

  /**
   * 指针按下：开始拖动会话
   * @param event 指针事件
   */
  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!active || event.button !== 0) return;
      drag.current = {
        pointerId: event.pointerId,
        baseX: transform.x,
        baseY: transform.y,
        startX: event.clientX,
        startY: event.clientY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [active, transform.x, transform.y],
  );

  /**
   * 指针移动：更新平移量
   * @param event 指针事件
   */
  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const session = drag.current;
    if (!session || session.pointerId !== event.pointerId) return;
    setTransform((prev) => ({
      scale: prev.scale,
      x: session.baseX + (event.clientX - session.startX),
      y: session.baseY + (event.clientY - session.startY),
    }));
  }, []);

  /**
   * 指针抬起 / 取消：结束拖动会话
   * @param event 指针事件
   */
  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }, []);

  /** 放大 / 缩小 / 重置（按钮以视口中心为锚点） */
  const zoomIn = useCallback(() => zoomAt(1.25, centerOf(ref.current)), [zoomAt]);
  const zoomOut = useCallback(() => zoomAt(0.8, centerOf(ref.current)), [zoomAt]);
  const reset = useCallback(() => {
    drag.current = null;
    setTransform(IDENTITY);
  }, []);

  return { ref, transform, zoomIn, zoomOut, reset, onPointerDown, onPointerMove, onPointerUp };
}

/**
 * 取容器中心点（相对左上角）
 * @param node 容器
 * @returns 中心坐标；容器不存在时为原点
 */
function centerOf(node: HTMLElement | null): { x: number; y: number } {
  if (!node) return { x: 0, y: 0 };
  return { x: node.clientWidth / 2, y: node.clientHeight / 2 };
}
