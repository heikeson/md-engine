/**
 * @file 内容语法注册表（唯一事实来源）
 * @description 声明受支持的容器组件、子项、属性白名单与嵌套深度上限。
 *   解析（micromark 扩展）、序列化（mdast handler）、编辑器块 UI 全部读取本文件，
 *   禁止在别处再硬编码组件名或属性名。改动本文件即改动内容语法，须同步
 *   `docs/markdown/02-语法规范.md` 与引擎对接契约。
 * @created 2026-10-24 20:07
 * @updated 2026-10-24 20:07
 */

/** 组件的编辑形态：visual 允许结构化编辑；source 只按源码块保留 */
export type ComponentMode = "visual" | "source";

/** 容器组件声明 */
export interface ComponentSpec {
  /** 组件名，首字母大写，区分大小写 */
  readonly name: string;
  /** 编辑形态 */
  readonly mode: ComponentMode;
  /** 子项组件名；单一子项传字符串，混用多种子项传数组（如 Files 的 Folder/File） */
  readonly items?: string | readonly string[];
  /** 允许的字符串属性名 */
  readonly attrs?: readonly string[];
  /** 允许的布尔属性名（无值写法，如 `default`） */
  readonly boolAttrs?: readonly string[];
  /** 叶子组件，允许自闭合写法（仅 Image） */
  readonly selfClosing?: boolean;
  /** 属性缺省值 */
  readonly defaultAttrs?: Readonly<Record<string, string | boolean>>;
}

/** 子项声明（Tab / Step / Card / AccItem / Folder / File） */
export interface ItemSpec {
  readonly name: string;
  readonly attrs?: readonly string[];
  readonly boolAttrs?: readonly string[];
  /** 叶子子项，允许自闭合写法（如 `<File name="x" />`） */
  readonly selfClosing?: boolean;
}

/**
 * 容器嵌套深度上限。
 * 只统计容器组件，子项（Tab/Step/Card/AccItem）不计层。
 * 取 3 的依据：2 层已覆盖绝大多数写作场景，第 4 层起文本与 UI 均不可读。
 */
export const MAX_CONTAINER_DEPTH = 3;

/** 子项声明表 */
export const ITEMS: Readonly<Record<string, ItemSpec>> = {
  Tab: { name: "Tab", attrs: ["value"], boolAttrs: ["default"] },
  Step: { name: "Step", attrs: ["title"] },
  // 允许自闭合：fumadocs 风格 `<Card title="…" description="…" />`（描述写在属性里）
  Card: { name: "Card", attrs: ["title", "href", "icon", "description"], selfClosing: true },
  // type: open / close —— 控制默认展开还是收起
  AccItem: { name: "AccItem", attrs: ["title", "type"] },
  // 文件树目录：可嵌套，defaultOpen 布尔控制默认展开
  Folder: { name: "Folder", attrs: ["name"], boolAttrs: ["defaultOpen"] },
  // 文件树叶子：自闭合，href 可选（给了就渲染成链接）
  File: { name: "File", attrs: ["name", "href"], selfClosing: true },
  // 类型表行：name 属性名、type 类型、default 默认值、required 布尔必填
  TypeItem: { name: "TypeItem", attrs: ["name", "type", "default"], boolAttrs: ["required"] },
};

/** 容器组件声明表 */
export const COMPONENTS: Readonly<Record<string, ComponentSpec>> = {
  Callout: {
    name: "Callout",
    mode: "visual",
    attrs: ["type", "title"],
    defaultAttrs: { type: "note" },
  },
  Tabs: { name: "Tabs", mode: "visual", items: "Tab" },
  Steps: { name: "Steps", mode: "visual", items: "Step" },
  Cards: { name: "Cards", mode: "visual", items: "Card" },
  Accordion: { name: "Accordion", mode: "visual", items: "AccItem" },
  // 文件树容器：子项可混用 Folder / File
  Files: { name: "Files", mode: "visual", items: ["Folder", "File"] },
  // 类型表：fumadocs 的 TypeTable，但属性只支持字符串，故用子项而非对象表达式
  TypeTable: { name: "TypeTable", mode: "visual", items: "TypeItem" },
  Image: {
    name: "Image",
    mode: "visual",
    selfClosing: true,
    attrs: ["src", "alt", "align", "width", "caption"],
    boolAttrs: ["zoom"],
    defaultAttrs: { align: "center" },
  },
};

/**
 * 取容器组件声明
 * @param name 组件名（区分大小写）
 * @returns 声明；不在白名单内返回 undefined
 */
export function getComponent(name: string): ComponentSpec | undefined {
  return COMPONENTS[name];
}

/**
 * 取子项声明
 * @param name 子项组件名
 * @returns 声明；不是子项返回 undefined
 */
export function getItemSpec(name: string): ItemSpec | undefined {
  return ITEMS[name];
}

/**
 * 列出全部容器组件名（供编辑器菜单与校验使用）
 * @returns 组件名数组
 */
export function listComponents(): string[] {
  return Object.keys(COMPONENTS);
}

/**
 * 判断是否为带子项的容器（Tabs / Steps / Cards / Accordion）
 * @param name 组件名
 * @returns 有子项声明返回 true
 */
export function isContainerWithItems(name: string): boolean {
  return Boolean(COMPONENTS[name]?.items);
}
