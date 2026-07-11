import { AmapPoiSource } from './adapters/amapPoiSource'
import { WxLocationPort } from './adapters/wxLocation'
import { WxStorageDecisionStore } from './adapters/wxStorageDecisionStore'
import { MeituanDeepLinkPort } from './adapters/meituanDeepLink'
import type { Clock, DeepLinkPort, Rng } from './ports'
import type { LocationPort } from './ports/locationPort'
import type { PoiSource } from './ports/poiSource'
import type { PoiDisplayPort } from './ports/poiDisplayPort'
import type { DecisionStore } from './ports/decisionStore'
import { SeededRng } from './ports/rng'
import { SystemClock } from './ports/clock'

/** The collaborators the UI wires into the decision engine. */
export interface AppDeps {
  location: LocationPort
  poiSource: PoiSource
  /** Display-only port (ADR-0005); called by the UI after the reveal, never by the engine. */
  poiDisplay: PoiDisplayPort
  store: DecisionStore
  deepLink: DeepLinkPort
  rng: Rng
  clock: Clock
}

// Amap Web-service credentials. Taro injects TARO_APP_* env vars (set in .env,
// see .env.example) into the bundle at build time — client-direct, no backend.
// Empty values surface as a runtime error from the adapter (manual verify).
const AMAP_KEY = process.env.TARO_APP_AMAP_KEY ?? ''
const AMAP_SECRET = process.env.TARO_APP_AMAP_SECRET ?? ''

/** Build the production dependency set. Called once at app launch. */
export function createDeps(): AppDeps {
  // One Amap instance serves both PoiSource and PoiDisplayPort so the display
  // cache (populated during find()) is shared with the reveal card's get().
  const amap = new AmapPoiSource({ key: AMAP_KEY, secret: AMAP_SECRET })
  return {
    location: new WxLocationPort(),
    poiSource: amap,
    poiDisplay: amap,
    store: new WxStorageDecisionStore(),
    deepLink: new MeituanDeepLinkPort(),
    // Seed once per launch so a session's spins vary; picks are still uniform.
    rng: new SeededRng(Math.floor(Math.random() * 0xffffffff)),
    clock: new SystemClock(),
  }
}

// Module-level singleton: pages share one DI root (one RNG seed, one store
// instance) instead of each constructing a full set it may not fully use.
let deps: AppDeps | null = null
export function getDeps(): AppDeps {
  if (deps === null) deps = createDeps()
  return deps
}
