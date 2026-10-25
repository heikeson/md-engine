/**
 * @file 自定义 token / 节点类型的模块扩展
 * @description micromark 与 mdast 的类型表是封闭的，自定义构造必须通过 declaration merging 注册，
 *   否则 `effects.enter("jsxBlock")` 与节点类型都不合法。这是 unified 生态规定的接入方式：
 *   - `micromark-util-types` 的 `TokenTypeMap`：注册 token 名
 *   - `mdast` 的 `RootContentMap` / `BlockContentMap`：注册节点类型
 *   `mdast-util-to-markdown` 的 `Handlers` 由 `Nodes['type']` 推导，因此无需单独扩展。
 * @created 2026-10-24 20:22
 * @updated 2026-10-24 20:22
 */

import type { JsxBlock } from "./jsx-mdast";

declare module "micromark-util-types" {
  interface TokenTypeMap {
    jsxBlock: "jsxBlock";
    jsxBlockOpenTag: "jsxBlockOpenTag";
    jsxBlockOpenTagMarker: "jsxBlockOpenTagMarker";
    jsxBlockName: "jsxBlockName";
    jsxBlockAttributes: "jsxBlockAttributes";
    jsxBlockOpenTagEnd: "jsxBlockOpenTagEnd";
    jsxBlockContent: "jsxBlockContent";
    jsxBlockCloseTag: "jsxBlockCloseTag";
    jsxBlockCloseTagMarker: "jsxBlockCloseTagMarker";
    jsxBlockCloseName: "jsxBlockCloseName";
    jsxBlockCloseTagEnd: "jsxBlockCloseTagEnd";
    jsxBlockProbe: "jsxBlockProbe";
  }
}

declare module "mdast" {
  interface RootContentMap {
    jsxBlock: JsxBlock;
  }

  interface BlockContentMap {
    jsxBlock: JsxBlock;
  }
}
