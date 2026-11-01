/**
 * @file 站点版本常量
 * @description 版本号唯一来源，取自仓库根 package.json。
 *   页头品牌与页脚版权共用同一份，避免两处硬编码先后漂移。
 * @created 2026-11-01 23:51
 * @updated 2026-11-01 23:51
 */

import pkg from "../../package.json";

/** 引擎版本号（不含 v 前缀），页头与页脚共用 */
export const ENGINE_VERSION: string = pkg.version;
