import { View, Text, Picker, Switch } from '@tarojs/components'
import type { Constraint, Cuisine, DistanceKm } from '../../engine'
import { CUISINES, CUISINE_LABELS } from '../../engine'
import './index.css'

export interface ConstraintSelectorProps {
  constraint: Constraint
  onChange: (constraint: Constraint) => void
}

const DISTANCE_OPTIONS: DistanceKm[] = [1, 3, 5]

// '不限' (any) is the first picker option; specific cuisines follow.
const CUISINE_LABEL_LIST = ['不限', ...CUISINES.map((c) => CUISINE_LABELS[c])]

export default function ConstraintSelector({ constraint, onChange }: ConstraintSelectorProps) {
  // 'any' → index 0; a specific cuisine → its CUISINES index + 1.
  const cuisineValue = constraint.cuisine === 'any' ? 0 : CUISINES.indexOf(constraint.cuisine) + 1

  return (
    <View className='constraint-selector'>
      <View className='constraint-selector__row'>
        <Text className='constraint-selector__label'>距离</Text>
        <View className='constraint-selector__pills'>
          {DISTANCE_OPTIONS.map((d) => (
            <View
              key={d}
              className={`constraint-selector__pill ${constraint.distanceKm === d ? 'is-active' : ''}`}
              onClick={() => onChange({ ...constraint, distanceKm: d })}
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
            onChange({ ...constraint, cuisine })
          }}
        >
          <View className='constraint-selector__picker'>{CUISINE_LABEL_LIST[cuisineValue]}</View>
        </Picker>
      </View>

      <View className='constraint-selector__row'>
        <Text className='constraint-selector__label'>营业中</Text>
        <Switch
          checked={constraint.openOnly}
          onChange={(e) => onChange({ ...constraint, openOnly: e.detail.value })}
        />
      </View>
    </View>
  )
}
