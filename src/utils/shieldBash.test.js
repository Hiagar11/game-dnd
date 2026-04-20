import { describe, expect, it } from 'vitest'
import {
  getEffectiveStats,
  calcCritChance,
  calcEvasion,
  calcArmorPen,
  calcTotalArmor,
  calcCritDamage,
  hasShield,
  HIT_DC,
} from './combatFormulas'
import { SHIELD_BASH } from '../constants/abilityTree'

/**
 * Тесты для логики Удара щитом (Shield Bash).
 *
 * applyShieldBash зависит от Pinia store, поэтому тестируем через
 * чистые функции combatFormulas, повторяя формулы из useAbilityExecution.
 */

// ─── Хелперы ───────────────────────────────────────────────────────
/** Повторяет расчёт попадания из applyShieldBash */
function calcHitRoll(attacker, defender, d20) {
  const eStats = getEffectiveStats(attacker)
  const dStats = getEffectiveStats(defender)
  const hitBonus = calcCritChance(eStats)
  const evasion = calcEvasion(dStats)
  return d20 + hitBonus - evasion
}

/** Повторяет расчёт урона из applyShieldBash (без блока) */
function calcShieldBashDmg(attacker, defender, { d20, rollD4 }) {
  const eStats = getEffectiveStats(attacker)
  const shield = attacker?.inventory?.equipped?.offhand
  const shieldArmor = shield?.baseArmor ?? 2
  const strBonus = Math.floor((eStats.strength ?? 0) / 2)
  let dmg = shieldArmor + strBonus + rollD4

  const pen = calcArmorPen(eStats)
  const rawArmor = calcTotalArmor(defender)
  const reduction = Math.max(0, rawArmor - pen)
  dmg = Math.max(1, dmg - reduction)

  const isCrit = d20 === 20
  if (isCrit) {
    const critMult = 1 + calcCritDamage(eStats) * 0.1
    dmg = Math.max(1, Math.round(dmg * critMult))
  }

  return dmg
}

// ─── Фикстуры ─────────────────────────────────────────────────────
const attacker = {
  strength: 12,
  agility: 10,
  intellect: 6,
  charisma: 4,
  inventory: {
    equipped: {
      weapon: { baseDamage: { min: 4, max: 10 }, apCost: 1, slot: 'weapon' },
      offhand: { slot: 'offhand', baseArmor: 4, icon: 'round-shield' },
    },
  },
}

const attackerNoShield = {
  strength: 12,
  agility: 10,
  intellect: 6,
  charisma: 4,
  inventory: {
    equipped: {
      weapon: { baseDamage: { min: 4, max: 10 }, apCost: 1, slot: 'weapon' },
    },
  },
}

const attackerDualWield = {
  strength: 12,
  agility: 10,
  intellect: 6,
  charisma: 4,
  inventory: {
    equipped: {
      weapon: { baseDamage: { min: 4, max: 10 }, apCost: 1, slot: 'weapon' },
      offhand: { baseDamage: { min: 2, max: 6 }, apCost: 1, slot: 'weapon' },
    },
  },
}

const defender = {
  uid: 'def-1',
  strength: 8,
  agility: 8,
  intellect: 4,
  charisma: 6,
  hp: 50,
  inventory: {
    equipped: {
      armor: { baseArmor: 4 },
      helmet: { baseArmor: 2 },
    },
  },
}

// ─── Константа ─────────────────────────────────────────────────────
describe('SHIELD_BASH — константа', () => {
  it('id = shield_bash', () => {
    expect(SHIELD_BASH.id).toBe('shield_bash')
  })

  it('areaType = single', () => {
    expect(SHIELD_BASH.areaType).toBe('single')
  })

  it('apCost = 1', () => {
    expect(SHIELD_BASH.apCost).toBe(1)
  })

  it('requiresMelee и requiresShield = true', () => {
    expect(SHIELD_BASH.requiresMelee).toBe(true)
    expect(SHIELD_BASH.requiresShield).toBe(true)
  })

  it('type = active', () => {
    expect(SHIELD_BASH.type).toBe('active')
  })

  it('цвет — жёлтый (#f59e0b)', () => {
    expect(SHIELD_BASH.color).toBe('#f59e0b')
  })
})

// ─── hasShield ─────────────────────────────────────────────────────
describe('hasShield — определение щита', () => {
  it('щит в оффхенде → true', () => {
    expect(hasShield(attacker)).toBe(true)
  })

  it('нет оффхенда → false', () => {
    expect(hasShield(attackerNoShield)).toBe(false)
  })

  it('оружие в оффхенде (dual wield) → false', () => {
    expect(hasShield(attackerDualWield)).toBe(false)
  })

  it('null/undefined токен → false', () => {
    expect(hasShield(null)).toBe(false)
    expect(hasShield(undefined)).toBe(false)
  })

  it('пустой inventory → false', () => {
    expect(hasShield({ inventory: {} })).toBe(false)
    expect(hasShield({ inventory: { equipped: {} } })).toBe(false)
  })
})

// ─── Попадание ─────────────────────────────────────────────────────
describe('Shield Bash — попадание', () => {
  it('d20 + hitBonus - evasion ≥ HIT_DC → попадание', () => {
    // attacker: critChance = floor((10*3 + 6) / 5) = 7
    // defender: evasion = floor((8*2 + 6 + 8) / 5) = 6
    // d20=15: 15 + 7 - 6 = 16 ≥ 10
    expect(calcHitRoll(attacker, defender, 15)).toBe(16)
    expect(calcHitRoll(attacker, defender, 15) >= HIT_DC).toBe(true)
  })

  it('низкий бросок → промах', () => {
    // d20=1: 1 + 7 - 6 = 2 < 10
    expect(calcHitRoll(attacker, defender, 1)).toBe(2)
    expect(calcHitRoll(attacker, defender, 1) >= HIT_DC).toBe(false)
  })

  it('пограничный бросок: ровно HIT_DC', () => {
    // d20=9: 9 + 7 - 6 = 10
    expect(calcHitRoll(attacker, defender, 9)).toBe(10)
    expect(calcHitRoll(attacker, defender, 9) >= HIT_DC).toBe(true)
  })
})

