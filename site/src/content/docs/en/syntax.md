# Container syntax

A container is a `jsxBlock` node in mdast, not a string replacement: the same node is parsed, rendered, serialized and indexed with source offsets. The syntax has exactly one declaration site — `COMPONENTS` / `ITEMS` in `src/registry.ts`; attribute names are not hard-coded anywhere else.

## Overview

| Container | Attributes | Children |
|---|---|---|
| `Callout` | `type` / `title` / `icon` | prose |
| `Tabs` | — | `Tab`: `value` (required), `default` (boolean) |
| `Steps` | — | `Step`: `title` |
| `Cards` | — | `Card`: `title` / `href` / `icon` / `description`, self-closing allowed |
| `Accordion` | — | `AccItem`: `title` / `type` |
| `Files` | — | `Folder`: `name` / `defaultOpen`; `File`: `name` / `href` / `icon`, self-closing allowed |
| `TypeTable` | — | `TypeItem`: `name` / `type` / `default` / `required` (boolean), self-closing allowed |
| `Image` | `src` / `alt` / `align` / `width` / `caption` / `zoom` | self-closing |
| `Mermaid` | `title` / `height` | raw text |
| `div` | `class` / `id` | prose |

"Nine containers plus a generic `div`" comes from this table: `div` passes its attributes straight to the DOM and its body is parsed as Markdown.

## Callout

`type` has 7 values; omitting it means `note`, and any unknown value renders as `note`.

| Value | Palette branch |
|---|---|
| `note` / `info` | note |
| `tip` | tip |
| `important` | important |
| `warning` | warning |
| `caution` / `danger` | caution |

`warn`, `error`, `success` and `idea` are aliases that reuse the warning, caution, tip and tip palettes — no new visual branches.

<TypeTable>
  <TypeItem name="type" type="note | info | tip | important | warning | caution | danger" default="note" />
  <TypeItem name="title" type="string" />
  <TypeItem name="icon" type="string" />
</TypeTable>

Without `title` the icon sits inline with the body; no default label such as "Note" is added.

```md
<Callout type="tip" title="Tip">
  The body supports full Markdown, including `inline code` and [links](https://example.com).
</Callout>
```

Rendered:

