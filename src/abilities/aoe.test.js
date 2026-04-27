import { describe, expect, it, vi } from 'vitest'
import { execute } from './executors/aoe'

function makeCtx(placedTokens) {
  const store = {
    placedTokens,
    combatMode: false,
    cellSize: 60,
    gridNormOX: 0,
    gridNormOY: 0,
    enterCombat: vi.fn(),
    endTurn: vi.fn(),
    editPlacedToken(uid, fields) {
      const token = this.placedTokens.find((entry) => entry.uid === uid)
      if (token) Object.assign(token, fields)
    },
    checkCombatEnd: vi.fn(),
  }

  return {
    store,
    damageFloat: { value: { spawn: vi.fn() } },
    enterCombatFromAbility(casterUid, actionPointsAfterCast = 0) {
      if (store.combatMode || typeof store.enterCombat !== 'function') {
        return { started: false, shouldAutoEndTurn: false }
      }

      store.enterCombat(casterUid)

      const combatCaster = store.placedTokens.find((entry) => entry.uid === casterUid)
      if (!combatCaster) {
        return { started: true, shouldAutoEndTurn: false }
      }

      combatCaster.actionPoints = Math.min(
        combatCaster.actionPoints ?? actionPointsAfterCast,
        actionPointsAfterCast
      )

      const shouldAutoEndTurn = (combatCaster.actionPoints ?? 0) <= 0
      if (shouldAutoEndTurn) {
        combatCaster.movementPoints = 0
      }

      return { started: true, shouldAutoEndTurn, casterUid }
    },
    completeCombatHandoff(handoff) {
      if (!handoff?.shouldAutoEndTurn || !store.combatMode) return
      store.endTurn()
    },
  }
}

describe('abilities/executors/aoe', () => {
  it('при попадании targeted AoE по нейтралу вне боя переводит его в hostile и завершает ход инициатора без AP', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      col: 0,
      row: 0,
      intellect: 5,
      actionPoints: 0,
      movementPoints: 6,
    }
    const neutral = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'neutral',
      col: 2,
      row: 2,
      hp: 20,
    }

    const ctx = makeCtx([caster, neutral])
    ctx.store.enterCombat.mockImplementation(() => {
      ctx.store.combatMode = true
      caster.actionPoints = 3
      caster.movementPoints = 6
    })

    execute(ctx, caster, { col: 2, row: 2 }, { areaSize: 1, color: '#8b5cf6' })

    expect(neutral.attitude).toBe('neutral')
    expect(neutral.hp).toBe(20)

    vi.advanceTimersByTime(500)

    expect(neutral.attitude).toBe('hostile')
    expect(neutral.hp).toBe(14)
    expect(ctx.store.enterCombat).toHaveBeenCalledTimes(1)
    expect(ctx.store.enterCombat).toHaveBeenCalledWith(caster.uid)
    expect(caster.actionPoints).toBe(0)
    expect(caster.movementPoints).toBe(0)
    expect(ctx.store.endTurn).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('при добивании NPC через AoE оглушает цель и проверяет завершение боя', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      col: 0,
      row: 0,
      intellect: 5,
      actionPoints: 3,
      movementPoints: 6,
    }
    const hostileNpc = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'hostile',
      col: 2,
      row: 2,
      hp: 6,
    }

    const ctx = makeCtx([caster, hostileNpc])

    execute(ctx, caster, { col: 2, row: 2 }, { areaSize: 1, color: '#8b5cf6' })

    vi.advanceTimersByTime(500)

    expect(hostileNpc.hp).toBe(0)
    expect(hostileNpc.stunned).toBe(true)
    expect(ctx.store.checkCombatEnd).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
    vi.restoreAllMocks()
  })
})
