Status: ready-for-agent

# PRD: 今天吃什么 - 餐厅展示信息(图/地址/营业时间)

## Problem Statement

转盘落定、餐厅卡涌现后,用户只看到名字/菜系/距离/营业状态。这家店长什么样、具体在哪儿、几点关门、怎么过去/怎么致电--一概看不到。命运抽签在「身份」上是诚实的,但在「实质」上是单薄的:用户被给了一家,却无法把它想象出来、也无法对它采取行动,于是在「就这家」前犹豫。要丰富的是这「一个」的可信与可达,而不是把 App 变成点评式浏览--给一个就够了,但这个得能看、能找、能去。

## Solution

按 ADR-0005,在揭卡(候选展示落定后的餐厅卡)上补充**展示信息**:实景照片、地址、营业时间、电话。展示信息按 `poiId` 在展示时现取,经一个新建的 display-only port(`PoiDisplayPort`)走,**不进领域模型**(`Restaurant`/`Suggestion`/`Decision`/`wheelPool` 全不动)、**不进决策快照**(非稳定事实)、**engine 永不调用**--ADR-0001(餐厅瘦)与神圣 seam 一并保住。照片优先取高德 around-search 已下发的 `photos`(常见零额外请求),取不到则回落为按菜系染色的占位插画;多图只取第一张(给一个就够了)。展示信息只在揭卡渲染(1 次取数),转盘扇区保持纯名字(ADR-0004 不动)。展示 fetch 绑既有 `spinToken`,防 respin/约束切换时旧图换入。地址可发起导航、电话可拨号,失败有兜底。目标:让落定的那一家更可看、更可达,用户更快按「就这家」,而非引诱用户比较。

## User Stories

1. As 用户, I want 落定的餐厅卡上看到这家店的实景照片, so that 能一眼认出、确认就是这家
2. As 用户, I want 照片在转盘停下后很快出现, so that 揭卡后不干等
3. As 用户, I want 照片加载中先看到一个顺眼的占位, so that 卡片不空白突兀
4. As 用户, I want 没有照片的店看到按菜系染色的占位图, so that 仍能感受品类、不觉得坏掉
5. As 用户, I want 照片加载失败时静默回退到占位, so that 不报错、不卡住决策
6. As 用户, I want 餐厅卡上看到地址, so that 知道具体在哪儿
7. As 用户, I want 从地址一键发起导航, so that 直接被带过去
8. As 用户, I want 餐厅卡上看到营业时间(几点关), so that 知道现在去还来得及
9. As 用户, I want 营业时间缺失时不显示该项, so that 不被脏数据干扰
10. As 用户, I want 营业时间与营业状态一起看, so that 「开着」与「几点关」是同一份判断
11. As 用户, I want 餐厅卡上有电话并能拨打, so that 能先致电确认或订位
12. As 用户, I want 电话不可得时不出现拨号入口, so that 不点了个空
13. As 用户, I want 重抽时新店的照片不与旧店串台, so that 不闪旧图
14. As 用户, I want 重抽时旧的照片请求不覆盖新结果, so that 卡片永远对应最新一次抽签
15. As 用户, I want 约束改变触发的新抽签同样不串图, so that 切菜系/距离后图与店一致
16. As 用户, I want 转盘本身仍是名字扇区、不带图, so that 命运感不被信息噪声稀释
17. As 用户, I want 候选不足跳过转盘直接揭卡时也有图/地址, so that 直揭路径同样可信
18. As 用户, I want 卡片信息不拖慢首抽仪式感, so that 命运的节拍仍在
19. As 用户, I want 接受「就这家」时卡片信息不消失, so that 锁定瞬间信息连续
20. As 用户, I want 看不到图的店仍能正常接受「就这家」, so that 数据缺失不阻断决策
21. As 用户, I want 照片/地址与餐厅身份对得上(同一 poiId), so that 图文不是错配的别家
22. As 用户, I want 多张照片时只看一张主图, so that 不被图集分心(给一个就够了)
23. As 用户, I want 卡片信息在弱网下优雅降级, so that 慢而不崩
24. As 用户, I want 导航或拨号跳转失败有兜底提示, so that 跳不了不懵
25. As 用户, I want 展示信息不影响冷却与重抽机制, so that 富信息不干扰命运抽签
26. As 用户, I want 接受决策后历史记录仍只存稳定事实, so that 历史不被过期图 URL 污染

## Implementation Decisions

- **新 display-only port** `PoiDisplayPort`,仅页面在揭卡后调用,engine 永不调用。接口契约(type shape,编码决定而非实现细节):
  ```ts
  interface PoiDisplay {
    poiId: PoiId
    photoUrl: string | null
    address: string | null
    phone: string | null
    openHours: string | null
  }
  interface PoiDisplayPort {
    get(poiId: PoiId): Promise<PoiDisplay | null>
  }
  ```
