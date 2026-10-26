# 一篇普通文章的渲染检查

这是一篇按真实写作习惯写的文章，用来目验「正常链接、正常图片」是否被协议闸门误伤，
顺便把容器、代码块、公式、表格放在同一篇里看整体观感。

## 一、链接

- 外链：[示例站](https://example.com)
- 没有协议的外链：[裸域名](www.example.com)
- 站内绝对路径：[关于页](/about)
- 相对路径：[同目录文档](./about)
- 上级目录：[返回上一级](../README.md)
- 锚点：[跳到动手](#动手)
- 邮件：[写信给我](mailto:hi@example.com)
- 电话：[打电话](tel:10086)
- 协议相对：[CDN 上的脚本](//cdn.example.com/lib.js)

## 二、图片

行内图片（相对路径）：![相对路径占位图](dev-logo.svg)

站内绝对路径：![站内绝对路径占位图](/dev-logo.svg)

带题注与放大：

<Image src="dev-logo.svg" alt="相对路径图" caption="题注：相对路径图片应正常显示，点击可放大" zoom />

## 三、容器

<Callout type="tip" title="写作提示">
容器里可以放链接（[外链](https://example.com)）与图片（![](/dev-logo.svg)）。
</Callout>

<Tabs>
<Tab value="说明" default>
切换页签看看样式。
</Tab>
<Tab value="代码">
```ts title="demo.ts"
export const answer = 42;
```
</Tab>
</Tabs>

<Steps>
<Step title="写内容">
用 Markdown 写正文。
</Step>
<Step title="加容器">
需要强调时用 Callout。
</Step>
</Steps>

<Cards>
<Card title="卡片一" description="描述写在属性里" href="/about" />
<Card title="卡片二">
卡片正文。
</Card>
</Cards>

<Accordion>
<AccItem title="常见问题" type="open">
回答内容。
</AccItem>
<AccItem title="另一个问题">
另一个回答。
</AccItem>
</Accordion>

<Files>
<Folder name="内容" defaultOpen>
<File name="文章.md" href="/about" />
<File name="封面.png" />
</Folder>
</Files>

<TypeTable>
<TypeItem name="title" type="string" required>
标题。
</TypeItem>
<TypeItem name="tone" type="string" default="note">
语气。
</TypeItem>
</TypeTable>

## 四、代码与公式

```bash title="本地开发"
npm run dev
```

行内公式 $E = mc^2$，块公式：

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

## 五、表格与列表

| 场景 | 写法 | 结果 |
|---|---|---|
| 外链 | https://example.com | 可点击 |
| 相对路径 | ./about | 可点击 |
| 危险协议 | javascript:alert(1) | 降级为 # |

- [x] 外链正常
- [x] 相对路径正常
- [ ] 危险协议被降级

> 引用块：这条用来检查左侧竖线与文字颜色。

## 动手

回到顶部看锚点是否可跳转：[回到开头](#一篇普通文章的渲染检查)。
