/**
 * 深链端口 (Deep-link port) — wraps `wx.navigateToMiniProgram` to the Meituan
 * takeout mini program. MVP is a pure jump: no CPS / affiliate params (v2 once
 * Meituan联盟 credentials are obtained) and no restaurant-specific deep link
 * (the user searches the accepted restaurant name on Meituan themselves).
 * `openMeituan` throws on failure so the UI can show a fallback hint.
 */
export interface DeepLinkPort {
  openMeituan(): Promise<void>
}
