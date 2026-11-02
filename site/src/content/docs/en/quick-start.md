# Quick start

Rendering a `.md` file into a page with components takes three steps: install, import the stylesheet, and set the container class.

<Callout type="note" title="Version scope">
  This page targets `0.4.0`. React `>=19` is a peer dependency, the build environment needs Node `>=20`, and there is no Node version requirement at runtime.
</Callout>

## Install

<Tabs>
  <Tab value="npm">npm install @heikeson/md-engine</Tab>
  <Tab value="pnpm">pnpm add @heikeson/md-engine</Tab>
  <Tab value="yarn">yarn add @heikeson/md-engine</Tab>
</Tabs>

The bundled styles are plain CSS. No Tailwind, and no PostCSS configuration.

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

Add `prose-site` to the outer `className`: the bundled styles are scoped to it, and without that class containers fall back to plain text.

<Steps>
  <Step title="Import styles">`import "@heikeson/md-engine/styles.css"`, either at the app entry or at the top of the page module.</Step>
  <Step title="Add the class">Put `prose-site` on the outer container; every other class is handled by the package.</Step>
  <Step title="Use it on the server">Parsing and rendering never touch `window`, so Next, Astro and Remix can call them during server rendering.</Step>
</Steps>

## Parse and serialize

Beyond rendering, the engine can read Markdown into an AST and write it back — for saving, formatting and position tracking.

```ts
import { parse, serialize, roundtrip, normalizeMarkdown } from "@heikeson/md-engine";

const { tree, blocks, diagnostics } = parse(md);
const same = serialize(tree);        // md → AST → md, byte-identical
const again = roundtrip(md);         // shorthand for the line above
const tidy = normalizeMarkdown(md);  // only when you want unified layout
```

`serialize` guarantees content only: it does not add blank lines and does not expand inline children. Unified layout is a separate function — the two responsibilities stay apart.

<Callout type="tip" title="Do not mix the two">
  A user's layout survives a save. `serialize` preserves shape, `normalizeMarkdown` reshapes it — mixing them rewrites the user's formatting on save.
</Callout>

## Where to go next

If all you need is "it renders", you are done. To write containers such as `<Callout>` and `<Tabs>`, read **Container syntax**. For authoring in an admin panel, read **Editor and diagrams**.

<Cards>
  <Card title="Container syntax" description="Nine containers, attribute tables and writing rules" href="/en/docs/syntax" />
  <Card title="Editor and diagrams" description="MarkdownEditor and interactive Mermaid" href="/en/docs/editor" />
  <Card title="Styles and tokens" description="Nine --lkes-* tokens, light and dark" href="/en/docs/styling" />
</Cards>
