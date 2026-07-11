import type { Constraint, DistanceKm } from './types'

/** 冷却窗口 — number of most-recent accepted decisions excluded from the candidate set. */
export const COOLDOWN_WINDOW = 3

/** 历史保留 — rolling limit on persisted decisions (newest kept). */
export const HISTORY_LIMIT = 50

/** 转盘扇区上限 - max restaurants shown on the wheel (winner always included). */
export const WHEEL_POOL_SIZE = 8

/** The distance relaxation ladder (km), tried in order when the candidate set is empty. */
export const DISTANCE_LADDER_KM: readonly DistanceKm[] = [1, 3, 5, 10]

/** The default constraint: 1 km, any cuisine, open-only. "No constraints set" === this. */
export const DEFAULT_CONSTRAINT: Constraint = {
  distanceKm: 1,
  cuisine: 'any',
  openOnly: true,
}
