# Editor and diagrams

The main entry only parses and renders. The editor and the interactive diagrams live in separate entries, so they never reach your bundle unless you import them.

| Entry | Contents | Depends on |
|---|---|---|
| `@heikeson/md-engine` | parse / serialize / `MarkdownRenderer` / registry / locale helpers | React |
| `@heikeson/md-engine/editor` | `MarkdownEditor`, text actions, insertable snippets | CodeMirror 6 |
| `@heikeson/md-engine/components` | component map (pick a single component) | React |
| `@heikeson/md-engine/mermaid` | interactive diagrams: zoom, source view, export | optional peer `mermaid` |
| `@heikeson/md-engine/locales/zh-CN` and `/en-US` | bundled locale packs | none |
| `@heikeson/md-engine/styles.css` | bundled plain CSS | none |

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
      config={{ placeholder: "Start writing…" }}
    />
  );
}
```

<Callout type="warning" title="Client components only">
  The editor needs CodeMirror and the DOM. `view` is read once on mount; afterwards the toolbar's view buttons own it.
  To change the view from outside, remount with a different `key` (this site's Playground uses `key={view}`).
</Callout>

<TypeTable>
  <TypeItem name="value" type="string" required />
  <TypeItem name="onChange" type="(value: string) => void" required />
  <TypeItem name="view" type="split | source | preview" default="split" />
  <TypeItem name="config" type="EditorConfig" />
  <TypeItem name="fullscreen" type="boolean" />
  <TypeItem name="onToggleFullscreen" type="() => void" />
</TypeTable>

The fullscreen button appears only when `fullscreen` and `onToggleFullscreen` are both passed: the host owns the state, the editor only fires the callback.

## Configuration

| Field | Type | Notes |
|---|---|---|
| `placeholder` | `string` | Empty-document hint; wins over `messages.editorPlaceholder` |
| `readOnly` | `boolean` | Read-only mode |
| `uploadImage` | `(file: File) => Promise<string>` | Called for pasted or dropped images; returns a reachable URL |
| `rendererConfig` | `RenderConfig` | Passed straight to the preview renderer |
| `locale` | `string` | UI language; falls back to `MdEngineProvider`, then `zh-CN` |
| `fallbackLocale` | `string` | Fallback when the target locale is not bundled; defaults to `zh-CN` |
| `messages` | `UITextPatch` | Per-key text overrides |
| `text` | `UITextPatch` | Deprecated; `messages` wins |

- The editor forces `sourcePositions` on for the preview (scroll sync relies on `data-src-start`), so you do not pass it.
- The URL returned by `uploadImage` is inserted as `<Image src="…" alt="file name without extension" />`.
- The preview reads through `useDeferredValue`: keystrokes update the text first, parse and render happen in a later frame.

To get interactive diagrams inside the built-in preview, pass `config={{ rendererConfig: { components: mermaidComponents } }}`. The editor entry never imports `/mermaid`, otherwise CodeMirror would drag mermaid into the bundle.

## Toolbar and shortcuts

The wrap / line-prefix toolbar buttons and the shortcuts call the same pure functions (`insertAtCursor`, `wrapSelection`, `toggleLinePrefix`), so both paths produce identical results.

| Shortcut | Action |
|---|---|
| `Mod+B` | `**bold**` |
| `Mod+I` | `*italic*` |
| `Mod+E` | Inline code |
| `Mod+Shift+S` | `~~strikethrough~~` |
| `Mod+1` | Prefix the line with `## ` |
| `Mod+Shift+Q` | Prefix the line with `> ` |
| `Mod+Shift+L` | Prefix the line with `- ` |

`Mod` is `Cmd` on macOS and `Ctrl` elsewhere. Custom keymap entries sit before `defaultKeymap`, so the editor wins on conflicts.

Nine containers can be inserted from the toolbar: `Callout`, `Tabs`, `Steps`, `Cards`, `Accordion`, `Files`, `TypeTable`, `Image`, `Mermaid`. The skeleton text comes from `blockSnippet(name)`, generated from the registry, so attribute and child names cannot drift from the parser.

