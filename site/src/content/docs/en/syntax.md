# Container syntax

Containers are what separates this engine from a plain Markdown renderer: a tag such as `<Callout>` is a real node in mdast, not a string replacement. It can therefore be parsed, rendered, serialized, and mapped back to a position in the source.

## Overview

| Container | Purpose | Children |
|---|---|---|
| `Callout` | Callout block | prose |
| `Tabs` | Tabbed panels | `Tab` |
| `Steps` | Numbered steps | `Step` |
| `Cards` | Card navigation | `Card` |
| `Accordion` | Collapsible panels | `AccItem` |
| `Files` | File tree | `Folder` / `File` |
| `TypeTable` | API property table | `TypeItem` |
| `Image` | Image with caption | self-closing |
| `Mermaid` | Diagram | raw text |
| `div` | Generic block | prose |

## Callout

`type` decides the colour and icon; omitting it means `note`.

<TypeTable>
  <TypeItem name="type" type="note | tip | important | warning | caution | danger" default="note" />
  <TypeItem name="title" type="string" />
  <TypeItem name="icon" type="string" />
</TypeTable>

```md
<Callout type="tip" title="Tip">
  The body supports full Markdown, including `inline code` and [links](https://example.com).
</Callout>
```

Rendered:

<Callout type="tip" title="Tip">
  The body supports full Markdown, including `inline code` and [links](https://example.com).
</Callout>

<Callout type="important" title="Aliases add no visual branch">
  `warn`, `error`, `success` and `idea` are aliases of existing palettes; they introduce no new visual branch.
</Callout>

## Tabs

`Tabs` is the container and `Tab` its children. A child's `value` is both the label shown on the tab and the identity of that pane; the boolean `default` picks which tab is open first.

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

Usage notes:

- Without `default` the first tab opens; with several `default` attributes only the first in document order is used.
- `default` only sets the initial selection — after the reader clicks another tab, it is not pulled back.
- Keyboard: focus a tab, then ← / → cycle through tabs and Home / End jump to the ends.
- Children may also be expanded into blocks, and their bodies may contain blank lines, which are treated as paragraph breaks. Saving writes the original shape back — nothing is force-expanded and no blank lines are added.

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

`Card` may self-close: put everything in attributes, which suits navigation grids.

```md
<Cards>
  <Card title="Quick start" description="Get the first render working" href="/en/docs/quick-start" />
  <Card title="Styles and tokens" description="Recolour by changing variables" href="/en/docs/styling" />
</Cards>
```

<Cards>
  <Card title="Quick start" description="Get the first render working" href="/en/docs/quick-start" />
  <Card title="Styles and tokens" description="Recolour by changing variables" href="/en/docs/styling" />
</Cards>

## Accordion

`type` is `open` or `close`, setting the initial state.

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

`Folder` nests and takes `defaultOpen`; `File` self-closes, takes an optional `href`, and picks its icon from the extension.

```md
<Files>
  <Folder name="src" defaultOpen>
    <File name="index.ts" />
    <File name="render.tsx" />
  </Folder>
  <File name="README.md" href="/en/docs/quick-start" />
</Files>
```

<Files>
  <Folder name="src" defaultOpen>
    <File name="index.ts" />
    <File name="render.tsx" />
  </Folder>
  <File name="README.md" href="/en/docs/quick-start" />
</Files>

## TypeTable

The property table under each component on this page is rendered by it. Attributes accept strings only, which is why rows are child elements rather than object expressions.

```md
<TypeTable>
  <TypeItem name="content" type="string" required />
  <TypeItem name="className" type="string" />
</TypeTable>
```

## Image

A self-closing leaf. `zoom` is a bare boolean: set it to enable click-to-zoom and Esc to close.

```md
<Image src="/cover.svg" alt="Cover" caption="The caption goes here" width="360" />
```

## Mermaid

The container body is **raw text**: `#`, `|`, `-->` and leading `-` inside it are not Markdown syntax, and the text is written back byte for byte.

```md
<Mermaid title="Render pipeline">
flowchart LR
  A[Markdown] --> B[mdast]
  B --> C[hast]
  C --> D[React]
</Mermaid>
```

The main entry renders only the source skeleton. To get a zoomable, exportable diagram, wire up the `/mermaid` entry — see **Editor and diagrams**.

## div

Use it when you need a block that carries `class` / `id`. Attributes pass straight through to the DOM and the body is still parsed as Markdown.

```md
<div class="note-block" id="anchor">
  This content is still rendered as Markdown.
</div>
```

## Writing rules

<Callout type="warning" title="Common pitfalls when writing">
  Containers must start at **column zero**. Indenting body lines by four spaces or more makes CommonMark treat them as an indented code block; the engine reports `INDENT_AS_CODE` but does not rewrite the content. Use fences for code.
</Callout>

- Attributes accept strings (`a="b"`) and bare booleans (`a`) only. No `{…}` expressions, arrays or objects. Attribute values may contain `>`.
- Tags outside the whitelist are **shown as plain text** together with their body — nothing is lost and no HTML is executed.
- Nesting is capped at three container levels; the level beyond the limit degrades to raw text as a whole.
- Only `Image`, `Card`, `File` and `Mermaid` may be written as `<X />`; everything else needs a closing tag.
