import type { Cuisine, DistanceKm, GeoPoint, Restaurant } from '../engine/types'

/** A find query for nearby restaurants, issued by the decision engine. */
export interface PoiQuery {
  location: GeoPoint
  radiusKm: DistanceKm
  cuisine: Cuisine
}

/**
 * POI source port — wraps Amap nearby POI search. The engine calls `find`;
 * adapters implement it against the real Amap API. `find` should return
 * restaurants within `radiusKm`, but the engine is the source of truth for
 * filtering — it re-applies distance / open / cuisine / cooldown itself — so a
 * dumb fake (returning a fixed pool) is fully testable.
 */
export interface PoiSource {
  find(query: PoiQuery): Promise<Restaurant[]>
}
