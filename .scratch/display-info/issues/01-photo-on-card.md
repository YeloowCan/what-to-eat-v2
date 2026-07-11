Status: ready-for-agent

# 01 · 落定卡片显示餐厅照片(tracer bullet)

## Parent

- [PRD: 今天吃什么 - 餐厅展示信息(图/地址/营业时间)](../PRD.md)

## What to build

揭卡后(转盘落定 **与** 候选<4 直揭两条路径)餐厅卡显示该餐厅的实景照片;加载中、无图、加载失败均回落为按菜系染色的占位插画,不报错。这是切穿所有层的 tracer bullet:新建 display-only 的 `PoiDisplayPort` 与 `PoiDisplay` 类型(全字段:photoUrl / address / phone / openHours)、Amap adapter 复用 around-search 已下发的 payload 按 poiId 缓存展示信息、`createDeps` 注入该 port、`RestaurantCard` 增加照片区、spin 页在揭卡时按 poiId 现取展示信息并绑既有 `spinToken` 防 respin 串图。本 slice 只渲染照片,但 adapter 一次填全字段(供 02/03 直接渲染、不再动 adapter)。展示信息不进 `Restaurant`/`Suggestion`/`Decision`/`wheelPool`,engine 不调用此 port(ADR-0005)。多图只取第一张。

## Acceptance criteria

- [ ] 揭卡后(转盘落定 & 候选<4 直揭)卡片显示该餐厅照片
- [ ] 照片经 `PoiDisplayPort.get(poiId)` 取得,来自高德 around 已下发的 photos
- [ ] 加载中 / 无图 / 加载失败 -> 按菜系染色的占位插画,不报错、不阻断「就这家」
- [ ] 多图只取第一张
- [ ] respin / 约束切换不闪旧图(展示 fetch 绑 spinToken,与 pickSuggestion 同一守护机制)
- [ ] `Restaurant`/`Suggestion`/`Decision`/`wheelPool` 与 engine 未改动(ADR-0005 守住)
- [ ] Devtools 验证:照片显示、占位回落、不串图;并记录高德 photos 实际覆盖率(本特性可行性的关键未知)

## Blocked by

- None - can start immediately
