import { describe, expect, it } from 'vitest'
import { applyHostileAct } from './combatTrigger'

const hero = (overrides = {}) => ({ uid: 'h', tokenType: 'hero', ...overrides })
const npc = (attitude, overrides = {}) => ({
  uid: `n-${attitude}`,
  tokenType: 'npc',
  attitude,
  ...overrides,
})

describe('applyHostileAct', () => {
  it('агрит нейтральную цель и возвращает true вне боя', () => {
    const store = { combatMode: false }
    const attacker = hero()
    const target = npc('neutral')

    expect(applyHostileAct(store, attacker, target)).toBe(true)
    expect(target.attitude).toBe('hostile')
  })

  it('агрит нейтрального атакующего — больше не «мирный»', () => {
    const store = { combatMode: false }
    const attacker = npc('neutral', { uid: 'a' })
    const target = hero()

    expect(applyHostileAct(store, attacker, target)).toBe(true)
    expect(attacker.attitude).toBe('hostile')
  })

  it('два нейтрала, начавшие конфликт, оба становятся hostile', () => {
    const store = { combatMode: false }
    const attacker = npc('neutral', { uid: 'a' })
    const target = npc('neutral', { uid: 'b' })

    expect(applyHostileAct(store, attacker, target)).toBe(true)
    expect(attacker.attitude).toBe('hostile')
    expect(target.attitude).toBe('hostile')
  })

  it('возвращает false, если бой уже идёт (но всё равно агрит)', () => {
    const store = { combatMode: true, initiativeOrder: [] }
    const attacker = hero()
    const target = npc('neutral')

    expect(applyHostileAct(store, attacker, target)).toBe(false)
    expect(target.attitude).toBe('hostile')
  })

  it('во время боя враг атакует нейтрала → нейтрал становится friendly', () => {
    const store = { combatMode: true, initiativeOrder: [] }
    const attacker = npc('hostile', { uid: 'enemy' })
    const target = npc('neutral', { uid: 'bystander' })

    expect(applyHostileAct(store, attacker, target)).toBe(false)
    expect(target.attitude).toBe('friendly')
  })

  it('во время боя нейтрал вне очереди инициативы получает joinCombat', () => {
    const joined = []
    const target = npc('neutral', { uid: 'bystander' })
    const store = {
      combatMode: true,
      initiativeOrder: [],
      joinCombat: (uid) => joined.push(uid),
    }
    const attacker = hero()

    applyHostileAct(store, attacker, target)

    expect(joined).toContain('bystander')
  })

  it('во время боя токен, уже в очереди инициативы, joinCombat не вызывается', () => {
    const joined = []
    const target = npc('hostile', { uid: 'already' })
    const store = {
      combatMode: true,
      initiativeOrder: [{ uid: 'already' }],
      joinCombat: (uid) => joined.push(uid),
    }
    const attacker = hero()

    applyHostileAct(store, attacker, target)

    expect(joined).toHaveLength(0)
  })

  it('атака по враждебному NPC стартует бой (без флипа атрибутов)', () => {
    const store = { combatMode: false }
    const attacker = hero()
    const target = npc('hostile')

    expect(applyHostileAct(store, attacker, target)).toBe(true)
    expect(target.attitude).toBe('hostile')
  })

  it('AoE: принимает массив целей, агрит каждого нейтрала', () => {
    const store = { combatMode: false }
    const attacker = hero()
    const targets = [
      npc('neutral', { uid: 'a' }),
      npc('hostile', { uid: 'b' }),
      npc('neutral', { uid: 'c' }),
    ]

    expect(applyHostileAct(store, attacker, targets)).toBe(true)
    expect(targets[0].attitude).toBe('hostile')
    expect(targets[1].attitude).toBe('hostile')
    expect(targets[2].attitude).toBe('hostile')
  })

  it('игнорирует системные токены среди целей', () => {
    const store = { combatMode: false }
    const attacker = hero()
    const targets = [{ uid: 'sys', tokenType: 'npc', systemToken: true, attitude: 'neutral' }]

    expect(applyHostileAct(store, attacker, targets)).toBe(false)
  })

  it('возвращает false, если атакующий — системный токен', () => {
    const store = { combatMode: false }
    const attacker = { uid: 'sys', tokenType: 'npc', systemToken: true }
    const target = npc('neutral')

    expect(applyHostileAct(store, attacker, target)).toBe(false)
    expect(target.attitude).toBe('neutral')
  })

  it('самоатака игнорируется (uid совпадает)', () => {
    const store = { combatMode: false }
    const self = hero()

    expect(applyHostileAct(store, self, self)).toBe(false)
  })
})
