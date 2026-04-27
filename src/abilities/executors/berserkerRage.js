import { playTauntCry } from '../../composables/useSound'

export const ABILITY_ID = 'berserker_rage'

/**
 * Ярость берсерка — кастер получает бафф на 3 хода:
 *   +50% урон (damageMult: 1.5) в атаках
 *   −20% уклонение (evasionMult: 0.8) когда враги бьют по берсерку
 *
 * Эффект хранится как activeEffect с damageMult/evasionMult —
 * читается в getActiveDamageMult/getActiveEvasionMult при расчёте урона.
 * Повторный каст обновляет таймер (addEffect заменяет существующий).
 */
export function execute(ctx, caster, _target, ability) {
  const live = ctx.store?.placedTokens?.find((t) => t.uid === caster.uid)
  if (!live) return

  ctx.addEffect(live, {
    id: 'berserker_rage',
    name: 'Ярость берсерка',
    icon: ability?.icon ?? 'enrage',
    color: '#ef4444',
    remainingTurns: 3,
    damageMult: 1.5,
    evasionMult: 0.8,
  })

  // Визуал: красная вспышка на кастере
  ctx.flash(live.uid, 'taunt')

  // Звук: боевой клич
  playTauntCry()

  // Плавающий текст «+50% урон» над токеном
  if (ctx.damageFloat?.value) {
    const hc = (ctx.store?.cellSize ?? 60) / 2
    const cx = (live.col + 1) * hc + (ctx.store?.gridNormOX ?? 0)
    const cy = (live.row + 1) * hc + (ctx.store?.gridNormOY ?? 0)
    ctx.damageFloat.value.spawn(live.uid, '⚔ +50% урон', cx, cy, '#ef4444')
  }
}
