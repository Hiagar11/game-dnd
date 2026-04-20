/**
 * Базовые типы предметов по слотам (PoE-стиль).
 * Каждый base имеет: name, slot, icon, implicit (встроенный модификатор, опционально).
 * Оружие дополнительно имеет baseDamage — диапазон урона при ilvl 1.
 * Броня дополнительно имеет baseArmor — поглощение урона при ilvl 1.
 * При генерации baseDamage / baseArmor масштабируется по ilvl.
 */

/** Слоты, считающиеся оружием (имеют baseDamage). */
export const WEAPON_SLOTS = new Set(['weapon', 'two_handed', 'ranged', 'magic_weapon'])

export const ITEM_BASES = [
  // ── Оружие (одноручное) ────────────────────
  {
    name: 'Ржавый меч',
    slot: 'weapon',
    icon: 'gladius',
    baseDamage: { min: 1, max: 3 },
    implicit: null,
  },
  {
    name: 'Стальной меч',
    slot: 'weapon',
    icon: 'broadsword',
    baseDamage: { min: 2, max: 4 },
    implicit: null,
  },
  {
    name: 'Мифриловый клинок',
    slot: 'weapon',
    icon: 'pointy-sword',
    baseDamage: { min: 3, max: 5 },
    implicit: null,
  },
  {
    name: 'Кинжал',
    slot: 'weapon',
    icon: 'stiletto',
    baseDamage: { min: 1, max: 2 },
    implicit: { stat: 'hit_chance', min: 2, max: 4 },
  },
  {
    name: 'Боевой топор',
    slot: 'weapon',
    icon: 'battle-axe',
    baseDamage: { min: 2, max: 5 },
    implicit: null,
  },

  // ── Двуручное оружие ───────────────────────
  {
    name: 'Двуручный меч',
    slot: 'two_handed',
    icon: 'two-handed-sword',
    baseDamage: { min: 3, max: 7 },
    apCost: 2,
    implicit: null,
  },
  {
    name: 'Секира',
    slot: 'two_handed',
    icon: 'sharp-axe',
    baseDamage: { min: 4, max: 8 },
    apCost: 2,
    implicit: null,
  },
  {
    name: 'Боевой молот',
    slot: 'two_handed',
    icon: 'warhammer',
    baseDamage: { min: 5, max: 9 },
    apCost: 2,
    implicit: null,
  },

  // ── Дальнобойное ───────────────────────────
  {
    name: 'Короткий лук',
    slot: 'ranged',
    icon: 'pocket-bow',
    baseDamage: { min: 1, max: 3 },
    apCost: 2,
    implicit: { stat: 'hit_chance', min: 2, max: 4 },
  },
  {
    name: 'Длинный лук',
    slot: 'ranged',
    icon: 'high-shot',
    baseDamage: { min: 2, max: 5 },
    apCost: 2,
    implicit: { stat: 'hit_chance', min: 3, max: 6 },
  },
  {
    name: 'Арбалет',
    slot: 'ranged',
    icon: 'crossbow',
    baseDamage: { min: 3, max: 5 },
    apCost: 2,
    implicit: null,
  },

  // ── Магическое оружие ──────────────────────
  {
    name: 'Ученический посох',
    slot: 'magic_weapon',
    icon: 'wizard-staff',
    baseDamage: { min: 1, max: 3 },
    implicit: { stat: 'perception', min: 1, max: 3 },
  },
  {
    name: 'Рунный жезл',
    slot: 'magic_weapon',
    icon: 'crystal-wand',
    baseDamage: { min: 2, max: 4 },
    implicit: { stat: 'perception', min: 3, max: 5 },
  },
  {
    name: 'Кристальный посох',
    slot: 'magic_weapon',
    icon: 'orb-wand',
    baseDamage: { min: 3, max: 5 },
    implicit: { stat: 'perception', min: 4, max: 7 },
  },

  // ── Шлемы ──────────────────────────────────
  {
    name: 'Кожаный шлем',
    slot: 'helmet',
    icon: 'hood',
    baseArmor: 1,
    implicit: { stat: 'perception', min: 1, max: 2 },
  },
  {
    name: 'Железный шлем',
    slot: 'helmet',
    icon: 'visored-helm',
    baseArmor: 2,
    implicit: { stat: 'block', min: 1, max: 3 },
  },
  {
    name: 'Рыцарский шлем',
    slot: 'helmet',
    icon: 'barbute',
    baseArmor: 3,
    implicit: { stat: 'block', min: 2, max: 4 },
  },

  // ── Броня ──────────────────────────────────
  {
    name: 'Стёганка',
    slot: 'armor',
    icon: 'leather-vest',
    implicit: { stat: 'dodge', min: 1, max: 3 },
  },
  {
    name: 'Кольчуга',
    slot: 'armor',
    icon: 'chain-mail',
    implicit: { stat: 'block', min: 2, max: 4 },
  },
  {
    name: 'Латный доспех',
    slot: 'armor',
    icon: 'breastplate',
    implicit: { stat: 'block', min: 3, max: 6 },
  },
  {
    name: 'Мантия мага',
    slot: 'armor',
    icon: 'robe',
    implicit: { stat: 'magic_resist', min: 2, max: 4 },
  },

  // ── Щиты ───────────────────────────────────
  {
    name: 'Деревянный щит',
    slot: 'offhand',
    icon: 'round-shield',
    baseArmor: 2,
    implicit: { stat: 'block', min: 1, max: 2 },
  },
  {
    name: 'Стальной щит',
    slot: 'offhand',
    icon: 'shield',
    baseArmor: 4,
    implicit: { stat: 'block', min: 2, max: 4 },
  },
  {
    name: 'Магический фокус',
    slot: 'offhand',
    icon: 'crystal-ball',
    implicit: { stat: 'magic_pen', min: 2, max: 4 },
  },

  // ── Перчатки ───────────────────────────────
  {
    name: 'Кожаные перчатки',
    slot: 'gloves',
    icon: 'gloves',
    baseArmor: 1,
    implicit: { stat: 'hit_chance', min: 1, max: 2 },
  },
  {
    name: 'Латные рукавицы',
    slot: 'gloves',
    icon: 'gauntlet',
    baseArmor: 2,
    implicit: { stat: 'armor_pen', min: 1, max: 2 },
  },

  // ── Пояс ───────────────────────────────────
  {
    name: 'Кожаный пояс',
    slot: 'belt',
    icon: 'belt',
    baseArmor: 0,
    implicit: { stat: 'luck', min: 1, max: 2 },
  },
  {
    name: 'Тяжёлый пояс',
    slot: 'belt',
    icon: 'belt-armor',
    baseArmor: 1,
    implicit: { stat: 'block', min: 1, max: 2 },
  },

  // ── Поножи ─────────────────────────────────
  {
    name: 'Кожаные наголенники',
    slot: 'legs',
    icon: 'leg-armor',
    baseArmor: 1,
    implicit: { stat: 'dodge', min: 1, max: 2 },
  },
  {
    name: 'Латные поножи',
    slot: 'legs',
    icon: 'armored-pants',
    baseArmor: 3,
    implicit: { stat: 'block', min: 1, max: 2 },
  },

  // ── Обувь ──────────────────────────────────
  {
    name: 'Кожаные сапоги',
    slot: 'boots',
    icon: 'boots',
    baseArmor: 1,
    implicit: { stat: 'initiative', min: 1, max: 2 },
  },
  {
    name: 'Латные сапоги',
    slot: 'boots',
    icon: 'metal-boot',
    baseArmor: 2,
    implicit: { stat: 'block', min: 1, max: 2 },
  },
  {
    name: 'Мокасины ловкача',
    slot: 'boots',
    icon: 'wingfoot',
    baseArmor: 0,
    implicit: { stat: 'stealth', min: 2, max: 4 },
  },

  // ── Плащ ───────────────────────────────────
  {
    name: 'Холщовый плащ',
    slot: 'cloak',
    icon: 'cape',
    implicit: { stat: 'magic_resist', min: 1, max: 2 },
  },
  {
    name: 'Плащ теней',
    slot: 'cloak',
    icon: 'hooded-figure',
    implicit: { stat: 'stealth', min: 2, max: 4 },
  },

  // ── Амулет ─────────────────────────────────
  {
    name: 'Костяной амулет',
    slot: 'amulet',
    icon: 'gem-pendant',
    implicit: { stat: 'magic_resist', min: 1, max: 2 },
  },
  {
    name: 'Рубиновый амулет',
    slot: 'amulet',
    icon: 'necklace',
    implicit: { stat: 'crit_damage', min: 1, max: 3 },
  },
  {
    name: 'Сапфировый амулет',
    slot: 'amulet',
    icon: 'gem-necklace',
    implicit: { stat: 'healing', min: 2, max: 4 },
  },

  // ── Кольцо ─────────────────────────────────
  {
    name: 'Железное кольцо',
    slot: 'ring',
    icon: 'ring',
    implicit: { stat: 'damage', min: 1, max: 2 },
  },
  {
    name: 'Золотое кольцо',
    slot: 'ring',
    icon: 'diamond-ring',
    implicit: { stat: 'luck', min: 1, max: 3 },
  },
  {
    name: 'Сапфировое кольцо',
    slot: 'ring',
    icon: 'emerald',
    implicit: { stat: 'magic_pen', min: 1, max: 3 },
  },
]

/**
 * Базовые типы по слоту.
 */
export function basesForSlot(slot) {
  return ITEM_BASES.filter((b) => b.slot === slot)
}
