import Taro from '@tarojs/taro'
import { md5 } from 'js-md5'
import type { PoiQuery, PoiSource } from '../ports/poiSource'
import type { PoiDisplay, PoiDisplayPort } from '../ports/poiDisplayPort'
import type { Cuisine, OpenStatus, PoiId, Restaurant } from '../engine/types'
import { AMAP_TYPE_TO_CUISINE, CUISINE_TO_AMAP_TYPE } from './cuisineAmapMap'

const AMAP_AROUND_URL = 'https://restapi.amap.com/v3/place/around'

export interface AmapConfig {
  /** Amap Web-service key (configure via env / build constants; client-direct). */
  key: string
  /** Amap Web-service secret (安全密钥) used to sign requests. Empty = unsigned. */
  secret: string
}

interface AmapPhotoRaw {
  url: string
  title?: string
}

interface AmapPoiRaw {
  id: string
  name: string
  typecode: string
  location: string // "lng,lat"
  distance: string // meters, as a string
  // ⚠ Amap returns these optional scalar fields as an empty array `[]` (not
  // null or "") when the value is absent - a known REST inconsistency. The
  // mappers coerce via asString() / typeof guards instead of assuming string;
  // otherwise a single POI with tel:[] crashes the whole find() (ADR-0005).
  address?: string | string[]
  pname?: string | string[]
  cityname?: string | string[]
  adname?: string | string[]
  tel?: string | string[]
  photos?: AmapPhotoRaw[]
  biz_ext?: { open_mode?: string | string[]; open_time?: string | string[]; [k: string]: unknown }
}

interface AmapAroundResponse {
  status: string // "1" on success
  info?: string
  count?: string
  pois?: AmapPoiRaw[]
}

/**
 * ⚠ DEVIATION FROM PRD: the PRD specifies Amap's "小程序安全 Key + appid 白名单"
 * scheme (the amap-wx SDK, where the key is bound to the mini-program appid
 * server-side). That requires the external amap-wx.js SDK, which is not
 * fetchable here. This adapter instead calls Amap's REST around-POI search
 * directly via Taro.request with a Web-service key + MD5 digital signature -
 * still client-direct, but the key+secret are both client-side (weaker than the
 * appid-whitelist binding). Swapping in an SDK-based adapter is a localized
 * change: only this file implements PoiSource.
 *
 * Also implements PoiDisplayPort (ADR-0005): around-search with
 * `extensions: 'all'` already returns photos / address / tel / biz_ext.open_time
 * in the payload, so `find()` stashes them by poiId in a short-lived cache and
 * `get(poiId)` answers from it - the reveal card's display fetch is then zero
 * extra network requests in the common case. Display info never enters the
 * domain model; the engine never calls `get`.
 */
export class AmapPoiSource implements PoiSource, PoiDisplayPort {
  /** Display fields cached from around-search payloads, keyed by poiId (ADR-0005). */
  private readonly displayCache = new Map<PoiId, PoiDisplay>()
  /** Cap on the cache to keep it short-lived across a session of respins. */
  private static readonly CACHE_CAP = 128

  constructor(private readonly config: AmapConfig) {}

  async find(query: PoiQuery): Promise<Restaurant[]> {
    const params: Record<string, string> = {
      key: this.config.key,
      location: `${query.location.longitude},${query.location.latitude}`,
      radius: String(Math.round(query.radiusKm * 1000)),
      types: CUISINE_TO_AMAP_TYPE[query.cuisine],
      offset: '25',
      page: '1',
      extensions: 'all',
      output: 'json',
    }
    const sig = sign(params, this.config.secret)
    if (sig) params.sig = sig

    const res = await Taro.request<AmapAroundResponse>({
      url: AMAP_AROUND_URL,
      data: params,
      method: 'GET',
    })
    const data = res.data
    if (!data || data.status !== '1' || !data.pois) {
      throw new Error(`高德 POI 搜索失败：${data?.info ?? '未知错误'}`)
    }
    const restaurants: Restaurant[] = []
    for (const poi of data.pois) {
      const r = toRestaurant(poi)
      if (r) restaurants.push(r)
      // Stash display fields from the already-fetched payload so the reveal
      // card's get(poiId) needs no second request (ADR-0005).
      this.cacheDisplay(poi)
    }
    return restaurants
  }

