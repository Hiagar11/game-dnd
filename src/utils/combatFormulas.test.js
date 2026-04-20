import { describe, expect, it } from 'vitest'
import {
  HIT_DC,
  DUAL_WIELD_HIT_PENALTY,
  getEffectiveStats,
  calcCritChance,
  calcEvasion,
  calcBlock,
  calcCritDamage,
  calcArmorPen,
  calcMagicPen,
  calcMagicResist,
  calcPerception,
  calcInitiative,
  calcLuck,
  calcStealth,
  calcHealing,
  calcPersuasion,
  calcDeception,
  calcMaxHp,
  getActiveWeapon,
  isMagicWeapon,
  getWeaponDamageRange,
  getAttackApCost,
  rollWeaponDamage,
  rollOffhandDamage,
  calcTotalArmor,
  isDualWielding,
} from './combatFormulas'

// ─── Константы ─────────────────────────────────────────────────────
describe('combatFormulas — константы', () => {
  it('HIT_DC = 10', () => {
    expect(HIT_DC).toBe(10)
  })

  it('DUAL_WIELD_HIT_PENALTY = 2', () => {
    expect(DUAL_WIELD_HIT_PENALTY).toBe(2)
  })
})

// ─── getEffectiveStats ─────────────────────────────────────────────
describe('getEffectiveStats', () => {
  it('возвращает базовые статы без расы', () => {
    const token = { strength: 10, agility: 8, intellect: 6, charisma: 4 }
    const stats = getEffectiveStats(token)
    expect(stats).toEqual({ strength: 10, agility: 8, intellect: 6, charisma: 4 })
  })

  it('возвращает нули для пустого токена', () => {
    const stats = getEffectiveStats(null)
    expect(stats).toEqual({ strength: 0, agility: 0, intellect: 0, charisma: 0 })
  })

  it('возвращает нули для undefined', () => {
    const stats = getEffectiveStats(undefined)
    expect(stats).toEqual({ strength: 0, agility: 0, intellect: 0, charisma: 0 })
  })
})

// ─── Производные характеристики ────────────────────────────────────
describe('combatFormulas — производные характеристики', () => {
  // Токен с известными статами для предсказуемых результатов
  const token = { strength: 10, agility: 12, intellect: 8, charisma: 6 }

  it('calcCritChance = floor((agi*3 + int) / 5)', () => {
    // (12*3 + 8) / 5 = 44/5 = 8.8 → 8
    expect(calcCritChance(token)).toBe(8)
  })

  it('calcEvasion = floor((agi*2 + cha + str) / 5)', () => {
    // (12*2 + 6 + 10) / 5 = 40/5 = 8
    expect(calcEvasion(token)).toBe(8)
  })

  it('calcBlock = floor((str*2 + agi) / 4)', () => {
    // (10*2 + 12) / 4 = 32/4 = 8
    expect(calcBlock(token)).toBe(8)
  })

  it('calcCritDamage = floor((str + agi) / 3)', () => {
    // (10 + 12) / 3 = 22/3 = 7.33 → 7
    expect(calcCritDamage(token)).toBe(7)
  })

  it('calcArmorPen = floor((str*2 + agi) / 5)', () => {
    // (10*2 + 12) / 5 = 32/5 = 6.4 → 6
    expect(calcArmorPen(token)).toBe(6)
  })

  it('calcMagicPen = floor((int*2 + cha) / 4)', () => {
    // (8*2 + 6) / 4 = 22/4 = 5.5 → 5
    expect(calcMagicPen(token)).toBe(5)
  })

  it('calcMagicResist = floor((cha*2 + int + str) / 4)', () => {
    // (6*2 + 8 + 10) / 4 = 30/4 = 7.5 → 7
    expect(calcMagicResist(token)).toBe(7)
  })

  it('calcPerception = floor((int*3 + agi) / 4)', () => {
    // (8*3 + 12) / 4 = 36/4 = 9
    expect(calcPerception(token)).toBe(9)
  })

  it('calcInitiative = floor((agi*2 + int) / 3)', () => {
    // (12*2 + 8) / 3 = 32/3 = 10.67 → 10
    expect(calcInitiative(token)).toBe(10)
  })

  it('calcLuck = floor((cha*2 + agi) / 4)', () => {
    // (6*2 + 12) / 4 = 24/4 = 6
    expect(calcLuck(token)).toBe(6)
  })

  it('calcStealth = floor((agi*2 + int) / 4)', () => {
    // (12*2 + 8) / 4 = 32/4 = 8
    expect(calcStealth(token)).toBe(8)
  })

  it('calcHealing = floor((int*2 + cha + str) / 5)', () => {
    // (8*2 + 6 + 10) / 5 = 32/5 = 6.4 → 6
    expect(calcHealing(token)).toBe(6)
  })

  it('calcPersuasion = floor((cha*3 + int) / 4)', () => {
    // (6*3 + 8) / 4 = 26/4 = 6.5 → 6
    expect(calcPersuasion(token)).toBe(6)
  })

  it('calcDeception = floor((cha*2 + agi + int) / 4)', () => {
    // (6*2 + 12 + 8) / 4 = 32/4 = 8
    expect(calcDeception(token)).toBe(8)
  })

  it('все формулы возвращают 0 для нулевых статов', () => {
    const zero = { strength: 0, agility: 0, intellect: 0, charisma: 0 }
    expect(calcCritChance(zero)).toBe(0)
    expect(calcEvasion(zero)).toBe(0)
    expect(calcBlock(zero)).toBe(0)
    expect(calcCritDamage(zero)).toBe(0)
    expect(calcArmorPen(zero)).toBe(0)
    expect(calcMagicPen(zero)).toBe(0)
    expect(calcMagicResist(zero)).toBe(0)
  })

  it('все формулы устойчивы к null/undefined', () => {
    expect(calcCritChance(null)).toBe(0)
    expect(calcEvasion(undefined)).toBe(0)
    expect(calcBlock({})).toBe(0)
  })
})

