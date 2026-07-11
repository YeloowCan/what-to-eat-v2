Status: ready-for-agent

# 01 · 设计 tokens + 暖米外壳与导航栏

## Parent

- [PRD: 今天吃什么 - 界面重做](../PRD.md)

## What to build

确立「命运抽签」设计语言基底(ADR-0004):在全局样式里立 CSS 变量(暖米 / 朱红 / 金 / 深褐调色 + 圆角 / 间距 / 阴影刻度),使后续重做都引用变量而非裸色值,根治 `#ff5a5f` 散落多文件的现状。把页面背景从冷灰改成暖米,把微信导航栏改成暖米底黑字,让外壳读起来是一整片连续的暖色面、无白 bar 割裂。这是其余所有 UI ticket 的基底(prefactor)。引擎与现有转盘流程不动。

## Acceptance criteria

- [ ] 全局样式定义命运调色(bg / primary / gold / text)、圆角、间距、阴影的 CSS 变量
- [ ] 组件不再硬编码裸色值,统一引用变量
- [ ] 页面背景为暖米(#FFF7ED),替换原冷灰
- [ ] 导航栏暖米底黑字,与页面无缝、无白 bar 割裂
- [ ] 既有页面仍正常渲染(引擎 + 现有 spinner 流程不变)
- [ ] 微信开发者工具验证通过

## Blocked by

- None - can start immediately
