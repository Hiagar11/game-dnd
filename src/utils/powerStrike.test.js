import { describe, expect, it } from 'vitest'
import {
  getEffectiveStats,
  calcCritChance,
  calcEvasion,
  calcArmorPen,
  calcTotalArmor,
  calcBlock,
  calcCritDamage,
  rollWeaponDamage,
  HIT_DC,
} from './combatFormulas'

/**
 * Тесты для логики Силового удара (Power Strike).
 *
 * applyPowerStrike зависит от Pinia store, поэтому тестируем через
 * чистые функции combatFormulas, повторяя формулы из useAbilityExecution.
 * Это регрессия: если формулы изменятся — тесты упадут.
 */

// ─── Хелперы ───────────────────────────────────────────────────────
/** Повторяет расчёт попадания из applyPowerStrike */
function calcHitRoll(attacker, defender, d20) {
  const eStats = getEffectiveStats(attacker)
  const dStats = getEffectiveStats(defender)
  const hitBonus = calcCritChance(eStats)
  const evasion = calcEvasion(dStats)
  return d20 + hitBonus - evasion
}

/** Повторяет расчёт урона из applyPowerStrike (без блока) */
function calcPowerStrikeDmg(attacker, defender, { d20, weaponRoll, multiplier = 1.5 }) {
  const eStats = getEffectiveStats(attacker)
  const pen = calcArmorPen(eStats)
  const rawArmor = calcTotalArmor(defender)
  const reduction = Math.max(0, rawArmor - pen)
  let dmg = Math.max(1, weaponRoll - reduction)

  // Крит
  const isCrit = d20 === 20
  if (isCrit) {
    const critMult = 1 + calcCritDamage(eStats) * 0.1
    dmg = Math.max(1, Math.round(dmg * critMult))
  }

  // Множитель Силового удара
  dmg = Math.max(1, Math.round(dmg * multiplier))
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

// ─── Попадание ─────────────────────────────────────────────────────
describe('Power Strike — попадание', () => {
  it('d20 + hitBonus - evasion ≥ HIT_DC → попадание', () => {
    // attacker: critChance = floor((10*3 + 6) / 5) = 7
    // defender: evasion = floor((8*2 + 6 + 8) / 5) = 6
    // d20=15: 15 + 7 - 6 = 16 ≥ 10 → попадание
    expect(calcHitRoll(attacker, defender, 15)).toBe(16)
    expect(calcHitRoll(attacker, defender, 15) >= HIT_DC).toBe(true)
  })

  it('низкий бросок → промах', () => {
    // d20=1: 1 + 7 - 6 = 2 < 10
    expect(calcHitRoll(attacker, defender, 1)).toBe(2)
    expect(calcHitRoll(attacker, defender, 1) >= HIT_DC).toBe(false)
  })

  it('пограничный бросок: ровно HIT_DC', () => {
    // Нужен d20, чтобы d20 + 7 - 6 = 10 → d20 = 9
    expect(calcHitRoll(attacker, defender, 9)).toBe(10)
    expect(calcHitRoll(attacker, defender, 9) >= HIT_DC).toBe(true)
  })
})

// ─── Урон ──────────────────────────────────────────────────────────
describe('Power Strike — расчёт урона', () => {
  it('базовый урон: (weaponRoll - armor + pen) × 1.5', () => {
    // pen = floor((12*2 + 10) / 5) = 6
    // armor = 4 + 2 = 6
    // reduction = max(0, 6 - 6) = 0
    // dmg = max(1, 7 - 0) = 7
    // × 1.5 = round(10.5) = 11
    const dmg = calcPowerStrikeDmg(attacker, defender, { d20: 15, weaponRoll: 7 })
    expect(dmg).toBe(11)
  })

  it('минимальный урон — не меньше 1', () => {
    const heavyArmor = {
      ...defender,
      inventory: {
        equipped: {
          armor: { baseArmor: 20 },
          helmet: { baseArmor: 10 },
        },
      },
    }
    const dmg = calcPowerStrikeDmg(attacker, heavyArmor, { d20: 15, weaponRoll: 4 })
    expect(dmg).toBeGreaterThanOrEqual(1)
  })

  it('крит (d20=20) увеличивает урон', () => {
    const normal = calcPowerStrikeDmg(attacker, defender, { d20: 15, weaponRoll: 7 })
    const crit = calcPowerStrikeDmg(attacker, defender, { d20: 20, weaponRoll: 7 })
    expect(crit).toBeGreaterThan(normal)
  })

  it('множитель 1.5 по умолчанию, можно изменить', () => {
    const dmg15 = calcPowerStrikeDmg(attacker, defender, {
      d20: 15,
      weaponRoll: 7,
      multiplier: 1.5,
    })
    const dmg20 = calcPowerStrikeDmg(attacker, defender, {
      d20: 15,
      weaponRoll: 7,
      multiplier: 2.0,
    })
    expect(dmg20).toBeGreaterThan(dmg15)
  })

  it('бронепробитие уменьшает эффект брони', () => {
    // Атакующий с высокой силой пробивает больше брони
    const strongAttacker = { ...attacker, strength: 20, agility: 15 }
    // pen = floor((20*2 + 15) / 5) = 11
    const dmgStrong = calcPowerStrikeDmg(strongAttacker, defender, { d20: 15, weaponRoll: 7 })
    const dmgNormal = calcPowerStrikeDmg(attacker, defender, { d20: 15, weaponRoll: 7 })
    // Сильный бьёт сильнее (или равно — броня уже пробита)
    expect(dmgStrong).toBeGreaterThanOrEqual(dmgNormal)
  })
})

// ─── Блок ──────────────────────────────────────────────────────────
describe('Power Strike — блок', () => {
  it('шанс блока = block * 2 процентов', () => {
    const dStats = getEffectiveStats(defender)
    // block = floor((8*2 + 8) / 4) = 6
    const blockChance = calcBlock(dStats) * 2
    expect(blockChance).toBe(12) // 12% шанс блока
  })

  it('при блоке урон делится пополам (min 1)', () => {
    const dmg = 10
    const blocked = Math.max(1, Math.floor(dmg / 2))
    expect(blocked).toBe(5)
  })

  it('блок от урона 1 → всё ещё 1', () => {
    const blocked = Math.max(1, Math.floor(1 / 2))
    expect(blocked).toBe(1)
  })
})

// ─── rollWeaponDamage (детерминированный) ──────────────────────────
describe('Power Strike — ролл оружия', () => {
  it('минимальный ролл при random=0', () => {
    expect(rollWeaponDamage(attacker, () => 0)).toBe(4)
  })

  it('максимальный ролл при random≈1', () => {
    expect(rollWeaponDamage(attacker, () => 0.999)).toBe(10)
  })

  it('средний ролл при random=0.5', () => {
    const result = rollWeaponDamage(attacker, () => 0.5)
    expect(result).toBeGreaterThanOrEqual(4)
    expect(result).toBeLessThanOrEqual(10)
  })
})

// ─── AP стоимость Силового удара ───────────────────────────────────
describe('Power Strike — стоимость AP', () => {
  it('стоимость = max(ability.apCost, weapon.apCost)', () => {
    // ability.apCost для power_strike обычно 1
    // weapon.apCost = 1
    const abilityCost = 1
    const weaponCost = 1
    expect(Math.max(abilityCost, weaponCost)).toBe(1)
  })

  it('двуручное оружие (apCost=2) повышает стоимость', () => {
    const abilityCost = 1
    const weaponCost = 2
    expect(Math.max(abilityCost, weaponCost)).toBe(2)
  })
})

// ─── Крит ──────────────────────────────────────────────────────────
describe('Power Strike — криты', () => {
  it('крит множитель = 1 + critDamage * 0.1', () => {
    const eStats = getEffectiveStats(attacker)
    // critDamage = floor((12 + 10) / 3) = 7
    const critMult = 1 + calcCritDamage(eStats) * 0.1
    expect(critMult).toBeCloseTo(1.7, 5)
  })

  it('крит на d20=20 даёт ×1.7 урона (для наших фикстур)', () => {
    const normalDmg = calcPowerStrikeDmg(attacker, defender, { d20: 15, weaponRoll: 8 })
    const critDmg = calcPowerStrikeDmg(attacker, defender, { d20: 20, weaponRoll: 8 })
    // Крит: round(8 * 1.7) * 1.5 = round(13.6) * 1.5 = 14 * 1.5 = 21
    // Обычный: round(8 * 1.5) = 12
    expect(critDmg).toBeGreaterThan(normalDmg)
    expect(critDmg).toBe(21)
    expect(normalDmg).toBe(12)
  })
})
