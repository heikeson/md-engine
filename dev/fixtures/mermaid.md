# 图表容器

`<Mermaid>` 的容器体是**原始文本**：mermaid 源码里的 `#`、`|`、`-->`、行首 `-` 都不会被当成 Markdown 语法
（注意：`#` 在 mermaid 里不是注释，注释要用 `%%`）。

## 流程图

<Mermaid title="请求流程" height="420">
%% 这一行是 mermaid 注释
flowchart TD
  A[开始] --> B{是否命中缓存}
  B -->|命中| C[直接返回]
  B -->|未命中| D[回源获取]
  D --> E[写入缓存]
  E --> C
</Mermaid>

## 时序图

<Mermaid title="请求与响应">
sequenceDiagram
  participant U as 用户
  participant S as 服务端
  U->>S: GET /api/items
  S-->>U: 200 OK
  Note over U,S: 消息文字在暗色下必须可读
</Mermaid>

## 饼图（12 扇区，按 6 色错位循环）

<Mermaid title="流量构成">
pie title 流量构成
  "直接访问" : 42
  "搜索" : 28
  "外链" : 12
  "社交" : 9
  "邮件" : 5
  "其它" : 4
</Mermaid>

## ER 图（属性行不能发白）

<Mermaid title="用户与订单">
erDiagram
  USER ||--o{ ORDER : places
  USER {
    string id
    string email
  }
  ORDER {
    string id
    int amount
  }
</Mermaid>

## 甘特图（任务条不能退回默认蓝）

<Mermaid title="排期">
gantt
  dateFormat YYYY-MM-DD
  section 设计
  需求梳理 :a1, 2026-11-01, 3d
  视觉稿   :a2, after a1, 4d
  section 开发
  前端     :b1, after a2, 5d
  后端     :b2, after a2, 6d
</Mermaid>

## 降级示例

空源码（产 `MERMAID_EMPTY`，渲染为空源码块）：

<Mermaid />

未闭合（内容不丢，序列化不补闭合标签）：

<Mermaid title="未闭合">
graph LR
  A --> B
