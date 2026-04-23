import { DEFAULT_MP } from '../../constants/combat'

/** Автоматическая регистрация: ID способности */
export const ABILITY_ID = 'quick_step'

/** Дополнительные очки движения за один ход */
const BONUS_MP = 3

/**
 * Быстрый шаг — добавляет +3 MP кастеру на этот ход.
 * Способность на себя (areaType: 'self'), target = null.
 */
export function execute(ctx, caster) {
  const live = ctx.store.placedTokens.find((t) => t.uid === caster.uid)
  if (!live) return

  // Добавляем MP, не превышая разумный лимит
  const current = live.movementPoints ?? DEFAULT_MP
  ctx.store.editPlacedToken(live.uid, { movementPoints: current + BONUS_MP })

  // Визуал: синяя волна-пульс от кастера
  ctx.triggerVfx('quickStep', { col: live.col, row: live.row })
}
