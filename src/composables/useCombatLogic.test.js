import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

// Подавляем Vue-предупреждение о lifecycle-хуке вне компонента
vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, onBeforeUnmount: vi.fn() }
})

vi.mock('./useSound', () => ({
  playFist: vi.fn(),
  playSuccess: vi.fn(),
  playMiss: vi.fn(),
}))

import { useCombatLogic } from './useCombatLogic'

function makeStore(overrides = {}) {
  return {
    combatPair: null,
    spendActionPoint: vi.fn(() => true),
    endTurn: vi.fn(),
    editPlacedToken: vi.fn(),
    checkCombatEnd: vi.fn(),
    ...overrides,
  }
}

describe('useCombatLogic', () => {
  it('не начинает атаку, если атакующий не в смежной клетке', async () => {
    const store = makeStore()
    const heroToken = ref({ uid: 'h1', col: 0, row: 0, actionPoints: 3 })
    const npcToken = ref({ uid: 'n1', col: 10, row: 10, actionPoints: 3, hp: 10, tokenType: 'npc' })
    const emitClose = vi.fn()

    const api = useCombatLogic({ store, heroToken, npcToken, emitClose })
    await api.onPunch(false)

    expect(store.spendActionPoint).not.toHaveBeenCalled()
    expect(store.editPlacedToken).not.toHaveBeenCalled()
    expect(api.phase.value).toBe('idle')
    expect(emitClose).not.toHaveBeenCalled()
  })

  it('не позволяет атаковать вне своего хода в боевом режиме', async () => {
    const store = makeStore({
      combatMode: true,
      initiativeOrder: [{ uid: 'n1' }, { uid: 'h1' }],
      currentInitiativeIndex: 0,
    })
    const heroToken = ref({ uid: 'h1', col: 2, row: 0, actionPoints: 3 })
    const npcToken = ref({ uid: 'n1', col: 0, row: 0, actionPoints: 3, hp: 10, tokenType: 'npc' })
    const emitClose = vi.fn()

    const api = useCombatLogic({ store, heroToken, npcToken, emitClose })
    await api.onPunch(false)

    expect(store.spendActionPoint).not.toHaveBeenCalled()
    expect(store.editPlacedToken).not.toHaveBeenCalled()
    expect(api.phase.value).toBe('idle')
    expect(emitClose).not.toHaveBeenCalled()
  })

  it('не продолжает атаку при нехватке AP (spendActionPoint=false)', async () => {
    const store = makeStore({ spendActionPoint: vi.fn(() => false) })
    const heroToken = ref({ uid: 'h1', col: 2, row: 0, actionPoints: 0 })
    const npcToken = ref({ uid: 'n1', col: 0, row: 0, actionPoints: 3, hp: 10, tokenType: 'npc' })
    const emitClose = vi.fn()

    const api = useCombatLogic({ store, heroToken, npcToken, emitClose })
    await api.onPunch(false)

    expect(store.spendActionPoint).toHaveBeenCalledTimes(1)
    expect(store.spendActionPoint).toHaveBeenCalledWith('h1', 1)
    expect(store.editPlacedToken).not.toHaveBeenCalled()
    expect(api.phase.value).toBe('idle')
    expect(emitClose).not.toHaveBeenCalled()
  })

  it('не даёт NPC под провокацией атаковать не-провокатора', async () => {
    const store = makeStore({
      placedTokens: [
        { uid: 'h1', hp: 10, tokenType: 'hero' },
        { uid: 'h2', hp: 10, tokenType: 'hero' },
        {
          uid: 'n1',
          hp: 10,
          tokenType: 'npc',
          activeEffects: [{ id: 'taunt', byUid: 'h2', remainingTurns: 2 }],
        },
      ],
    })
    const heroToken = ref({ uid: 'h1', col: 2, row: 0, actionPoints: 3, hp: 10, tokenType: 'hero' })
    const npcToken = ref({
      uid: 'n1',
      col: 0,
      row: 0,
      actionPoints: 3,
      hp: 10,
      tokenType: 'npc',
      activeEffects: [{ id: 'taunt', byUid: 'h2', remainingTurns: 2 }],
    })
    const emitClose = vi.fn()

    const api = useCombatLogic({ store, heroToken, npcToken, emitClose })
    await api.onPunch(true)

    expect(store.spendActionPoint).not.toHaveBeenCalled()
    expect(store.editPlacedToken).not.toHaveBeenCalled()
    expect(api.phase.value).toBe('idle')
    expect(api.resultText.value).toBe('Под провокацией: цель фиксирована')
  })
})
