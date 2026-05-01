import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

let mockStore

vi.mock('../stores/game', () => ({
  useGameStore: () => mockStore,
}))

const getExecutorMock = vi.fn()
vi.mock('../abilities/registry', () => ({
  getExecutor: (...args) => getExecutorMock(...args),
}))

vi.mock('./useSound', () => ({
  playMiss: vi.fn(),
  playTauntCry: vi.fn(),
  playCleaveStab: vi.fn(),
  playCleaveCrack: vi.fn(),
  playRushScream: vi.fn(),
  playRushImpact: vi.fn(),
  playShadowEnter: vi.fn(),
  playShadowExit: vi.fn(),
}))

vi.mock('./useFogVisibility', () => ({
  useFogVisibility: () => ({ isAreaVisible: () => true }),
}))

import { useAbilityExecution } from './useAbilityExecution'

function makeStore(overrides = {}) {
  return {
    pendingAbility: null,
    combatMode: false,
    endTurn: vi.fn(),
    placedTokens: [],
    abilityVfx: null,
    cellSize: 60,
    gridNormOX: 0,
    gridNormOY: 0,
    calcMaxHp: vi.fn((token) => token.maxHp ?? 10),
    ...overrides,
  }
}

describe('useAbilityExecution', () => {
  beforeEach(() => {
    getExecutorMock.mockReset()
  })

  it('списывает AP, очищает pendingAbility и вызывает endTurn при нуле AP в бою', () => {
    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      actionPoints: 2,
      col: 0,
      row: 0,
      inventory: { equipped: { weapon: { apCost: 1, baseDamage: { min: 1, max: 2 } } } },
    }
    const target = { uid: 'npc-1', tokenType: 'npc', hp: 10, col: 1, row: 0 }

    mockStore = makeStore({
      combatMode: true,
      pendingAbility: { id: 'test_ability', areaType: 'single', apCost: 2, tokenUid: caster.uid },
      placedTokens: [caster, target],
    })

    const executor = vi.fn()
    getExecutorMock.mockReturnValue(executor)

    const damageFloatRef = ref({ spawn: vi.fn() })
    const flash = vi.fn()
    const api = useAbilityExecution(damageFloatRef, flash)

    const ok = api.executeAbility(target)

    expect(ok).toBe(true)
    expect(executor).toHaveBeenCalledTimes(1)
    expect(caster.actionPoints).toBe(0)
    expect(mockStore.pendingAbility).toBeNull()
    expect(mockStore.endTurn).toHaveBeenCalledTimes(1)
  })

  it('при skipAutoEndTurn не завершает ход автоматически', () => {
    const caster = { uid: 'hero-1', tokenType: 'hero', actionPoints: 1, col: 0, row: 0 }
    const target = { uid: 'npc-1', tokenType: 'npc', hp: 10, col: 1, row: 0 }

    mockStore = makeStore({
      combatMode: true,
      pendingAbility: {
        id: 'quick_step',
        areaType: 'single',
        apCost: 1,
        tokenUid: caster.uid,
        skipAutoEndTurn: true,
      },
      placedTokens: [caster, target],
    })

    getExecutorMock.mockReturnValue(vi.fn())

    const api = useAbilityExecution(ref(null), vi.fn())
    const ok = api.executeAbility(target)

    expect(ok).toBe(true)
    expect(caster.actionPoints).toBe(0)
    expect(mockStore.endTurn).not.toHaveBeenCalled()
  })

  it('учитывает weaponApScaling и блокирует каст при нехватке AP', () => {
    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      actionPoints: 2,
      inventory: { equipped: { weapon: { apCost: 3, baseDamage: { min: 1, max: 3 } } } },
    }
    const target = { uid: 'npc-1', tokenType: 'npc' }

    mockStore = makeStore({
      pendingAbility: {
        id: 'scaled_strike',
        areaType: 'single',
        apCost: 1,
        weaponApScaling: true,
        tokenUid: caster.uid,
      },
      placedTokens: [caster, target],
    })

    const executor = vi.fn()
    getExecutorMock.mockReturnValue(executor)

    const api = useAbilityExecution(ref(null), vi.fn())
    const ok = api.executeAbility(target)

    expect(ok).toBe(false)
    expect(executor).not.toHaveBeenCalled()
    expect(caster.actionPoints).toBe(2)
    expect(mockStore.pendingAbility).not.toBeNull()
  })

  it('блокирует cleave при нехватке AP даже вне боя', () => {
    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      actionPoints: 2,
      col: 0,
      row: 0,
    }

    mockStore = makeStore({
      combatMode: false,
      pendingAbility: {
        id: 'cleave',
        areaType: 'targeted',
        apCost: 3,
        tokenUid: caster.uid,
      },
      placedTokens: [caster],
    })

    const executor = vi.fn()
    getExecutorMock.mockReturnValue(executor)

    const api = useAbilityExecution(ref(null), vi.fn())
    const ok = api.executeAbility({ col: 2, row: 2 })

    expect(ok).toBe(false)
    expect(executor).not.toHaveBeenCalled()
    expect(caster.actionPoints).toBe(2)
    expect(mockStore.pendingAbility).not.toBeNull()
  })

  it('consumeAllActionPoints: каст проходит при любом положительном AP, обнуляет AP и завершает ход', () => {
    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      actionPoints: 10,
      col: 0,
      row: 0,
    }

    mockStore = makeStore({
      combatMode: true,
      pendingAbility: {
        id: 'berserker_rage',
        areaType: 'self',
        apCost: 2,
        consumeAllActionPoints: true,
        forceEndTurn: true,
        tokenUid: caster.uid,
      },
      placedTokens: [caster],
    })

    const executor = vi.fn()
    getExecutorMock.mockReturnValue(executor)

    const api = useAbilityExecution(ref(null), vi.fn())
    const ok = api.executeAbility(null)

    expect(ok).toBe(true)
    expect(executor).toHaveBeenCalledTimes(1)
    expect(caster.actionPoints).toBe(0)
    expect(mockStore.pendingAbility).toBeNull()
    expect(mockStore.endTurn).toHaveBeenCalledTimes(1)
  })

  it('requiresFullActionPoints: блокирует каст если AP уже тратились в этом ходу', () => {
    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      level: 5,
      actionPoints: 4,
      spentActionPointsThisTurn: true,
    }

    mockStore = makeStore({
      pendingAbility: {
        id: 'berserker_rage',
        areaType: 'self',
        apCost: 2,
        requiresFullActionPoints: true,
        consumeAllActionPoints: true,
        tokenUid: caster.uid,
      },
      placedTokens: [caster],
    })

    const executor = vi.fn()
    getExecutorMock.mockReturnValue(executor)

    const api = useAbilityExecution(ref(null), vi.fn())
    const ok = api.executeAbility(null)

    expect(ok).toBe(false)
    expect(executor).not.toHaveBeenCalled()
    expect(mockStore.pendingAbility).not.toBeNull()
  })

  it('requiresFullActionPoints: блокирует каст если AP ниже полного запаса', () => {
    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      level: 5,
      actionPoints: 3,
      spentActionPointsThisTurn: false,
    }

    mockStore = makeStore({
      pendingAbility: {
        id: 'berserker_rage',
        areaType: 'self',
        apCost: 2,
        requiresFullActionPoints: true,
        consumeAllActionPoints: true,
        tokenUid: caster.uid,
      },
      placedTokens: [caster],
    })

    const executor = vi.fn()
    getExecutorMock.mockReturnValue(executor)

    const api = useAbilityExecution(ref(null), vi.fn())
    const ok = api.executeAbility(null)

    expect(ok).toBe(false)
    expect(executor).not.toHaveBeenCalled()
  })

  it('даёт экзекьютору общий handoff для старта боя способностью и автопередачи хода', () => {
    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      actionPoints: 0,
      movementPoints: 6,
      col: 0,
      row: 0,
    }

    mockStore = makeStore({
      combatMode: false,
      initiativeOrder: [{ uid: caster.uid }],
      currentInitiativeIndex: 0,
      pendingAbility: {
        id: 'battle_opener',
        areaType: 'targeted',
        apCost: 0,
        tokenUid: caster.uid,
      },
      placedTokens: [caster],
      enterCombat: vi.fn(() => {
        mockStore.combatMode = true
        mockStore.initiativeOrder = [{ uid: caster.uid }]
        mockStore.currentInitiativeIndex = 0
        caster.actionPoints = 3
        caster.movementPoints = 6
      }),
    })

    const executor = vi.fn((ctx, token, target, ability) => {
      const handoff = ctx.enterCombatFromAbility(token.uid, token.actionPoints ?? 0)
      ctx.completeCombatHandoff(handoff, ability)
    })
    getExecutorMock.mockReturnValue(executor)

    const api = useAbilityExecution(ref(null), vi.fn())
    const ok = api.executeAbility({ col: 2, row: 2 })

    expect(ok).toBe(true)
    expect(mockStore.enterCombat).toHaveBeenCalledTimes(1)
    expect(caster.actionPoints).toBe(0)
    expect(caster.movementPoints).toBe(0)
    expect(mockStore.endTurn).toHaveBeenCalledTimes(1)
  })

  it('валидирует цели для single и targeted', () => {
    const caster = { uid: 'hero-1', tokenType: 'hero', actionPoints: 3 }
    mockStore = makeStore({ placedTokens: [caster] })
    getExecutorMock.mockReturnValue(vi.fn())

    const api = useAbilityExecution(ref(null), vi.fn())

    mockStore.pendingAbility = {
      id: 'single_spell',
      areaType: 'single',
      apCost: 1,
      tokenUid: caster.uid,
    }
    expect(api.executeAbility(null)).toBe(false)

    mockStore.pendingAbility = {
      id: 'aoe_spell',
      areaType: 'targeted',
      apCost: 1,
      tokenUid: caster.uid,
    }
    expect(api.executeAbility({ row: 1 })).toBe(false)
  })

  it('executeAoE делегирует выполнение экзекьютору', () => {
    mockStore = makeStore()
    const executor = vi.fn()
    getExecutorMock.mockReturnValue(executor)

    const api = useAbilityExecution(ref(null), vi.fn())
    const caster = { uid: 'hero-1' }
    const cell = { col: 5, row: 7 }
    const ability = { id: 'poison_cloud', areaType: 'targeted' }

    api.executeAoE(ability, caster, cell)

    expect(executor).toHaveBeenCalledTimes(1)
    expect(executor).toHaveBeenCalledWith(expect.any(Object), caster, cell, ability)
  })

  it('tickEffects обрабатывает урон/штраф AP/лечение и истечение disguise', () => {
    const token = {
      uid: 'hero-1',
      hp: 10,
      maxHp: 20,
      actionPoints: 3,
      src: 'disguised.png',
      activeEffects: [
        {
          id: 'poison',
          remainingTurns: 1,
          damagePerTurn: 2,
          apPenalty: 1,
          healPerTurn: 4,
        },
        {
          id: 'disguise',
          remainingTurns: 1,
          originalSrc: 'original.png',
        },
      ],
    }

    mockStore = makeStore({
      placedTokens: [token],
      calcMaxHp: vi.fn(() => 20),
    })

    const api = useAbilityExecution(ref(null), vi.fn())
    api.tickEffects(token)

    // 10 -2 +4 = 12
    expect(token.hp).toBe(12)
    expect(token.actionPoints).toBe(2)
    expect(token.activeEffects).toEqual([])
    expect(token.src).toBe('original.png')
  })
})
