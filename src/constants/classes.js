// Классы персонажей — оригинальная система.
// Каждый класс даёт бонусы к производным характеристикам, растущие с уровнем.
// Формула бонуса: floor(level × множитель)

export const CLASSES = [
  {
    id: 'warden',
    label: 'Страж',
    hint: 'Танк: +защита, +HP',
    // Бонусы к производным: ключ → множитель от уровня
    perLevel: { defense: 0.5, maxHp: 2 },
  },
  {
    id: 'striker',
    label: 'Разящий',
    hint: 'Ближний бой: +урон, +шанс крита',
    perLevel: { damage: 0.4, critChance: 0.3 },
  },
  {
    id: 'shadow',
    label: 'Тень',
    hint: 'Ловкач: +уклонение, +инициатива',
    perLevel: { evasion: 0.5, initiative: 0.3 },
  },
  {
    id: 'arcanist',
    label: 'Арканист',
    hint: 'Маг: +маг. сила, +сопротивление',
    perLevel: { magicPower: 0.5, resistance: 0.3 },
  },
  {
    id: 'herald',
    label: 'Вестник',
    hint: 'Дипломат: +убеждение, +инициатива',
    perLevel: { persuasion: 0.5, initiative: 0.3 },
  },
  {
    id: 'predator',
    label: 'Хищник',
    hint: 'Охотник: +урон, +уклонение',
    perLevel: { damage: 0.3, evasion: 0.4 },
  },
  {
    id: 'bulwark',
    label: 'Оплот',
    hint: 'Паладин: +защита, +сопротивление, +убеждение',
    perLevel: { defense: 0.3, resistance: 0.3, persuasion: 0.2 },
  },
  {
    id: 'hexblade',
    label: 'Клинок Порчи',
    hint: 'Боевой маг: +урон, +маг. сила',
    perLevel: { damage: 0.3, magicPower: 0.4 },
  },
]

/**
 * Рассчитывает бонусы класса для конкретного уровня.
 * @param {string} classId
 * @param {number} level
 * @returns {Record<string, number>} — ключ производной → бонус
 */
export function getClassBonuses(classId, level) {
  const cls = CLASSES.find((c) => c.id === classId)
  if (!cls) return {}
  const result = {}
  for (const [key, mult] of Object.entries(cls.perLevel)) {
    result[key] = Math.floor(level * mult)
  }
  return result
}

export function getClassById(id) {
  return CLASSES.find((c) => c.id === id) ?? null
}
