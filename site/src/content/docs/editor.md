# 编辑器与图表

主入口只管渲染。编辑器和交互图表各自位于独立入口，不引入就不会进入产物——这正是入口隔离的意义。

## MarkdownEditor

编辑器以 Markdown 文本为唯一真源：左边 CodeMirror，右边实时预览，工具栏插入的容器骨架保证插入即为合法结构。

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

<Callout type="warning" title="编辑器是客户端组件">
  它依赖 CodeMirror 与 DOM，只能在客户端组件里使用。`view` 只决定初始视图，挂载后的切换由编辑器自己的工具栏接管。
</Callout>

<TypeTable>
  <TypeItem name="value" type="string" required />
  <TypeItem name="onChange" type="(value: string) => void" required />
  <TypeItem name="view" type="split | source | preview" default="split" />
  <TypeItem name="config" type="EditorConfig" />
  <TypeItem name="fullscreen" type="boolean" />
  <TypeItem name="onToggleFullscreen" type="() => void" />
</TypeTable>

## 配置项

<TypeTable>
  <TypeItem name="placeholder" type="string" />
  <TypeItem name="readOnly" type="boolean" />
  <TypeItem name="uploadImage" type="(file: File) => Promise<string>" />
  <TypeItem name="rendererConfig" type="RenderConfig" />
</TypeTable>

`uploadImage` 由宿主注入，引擎不假设你的存储在哪。`rendererConfig` 整体透传给预览渲染器，`sourcePositions` 由编辑器强制开启，不用你操心。

## 滚动同步

旧做法是「贴到最近锚点顶部」，源码滚到两块之间时预览会跳到前一个块——通常是标题，视觉上不连贯。现在改成区间插值：

1. 只保留最内层锚点，避免父子块互相抢。
2. 用 `posAtCoords` 取精确字符位置，而不是按块取整。
3. 相邻锚点之间线性插值；预览反向驱动源码时用 `lineBlockAt` 直接设 `scrollTop`。

## Mermaid

`<Mermaid>` 在主入口里只渲染源码骨架，不加载 mermaid。要图表真正可缩放、可导出，在客户端组件里合并覆写表：

```tsx
"use client";
import { MarkdownRenderer, mdxComponents } from "@heikeson/md-engine";
import { mermaidComponents } from "@heikeson/md-engine/mermaid";
import "@heikeson/md-engine/styles.css";

const components = { ...mdxComponents, ...mermaidComponents };

<MarkdownRenderer content={md} config={{ components }} />;
```

<Callout type="important" title="键名必须大写开头">
  渲染层按 hast 的 tagName 查表，写成 `mermaid` 不会报错，只会静默停留在源码骨架。这一问题不易察觉，故在此说明。
</Callout>

`mermaid` 是可选 peer，未安装时不打包、运行时降级为源码；`dompurify` 是直接依赖，随包安装。

## 图表配色

图表不读宿主的任何 CSS 变量，亮暗两套内置在 `styles/mermaid.css` 的组件作用域里，祖先带 `.dark` 就自动切换。要整体换色用 JS 配置：

```ts
import { configureChartTheme } from "@heikeson/md-engine/mermaid";

configureChartTheme({
  light: { series1: "#0f766e" },
  dark: { series1: "#19d3c5" },
});
```

取色优先级是「JS 配置 → CSS 变量 → 内置」，三层都不满足才回退默认值。

## 导出

图表右上角能下载 SVG 与 PNG，也可以自己做按钮直接调用：

```ts
import { downloadSvg, downloadPng } from "@heikeson/md-engine/mermaid";
```

PNG 走的是先把 SVG 转成 blob 再画到 canvas，因此外部图片必须同源，否则会被 canvas 污染而导出失败。
