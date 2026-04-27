import {
  getEffectiveStats,
  calcCritChance,
  calcEvasion,
  calcArmorPen,
  calcTotalArmor,
  calcCritDamage,
  HIT_DC,
} from '../../utils/combatFormulas'
import { DEFAULT_AP } from '../../constants/combat'
import { getPassiveDerivedBonus } from '../../utils/passiveBonuses'
import { applySingleTargetDamage } from '../utils/applySingleTargetDamage'
import { getActiveDamageMult, getActiveEvasionMult } from '../utils/activeEffectBonuses'

export const ABILITY_ID = 'shield_bash'

/**
 * Удар щитом — урон от брони щита + оглушение на 1 ход.
 */
export function execute(ctx, caster, target, ability) {
  const eStats = getEffectiveStats(caster)
  const dStats = getEffectiveStats(target)

  // Бросок попадания
  const d20 = Math.floor(Math.random() * 20) + 1
  const hitBonus = calcCritChance(eStats)
  const evasion = Math.round(
    (calcEvasion(dStats) + getPassiveDerivedBonus(target?.passiveAbilities, 'evasion')) *
      getActiveEvasionMult(target)
  )
  const total = d20 + hitBonus - evasion

  if (total < HIT_DC) {
    ctx.flash(target.uid, 'miss')
    ctx.playMiss()
    return
  }

  // Урон = baseArmor щита + str/2 + d4
  const shield = caster?.inventory?.equipped?.offhand
  if (!shield || !shield.baseArmor) return // Нет щита — способность не работает
  const shieldArmor = shield.baseArmor
  const strBonus = Math.floor((eStats.strength ?? 0) / 2)
  const rollD4 = Math.floor(Math.random() * 4) + 1
  let dmg = shieldArmor + strBonus + rollD4

  // Пенетрация
  const pen = calcArmorPen(eStats)
  const rawArmor = calcTotalArmor(target)
  const reduction = Math.max(0, rawArmor - pen)
  dmg = Math.max(1, dmg - reduction)

  // Крит
  if (d20 === 20) {
    const critMult = 1 + calcCritDamage(eStats) * 0.1
    dmg = Math.max(1, Math.round(dmg * critMult))
  }

  // Ярость берсерка: +50% урон, если активен
  dmg = Math.max(1, Math.round(dmg * getActiveDamageMult(caster)))

  // Ярость берсерка: +50% урон, если активен
  dmg = Math.max(1, Math.round(dmg * getActiveDamageMult(caster)))

  // Наносим урон
  applySingleTargetDamage(ctx, target.uid, dmg)

  // Оглушение на 1 ход (apPenalty = DEFAULT_AP → ход полностью пропускается)
  ctx.addEffect(target, {
    id: 'shield-stun',
    name: 'Оглушение',
    icon: 'stun-grenade',
    color: '#f59e0b',
    remainingTurns: 1,
    apPenalty: DEFAULT_AP,
  })

  // Визуал
  const color = ability.color ?? '#f59e0b'
  ctx.triggerVfx('bash', { col: target.col, row: target.row, color })
  ctx.flash(target.uid, 'bash')
  ctx.spawnDamage(target, dmg, color)
}
