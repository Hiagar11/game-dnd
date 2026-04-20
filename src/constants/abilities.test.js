import { describe, expect, it } from 'vitest'
import {
  ALL_ABILITIES,
  ACTIVE_ABILITIES,
  PASSIVE_ABILITIES,
  COMBAT_ABILITIES,
  UTILITY_ABILITIES,
  getAbilityById,
  GRAVITY_CRUSH,
  HEAL,
  INVISIBILITY,
  TELEPORT,
  REGENERATION,
  POISON_STRIKE,
  BLOOD_BOLT,
  BLOOD_DRAIN,
  GRAVITY_BOLT,
  BLOOD_NOVA,
  DISGUISE,
} from './abilities'

// ─── Структура каталога ────────────────────────────────────────────
describe('abilities — каталог', () => {
  it('содержит 18 способностей', () => {
    expect(ALL_ABILITIES).toHaveLength(18)
  })

  it('все id уникальны', () => {
    const ids = ALL_ABILITIES.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('каждая способность имеет обязательные поля', () => {
    for (const a of ALL_ABILITIES) {
      expect(a).toHaveProperty('id')
      expect(a).toHaveProperty('name')
      expect(a).toHaveProperty('description')
      expect(a).toHaveProperty('icon')
      expect(a).toHaveProperty('color')
      expect(a).toHaveProperty('type')
      expect(a).toHaveProperty('category')
      expect(typeof a.apCost).toBe('number')
    }
  })

  it('type — только active или passive', () => {
    for (const a of ALL_ABILITIES) {
      expect(['active', 'passive']).toContain(a.type)
    }
  })

  it('category — только combat или utility', () => {
    for (const a of ALL_ABILITIES) {
      expect(['combat', 'utility']).toContain(a.category)
    }
  })

  it('areaType — null, single, targeted или self', () => {
    for (const a of ALL_ABILITIES) {
      expect([null, 'single', 'targeted', 'self']).toContain(a.areaType)
    }
  })
})

// ─── Фильтрованные коллекции ───────────────────────────────────────
describe('abilities — коллекции', () => {
  it('ACTIVE + PASSIVE = ALL', () => {
    expect(ACTIVE_ABILITIES.length + PASSIVE_ABILITIES.length).toBe(ALL_ABILITIES.length)
  })

  it('все active имеют type=active', () => {
    for (const a of ACTIVE_ABILITIES) {
      expect(a.type).toBe('active')
    }
  })

  it('все passive имеют type=passive и apCost=0', () => {
    for (const a of PASSIVE_ABILITIES) {
      expect(a.type).toBe('passive')
      expect(a.apCost).toBe(0)
    }
  })

  it('COMBAT содержит только combat', () => {
    for (const a of COMBAT_ABILITIES) {
      expect(a.category).toBe('combat')
    }
  })

  it('UTILITY содержит только utility', () => {
    for (const a of UTILITY_ABILITIES) {
      expect(a.category).toBe('utility')
    }
  })

  it('пассивных способностей 3 (regen, reflect, anchor)', () => {
    expect(PASSIVE_ABILITIES).toHaveLength(3)
  })
})

// ─── getAbilityById ────────────────────────────────────────────────
describe('getAbilityById', () => {
  it('находит способность по id', () => {
    expect(getAbilityById('heal')).toBe(HEAL)
    expect(getAbilityById('gravity-crush')).toBe(GRAVITY_CRUSH)
    expect(getAbilityById('invisibility')).toBe(INVISIBILITY)
  })

  it('возвращает null для несуществующего id', () => {
    expect(getAbilityById('fireball')).toBeNull()
    expect(getAbilityById('')).toBeNull()
    expect(getAbilityById(undefined)).toBeNull()
  })
})

// ─── Конкретные способности (регрессия) ────────────────────────────
describe('abilities — регрессия конкретных способностей', () => {
  it('HEAL: single-target, combat, apCost=2', () => {
    expect(HEAL.areaType).toBe('single')
    expect(HEAL.category).toBe('combat')
    expect(HEAL.apCost).toBe(2)
    expect(HEAL.areaSize).toBe(0)
  })

  it('INVISIBILITY: на себя (areaType=null), utility, apCost=2', () => {
    expect(INVISIBILITY.areaType).toBeNull()
    expect(INVISIBILITY.category).toBe('utility')
    expect(INVISIBILITY.apCost).toBe(2)
  })

  it('TELEPORT: targeted, utility, apCost=3', () => {
    expect(TELEPORT.areaType).toBe('targeted')
    expect(TELEPORT.category).toBe('utility')
    expect(TELEPORT.apCost).toBe(3)
  })

  it('GRAVITY_CRUSH: targeted AoE, areaSize=2, apCost=3', () => {
    expect(GRAVITY_CRUSH.areaType).toBe('targeted')
    expect(GRAVITY_CRUSH.areaSize).toBe(2)
    expect(GRAVITY_CRUSH.apCost).toBe(3)
  })

  it('BLOOD_NOVA: self AoE, areaSize=1, apCost=2', () => {
    expect(BLOOD_NOVA.areaType).toBe('self')
    expect(BLOOD_NOVA.areaSize).toBe(1)
    expect(BLOOD_NOVA.apCost).toBe(2)
  })

  it('DISGUISE: single-target, utility, apCost=1', () => {
    expect(DISGUISE.areaType).toBe('single')
    expect(DISGUISE.category).toBe('utility')
    expect(DISGUISE.apCost).toBe(1)
  })

  it('REGENERATION: passive, combat, areaType=null', () => {
    expect(REGENERATION.type).toBe('passive')
    expect(REGENERATION.category).toBe('combat')
    expect(REGENERATION.areaType).toBeNull()
  })

  it('магические снаряды: single-target, combat, apCost=2', () => {
    for (const a of [BLOOD_BOLT, GRAVITY_BOLT, BLOOD_DRAIN]) {
      expect(a.areaType).toBe('single')
      expect(a.category).toBe('combat')
      expect(a.apCost).toBe(2)
    }
  })

  it('POISON_STRIKE: single-target, combat, apCost=2', () => {
    expect(POISON_STRIKE.areaType).toBe('single')
    expect(POISON_STRIKE.category).toBe('combat')
    expect(POISON_STRIKE.apCost).toBe(2)
  })

  it('все цвета — валидные hex-строки', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/
    for (const a of ALL_ABILITIES) {
      expect(a.color).toMatch(hexPattern)
    }
  })
})
