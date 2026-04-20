export const ABILITY_ID = 'poison-strike'

/**
 * Отравление — накладывает DoT (урон каждый ход) на 3 хода.
 */
export function execute(ctx, caster, target) {
  const intellect = caster.intellect ?? 0
  const dmgPerTurn = 2 + Math.floor(intellect * 0.5)

  ctx.addEffect(target, {
    id: 'poison',
    name: 'Отравление',
    icon: 'poison-bottle',
    color: '#4ade80',
    remainingTurns: 3,
    damagePerTurn: dmgPerTurn,
    casterUid: caster.uid,
  })

  // Мгновенный «тик» — показываем урон и вспышку
  ctx.spawnDamage(target, dmgPerTurn, '#4ade80')
}