- **Amap adapter 实现 `PoiDisplayPort`**:在既有 around-search(`find()`)时,把已下发的 raw POI 展示字段(`photos`/`address`/`biz_ext.open_time`/`tel`)按 `poiId` 写入一个短生命周期缓存;`get(poiId)` 命中缓存即返回(**常见零额外网络请求**),未命中(历史等旧记录)才回退到 POI detail 调用。缓存是 adapter 内部状态(impure glue,不单测)。
- **取图**:`photos` 数组取第一张的 `url`;无则 `photoUrl = null`。多图只取首张,不做轮播。
- **占位回落**:`photoUrl` 为 null 或加载失败时,UI 按 `Restaurant.cuisine` 渲染菜系占位插画(套命运调色,用设计 tokens 不写死 hex)。菜系->占位图是一张查找表(数据型,同 `cuisineAmapMap` 性质,Devtools 验)。
- **渲染位置**:仅揭卡(候选展示落定后的 `RestaurantCard`)。转盘扇区保持纯名字(ADR-0004 不动)。候选 <~4 家直揭路径同样取展示信息。
- **数据归属**:展示信息不进 `Restaurant`/`Suggestion`/`Decision`/`wheelPool`,不进 `Decision` 快照(非稳定事实,URL 会过期、营业时间会变)。历史看图若做,亦按 `poiId` 现取、关店则占位。
- **并发安全**:展示 fetch 绑既有 `spinToken` 机制--只有最新一次 spin 的 token 对应的结果才允许写入卡片,防 respin/约束切换串图(同 ui-redesign 的 supersede 旧结果同一机制)。
- **导航/拨号**:地址 -> 微信导航(如 `wx.openLocation` 或地图),电话 -> `wx.makePhoneCall`;失败给兜底提示。`phone` 不可得时不渲染拨号入口。
- **营业时间**:`openHours` 字符串(如「10:00-22:00」)与既有 `openStatus` 并列展示;缺失则该项不渲染。
- **降级链**:加载中=占位骨架;404/失败=占位兜底;字段缺失=该项不渲染。任何展示失败都不阻断「就这家」。
- **DI**:composition 根 `createDeps()` 注入 `PoiDisplayPort` 实例,同其他 port 走 module-level 单例。
- **不引入新依赖**;复用既有 Amap 请求与设计 tokens;不动 webpack/构建配置。
- **ADR-0005** 记录此决定的不可逆性、6 个被否替代与 Devtools 验证口子。

## Testing Decisions

- **好测试**:只测外部行为、不测实现细节;只测纯逻辑、不测 `wx.*`/Amap 网络。
- **本特性不开新自动化 seam**(ADR-0005 + CLAUDE.md 测试决策):既有 engine seam(vitest)按 ADR-0005 不动、无可测面;展示投影逻辑(取首图、占位回落、字段映射)留在 adapter,同 `toRestaurant`/`parseOpenStatus` 不单测。repo 维持**单一自动化 seam**(engine)。
- **验证手段**:WeChat Devtools 手动验证(既有 adapter/UI 的既定方式)。
- **Devtools 待验清单**:
  - 高德 around-search 是否真填充 `photos`、小店覆盖率(本特性可行性的关键未知)
  - 无图 -> 菜系占位回落;多图只取首张
  - 地址/营业时间/电话字段的可得性与缺失降级
  - respin / 约束切换不串图(spinToken 生效)
  - 导航/拨号跳转与失败兜底
  - 弱网下:加载中占位 -> 换入真图
  - 候选 <~4 直揭路径同样有展示信息
  - 接受「就这家」后卡片信息不消失、历史不被过期图污染
- **Prior art**:`amapPoiSource.ts` 的 `toRestaurant`/`parseOpenStatus`(adapter 纯映射、不单测、Devtools 验);`pickSuggestion.test.ts`(engine seam 测试范式,本特性不在此测)。
- **风险**:若高德 `photos` 覆盖率近零,「高德图为主」退化为「纯占位」,届时回 ADR-0005 末尾留的口子(用户上传,ADR-0001 脚注的「用户标注」路径)再议。

## Out of Scope

- **人均/评分/招牌菜**:碰 ADR-0001(人均是平台价)/ 不可靠合法获取(评分)/ menu 邻接(招牌菜)。留 v2 用户主观标签(与偏好加权一同引入)。
- **历史列表带图**:fast-follow,本特性只做揭卡。
- **多图轮播/图集**:只取首张。
- **用户上传照片**:ADR-0001 脚注的「用户标注」路径,v2 重活。
- **抓取大众点评/美团图**:ADR-0001 已否决(法律 + 稳定双高)。
- **转盘扇区带图**:违 ADR-0004。
- **展示信息进领域模型 / `Decision` 快照**:ADR-0005 已否决。
- **后端代理 / 服务端图片裁剪**:无后端,MVP。
- **暗色模式下的占位图变体**:命运语言只做浅色。

## Further Notes

- **关联 ADR**:0005(展示信息不进模型)、0001(餐厅瘦)、0004(命运语言 / 转盘不动)。
- **关联词汇(CONTEXT.md)**:餐厅 / 候选展示 / 决策 / 展示信息(新) / 约束 / 冷却。
- **关键未知**:高德 around-search 对 `photos` 的覆盖率须 Devtools 验,与既有 openStatus/typecode 不可靠同类(CLAUDE.md 已记录此模式)。
- **后续可由 `/to-tickets` 拆 issues**:① `PoiDisplayPort` + Amap adapter(含缓存与 detail 回退)② 菜系占位回落 ③ 揭卡 UI 集成展示信息 ④ spinToken 绑定防串图 ⑤ 导航/拨号与失败兜底 ⑥ Devtools 全量验证清单。
- **实现顺序建议**:port + adapter(含缓存) -> 揭卡 UI 集成 -> 占位回落 -> spinToken 绑定 -> 导航/拨号 -> Devtools 全量验证。
