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
  const evasion = calcEvasion(dStats)
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

  // Наносим урон
  const live = ctx.store.placedTokens.find((t) => t.uid === target.uid)
  if (live) {
    const newHp = Math.max(0, (live.hp ?? 0) - dmg)
    ctx.store.editPlacedToken(live.uid, { hp: newHp })
    if (newHp === 0 && live.tokenType === 'npc') {
      ctx.store.editPlacedToken(live.uid, { stunned: true })
      ctx.store.checkCombatEnd()
    }
  }

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
