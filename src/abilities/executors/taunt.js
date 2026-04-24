import { isSameFaction } from '../../utils/tokenFilters'

export const ABILITY_ID = 'taunt'

/**
 * Провокация — цель следующие 2 хода обязана атаковать только кастера.
 * Применяется к врагу (враждебному NPC или герою — зависит от кастера). Стоит 1 AP.
 *
 * Хранится как activeEffect { id: 'taunt', byUid, remainingTurns: 2 }.
 * Проверка при атаке — в useTokenClickInteraction.js (getTauntEffect).
 */
export function execute(ctx, caster, target) {
  // Нельзя провоцировать союзника — цель должна быть врагом кастера
  if (!target || isSameFaction(caster, target)) return

  const live = ctx.store.placedTokens.find((t) => t.uid === target.uid)
  if (!live) return

  // Применяем эффект провокации: remainingTurns убывает в tickTokenEffects
  ctx.addEffect(target, {
    id: 'taunt',
    name: 'Провокация',
    icon: 'target',
    color: '#ef4444',
    remainingTurns: 2,
    byUid: caster.uid, // кастер — единственная допустимая цель атаки тонена
  })

  ctx.flash(live.uid, 'taunt')

  // Плавающий текст над целью
  if (ctx.damageFloat?.value) {
    const hc = ctx.store.cellSize / 2
    const cx = (live.col + 1) * hc + ctx.store.gridNormOX
    const cy = (live.row + 1) * hc + ctx.store.gridNormOY
    ctx.damageFloat.value.spawn(live.uid, '⚑ Провокация', cx, cy, '#ef4444')
  }
}