  async get(poiId: PoiId): Promise<PoiDisplay | null> {
    const cached = this.displayCache.get(poiId)
    if (cached) return cached
    // Cache miss (e.g. a historical poiId not in the current candidate set).
    // Amap v3 - the configured key's API - exposes no single-POI detail-by-id
    // endpoint, and v5 /place/detail would need a v5-enabled key (unverified).
    // Degrade to null: the UI shows the cuisine placeholder. The reveal card
    // always hits the cache (its suggestion came from a fresh find()), so this
    // miss path is not exercised by the display-info feature; revisit when
    // history-list photos land (ADR-0005's Devtools 验证口子).
    return null
  }

  private cacheDisplay(p: AmapPoiRaw): void {
    if (this.displayCache.size >= AmapPoiSource.CACHE_CAP) {
      // FIFO evict the oldest entry to keep the cache short-lived.
      const firstKey = this.displayCache.keys().next().value
      if (firstKey !== undefined) this.displayCache.delete(firstKey)
    }
    this.displayCache.set(p.id, toDisplay(p))
  }
}

/** Amap digital signature: md5(params sorted by key, concatenated, + secret). */
function sign(params: Record<string, string>, secret: string): string {
  if (!secret) return ''
  const concat = Object.keys(params)
    .filter((k) => k !== 'sig')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return md5(concat + secret)
}

function toRestaurant(p: AmapPoiRaw): Restaurant | null {
  const [lngStr, latStr] = p.location.split(',')
  const longitude = Number(lngStr)
  const latitude = Number(latStr)
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null
  const distanceKm = Number(p.distance) / 1000
  const cuisine: Cuisine = AMAP_TYPE_TO_CUISINE[p.typecode] ?? 'any'
  return {
    poiId: p.id,
    name: p.name,
    location: { longitude, latitude },
    cuisine,
    openStatus: parseOpenStatus(p.biz_ext),
    distanceKm: Number.isFinite(distanceKm) ? distanceKm : 0,
  }
}

/**
 * Coerce an Amap scalar field to a trimmed string or null. Amap returns absent
 * scalars as `[]` (empty array), not null/"" - so `.trim()` on the raw value
 * throws. Guard on typeof so the mapper never assumes string (ADR-0005).
 */
function asString(v: unknown): string | null {
  return typeof v === 'string' ? v.trim() || null : null
}

/**
 * Project the raw around payload's display fields into a PoiDisplay. Pure
 * mapping (adapter glue, not unit-tested - same stance as toRestaurant /
 * parseOpenStatus, verified in Devtools). Missing fields -> null so the UI can
 * omit them; the engine is uninvolved.
 */
function toDisplay(p: AmapPoiRaw): PoiDisplay {
  const photoUrl = p.photos?.[0]?.url || null
  const addressParts = [p.pname, p.cityname, p.adname, p.address].filter(
    (s): s is string => typeof s === 'string' && s.length > 0,
  )
  const address = addressParts.join('') || null
  const tel = asString(p.tel)
  // Amap `tel` can hold several numbers separated by ';'; take the first for
  // makePhoneCall (给一个就够了).
  const phone = tel ? tel.split(';')[0].trim() || null : null
  const openHours = asString(p.biz_ext?.open_time)
  return { poiId: p.id, photoUrl, address, phone, openHours }
}

/**
 * Amap does not reliably expose real-time open/closed status. When the data is
 * absent or ambiguous we default to 'open' (lenient) so the openOnly guardrail
 * doesn't nuke the whole candidate set - a documented MVP limitation.
 */
function parseOpenStatus(biz_ext: AmapPoiRaw['biz_ext']): OpenStatus {
  const mode = biz_ext?.open_mode
  if (mode === '关闭' || mode === 'close' || mode === 'closed') return 'closed'
  return 'open'
}
