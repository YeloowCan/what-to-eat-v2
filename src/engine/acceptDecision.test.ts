import { describe, it, expect } from 'vitest'
import { acceptSuggestion } from './acceptDecision'
import { FakeClock } from '../ports/clock'
import { makeRestaurant } from './testing'
import type { Constraint, Suggestion } from './types'

describe('acceptSuggestion', () => {
  it('records a decision snapshotting the restaurant, constraint and timestamp', () => {
    const constraint: Constraint = { distanceKm: 1, cuisine: 'hotpot', openOnly: true }
    const suggestion: Suggestion = {
      restaurant: makeRestaurant({ poiId: 'A', name: '海底捞', cuisine: 'hotpot', distanceKm: 0.5 }),
      userConstraint: constraint,
      effectiveRadiusKm: 1,
      cooldownWasRelaxed: false,
    }

    const { decision } = acceptSuggestion({
      suggestion,
      priorCooldownPoiIds: [],
      clock: new FakeClock(1_700_000_000_000),
    })

    expect(decision).toEqual({
      poiId: 'A',
      name: '海底捞',
      location: suggestion.restaurant.location,
      cuisine: 'hotpot',
      acceptedAt: 1_700_000_000_000,
      constraintSnapshot: { distanceKm: 1, cuisine: 'hotpot' },
    })
  })

  it('updates the cooldown list (prepend the accepted poiId, trim to the window)', () => {
    const suggestion: Suggestion = {
      restaurant: makeRestaurant({ poiId: 'A' }),
      userConstraint: { distanceKm: 1, cuisine: 'any', openOnly: false },
      effectiveRadiusKm: 1,
      cooldownWasRelaxed: false,
    }

    // Full window → oldest (Z) drops off.
    expect(
      acceptSuggestion({ suggestion, priorCooldownPoiIds: ['X', 'Y', 'Z'], clock: new FakeClock(0) })
        .cooldownPoiIds,
    ).toEqual(['A', 'X', 'Y'])

    // Below window → no trimming.
    expect(
      acceptSuggestion({ suggestion, priorCooldownPoiIds: ['X'], clock: new FakeClock(0) }).cooldownPoiIds,
    ).toEqual(['A', 'X'])
  })
})
