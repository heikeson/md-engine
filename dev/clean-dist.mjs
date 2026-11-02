/**
 * @file 清理 dist
 * @description 在 tsup 之前同步删除 dist。tsup 自带的 `clean` 与多入口 d.ts 生成并行时会
 *   争抢同一个声明文件（Windows 上表现为 safe-delete 失败），因此把清理挪到独立进程先做完。
 * @created 2026-11-02 19:32
 * @updated 2026-11-02 19:32
 */

import { rmSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve(process.cwd(), "dist");
rmSync(target, { recursive: true, force: true });