// ─── calcMaxHp ─────────────────────────────────────────────────────
describe('calcMaxHp', () => {
  it('базовый расчёт: 10 + str*2 + agi', () => {
    expect(calcMaxHp(10, 8)).toBe(38) // 10 + 20 + 8
    expect(calcMaxHp(5, 5)).toBe(25) // 10 + 10 + 5
  })

  it('нулевые статы → 10 HP', () => {
    expect(calcMaxHp(0, 0)).toBe(10)
  })

  it('дефолтные аргументы → 10', () => {
    expect(calcMaxHp()).toBe(10)
  })
})

// ─── Оружие ────────────────────────────────────────────────────────
describe('combatFormulas — оружие', () => {
  const sword = { baseDamage: { min: 3, max: 8 }, apCost: 1, slot: 'weapon' }
  const staff = { baseDamage: { min: 2, max: 6 }, apCost: 2, slot: 'magic_weapon' }
  const dagger = { baseDamage: { min: 1, max: 4 }, apCost: 1, slot: 'weapon' }

  const heroWithSword = {
    activeWeaponSlot: 'weapon',
    inventory: { equipped: { weapon: sword } },
  }

  const heroWithStaff = {
    activeWeaponSlot: 'weapon',
    inventory: { equipped: { weapon: staff } },
  }

  const npcWithWeapon = {
    npcWeapon: sword,
  }

  it('getActiveWeapon — герой с мечом', () => {
    expect(getActiveWeapon(heroWithSword)).toBe(sword)
  })

  it('getActiveWeapon — NPC с оружием', () => {
    expect(getActiveWeapon(npcWithWeapon)).toBe(sword)
  })

  it('getActiveWeapon — без оружия → null', () => {
    expect(getActiveWeapon({})).toBeNull()
    expect(getActiveWeapon(null)).toBeNull()
  })

  it('isMagicWeapon — посох = true', () => {
    expect(isMagicWeapon(heroWithStaff)).toBe(true)
  })

  it('isMagicWeapon — меч = false', () => {
    expect(isMagicWeapon(heroWithSword)).toBe(false)
  })

  it('getWeaponDamageRange — возвращает baseDamage оружия', () => {
    expect(getWeaponDamageRange(heroWithSword)).toEqual({ min: 3, max: 8 })
  })

  it('getWeaponDamageRange — без оружия → {min:1, max:1}', () => {
    expect(getWeaponDamageRange({})).toEqual({ min: 1, max: 1 })
  })

  it('getAttackApCost — возвращает apCost оружия', () => {
    expect(getAttackApCost(heroWithSword)).toBe(1)
    expect(getAttackApCost(heroWithStaff)).toBe(2)
  })

  it('getAttackApCost — без оружия → 1', () => {
    expect(getAttackApCost({})).toBe(1)
  })

  it('rollWeaponDamage — результат в диапазоне [min, max]', () => {
    // min при random=0
    expect(rollWeaponDamage(heroWithSword, () => 0)).toBe(3)
    // max при random=0.999
    expect(rollWeaponDamage(heroWithSword, () => 0.999)).toBe(8)
  })

  it('rollWeaponDamage — без оружия → 1', () => {
    expect(rollWeaponDamage({}, () => 0.5)).toBe(1)
  })

  it('isDualWielding — оружие в обеих руках', () => {
    const dual = {
      activeWeaponSlot: 'weapon',
      inventory: { equipped: { weapon: sword, offhand: dagger } },
    }
    expect(isDualWielding(dual)).toBe(true)
  })

  it('isDualWielding — щит в оффхенде → false', () => {
    const shielded = {
      activeWeaponSlot: 'weapon',
      inventory: { equipped: { weapon: sword, offhand: { slot: 'shield', baseArmor: 3 } } },
    }
    expect(isDualWielding(shielded)).toBe(false)
  })

  it('rollOffhandDamage — половина ролла оффхенда', () => {
    const dual = {
      activeWeaponSlot: 'weapon',
      inventory: { equipped: { weapon: sword, offhand: dagger } },
    }
    // dagger: min=1, max=4; random=0 → roll=1, half=0 → max(1,0)=1
    expect(rollOffhandDamage(dual, () => 0)).toBe(1)
    // random=0.999 → roll=4, half=2
    expect(rollOffhandDamage(dual, () => 0.999)).toBe(2)
  })

  it('rollOffhandDamage — без оффхенда → 0', () => {
    expect(rollOffhandDamage(heroWithSword, () => 0.5)).toBe(0)
  })
})

// ─── Броня ─────────────────────────────────────────────────────────
describe('calcTotalArmor', () => {
  it('суммирует baseArmor со всей экипировки', () => {
    const token = {
      inventory: {
        equipped: {
          helmet: { baseArmor: 2 },
          armor: { baseArmor: 5 },
          legs: { baseArmor: 3 },
          boots: { baseArmor: 1 },
          offhand: { baseArmor: 4, slot: 'shield' },
        },
      },
    }
    expect(calcTotalArmor(token)).toBe(15)
  })

  it('без экипировки → 0', () => {
    expect(calcTotalArmor({})).toBe(0)
    expect(calcTotalArmor(null)).toBe(0)
  })

  it('предметы без baseArmor не ломают расчёт', () => {
    const token = {
      inventory: {
        equipped: {
          weapon: { baseDamage: { min: 3, max: 8 } }, // оружие без брони
          armor: { baseArmor: 5 },
        },
      },
    }
    expect(calcTotalArmor(token)).toBe(5)
  })
})
