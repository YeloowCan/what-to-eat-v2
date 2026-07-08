import type { Decision, PoiId } from '../engine/types'

/**
 * 决策存储端口 (Decision store port) — wraps `wx.storage`. Persists decision
 * history (rolling last 50) and derives the cooldown list (poiIds of the last
 * `COOLDOWN_WINDOW` accepted decisions). Cooldown is derived from history
 * rather than stored separately, so it can never drift out of sync.
 */
export interface DecisionStore {
  /** Persisted decisions, newest first (rolling last 50). */
  getDecisions(): Promise<Decision[]>
  /** Append a decision and trim to the rolling limit. */
  saveDecision(decision: Decision): Promise<void>
  /** Cooldown poiIds — the last `COOLDOWN_WINDOW` accepted decisions, newest first. */
  getCooldownPoiIds(): Promise<PoiId[]>
}