## Scroll sync

Preview blocks carry `data-src-start` (source offset), and sync interpolates between ranges instead of snapping to the nearest anchor:

1. Only the innermost anchors are kept, and points whose `top` is not monotonic are dropped, so offset and `top` both increase.
2. Source → preview: `posAtCoords` gives the exact character at the top of the viewport, then the pixel position is interpolated between the two neighbouring anchors.
3. Preview → source: the offset is interpolated from the pixel progress, and `lineBlockAt` sets `scrollTop` directly (not `scrollIntoView`, which jumps block by block).
4. Loop suppression: the driver holds a 120 ms ownership lock, and scroll events from the other side are ignored; scroll callbacks are coalesced through `requestAnimationFrame`.
5. `ResizeObserver` plus `MutationObserver` watch the preview container and rebuild the anchor cache after image loads, expand/collapse and diagram renders.

## Mermaid

In the main entry `<Mermaid>` renders only a source skeleton and does not load mermaid. To get zoomable, exportable diagrams, merge the override map in a client component:

```tsx
"use client";
import { MarkdownRenderer, mdxComponents } from "@heikeson/md-engine";
import { mermaidComponents } from "@heikeson/md-engine/mermaid";
import "@heikeson/md-engine/styles.css";

const components = { ...mdxComponents, ...mermaidComponents };

<MarkdownRenderer content={md} config={{ components }} />;
```

- The key must be `Mermaid` with a capital M: the renderer looks components up by hast `tagName`. Lowercase does not throw, it just stays on the source skeleton.
- `mermaid` is an optional peer: nothing is bundled when it is absent, and the runtime degrades to the source view. `dompurify` is a direct dependency used to sanitise the rendered output.
- A diagram loads mermaid only once it enters the viewport; identical source plus palette hits an LRU cache.
- `securityLevel` is fixed to `strict` and `htmlLabels: false`: diagram text uses SVG `<text>` instead of `foreignObject`, which Canvas refuses to draw (PNG export would come out blank).

## Diagram colours

Diagrams read none of the host's CSS variables; they only use their own set:

| Source | Variables / API |
|---|---|
| Bundled CSS | `--lkes-chart-bg` / `-fg` / `-node` / `-node-border` / `-line` / `-series-1` … `-series-6` |
| JS config | `configureChartTheme({ light, dark })` |

Resolution order is "JS config → `--lkes-chart-*` → built-in default": once `configureChartTheme` has run, editing the CSS variables no longer affects diagram colours. Fields follow `ChartTokens` — `bg` / `fg` / `node` / `nodeBorder` / `line` / `series` / `fontFamily` — and anything omitted keeps the default:

```ts
import { configureChartTheme } from "@heikeson/md-engine/mermaid";

configureChartTheme({
  light: { node: "#e7f0ea", series: ["#0f766e", "#0ea5e9", "#6366f1"] },
  dark: { node: "#1e3037", series: ["#19d3c5", "#38bdf8", "#818cf8"] },
});
```

Light and dark switch through a `.dark` ancestor class or `[data-theme="dark"]`; the component subscribes itself, no reconfiguration needed.

## Export

The diagram toolbar downloads SVG and PNG, and your own buttons can call the same helpers:

```ts
import { downloadSvg, downloadPng } from "@heikeson/md-engine/mermaid";

downloadSvg(svgMarkup);                                    // sanitised SVG markup
await downloadPng(svgMarkup, "#ffffff");                   // second argument is the background
```

PNG goes SVG → Blob → `<img>` → Canvas, drawn at 2× and downloaded as `mermaid-<timestamp>.png`. Any external image inside the diagram must be same-origin, otherwise the canvas is tainted and the export fails. `prepareSvg` restores `xmlns` and replaces the responsive width with explicit dimensions — both are required for a non-blank PNG.
