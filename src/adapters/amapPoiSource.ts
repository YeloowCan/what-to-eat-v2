import Taro from '@tarojs/taro'
import { md5 } from 'js-md5'
import type { PoiQuery, PoiSource } from '../ports/poiSource'
import type { Cuisine, OpenStatus, Restaurant } from '../engine/types'
import { AMAP_TYPE_TO_CUISINE, CUISINE_TO_AMAP_TYPE } from './cuisineAmapMap'

const AMAP_AROUND_URL = 'https://restapi.amap.com/v3/place/around'

export interface AmapConfig {
  /** Amap Web-service key (configure via env / build constants; client-direct). */
  key: string
  /** Amap Web-service secret (安全密钥) used to sign requests. Empty = unsigned. */
  secret: string
}

interface AmapPoiRaw {
  id: string
  name: string
  typecode: string
  location: string // "lng,lat"
  distance: string // meters, as a string
  biz_ext?: { open_mode?: string; [k: string]: unknown }
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
 * directly via Taro.request with a Web-service key + MD5 digital signature —
 * still client-direct, but the key+secret are both client-side (weaker than the
 * appid-whitelist binding). Swapping in an SDK-based adapter is a localized
 * change: only this file implements PoiSource.
 */
export class AmapPoiSource implements PoiSource {
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
    return data.pois.map(toRestaurant).filter((r): r is Restaurant => r != null)
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
 * Amap does not reliably expose real-time open/closed status. When the data is
 * absent or ambiguous we default to 'open' (lenient) so the openOnly guardrail
 * doesn't nuke the whole candidate set — a documented MVP limitation.
 */
function parseOpenStatus(biz_ext: AmapPoiRaw['biz_ext']): OpenStatus {
  const mode = biz_ext?.open_mode
  if (mode === '关闭' || mode === 'close' || mode === 'closed') return 'closed'
  return 'open'
}
