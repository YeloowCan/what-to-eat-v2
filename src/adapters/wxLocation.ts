import Taro from '@tarojs/taro'
import type { LocationPort } from '../ports/locationPort'
import type { GeoPoint } from '../engine/types'

/** User denied location permission (or it is revoked) — UI shows the hard-block gate. */
export class LocationDeniedError extends Error {
  constructor() {
    super('定位授权被拒绝')
    this.name = 'LocationDeniedError'
  }
}

/** Location lookup failed for a non-permission reason (no GPS, timeout, etc.) — UI offers retry. */
export class LocationFailedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LocationFailedError'
  }
}

/**
 * Location port — wraps Taro.getLocation (gcj02, matching Amap's coordinate
 * system). MVP hard-blocks on denial: there is no manual location fallback (v2).
 */
export class WxLocationPort implements LocationPort {
  async getCurrent(): Promise<GeoPoint> {
    let res: Taro.getLocation.SuccessCallbackResult
    try {
      res = await Taro.getLocation({ type: 'gcj02' })
    } catch (e) {
      const errMsg = (e as { errMsg?: string })?.errMsg ?? ''
      if (/auth|deny|privacy/i.test(errMsg)) {
        throw new LocationDeniedError()
      }
      throw new LocationFailedError(errMsg || '定位失败')
    }
    return { longitude: res.longitude, latitude: res.latitude }
  }
}
