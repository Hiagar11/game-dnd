// ─── Динамический класс персонажа ────────────────────────────────
// Генерируется на основе распределения характеристик.
// Использует тиры из системы графов способностей:
//   Тир 1: стат ≥ 3  |  Тир 2: ≥ 5  |  Тир 3: ≥ 7  |  Тир 4: ≥ 9
// Если активированы синергии (Тир S) — класс переименовывается в эпическое звание.

import { ABILITY_TREE } from './abilityTree'

// ── Синергетические классы (по id активированной синергии) ────────
// Если несколько синергий — побеждает первая найденная (по приоритету)
const SYNERGY_CLASSES = [
  // Кровавая магия + гравитация
  { id: 'blood_vortex', name: 'Жнец Пустоты', color: '#a855f7' },
  { id: 'gravity_storm', name: 'Владыка Сингулярности', color: '#7c3aed' },
  { id: 'blood_gravity_arrow', name: 'Гравимант', color: '#a855f7' },
  // Тени + гравитация
  { id: 'shadow_gravity', name: 'Теневой Коллапсар', color: '#7c3aed' },
  { id: 'warp_strike', name: 'Разрыватель Ткани', color: '#a855f7' },
  // Тени + ближний бой
  { id: 'phantom_strike', name: 'Клинок Сумрака', color: '#c4b5fd' },
  { id: 'gravitational_blade', name: 'Грависталкер', color: '#a855f7' },
  // Кровавое безумие (СИЛ + ИНТ)
  { id: 'blood_frenzy', name: 'Кровавый Апостол', color: '#dc2626' },
  // Крепость (СИЛ + ИНТ пассив)
  { id: 'immovable_fortress', name: 'Вечный Бастион', color: '#94a3b8' },
  // Кровавая поддержка
  { id: 'blood_transfusion', name: 'Жрец Алой Вены', color: '#dc2626' },
  { id: 'blood_pact', name: 'Кровосвязующий', color: '#dc2626' },
  // Лидерство
  { id: 'war_avatar', name: 'Аватар Войны', color: '#f59e0b' },
]

// ── Одностатовые архетипы (доминирующий стат) ────────────────────
const SINGLE = {
  strength: ['Крепыш', 'Молотобоец', 'Титан', 'Колосс'],
  agility: ['Пройдоха', 'Тень', 'Призрак', 'Фантом'],
  intellect: ['Книжник', 'Мистик', 'Архонт', 'Провидец'],
  charisma: ['Болтун', 'Оратор', 'Вестник', 'Владыка душ'],
}

// ── Двойные комбинации ───────────────────────────────────────────
const DUAL = {
  'strength+agility': ['Головорез', 'Берсерк', 'Вихрь клинков'],
  'strength+intellect': ['Рунный кузнец', 'Боевой маг', 'Страж Вечности'],
  'strength+charisma': ['Гладиатор', 'Военачальник', 'Железный лорд'],
  'agility+intellect': ['Ассасин', 'Теневой ткач', 'Клинок разума'],
  'agility+charisma': ['Трикстер', 'Шарлатан', 'Серебряный язык'],
  'intellect+charisma': ['Шёпот', 'Пророк', 'Оракул бездны'],
}

// ── Тройные комбинации ───────────────────────────────────────────
const TRIPLE = {
  'strength+agility+intellect': ['Адепт хаоса', 'Странник бурь'],
  'strength+agility+charisma': ['Завоеватель', 'Красный вожак'],
  'strength+intellect+charisma': ['Паладин', 'Хранитель клятв'],
  'agility+intellect+charisma': ['Серый кардинал', 'Кукловод'],
}

// ── Все четыре стата ─────────────────────────────────────────────
const QUAD = ['Универсал', 'Легендарный странник', 'Избранный']

// Пороги для определения «значимого» стата
const THRESHOLDS = [3, 5, 7, 9]

/**
 * Определяет класс персонажа по текущему распределению характеристик.
 * @param {{ strength: number, agility: number, intellect: number, charisma: number }} stats
 * @param {string[]} [activatedIds] — id активированных способностей из дерева
 * @returns {{ name: string, color: string, synergy: boolean }}
 */
export function getHeroClass(stats, activatedIds = []) {
  // Проверяем синергии (Тир S) — если есть, они перебивают обычный класс
  if (activatedIds.length > 0) {
    const activatedSet = new Set(activatedIds)
    const synergies = ABILITY_TREE.filter((a) => a.tier === 'S' && activatedSet.has(a.id))
    if (synergies.length > 0) {
      // Берём самую приоритетную синергию из нашего списка
      for (const entry of SYNERGY_CLASSES) {
        if (activatedSet.has(entry.id)) {
          return { name: entry.name, color: entry.color, synergy: true }
        }
      }
      // Синергия есть, но не в списке — общее эпическое имя
      return { name: 'Вестник Хаоса', color: '#d946ef', synergy: true }
    }
  }

  const s = stats.strength ?? 1
  const a = stats.agility ?? 1
  const i = stats.intellect ?? 1
  const c = stats.charisma ?? 1

  // Все по единице — Бомж
  if (s <= 1 && a <= 1 && i <= 1 && c <= 1) {
    return { name: 'Бомж', color: '#6b7280' }
  }

  // Определяем значимые статы (≥ 3) и их уровень прокачки
  const significant = []
  const statEntries = [
    { key: 'strength', val: s, color: '#ef4444' },
    { key: 'agility', val: a, color: '#22c55e' },
    { key: 'intellect', val: i, color: '#8b5cf6' },
    { key: 'charisma', val: c, color: '#eab308' },
  ]

  for (const entry of statEntries) {
    if (entry.val >= 3) significant.push(entry)
  }

  // Ни один стат не достиг 3 — начальный класс
  if (significant.length === 0) {
    // Находим максимальный стат для склонности
    const max = statEntries.reduce((best, e) => (e.val > best.val ? e : best), statEntries[0])
    return { name: 'Бродяга', color: max.color }
  }

  // Определяем тир прокачки (0-3) по порогам
  function getTier(val) {
    let tier = 0
    for (const t of THRESHOLDS) {
      if (val >= t) tier++
    }
    return tier
  }

  // Максимальный тир среди значимых статов
  const maxTier = Math.max(...significant.map((e) => getTier(e.val)))
  // Индекс имени в массиве (0-2/3)
  const nameIdx = Math.min(maxTier - 1, 2)

  // Сортируем значимые статы по убыванию значения
  significant.sort((x, y) => y.val - x.val)
  const keys = significant.map((e) => e.key)
  // Цвет = цвет доминирующего стата
  const dominantColor = significant[0].color

  if (significant.length === 1) {
    const names = SINGLE[keys[0]]
    return { name: names[Math.min(nameIdx, names.length - 1)], color: dominantColor }
  }

  if (significant.length === 2) {
    const comboKey = keys.sort().join('+')
    const names = DUAL[comboKey] ?? ['Искатель', 'Путник', 'Скиталец']
    return { name: names[Math.min(nameIdx, names.length - 1)], color: dominantColor }
  }

  if (significant.length === 3) {
    const comboKey = keys.sort().join('+')
    const names = TRIPLE[comboKey] ?? ['Адепт', 'Мастер']
    return { name: names[Math.min(nameIdx, names.length - 1)], color: dominantColor }
  }

  // Все 4 стата ≥ 3
  return { name: QUAD[Math.min(nameIdx, QUAD.length - 1)], color: '#d946ef' }
}
