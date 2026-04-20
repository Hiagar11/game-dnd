// ─── Механика оглушения (stun) ──────────────────────────────────
// Чистые функции для проверки стана и подготовки пропуска хода.
// Эффект «оглушение» добавляется через activeEffects с apPenalty > 0
// (например, shield-stun от Shield Bash).

/**
 * Проверяет, оглушён ли токен.
 * Оглушение определяется:
 * 1. Флагом token.stunned (legacy)
 * 2. Наличием активного эффекта с apPenalty ≥ полного AP
 *
 * @param {object} token
 * @param {number} fullAp — сколько AP выдаётся в начале хода (DEFAULT_AP)
 * @returns {boolean}
 */
export function isStunned(token, fullAp = 3) {
  if (!token) return false
  if (token.stunned) return true
  if (token.captured) return true
  return hasStunEffect(token, fullAp)
}

/**
 * Проверяет, есть ли на токене эффект, полностью блокирующий AP.
 * Суммирует apPenalty всех активных эффектов.
 *
 * @param {object} token
 * @param {number} fullAp
 * @returns {boolean}
 */
export function hasStunEffect(token, fullAp = 3) {
  const effects = token?.activeEffects
  if (!effects?.length) return false
  let totalPenalty = 0
  for (const e of effects) {
    if (e.apPenalty && (e.remainingTurns ?? 0) > 0) {
      totalPenalty += e.apPenalty
    }
  }
  return totalPenalty >= fullAp
}

/**
 * Возвращает название эффекта оглушения (для подсказки).
 * @param {object} token
 * @returns {string|null}
 */
export function getStunEffectName(token) {
  if (token?.stunned) return 'Оглушён'
  if (token?.captured) return 'Захвачен'
  const effects = token?.activeEffects
  if (!effects?.length) return null
  const stun = effects.find((e) => e.apPenalty && (e.remainingTurns ?? 0) > 0)
  return stun?.name ?? null
}
