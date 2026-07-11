# 展示信息不进领域模型，按 poiId 现取

「丰富功能」（餐厅图片、地址、营业时间等）要在不推翻 ADR-0001（餐厅本体只持身份/位置/菜系/营业状态，菜单/价格/下单为平台侧事实不下沉）、不稀释 ADR-0004 的命运感（给一个就够了，不为浏览）、不动神圣 seam（engine 保持纯、可被 vitest 单测、无 Taro/wx）的前提下落地。决定：照片、地址、营业时间、电话等**展示信息**不进 `Restaurant`/`Suggestion`/`Decision`/`wheelPool`；它们与菜单/价格/下单同为「平台侧事实」，但属行动与可达性信息，按 `poiId` 在展示时现取、不持久化。`Decision` 只快照稳定事实（身份/位置/菜系）以抗高德漂移（店关改名仍可显示），而图片 URL 会过期、营业时间会变--展示信息属非稳定事实，快照进 `Decision` 会违背快照初衷且店关后图大概率 404。数据通路新建一个 display-only 的 `PoiDisplayPort.get(poiId)`，Amap adapter 在 `find()` 时顺手把 around-search payload 里已下发的展示信息（照片/地址/营业时间）按 `poiId` 缓存，页面揭卡后取--常见情况零额外网络请求；缓存未命中（如历史里的旧记录）才回退到 POI detail 调用。engine 永不调用此 port，故神圣 seam 保住、engine 零改动零新测试，特性全落在 adapter + UI（同既有 adapter 手动验证策略）。展示 fetch 绑 `spinToken`，与 ui-redesign 的 supersede 旧结果同一机制，防 respin 时旧图换入闪烁。多图只取第一张（给一个就够了）；取不到图则降级为菜系占位插画。人均/评分/招牌菜不纳入此轮--人均是 ADR-0001 明文排除的平台价、评分无可靠合法来源（抓点评已否决）、招牌菜是 menu 邻接--三者留 v2 用户主观标签（与偏好加权一同引入，见 PRD v2 路线图）。

## 考虑过的替代

- **展示信息进 `Restaurant`（加 imageUrl 等字段）**：放宽 ADR-0001 的瘦原则，把可变展示数据塞进身份模型；Suggestion/wheelPool/Decision 都得带上。否决。
- **展示信息进 `Decision` 快照**：历史能离线看图，但违背「快照稳定事实」初衷，URL 过期、店关后 404。否决。
- **挂在 `PoiSource.find` 的返回上（`Restaurant & DisplayInfo`）**：展示关注点漏进 engine 的协作者，污染瘦 Restaurant 与 port 边界。否决。
- **页面直接调高德，不走 port**：破坏 port 模式，不可测，与架构不一致。否决。
- **转盘扇区带候选照**：spin 期间加载 ~8 张图，janky，且动 ADR-0004 的转盘设计语言（转盘卖命运戏剧，不卖信息）。否决，图只在揭卡渲染。
- **本轮就纳入人均/评分/招牌菜（平台拉取）**：碰 ADR-0001（人均）/ 不可靠合法获取（评分）/ menu 邻接（招牌菜）。否决，留 v2 用户标注。

本 ADR 不 supersede ADR-0001，而是沿用并细化其「平台侧事实不下沉」原则到展示信息这一新类。待 Devtools 验证高德 around-search 对 `photos` 的实际覆盖率：若小店覆盖率近零，「高德图为主」退化为「纯占位」，届时可另议是否引入用户上传（ADR-0001 脚注的「用户标注」路径）。

## 实现注记

实现时发现：高德 v3 Web 服务（当前 key 所用）无单 POI detail-by-id 端点，v5 `/place/detail` 需 v5 key（未验）。故 `PoiDisplayPort.get` 的 miss 路径暂返回 `null`（UI 回落菜系占位），**不**发起 detail 调用——而非本 ADR 正文所述的「回退到 POI detail 调用」。这对本特性无害：揭卡的 poiId 恒来自一次新鲜 `find()`、必命中缓存，miss 路径仅历史旧记录会触发，而「历史带图」为 Out of Scope（fast-follow）。待历史带图落地时，再依 Devtools 验得的 key 类型补 v5 detail 或其它回退策略。与既有 Amap 不可靠项（openStatus / typecode）同类，属 Devtools 验证口子。
