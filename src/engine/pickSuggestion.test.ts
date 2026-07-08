import { describe, it, expect } from 'vitest'
import { pickSuggestion } from './pickSuggestion'
import { FakeRng } from '../ports/rng'
import { fixedPoiSource, makeRestaurant, suggestionOf } from './testing'

describe('pickSuggestion', () => {
  it('uniformly picks one restaurant from the candidate set (seeded RNG is assertable)', async () => {
    // Three open restaurants within 1 km, default constraints, no cooldown.
    const pool = [
      makeRestaurant({ poiId: 'A', name: '店A' }),
      makeRestaurant({ poiId: 'B', name: '店B' }),
      makeRestaurant({ poiId: 'C', name: '店C' }),
    ]
    const base = {
      location: { longitude: 0, latitude: 0 },
      constraint: { distanceKm: 1, cuisine: 'any', openOnly: true } as const,
      cooldownPoiIds: [],
      poiSource: fixedPoiSource(pool),
    }

    // Worked example: index = floor(rng.next() * 3).
    expect(suggestionOf(await pickSuggestion({ ...base, rng: new FakeRng([0.0]) })).restaurant.poiId).toBe('A')
    expect(suggestionOf(await pickSuggestion({ ...base, rng: new FakeRng([0.5]) })).restaurant.poiId).toBe('B')
    expect(suggestionOf(await pickSuggestion({ ...base, rng: new FakeRng([0.99]) })).restaurant.poiId).toBe('C')
  })

  it('excludes closed restaurants when openOnly is set (hard guardrail)', async () => {
    const pool = [
      makeRestaurant({ poiId: 'A', openStatus: 'closed' }),
      makeRestaurant({ poiId: 'B', openStatus: 'open' }),
      makeRestaurant({ poiId: 'C', openStatus: 'open' }),
    ]
    const base = {
      location: { longitude: 0, latitude: 0 },
      cooldownPoiIds: [],
      poiSource: fixedPoiSource(pool),
    }

    // openOnly true → only B and C are candidates; rng 0.0 picks the first open (B).
    expect(
      suggestionOf(
        await pickSuggestion({
          ...base,
          constraint: { distanceKm: 1, cuisine: 'any', openOnly: true },
          rng: new FakeRng([0.0]),
        }),
      ).restaurant.poiId,
    ).toBe('B')

    // openOnly false → A is back in; rng 0.0 picks the first overall (A).
    expect(
      suggestionOf(
        await pickSuggestion({
          ...base,
          constraint: { distanceKm: 1, cuisine: 'any', openOnly: false },
          rng: new FakeRng([0.0]),
        }),
      ).restaurant.poiId,
    ).toBe('A')
  })

  it('filters to the chosen cuisine and leaves "any" unfiltered (hard guardrail)', async () => {
    const pool = [
      makeRestaurant({ poiId: 'A', cuisine: 'fastfood' }),
      makeRestaurant({ poiId: 'B', cuisine: 'hotpot' }),
      makeRestaurant({ poiId: 'C', cuisine: 'hotpot' }),
    ]
    const base = {
      location: { longitude: 0, latitude: 0 },
      cooldownPoiIds: [],
      poiSource: fixedPoiSource(pool),
    }

    // cuisine hotpot → only B and C; rng 0.0 picks the first hotpot (B).
    expect(
      suggestionOf(
        await pickSuggestion({
          ...base,
          constraint: { distanceKm: 1, cuisine: 'hotpot', openOnly: false },
          rng: new FakeRng([0.0]),
        }),
      ).restaurant.poiId,
    ).toBe('B')

    // cuisine any → all three; rng 0.0 picks the first overall (A).
    expect(
      suggestionOf(
        await pickSuggestion({
          ...base,
          constraint: { distanceKm: 1, cuisine: 'any', openOnly: false },
          rng: new FakeRng([0.0]),
        }),
      ).restaurant.poiId,
    ).toBe('A')
  })

  it('excludes cooldown restaurants from the candidate set', async () => {
    const pool = [
      makeRestaurant({ poiId: 'A' }),
      makeRestaurant({ poiId: 'B' }),
      makeRestaurant({ poiId: 'C' }),
      makeRestaurant({ poiId: 'D' }),
    ]
    const base = {
      location: { longitude: 0, latitude: 0 },
      poiSource: fixedPoiSource(pool),
      constraint: { distanceKm: 1, cuisine: 'any', openOnly: false } as const,
    }

    // A and B on cooldown → C is the first available; rng 0.0 picks C.
    expect(
      suggestionOf(await pickSuggestion({ ...base, cooldownPoiIds: ['A', 'B'], rng: new FakeRng([0.0]) })).restaurant
        .poiId,
    ).toBe('C')

    // No cooldown → A is back; rng 0.0 picks A.
    expect(
      suggestionOf(await pickSuggestion({ ...base, cooldownPoiIds: [], rng: new FakeRng([0.0]) })).restaurant.poiId,
    ).toBe('A')
  })

  it('excludes restaurants beyond the distance cap', async () => {
    // B is 2 km out but listed first; A is within 1 km.
    const pool = [
      makeRestaurant({ poiId: 'B', distanceKm: 2 }),
      makeRestaurant({ poiId: 'A', distanceKm: 0.5 }),
    ]
    expect(
      suggestionOf(
        await pickSuggestion({
          location: { longitude: 0, latitude: 0 },
          constraint: { distanceKm: 1, cuisine: 'any', openOnly: false },
          cooldownPoiIds: [],
          poiSource: fixedPoiSource(pool),
          rng: new FakeRng([0.0]),
        }),
      ).restaurant.poiId,
    ).toBe('A')
  })

  it('signals needsRelaxCuisine when no restaurant satisfies the hard guardrails', async () => {
    // All closed; openOnly is a hard guardrail the engine never relaxes.
    const pool = [
      makeRestaurant({ poiId: 'A', openStatus: 'closed', distanceKm: 0.3 }),
      makeRestaurant({ poiId: 'B', openStatus: 'closed', distanceKm: 0.4 }),
    ]
    const result = await pickSuggestion({
      location: { longitude: 0, latitude: 0 },
      constraint: { distanceKm: 1, cuisine: 'any', openOnly: true },
      cooldownPoiIds: [],
      poiSource: fixedPoiSource(pool),
      rng: new FakeRng([0.0]),
    })
    expect(result).toEqual({ kind: 'needsRelaxCuisine' })
  })

  it('relaxes cooldown before giving up (still within the user radius)', async () => {
    // A is the only nearby open restaurant but it is on cooldown.
    const pool = [makeRestaurant({ poiId: 'A', distanceKm: 0.5 })]
    const suggestion = suggestionOf(
      await pickSuggestion({
        location: { longitude: 0, latitude: 0 },
        constraint: { distanceKm: 1, cuisine: 'any', openOnly: false },
        cooldownPoiIds: ['A'],
        poiSource: fixedPoiSource(pool),
        rng: new FakeRng([0.0]),
      }),
    )
    expect(suggestion.restaurant.poiId).toBe('A')
    expect(suggestion.cooldownWasRelaxed).toBe(true)
  })

  it('widens the search radius when nothing is found nearby', async () => {
    // A is 2 km away — beyond the 1 km cap but within 3 km.
    const pool = [makeRestaurant({ poiId: 'A', distanceKm: 2 })]
    const suggestion = suggestionOf(
      await pickSuggestion({
        location: { longitude: 0, latitude: 0 },
        constraint: { distanceKm: 1, cuisine: 'any', openOnly: false },
        cooldownPoiIds: [],
        poiSource: fixedPoiSource(pool),
        rng: new FakeRng([0.0]),
      }),
    )
    expect(suggestion.restaurant.poiId).toBe('A')
    expect(suggestion.effectiveRadiusKm).toBe(3)
  })

  it('never relaxes the cuisine guardrail — returns needsRelaxCuisine rather than swapping cuisine', async () => {
    // Plenty of restaurants, but none match the chosen cuisine (hotpot).
    const pool = [
      makeRestaurant({ poiId: 'A', cuisine: 'fastfood', distanceKm: 0.5 }),
      makeRestaurant({ poiId: 'B', cuisine: 'fastfood', distanceKm: 0.6 }),
    ]
    const result = await pickSuggestion({
      location: { longitude: 0, latitude: 0 },
      constraint: { distanceKm: 1, cuisine: 'hotpot', openOnly: false },
      cooldownPoiIds: [],
      poiSource: fixedPoiSource(pool),
      rng: new FakeRng([0.0]),
    })
    expect(result).toEqual({ kind: 'needsRelaxCuisine' })
  })

  it('unfreezes cooldown before widening distance (relaxation order)', async () => {
    // A is on cooldown but within 1 km; B is fresh but 2 km out. The engine must
    // relax cooldown first (picking A) rather than jump to widening distance.
    const pool = [
      makeRestaurant({ poiId: 'A', distanceKm: 0.5 }),
      makeRestaurant({ poiId: 'B', distanceKm: 2 }),
    ]
    const suggestion = suggestionOf(
      await pickSuggestion({
        location: { longitude: 0, latitude: 0 },
        constraint: { distanceKm: 1, cuisine: 'any', openOnly: false },
        cooldownPoiIds: ['A'],
        poiSource: fixedPoiSource(pool),
        rng: new FakeRng([0.0]),
      }),
    )
    expect(suggestion.restaurant.poiId).toBe('A')
    expect(suggestion.cooldownWasRelaxed).toBe(true)
    expect(suggestion.effectiveRadiusKm).toBe(1)
  })
})
