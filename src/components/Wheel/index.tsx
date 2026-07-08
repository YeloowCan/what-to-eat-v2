import type { PropsWithChildren } from 'react'
import { View, Text } from '@tarojs/components'
import './index.css'

export interface WheelProps {
  spinning: boolean
}

/**
 * 转盘 — a decorative spin animation. While `spinning`, shows a rotating
 * indicator; when it stops, renders the suggestion card (children). The picked
 * restaurant is revealed on stop — a simplified "lands on that restaurant"
 * (mapping the pick to a wheel sector is a v2 UX refinement).
 */
export default function Wheel({ spinning, children }: PropsWithChildren<WheelProps>) {
  if (spinning) {
    return (
      <View className='wheel'>
        <View className='wheel__spinner' />
        <Text className='wheel__text'>正在为你挑选…</Text>
      </View>
    )
  }
  return <View className='wheel'>{children}</View>
}
