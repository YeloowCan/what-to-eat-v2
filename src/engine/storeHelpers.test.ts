import { describe, it, expect } from 'vitest'
import { appendDecision, deriveCooldownPoiIds } from './storeHelpers'
import { COOLDOWN_WINDOW, HISTORY_LIMIT } from './constants'
import { makeDecision } from './testing'

describe('storeHelpers', () => {
  it('appendDecision keeps the rolling history limit (newest first, oldest dropped)', () => {
    const existing = Array.from({ length: HISTORY_LIMIT }, (_, i) => makeDecision({ poiId: `d${i}` }))
    const fresh = makeDecision({ poiId: 'fresh' })

    const result = appendDecision(existing, fresh)

    expect(result).toHaveLength(HISTORY_LIMIT)
    expect(result[0].poiId).toBe('fresh')
    expect(result[49].poiId).toBe('d48')
    expect(result.find((d) => d.poiId === 'd49')).toBeUndefined()
  })

  it('appendDecision grows the list when below the limit', () => {
    const result = appendDecision([makeDecision({ poiId: 'd0' })], makeDecision({ poiId: 'fresh' }))
    expect(result.map((d) => d.poiId)).toEqual(['fresh', 'd0'])
  })

  it('deriveCooldownPoiIds returns the last COOLDOWN_WINDOW decisions, newest first', () => {
    const decisions = [
      makeDecision({ poiId: 'a' }),
      makeDecision({ poiId: 'b' }),
      makeDecision({ poiId: 'c' }),
      makeDecision({ poiId: 'd' }),
    ]
    expect(deriveCooldownPoiIds(decisions)).toEqual(['a', 'b', 'c'])
  })

  it('deriveCooldownPoiIds returns fewer when history is below the window', () => {
    expect(deriveCooldownPoiIds([makeDecision({ poiId: 'a' }), makeDecision({ poiId: 'b' })])).toEqual([
      'a',
      'b',
    ])
  })

  it('deriveCooldownPoiIds respects the configured window', () => {
    const decisions = [makeDecision({ poiId: 'a' }), makeDecision({ poiId: 'b' }), makeDecision({ poiId: 'c' })]
    expect(deriveCooldownPoiIds(decisions, COOLDOWN_WINDOW + 1)).toEqual(['a', 'b', 'c'])
  })
})
