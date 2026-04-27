import { describe, expect, it, vi } from 'vitest'
import { execute } from './executors/cleave'

function makeCtx(placedTokens) {
  const store = {
    placedTokens,
    combatMode: false,
    cellSize: 60,
    gridNormOX: 0,
    gridNormOY: 0,
    editPlacedToken(uid, fields) {
      const token = this.placedTokens.find((entry) => entry.uid === uid)
      if (token) Object.assign(token, fields)
    },
    enterCombat: vi.fn(),
    endTurn: vi.fn(),
    checkCombatEnd: vi.fn(),
  }

  return {
    store,
    spawnDamage: vi.fn(),
    damageFloat: { value: { spawn: vi.fn() } },
    flash: vi.fn(),
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

describe('abilities/executors/cleave', () => {
  it('для направления вправо-вверх бьёт верх, верх-право и право с отдельным уроном по каждой цели', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.4)

    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      col: 10,
      row: 10,
      strength: 6,
      inventory: { equipped: { weapon: { baseDamage: { min: 5, max: 5 } } } },
    }

    const enemyTop = { uid: 'npc-top', tokenType: 'npc', col: 10, row: 8, hp: 30 }
    const enemyTopRight = { uid: 'npc-top-right', tokenType: 'npc', col: 12, row: 8, hp: 30 }
    const enemyRight = { uid: 'npc-right', tokenType: 'npc', col: 12, row: 10, hp: 30 }
    const enemyOutOfPattern = { uid: 'npc-near', tokenType: 'npc', col: 8, row: 10, hp: 30 }
    const ally = { uid: 'hero-2', tokenType: 'hero', col: 12, row: 12, hp: 30 }

    const ctx = makeCtx([caster, enemyTop, enemyTopRight, enemyRight, enemyOutOfPattern, ally])

    execute(
      ctx,
      caster,
      { col: 14, row: 6 },
      {
        color: '#ef4444',
        // Курсор справа-сверху от токена => сектор NE
        // Ожидаемый клин: (0,-2), (2,-2), (2,0)
        strengthScaling: 1,
      }
    )

    // До фазы треска урон ещё не должен примениться.
    expect(enemyTop.hp).toBe(30)
    expect(enemyTopRight.hp).toBe(30)
    expect(enemyRight.hp).toBe(30)

    vi.runAllTimers()

    // Отдельные роллы на каждую цель:
    // npc-top: d6(1)+6 = 7 => 30-7 = 23
    // npc-top-right: d6(6)+6 = 12 => 30-12 = 18
    // npc-right: d6(3)+6 = 9 => 30-9 = 21
    expect(enemyTop.hp).toBe(23)
    expect(enemyTopRight.hp).toBe(18)
    expect(enemyRight.hp).toBe(21)

    expect(enemyOutOfPattern.hp).toBe(30)
    expect(ally.hp).toBe(30)

    expect(ctx.spawnDamage).toHaveBeenCalledTimes(3)

    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('оглушает NPC при добивании до 0 HP', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)

    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      col: 5,
      row: 5,
      strength: 10,
      inventory: { equipped: { weapon: { baseDamage: { min: 5, max: 5 } } } },
    }

    const enemy = { uid: 'npc-1', tokenType: 'npc', col: 7, row: 5, hp: 12 }
    const ctx = makeCtx([caster, enemy])

    execute(
      ctx,
      caster,
      { col: 10, row: 5 },
      {
        strengthScaling: 1,
      }
    )

    vi.runAllTimers()

    expect(enemy.hp).toBe(0)
    expect(enemy.stunned).toBe(true)
    expect(ctx.store.checkCombatEnd).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('при попадании cleave по нейтралам делает их hostile и инициирует бой без возврата AP', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      col: 10,
      row: 10,
      strength: 6,
      actionPoints: 0,
      movementPoints: 6,
      inventory: { equipped: { weapon: { baseDamage: { min: 5, max: 5 } } } },
    }

    const neutralTop = {
      uid: 'npc-top',
      tokenType: 'npc',
      attitude: 'neutral',
      col: 10,
      row: 8,
      hp: 30,
    }
    const neutralTopRight = {
      uid: 'npc-top-right',
      tokenType: 'npc',
      attitude: 'neutral',
      col: 12,
      row: 8,
      hp: 30,
    }

    const ctx = makeCtx([caster, neutralTop, neutralTopRight])
    ctx.store.enterCombat.mockImplementation(() => {
      ctx.store.combatMode = true
      caster.actionPoints = 3
      caster.movementPoints = 6
    })

    execute(
      ctx,
      caster,
      { col: 14, row: 6 },
      {
        color: '#ef4444',
        strengthScaling: 1,
      }
    )

    vi.advanceTimersByTime(440)

    expect(neutralTop.attitude).toBe('hostile')
    expect(neutralTopRight.attitude).toBe('hostile')
    expect(neutralTop.hp).toBe(30)
    expect(neutralTopRight.hp).toBe(30)
    expect(caster.actionPoints).toBe(0)
    expect(caster.movementPoints).toBe(0)
    expect(ctx.store.endTurn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(140)

    expect(neutralTop.attitude).toBe('hostile')
    expect(neutralTopRight.attitude).toBe('hostile')
    expect(neutralTop.hp).toBe(23)
    expect(neutralTopRight.hp).toBe(23)
    expect(ctx.store.enterCombat).toHaveBeenCalledTimes(1)
    expect(ctx.store.enterCombat).toHaveBeenCalledWith(caster.uid)
    expect(caster.actionPoints).toBe(0)
    expect(caster.movementPoints).toBe(0)
    expect(ctx.store.endTurn).toHaveBeenCalledTimes(1)
    expect(ctx.flash).toHaveBeenCalledTimes(2)
    expect(ctx.flash).toHaveBeenNthCalledWith(1, neutralTop.uid, 'aggro', 700)
    expect(ctx.flash).toHaveBeenNthCalledWith(2, neutralTopRight.uid, 'aggro', 700)
    expect(ctx.damageFloat.value.spawn).toHaveBeenCalledTimes(2)
    expect(ctx.damageFloat.value.spawn).toHaveBeenNthCalledWith(
      1,
      neutralTop.uid,
      'Агрессия!',
      expect.any(Number),
      expect.any(Number),
      '#ef4444'
    )
    expect(ctx.damageFloat.value.spawn).toHaveBeenNthCalledWith(
      2,
      neutralTopRight.uid,
      'Агрессия!',
      expect.any(Number),
      expect.any(Number),
      '#ef4444'
    )

    vi.useRealTimers()
    vi.restoreAllMocks()
  })
})
