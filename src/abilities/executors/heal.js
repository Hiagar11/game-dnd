export const ABILITY_ID = 'heal'

/**
 * Лечение — восстанавливает HP цели. Эффект масштабируется от интеллекта.
 */
export function execute(ctx, caster, target) {
  const intellect = caster.intellect ?? 0
  const healAmount = 5 + Math.floor(intellect * 1.5)
  const maxHp = ctx.store.calcMaxHp(target)
  target.hp = Math.min((target.hp ?? maxHp) + healAmount, maxHp)
}
