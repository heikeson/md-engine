/**
 * @file 图表缩放与拖动（客户端，自管手势）
 * @description 手势面是「视口」而不是图本身：整块图表区按住都能拖。
 *   拖动期允许越界，松手后 200ms easeOut 回弹（对齐 react-zoom-pan-pinch 默认
 *   `limitToBounds` + `autoAlignment` 的观感，但本包不引该库）。
 *   缩放锚点统一换算到视口坐标系，指针下的图形保持不动；直接滚轮不拦截，
 *   只有「Ctrl/⌘ + 滚轮」或「按住左键 + 滚轮」才缩放，避免劫持页面滚动。
 *   手势期间**直接写变换层的 style**（不经 React state），每帧不触发重新渲染；
 *   缩放/复位的 200ms 动画与双指捏合也走同一条写入通道。
 * @created 2026-11-01 21:26
 * @updated 2026-11-02 22:57 手势面改为视口、初始适配居中、自由拖动 + 松手回弹、缩放锚点统一到视口坐标系
 * @updated 2026-11-02 23:04 新增 transformStyle：只用 2D 变换 + 倍率去浮点尾巴，避免放大发糊
 * @updated 2026-11-02 23:12 手势期直写 DOM；补双指捏合、多指防护、触屏不再吞页面滚动、点击阈值前也跟手、缩放动画
 */

"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChartSize } from "./use-render";

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

/** 单次滚轮事件限幅：防极端增量导致跳变 */
const STEP_MIN = 0.75;
const STEP_MAX = 1.33;

/** 缩放灵敏度 */
const K = 0.0015;

/** 拖动越界余量（视口尺寸的倍数）：1 份对应参考实现 `autoAlignment.sizeX/sizeY = 100` */
const OVERSHOOT = 1;

/** 动画时长（毫秒）：松手回弹、按钮缩放、复位共用 */
const ANIMATION_DURATION = 200;

/** 微动阈值（px）：位移不超过它视为点击，不触发回弹 */
const CLICK_SLOP = 5;

/**
 * 手势排除选择器：这些元素上按下不接管平移
 * @description 与参考实现的 `isDraggableTarget` 对齐：链接、图片、表单控件、
 *   可编辑区域有自己的默认行为，抢过来拖动会让人点不动。
 */
const PAN_EXCLUDE = "a, img, image, button, input, textarea, select, option, [contenteditable='true']";

/** 屏幕坐标点 */
interface Point {
  x: number;
  y: number;
}

/** 位置区间 */
interface Bounds {
  min: number;
  max: number;
}

/** 单指拖动会话 */
interface DragSession {
  pointerId: number;
  /** 按下时的变换基准 */
  baseX: number;
  baseY: number;
  /** 按下时的指针坐标 */
  startX: number;
  startY: number;
  /** 是否已越过点击阈值（决定松手要不要回弹） */
  moved: boolean;
}

/** 双指捏合会话 */
interface PinchSession {
  /** 起始两指间距 */
  startDistance: number;
  /** 起始两指中点 */
  startMid: Point;
  /** 起始变换 */
  start: Transform;
}

