Status: ready-for-agent

# 06 · 跳转美团外卖小程序（无 CPS）

## Parent

- [PRD: 今天吃什么 MVP](../PRD.md)

## What to build

接受决策后的餐厅卡片提供「去美团看看」入口 → 深链端口调用 `wx.navigateToMiniProgram` 跳转美团外卖小程序（MVP 不带 CPS 佣金参数，纯跳转）。跳转失败时给兜底提示。MVP 不变现，CPS 留 v2。

## Acceptance criteria

- [ ] 接受决策后的餐厅卡上出现「去美团看看」入口
- [ ] 点击调用 `wx.navigateToMiniProgram` 跳转美团外卖小程序
- [ ] 跳转不带任何 CPS 佣金参数（MVP 不变现）
- [ ] 跳转失败时显示兜底提示，不卡死

## Blocked by

- 02
