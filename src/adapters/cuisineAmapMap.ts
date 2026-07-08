import type { Cuisine } from '../engine/types'

// Amap POI type codes — the 餐饮服务 (050000) family. Used by the POI source
// adapter to translate a Cuisine into the `types` param of Amap's around-POI
// search, and to reverse-map a returned POI's typecode back to a Cuisine.
//
// ⚠ VERIFY against the official Amap POI type table before relying on these at
// runtime: https://lbs.amap.com/api/webservice/download  Several sub-codes
// (bbq / noodle / seafood) are approximate because Amap has no exact match;
// the engine filters by Cuisine so an unknown typecode falls back to 'any'.
export const CUISINE_TO_AMAP_TYPE: Record<Cuisine, string> = {
  any: '050000',
  hotpot: '050400',
  sichuan: '050301',
  cantonese: '050303',
  fastfood: '050100',
  japanese: '050501',
  korean: '050502',
  bbq: '050700',
  noodle: '050300',
  western: '050500',
  seafood: '050304',
  snack: '050701',
  dessert: '050900',
}

/** Reverse map: Amap typecode → Cuisine (unknown codes fall back to 'any'). */
export const AMAP_TYPE_TO_CUISINE: Record<string, Cuisine> = Object.fromEntries(
  Object.entries(CUISINE_TO_AMAP_TYPE)
    .filter(([cuisine]) => cuisine !== 'any')
    .map(([cuisine, code]) => [code, cuisine as Cuisine]),
)
