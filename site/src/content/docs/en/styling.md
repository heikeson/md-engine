# Styles and tokens

`@heikeson/md-engine/styles.css` is `styles/index.css` bundled into one file, and all of it is plain CSS: no `@apply`, no host theme, no Tailwind. Colours go through exactly nine `--lkes-*` tokens.

## Nine tokens

| Token | Purpose | Light | Dark |
|---|---|---|---|
| `--lkes-bg` | Surface | `#ffffff` | `#0f1419` |
| `--lkes-fg` | Primary text | `#1f2937` | `#e8eef2` |
| `--lkes-muted` | Secondary text | `#6b7280` | `#9aa8b0` |
| `--lkes-fill` | Subtle surface | `#f3f4f6` | `#1a222a` |
| `--lkes-border` | Border | `#e5e7eb` | `#232c34` |
| `--lkes-accent` | Accent | `#0f766e` | `#19d3c5` |
| `--lkes-ring` | Focus ring | `#0f766e` | `#19d3c5` |
| `--lkes-radius` | Corner radius | `0.5rem` | `0.5rem` |
| `--lkes-overlay` | Overlay | `rgb(0 0 0 / 0.8)` | `rgb(0 0 0 / 0.85)` |

Component styles use `var(--lkes-*)` with inline fallbacks (`var(--lkes-border, #e5e7eb)`), so an undefined token still yields a usable look.

## Why two sets of literals

If a token is written as `--lkes-bg: var(--background, #fff)`, the `var()` is substituted at the declaration site (`:root`) and frozen there. Changing `--background` on `.dark` afterwards does not recompute it, so dark mode never kicks in.

`tokens.css` therefore ships both palettes as literals: light on `:root`, dark under `.dark` and `[data-theme="dark"]` ancestor scopes. Components resolve `var(--lkes-*)` on the element, so adding `.dark` to an ancestor switches Callout, Tabs, Steps, Cards, Accordion, Files, TypeTable, Image and the editor at once.

<Callout type="tip" title="The host does one thing">
  Add `dark` (or `data-theme="dark"`) to `<html>` or any ancestor. No configuration, no extra dark stylesheet.
</Callout>

## Scope

| Stylesheet | Selector prefix | Needs `prose-site` |
|---|---|---|
| `callout` / `tabs` / `steps` / `cards` / `accordion` / `files` / `type-table` / `image` | `.prose-site …` | yes |
| `mermaid` | `.lkes-mermaid …` | no |
| `editor` | `.md-editor …` | no |

`MarkdownRenderer` renders `<div className={className}>`, so `className="prose-site"` goes on that element. Without the class the eight components still output their DOM and text, but no border, padding or colour applies.

## Overriding

Redeclare the same variables in ordinary CSS (outside `@layer`). The package declares everything inside `@layer lkes.tokens` and `@layer lkes.components`, and unlayered declarations win, so there is no import-order fight.

```css
/* Brand colour */
:root {
  --lkes-accent: #4f46e5;
  --lkes-ring: #4f46e5;
}

.dark {
  --lkes-accent: #8b8cf0;
  --lkes-ring: #8b8cf0;
}
```

Declaring them on the content container scopes the change to that block.

<Callout type="important" title="Unlayered element resets win too">
  Host rules such as `button { border: 0 }` or `* { margin: 0 }` also outrank `@layer lkes.components`.
  When a button loses its border, check the host's own element resets before reaching for `!important`.
</Callout>

`Callout` declares only five hue variables `--lkes-tone` (note blue, tip green, important purple, warning orange, caution red); backgrounds and text colours are derived from the hue with `color-mix(in oklab, …)` mixed towards `--lkes-fg`, so light and dark share one set of values. To recolour one branch, change its `--lkes-tone`, not the nine global tokens.

## Per-component imports

If you do not want the whole stylesheet, take only the slices you need:

```ts
import "@heikeson/md-engine/styles/tokens.css";
import "@heikeson/md-engine/styles/callout.css";
```

<Files>
  <Folder name="styles" defaultOpen>
    <File name="index.css" />
    <File name="tokens.css" />
    <File name="callout.css" />
    <File name="tabs.css" />
    <File name="accordion.css" />
    <File name="cards.css" />
    <File name="files.css" />
    <File name="type-table.css" />
    <File name="image.css" />
    <File name="steps.css" />
    <File name="mermaid.css" />
    <File name="editor.css" />
    <File name="engine.css" />
  </Folder>
</Files>

- `index.css` only declares the layer order (`@layer lkes.tokens, lkes.components;`) and `@import`s the slices.
- `tokens.css` must come before the component slices, otherwise their `var()` lookups fall back to the inline values.
- `engine.css` is the old path forwarding entry; its whole content is `@import "./index.css";`.

## Mermaid uses its own palette

Diagrams use a separate `--lkes-chart-*` set (`bg` / `fg` / `node` / `node-border` / `line` / `series-1` … `series-6`) declared on `.lkes-mermaid`, with the dark set on `.dark .lkes-mermaid`. It reads neither host variables nor `--lkes-*`. To recolour diagrams use `configureChartTheme` — see **Editor and diagrams**.

## Three hard constraints

<Accordion>
  <AccItem title="Syntax only grows" type="open">Published component names, attribute names and semantics are only added, never changed. Existing content needs no migration.</AccItem>
  <AccItem title="Config only grows" type="close">New options must ship with defaults and must not change existing behaviour.</AccItem>
  <AccItem title="Styles ship with the package" type="close">Class names come from the package; consumers override variables, not class names.</AccItem>
</Accordion>

Violating any of them breaks existing content, and this project does not migrate content.
