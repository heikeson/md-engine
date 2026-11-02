/**
 * @file 语言偏好持久化（localStorage 适配层）
 * @description 只负责"读写一个字符串"，不做任何策略决定：不在模块顶层访问 window，
 *   不主动写入（写入必须由宿主显式调用）。默认键名为 `lkes-md-lang`，宿主可整体替换实现
 *   （换成 cookie / KV / 内存都可以）。
 * @created 2026-11-02 19:32
 * @updated 2026-11-02 19:32
 */

/** 默认存储键 */
export const DEFAULT_LOCALE_STORAGE_KEY = "lkes-md-lang";

/** 语言偏好读写接口 */
export interface LocaleStorage {
  /** 读取已保存的语言；无值或不可用时返回 null */
  get(): string | null;
  /** 保存语言 */
  set(locale: string): void;
  /** 清除已保存的语言 */
  remove(): void;
}

/** 自定义存储实现 */
export interface LocaleStorageOptions {
  /** 存储键名，默认 `lkes-md-lang` */
  key?: string;
  /** 自定义读取（给定时忽略 key） */
  get?: () => string | null;
  /** 自定义写入 */
  set?: (locale: string) => void;
  /** 自定义清除 */
  remove?: () => void;
}

/**
 * 取浏览器的 localStorage（不可用时返回 null）
 * @returns 存储对象或 null
 * @description 隐私模式 / 服务端环境下访问 localStorage 会抛错，这里统一吞掉。
 */
function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * 创建语言偏好存取器
 * @param options 键名或完全自定义的读写实现
 * @returns 读写接口；非浏览器环境下 get 恒为 null、set/remove 为空操作
 */
export function createLocaleStorage(options?: LocaleStorageOptions): LocaleStorage {
  const key = options?.key ?? DEFAULT_LOCALE_STORAGE_KEY;

  return {
    get(): string | null {
      if (options?.get) {
        try {
          return options.get();
        } catch {
          return null;
        }
      }
      const store = safeStorage();
      if (!store) return null;
      try {
        return store.getItem(key);
      } catch {
        return null;
      }
    },

    set(locale: string): void {
      if (options?.set) {
        try {
          options.set(locale);
        } catch {
          /* 宿主回调异常不影响渲染 */
        }
        return;
      }
      const store = safeStorage();
      if (!store) return;
      try {
        store.setItem(key, locale);
      } catch {
        /* 配额或隐私模式：静默失败 */
      }
    },

    remove(): void {
      if (options?.remove) {
        try {
          options.remove();
        } catch {
          /* 同上 */
        }
        return;
      }
      const store = safeStorage();
      if (!store) return;
      try {
        store.removeItem(key);
      } catch {
        /* 同上 */
      }
    },
  };
}
