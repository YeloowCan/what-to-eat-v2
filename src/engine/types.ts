// Domain model for 今天吃什么.
// Vocabulary follows CONTEXT.md (餐厅 / 候选集 / 约束 / 冷却 / 决策 / 候选展示).
// Architecture follows ADR-0001 (restaurant excludes menu / price / ordering).

/** Amap POI id — the stable identity used for dedup and cooldown. */
export type PoiId = string

export interface GeoPoint {
  longitude: number
  latitude: number
}

/**
 * Curated cuisine taxonomy. `any` means "no cuisine filter" and is the default.
 * The mapping from each cuisine to its Amap POI type code lives in the POI
 * source adapter (the engine never knows Amap codes).
 */
export type Cuisine =
  | 'any'
  | 'hotpot' // 火锅
  | 'sichuan' // 川菜
  | 'cantonese' // 粤菜
  | 'fastfood' // 快餐
  | 'japanese' // 日料
  | 'korean' // 韩餐
  | 'bbq' // 烧烤
  | 'noodle' // 面食
  | 'western' // 西餐
  | 'seafood' // 海鲜
  | 'snack' // 小吃
  | 'dessert' // 甜品饮品

/** Search-radius ladder (km). Users pick from {1, 3, 5}; 10 is relaxation-only. */
export type DistanceKm = 1 | 3 | 5 | 10

export type OpenStatus = 'open' | 'closed'

/**
 * 餐厅 (Restaurant) — a place that serves food. Holds only identity (POI id),
 * location, cuisine and open status. Menu / price / ordering are platform-side
 * facts that happen after deep-linking to Meituan, so they are NOT modelled
 * here (ADR-0001). `distanceKm` is reported by the POI source, not computed by
 * the engine.
 */
export interface Restaurant {
  poiId: PoiId
  name: string
  location: GeoPoint
  cuisine: Cuisine
  openStatus: OpenStatus
  /** Distance from the user as reported by the POI source (km). */
  distanceKm: number
}

/**
 * 约束 (Constraint) — per-decision filters the user sets to narrow nearby POIs
 * into the candidate set. Per-session, not persisted. `openOnly` and `cuisine`
 * (when not `any`) are HARD GUARDRAILS: never auto-relaxed when the candidate
 * set is empty. `distanceKm` is the only dimension the engine may relax.
 */
export interface Constraint {
  distanceKm: DistanceKm
  cuisine: Cuisine
  openOnly: boolean
}

/** Snapshot of the user's constraint, persisted into a Decision. */
export interface ConstraintSnapshot {
  distanceKm: DistanceKm
  cuisine: Cuisine
}

/**
 * 候选展示 (Suggestion) — the restaurant the wheel landed on. A transient
 * random draw from the candidate set; it only becomes a Decision on accept
 * (「就这家」). Respin replaces it without recording anything.
 */
export interface Suggestion {
  restaurant: Restaurant
  /** The constraint the user actually set (snapshotted into a Decision on accept). */
  userConstraint: Constraint
  /** Radius at which the restaurant was found; may exceed the user's distanceKm when distance was relaxed. */
  effectiveRadiusKm: DistanceKm
  /** True if cooldown had to be unfrozen to find this suggestion. */
  cooldownWasRelaxed: boolean
}

/**
 * 决策 (Decision) — the choice the user committed to. Written to local storage
 * on accept, with identity / location / cuisine snapshots so history survives
 * the restaurant later closing or renaming on Amap. Drives cooldown and (in v2)
 * preference weighting.
 */
export interface Decision {
  poiId: PoiId
  name: string
  location: GeoPoint
  cuisine: Cuisine
  acceptedAt: number
  constraintSnapshot: ConstraintSnapshot
}

/**
 * Outcome of a spin: either a 候选展示, or a signal that the candidate set is
 * empty even after full relaxation and the user must relax cuisine themselves.
 */
export type PickResult =
  | { kind: 'suggestion'; suggestion: Suggestion; wheelPool: Restaurant[] }
  | { kind: 'needsRelaxCuisine' }
