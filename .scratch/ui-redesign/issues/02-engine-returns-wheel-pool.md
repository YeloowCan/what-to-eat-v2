Status: ready-for-agent

# 02 · 决策引擎返回 wheelPool

## Parent

- [PRD: 今天吃什么 - 界面重做](../PRD.md)

## What to build

扩展决策引擎:候选展示(Suggestion)结果同时携带一个 `wheelPool`--「产生中签家的那一个策略」的候选集样本,必含中签家、上限 `WHEEL_POOL_SIZE`。这把周边真实选项暴露出来,使 03 的转盘能在诚实候选上转。纯模块、在既有引擎 seam 上补单测;UI 暂不消费,故其余部分不破。(prefactor:先暴露数据,03 再消费。)

## Acceptance criteria

- [ ] pickSuggestion 的 suggestion 结果携带 `wheelPool: Restaurant[]`
- [ ] wheelPool 取自中签策略的候选集(扩距离/解冻冷却后的宽池不算--诚实于实际抽签)
- [ ] wheelPool 必含中签家(suggestion.restaurant)
- [ ] wheelPool 受 `WHEEL_POOL_SIZE` 上限(新常量进 constants,与 COOLDOWN_WINDOW / HISTORY_LIMIT 同列)
- [ ] 不足上限的小候选集返回全量样本
- [ ] 引擎 seam 单测覆盖以上各点
- [ ] 引擎仍为纯模块(不碰 wx.*/网络);既有单测全绿

## Blocked by

- None - can start immediately(可与 01 并行)
