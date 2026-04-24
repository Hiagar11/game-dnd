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

/**
 * Возвращает активный эффект провокации или null.
 * Если не null — токен обязан атаковать только byUid.
 *
 * @param {object} token
 * @returns {{ byUid: string }|null}
 */
export function getTauntEffect(token) {
  const effects = token?.activeEffects
  if (!effects?.length) return null
  return effects.find((e) => e.id === 'taunt' && (e.remainingTurns ?? 0) > 0) ?? null
}

/**
 * Возвращает uid цели, которую атакующий обязан бить под провокацией.
 * Если провокатор выбыл (не найден/HP=0) — ограничение снимается.
 *
 * @param {object} attacker
 * @param {Array<object>} placedTokens
 * @returns {string|null}
 */
export function getForcedTauntTargetUid(attacker, placedTokens = []) {
  const taunt = getTauntEffect(attacker)
  if (!taunt?.byUid) return null

  const forcedTarget = placedTokens.find((t) => t.uid === taunt.byUid)
  if (!forcedTarget || (forcedTarget.hp ?? 0) <= 0) return null

  return forcedTarget.uid
}

/**
 * true, если атакующий под провокацией пытается атаковать НЕ провокатора.
 *
 * @param {object} attacker
 * @param {object} defender
 * @param {Array<object>} placedTokens
 * @returns {boolean}
 */
export function isTauntAttackViolation(attacker, defender, placedTokens = []) {
  const forcedUid = getForcedTauntTargetUid(attacker, placedTokens)
  if (!forcedUid) return false
  return defender?.uid !== forcedUid
}
