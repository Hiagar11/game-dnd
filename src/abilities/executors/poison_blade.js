import { applyHostileAct } from '../../utils/combatTrigger'
import { chebyshev } from '../../utils/cellGeometry'

export const ABILITY_ID = 'poison_blade'

const POISON_MAX_DISTANCE = 2
const POISON_TURNS = 3
const FLASH_MS = 2000

/**
 * Ядовитый клинок — наносит яд при ближнем ударе (≤ 2 кл. Чебышева).
 *
 * Урон яда за ход: 1 + floor(AGI × 0.4).
 * Если яд уже висит — освежает (убирает старый, накладывает новый).
 */
export function execute(ctx, caster, target, ability) {
  const store = ctx.store
  if (!store || !caster || !target) return false

  const liveCaster = store.placedTokens?.find((t) => t.uid === caster.uid) ?? caster
  const liveTarget = store.placedTokens?.find((t) => t.uid === target.uid)
  if (!liveTarget) return false

  const distance = chebyshev(liveCaster, liveTarget)
  if (distance < 1 || distance > POISON_MAX_DISTANCE) return false

  const shouldStartCombat = applyHostileAct(store, liveCaster, liveTarget)
  let combatHandoff = null
  if (shouldStartCombat && typeof ctx.enterCombatFromAbility === 'function') {
    combatHandoff = ctx.enterCombatFromAbility(liveCaster.uid, liveCaster.actionPoints ?? 0)
  }

  const agility = liveCaster.agility ?? 0
  const damagePerTurn = Math.max(1, 1 + Math.floor(agility * 0.4))

  // Освежаем яд: убираем старый стак перед наложением нового
  ctx.removeEffect?.(liveTarget, 'poison')
  ctx.addEffect(liveTarget, {
    id: 'poison',
    name: 'Яд',
    icon: ability?.icon ?? 'poison-bottle',
    color: ability?.color ?? '#4ade80',
    damagePerTurn,
    remainingTurns: POISON_TURNS,
  })

  ctx.playPoisonBlade?.()
  ctx.flash?.(liveTarget.uid, 'poison', FLASH_MS)

  if (ctx.damageFloat?.value) {
    const hc = store.cellSize / 2
    const cx = (liveTarget.col + 1) * hc + store.gridNormOX
    const cy = (liveTarget.row + 1) * hc + store.gridNormOY
    ctx.damageFloat.value?.spawn(
      liveTarget.uid,
      `☠ Яд −${damagePerTurn}/ход`,
      cx,
      cy,
      ability?.color ?? '#4ade80'
    )
  }

  ctx.completeCombatHandoff?.(combatHandoff, ability)
}
