Status: ready-for-agent

# 03 · 真转盘 + 落定涌现(首抽)

## Parent

- [PRD: 今天吃什么 - 界面重做](../PRD.md)

## What to build

把占位 spinner 升级为真转盘(ADR-0004):转盘在 wheelPool 的真实候选餐厅上转、减速停在中签家。重写 spin 页编排--fetch 候选 -> 转盘减速落定到中签扇区(动画本身就是「命运的节拍」,不再用 fetch 与动画赛跑)-> 中签扇区金闪 ~400ms -> 餐厅卡从转盘中心涌现、转盘淡出。每扇区放真实候选截断名;候选 <~4 家跳过转盘直接揭卡;0 家走既有 needsRelaxCuisine。涌现的餐厅卡套命运调色。这是本spec的 headline 切片。

## Acceptance criteria

- [ ] 转盘渲染真实候选餐厅为扇区(截断名),不再是通用 spinner
- [ ] 转盘减速(ease-out)停在中签扇区(UI 按 poiId 在 wheelPool 中定位中签家)
- [ ] 落定时中签扇区金闪 ~400ms
- [ ] 餐厅卡从转盘中心 scale/上滑涌出、转盘淡出--落定->涌现连续一气
- [ ] spin 编排为 fetch->候选->减速落定->卡片涌现(不再有 Promise.all 最小时长赛跑)
- [ ] 候选 <~4 家跳过转盘直接揭卡
- [ ] 0 候选仍走 needsRelaxCuisine
- [ ] RestaurantCard 套命运调色(朱红菜系标签、金色点缀)
- [ ] 首抽动画 ~2.5s;微信开发者工具验证流畅

## Blocked by

- 01 · 设计 tokens + 暖米外壳与导航栏
- 02 · 决策引擎返回 wheelPool
