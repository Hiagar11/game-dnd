// ─── Утилиты для чтения боевых бонусов из активных эффектов ─────────────────

/**
 * Возвращает итоговый множитель урона для атакующего токена.
 * Перемножает все damageMult из активных эффектов (по умолчанию 1.0).
 *
 * @param {object} token
 * @returns {number}
 */
export function getActiveDamageMult(token) {
  const effects = token?.activeEffects
  if (!effects?.length) return 1
  let mult = 1
  for (const e of effects) {
    if (e.damageMult && (e.remainingTurns ?? 0) > 0) mult *= e.damageMult
  }
  return mult
}

/**
 * Возвращает итоговый множитель уклонения для токена-цели.
 * Значение < 1 означает снижение уклонения (например, 0.8 = −20%).
 * Перемножает все evasionMult из активных эффектов (по умолчанию 1.0).
 *
 * @param {object} token
 * @returns {number}
 */
export function getActiveEvasionMult(token) {
  const effects = token?.activeEffects
  if (!effects?.length) return 1
  let mult = 1
  for (const e of effects) {
    if (e.evasionMult && (e.remainingTurns ?? 0) > 0) mult *= e.evasionMult
  }
  return mult
}
