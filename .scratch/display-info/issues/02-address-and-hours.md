Status: ready-for-agent

# 02 · 卡片补充地址与营业时间

## Parent

- [PRD: 今天吃什么 - 餐厅展示信息(图/地址/营业时间)](../PRD.md)

## What to build

在 01 的照片/标题之下,卡片显示地址与营业时间(如「10:00-22:00」),与既有营业状态并列。复用 01 的 `PoiDisplayPort.get`(同一份展示信息),不新增取数、不再动 adapter。地址 / 营业时间缺失时该项不渲染、不报错。

## Acceptance criteria

- [ ] 卡片显示地址(具体位置)
- [ ] 卡片显示营业时间,与营业状态并列呈现
- [ ] 地址 / 营业时间缺失时该项不渲染,不报错
- [ ] 复用 01 的 `PoiDisplayPort.get`,不新增取数路径
- [ ] Devtools 验证:字段可得性与缺失降级

## Blocked by

- 01 · 落定卡片显示餐厅照片(tracer bullet)
