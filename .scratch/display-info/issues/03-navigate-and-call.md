Status: ready-for-agent

# 03 · 地址可导航、电话可拨打(失败兜底)

## Parent

- [PRD: 今天吃什么 - 餐厅展示信息(图/地址/营业时间)](../PRD.md)

## What to build

地址可点发起导航(用既有 `Restaurant.location` 的 GeoPoint,不依赖 02 的地址字符串);有电话时显示拨号入口、点之拨打,无电话不显示拨号入口。导航 / 拨号失败给兜底提示,不崩。复用 01 已取回的展示信息(phone);导航用既有 GeoPoint。展示信息不影响冷却 / 重抽 / 接受机制。

## Acceptance criteria

- [ ] 点地址发起导航(带到餐厅位置)
- [ ] 有电话时显示拨号入口、点之拨打;无电话时不显示
- [ ] 导航 / 拨号失败 -> 兜底提示,不崩
- [ ] 展示信息不影响冷却 / 重抽 / 接受机制
- [ ] Devtools 验证:导航 / 拨号跳转与失败兜底

## Blocked by

- 01 · 落定卡片显示餐厅照片(tracer bullet)
