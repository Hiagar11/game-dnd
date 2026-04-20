/** Магические удары — blood-bolt, gravity-bolt, blood-drain */
export const ABILITY_IDS = ['blood-bolt', 'gravity-bolt', 'blood-drain']

/**
 * Магический удар по одной цели. Урон = d8 + intellect.
 * Побочные эффекты зависят от конкретного заклинания.
 */
export function execute(ctx, caster, target, ability) {
  const color = ability.color ?? '#e2e8f0'
  const intellect = caster.intellect ?? 0

  // Базовый урон: d8 + intellect
  const roll = Math.floor(Math.random() * 8) + 1
  const dmg = roll + intellect

  target.hp = Math.max(0, (target.hp ?? 0) - dmg)
  ctx.spawnDamage(target, dmg, color)

  // ── Побочные эффекты по типу заклинания ──
  // Кровавый снаряд: кастер теряет 2 HP (жертва крови)
  if (ability.id === 'blood-bolt') {
    caster.hp = Math.max(1, (caster.hp ?? 0) - 2)
  }

  // Кровавое иссушение: вампиризм 50% урона
  if (ability.id === 'blood-drain') {
    const healAmt = Math.floor(dmg * 0.5)
    const maxHp = ctx.store.calcMaxHp(caster)
    caster.hp = Math.min((caster.hp ?? maxHp) + healAmt, maxHp)
  }

  // Гравитационный удар: замедление на 1 ход
  if (ability.id === 'gravity-bolt') {
    ctx.addEffect(target, {
      id: 'gravity-slow',
      name: 'Притяжение',
      icon: 'magnet-blast',
      color: '#8b5cf6',
      remainingTurns: 1,
      apPenalty: 1,
      casterUid: caster.uid,
    })
  }
}
