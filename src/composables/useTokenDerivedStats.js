import { calcCritChance, calcDamageBonus, calcDefense, calcEvasion } from '../utils/combatFormulas'

export function useTokenDerivedStats({ totalStats, modelValue, directDerivedBonus }) {
  function computeFromStats(stats, key, extra = 0) {
    const { strength: s = 0, agility: a = 0, intellect: i = 0, charisma: c = 0 } = stats

    switch (key) {
      case 'damage':
        return calcDamageBonus(stats) + extra
      case 'critChance':
        return calcCritChance(stats) + extra
      case 'defense':
        return calcDefense(stats) + extra
      case 'evasion':
        return calcEvasion(stats) + extra
      case 'initiative':
        return Math.floor((a + i) / 2) + extra
      case 'resistance':
        return Math.floor((i + s) / 3) + extra
      case 'magicPower':
        return Math.floor((i * 2) / 3) + extra
      case 'persuasion':
        return Math.floor((c * 2 + i) / 3) + extra
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
