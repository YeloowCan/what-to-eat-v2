import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.css'

export interface PermissionGateProps {
  onRetry: () => void
}

/**
 * 全屏硬阻断 — shown when location permission is denied. MVP has no manual
 * location fallback (v2): the user must grant location to use the app. The
 * button opens WeChat's auth settings; on grant, the page retries.
 */
export default function PermissionGate({ onRetry }: PermissionGateProps) {
  const openSetting = async () => {
    try {
      const res = await Taro.openSetting()
      if (res.authSetting['scope.userLocation']) {
        onRetry()
      }
    } catch {
      // user dismissed settings — stay blocked
    }
  }

  return (
    <View className='permission-gate'>
      <Text className='permission-gate__emoji'>📍</Text>
      <Text className='permission-gate__title'>需要定位才能用</Text>
      <Text className='permission-gate__desc'>
        今天吃什么需要知道你在哪，才能找到附近的餐厅。
      </Text>
      <Button className='permission-gate__btn' type='primary' onClick={openSetting}>
        去开启定位
      </Button>
    </View>
  )
}
