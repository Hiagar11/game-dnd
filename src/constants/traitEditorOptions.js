export const TRAIT_CATEGORIES = [
  { value: 'fire', label: '🔥 Огонь' },
  { value: 'earth', label: '⛰️ Земля' },
  { value: 'water', label: '💧 Вода' },
  { value: 'air', label: '🌬️ Воздух' },
]

export const TRAIT_STATS = [
  { value: 'strength', label: 'Сила' },
  { value: 'agility', label: 'Ловкость' },
  { value: 'intellect', label: 'Интеллект' },
  { value: 'charisma', label: 'Харизма' },
  { value: 'damage', label: 'Урон' },
  { value: 'critChance', label: 'Шанс удара' },
  { value: 'evasion', label: 'Уклонение' },
  { value: 'initiative', label: 'Инициатива' },
  { value: 'magicResist', label: 'Маг. сопр.' },
  { value: 'perception', label: 'Восприятие' },
  { value: 'persuasion', label: 'Убеждение' },
  { value: 'deception', label: 'Обман' },
  { value: 'block', label: 'Блок' },
  { value: 'critDamage', label: 'Крит. урон' },
  { value: 'armorPen', label: 'Проб. брони' },
  { value: 'magicPen', label: 'Проб. маг.' },
  { value: 'luck', label: 'Удача' },
  { value: 'stealth', label: 'Скрытность' },
  { value: 'healing', label: 'Лечение' },
]

export const DEFAULT_TRAIT_FORM = {
  name: '',
  category: 'fire',
  icon: '',
  mods: [{ stat: '', value: 0 }],
}
