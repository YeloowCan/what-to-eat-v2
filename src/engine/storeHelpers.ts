import { COOLDOWN_WINDOW, HISTORY_LIMIT } from './constants'
import type { Decision, PoiId } from './types'

/**
 * Prepend a decision and trim to the rolling history limit. The store keeps
 * decisions newest-first; this is the pure, testable core of "滚动保留最近 50 条"
 * so the wx.storage adapter stays thin glue.
 */
export function appendDecision(
  decisions: readonly Decision[],
  newDecision: Decision,
  limit: number = HISTORY_LIMIT,
): Decision[] {
  return [newDecision, ...decisions].slice(0, limit)
}

/**
 * Derive the cooldown list — poiIds of the last `window` accepted decisions,
 * newest first. Cooldown is derived from history rather than stored separately,
 * so it can never drift out of sync.
 */
export function deriveCooldownPoiIds(
  decisions: readonly Decision[],
  window: number = COOLDOWN_WINDOW,
): PoiId[] {
  return decisions.slice(0, window).map((d) => d.poiId)
}
