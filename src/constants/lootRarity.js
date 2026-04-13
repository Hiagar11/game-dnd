/**
 * Цвета редкости.
 * Ключ = кол-во позитивных свойств на предмете (1-3), 4 — бордовый (реликт).
 * 0 — предметы-шаблоны без свойств (зелья без трейтов).
 */
export const RARITY_COLORS = {
  0: '#c8a04a',
  1: '#ffffff',
  2: '#4fc3f7',
  3: '#ffd700',
  4: '#8b0000',
}

export const SLOT_RARITY_PROFILES = {
  weapon: 'weapon',
  two_handed: 'weapon',
  ranged: 'weapon',
  magic_weapon: 'weapon',
  helmet: 'armor',
  armor: 'armor',
  offhand: 'armor',
  gloves: 'armor',
  boots: 'armor',
  legs: 'armor',
  belt: 'accessory',
  cloak: 'accessory',
  amulet: 'accessory',
  ring: 'accessory',
  other: 'other',
}

/**
 * count: итоговая «ступень» редкости.
 *   1 → белый  (1 положительное свойство)
 *   2 → синий  (2 положительных свойства)
 *   3 → золотой (3 положительных свойства)
 *   4 → бордовый (3 положительных + 1 удвоенное + 1 отрицательное)
 */
export const RARITY_WEIGHTS_BY_PROFILE = {
  weapon: [
    { count: 1, weight: 60 },
    { count: 2, weight: 25 },
    { count: 3, weight: 10 },
    { count: 4, weight: 5 },
  ],
  armor: [
    { count: 1, weight: 60 },
    { count: 2, weight: 25 },
    { count: 3, weight: 10 },
    { count: 4, weight: 5 },
  ],
  accessory: [
    { count: 1, weight: 60 },
    { count: 2, weight: 25 },
    { count: 3, weight: 10 },
    { count: 4, weight: 5 },
  ],
  other: [
    { count: 1, weight: 60 },
    { count: 2, weight: 25 },
    { count: 3, weight: 10 },
    { count: 4, weight: 5 },
  ],
}
