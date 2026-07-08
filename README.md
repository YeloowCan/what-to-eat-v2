# 今天吃什么 (What to Eat Today)

A WeChat mini program that picks **one** nearby restaurant for you — eliminating
the "今天吃哪家" paralysis. Open it, grant location, get one answer. Respin if
you don't like it; tap「就这家」to commit. Recently-chosen places are cooled down
so you don't repeat. No account, no backend — state lives in `wx.storage`.

Built with **Taro 4 (React) + TypeScript**, compiled to a WeChat mini program.

## Architecture

```
src/
  engine/        Decision engine — the single automated test seam (pure, no wx/network)
    types.ts       domain model (餐厅 / 约束 / 冷却 / 决策 / 候选展示) — per CONTEXT.md, ADR-0001
    constants.ts   COOLDOWN_WINDOW=3, HISTORY_LIMIT=50, DISTANCE_LADDER_KM=[1,3,5,10]
    cuisine.ts     curated cuisine taxonomy + labels
    pickSuggestion.ts   spin: filter + uniform random pick + tiered relaxation
    acceptDecision.ts   accept: snapshot a Decision + update cooldown
    storeHelpers.ts     appendDecision (rolling 50) + deriveCooldownPoiIds (last 3)
    *.test.ts           the automated seam — 16 tests
  ports/         Port interfaces (system boundaries) + pure impls (Rng/Clock)
  adapters/      wx/Amap implementations of the ports (thin glue, manual-verify)
    wxLocation.ts             wraps Taro.getLocation
    amapPoiSource.ts          wraps Amap around-POI search (REST + MD5 sig)
    wxStorageDecisionStore.ts wraps wx.storage
    meituanDeepLink.ts        wraps Taro.navigateToMiniProgram
    cuisineAmapMap.ts         Cuisine ↔ Amap POI type code
  composition.ts Dependency injection root — wires adapters into the engine
  components/    PermissionGate, ConstraintSelector, RestaurantCard, Wheel
  pages/         spin (main), history
```

The **decision engine** is pure: it takes injected ports (POI source, RNG, clock,
cooldown) and produces a `Suggestion` or a `needsRelaxCuisine` signal. It never
touches `wx.*` or the network — that isolation is what makes it the test seam.
The UI orchestrates: read cooldown → `pickSuggestion` → show → on「就这家」
`acceptSuggestion` → persist. Respin just calls `pickSuggestion` again (no record).

### Candidate set & relaxation

候选集 = 周边 POI ∩ 约束 ∩ 冷却后剩余. When empty, the engine relaxes in tiers,
never touching the hard guardrails (open / cuisine):

1. **unfreeze cooldown** (same radius), then
2. **widen distance** 1→3→5→10 km, then
3. emit `needsRelaxCuisine` (hand back to the user — never auto-swap cuisine).

`openOnly` and `cuisine` are never relaxed; `distanceKm` and cooldown are.

## Develop

```bash
npm install
npm test            # engine test suite (vitest)
npm run typecheck   # tsc --noEmit across the whole project
npm run dev:weapp   # taro build --type weapp --watch  →  open dist/ in WeChat devtools
```

Open the project root in **WeChat DevTools** (`project.config.json` points at
`dist/`). Use a real WeChat **appid** (tourist mode won't grant `getLocation` or
`navigateToMiniProgram`).

## Configuration (before runtime)

1. **Amap credentials** — copy `.env.example` to `.env` and fill in:
   - `TARO_APP_AMAP_KEY` — Amap Web-service key
   - `TARO_APP_AMAP_SECRET` — Amap 安全密钥 (for request signing)
   Taro injects `TARO_APP_*` into the bundle at build time.
2. **Request domain whitelist** — in the WeChat mini-program console, add
   `https://restapi.amap.com` to the request合法域名 (or disable domain check in
   DevTools for local testing).
3. **Meituan appid** — set `MEITUAN_APPID` in `src/adapters/meituanDeepLink.ts`
   to the real 美团外卖 mini-program appid.
4. **Amap POI type codes** — verify `CUISINE_TO_AMAP_TYPE` in
   `src/adapters/cuisineAmapMap.ts` against the official Amap POI type table
   (several sub-codes are approximate).

## ⚠ Deviation: Amap auth scheme

The PRD specifies Amap's **"小程序安全 Key + appid 白名单"** scheme (the amap-wx
SDK, where the key is bound to the mini-program appid server-side). This repo
instead calls Amap's **REST around-POI search directly via `Taro.request` with a
Web-service key + MD5 digital signature**. Rationale: the amap-wx SDK is an
external file that can't be fetched in this environment, and the REST approach is
self-contained.

Trade-off: with REST+sig, both the key and secret are client-side (extractable),
which is **weaker** than the appid-whitelist binding the PRD chose. Swapping to
an SDK-based adapter is a localized change — only `src/adapters/amapPoiSource.ts`
implements the `PoiSource` port, so the engine and UI are unaffected.

## Testing strategy

Per the PRD's testing decisions, **only the decision engine is unit-tested** (the
pre-agreed seam). Fakes sit at system boundaries (POI source) and model
deterministic inputs (seeded/fake RNG, fake clock) — never mocking the engine's
own internals. The UI and `wx.*`/Amap adapters are thin glue + environment
coupling, verified manually in WeChat Devtools.

## Issue status

| Issue | Status |
| --- | --- |
| 01 spin random nearby | engine ✅ (tested) · UI ✅ (typecheck, manual) |
| 02 accept → decision + history | engine ✅ · UI ✅ (manual) |
| 03 cooldown (last 3) | engine ✅ · UI ✅ (manual) |
| 04 constraints + hard guardrails | engine ✅ · UI ✅ (manual) |
| 05 empty-set tiered relaxation | engine ✅ (tested) |
| 06 deep-link Meituan (no CPS) | adapter ✅ (manual) |

Further notes (domain vocabulary, ADRs) live in `CONTEXT.md` and `docs/adr/`.
