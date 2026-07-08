import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import { acceptSuggestion, pickSuggestion, DEFAULT_CONSTRAINT } from '../../engine'
import type { Constraint, GeoPoint, Suggestion } from '../../engine'
import { getDeps } from '../../composition'
import { LocationDeniedError } from '../../adapters/wxLocation'
import Wheel from '../../components/Wheel'
import RestaurantCard from '../../components/RestaurantCard'
import ConstraintSelector from '../../components/ConstraintSelector'
import PermissionGate from '../../components/PermissionGate'
import './index.css'

type Phase =
  | { kind: 'locating' }
  | { kind: 'denied' }
  | { kind: 'locFailed' }
  | { kind: 'spinning' }
  | { kind: 'suggestion' }
  | { kind: 'needsRelaxCuisine' }
  | { kind: 'error' }

const MIN_SPIN_MS = 800
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

interface MessageViewProps {
  title: string
  desc: string
  actionLabel?: string
  onAction?: () => void
}

function MessageView({ title, desc, actionLabel, onAction }: MessageViewProps) {
  return (
    <View className='spin__message'>
      <Text className='spin__message-title'>{title}</Text>
      <Text className='spin__message-desc'>{desc}</Text>
      {actionLabel && onAction && (
        <Button type='primary' onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </View>
  )
}

export default function SpinPage() {
  const deps = getDeps()
  const [phase, setPhase] = useState<Phase>({ kind: 'locating' })
  const [location, setLocation] = useState<GeoPoint | null>(null)
  const [constraint, setConstraint] = useState<Constraint>(DEFAULT_CONSTRAINT)
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [accepted, setAccepted] = useState(false)

  async function spin(loc: GeoPoint, c: Constraint) {
    setPhase({ kind: 'spinning' })
    setAccepted(false)
    try {
      const cooldownPoiIds = await deps.store.getCooldownPoiIds()
      // Race the (network) pick against a minimum spin duration so the wheel
      // always has a beat of "fate" even on a fast fetch.
      const [result] = await Promise.all([
        pickSuggestion({
          location: loc,
          constraint: c,
          cooldownPoiIds,
          poiSource: deps.poiSource,
          rng: deps.rng,
        }),
        delay(MIN_SPIN_MS),
      ])
      if (result.kind === 'suggestion') {
        setSuggestion(result.suggestion)
        setPhase({ kind: 'suggestion' })
      } else {
        setSuggestion(null)
        setPhase({ kind: 'needsRelaxCuisine' })
      }
    } catch {
      setPhase({ kind: 'error' })
    }
  }

  async function locate() {
    setPhase({ kind: 'locating' })
    try {
      const loc = await deps.location.getCurrent()
      setLocation(loc)
      await spin(loc, constraint)
    } catch (e) {
      if (e instanceof LocationDeniedError) setPhase({ kind: 'denied' })
      else setPhase({ kind: 'locFailed' })
    }
  }

  // Bootstrap: acquire location and auto-spin on first mount. Constraints are
  // per-session and default-reset (DEFAULT_CONSTRAINT), so no persistence here.
  useEffect(() => {
    void locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleRespin() {
    if (location) void spin(location, constraint)
  }

  function handleConstraintChange(c: Constraint) {
    setConstraint(c)
    if (location) void spin(location, c)
  }

  async function handleAccept() {
    if (!suggestion) return
    try {
      // Cooldown is re-derived by the store from history, so the returned
      // cooldownPoiIds is not consumed here - no need to fetch prior cooldown.
      const { decision } = acceptSuggestion({ suggestion, clock: deps.clock })
      await deps.store.saveDecision(decision)
      setAccepted(true)
      Taro.showToast({ title: '就这家！', icon: 'success' })
    } catch {
      Taro.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  }

  async function handleOpenMeituan() {
    try {
      await deps.deepLink.openMeituan()
    } catch {
      Taro.showToast({ title: '跳转美团失败', icon: 'none' })
    }
  }

  function goHistory() {
    Taro.navigateTo({ url: '/pages/history/index' })
  }

  if (phase.kind === 'denied') {
    return <PermissionGate onRetry={locate} />
  }

  if (phase.kind === 'locating') {
    return (
      <View className='spin spin--loading'>
        <Text className='spin__loading-text'>正在定位…</Text>
      </View>
    )
  }

  return (
    <View className='spin'>
      <ConstraintSelector constraint={constraint} onChange={handleConstraintChange} />

      <View className='spin__stage'>
        {phase.kind === 'locFailed' && (
          <MessageView
            title='定位失败'
            desc='检查一下定位是否开启，再重试'
            actionLabel='重试'
            onAction={locate}
          />
        )}

        {phase.kind === 'spinning' && <Wheel spinning />}

        {phase.kind === 'suggestion' && suggestion && (
          <Wheel spinning={false}>
            <RestaurantCard
              suggestion={suggestion}
              accepted={accepted}
              onAccept={handleAccept}
              onRespin={handleRespin}
              onOpenMeituan={handleOpenMeituan}
            />
          </Wheel>
        )}

        {phase.kind === 'needsRelaxCuisine' && (
          // No "re-spin" button: re-running with the same exhausted constraint
          // would just return needsRelaxCuisine again. The user changes the
          // constraint via the selector above, which auto-spins on change.
          <MessageView title='没找到符合的餐厅' desc='试试上方放宽菜系，或换一档距离' />
        )}

        {phase.kind === 'error' && (
          <MessageView
            title='网络出错了'
            desc='拉取周边餐厅失败，请重试'
            actionLabel='重试'
            onAction={handleRespin}
          />
        )}
      </View>

      <View className='spin__footer'>
        <Button className='spin__history-btn' onClick={goHistory}>
          最近选过
        </Button>
      </View>
    </View>
  )
}
