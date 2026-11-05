# 编辑器与图表

主入口只做解析与渲染。编辑器、图表交互各自独立入口，不 import 就不会进产物。

| 入口 | 内容 | 依赖 |
|---|---|---|
| `@heikeson/md-engine` | parse / serialize / `MarkdownRenderer` / 注册表 / 语言工具 | React |
| `@heikeson/md-engine/editor` | `MarkdownEditor`、文本动作、插入片段 | CodeMirror 6 |
| `@heikeson/md-engine/components` | 组件映射表（只取单个组件时用） | React |
| `@heikeson/md-engine/mermaid` | 交互式图表：缩放、源码切换、导出 | 可选 peer `mermaid` |
| `@heikeson/md-engine/locales/zh-CN`、`/en-US` | 内置语言包 | 无 |
| `@heikeson/md-engine/styles.css` | 打包后的原生 CSS | 无 |

## MarkdownEditor

```tsx
"use client";

import { useState } from "react";
import { MarkdownEditor } from "@heikeson/md-engine/editor";
import "@heikeson/md-engine/styles.css";

export default function EditorPage() {
  const [value, setValue] = useState("");
  return (
    <MarkdownEditor
      value={value}
      onChange={setValue}
      view="split"
      config={{ placeholder: "开始写作…" }}
    />
  );
}
```

<Callout type="warning" title="只能在客户端组件里用">
  编辑器依赖 CodeMirror 与 DOM。`view` 只在挂载时读一次，之后由工具栏的视图按钮接管；
  要从外部切换视图，给组件换 `key` 重挂载（本站 Playground 就是 `key={view}`）。
</Callout>

<TypeTable>
  <TypeItem name="value" type="string" required />
  <TypeItem name="onChange" type="(value: string) => void" required />
  <TypeItem name="view" type="split | source | preview" default="split" />
  <TypeItem name="config" type="EditorConfig" />
  <TypeItem name="fullscreen" type="boolean" />
  <TypeItem name="onToggleFullscreen" type="() => void" />
</TypeTable>

`fullscreen` 与 `onToggleFullscreen` 成对传入才显示全屏按钮：状态由宿主持有，编辑器只负责触发。

## 配置项

| 字段 | 类型 | 说明 |
|---|---|---|
| `placeholder` | `string` | 空文档时的提示；优先于 `messages.editorPlaceholder` |
| `readOnly` | `boolean` | 只读 |
| `uploadImage` | `(file: File) => Promise<string>` | 粘贴或拖入图片时调用，返回可访问 URL |
| `rendererConfig` | `RenderConfig` | 整体透传给预览渲染器 |
| `locale` | `string` | 文案语言；不给则继承 `MdEngineProvider`，再退到 `zh-CN` |
| `fallbackLocale` | `string` | 目标语言未内置时的回退语言，默认 `zh-CN` |
| `messages` | `UITextPatch` | 逐键覆写文案 |
| `text` | `UITextPatch` | 已废弃，`messages` 优先 |

- 预览侧 `sourcePositions` 由编辑器强制开启（滚动同步依赖 `data-src-start`），不用传。
- `uploadImage` 返回的 URL 会被写成 `<Image src="…" alt="文件名去掉扩展名" />`。
- 预览走 `useDeferredValue`：按键先更新文本，parse 与渲染在后台帧完成。

想在预览里看到可交互图表，传 `config={{ rendererConfig: { components: mermaidComponents } }}`。编辑器入口不直接依赖 `/mermaid`，否则 CodeMirror 入口会连带 mermaid 进产物。

## 工具栏与快捷键

工具栏的包裹 / 行首前缀按钮与快捷键调用同一组纯函数（`insertAtCursor`、`wrapSelection`、`toggleLinePrefix`），所以两条路径的结果一致。

| 快捷键 | 动作 |
|---|---|
| `Mod+B` | `**粗体**` |
| `Mod+I` | `*斜体*` |
| `Mod+E` | 行内码 |
| `Mod+Shift+S` | `~~删除线~~` |
| `Mod+1` | 行首加 `## ` |
| `Mod+Shift+Q` | 行首加 `> ` |
| `Mod+Shift+L` | 行首加 `- ` |

