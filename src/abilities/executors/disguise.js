export const ABILITY_ID = 'disguise'

/**
 * Маскировка — подменяет внешность кастера на цель, 5 ходов.
 */
export function execute(ctx, caster, target) {
  ctx.addEffect(caster, {
    id: 'disguise',
    name: 'Маскировка',
    icon: 'domino-mask',
    color: '#94a3b8',
    remainingTurns: 5,
    originalSrc: caster.src,
    disguiseSrc: target.src,
  })
  // Сразу подменяем картинку
  caster.src = target.src
}
