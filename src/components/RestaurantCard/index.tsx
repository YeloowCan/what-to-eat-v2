import { View, Text, Button } from '@tarojs/components'
import type { Suggestion } from '../../engine'
import { CUISINE_LABELS } from '../../engine'
import './index.css'

export interface RestaurantCardProps {
  suggestion: Suggestion
  accepted: boolean
  onAccept: () => void
  onRespin: () => void
  onOpenMeituan: () => void
  /** Gold top accent - on when the card emerged from the wheel's gold landing.
   * ADR-0004 reserves gold for 中签 + 就这家; off in the <4 skip path. */
  goldAccent?: boolean
}

/**
 * 候选展示卡片 — shows the picked restaurant (name / cuisine / distance / open
 * status) plus the「就这家」commit point and「换一家」respin. After accept it
 * offers the「去美团看看」deep link. Hints surface when the engine had to relax
 * cooldown or widen distance to find this pick.
 */
export default function RestaurantCard({
  suggestion,
  accepted,
  onAccept,
  onRespin,
  onOpenMeituan,
  goldAccent = false,
}: RestaurantCardProps) {
  const r = suggestion.restaurant
  const widened = suggestion.effectiveRadiusKm > suggestion.userConstraint.distanceKm
  return (
    <View className={`restaurant-card${goldAccent ? ' restaurant-card--gold' : ''}`}>
      <View className='restaurant-card__head'>
        <Text className='restaurant-card__name'>{r.name}</Text>
        <Text className='restaurant-card__cuisine'>{CUISINE_LABELS[r.cuisine]}</Text>
      </View>
      <View className='restaurant-card__meta'>
        <Text className='restaurant-card__distance'>📍 {r.distanceKm.toFixed(1)}km</Text>
        <Text
          className={`restaurant-card__status ${r.openStatus === 'open' ? 'is-open' : 'is-closed'}`}
        >
          {r.openStatus === 'open' ? '营业中' : '已打烊'}
        </Text>
      </View>

      {suggestion.cooldownWasRelaxed && (
        <Text className='restaurant-card__hint'>附近没有更合适的，含刚选过的店</Text>
      )}
      {widened && (
        <Text className='restaurant-card__hint'>
          {suggestion.userConstraint.distanceKm}km 内没找到，已扩大到 {suggestion.effectiveRadiusKm}km
        </Text>
      )}

      <View className='restaurant-card__actions'>
        {accepted ? (
          <Button className='restaurant-card__btn' type='primary' onClick={onOpenMeituan}>
            去美团看看
          </Button>
        ) : (
          <>
            <Button className='restaurant-card__btn' onClick={onRespin}>
              换一家
            </Button>
            <Button className='restaurant-card__btn' type='primary' onClick={onAccept}>
              就这家
            </Button>
          </>
        )}
      </View>
    </View>
  )
}
