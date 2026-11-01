# 样式与令牌

包内样式是原生 CSS，作用域挂在 `.prose-site` 下，配色由独立命名空间 `--lkes-*` 控制。

## 九个令牌

| 令牌 | 用途 | 亮色 | 暗色 |
|---|---|---|---|
| `--lkes-bg` | 面 | `#ffffff` | `#0f1419` |
| `--lkes-fg` | 主文字 | `#1f2937` | `#e8eef2` |
| `--lkes-muted` | 次要文字 | `#6b7280` | `#9aa8b0` |
| `--lkes-fill` | 浅底块 | `#f3f4f6` | `#1a222a` |
| `--lkes-border` | 描边 | `#e5e7eb` | `#232c34` |
| `--lkes-accent` | 强调 | `#0f766e` | `#19d3c5` |
| `--lkes-ring` | 焦点环 | `#0f766e` | `#19d3c5` |
| `--lkes-radius` | 圆角 | `0.5rem` | `0.5rem` |
| `--lkes-overlay` | 遮罩 | `rgb(0 0 0 / .8)` | `rgb(0 0 0 / .85)` |

## 为什么是两套字面量

一个真实踩过的坑：如果令牌写成 `--lkes-bg: var(--background, #fff)`，`var()` 会在声明处（`:root`）就被替换并固化。宿主之后再给 `.dark` 改 `--background`，对已经算好的值没有任何影响，于是暗色永远不生效。

现在改成包内自带亮暗两套字面量：亮色在 `:root`，暗色在 `.dark` 与 `[data-theme="dark"]` 祖先作用域。组件里的 `var(--lkes-*)` 在元素上解析，祖先一加 `.dark`，Callout、Tabs、Steps、Cards、Accordion、Files、TypeTable、图片、编辑器同时切暗，不需要每个组件各写一份。

<Callout type="tip" title="宿主只要做一件事">
  想让组件跟着页面变暗，给 `<html>` 或任意祖先加 `dark` 类即可，不用传任何配置。
</Callout>

## 覆盖

在普通样式里重新声明同名变量就行，不需要抢引入顺序——未分层声明优先级高于 `@layer` 内的声明。

```css
/* 品牌色换成你家的主色 */
:root {
  --lkes-accent: #4f46e5;
  --lkes-ring: #4f46e5;
}

.dark {
  --lkes-accent: #8b8cf0;
  --lkes-ring: #8b8cf0;
}
```

也可以只改局部：写在正文容器上，只影响那一块。

## 按组件引入

不想要整包样式时，可以只取分片：

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

`styles/engine.css` 保留为旧路径的转发入口，升级不会断。

## 三条硬约束

<Accordion>
  <AccItem title="语法只增不改" type="open">已发布组件的名字、属性名与语义永不修改，只新增。存量内容不需要迁移。</AccItem>
  <AccItem title="配置只增不改" type="close">新增配置项必须带默认值，不得改变既有行为。</AccItem>
  <AccItem title="样式随包走" type="close">类名由包提供，使用方只覆盖变量，不改类名。</AccItem>
</Accordion>

违反任意一条即视为破坏性变更，会导致已有文章渲染走样——而这个项目不做内容迁移，所以这三条没有例外。
