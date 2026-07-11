import { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import { acceptSuggestion, pickSuggestion, DEFAULT_CONSTRAINT } from '../../engine'
import type { Constraint, GeoPoint, Restaurant, Suggestion } from '../../engine'
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

const FIRST_SPIN_MS = 2500
/** Respin (换一家 / constraint change) is faster than the first spin - 连抽不拖,
 * still fate, just brisker (ADR-0004 / PRD user story 7). */
const RESPIN_MS = 1200
/** Fewer candidates than this and the wheel is skipped - spinning one option is a
 * notice, not fate (ADR-0004). */
const SKIP_WHEEL_MIN = 4

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
        <Button className='spin__message-btn' onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </View>
  )
}

/** Lightweight gold pulse for the locating / picking waits (ticket 06) - warm
 * ambiance in the reserved gold, not the bare gray "正在定位…" of before. */
function Pulse() {
  return (
    <View className='spin__pulse'>
      <View className='spin__pulse-dot' />
      <View className='spin__pulse-dot' />
      <View className='spin__pulse-dot' />
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
  const [wheelPool, setWheelPool] = useState<Restaurant[] | null>(null)
  const [winnerPoiId, setWinnerPoiId] = useState<string>('')
  const [spinKey, setSpinKey] = useState(0)
  const [spinDuration, setSpinDuration] = useState(FIRST_SPIN_MS)
  // Stale-result guard: each spin gets a token; a result is applied only if no
  // newer spin superseded it. Lets respin / constraint-change overlap an in-flight
  // fetch without flashing a stale pick (ticket 04 no-flicker handoff).
  const spinToken = useRef(0)

  /**
   * Run one fate draw. `clearFirst` distinguishes the bootstrap spin (nothing on
   * screen yet -> clear to the picking placeholder) from a respin (keep the
   * current card/wheel on screen during fetch, then swap in one render so there's
   * no blank flicker - 卡片出 -> 转盘回 -> 快转 -> 落定 -> 卡片涌).
   */
  async function spin(loc: GeoPoint, c: Constraint, durationMs: number, clearFirst: boolean) {
    const token = ++spinToken.current
    setSpinDuration(durationMs)
    if (clearFirst) {
      setPhase({ kind: 'spinning' })
      setAccepted(false)
      setSuggestion(null)
      setWheelPool(null)
    }
    try {
      const cooldownPoiIds = await deps.store.getCooldownPoiIds()
      const result = await pickSuggestion({
        location: loc,
        constraint: c,
        cooldownPoiIds,
        poiSource: deps.poiSource,
        rng: deps.rng,
      })
      if (token !== spinToken.current) return // a newer spin superseded this one
      if (result.kind === 'suggestion') {
        setSuggestion(result.suggestion)
        setWinnerPoiId(result.suggestion.restaurant.poiId)
        setAccepted(false)
        if (result.wheelPool.length < SKIP_WHEEL_MIN) {
          // Too few candidates to be worth a wheel - reveal the card directly.
          setWheelPool(null)
          setPhase({ kind: 'suggestion' })
        } else {
          // Hand the real candidates to the wheel; bump spinKey so it remounts
          // and re-spins to the new winner. Phase stays 'spinning' so showWheel
          // holds - the wheel owns the stage until it reveals the card itself.
          setWheelPool(result.wheelPool)
          setSpinKey((k) => k + 1)
          setPhase({ kind: 'spinning' })
        }
      } else {
        setPhase({ kind: 'needsRelaxCuisine' })
      }
    } catch {
      if (token !== spinToken.current) return
      setPhase({ kind: 'error' })
    }
  }

  async function locate() {
    setPhase({ kind: 'locating' })
    try {
      const loc = await deps.location.getCurrent()
      setLocation(loc)
      await spin(loc, constraint, FIRST_SPIN_MS, true)
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
    if (location) void spin(location, constraint, RESPIN_MS, false)
  }

  function handleConstraintChange(c: Constraint) {
    setConstraint(c)
    if (location) void spin(location, c, RESPIN_MS, false)
  }

  async function handleAccept() {
    if (!suggestion) return
    try {
      // Cooldown is re-derived by the store from history, so the returned
      // cooldownPoiIds is not consumed here - no need to fetch prior cooldown.
      const { decision } = acceptSuggestion({ suggestion, clock: deps.clock })
      await deps.store.saveDecision(decision)
      setAccepted(true)
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

  function renderCard(goldAccent = false) {
    if (!suggestion) return null
    return (
      <RestaurantCard
        suggestion={suggestion}
        accepted={accepted}
        onAccept={handleAccept}
        onRespin={handleRespin}
        onOpenMeituan={handleOpenMeituan}
        goldAccent={goldAccent}
      />
    )
  }

  const showWheel = phase.kind === 'spinning' && wheelPool != null && wheelPool.length >= SKIP_WHEEL_MIN

  if (phase.kind === 'denied') {
    return <PermissionGate onRetry={locate} />
  }

  if (phase.kind === 'locating') {
    return (
      <View className='spin spin--loading'>
        <Pulse />
        <Text className='spin__loading-text'>正在定位…</Text>
      </View>
    )
  }

  return (
    <View className='spin'>
      <View className='spin__topbar'>
        <ConstraintSelector constraint={constraint} onChange={handleConstraintChange} />
        <View className='spin__history-icon' onClick={goHistory} />
      </View>

      <View className='spin__stage'>
        {phase.kind === 'locFailed' && (
          <MessageView
            title='定位失败'
            desc='检查一下定位是否开启，再重试'
            actionLabel='重试'
            onAction={locate}
          />
        )}

        {showWheel && (
          <Wheel
            key={spinKey}
            wheelPool={wheelPool!}
            winnerPoiId={winnerPoiId}
            durationMs={spinDuration}
          >
            {renderCard(true)}
          </Wheel>
        )}

        {phase.kind === 'spinning' && !showWheel && (
          <View className='spin__picking'>
            <Pulse />
            <Text className='spin__loading-text'>正在为你挑选…</Text>
          </View>
        )}

        {phase.kind === 'suggestion' && <View className='spin__card'>{renderCard()}</View>}

        {phase.kind === 'needsRelaxCuisine' && (
          // No "re-spin" button: re-running with the same exhausted constraint
          // would just return needsRelaxCuisine again. The user changes the
          // constraint via the chip above, which auto-spins on change.
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
    </View>
  )
}