`Mod` 在 macOS 上是 `Cmd`，其他平台是 `Ctrl`；自定义快捷键排在 `defaultKeymap` 之前，同组合以编辑器为准。

可一键插入的容器共 9 个：`Callout`、`Tabs`、`Steps`、`Cards`、`Accordion`、`Files`、`TypeTable`、`Image`、`Mermaid`。骨架文本由 `blockSnippet(name)` 按注册表生成，属性名与子项名不会与解析规则脱节。

## 滚动同步

预览块上带 `data-src-start`（源码 offset），同步按区间插值而不是「贴到最近锚点」：

1. 只保留最内层锚点，并丢弃 top 非单调的脏点，保证 offset 与 top 同时单调。
2. 源码 → 预览：`posAtCoords` 取视口顶部的精确字符位置，在相邻锚点区间内线性插值出像素位置。
3. 预览 → 源码：按像素进度插值出 offset，再用 `lineBlockAt` 直接设 `scrollTop`（不用 `scrollIntoView`，它会逐块跳动）。
4. 回环抑制：发起方持有 120ms 归属锁，期间反向滚动事件被忽略；滚动回调按 `requestAnimationFrame` 合并。
5. `ResizeObserver` 与 `MutationObserver` 监听预览容器，图片加载、折叠展开、图表出图后重建锚点缓存。

## Mermaid

`<Mermaid>` 在主入口只输出源码骨架，不加载 mermaid。要可缩放、可导出，在客户端组件里合并覆写表：

```tsx
"use client";
import { MarkdownRenderer, mdxComponents } from "@heikeson/md-engine";
import { mermaidComponents } from "@heikeson/md-engine/mermaid";
import "@heikeson/md-engine/styles.css";

const components = { ...mdxComponents, ...mermaidComponents };

<MarkdownRenderer content={md} config={{ components }} />;
```

- 键必须是大写 `Mermaid`：渲染层按 hast 的 `tagName` 查表，写成小写不报错，只会停在源码骨架。
- `mermaid` 是可选 peer，未安装时不打包、运行时降级为源码；`dompurify` 是直接依赖，随包安装，用于净化渲染产物。
- 图表进入视口才开始加载 mermaid；同一份源码与配色会命中 LRU 缓存。
- `securityLevel` 固定 `strict`，`htmlLabels: false`：图内文字走 SVG `<text>`，不使用 `foreignObject`（Canvas 不绘制它，导出 PNG 会空白）。

## 图表配色

图表不读宿主的 CSS 变量，只认自己的一套：

| 来源 | 变量 / 接口 |
|---|---|
| 包内 CSS | `--lkes-chart-bg` / `-fg` / `-node` / `-node-border` / `-line` / `-series-1` … `-series-6` |
| JS 配置 | `configureChartTheme({ light, dark })` |

优先级是「JS 配置 → `--lkes-chart-*` → 内置默认」：调过 `configureChartTheme` 之后，改 CSS 变量不再影响图表。传入的字段与 `ChartTokens` 一致，是 `bg` / `fg` / `node` / `nodeBorder` / `line` / `series` / `fontFamily`，未给的字段沿用默认：

```ts
import { configureChartTheme } from "@heikeson/md-engine/mermaid";

configureChartTheme({
  light: { node: "#e7f0ea", series: ["#0f766e", "#0ea5e9", "#6366f1"] },
  dark: { node: "#1e3037", series: ["#19d3c5", "#38bdf8", "#818cf8"] },
});
```

亮暗切换靠祖先的 `.dark` 类或 `[data-theme="dark"]`，组件自己订阅，不需要重新配置。

## 导出

图表工具栏提供下载 SVG 与 PNG，也可以用同样的函数做自己的按钮：

```ts
import { downloadSvg, downloadPng } from "@heikeson/md-engine/mermaid";

downloadSvg(svgMarkup);                                    // 传已净化的 SVG 标记
await downloadPng(svgMarkup, "#ffffff");                   // 第二个参数是底色
```

PNG 的流程是 SVG → Blob → `<img>` → Canvas，放大 2 倍绘制后按 `mermaid-<时间戳>.png` 下载。因此图里引用的外部图片必须同源，否则 Canvas 被污染，导出失败。`prepareSvg` 会补 `xmlns` 并把自适应宽度改成显式宽高，这几步是 PNG 不出空白的必要条件。
