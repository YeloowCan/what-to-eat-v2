// Test doubles shared by engine tests. These sit at system boundaries (POI
// source) or model deterministic inputs (restaurants), never mocking the
// engine's own internals. Test-only — not re-exported from the engine barrel.
import type { PoiSource } from '../ports/poiSource'
import type { Decision, PickResult, Restaurant, Suggestion } from './types'

/** Build a restaurant with sensible defaults; override only what a test cares about. */
export function makeRestaurant(
  overrides: Partial<Restaurant> & Pick<Restaurant, 'poiId'>,
): Restaurant {
  return {
    name: `餐厅${overrides.poiId}`,
    location: { longitude: 116.397, latitude: 39.908 },
    cuisine: 'fastfood',
    openStatus: 'open',
    distanceKm: 0.5,
    ...overrides,
  }
}

/** Build a decision with sensible defaults; override only what a test cares about. */
export function makeDecision(overrides: Partial<Decision> & Pick<Decision, 'poiId'>): Decision {
  return {
    name: `餐厅${overrides.poiId}`,
    location: { longitude: 116.397, latitude: 39.908 },
    cuisine: 'fastfood',
    acceptedAt: 0,
    constraintSnapshot: { distanceKm: 1, cuisine: 'any' },
    ...overrides,
  }
}

/** A POI source that always returns the same pool, ignoring the query. */
export function fixedPoiSource(pool: Restaurant[]): PoiSource {
  return {
    async find() {
      return pool
    },
  }
}

/** Unwrap a PickResult, asserting it is a suggestion (fails loudly otherwise). */
export function suggestionOf(result: PickResult): Suggestion {
  if (result.kind !== 'suggestion') {
    throw new Error(`expected a suggestion, got ${result.kind}`)
  }
  return result.suggestion
}
