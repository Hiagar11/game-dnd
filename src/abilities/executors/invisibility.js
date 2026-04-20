export const ABILITY_ID = 'invisibility'

/**
 * Невидимость — баф на себя, 3 хода.
 */
export function execute(ctx, caster) {
  ctx.addEffect(caster, {
    id: 'invisibility',
    name: 'Невидимость',
    icon: 'invisible',
    color: '#c4b5fd',
    remainingTurns: 3,
  })
}
