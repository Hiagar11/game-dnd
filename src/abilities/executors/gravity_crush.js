import { applyMultiTargetDamage } from '../utils/applyMultiTargetDamage'
import { applyHostileAct } from '../../utils/combatTrigger'
import { isSameFaction } from '../../utils/tokenFilters'

export const ABILITY_ID = 'gravity_crush'

const CAST_MS = 600 // руна мелькает над головой кастера
const FLIGHT_MS = 600 // снаряд летит бесшумно до точки удара
const FLASH_MS = 900

/**
 * Гравитационное сжатие — 3 фазы:
 *   1. Каст: звук старта + руна над головой (CAST_MS)
 *   2. Полёт: фиолетовый шар летит бесшумно (FLIGHT_MS)
 *   3. Взрыв: звук центра + урон по зоне 2×2
 *
 * targetCell = центр зоны 2×2 (курсор стоит в точке пересечения четырёх клеток).
 * Урон: d6 + ⌊INT×0.65 + STR×0.4 + INT×STR/25⌋
 */
export function execute(ctx, caster, targetCell, ability) {
  const store = ctx.store
  if (!store || !caster || targetCell?.col == null) return false

  const color = ability?.color ?? '#8b5cf6'
  const hc = (store.cellSize ?? 60) / 2
  const ox = store.gridNormOX ?? 0
  const oy = store.gridNormOY ?? 0

  const C = targetCell.col
  const R = targetCell.row

  // Токен (tc,tr) занимает halfCells [tc,tc+1]×[tr,tr+1].
  // Зона [C-2, C+1]×[R-2, R+1]. Проверка перекрытия прямоугольников.
  function inZone(tc, tr) {
    return tc + 1 >= C - 2 && tc <= C + 1 && tr + 1 >= R - 2 && tr <= R + 1
  }

  const fromX = (caster.col + 1) * hc + ox
  const fromY = (caster.row + 1) * hc + oy
  const toX = C * hc + ox
  const toY = R * hc + oy

  // ─── Фаза 1: звук каста + руна над головой ─────────────────────
  ctx.playGravityCastStart?.()
  ctx.triggerVfx?.('gravityCast', { col: caster.col, row: caster.row })

  // ─── Фаза 2: запуск снаряда — фиолетовый шар, летит бесшумно ───
  setTimeout(() => {
    store.abilityProjectile = {
      fromX,
      fromY,
      toX,
      toY,
      durationMs: FLIGHT_MS,
      kind: 'gravityCrush',
      color,
    }
  }, CAST_MS)

  // ─── Фаза 3: взрыв — после приземления снаряда ─────────────────
  setTimeout(() => {
    ctx.playGravityCrushCenter?.()
    ctx.triggerVfx?.('gravity_crush', { col: C, row: R })

    const liveCaster = (store.placedTokens ?? []).find((t) => t.uid === caster.uid) ?? caster
    const intel = liveCaster.intellect ?? 0
    const strength = liveCaster.strength ?? 0

    const candidates = (store.placedTokens ?? [])
      .filter((t) => t && !t.systemToken)
      .filter((t) => t.uid !== liveCaster.uid)
      .filter((t) => !isSameFaction(liveCaster, t))
      .filter((t) => inZone(t.col, t.row))
      .filter((t) => ctx.isAreaVisible?.(t.col, t.row) ?? true)

    if (!candidates.length) {
      store.checkCombatEnd?.()
      return
    }

    const shouldStartCombat = applyHostileAct(store, liveCaster, candidates)
    let combatHandoff = null
    if (shouldStartCombat && typeof ctx.enterCombatFromAbility === 'function') {
      combatHandoff = ctx.enterCombatFromAbility(liveCaster.uid, liveCaster.actionPoints ?? 0)
    }

    applyMultiTargetDamage(
      ctx,
      candidates,
      () => {
        const roll = Math.floor(Math.random() * 6) + 1
        const bonus = Math.floor(intel * 0.65 + strength * 0.4 + (intel * strength) / 25)
        return Math.max(1, roll + bonus)
      },
      ({ target, damage }) => {
        ctx.flash?.(target.uid, 'gravity', FLASH_MS)
        ctx.spawnDamage?.(target, damage, color)
      }
    )

    ctx.completeCombatHandoff?.(combatHandoff, ability)
  }, CAST_MS + FLIGHT_MS)
}
