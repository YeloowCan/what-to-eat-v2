import type { PoiId } from '../engine/types'

/**
 * 展示信息 (Display Info) - a restaurant's actionability / reachability data
 * (photo / address / phone / opening hours). Per ADR-0005 this is **not** part
 * of the domain model: it is a platform-side fact (like menu / price / ordering)
 * fetched by `poiId` at display time, never persisted, never snapshotted into a
 * Decision (a photo URL expires, opening hours change - not stable facts). The
 * engine never touches this type; only the UI calls the port after the reveal.
 *
 * Every field is nullable: the adapter returns what Amap actually gave (often
 * nothing for small shops - a documented MVP limit). The UI degrades per field
 * (no photo -> cuisine placeholder; no address/hours -> row omitted; no phone ->
 * no dial entry). `poiId` is echoed back so the UI can guard against a stale
 * fetch landing on the wrong restaurant.
 */
export interface PoiDisplay {
  poiId: PoiId
  /** First photo URL from Amap's around payload, or null. Multi-photo -> first only (给一个就够了). */
  photoUrl: string | null
  /** Composed address string, or null when Amap returned none. */
  address: string | null
  /** First phone number from Amap's `tel`, or null. */
  phone: string | null
  /** Opening-hours string e.g. "10:00-22:00", or null when absent. */
  openHours: string | null
}

/**
 * Display-only port - fetches 展示信息 by `poiId`. Distinct from `PoiSource`
 * (which the engine uses to find candidates): the engine never calls this. The
 * Amap adapter implements it by caching the display fields already returned by
 * around-search during `find()` (common case: zero extra network requests) and
 * answering `get(poiId)` from that cache.
 */
export interface PoiDisplayPort {
  get(poiId: PoiId): Promise<PoiDisplay | null>
}
