import {
  calcCritChance,
  calcPerception,
  calcEvasion,
  calcMagicResist,
  calcBlock,
  calcCritDamage,
  calcArmorPen,
  calcMagicPen,
  calcLuck,
  calcStealth,
  calcHealing,
  calcInitiative,
  calcPersuasion,
  calcDeception,
} from '../utils/combatFormulas'

export function useTokenDerivedStats({ totalStats, modelValue, directDerivedBonus }) {
  function computeFromStats(stats, key, extra = 0) {
    switch (key) {
      case 'critChance':
        return calcCritChance(stats) + extra
      case 'evasion':
        return calcEvasion(stats) + extra
      case 'initiative':
        return calcInitiative(stats) + extra
      case 'perception':
        return calcPerception(stats) + extra
      case 'persuasion':
        return calcPersuasion(stats) + extra
      case 'deception':
        return calcDeception(stats) + extra
      case 'magicResist':
        return calcMagicResist(stats) + extra
      case 'block':
        return calcBlock(stats) + extra
      case 'critDamage':
        return calcCritDamage(stats) + extra
      case 'armorPen':
        return calcArmorPen(stats) + extra
      case 'magicPen':
        return calcMagicPen(stats) + extra
      case 'luck':
        return calcLuck(stats) + extra
      case 'stealth':
        return calcStealth(stats) + extra
      case 'healing':
        return calcHealing(stats) + extra
      default:
        return 0
    }
  }

  const computeDerived = (key) => computeFromStats(totalStats.value, key, directDerivedBonus(key))

  const computeDerivedBase = (key) => computeFromStats(modelValue.value, key)

  const derivedBonus = (key) => computeDerived(key) - computeDerivedBase(key)

  return {
    computeDerived,
    derivedBonus,
  }
}
