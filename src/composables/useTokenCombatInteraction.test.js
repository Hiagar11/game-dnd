import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useTokenCombatInteraction } from './useTokenCombatInteraction'

vi.mock('./useSound', () => ({
  playFist: vi.fn(),
  playSuccess: vi.fn(),
  playMiss: vi.fn(),
}))

function makeStore(overrides = {}) {
  return {
    placedTokens: [],
    halfCell: 30,
    gridNormOX: 0,
    gridNormOY: 0,
    spendActionPoint: vi.fn(() => true),
    editPlacedToken: vi.fn(function (uid, fields) {
      const token = this.placedTokens.find((t) => t.uid === uid)
      if (token) Object.assign(token, fields)
    }),
    endTurn: vi.fn(),
    checkCombatEnd: vi.fn(),
    ...overrides,
  }
}

describe('runBerserkerAttack', () => {
  let damageFloatRef
  beforeEach(() => {
    damageFloatRef = ref({ spawn: vi.fn() })
  })

  it('наносит 90% от текущего HP цели', () => {
    const attacker = { uid: 'h', tokenType: 'hero', col: 0, row: 0, actionPoints: 2, name: 'H' }
    const defender = { uid: 'd', tokenType: 'npc', col: 1, row: 1, hp: 100 }
    const store = makeStore({ placedTokens: [attacker, defender] })

    const { runBerserkerAttack } = useTokenCombatInteraction({
      store,
      damageFloatRef,
      getSocket: () => null,
    })

    runBerserkerAttack(attacker, defender)

    // 100 * 0.9 = 90 → HP должно стать 10
    expect(defender.hp).toBe(10)
  })

  it('при HP=10 наносит 9 урона (остаётся 1)', () => {
    const attacker = { uid: 'h', tokenType: 'hero', col: 0, row: 0, actionPoints: 2, name: 'H' }
    const defender = { uid: 'd', tokenType: 'npc', col: 1, row: 1, hp: 10 }
    const store = makeStore({ placedTokens: [attacker, defender] })

    const { runBerserkerAttack } = useTokenCombatInteraction({
      store,
      damageFloatRef,
      getSocket: () => null,
    })

    runBerserkerAttack(attacker, defender)

    expect(defender.hp).toBe(1)
  })

  it('при HP=1 добивает (минимум 1 урона)', () => {
    const attacker = { uid: 'h', tokenType: 'hero', col: 0, row: 0, actionPoints: 2, name: 'H' }
    const defender = { uid: 'd', tokenType: 'npc', col: 1, row: 1, hp: 1 }
    const store = makeStore({ placedTokens: [attacker, defender] })

    const { runBerserkerAttack } = useTokenCombatInteraction({
      store,
      damageFloatRef,
      getSocket: () => null,
    })

    runBerserkerAttack(attacker, defender)

    expect(defender.hp).toBe(0)
    // NPC с HP=0 → stunned
    expect(defender.stunned).toBe(true)
  })
})
