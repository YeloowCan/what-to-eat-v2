# 今天吃什么

一个帮你从周边餐厅里快速做出「今天吃哪家」决策的微信小程序——消除选餐厅时的选择困难。打开、授权定位，小程序按你的位置 + 几个轻量约束（距离 / 营业中 / 菜系）从周边餐厅里**随机抽一家**给你。转盘停下的候选展示不满意就重抽，满意点「就这家」落定为决策。刚选过的店会被冷却短期排除，避免连续重复。无账号、无后端，状态只在 `wx.storage` 本地。

技术栈：**Taro 4（React）+ TypeScript**，编译为微信小程序。

---

## 目录

- [架构](#架构)
- [候选集与分层放宽](#候选集与分层放宽)
- [快速上手](#快速上手)
- [配置（首次必做）](#配置首次必做)
- [本地启动开发](#本地启动开发)
- [测试](#测试)
- [部署发布](#部署发布)
- [⚠️ Amap 鉴权偏差](#️-amap-鉴权偏差)
- [注意事项](#注意事项)
- [实现状态](#实现状态)
- [测试策略](#测试策略)

---

## 架构

```
src/
  engine/        决策引擎——唯一的自动化测试 seam（纯模块，不碰 wx/网络）
    types.ts          领域模型（餐厅/约束/冷却/决策/候选展示），遵循 CONTEXT.md、ADR-0001
    constants.ts      COOLDOWN_WINDOW=3、HISTORY_LIMIT=50、DISTANCE_LADDER_KM=[1,3,5,10]
    cuisine.ts        菜系枚举 + 中文标签
    pickSuggestion.ts 转盘：过滤 + 均匀随机抽取 + 分层放宽
    acceptDecision.ts 接受：生成带快照的决策 + 更新冷却
    storeHelpers.ts   appendDecision（滚动保留 50）+ deriveCooldownPoiIds（最近 3 条）
    *.test.ts         自动化 seam——17 个单测
  ports/         端口接口（系统边界）+ 纯实现（Rng/Clock）
  adapters/      wx/高德的端口实现（薄胶水，手动验证）
    wxLocation.ts             封装 Taro.getLocation
    amapPoiSource.ts          封装高德周边 POI 搜索（REST + MD5 签名）
    wxStorageDecisionStore.ts 封装 wx.storage
    meituanDeepLink.ts        封装 Taro.navigateToMiniProgram
    cuisineAmapMap.ts         菜系 ↔ 高德 POI type code
  composition.ts 依赖注入根——把适配器装配进引擎
  components/    PermissionGate、ConstraintSelector、RestaurantCard、Wheel
  pages/         spin（主页面）、history
```

**决策引擎**是纯模块：它接收注入的端口（POI 源、RNG、时钟、冷却列表），产出一个候选展示或「需放宽菜系」信号，自身绝不碰 `wx.*` 或网络——这种隔离正是它能作为测试 seam 的原因。UI 负责编排：读冷却 → `pickSuggestion` → 展示 → 点「就这家」`acceptSuggestion` → 落库。重抽只是再调一次 `pickSuggestion`（不写任何记录）。

## 候选集与分层放宽

候选集 = 周边 POI ∩ 约束 ∩ 冷却后剩余。候选集为空时，引擎分层放宽，**永不触碰硬护栏**（营业中 / 菜系）：

1. **解冻冷却**（同半径重抽），仍空则
2. **扩距离** 1 → 3 → 5 → 10 km 逐档重抽，仍空则
3. 发出 `needsRelaxCuisine` 信号（交回用户——永不自动换菜系）。

`openOnly` 与 `cuisine` 永不被放宽；`distanceKm` 与冷却是可放宽项。

---

## 快速上手

前置：Node 18+、已安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)、已有微信小程序 appid 与高德 key。

```bash
# 1. 安装依赖（必须加 --legacy-peer-deps，否则 Taro 4 的 peer 冲突会报 ERESOLVE）
npm install --legacy-peer-deps

# 2. 配置高德凭据
cp .env.example .env          # 然后编辑 .env 填入 AMAP_KEY / AMAP_SECRET

# 3. 改两个占位符：
#    - project.config.json 里的 appid（把 "touristappid" 换成你的真实 appid）
#    - src/adapters/meituanDeepLink.ts 里的 MEITUAN_APPID（换成真实美团外卖 appid）

# 4. 启动 watch 编译到 dist/
npm run dev:weapp
```

然后用**微信开发者工具**打开**项目根目录**（不是 dist）—— `project.config.json` 里的 `miniprogramRoot: "dist/"` 会指向编译产物，模拟器里即可走「定位授权 → 转盘 → 餐厅卡」流程。

---

## 配置（首次必做）

### 1. 高德凭据

复制 `.env.example` 为 `.env` 并填入：

```
TARO_APP_AMAP_KEY=你的高德web服务key
TARO_APP_AMAP_SECRET=你的高德安全密钥
```

- 到 [lbs.amap.com](https://lbs.amap.com) 注册 → 应用管理 → 创建**「Web服务」**类型的 key + 安全密钥。
- Taro 会在构建时把 `TARO_APP_*` 注入到代码包里（`src/composition.ts` 读取）。

### 2. 微信小程序 appid

编辑 `project.config.json`，把 `"appid": "touristappid"` 改成你的真实小程序 appid（到 [mp.weixin.qq.com](https://mp.weixin.qq.com) 注册小程序获取）。**游客模式无法授权定位、无法跳转美团、无法上传发布。**

### 3. 美团外卖 appid

编辑 `src/adapters/meituanDeepLink.ts`，把 `MEITUAN_APPID` 占位符换成真实的美团外卖小程序 appid。

### 4. 服务器域名白名单（发布前必做；本地可跳过）

微信公众平台 → 开发管理 → 开发设置 → 服务器域名 → **request 合法域名** 加入：

```
https://restapi.amap.com
```

本地调试时，可在开发者工具「详情 → 本地设置」勾选「不校验合法域名…」先跳过。

### 5. 隐私接口申请（getLocation）

微信公众平台 → 开发管理 → 接口设置 → 申请 `wx.getLocation` 接口权限（2023 年后微信要求）。`src/app.config.ts` 已声明 `requiredPrivateInfos` 与 `permission.scope.userLocation`，代码侧已就绪。

### 6. 高德 POI type code（上线前核对）

`src/adapters/cuisineAmapMap.ts` 里几个菜系的高德 typecode 是近似值，上线前请对照[高德官方 POI 类型表](https://lbs.amap.com/api/webservice/download)核对。

---

## 本地启动开发

```bash
npm run dev:weapp     # watch 模式编译到 dist/，改代码自动重编译
```

然后：
1. 打开**微信开发者工具**，导入项目，目录选**项目根目录**（`C:\Project\what-to-eat-v2`，不是 dist）。
2. 选你的真实 appid。
3. 工具加载 `dist/`，模拟器里即可预览完整流程。

开发期常用命令：

```bash
npm run typecheck     # 全项目 tsc 类型检查
npm test              # 决策引擎 17 个单测（vitest）
npm run test:watch    # 测试监听模式
```

> 决策引擎是纯 TS、不依赖微信环境，单测可直接在命令行跑。UI 和 `wx.*`/高德适配器按 PRD 约定靠开发者工具手动验证。

---

## 测试

```bash
npm test              # 运行决策引擎单测
npm run typecheck     # 全项目类型检查
```

决策引擎是唯一被单测覆盖的模块（PRD 预先约定的 seam）。详见下方[测试策略](#测试策略)。

---

## 部署发布

```bash
# 生产构建（压缩、无 watch）
npm run build:weapp
```

然后在微信开发者工具里：

1. 确认模拟器 / 真机预览正常。
2. 点工具栏右上角**「上传」** → 填版本号（如 `1.0.0`）和备注 → 上传。
3. 登录 [mp.weixin.qq.com](https://mp.weixin.qq.com) → **版本管理** → 找到刚上传的开发版本 → **提交审核**。
4. 审核通过后 → **发布**（可全量发布或灰度）。

> 上传要求：`project.config.json` 的 appid 必须是真实的；开发者工具需登录该小程序的**开发者/管理员**账号；`getLocation` 隐私接口需已申请通过。

---

## ⚠️ Amap 鉴权偏差

PRD 指定高德用**「小程序安全 Key + appid 白名单」**方案（amap-wx SDK，key 在服务端与小程序 appid 绑定）。本仓库改为**直接用 `Taro.request` 调高德 REST 周边搜索 + Web 服务 key + MD5 数字签名**。原因：amap-wx SDK 是外部文件，当前环境无法获取，REST 方案可自包含运行。

权衡：REST + 签名下，key 与安全密钥都在客户端（可被提取），**弱于** PRD 选定的 appid 白名单绑定。切换到 SDK 方案是局部改动——只有 `src/adapters/amapPoiSource.ts` 实现了 `PoiSource` 端口，引擎与 UI 不受影响。

---

## 注意事项

| 项 | 说明 |
| --- | --- |
| **依赖安装** | 任何时候增删依赖都加 `--legacy-peer-deps`；`webpack` 必须锁在 `5.91.0`（已 pin），否则构建会因 ProgressPlugin schema 报错。 |
| **营业状态** | 高德不返回可靠的实时营业状态，适配器对未知数据默认按「营业中」处理，可能误推打烊的店——MVP 已知限制。 |
| **菜系 type code** | `src/adapters/cuisineAmapMap.ts` 里几个菜系的高德 typecode 是近似值，上线前请对照官方 POI 类型表核对。 |
| **Amap 鉴权** | 见上方「Amap 鉴权偏差」——当前 REST+签名方案弱于 PRD 的 SDK+appid 白名单方案。 |

---

## 实现状态

| Issue | 状态 |
| --- | --- |
| 01 转盘随机抽出周边餐厅 | 引擎 ✅（已测）· UI ✅（类型检查，手动） |
| 02 接受候选展示落定决策 + 历史 | 引擎 ✅ · UI ✅（手动） |
| 03 冷却排除最近 3 家 | 引擎 ✅ · UI ✅（手动） |
| 04 约束 + 硬护栏 | 引擎 ✅ · UI ✅（手动） |
| 05 候选集为空的分层放宽 | 引擎 ✅（已测） |
| 06 跳转美团外卖（无 CPS） | 适配器 ✅（手动） |

---

## 测试策略

按 PRD 的测试决策，**只有决策引擎被单测覆盖**（预先约定的 seam）。fake 只放在系统边界（POI 源）和确定性输入（种子/假 RNG、假时钟），从不 mock 引擎自身的内部。UI 与 `wx.*`/高德适配器是薄胶水 + 环境耦合，靠微信开发者工具手动验证。

---

## 进一步文档

- 领域词汇见 `CONTEXT.md`（餐厅 / 候选集 / 约束 / 冷却 / 决策 / 候选展示）。
- 架构决策见 `docs/adr/0001…0003`。
- 需求与切片见 `.scratch/mvp/PRD.md` 与 `.scratch/mvp/issues/`。
