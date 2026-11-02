# Styles and tokens

The bundled styles are plain CSS, scoped under `.prose-site`, with colours driven by a dedicated `--lkes-*` namespace.

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
| `--lkes-overlay` | Overlay | `rgb(0 0 0 / .8)` | `rgb(0 0 0 / .85)` |

## Why two sets of literals

This came from a real bug: if a token is written as `--lkes-bg: var(--background, #fff)`, the `var()` is substituted and frozen at the declaration site (`:root`). Changing `--background` on `.dark` afterwards has no effect on the already-computed value, so dark mode never kicks in.

The package therefore ships both palettes as literals: light on `:root`, dark under `.dark` and `[data-theme="dark"]` ancestor scopes. Components resolve `var(--lkes-*)` on the element, so adding `.dark` to an ancestor switches every component at once — no per-component handling.

<Callout type="tip" title="The host only does one thing">
  To make components follow a dark page, add a `dark` class to `<html>` or any ancestor. No configuration needed.
</Callout>

## Overriding

Redeclare the same variables in ordinary CSS. There is no import-order fight — unlayered declarations win over anything inside `@layer`.

```css
/* Swap in your brand colour */
:root {
  --lkes-accent: #4f46e5;
  --lkes-ring: #4f46e5;
}

.dark {
  --lkes-accent: #8b8cf0;
  --lkes-ring: #8b8cf0;
}
```

You can also scope it locally: put the declaration on the content container and only that block changes.

## Per-component imports

If you do not want the whole stylesheet, take individual slices:

```ts
import "@heikeson/md-engine/styles/callout.css";
```

<Files>
  <Folder name="styles" defaultOpen>
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
  </Folder>
</Files>

`styles/engine.css` remains as a forwarding entry for the old path, so upgrades do not break.

## Three hard constraints

<Accordion>
  <AccItem title="Syntax only grows" type="open">Published component names, attribute names and semantics are never changed, only added. Existing content needs no migration.</AccItem>
  <AccItem title="Config only grows" type="close">New options must ship with defaults and must not change existing behaviour.</AccItem>
  <AccItem title="Styles ship with the package" type="close">Class names come from the package; consumers override variables, not class names.</AccItem>
</Accordion>

Violating any of them counts as a breaking change and breaks existing articles — and this project does not do content migrations, so there are no exceptions.
