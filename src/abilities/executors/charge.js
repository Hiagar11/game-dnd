import { applySingleTargetDamage } from '../utils/applySingleTargetDamage'
import { getActiveDamageMult } from '../utils/activeEffectBonuses'
import { isNeutralNpcToken } from '../../utils/tokenFilters'

export const ABILITY_ID = 'charge'

const CHARGE_MAX_DISTANCE = 4
const CHARGE_TELEPORT_MS = 150 // момент исчезновения / перемещения (середина анимации)
const CHARGE_LANDING_MS = 350 // от телепорта до удара (всего 500мс анимации)

const ADJACENT_DIRS = [
  { dc: -1, dr: -1 },
  { dc: 0, dr: -1 },
  { dc: 1, dr: -1 },
  { dc: -1, dr: 0 },
  { dc: 1, dr: 0 },
  { dc: -1, dr: 1 },
  { dc: 0, dr: 1 },
  { dc: 1, dr: 1 },
]

function chebyshev(a, b) {
  return Math.max(Math.abs((a.col ?? 0) - (b.col ?? 0)), Math.abs((a.row ?? 0) - (b.row ?? 0)))
}

function isBlocked(store, col, row, attackerUid, defenderUid) {
  const wallBlocked = (store.walls ?? []).some((w) => w.col === col && w.row === row)
  if (wallBlocked) return true
  return (store.placedTokens ?? []).some((t) => {
    if (!t || t.systemToken) return false
    if (t.uid === attackerUid || t.uid === defenderUid) return false
    return t.col === col && t.row === row
  })
}

/**
 * Подбирает клетку приземления возле цели — ближайшую к атакующему,
 * не занятую стенами или другими токенами.
 */
function pickLandingCell(store, attacker, defender) {
  const candidates = ADJACENT_DIRS.map(({ dc, dr }) => {
    const col = (defender.col ?? 0) + dc
    const row = (defender.row ?? 0) + dr
    return {
      col,
      row,
      distFromAttacker: Math.hypot((attacker.col ?? 0) - col, (attacker.row ?? 0) - row),
    }
  })
    .filter((cell) => !isBlocked(store, cell.col, cell.row, attacker.uid, defender.uid))
    .sort((a, b) => a.distFromAttacker - b.distFromAttacker)
  return candidates[0] ?? null
}

/**
 * Рывок — прыжок до 4 клеток к цели и удар d6+STR×scaling по ней.
 *
 * Условия каста:
 *  - дистанция Чебышева до цели ≤ 4
 *  - в боевом режиме у кастера должно быть MP ≥ дистанция прыжка
 *  - возле цели должна быть свободная клетка для приземления
 *
 * При успехе: списывается MP по дистанции прыжка, проигрывается
 * крик, запускается анимация berserk-jump (на 500мс), на 150мс
 * происходит перемещение, на 500мс — удар + impact-звук.
 */
export function execute(ctx, caster, target, ability) {
  const store = ctx.store
  if (!store || !caster || !target) return

  const distanceToTarget = chebyshev(caster, target)
  const availableMp = caster.movementPoints ?? 0
  const maxRange = store.combatMode
    ? Math.min(CHARGE_MAX_DISTANCE, availableMp)
    : CHARGE_MAX_DISTANCE
  if (distanceToTarget < 1 || distanceToTarget > maxRange) return

  const landingCell = pickLandingCell(store, caster, target)
  if (!landingCell) return

  const jumpDistance = Math.max(
    Math.abs((caster.col ?? 0) - landingCell.col),
    Math.abs((caster.row ?? 0) - landingCell.row)
  )
  if (store.combatMode && availableMp < jumpDistance) return

  // Списываем MP — рывок «съедает» движение по дистанции прыжка.
  if (store.combatMode) {
    const liveCaster = store.placedTokens?.find((t) => t.uid === caster.uid)
    if (liveCaster) {
      liveCaster.movementPoints = Math.max(0, (liveCaster.movementPoints ?? 0) - jumpDistance)
    }
  }

  // Старт анимации: красный пых + крик в полёте.
  ctx.flash?.(caster.uid, 'berserk-jump', 500)
  ctx.playRushScream?.()

  // На середине анимации (~150мс) — токен почти невидим, телепортируем.
  setTimeout(() => {
    store.moveToken?.(caster.uid, landingCell.col, landingCell.row)
  }, CHARGE_TELEPORT_MS)

  // По завершении приземления — удар + звук «по мячу».
  setTimeout(() => {
    const liveCaster = store.placedTokens?.find((t) => t.uid === caster.uid) ?? caster
    const liveTarget = store.placedTokens?.find((t) => t.uid === target.uid) ?? target
    if (!liveTarget) return

    // Атака по нейтралу превращает его во врага (как cleave/прочие удары).
    const aggroNeutral = isNeutralNpcToken(liveTarget)
    if (aggroNeutral) liveTarget.attitude = 'hostile'

    let combatHandoff = null
    if (!store.combatMode && aggroNeutral && typeof ctx.enterCombatFromAbility === 'function') {
      combatHandoff = ctx.enterCombatFromAbility(liveCaster.uid, liveCaster.actionPoints ?? 0)
    }

    // Урон: d6 + STR × scaling, с ярости-множителем (как у раскола).
    const strength = liveCaster.strength ?? 0
    const strengthScaling = ability?.strengthScaling ?? 1
    const roll = Math.floor(Math.random() * 6) + 1
    const base = Math.max(1, Math.round(roll + strength * strengthScaling))
    const dmg = Math.max(1, Math.round(base * getActiveDamageMult(liveCaster)))

    applySingleTargetDamage(ctx, liveTarget.uid, dmg)
    ctx.spawnDamage?.(liveTarget, dmg, ability?.color ?? '#ef4444')
    ctx.playRushImpact?.()

    ctx.completeCombatHandoff?.(combatHandoff, ability)
  }, CHARGE_TELEPORT_MS + CHARGE_LANDING_MS)
}
