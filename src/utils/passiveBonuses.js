// ─── Пассивные бонусы способностей ────────────────────────────────
// Карта: abilityId → { derived: { statKey: number }, primary: { statKey: number } }
// Пополняется по мере реализации пассивных способностей по чеклисту.
// derived — бонус к производной характеристике (evasion, block, perception…)
// primary — бонус к первичному стату (strength, agility…)

import { normalizePassiveAbilityIds } from './passiveAbilities'

export const PASSIVE_BONUS_MAP = {
  dodge_roll: { derived: { evasion: 2 } },
  mana_sense: { derived: { perception: 2 } },
}

/**
 * Суммирует пассивные бонусы к производной характеристике.
 * @param {Array<string|Object>} passiveAbilities — массив ID или ability-объектов
 * @param {string}   statKey          — ключ стата (например 'evasion')
 * @returns {number}
 */
export function getPassiveDerivedBonus(passiveAbilities = [], statKey) {
  let total = 0
  for (const id of normalizePassiveAbilityIds(passiveAbilities)) {
    total += PASSIVE_BONUS_MAP[id]?.derived?.[statKey] ?? 0
  }
  return total
}

/**
 * Суммирует пассивные бонусы к первичной характеристике.
 * @param {Array<string|Object>} passiveAbilities — массив ID или ability-объектов
 * @param {string}   statKey          — ключ стата ('strength', 'agility' и т.д.)
 * @returns {number}
 */
export function getPassivePrimaryBonus(passiveAbilities = [], statKey) {
  let total = 0
  for (const id of normalizePassiveAbilityIds(passiveAbilities)) {
    total += PASSIVE_BONUS_MAP[id]?.primary?.[statKey] ?? 0
  }
  return total
}