<Callout type="tip" title="Tip">
  The body supports full Markdown, including `inline code` and [links](https://example.com).
</Callout>

A string `icon` is wrapped in a fixed 16×16 box (same size as the lucide icons), so an emoji or a single character works.

## Tabs

`value` is both the tab label and the identity of that pane. `default` only sets the initial selection.

<TypeTable>
  <TypeItem name="value" type="string" required />
  <TypeItem name="default" type="boolean" default="first tab" />
</TypeTable>

```md
<Tabs>
  <Tab value="npm">npm install @heikeson/md-engine</Tab>
  <Tab value="pnpm" default>pnpm add @heikeson/md-engine</Tab>
</Tabs>
```

Rendered (opens on `pnpm`):

<Tabs>
  <Tab value="npm">npm install @heikeson/md-engine</Tab>
  <Tab value="pnpm" default>pnpm add @heikeson/md-engine</Tab>
</Tabs>

- Without `default` the first tab opens; with several `default` attributes only the first in document order counts.
- After the reader clicks another tab, it is not pulled back to the default.
- Keyboard: `←` / `→` cycle, `Home` / `End` jump to the ends, focus follows the selection (roving tabindex, unselected tabs get `tabIndex=-1`).
- Children may share a line with the tag or expand into blocks; block bodies may contain blank lines, treated as paragraph breaks. Saving writes the original shape back.

## Steps

```md
<Steps>
  <Step title="Install">npm install @heikeson/md-engine</Step>
  <Step title="Import styles">import "@heikeson/md-engine/styles.css"</Step>
</Steps>
```

<Steps>
  <Step title="Install">npm install @heikeson/md-engine</Step>
  <Step title="Import styles">import "@heikeson/md-engine/styles.css"</Step>
</Steps>

## Cards

`Card` may self-close, with everything in attributes — handy for navigation grids.

```md
<Cards>
  <Card title="Quick start" description="Get the first render working" href="/docs/quick-start" />
  <Card title="Styles and tokens" description="Recolour by changing variables" href="/docs/styling" />
</Cards>
```

<Cards>
  <Card title="Quick start" description="Get the first render working" href="/docs/quick-start" />
  <Card title="Styles and tokens" description="Recolour by changing variables" href="/docs/styling" />
</Cards>

## Accordion

`AccItem`'s `type` is `open` or `close` and sets the initial state; `close` and omitting it both mean collapsed. A child may also carry an `id`, which expands it when the URL hash matches `#id` — that attribute is not in the registry whitelist, so the editor does not suggest it.

```md
<Accordion>
  <AccItem title="Collapsed by default" type="close">Collapsed by default; click to expand.</AccItem>
  <AccItem title="Expanded by default" type="open">Expanded by default.</AccItem>
</Accordion>
```

<Accordion>
  <AccItem title="Collapsed by default" type="close">Collapsed by default; click to expand.</AccItem>
  <AccItem title="Expanded by default" type="open">Expanded by default.</AccItem>
</Accordion>

## Files

`Folder` nests and takes `defaultOpen`; `File` self-closes, picks its icon from the extension, and `icon` overrides it.

```md
<Files>
  <Folder name="src" defaultOpen>
    <File name="index.ts" />
    <File name="render.tsx" />
  </Folder>
  <File name="README.md" href="/docs/quick-start" />
</Files>
```

<Files>
  <Folder name="src" defaultOpen>
    <File name="index.ts" />
    <File name="render.tsx" />
  </Folder>
  <File name="README.md" href="/docs/quick-start" />
</Files>

## TypeTable

Every property table on this page is rendered by it. Attributes accept strings only, which is why rows are child elements instead of object expressions.

```md
<TypeTable>
  <TypeItem name="content" type="string" required />
  <TypeItem name="className" type="string" />
</TypeTable>
```

`TypeItem` has two equivalent forms: self-closing leaves the description column empty, the block form writes the description between the tags.

## Image

A self-closing leaf. `align` defaults to `center`; `zoom` is a bare boolean that enables click-to-zoom and `Esc` to close.

```md
<Image src="/cover.svg" alt="Cover" caption="The caption goes here" width="360" />
```

## Mermaid

The body is **raw text**: `#`, `|`, `-->` and a leading `-` are not Markdown syntax. It is stored as `data.rawBody` on the node and written back byte for byte.

```md
<Mermaid title="Render pipeline">
flowchart LR
  A[Markdown] --> B[mdast]
  B --> C[hast]
  C --> D[React]
</Mermaid>
```

- A numeric `height` caps the diagram area in pixels; omitting it, an empty value or `auto` fits the content.
- The main entry renders only the source skeleton. Zooming, dragging and exporting require the `/mermaid` entry — see **Editor and diagrams**.
- Source over 20 KB is not rendered; the source is shown with `MERMAID_TOO_LARGE`. `<Mermaid />` equals empty source and reports `MERMAID_EMPTY`.

## div

Use it when you need a block carrying `class` / `id`. Attributes pass through to the DOM and no component wraps it.

```md
<div class="note-block" id="anchor">
  This content is still rendered as Markdown.
</div>
```

## Writing rules

- Attributes accept strings (`a="b"`) and bare booleans (`a`) only: no `{…}` expressions, arrays or objects. Attribute values may contain `>`, and names are case sensitive.
- Containers start at column zero. Children may be indented per level; a **body** line indented by 4+ spaces (or a tab) becomes an indented code block under CommonMark, which reports `INDENT_AS_CODE` without rewriting the content.
- Tags outside the whitelist are shown as text together with their body (`UNKNOWN_TAG`); nothing is lost and no HTML is executed.
- Nesting is capped at 3 container levels, children excluded; the level beyond the limit degrades to raw text (`DEPTH_EXCEEDED`).
- Only `Image`, `Card`, `File`, `TypeItem` and `Mermaid` may be written as `<X />`; everything else needs a closing tag.
- `normalizeMarkdown` only adds blank lines around standalone tags that start with an **uppercase** letter, so lowercase tags such as `div` are left alone.
