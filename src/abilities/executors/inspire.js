import { isSameFaction } from '../../utils/tokenFilters'

export const ABILITY_ID = 'inspire'

/**
 * Воодушевление — союзник получает +1 AP.
 * Если сейчас ход цели — добавляем сразу.
 * Иначе — сохраняем в bonusAp, который применится при старте следующего хода цели.
 * Цель должна быть на одной стороне с кастером (герой/friendly → герой/friendly,
 * или враждебный NPC → враждебный NPC когда геймастер играет за врагов).
 */
export function execute(ctx, caster, target) {
  if (!target || !caster || !isSameFaction(caster, target)) return

  const live = ctx.store.placedTokens.find((t) => t.uid === target.uid)
  if (!live) return

  // Определяем, является ли цель текущим активным участником хода
  const order = ctx.store.initiativeOrder ?? []
  const currIdx = ctx.store.currentInitiativeIndex ?? 0
  const isCurrentTurn = ctx.store.combatMode && order[currIdx]?.uid === live.uid

  if (isCurrentTurn) {
    // Ход уже идёт — добавляем AP немедленно
    ctx.store.editPlacedToken(live.uid, { actionPoints: (live.actionPoints ?? 0) + 1 })
  } else {
    // Ход ещё впереди — сохраняем бонус, он добавится при старте хода цели
    ctx.store.editPlacedToken(live.uid, { bonusAp: (live.bonusAp ?? 0) + 1 })
  }

  // Жёлтая вспышка на токене + волна снизу вверх (через VFX-компонент GameInspire)
  ctx.flash(live.uid, 'inspire')
  ctx.triggerVfx('inspire', { col: live.col, row: live.row })

  // Плавающий текст "+1 AP" над токеном
  if (ctx.damageFloat?.value) {
    const hc = ctx.store.cellSize / 2
    const cx = (live.col + 1) * hc + ctx.store.gridNormOX
    const cy = (live.row + 1) * hc + ctx.store.gridNormOY
    ctx.damageFloat.value.spawn(live.uid, '+1 AP', cx, cy, '#eab308')
  }
}
