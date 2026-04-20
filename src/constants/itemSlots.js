/**
 * Категории (слоты) предметов для контекстного меню размещения.
 * label — название для UI, icon — slug из game-icons (Iconify).
 */

export const ITEM_SLOT_LABELS = {
  weapon: 'Оружие',
  two_handed: 'Двуручное',
  ranged: 'Дальнобойное',
  magic_weapon: 'Маг. оружие',
  helmet: 'Шлем',
  armor: 'Броня',
  offhand: 'Щит / Фокус',
  gloves: 'Перчатки',
  boots: 'Обувь',
  legs: 'Ноги',
  belt: 'Пояс',
  cloak: 'Плащ',
  amulet: 'Амулет',
  ring: 'Кольцо',
}

export const ITEM_SLOT_ICONS = {
  weapon: 'broadsword',
  two_handed: 'two-handed-sword',
  ranged: 'pocket-bow',
  magic_weapon: 'wizard-staff',
  helmet: 'visored-helm',
  armor: 'breastplate',
  offhand: 'round-shield',
  gloves: 'gauntlet',
  boots: 'boots',
  legs: 'leg-armor',
  belt: 'belt',
  cloak: 'cape',
  amulet: 'gem-pendant',
  ring: 'ring',
}

export const ITEM_SLOTS = Object.keys(ITEM_SLOT_LABELS)

// Системные предметы (не генерируются через lootGenerator)
export const SYSTEM_ITEMS = {
  key: {
    id: 'key',
    name: 'Ключ',
    icon: 'key',
    slot: 'key',
    rarityColor: '#f59e0b',
  },
}
