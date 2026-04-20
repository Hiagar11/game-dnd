import { describe, expect, it } from 'vitest'
import { isStunned, hasStunEffect, getStunEffectName } from './stunMechanics'
import { DEFAULT_AP } from '../constants/combat'

function makeToken(overrides = {}) {
  return {
    uid: 'test-uid',
    name: 'Тестовый',
    hp: 10,
    actionPoints: DEFAULT_AP,
    movementPoints: 6,
    stunned: false,
    captured: false,
    activeEffects: [],
    ...overrides,
  }
}

// apPenalty должен быть ≥ DEFAULT_AP, чтобы isStunned() вернул true
const shieldStunEffect = {
  id: 'shield-stun',
  name: 'Оглушение',
  icon: 'stun-grenade',
  color: '#f59e0b',
  remainingTurns: 1,
  apPenalty: DEFAULT_AP,
}

const weakSlowEffect = {
  id: 'slow',
  name: 'Замедление',
  remainingTurns: 2,
  apPenalty: 1,
}

const poisonEffect = {
  id: 'poison',
  name: 'Отравление',
  remainingTurns: 3,
  damagePerTurn: 2,
}

// ─── isStunned ─────────────────────────────────────────────────────
describe('isStunned', () => {
  it('обычный токен → не оглушён', () => {
    expect(isStunned(makeToken())).toBe(false)
  })

  it('token.stunned = true → оглушён (legacy)', () => {
    expect(isStunned(makeToken({ stunned: true }))).toBe(true)
  })

  it('token.captured = true → оглушён', () => {
    expect(isStunned(makeToken({ captured: true }))).toBe(true)
  })

  it('эффект shield-stun с apPenalty ≥ fullAp → оглушён', () => {
    const token = makeToken({ activeEffects: [shieldStunEffect] })
    expect(isStunned(token, DEFAULT_AP)).toBe(true)
  })

  it('слабый slow (apPenalty < fullAp) → не оглушён', () => {
    const token = makeToken({ activeEffects: [weakSlowEffect] })
    expect(isStunned(token, DEFAULT_AP)).toBe(false)
  })

  it('несколько слабых эффектов суммируются → оглушён', () => {
    const token = makeToken({
      activeEffects: [
        { ...weakSlowEffect, apPenalty: 1 },
        { ...weakSlowEffect, id: 'slow2', apPenalty: 1 },
        { ...weakSlowEffect, id: 'slow3', apPenalty: 1 },
      ],
    })
    expect(isStunned(token, DEFAULT_AP)).toBe(true)
  })

  it('истёкший эффект (remainingTurns = 0) → не считается', () => {
    const expired = { ...shieldStunEffect, remainingTurns: 0 }
    const token = makeToken({ activeEffects: [expired] })
    expect(isStunned(token, DEFAULT_AP)).toBe(false)
  })

  it('null/undefined токен → false', () => {
    expect(isStunned(null)).toBe(false)
    expect(isStunned(undefined)).toBe(false)
  })

  it('эффект без apPenalty (яд) → не оглушён', () => {
    const token = makeToken({ activeEffects: [poisonEffect] })
    expect(isStunned(token, DEFAULT_AP)).toBe(false)
  })
})

// ─── hasStunEffect ─────────────────────────────────────────────────
describe('hasStunEffect', () => {
  it('нет эффектов → false', () => {
    expect(hasStunEffect(makeToken())).toBe(false)
  })

  it('shield-stun с apPenalty = DEFAULT_AP → оглушён', () => {
    const token = makeToken({ activeEffects: [shieldStunEffect] })
    expect(hasStunEffect(token, DEFAULT_AP)).toBe(true)
  })

  it('apPenalty = 1 при fullAp = DEFAULT_AP → false', () => {
    const token = makeToken({ activeEffects: [weakSlowEffect] })
    expect(hasStunEffect(token, DEFAULT_AP)).toBe(false)
  })

  it('пустой activeEffects → false', () => {
    expect(hasStunEffect(makeToken({ activeEffects: [] }))).toBe(false)
  })

  it('null токен → false', () => {
    expect(hasStunEffect(null)).toBe(false)
  })
})

// ─── getStunEffectName ─────────────────────────────────────────────
describe('getStunEffectName', () => {
  it('stunned = true → «Оглушён»', () => {
    expect(getStunEffectName(makeToken({ stunned: true }))).toBe('Оглушён')
  })

  it('captured = true → «Захвачен»', () => {
    expect(getStunEffectName(makeToken({ captured: true }))).toBe('Захвачен')
  })

  it('shield-stun эффект → «Оглушение»', () => {
    const token = makeToken({ activeEffects: [shieldStunEffect] })
    expect(getStunEffectName(token)).toBe('Оглушение')
  })

  it('нет stun-эффектов → null', () => {
    expect(getStunEffectName(makeToken())).toBeNull()
  })

  it('яд без apPenalty → null', () => {
    const token = makeToken({ activeEffects: [poisonEffect] })
    expect(getStunEffectName(token)).toBeNull()
  })

  it('истёкший эффект → null', () => {
    const expired = { ...shieldStunEffect, remainingTurns: 0 }
    const token = makeToken({ activeEffects: [expired] })
    expect(getStunEffectName(token)).toBeNull()
  })
})
