import type { GeoPoint } from '../engine/types'

/**
 * Location port — wraps `wx.getLocation`. MVP hard-blocks on denial: there is
 * no manual location fallback (v2). `getCurrent` throws on denial / failure so
 * the UI can show the permission-block screen.
 */
export interface LocationPort {
  getCurrent(): Promise<GeoPoint>
}
