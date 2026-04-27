import { isNeutralNpcToken } from '../../utils/tokenFilters'
import { applyMultiTargetDamage } from '../utils/applyMultiTargetDamage'

/** AoE-способности — gravity-crush, gravity-well, blood-rain, poison-cloud */
export const ABILITY_IDS = ['gravity-crush', 'gravity-well', 'blood-rain', 'poison-cloud']

/**
 * AoE (targeted) — полный flow:
 * 1. Снаряд летит от кастера до точки удара
 * 2. По прилёте — вспышка на клетках
 * 3. Урон по затронутым токенам + DamageFloat
 */
export function execute(ctx, caster, targetCell, ability) {
  const { store } = ctx
  const hc = store.cellSize / 2
  const ox = store.gridNormOX
  const oy = store.gridNormOY
  const size = ability.areaSize ?? 1

  // Координаты центра кастера (пиксели)
  const fromX = (caster.col + 1) * hc + ox
  const fromY = (caster.row + 1) * hc + oy

  // Координаты центра AoE-зоны (пиксели)
  const toX = (targetCell.col + 0.5) * hc + ox
  const toY = (targetCell.row + 0.5) * hc + oy

  // Собираем sub-cells зоны (areaSize = 2 → 4×4 sub-cells)
  const cells = []
  for (let dc = -size + 1; dc <= size; dc++) {
    for (let dr = -size + 1; dr <= size; dr++) {
      cells.push({ col: targetCell.col + dc, row: targetCell.row + dr })
    }
  }

  const icon = ability.icon ?? 'game-icons:fire-bolt'
  const color = ability.color ?? '#f97316'

  // 1) Снаряд
  store.abilityProjectile = { fromX, fromY, toX, toY, color, icon }

  // 2) Через 500 мс (время полёта) — impact + урон
  setTimeout(() => {
    store.abilityProjectile = null
    store.abilityImpact = { cells, color }

    // 3) Рассчитываем урон по всем токенам в зоне
    applyAoeDamage(ctx, caster, cells, color, ability)
  }, 500)
}

/**
 * Находит все токены, чьи sub-cell-позиции попадают в зону AoE,
 * наносит урон и показывает DamageFloat.
 */
function applyAoeDamage(ctx, casterToken, cells, color, ability) {
  const { store } = ctx
  const hc = store.cellSize / 2
  const ox = store.gridNormOX
  const oy = store.gridNormOY

  const cellSet = new Set(cells.map((c) => `${c.col},${c.row}`))

  // Токен занимает 2×2 sub-cells
  const hit = store.placedTokens.filter((t) => {
    if (t.uid === casterToken.uid) return false
    for (let dc = 0; dc < 2; dc++) {
      for (let dr = 0; dr < 2; dr++) {
        if (cellSet.has(`${t.col + dc},${t.row + dr}`)) return true
      }
    }
    return false
  })

  const liveCaster = store.placedTokens.find((t) => t.uid === casterToken.uid) ?? casterToken
  const shouldEnterCombat = hit.some((target) => isNeutralNpcToken(target))

  for (const target of hit) {
    if (isNeutralNpcToken(target)) {
      target.attitude = 'hostile'
    }
  }

  const combatHandoff = shouldEnterCombat
    ? ctx.enterCombatFromAbility?.(liveCaster.uid, liveCaster.actionPoints ?? 0)
    : null

  const intellect = casterToken.intellect ?? 0
  applyMultiTargetDamage(
    ctx,
    hit,
    () => {
      const roll = Math.floor(Math.random() * 6) + 1
      return roll + intellect
    },
    ({ target, damage }) => {
      if (ctx.damageFloat?.value) {
        const cx = (target.col + 1) * hc + ox
        const cy = (target.row + 1) * hc + oy
        ctx.damageFloat.value.spawn(target.uid, damage, cx, cy, color)
      }
    }
  )

  ctx.completeCombatHandoff?.(combatHandoff, ability)
}
