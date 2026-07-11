import { useEffect, useState } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import type { Suggestion } from '../../engine'
import { CUISINE_LABELS } from '../../engine'
import type { PoiDisplay } from '../../ports/poiDisplayPort'
import { CUISINE_PLACEHOLDER } from './cuisinePlaceholder'
import './index.css'

export interface RestaurantCardProps {
  suggestion: Suggestion
  accepted: boolean
  /** Display info fetched by poiId on reveal (ADR-0005); null while loading or
   * when the fetch hasn't landed. May be stale across respins - guarded below. */
  displayInfo: PoiDisplay | null
  onAccept: () => void
  onRespin: () => void
  onOpenMeituan: () => void
  /** Open navigation to the restaurant (uses its GeoPoint, not the address). */
  onNavigate: () => void
  /** Dial the given phone number. */
  onCall: (phone: string) => void
  /** Gold top accent - on when the card emerged from the wheel's gold landing.
   * ADR-0004 reserves gold for 中签 + 就这家; off in the <4 skip path. */
  goldAccent?: boolean
}

/**
 * 候选展示卡片 - shows the picked restaurant (name / cuisine / distance / open
 * status) plus the「就这家」commit point and「换一家」respin. After accept it
 * offers the「去美团看看」deep link. Hints surface when the engine had to relax
 * cooldown or widen distance to find this pick.
 *
 * Display info (photo / address / hours / phone) is rendered from `displayInfo`
 * - fetched by poiId on reveal, never part of the domain model (ADR-0005). Each
 * field degrades independently: no photo -> cuisine placeholder (also while
 * loading and on image error); no address / hours -> row omitted; no phone ->
 * no dial entry. None of this blocks「就这家」.
 */
export default function RestaurantCard({
  suggestion,
  accepted,
  displayInfo,
  onAccept,
  onRespin,
  onOpenMeituan,
  onNavigate,
  onCall,
  goldAccent = false,
}: RestaurantCardProps) {
  const r = suggestion.restaurant
  const widened = suggestion.effectiveRadiusKm > suggestion.userConstraint.distanceKm
  // Guard against a stale display fetch landing on the wrong restaurant: only
  // use displayInfo whose poiId matches the card's current restaurant.
  const display = displayInfo && displayInfo.poiId === r.poiId ? displayInfo : null
  const photoUrl = display?.photoUrl ?? null
  const address = display?.address ?? null
  const phone = display?.phone ?? null
  const openHours = display?.openHours ?? null

  // Reset image state whenever the target photo changes (new restaurant, or
  // loading->loaded) so a previous error/load doesn't bleed across draws.
  const [imgFailed, setImgFailed] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  useEffect(() => {
    setImgFailed(false)
    setImgLoaded(false)
  }, [r.poiId, photoUrl])

  return (
    <View
      className={`restaurant-card${goldAccent ? ' restaurant-card--gold' : ''}${
        accepted ? ' restaurant-card--accepted' : ''
      }`}
    >
      {accepted && (
        <View className='restaurant-card__stamp'>
          <Text>就这家✓</Text>
        </View>
      )}

      <View className='restaurant-card__photo'>
        {/* Placeholder is the base layer: shown while loading, when there's no
            photo, and on image error. Tinted by the fortune palette; the emoji
            carries the cuisine so the user still feels the category. */}
        <View className='restaurant-card__placeholder'>
          <Text className='restaurant-card__placeholder-emoji'>
            {CUISINE_PLACEHOLDER[r.cuisine].emoji}
          </Text>
        </View>
        {photoUrl != null && !imgFailed && (
          <Image
            className='restaurant-card__photo-img'
            style={{ opacity: imgLoaded ? 1 : 0 }}
            src={photoUrl}
            mode='aspectFill'
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgFailed(true)}
          />
        )}
      </View>

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
        {openHours && <Text className='restaurant-card__hours'>🕒 {openHours}</Text>}
      </View>

      {address && (
        <View className='restaurant-card__row restaurant-card__row--tap' onClick={onNavigate}>
          <Text className='restaurant-card__row-text'>{address}</Text>
          <Text className='restaurant-card__row-affordance'>导航</Text>
        </View>
      )}
      {phone && (
        <View
          className='restaurant-card__row restaurant-card__row--tap'
          onClick={() => onCall(phone)}
        >
          <Text className='restaurant-card__row-text'>📞 {phone}</Text>
          <Text className='restaurant-card__row-affordance'>拨打</Text>
        </View>
      )}

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
          <Button
            className='restaurant-card__btn restaurant-card__btn--gold'
            onClick={onOpenMeituan}
          >
            去美团看看
          </Button>
        ) : (
          <>
            <Button
              className='restaurant-card__btn restaurant-card__btn--ghost'
              onClick={onRespin}
            >
              换一家
            </Button>
            <Button
              className='restaurant-card__btn restaurant-card__btn--primary'
              onClick={onAccept}
            >
              就这家
            </Button>
          </>
        )}
      </View>
    </View>
  )
}
