# Editor and diagrams

The main entry only renders. The editor and the interactive diagrams live in separate entries, so they never reach your bundle unless you import them — that is the point of entry isolation.

## MarkdownEditor

The editor treats Markdown text as the single source of truth: CodeMirror on the left, a live preview on the right, and toolbar buttons that insert container skeletons guaranteed to be valid structure.

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
      config={{ placeholder: "Start writing…" }}
    />
  );
}
```

<Callout type="warning" title="The editor is a client component">
  It relies on CodeMirror and the DOM, so it only works inside a client component. `view` only sets the initial layout; after mount, switching is handled by the editor's own toolbar.
</Callout>

<TypeTable>
  <TypeItem name="value" type="string" required />
  <TypeItem name="onChange" type="(value: string) => void" required />
  <TypeItem name="view" type="split | source | preview" default="split" />
  <TypeItem name="config" type="EditorConfig" />
  <TypeItem name="fullscreen" type="boolean" />
  <TypeItem name="onToggleFullscreen" type="() => void" />
</TypeTable>

## Configuration

<TypeTable>
  <TypeItem name="placeholder" type="string" />
  <TypeItem name="readOnly" type="boolean" />
  <TypeItem name="uploadImage" type="(file: File) => Promise<string>" />
  <TypeItem name="rendererConfig" type="RenderConfig" />
</TypeTable>

`uploadImage` is injected by the host; the engine makes no assumption about where you store files. `rendererConfig` is passed straight through to the preview renderer, and `sourcePositions` is enabled by the editor for you.

## Scroll sync

The old approach was "snap to the nearest anchor", so scrolling the source between two blocks made the preview jump to the previous block — usually a heading — which reads as disconnected. It now interpolates between ranges:

1. Keep only the innermost anchor, so parent and child blocks do not fight over the view.
2. Use `posAtCoords` for an exact character position instead of rounding to a block.
3. Interpolate linearly between adjacent anchors; when the preview drives the source, set `scrollTop` directly from `lineBlockAt`.

## Mermaid

In the main entry `<Mermaid>` renders only a source skeleton and does not load mermaid. To get a diagram that really zooms and exports, merge the override map in a client component:

```tsx
"use client";
import { MarkdownRenderer, mdxComponents } from "@heikeson/md-engine";
import { mermaidComponents } from "@heikeson/md-engine/mermaid";
import "@heikeson/md-engine/styles.css";

const components = { ...mdxComponents, ...mermaidComponents };

<MarkdownRenderer content={md} config={{ components }} />;
```

<Callout type="important" title="Keys must start with a capital letter">
  The renderer looks components up by hast `tagName`. Writing `mermaid` does not throw — the diagram silently stays in its source skeleton. That is easy to miss, hence this note.
</Callout>

`mermaid` is an optional peer: it is not bundled when absent, and the runtime degrades to the source view. `dompurify` is a direct dependency and installs with the package.

## Diagram colours

Diagrams read none of the host's CSS variables. Two palettes are built into the component scope of `styles/mermaid.css`, switching automatically under a `.dark` ancestor. To recolour everything, use the JS API:

```ts
import { configureChartTheme } from "@heikeson/md-engine/mermaid";

configureChartTheme({
  light: { series1: "#0f766e" },
  dark: { series1: "#19d3c5" },
});
```

Resolution order is "JS config → CSS variable → built-in"; the default is only used when all three are absent.

## Export

The diagram toolbar downloads SVG and PNG, and you can call the same helpers from your own buttons:

```ts
import { downloadSvg, downloadPng } from "@heikeson/md-engine/mermaid";
```

PNG export turns the SVG into a blob and draws it onto a canvas, so external images must be same-origin; otherwise the canvas is tainted and the export fails.