/** 视口尺寸与初始适配比例 */
interface Viewport {
  width: number;
  height: number;
  /** 初始适配比例 */
  fit: number;
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
 * 计算单轴的合法位置区间
 * @param viewportSize 视口尺寸
 * @param contentSize 内容缩放后的尺寸
 * @returns 区间；内容小于视口时为正值区间（内容可在视口内任意摆放），大于视口时为负值区间
 */
function axisBounds(viewportSize: number, contentSize: number): Bounds {
  const slack = viewportSize - contentSize;
  return { min: Math.min(0, slack), max: Math.max(0, slack) };
}

/**
 * 把位置夹在合法区间内（不走动画，用于缩放后的收敛）
 * @param value 变换
 * @param viewport 视口尺寸
 * @param size 内容自然尺寸
 * @returns 夹紧后的变换；无需改动时返回原对象
 */
function alignToBounds(value: Transform, viewport: Viewport, size: ChartSize): Transform {
  const boundsX = axisBounds(viewport.width, size.width * value.scale);
  const boundsY = axisBounds(viewport.height, size.height * value.scale);
  const x = Math.min(boundsX.max, Math.max(boundsX.min, value.x));
  const y = Math.min(boundsY.max, Math.max(boundsY.min, value.y));
  return x === value.x && y === value.y ? value : { scale: value.scale, x, y };
}

/**
 * 拖动期限幅：合法区间外再放一份视口尺寸，允许自由拖出但不会彻底丢图
 * @param value 目标位置
 * @param bounds 合法区间
 * @param viewportSize 视口尺寸（越界余量基准）
 * @returns 限幅后的位置
 */
function clampOvershoot(value: number, bounds: Bounds, viewportSize: number): number {
  const slack = viewportSize * OVERSHOOT;
  return Math.min(bounds.max + slack, Math.max(bounds.min - slack, value));
}

/**
 * 回弹缓动（三次方 easeOut）
 * @param progress 进度 0~1
 * @returns 缓动后的进度
 */
function easeOut(progress: number): number {
  const inverse = 1 - progress;
  return 1 - inverse * inverse * inverse;
}

/**
 * 生成写进 CSS 的变换串
 * @param value 当前变换
 * @returns `translate(...) scale(...)`
 * @description 两点讲究：① 只用 2D 变换——`translate3d` / `matrix3d` 会触发合成层，
 *   SVG 被栅格化后放大即糊（参考实现源码注释：Standard translate prevents blurry svg on the safari）；
 *   ② 倍率去掉浮点尾巴（`0.8 × 1.25 = 1.0000000000000002` 这类），避免亚像素发虚。
 */
export function transformStyle(value: Transform): string {
  const scale = Number.parseFloat(value.scale.toFixed(8));
  const x = Number.parseFloat(value.x.toFixed(2));
  const y = Number.parseFloat(value.y.toFixed(2));
  return `translate(${x}px, ${y}px) scale(${scale})`;
}

/**
 * 两点间距
 * @param a 点 A
 * @param b 点 B
 * @returns 欧氏距离
 */
function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * 两点中点
 * @param a 点 A
 * @param b 点 B
 * @returns 中点坐标
 */
function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * 图表缩放拖动
 * @param active 是否启用（未渲染出图、正在看源码或尺寸未知时禁用）
 * @param size 内容自然尺寸
 * @param limit 图表区高度上限（`height` 属性解析结果）；缺省表示按初始适配高度自适应
 * @returns 视口 ref、变换层回调 ref、视口高度、拖动状态与各操作
 */
export function usePanZoom(active: boolean, size: ChartSize | null, limit?: number) {
  /** 手势面 + 裁切视口 */
  const viewportRef = useRef<HTMLDivElement | null>(null);
  /** 变换层（手势期间直写它的 style） */
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  /** 唯一权威变换：手势每帧直写 DOM，不经过 React state */
  const current = useRef<Transform>(IDENTITY);
  const drag = useRef<DragSession | null>(null);
  const pinch = useRef<PinchSession | null>(null);
  /** 当前落在视口上的指针（pointerId → 坐标），用于多指防护与捏合 */
  const pointers = useRef<Map<number, Point>>(new Map());
  /** 动画帧句柄 */
  const animation = useRef<number | null>(null);

  /** 取消进行中的动画 */
  const cancelAlign = useCallback(() => {
    if (animation.current !== null) {
      cancelAnimationFrame(animation.current);
      animation.current = null;
    }
  }, []);

  /**
   * 写入变换：更新权威值 + 直写 DOM
   * @param next 目标变换
   * @returns 无
   */
  const applyTransform = useCallback((next: Transform) => {
    current.current = next;
    const node = stageRef.current;
    if (node) node.style.transform = transformStyle(next);
  }, []);

  /**
   * 变换层回调 ref：挂载/重挂载时立刻补上当前变换
   * @param node 变换层元素或 null（卸载）
   * @returns 无
   * @description 源码/图表来回切换会重挂载变换层，只靠依赖 base 的布局效应会漏掉这种情况。
   */
  const setStage = useCallback(
    (node: HTMLDivElement | null) => {
      stageRef.current = node;
      if (node) node.style.transform = transformStyle(current.current);
    },
    [],
  );

  /** 视口尺寸：宽度按容器实测，高度按上限或初始适配结果推导 */
  const viewport = useMemo<Viewport | null>(() => {
    if (!size || width <= 0 || size.width <= 0 || size.height <= 0) return null;
    const fitByHeight = limit ? limit / size.height : Number.POSITIVE_INFINITY;
    const fit = Math.min(1, width / size.width, fitByHeight);
    return { width, height: limit ?? size.height * fit, fit };
  }, [size, width, limit]);

  /** 初始变换：适配 + 居中 */
  const base = useMemo<Transform | null>(() => {
    if (!size || !viewport) return null;
    return {
      scale: viewport.fit,
      x: (viewport.width - size.width * viewport.fit) / 2,
      y: (viewport.height - size.height * viewport.fit) / 2,
    };
  }, [size, viewport]);

  // 视口宽度实测：布局效应内同步一次，首帧前就拿到，避免先 1:1 再跳成适配
  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node || !active) {
      setWidth(0);
      return;
    }
    const sync = (): void => {
      setWidth((prev) => (prev === node.clientWidth ? prev : node.clientWidth));
    };
    sync();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", sync);
      return () => window.removeEventListener("resize", sync);
    }
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  // 内容尺寸变化即回到初始视图；用户自己的缩放平移不被覆盖（base 身份稳定）
  useLayoutEffect(() => {
    if (!base) return;
    cancelAlign();
    applyTransform(base);
  }, [base, applyTransform, cancelAlign]);

  /**
   * 缓动到目标变换
   * @param target 目标变换
   * @param duration 动画时长（毫秒）
   * @returns 无
   */
  const animateTo = useCallback(
    (target: Transform, duration: number = ANIMATION_DURATION) => {
      cancelAlign();
      const from = current.current;
      const settled =
        Math.abs(target.x - from.x) < 0.5 &&
        Math.abs(target.y - from.y) < 0.5 &&
        Math.abs(target.scale - from.scale) < 0.001;
      if (settled) {
        applyTransform(target);
        return;
      }
      const startedAt = performance.now();
      const step = (now: number): void => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = easeOut(progress);
        applyTransform({
          scale: from.scale + (target.scale - from.scale) * eased,
          x: from.x + (target.x - from.x) * eased,
          y: from.y + (target.y - from.y) * eased,
        });
        animation.current = progress < 1 ? requestAnimationFrame(step) : null;
      };
      animation.current = requestAnimationFrame(step);
    },
    [applyTransform, cancelAlign],
  );

  /** 手势结束：越界才缓动回最近合法位置，界内原地不动 */
  const settle = useCallback(() => {
    if (!size || !viewport) return;
    const target = alignToBounds(current.current, viewport, size);
    animateTo(target);
  }, [size, viewport, animateTo]);

  // 卸载时停掉动画，避免对已卸载组件写 DOM
  useEffect(() => cancelAlign, [cancelAlign]);

  /**
   * 以某点为锚点缩放
   * @param factor 倍率因子
   * @param point 锚点（相对视口左上角）
   * @param animated 是否缓动（按钮触发时为 true，滚轮为 false）
   * @returns 无
   * @description 变换层以视口左上角为原点，因此 `point` 与变换的坐标系天然一致，
   *   缩放后指针下的图形位置保持不变。
   */
  const zoomAt = useCallback(
    (factor: number, point: Point, animated = false) => {
      if (!size || !viewport) return;
      const prev = current.current;
      const scale = clampScale(prev.scale * factor);
      if (scale === prev.scale) return;
      const ratio = scale / prev.scale;
      const target = alignToBounds(
        {
          scale,
          x: point.x - (point.x - prev.x) * ratio,
          y: point.y - (point.y - prev.y) * ratio,
        },
        viewport,
        size,
      );
      if (animated) animateTo(target);
      else applyTransform(target);
    },
    [size, viewport, applyTransform, animateTo],
  );

  // 滚轮：只有 Ctrl/⌘ 或按住左键时才缩放，其余交还给页面滚动。
  // active 依赖「已出图」：视口挂载前 ref 为空，提前绑定会绑不到元素。
  useEffect(() => {
    const node = viewportRef.current;
    if (!node || !active) return;
    const onWheel = (event: WheelEvent): void => {
      if (pinch.current) return;
      if (!event.ctrlKey && !event.metaKey && drag.current === null) return;
      event.preventDefault();
      cancelAlign();
      const rect = node.getBoundingClientRect();
      const factor = Math.min(STEP_MAX, Math.max(STEP_MIN, Math.exp(-normalizeDelta(event) * K)));
      zoomAt(factor, { x: event.clientX - rect.left, y: event.clientY - rect.top });
      // 拖动中缩放：把平移基准重锚到「当前指针位置 + 新的变换」。
      // 只改 baseX 不改 startX，下一次 pointermove 会把已累计的拖动位移算进去，表现为图被顶回去。
      const session = drag.current;
      if (session) {
        drag.current = {
          ...session,
          baseX: current.current.x,
          baseY: current.current.y,
          startX: event.clientX,
          startY: event.clientY,
        };
      }
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [active, zoomAt, cancelAlign]);

  /**
   * 开始双指捏合（第二根手指按下时）
   * @returns 无
   */
  const beginPinch = useCallback(() => {
    const list = [...pointers.current.values()].slice(0, 2);
    if (list.length < 2) return;
    pinch.current = {
      startDistance: distance(list[0], list[1]),
      startMid: midpoint(list[0], list[1]),
      start: current.current,
    };
    // 捏合与单指拖动互斥：不结束拖动会话，缩放时会被下一次移动顶回
    drag.current = null;
    setDragging(false);
  }, []);

  /**
   * 指针按下：开始拖动会话，或转成双指捏合
   * @param event 指针事件
   * @returns 无
   * @description 第二根手指按下不覆盖第一根的会话（否则会互相顶，表现为「拖动卡住」），
   *   而是升级为捏合。链接/图片/表单控件上按下不接管。
   */
  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!active || event.button !== 0) return;
      if ((event.target as Element).closest(PAN_EXCLUDE)) return;
      cancelAlign();
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      // 每一根手指都要捕获：捏合时手指常滑出元素外，不捕获就收不到后续 move
      event.currentTarget.setPointerCapture(event.pointerId);
      if (pointers.current.size >= 2) {
        beginPinch();
        return;
      }
      drag.current = {
        pointerId: event.pointerId,
        baseX: current.current.x,
        baseY: current.current.y,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      setDragging(true);
    },
    [active, cancelAlign, beginPinch],
  );

  /**
   * 指针移动：双指时捏合缩放，单指时平移
   * @param event 指针事件
   * @returns 无
   * @description 平移立即跟手（不再等越过 5px），阈值只用来判定「算不算点击 / 要不要回弹」。
   */
  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!size || !viewport) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      // ---- 双指捏合：以两指中点为锚点等比缩放，中点位移同时带动平移 ----
      const zooming = pinch.current;
      if (zooming && pointers.current.size >= 2) {
        const list = [...pointers.current.values()].slice(0, 2);
        const spread = distance(list[0], list[1]);
        if (zooming.startDistance <= 0 || spread <= 0) return;
        const scale = clampScale(zooming.start.scale * (spread / zooming.startDistance));
        const ratio = scale / zooming.start.scale;
        const mid = midpoint(list[0], list[1]);
        applyTransform({
          scale,
          x: clampOvershoot(
            mid.x - (zooming.startMid.x - zooming.start.x) * ratio,
            axisBounds(viewport.width, size.width * scale),
            viewport.width,
          ),
          y: clampOvershoot(
            mid.y - (zooming.startMid.y - zooming.start.y) * ratio,
            axisBounds(viewport.height, size.height * scale),
            viewport.height,
          ),
        });
        return;
      }

      // ---- 单指平移 ----
      const session = drag.current;
      if (!session || session.pointerId !== event.pointerId) return;
      const dx = event.clientX - session.startX;
      const dy = event.clientY - session.startY;
      if (!session.moved && Math.hypot(dx, dy) > CLICK_SLOP) session.moved = true;
      const scale = current.current.scale;
      applyTransform({
        scale,
        x: clampOvershoot(
          session.baseX + dx,
          axisBounds(viewport.width, size.width * scale),
          viewport.width,
        ),
        y: clampOvershoot(
          session.baseY + dy,
          axisBounds(viewport.height, size.height * scale),
          viewport.height,
        ),
      });
    },
    [size, viewport, applyTransform],
  );

  /**
   * 指针抬起 / 取消：结束拖动或捏合，越界则回弹
   * @param event 指针事件
   * @returns 无
   */
  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      pointers.current.delete(event.pointerId);
      const session = drag.current;
      if (session && session.pointerId === event.pointerId) {
        drag.current = null;
        setDragging(false);
        if (session.moved) settle();
      }
      // 捏合中抬起一指即结束捏合；剩下的手指不再接手动平移，避免图被甩走
      if (pinch.current && pointers.current.size < 2) {
        pinch.current = null;
        settle();
      }
    },
    [settle],
  );

  /** 视口中心（按钮缩放锚点） */
  const center = useMemo<Point>(
    () => (viewport ? { x: viewport.width / 2, y: viewport.height / 2 } : { x: 0, y: 0 }),
    [viewport],
  );

  /** 放大（以视口中心为锚点，200ms 缓动） */
  const zoomIn = useCallback(() => zoomAt(1.25, center, true), [zoomAt, center]);

  /** 缩小（以视口中心为锚点，200ms 缓动） */
  const zoomOut = useCallback(() => zoomAt(0.8, center, true), [zoomAt, center]);

  /** 重置：缓动回到初始适配视图 */
  const reset = useCallback(() => {
    drag.current = null;
    pinch.current = null;
    pointers.current.clear();
    setDragging(false);
    if (base) animateTo(base);
  }, [base, animateTo]);

  return {
    /** 视口（手势面）ref */
    ref: viewportRef,
    /** 变换层回调 ref：手势期间由本 hook 直写它的 style */
    stage: setStage,
    dragging,
    /** 视口高度：指定 height 时取上限，否则取初始适配高度 */
    viewportHeight: viewport?.height ?? null,
    /** 是否已算出初始视图（false 时应隐藏变换层，避免先 1:1 再跳） */
    ready: base !== null,
    zoomIn,
    zoomOut,
    reset,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
