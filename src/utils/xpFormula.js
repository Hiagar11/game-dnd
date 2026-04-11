// =============================================================================
// ФОРМУЛА ОПЫТА И УРОВНЕЙ
// =============================================================================
//
// Логика роста:
//   Каждый следующий уровень требует на 100 XP больше, чем предыдущий.
//
//   Уровень 1 → 2:   100 XP
//   Уровень 2 → 3:   200 XP
//   Уровень 3 → 4:   300 XP
//   Уровень N → N+1: N * 100 XP
//
// Итоговый накопленный XP для достижения уровня N:
//   xpForLevel(N) = 50 * N * (N - 1)
//
//   xpForLevel(1)  = 0
//   xpForLevel(2)  = 100
//   xpForLevel(3)  = 300
//   xpForLevel(4)  = 600
//   xpForLevel(10) = 4500
// =============================================================================

/**
 * Минимальный суммарный XP, необходимый для достижения уровня level.
 * Level 1 = 0 XP (стартовое состояние).
 */
export function xpForLevel(level) {
  return 50 * level * (level - 1)
}

/**
 * Сколько XP нужно, чтобы перейти с currentLevel на следующий.
 */
export function xpToNextLevel(currentLevel) {
  return currentLevel * 100
}

/**
 * Определяет уровень героя по суммарному накопленному XP.
 * Обратная функция к xpForLevel; минимум — 1-й уровень.
 */
export function levelFromXp(xp) {
  // Решаем 50 * N * (N-1) <= xp  →  N^2 - N - xp/50 = 0
  // N = (1 + sqrt(1 + 4 * xp / 50)) / 2
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2))
}

/**
 * Прогресс внутри текущего уровня от 0 до 100 %.
 * @param {number} xp    — суммарный накопленный XP
 * @param {number} level — текущий уровень (levelFromXp(xp))
 */
export function xpProgressPercent(xp, level) {
  const start = xpForLevel(level)
  const end = xpForLevel(level + 1)
  return Math.min(100, Math.max(0, ((xp - start) / (end - start)) * 100))
}
