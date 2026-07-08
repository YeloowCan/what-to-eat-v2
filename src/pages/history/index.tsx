import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import type { Decision } from '../../engine'
import { CUISINE_LABELS } from '../../engine'
import { getDeps } from '../../composition'
import './index.css'

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`
}

// 历史视图 — reads persisted decisions (snapshotted on accept, so a restaurant
// later closing/renaming on Amap still shows what was chosen at the time).
export default function HistoryPage() {
  const deps = getDeps()
  const [decisions, setDecisions] = useState<Decision[]>([])

  useEffect(() => {
    deps.store
      .getDecisions()
      .then(setDecisions)
      .catch(() => setDecisions([]))
  }, [deps])

  return (
    <View className='history'>
      <View className='history__title'>最近选过的</View>
      {decisions.length === 0 ? (
        <Text className='history__empty'>还没有记录，去转一个吧</Text>
      ) : (
        decisions.map((d) => (
          <View key={`${d.poiId}-${d.acceptedAt}`} className='history__item'>
            <View className='history__item-head'>
              <Text className='history__item-name'>{d.name}</Text>
              <Text className='history__item-cuisine'>{CUISINE_LABELS[d.cuisine]}</Text>
            </View>
            <View className='history__item-meta'>
              <Text className='history__item-time'>{formatTime(d.acceptedAt)}</Text>
              <Text className='history__item-constraint'>
                {d.constraintSnapshot.distanceKm}km · {CUISINE_LABELS[d.constraintSnapshot.cuisine]}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  )
}
