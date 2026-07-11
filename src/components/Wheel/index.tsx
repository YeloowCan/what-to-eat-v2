import { useEffect, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { View, Text } from '@tarojs/components'
import type { Restaurant } from '../../engine'
import './index.css'

export interface WheelProps {
  /** Real candidate restaurants, one per sector (>= 4; the caller skips the wheel below that). */
  wheelPool: Restaurant[]
  /** poiId of the winner - the sector the wheel decelerates to. */
  winnerPoiId: string
  /** Deceleration duration in ms (~2500 first spin, ~1200 respin). */
  durationMs: number
}

const FULL_TURNS = 5
const GOLD_FLASH_MS = 400
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

type Phase = 'spinning' | 'landed' | 'revealed'

/** Sector label: first few chars of the name, enough to tell sectors apart. */
function truncate(name: string, max = 4): string {
  return name.length > max ? `${name.slice(0, max)}…` : name
}

/**
 * 真转盘 (ADR-0004) - spins over the real candidate restaurants (wheelPool) and
 * decelerates to land on the winner. On land the winning sector flashes gold
 * (~400ms), then the card (children) emerges from the center as the dial fades.
 * The <4-candidate "skip wheel" case is the caller's; Wheel always gets >= 4.
 */
export default function Wheel({ wheelPool, winnerPoiId, durationMs, children }: PropsWithChildren<WheelProps>) {
  const n = wheelPool.length
  const sectorAngle = 360 / n
  const winnerIndex = Math.max(0, wheelPool.findIndex((r) => r.poiId === winnerPoiId))
  const winnerCenter = winnerIndex * sectorAngle + sectorAngle / 2
  // Rotate clockwise so the winner's sector centre meets the top pointer. The
  // full turns make it a spin, not a twitch.
  const targetRotation = FULL_TURNS * 360 - winnerCenter

  const [started, setStarted] = useState(false)
  const [phase, setPhase] = useState<Phase>('spinning')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // Render at rotation 0 first, then (after paint) advance to the target so the
  // CSS transition fires the deceleration. A fallback timer forces `land` even
  // if onTransitionEnd doesn't fire (mini-program transition events can be mute).
  useEffect(() => {
    const start = setTimeout(() => setStarted(true), 60)
    const fallback = setTimeout(land, durationMs + 200)
    timers.current.push(start, fallback)
    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function land() {
    setPhase((p) => (p === 'spinning' ? 'landed' : p))
  }

  useEffect(() => {
    if (phase !== 'landed') return
    const t = setTimeout(() => setPhase('revealed'), GOLD_FLASH_MS)
    timers.current.push(t)
  }, [phase])

  const rotation = started ? targetRotation : 0
  const isWinner = (i: number) => phase !== 'spinning' && i === winnerIndex
  const sectorColor = (i: number) =>
    isWinner(i) ? 'var(--color-gold)' : i % 2 === 0 ? 'var(--color-primary)' : 'var(--color-primary-dark)'
  const labelColor = (i: number) => (isWinner(i) ? 'var(--color-text)' : 'var(--color-on-primary)')

  const gradient = `conic-gradient(${wheelPool
    .map(
      (_, i) =>
        `${sectorColor(i)} ${(i * sectorAngle).toFixed(2)}deg ${((i + 1) * sectorAngle).toFixed(2)}deg`,
    )
    .join(', ')})`

  return (
    <View className={`wheel wheel--${phase}`}>
      <View className='wheel__stage'>
        <View
          className='wheel__dial'
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: `transform ${durationMs}ms ${EASE}, opacity 280ms ease`,
            backgroundImage: gradient,
          }}
          onTransitionEnd={land}
        >
          {wheelPool.map((r, i) => (
            <View
              key={r.poiId}
              className='wheel__spoke'
              style={{ transform: `rotate(${(i * sectorAngle + sectorAngle / 2).toFixed(2)}deg)` }}
            >
              <Text className='wheel__spoke-name' style={{ color: labelColor(i) }}>
                {truncate(r.name)}
              </Text>
            </View>
          ))}
        </View>
        <View className='wheel__pointer' />
        {phase === 'revealed' && <View className='wheel__card'>{children}</View>}
      </View>
    </View>
  )
}
