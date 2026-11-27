/**
 * @file 内容组件集合与渲染映射
 * @description 映射键与 mdast 节点名完全一致（首字母大写），由渲染层的 hast tagName 直接查表。
 *   新增组件时：先在 registry 声明，再在此登记组件实现。
 * @created 2026-10-24 20:10
 * @updated 2026-11-27 10:20 登记 Columns / Column、Timeline / TimelineItem、Video
 */

import AccItem from "./acc-item";
import Accordion from "./accordion";
import Callout from "./callout";
import Card from "./card";
import Cards from "./cards";
import Column from "./column";
import Columns from "./columns";
import File from "./file";
import Files from "./files";
import Folder from "./folder";
import MdImage from "./image";
import MermaidPlaceholder from "./mermaid-placeholder";
import Step from "./step";
import Steps from "./steps";
import Tab from "./tab";
import Tabs from "./tabs";
import Timeline from "./timeline";
import TimelineItem from "./timeline-item";
import TypeItem from "./type-item";
import TypeTable from "./type-table";
import Video from "./video";

/**
 * 组件名 → React 组件 的映射
 * @description 键必须与 `<Name>` 中的名字一致（大小写敏感）
 */
export const mdxComponents = {
  Callout,
  Tabs,
  Tab,
  Steps,
  Step,
  Cards,
  Card,
  Accordion,
  AccItem,
  Files,
  Folder,
  File,
  TypeTable,
  TypeItem,
  Columns,
  Column,
  Timeline,
  TimelineItem,
  Video,
  Image: MdImage,
  // 图表：主入口只出源码骨架；交互由 `/mermaid` 入口通过 components 覆写替换
  Mermaid: MermaidPlaceholder,
};

export {
  AccItem,
  Accordion,
  Callout,
  Card,
  Cards,
  Column,
  Columns,
  File,
  Files,
  Folder,
  MdImage,
  MermaidPlaceholder,
  Step,
  Steps,
  Tab,
  Tabs,
  Timeline,
  TimelineItem,
  TypeItem,
  TypeTable,
  Video,
};
export type { MermaidProps } from "./mermaid-placeholder";
export type { VideoProps } from "./video";
