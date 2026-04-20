/**
 * Система редкости предметов (PoE-стиль).
 *
 * normal  — серый: базовый предмет, только implicit
 * magic   — синий: 1-2 аффикса (1 prefix + 1 suffix)
 * rare    — жёлтый: 3-4 аффикса (до 2 prefix + 2 suffix)
 * relic   — бордовый: 4 аффикса + один удвоенный + один проклятый
 */

export const RARITIES = ['normal', 'magic', 'rare', 'relic']

export const RARITY_COLORS = {
  normal: '#9d9d9d',
  magic: '#4fc3f7',
  rare: '#ffd700',
  relic: '#8b0000',
}

export const RARITY_LABELS = {
  normal: 'Обычный',
  magic: 'Магический',
  rare: 'Редкий',
  relic: 'Реликвия',
}

/**
 * Веса выпадения по профилю слотов.
 * Профиль определяет, как часто выпадает каждая редкость.
 */
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

export const RARITY_WEIGHTS_BY_PROFILE = {
  weapon: [
    { rarity: 'normal', weight: 45 },
    { rarity: 'magic', weight: 35 },
    { rarity: 'rare', weight: 16 },
    { rarity: 'relic', weight: 4 },
  ],
  armor: [
    { rarity: 'normal', weight: 45 },
    { rarity: 'magic', weight: 35 },
    { rarity: 'rare', weight: 16 },
    { rarity: 'relic', weight: 4 },
  ],
  accessory: [
    { rarity: 'normal', weight: 50 },
    { rarity: 'magic', weight: 32 },
    { rarity: 'rare', weight: 14 },
    { rarity: 'relic', weight: 4 },
  ],
  other: [
    { rarity: 'normal', weight: 55 },
    { rarity: 'magic', weight: 28 },
    { rarity: 'rare', weight: 13 },
    { rarity: 'relic', weight: 4 },
  ],
}
