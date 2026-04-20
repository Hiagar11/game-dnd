/**
 * Пул аффиксов (PoE-стиль).
 *
 * Каждый аффикс: { name, type: 'prefix'|'suffix', stat, tiers }.
 * tiers — массив от T1 (слабый) до T3 (сильный), каждый { min, max, ilvl }.
 * ilvl — минимальный уровень предмета для доступа к этому тиру.
 *
 * При генерации: выбираем аффикс → выбираем макс. доступный тир по уровню → ролл min..max.
 */

export const AFFIXES = [
  // ═══ ПРЕФИКСЫ ═══════════════════════════════

  // ── Физический урон ────────────────────────
  {
    name: 'Острый',
    type: 'prefix',
    stat: 'damage',
    tags: ['physical'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 4, ilvl: 3 },
      { min: 4, max: 7, ilvl: 5 },
    ],
  },
  {
    name: 'Жестокий',
    type: 'prefix',
    stat: 'damage',
    tags: ['physical'],
    tiers: [
      { min: 2, max: 3, ilvl: 2 },
      { min: 4, max: 6, ilvl: 4 },
      { min: 6, max: 10, ilvl: 6 },
    ],
  },

  // ── Уклонение (префикс) ─────────────────────
  {
    name: 'Укреплённый',
    type: 'prefix',
    stat: 'dodge',
    tags: ['defense'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 4, ilvl: 3 },
      { min: 4, max: 6, ilvl: 5 },
    ],
  },

  // ── Блок (префикс) ─────────────────────────
  {
    name: 'Закалённый',
    type: 'prefix',
    stat: 'block',
    tags: ['defense'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 4, ilvl: 3 },
      { min: 4, max: 6, ilvl: 5 },
    ],
  },

  // ── Восприятие ────────────────────────────────
  {
    name: 'Чародейский',
    type: 'prefix',
    stat: 'perception',
    tags: ['caster'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 4, ilvl: 3 },
      { min: 4, max: 6, ilvl: 5 },
    ],
  },

  // ── Маг. сопротивление ────────────────────
  {
    name: 'Стойкий',
    type: 'prefix',
    stat: 'magic_resist',
    tags: ['defense'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 3, ilvl: 3 },
      { min: 3, max: 5, ilvl: 5 },
    ],
  },

  // ── Пробивание брони (префикс) ────────────
  {
    name: 'Пробивающий',
    type: 'prefix',
    stat: 'armor_pen',
    tags: ['attack'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 3, ilvl: 3 },
      { min: 3, max: 5, ilvl: 5 },
    ],
  },

  // ── Крит. урон (префикс) ──────────────────
  {
    name: 'Смертоносный',
    type: 'prefix',
    stat: 'crit_damage',
    tags: ['attack'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 4, ilvl: 3 },
      { min: 4, max: 6, ilvl: 5 },
    ],
  },

  // ── Скрытность (префикс) ──────────────────
  {
    name: 'Теневой',
    type: 'prefix',
    stat: 'stealth',
    tags: ['rogue'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 3, ilvl: 3 },
      { min: 3, max: 5, ilvl: 5 },
    ],
  },

  // ═══ СУФФИКСЫ ═══════════════════════════════

  // ── Шанс удара ─────────────────────────────
  {
    name: 'Меткости',
    type: 'suffix',
    stat: 'hit_chance',
    tags: ['attack'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 4, ilvl: 3 },
      { min: 4, max: 6, ilvl: 5 },
    ],
  },

  // ── Инициатива ─────────────────────────────
  {
    name: 'Скорости',
    type: 'suffix',
    stat: 'initiative',
    tags: ['speed'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 3, ilvl: 3 },
      { min: 3, max: 5, ilvl: 5 },
    ],
  },

  // ── Уклонение ──────────────────────────────
  {
    name: 'Уворота',
    type: 'suffix',
    stat: 'dodge',
    tags: ['defense', 'speed'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 3, ilvl: 3 },
      { min: 3, max: 5, ilvl: 5 },
    ],
  },

  // ── Убеждение ──────────────────────────────
  {
    name: 'Красноречия',
    type: 'suffix',
    stat: 'persuasion',
    tags: ['social'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 3, ilvl: 3 },
      { min: 3, max: 5, ilvl: 5 },
    ],
  },

  // ── Обман ──────────────────────────────────
  {
    name: 'Лукавства',
    type: 'suffix',
    stat: 'deception',
    tags: ['social'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 3, ilvl: 3 },
      { min: 3, max: 5, ilvl: 5 },
    ],
  },

  // ── Доп. блок ──────────────────────────
  {
    name: 'Защиты',
    type: 'suffix',
    stat: 'block',
    tags: ['defense'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 3, ilvl: 3 },
      { min: 3, max: 5, ilvl: 5 },
    ],
  },

  // ── Доп. маг. сопротивление ─────────────
  {
    name: 'Стихий',
    type: 'suffix',
    stat: 'magic_resist',
    tags: ['defense'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 3, ilvl: 3 },
      { min: 3, max: 4, ilvl: 5 },
    ],
  },

  // ── Восприятие (суффикс) ──────────────
  {
    name: 'Волшебства',
    type: 'suffix',
    stat: 'perception',
    tags: ['caster'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 3, ilvl: 3 },
      { min: 3, max: 5, ilvl: 5 },
    ],
  },

  // ── Удача (суффикс) ───────────────────
  {
    name: 'Удачи',
    type: 'suffix',
    stat: 'luck',
    tags: ['social'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 3, ilvl: 3 },
      { min: 3, max: 5, ilvl: 5 },
    ],
  },

  // ── Лечение (суффикс) ─────────────────
  {
    name: 'Исцеления',
    type: 'suffix',
    stat: 'healing',
    tags: ['caster', 'support'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 3, ilvl: 3 },
      { min: 3, max: 5, ilvl: 5 },
    ],
  },

  // ── Проб. маг. сопр. (суффикс) ────────
  {
    name: 'Проникновения',
    type: 'suffix',
    stat: 'magic_pen',
    tags: ['caster'],
    tiers: [
      { min: 1, max: 2, ilvl: 1 },
      { min: 2, max: 3, ilvl: 3 },
      { min: 3, max: 5, ilvl: 5 },
    ],
  },
]

/**
 * Максимальное число аффиксов по редкости (PoE-стиль):
 * normal=0, magic=1-2, rare=3-4, relic=4 + curse
 */
export const RARITY_AFFIX_COUNTS = {
  normal: { prefixes: 0, suffixes: 0 },
  magic: { prefixes: 1, suffixes: 1 },
  rare: { prefixes: 2, suffixes: 2 },
  relic: { prefixes: 2, suffixes: 2 },
}
