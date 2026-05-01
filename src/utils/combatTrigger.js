import { isNeutralNpcToken, isNonSystemToken, isAlliedToken } from './tokenFilters'

/**
 * Регистрирует факт враждебного действия attacker → defenders.
 *
 * Вне боя: любой нейтральный участник конфликта становится hostile.
 * В бою: нейтральная цель получает фракцию по принципу «враг моего врага» —
 *   если атакует союзник → цель hostile; если атакует враг → цель friendly.
 *   Цели, которых ещё нет в очереди инициативы, добавляются в бой через joinCombat.
 *
 * @param {object} store — игровой стор (читается combatMode, initiativeOrder, joinCombat)
 * @param {object} attacker — токен-инициатор
 * @param {object|object[]} defenders — одна цель или массив (для AoE)
 * @returns {boolean} true, если бой должен стартовать сейчас:
 *   ни атакующий, ни цели не системные, есть хотя бы одна цель ≠ атакующий,
 *   и сейчас не combatMode.
 */
export function applyHostileAct(store, attacker, defenders) {
  if (!isNonSystemToken(attacker)) return false

  const targets = (Array.isArray(defenders) ? defenders : [defenders]).filter(
    (d) => isNonSystemToken(d) && d.uid !== attacker.uid
  )
  if (!targets.length) return false

  if (isNeutralNpcToken(attacker)) attacker.attitude = 'hostile'

  const inCombat = !!store?.combatMode
  const attackerIsAllied = isAlliedToken(attacker)

  for (const d of targets) {
    if (isNeutralNpcToken(d)) {
      if (inCombat) {
        // Во время боя: «враг моего врага — мой друг»
        d.attitude = attackerIsAllied ? 'hostile' : 'friendly'
      } else {
        d.attitude = 'hostile'
      }
    }

    // Если бой идёт и цель ещё не в очереди инициативы — добавляем её
    if (inCombat && typeof store.joinCombat === 'function') {
      const alreadyInOrder = store.initiativeOrder?.some((e) => e.uid === d.uid)
      if (!alreadyInOrder) store.joinCombat(d.uid)
    }
  }

  return !inCombat
}
