import { useState } from 'react'
import { View, Text, Picker, Switch } from '@tarojs/components'
import type { Constraint, Cuisine, DistanceKm } from '../../engine'
import { CUISINES, CUISINE_LABELS } from '../../engine'
import './index.css'

export interface ConstraintSelectorProps {
  constraint: Constraint
  onChange: (constraint: Constraint) => void
}

const DISTANCE_OPTIONS: DistanceKm[] = [1, 3, 5]

function cuisineLabel(c: Cuisine): string {
  return c === 'any' ? '不限' : CUISINE_LABELS[c]
}

// '不限' (any) is the first picker option; specific cuisines follow. Derived
// from cuisineLabel so the '不限' literal lives in one place.
const CUISINE_LABEL_LIST = [cuisineLabel('any'), ...CUISINES.map((c) => CUISINE_LABELS[c])]

/**
 * 约束摘要 chip (ticket 06 / ADR-0004) - collapsed by default so the wheel owns
 * the stage; tap the chip to expand the full selector (距离 / 菜系 / 营业中) as a
 * dropdown over the stage. Any change commits and auto re-spins, then collapses
 * so the result is visible. Hard guards (营业中 / 菜系) are still user-only here.
 */
export default function ConstraintSelector({ constraint, onChange }: ConstraintSelectorProps) {
  const [open, setOpen] = useState(false)
  // 'any' -> index 0; a specific cuisine -> its CUISINES index + 1.
  const cuisineValue = constraint.cuisine === 'any' ? 0 : CUISINES.indexOf(constraint.cuisine) + 1
  const summary = `${constraint.distanceKm}km · ${cuisineLabel(constraint.cuisine)} · ${
    constraint.openOnly ? '营业中' : '不限营业'
  }`

  function emit(next: Constraint) {
    onChange(next)
    setOpen(false)
  }

  return (
    <View className='constraint-selector'>
      <View
        className={`constraint-selector__chip${open ? ' is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Text className='constraint-selector__chip-text'>{summary}</Text>
        <Text className='constraint-selector__chip-caret'>{open ? '▲' : '▼'}</Text>
      </View>

      {open && (
        <View className='constraint-selector__panel'>
          <View className='constraint-selector__row'>
            <Text className='constraint-selector__label'>距离</Text>
            <View className='constraint-selector__pills'>
              {DISTANCE_OPTIONS.map((d) => (
                <View
                  key={d}
                  className={`constraint-selector__pill ${constraint.distanceKm === d ? 'is-active' : ''}`}
                  onClick={() => emit({ ...constraint, distanceKm: d })}
                >
                  {d}km
                </View>
              ))}
            </View>
          </View>

          <View className='constraint-selector__row'>
            <Text className='constraint-selector__label'>菜系</Text>
            <Picker
              mode='selector'
              range={CUISINE_LABEL_LIST}
              value={cuisineValue}
              onChange={(e) => {
                const idx = Number(e.detail.value)
                const cuisine: Cuisine = idx === 0 ? 'any' : CUISINES[idx - 1]
                emit({ ...constraint, cuisine })
              }}
            >
              <View className='constraint-selector__picker'>{CUISINE_LABEL_LIST[cuisineValue]}</View>
            </Picker>
          </View>

          <View className='constraint-selector__row'>
            <Text className='constraint-selector__label'>营业中</Text>
            <Switch
              checked={constraint.openOnly}
              onChange={(e) => emit({ ...constraint, openOnly: e.detail.value })}
            />
          </View>
        </View>
      )}
    </View>
  )
}
