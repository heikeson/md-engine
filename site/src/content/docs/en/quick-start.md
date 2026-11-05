# Quick start

Rendering Markdown with containers takes three steps: install, import the stylesheet, and put `prose-site` on the outer container.

<Callout type="note" title="Version and runtime">
  This page targets `0.5.2`. The `react` / `react-dom` peers are `>=19`; `engines.node` is `>=20` (build and publish only, nothing is checked at runtime).
  The package is ESM-only: `exports` provides an `import` condition only, with no CJS entry.
</Callout>

## Install

<Tabs>
  <Tab value="npm">npm install @heikeson/md-engine</Tab>
  <Tab value="pnpm">pnpm add @heikeson/md-engine</Tab>
  <Tab value="yarn">yarn add @heikeson/md-engine</Tab>
</Tabs>

The styles are plain CSS (`dist/styles.css`) with no `@apply`, so no Tailwind and no PostCSS configuration are needed.

## Render the first block

```tsx
import { MarkdownRenderer } from "@heikeson/md-engine";
import "@heikeson/md-engine/styles.css";

const content = `
<Callout type="warn" title="Heads up">
  This <Callout> is parsed by the engine, not treated as HTML.
</Callout>
`;

export default function Article() {
  return <MarkdownRenderer content={content} className="prose-site" />;
}
```

`MarkdownRenderer` renders `<div className={className}>…</div>`, so `prose-site` has to sit on that element:

| Stylesheet | Scope | Without `prose-site` |
|---|---|---|
| `callout / tabs / steps / cards / accordion / files / type-table / image.css` | `.prose-site …` | DOM and text still render; borders, padding and colours do not apply |
| `mermaid.css` | `.lkes-mermaid` | Unaffected (no `prose-site` needed) |
| `editor.css` | `.md-editor` | Unaffected (no `prose-site` needed) |

## Parse and serialize

```ts
import { parse, serialize, roundtrip, normalizeMarkdown } from "@heikeson/md-engine";

const { tree, blocks, diagnostics } = parse(md);
const same = serialize(tree);        // md → mdast → md
const again = roundtrip(md);         // same as serialize(parse(md).tree)
const tidy = normalizeMarkdown(md);  // only when you want unified layout
```

- `serialize` shares the parser's extensions (GFM + math + angle-bracket blocks) and adds no blank lines and expands no inline children.
- `normalizeMarkdown` is the one that reshapes: one blank line around container tags, consecutive blank lines collapsed, fenced code untouched; it is idempotent.
- `blocks` is a flat block index with source offsets; the editor uses it for synchronised scrolling.
- Save user content with `serialize`. Switching to `normalizeMarkdown` rewrites the blank lines the author wrote.

<Callout type="tip" title="Callable on the server">
  `parse` / `serialize` / `normalizeMarkdown` and `MarkdownRenderer` never read `window`.
  The documentation pages on this site are pre-rendered with `renderToString` at build time.
</Callout>

## Diagnostics

`parse` does not throw; problems come back in `diagnostics` as `{ code, level, line, message, params?, range? }`, where `level` is `warn` or `error`.

| Code | Trigger | What the engine does |
|---|---|---|
| `UNCLOSED_TAG` | Container without a closing tag | Renders to the end of the document; serialisation does not add the closing tag |
| `DEPTH_EXCEEDED` | Containers nested deeper than 3 | The level beyond the limit degrades to raw text as a whole |
| `UNKNOWN_TAG` | Tag outside the whitelist | Tag and body are shown as text; nothing is dropped |
| `UNSAFE_HREF` | `href` / `src` with a non-whitelisted scheme | `href` becomes `#`, `src` is removed |
| `INDENT_AS_CODE` | Body line indented by 4+ spaces or a tab | CommonMark treats it as an indented code block; content is not rewritten |
| `MERMAID_EMPTY` | Empty `<Mermaid>` body | Renders a source block plus a hint |
| `MERMAID_TOO_LARGE` | Diagram source over 20 KB (`MERMAID_MAX_BYTES`) | No diagram; the source is shown as-is |
| `DUPLICATE_ID_ANCHOR` / `DUPLICATE_ID_DIV` | `div id` equal to a heading anchor / to another `div id` | Renders normally, warns only |

## Where to go next

<Tabs>
  <Tab value="Writing containers">Read **Container syntax**: attributes, children and writing rules for all 10 containers.</Tab>
  <Tab value="Building an admin UI">Read **Editor and diagrams**: `MarkdownEditor` props, shortcuts and scroll sync.</Tab>
  <Tab value="Recolouring">Read **Styles and tokens**: the nine `--lkes-*` tokens and how to override them.</Tab>
</Tabs>
