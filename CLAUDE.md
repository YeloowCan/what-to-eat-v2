# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

今天吃什么 (What to Eat Today) — a WeChat mini-program that cures choice paralysis by randomly picking **one** nearby restaurant. Taro 4 (React) + TypeScript, compiled to WeChat mini-program (weapp). No backend, no accounts; all state lives in `wx.storage`.

## Commands

```bash
npm install --legacy-peer-deps   # MUST use this flag — Taro 4 peer conflicts cause ERESOLVE otherwise
npm run dev:weapp                # watch-compile src/ → dist/
npm run build:weapp              # production build (minified, no watch)
npm test                         # vitest run — engine unit tests only
npm run test:watch               # vitest watch
npm run typecheck                # tsc --noEmit (whole project)
```

Run a single test file or test name:

```bash
npx vitest run src/engine/pickSuggestion.test.ts
npx vitest run -t "relaxes distance"
```

**webpack is pinned to `5.91.0`** in package.json — do not bump it. Newer versions break the build via a ProgressPlugin schema error. Any dep add/remove keeps `--legacy-peer-deps`.

To preview: open the **project root directory** (not `dist/`) in WeChat Devtools — `project.config.json` sets `miniprogramRoot: "dist/"`. The engine and `wx.*`/Amap adapters are **not** unit-tested; verify them manually in Devtools (per the PRD's testing decision).

## Architecture — the one big idea

The **decision engine (`src/engine/`)** is a pure TypeScript module. It never imports `wx.*` or makes network calls — every external collaborator is an injected **port**. This isolation is *why* it is the single automated test seam. The layers, from pure → impure:

- `src/engine/` — domain model + logic (`pickSuggestion`, `acceptSuggestion`, `storeHelpers`). Pure. The only unit-tested code.
- `src/ports/` — port interfaces (`PoiSource`, `LocationPort`, `DecisionStore`, `DeepLinkPort`, `Rng`, `Clock`) **plus** their pure implementations (`SeededRng`/`FakeRng`, `SystemClock`/`FakeClock`).
- `src/adapters/` — thin glue implementing the ports against `wx.*`/Amap/Meituan. Manually verified, not unit-tested.
- `src/composition.ts` — the DI root. `createDeps()` wires real adapters; `getDeps()` is a module-level singleton so pages share one RNG seed and one store instance.
- `src/pages/`, `src/components/` — UI orchestration. The spin page's flow is: read cooldown → `pickSuggestion` → display → (accept「就这家」) `acceptSuggestion` → `store.saveDecision`. Respin just calls `pickSuggestion` again (writes nothing).

When changing behavior, decide first which layer it belongs to. Logic that can be expressed without `wx`/network belongs in `engine` (and gets a test). Glue belongs in `adapters`. The seam boundary is sacred: the engine must stay importable by vitest with no Taro in the graph.

## Domain model essentials

Vocabulary is fixed in `CONTEXT.md` (餐厅/候选集/约束/冷却/决策/候选展示) — use those terms, not synonyms. Key invariants, several of which are enforced in code and easy to violate:

- **Candidate set** = nearby POIs ∩ user constraint ∩ (cooldown-excluded). `pickSuggestion` draws one uniformly at random.
- **Hard guardrails**: `openOnly` and `cuisine` (when not `any`) are **never** auto-relaxed. Only `distanceKm` and cooldown are relaxable.
- **Tiered relaxation** when the candidate set is empty (`pickSuggestion.ts`): unfreeze cooldown at the user's radius → widen up the distance ladder `1→3→5→10 km` (cooldown stays unfrozen) → return `{ kind: 'needsRelaxCuisine' }` for the UI to surface to the user. The engine never silently switches cuisine.
- **Suggestion vs Decision**: a spin result (`Suggestion`) is transient — not persisted, not cooldown. It only becomes a `Decision` on accept. A Decision snapshots identity/location/cuisine + the user's constraint so history survives the restaurant later closing or renaming on Amap.
- **Cooldown** = poiIds of the last `COOLDOWN_WINDOW` (=3) accepted decisions, **derived from history** (`deriveCooldownPoiIds`), never stored separately — it cannot drift. History rolls at `HISTORY_LIMIT` (=50), newest first.
- RNG and Clock are ports so picks/timestamps are deterministic in tests. `pickSuggestion` consumes exactly one `rng.next()` per spin; the `wheelPool` sample is selected deterministically (no extra RNG draw) so the pick index stays the only randomness.

Constants (`COOLDOWN_WINDOW`, `HISTORY_LIMIT`, `WHEEL_POOL_SIZE`, `DISTANCE_LADDER_KM`, `DEFAULT_CONSTRAINT`) live in `src/engine/constants.ts`. Engine test doubles (`makeRestaurant`, `fixedPoiSource`, `FakeRng`, `FakeClock`) live in `src/engine/testing.ts` and `src/ports/`.

## Design language — "命运抽签" (ADR-0004)

The product sells *fate*: eliminate choice, give one. The UI reflects this with a real wheel (conic-gradient sectors showing the **real** candidate restaurants from `wheelPool`, decelerating to land on the winner — located by `poiId`, not array index) and a warm palette. Design tokens in `src/app.css` are the **single source of truth** — components reference `var(--color-*)` tokens, never raw hex values.

**Gold (`--color-gold`) is reserved** for exactly two moments: the wheel landing on the winner, and the accept「就这家」lock-in. Do not use gold for ambient decoration — `--color-gold-soft` exists for that. When fewer than ~4 candidates exist, the wheel is skipped and the card reveals directly (spinning one option is a notice, not fate).

The spin page manages a `Phase` state machine and a `spinToken` stale-result guard (each spin gets a token; a result is applied only if no newer spin superseded it) so respin / constraint-change can overlap an in-flight fetch without flicker. First spin is 2500ms; respin is 1200ms (brisker but still fate).

## Known deviations & MVP limits

- **Amap auth**: PRD specifies amap-wx SDK + appid whitelist. Repo uses REST + MD5 signature instead (`src/adapters/amapPoiSource.ts`) because the SDK isn't fetchable. Key + secret are both client-side — **weaker** than the PRD scheme. Switching back is a localized change (only that file implements `PoiSource`).
- **Open status**: Amap doesn't reliably return real-time open/closed; the adapter defaults unknown to `'open'` (lenient) so `openOnly` doesn't nuke the candidate set. May mis-recommend closed places — documented MVP limit.
- **Cuisine → Amap typecode** mappings in `src/adapters/cuisineAmapMap.ts` are approximate; verify against Amap's official POI type table before shipping.
- **Placeholders to fill before running/publishing**: `project.config.json` appid (currently a real dev appid), `TARO_APP_AMAP_KEY`/`TARO_APP_AMAP_SECRET` in `.env`, `MEITUAN_APPID` in `src/adapters/meituanDeepLink.ts`. Amap env vars are injected at build time via `process.env.TARO_APP_*` (read in `composition.ts`).

## Workflow

Conventional commits with scopes: `feat(ui):`, `feat(engine):`, `chore(deps):`, `docs:`. Work is sliced into tickets tracked under `.scratch/mvp/issues/` (engine MVP, issues 01–06) and `.scratch/ui-redesign/issues/` (real-wheel + fortune redesign, tickets 01–06); commits reference the ticket as `(ticket NN)`. Specs: `.scratch/mvp/PRD.md` (engine), `.scratch/ui-redesign/PRD.md` (UI). Architecture decisions in `docs/adr/0001…0004`. `.scratch/` is tracked in git on purpose — it holds the PRD and issues.
