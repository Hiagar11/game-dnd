import {
  getEffectiveStats,
  rollWeaponDamage,
  calcCritChance,
  calcEvasion,
  calcArmorPen,
  calcTotalArmor,
  calcBlock,
  calcCritDamage,
  HIT_DC,
} from '../../utils/combatFormulas'
import { getPassiveDerivedBonus } from '../../utils/passiveBonuses'
import { applySingleTargetDamage } from '../utils/applySingleTargetDamage'
import { getActiveDamageMult, getActiveEvasionMult } from '../utils/activeEffectBonuses'

/** Автоматическая регистрация: ID способностей, обслуживаемых этим экзекьютором */
export const ABILITY_ID = 'power_strike'

/**
 * Силовой удар — мощная атака оружием с множителем ×1.5.
 */
export function execute(ctx, caster, target, ability) {
  const eStats = getEffectiveStats(caster)
  const dStats = getEffectiveStats(target)
  const multiplier = ability.damageMultiplier ?? 1.5

  // Бросок попадания: d20 + hitBonus − evasion
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

  // Бросок урона оружием
  const weaponRoll = rollWeaponDamage(caster)
  const isCrit = d20 === 20
  const pen = calcArmorPen(eStats)
  const rawArmor = calcTotalArmor(target)
  const reduction = Math.max(0, rawArmor - pen)

  let dmg = Math.max(1, weaponRoll - reduction)

  // Крит-множитель
  if (isCrit) {
    const critMult = 1 + calcCritDamage(eStats) * 0.1
    dmg = Math.max(1, Math.round(dmg * critMult))
  }

  // Множитель Силового удара
  dmg = Math.max(1, Math.round(dmg * multiplier))

  // Ярость берсерка: +50% урон, если активен
  dmg = Math.max(1, Math.round(dmg * getActiveDamageMult(caster)))

  // Ярость берсерка: +50% урон, если активен
  dmg = Math.max(1, Math.round(dmg * getActiveDamageMult(caster)))

  // Шанс блока
  const blockChance = calcBlock(dStats) * 2
  if (Math.random() * 100 < blockChance) {
    dmg = Math.max(1, Math.floor(dmg / 2))
  }

  // Наносим урон
  applySingleTargetDamage(ctx, target.uid, dmg)

  // Визуал: SVG-дуга меча + вспышка (звук привязан к анимации в GameMeleeSlash)
  const color = ability.color ?? '#ef4444'
  ctx.triggerVfx('slash', { col: target.col, row: target.row, color })
  ctx.flash(target.uid, 'slash')
  ctx.spawnDamage(target, dmg, color)
}
