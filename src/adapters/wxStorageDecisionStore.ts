import Taro from '@tarojs/taro'
import type { DecisionStore } from '../ports/decisionStore'
import { appendDecision, deriveCooldownPoiIds } from '../engine'
import type { Decision, PoiId } from '../engine/types'

const DECISIONS_KEY = 'what-to-eat:decisions'

/**
 * Decision store — wraps wx.storage (via Taro). Persists the rolling-last-50
 * decision history; cooldown is derived from history (never stored separately).
 */
export class WxStorageDecisionStore implements DecisionStore {
  async getDecisions(): Promise<Decision[]> {
    const raw = Taro.getStorageSync<string>(DECISIONS_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? (parsed as Decision[]) : []
    } catch {
      return []
    }
  }

  async saveDecision(decision: Decision): Promise<void> {
    const decisions = await this.getDecisions()
    const next = appendDecision(decisions, decision)
    Taro.setStorageSync(DECISIONS_KEY, JSON.stringify(next))
  }

  async getCooldownPoiIds(): Promise<PoiId[]> {
    const decisions = await this.getDecisions()
    return deriveCooldownPoiIds(decisions)
  }
}
