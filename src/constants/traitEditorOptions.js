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
  { value: 'defense', label: 'Защита' },
  { value: 'evasion', label: 'Уклонение' },
  { value: 'initiative', label: 'Инициатива' },
  { value: 'resistance', label: 'Сопротивление' },
  { value: 'magicPower', label: 'Маг. сила' },
  { value: 'persuasion', label: 'Убеждение' },
]

export const DEFAULT_TRAIT_FORM = {
  name: '',
  category: 'fire',
  icon: '',
  mods: [{ stat: '', value: 0 }],
}
