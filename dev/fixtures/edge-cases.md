# 容错与降级

用于核对「不崩、不吞内容」与诊断输出。

## 未知标签

<FooBar>未知组件名应回退成文本显示</FooBar>

## 超过深度上限（容器计 4 层）

<Callout type="info">

<Tabs>

<Tab value="第一层">

<Steps>

<Step title="第二层">

<Cards>

<Card title="第四层，应整块降级为原文">

这里的内容不应被结构化渲染。

</Card>

</Cards>

</Step>

</Steps>

</Tab>

</Tabs>

</Callout>

## 非法协议

<File name="危险链接" href="javascript:alert(1)" />

渲染时 `href` 会被 `isSafeHref` 拦下变成不可点击，但**不产出诊断**（`UNSAFE_HREF` 目前只是类型声明）。

## 列表项内的容器

- 与列表内容列对齐（`- ` 后 2 空格）：**正常渲染成组件**

  <Callout type="tip">

  对齐内容列时会被识别为容器。

  </Callout>

- 再多缩进 4 空格：整块变成缩进代码块，原文原样显示

      <Callout type="warn">
      这段会变成代码块，不会渲染成组件。
      </Callout>

## 未闭合容器

放最后一段。注意：判定方式是"块的原文区间内是否出现同名闭合标签"，所以**正文里也不要出现该标签的字面量**，否则会被误判成已闭合。

<Callout type="warn" title="这段没有闭合">

内容渲染到文末并产出 UNCLOSED_TAG 诊断；序列化不再替用户补闭合标签。
