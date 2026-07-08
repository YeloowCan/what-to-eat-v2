import type { Clock } from '../ports/clock'
import type { Decision, PoiId, Suggestion } from './types'
import { COOLDOWN_WINDOW } from './constants'

export interface AcceptInput {
  suggestion: Suggestion
  /**
   * Current cooldown poiIds (newest first), as derived from the store. Optional:
   * the returned cooldownPoiIds is only consumed by tests (the store re-derives
   * cooldown from history), so production callers may omit it to skip a storage
   * read. When omitted, the returned cooldownPoiIds reflects only this decision.
   */
  priorCooldownPoiIds?: readonly PoiId[]
  clock: Clock
}

export interface AcceptOutput {
  decision: Decision
  /** Updated cooldown poiIds (newest first). */
  cooldownPoiIds: PoiId[]
}

/**
 * 接受候选展示 -> 落定为决策。Produces a Decision record (identity / location /
 * cuisine snapshots + the user's constraint snapshot + timestamp) and the
 * updated cooldown list. Pure - no IO. The caller persists the decision;
 * cooldown is also re-derivable from history but is returned here so the engine
 * is self-contained and testable.
 */
export function acceptSuggestion(input: AcceptInput): AcceptOutput {
  const { suggestion, clock } = input
  const restaurant = suggestion.restaurant
  const decision: Decision = {
    poiId: restaurant.poiId,
    name: restaurant.name,
    location: restaurant.location,
    cuisine: restaurant.cuisine,
    acceptedAt: clock.now(),
    constraintSnapshot: {
      distanceKm: suggestion.userConstraint.distanceKm,
      cuisine: suggestion.userConstraint.cuisine,
    },
  }
  const cooldownPoiIds = [restaurant.poiId, ...(input.priorCooldownPoiIds ?? [])].slice(
    0,
    COOLDOWN_WINDOW,
  )
  return { decision, cooldownPoiIds }
}
