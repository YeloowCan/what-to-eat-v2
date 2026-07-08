import Taro from '@tarojs/taro'
import type { DeepLinkPort } from '../ports/deepLinkPort'

// 美团外卖小程序 appid — replace with the real Meituan takeout mini-program
// appid before publishing. MVP is a pure jump: no path / extraData / CPS params.
const MEITUAN_APPID = 'wx_meituan_appid_placeholder'

/**
 * Deep-link port — wraps Taro.navigateToMiniProgram to the Meituan takeout mini
 * program. On failure (not installed, jump blocked) it throws so the UI shows a
 * fallback hint instead of hanging.
 */
export class MeituanDeepLinkPort implements DeepLinkPort {
  async openMeituan(): Promise<void> {
    try {
      await Taro.navigateToMiniProgram({ appId: MEITUAN_APPID })
    } catch {
      throw new Error('跳转美团失败')
    }
  }
}
