import type { Cuisine } from '../../engine/types'

// 菜系 -> 占位图 lookup (ADR-0005 / PRD 01). When a restaurant has no photo
// (Amap returned none, or the image failed to load) the card renders a
// cuisine-tinted placeholder so the user still feels the category (给一个就够
// 了, not a gallery). This is a static data table in the same spirit as
// cuisineAmapMap.ts - presentation data, not domain logic - so it lives beside
// the component that consumes it and is verified in Devtools (like the other
// adapter data tables).
//
// Asset-free: a recognisable food emoji per cuisine on a warm fortune-tinted
// panel (the panel's colours are design tokens in index.css, no raw hex). Swap
// these for real illustrations later without touching the card.
export const CUISINE_PLACEHOLDER: Record<Cuisine, { emoji: string }> = {
  any: { emoji: '🍽️' },
  hotpot: { emoji: '🍲' },
  sichuan: { emoji: '🌶️' },
  cantonese: { emoji: '🥡' },
  fastfood: { emoji: '🍔' },
  japanese: { emoji: '🍣' },
  korean: { emoji: '🍱' },
  bbq: { emoji: '🍢' },
  noodle: { emoji: '🍜' },
  western: { emoji: '🍝' },
  seafood: { emoji: '🦐' },
  snack: { emoji: '🥟' },
  dessert: { emoji: '🍰' },
}
