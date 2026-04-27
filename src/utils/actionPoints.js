/**
 * Базовые AP по уровню токена.
 *
 * Прогрессия:
 * - 1-2 уровень: 2 AP
 * - 3-4 уровень: 3 AP
 * - 5-7 уровень: 4 AP
 * - 8-10 уровень: 5 AP
 * - 11+ уровень: 6 AP (кап)
 */
export function getBaseActionPointsByLevel(level = 1) {
  const safeLevel = Math.max(1, Number(level) || 1)
  if (safeLevel >= 11) return 6
  if (safeLevel >= 8) return 5
  if (safeLevel >= 5) return 4
  if (safeLevel >= 3) return 3
  return 2
}

/**
 * Базовые AP для конкретного токена.
 */
export function getBaseActionPoints(token) {
  return getBaseActionPointsByLevel(token?.level ?? 1)
}
