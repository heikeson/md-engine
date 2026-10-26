# 常规 Markdown 语法

用于核对 GFM、数学公式与代码块元信息。

## 段落与行内语法

普通段落。**加粗**、*斜体*、~~删除线~~、`行内代码`、[站内链接](/about)、[外链](https://example.com)。

## 列表与任务

- 无序项一
- 无序项二
  - 嵌套项

1. 有序项一
2. 有序项二

- [x] 已完成
- [ ] 未完成

## 表格

| 项         | 类型     | 默认值        |
| --------- | ------ | ---------- |
| content   | string | 无          |
| className | string | prose-site |

## 数学公式

行内公式 $a^2 + b^2 = c^2$。

$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$

## 代码块（带元信息）

```ts title="demo.ts"
export function greet(name: string): string {
  return `hello, ${name}`;
}
```

```bash
npm run dev
```

## 引用

> 引用块用于强调外部说法。