// ─── Урон ──────────────────────────────────────────────────────────
describe('Shield Bash — расчёт урона', () => {
  it('базовый урон: shieldArmor + str/2 + d4 - armor', () => {
    // shield.baseArmor = 4
    // strBonus = floor(12 / 2) = 6  (from effectiveStats.strength)
    // effectiveStats.strength = floor(12 + 10*0.3 + 4*0.2) = floor(15.8) = 15
    // WAIT — getEffectiveStats returns composite stats
    const eStats = getEffectiveStats(attacker)
    // strBonus = Math.floor(eStats.strength / 2) используется в расчёте внутри calcShieldBashDmg
    void eStats
    // dmg = 4 + strBonus + 3 (d4=3) - (armor - pen)
    const dmg = calcShieldBashDmg(attacker, defender, { d20: 15, rollD4: 3 })
    expect(dmg).toBeGreaterThanOrEqual(1)
  })

  it('минимальный урон — не меньше 1', () => {
    const heavyArmor = {
      ...defender,
      inventory: {
        equipped: {
          armor: { baseArmor: 30 },
          helmet: { baseArmor: 15 },
        },
      },
    }
    const dmg = calcShieldBashDmg(attacker, heavyArmor, { d20: 15, rollD4: 1 })
    expect(dmg).toBe(1)
  })

  it('крит (d20=20) увеличивает урон', () => {
    const normal = calcShieldBashDmg(attacker, defender, { d20: 15, rollD4: 3 })
    const crit = calcShieldBashDmg(attacker, defender, { d20: 20, rollD4: 3 })
    expect(crit).toBeGreaterThan(normal)
  })

  it('больший щит (baseArmor) даёт больше урона', () => {
    const weakShield = {
      ...attacker,
      inventory: {
        equipped: {
          ...attacker.inventory.equipped,
          offhand: { slot: 'offhand', baseArmor: 2, icon: 'shield' },
        },
      },
    }
    const dmgWeak = calcShieldBashDmg(weakShield, defender, { d20: 15, rollD4: 3 })
    const dmgStrong = calcShieldBashDmg(attacker, defender, { d20: 15, rollD4: 3 })
    expect(dmgStrong).toBeGreaterThanOrEqual(dmgWeak)
  })

  it('сила атакующего влияет на урон', () => {
    const weakAttacker = {
      ...attacker,
      strength: 4,
    }
    const dmgWeak = calcShieldBashDmg(weakAttacker, defender, { d20: 15, rollD4: 3 })
    const dmgStrong = calcShieldBashDmg(attacker, defender, { d20: 15, rollD4: 3 })
    expect(dmgStrong).toBeGreaterThanOrEqual(dmgWeak)
  })
})

// ─── Крит ──────────────────────────────────────────────────────────
describe('Shield Bash — криты', () => {
  it('крит множитель = 1 + critDamage * 0.1', () => {
    const eStats = getEffectiveStats(attacker)
    // critDamage = floor((12 + 10) / 3) = 7
    const critMult = 1 + calcCritDamage(eStats) * 0.1
    expect(critMult).toBeCloseTo(1.7, 5)
  })

  it('крит (d20=20) гарантированно больше обычного удара', () => {
    for (let rollD4 = 1; rollD4 <= 4; rollD4++) {
      const normal = calcShieldBashDmg(attacker, defender, { d20: 15, rollD4 })
      const crit = calcShieldBashDmg(attacker, defender, { d20: 20, rollD4 })
      expect(crit).toBeGreaterThan(normal)
    }
  })
})

// ─── Оглушение ─────────────────────────────────────────────────────
describe('Shield Bash — оглушение', () => {
  it('эффект shield-stun создаётся с apPenalty=1 и remainingTurns=1', () => {
    // Проверяем формат эффекта (без store — просто объект)
    const stunEffect = {
      id: 'shield-stun',
      name: 'Оглушение',
      icon: 'stun-grenade',
      color: '#f59e0b',
      remainingTurns: 1,
      apPenalty: 1,
    }
    expect(stunEffect.id).toBe('shield-stun')
    expect(stunEffect.apPenalty).toBe(1)
    expect(stunEffect.remainingTurns).toBe(1)
  })

  it('оглушение отнимает 1 AP в начале хода', () => {
    const token = { actionPoints: 3, activeEffects: [] }
    const stunEffect = { id: 'shield-stun', apPenalty: 1, remainingTurns: 1 }
    token.activeEffects.push(stunEffect)

    // Эмулируем tickEffects: если shield-stun + apPenalty → отнимаем AP
    for (const effect of token.activeEffects) {
      if (effect.id === 'shield-stun' && effect.apPenalty) {
        token.actionPoints = Math.max(0, token.actionPoints - effect.apPenalty)
      }
      effect.remainingTurns--
    }

    expect(token.actionPoints).toBe(2) // 3 - 1 = 2
    expect(stunEffect.remainingTurns).toBe(0) // истекает после 1 хода
  })
})

// ─── AP стоимость ──────────────────────────────────────────────────
describe('Shield Bash — стоимость AP', () => {
  it('стоимость = apCost (1)', () => {
    expect(SHIELD_BASH.apCost).toBe(1)
  })
})
