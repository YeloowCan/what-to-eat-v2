import type { Cuisine } from './types'

/** Cuisines offered in the constraint selector (excludes `any`). */
export const CUISINES: Cuisine[] = [
  'hotpot',
  'sichuan',
  'cantonese',
  'fastfood',
  'japanese',
  'korean',
  'bbq',
  'noodle',
  'western',
  'seafood',
  'snack',
  'dessert',
]

/** Display labels (zh-CN) for every cuisine, including `any`. */
export const CUISINE_LABELS: Record<Cuisine, string> = {
  any: '不限',
  hotpot: '火锅',
  sichuan: '川菜',
  cantonese: '粤菜',
  fastfood: '快餐',
  japanese: '日料',
  korean: '韩餐',
  bbq: '烧烤',
  noodle: '面食',
  western: '西餐',
  seafood: '海鲜',
  snack: '小吃',
  dessert: '甜品饮品',
}
