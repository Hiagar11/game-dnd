export const TRAIT_CATEGORIES = [
  { value: 'passive', label: '🔵 Пассивное' },
  { value: 'active', label: '⚡ Активное' },
  { value: 'status', label: '☠️ Статус-эффект' },
  { value: 'racial', label: '🧝 Расовое' },
  { value: 'class', label: '⚔️ Классовое' },
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
  category: 'passive',
  icon: '',
  mods: [{ stat: '', value: 0 }],
}
