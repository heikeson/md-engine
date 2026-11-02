---
"@heikeson/md-engine": minor
---

性能、无障碍与可配置性增强（bump 类型仅为提案，发版时由维护者定夺）：

- 编辑器预览与诊断改用 `useDeferredValue`，长文输入不再每键全量解析
- mermaid 渲染缓存加 LRU 上限（32 条），编辑长文内存不再只涨不落
- `MarkdownRenderer` 对 `components` / `remarkPlugins` / `rehypePlugins` / `text` 做浅比较稳定化，内联配置不再击穿管线缓存
- Tabs 补齐 WAI-ARIA 键盘规范（←/→/Home/End、roving tabindex、tab/panel id 关联）；Image 放大遮罩可聚焦、Enter/Space 可关闭
- 新增 `config.text`（`UIText` 浅合并覆写）：组件 aria、图表工具栏、编辑器工具栏/状态栏文案可本地化；主入口新增 `defaultUIText` / `useUIText` / `UIText` / `UITextPatch`
- 编辑器新增快捷键：Mod+B/I/E、Mod+Shift+S、Mod+1、Mod+Shift+Q、Mod+Shift+L
- 新增 `DUPLICATE_ID` 诊断：`div id` 与标题锚点或彼此重复时提示（只提示不改写）
- 文档：README 版本口径对齐 0.4.0，补 ESM-only 声明、rendererConfig 与快捷键说明；对接契约同步新增项
