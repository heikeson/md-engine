/**
 * @file 渲染器覆盖表
 * @description 全站共用一份：代码块用站点实现（带标题栏与复制），
 *   链接用站内路由（避免整页刷新）。其余容器一律沿用包内实现——
 *   覆盖越多，官网越不像真实使用场景，也就越不能当作回归测试。
 * @created 2026-11-02 01:52
 * @updated 2026-11-02 01:52
 */

import type { RenderConfig } from "@heikeson/md-engine";
import { CodeBlock } from "./CodeBlock";
import { SmartLink } from "./SmartLink";

/** 传给 MarkdownRenderer 的 config */
export const SITE_RENDER_CONFIG: RenderConfig = {
  components: { pre: CodeBlock, a: SmartLink },
};
