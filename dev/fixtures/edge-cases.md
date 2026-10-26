# 容错与降级

四种典型坏输入，用于核对「不崩、不吞内容」与诊断输出。

## 未闭合容器

<Callout type="warn" title="这段没有闭合">
内容应当渲染到文末，并产出 UNCLOSED_TAG 诊断。

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

## 写在列表项内（缩进上下文不支持结构化容器）

- 列表项里的容器按文本显示：

  <Callout type="tip">
  这段会被当作普通文本。
  </Callout>
