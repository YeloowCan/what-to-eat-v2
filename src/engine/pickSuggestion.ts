import type { Constraint, DistanceKm, GeoPoint, PickResult, PoiId, Restaurant, Suggestion } from './types'
import type { PoiSource } from '../ports/poiSource'
import type { Rng } from '../ports/rng'
import { DISTANCE_LADDER_KM } from './constants'

export interface PickInput {
  location: GeoPoint
  constraint: Constraint
  cooldownPoiIds: readonly PoiId[]
  poiSource: PoiSource
  rng: Rng
}

/**
 * 决策引擎入口 — 从候选集中均匀随机抽出一家候选展示。
 *
 * Given (location, constraint, cooldown, POI source, RNG), produce a Suggestion
 * or a "needs user to relax cuisine" signal. Pure of `wx.*` / network — all
 * collaborators are injected ports, so this is the single automated seam.
 *
 * When the candidate set is empty the engine relaxes in tiers, never touching
 * the hard guardrails (open / cuisine): first it unfreezes cooldown at the
 * user's radius, then (in later strategies) it widens the search radius.
 */
export async function pickSuggestion(input: PickInput): Promise<PickResult> {
  const { location, constraint, poiSource, rng } = input
  const cooldown = new Set(input.cooldownPoiIds)

  // Tiered relaxation, in order: strict → cooldown unfrozen (same radius) →
  // wider rungs of the distance ladder (cooldown stays unfrozen). Open and
  // cuisine are hard guardrails — never appear as something to relax here.
  const startIdx = DISTANCE_LADDER_KM.indexOf(constraint.distanceKm)
  const widerRadii = DISTANCE_LADDER_KM.slice(startIdx + 1)
  const strategies = [
    { radiusKm: constraint.distanceKm, useCooldown: true },
    { radiusKm: constraint.distanceKm, useCooldown: false },
    ...widerRadii.map((radiusKm) => ({ radiusKm, useCooldown: false })),
  ]

  // Fetch each radius at most once — L0 and L1 share the user's radius.
  const cache = new Map<DistanceKm, Restaurant[]>()
  for (const strat of strategies) {
    let pool = cache.get(strat.radiusKm)
    if (!pool) {
      pool = await poiSource.find({ location, radiusKm: strat.radiusKm, cuisine: constraint.cuisine })
      cache.set(strat.radiusKm, pool)
    }
    const candidates = pool.filter(
      (r) =>
        r.distanceKm <= strat.radiusKm &&
        (!constraint.openOnly || r.openStatus === 'open') &&
        (constraint.cuisine === 'any' || r.cuisine === constraint.cuisine) &&
        (!strat.useCooldown || !cooldown.has(r.poiId)),
    )
    if (candidates.length > 0) {
      const index = Math.floor(rng.next() * candidates.length)
      const suggestion: Suggestion = {
        restaurant: candidates[index],
        userConstraint: constraint,
        effectiveRadiusKm: strat.radiusKm,
        cooldownWasRelaxed: !strat.useCooldown,
      }
      return { kind: 'suggestion', suggestion }
    }
  }
  return { kind: 'needsRelaxCuisine' }
}
