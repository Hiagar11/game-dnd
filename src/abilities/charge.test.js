import { describe, expect, it, vi } from 'vitest'
import { execute } from './executors/charge'

function makeCtx(placedTokens, options = {}) {
  const store = {
    placedTokens,
    walls: options.walls ?? [],
    combatMode: options.combatMode ?? true,
    cellSize: 60,
    gridNormOX: 0,
    gridNormOY: 0,
    moveToken: vi.fn((uid, col, row) => {
      const token = placedTokens.find((t) => t.uid === uid)
      if (token) {
        token.col = col
        token.row = row
      }
    }),
    editPlacedToken(uid, fields) {
      const token = this.placedTokens.find((t) => t.uid === uid)
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
    playRushScream: vi.fn(),
    playRushImpact: vi.fn(),
    enterCombatFromAbility: vi.fn(() => ({ started: true, shouldAutoEndTurn: false })),
    completeCombatHandoff: vi.fn(),
  }
}

describe('abilities/executors/charge', () => {
  it('прыгает к цели в радиусе 4, тратит MP по дистанции прыжка и наносит d6+STR урон', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // d6 = floor(0.5*6)+1 = 4

    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      col: 0,
      row: 0,
      strength: 6,
      actionPoints: 3,
      movementPoints: 4,
    }
    const target = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'hostile',
      col: 3,
      row: 0,
      hp: 30,
    }

    const ctx = makeCtx([caster, target])

    execute(ctx, caster, target, { strengthScaling: 1, color: '#ef4444' })

    // Старт: крик + анимация
    expect(ctx.playRushScream).toHaveBeenCalledTimes(1)
    expect(ctx.flash).toHaveBeenCalledWith(caster.uid, 'berserk-jump', 500)

    // MP списались сразу. Цель (3,0) → ближайшая клетка (2,0) → дистанция 2 от (0,0) → −2 MP
    expect(caster.movementPoints).toBe(2)

    // До 150мс перемещения нет
    expect(ctx.store.moveToken).not.toHaveBeenCalled()

    vi.advanceTimersByTime(150)
    expect(ctx.store.moveToken).toHaveBeenCalledTimes(1)
    const [movedUid, landedCol, landedRow] = ctx.store.moveToken.mock.calls[0]
    expect(movedUid).toBe(caster.uid)
    // Любая клетка вокруг цели (3,0) считается валидной
    expect(Math.abs(landedCol - target.col)).toBeLessThanOrEqual(1)
    expect(Math.abs(landedRow - target.row)).toBeLessThanOrEqual(1)

    vi.advanceTimersByTime(350)
    // d6=4, STR=6 → base = 10, dmg = 10
    expect(target.hp).toBe(20)
    expect(ctx.spawnDamage).toHaveBeenCalledTimes(1)
    expect(ctx.playRushImpact).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('не кастуется, если цель дальше 4 клеток', () => {
    vi.useFakeTimers()
    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      col: 0,
      row: 0,
      strength: 6,
      actionPoints: 3,
      movementPoints: 4,
    }
    const target = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'hostile',
      col: 6,
      row: 0,
      hp: 30,
    }
    const ctx = makeCtx([caster, target])

    execute(ctx, caster, target, { strengthScaling: 1 })

    expect(ctx.flash).not.toHaveBeenCalled()
    expect(ctx.playRushScream).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(ctx.store.moveToken).not.toHaveBeenCalled()
    expect(target.hp).toBe(30)
    expect(caster.movementPoints).toBe(4)

    vi.useRealTimers()
  })

  it('в бою не кастуется, если MP меньше дистанции прыжка', () => {
    vi.useFakeTimers()
    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      col: 0,
      row: 0,
      strength: 6,
      actionPoints: 3,
      movementPoints: 1, // только 1 MP
    }
    const target = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'hostile',
      col: 4,
      row: 0,
      hp: 30,
    }
    const ctx = makeCtx([caster, target])

    execute(ctx, caster, target, { strengthScaling: 1 })

    expect(ctx.flash).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(target.hp).toBe(30)

    vi.useRealTimers()
  })

  it('атака по нейтралу делает его hostile и стартует бой вне combatMode', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      col: 0,
      row: 0,
      strength: 4,
      actionPoints: 3,
      movementPoints: 4,
    }
    const neutral = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'neutral',
      col: 3,
      row: 0,
      hp: 30,
    }
    const ctx = makeCtx([caster, neutral], { combatMode: false })

    execute(ctx, caster, neutral, { strengthScaling: 1 })

    vi.advanceTimersByTime(500)

    expect(neutral.attitude).toBe('hostile')
    expect(ctx.enterCombatFromAbility).toHaveBeenCalledTimes(1)
    expect(ctx.completeCombatHandoff).toHaveBeenCalledTimes(1)
    // d6=1, STR=4 → 5
    expect(neutral.hp).toBe(25)

    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('добивает NPC до 0 HP — оглушается через applySingleTargetDamage', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)

    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      col: 0,
      row: 0,
      strength: 10,
      actionPoints: 3,
      movementPoints: 4,
    }
    const target = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'hostile',
      col: 2,
      row: 0,
      hp: 5,
    }
    const ctx = makeCtx([caster, target])

    execute(ctx, caster, target, { strengthScaling: 1 })

    vi.advanceTimersByTime(500)

    expect(target.hp).toBe(0)
    expect(target.stunned).toBe(true)
    expect(ctx.store.checkCombatEnd).toHaveBeenCalled()

    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('ярость берсерка усиливает урон рывка через damageMult', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // d6 = 4

    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      col: 0,
      row: 0,
      strength: 6,
      actionPoints: 3,
      movementPoints: 4,
      activeEffects: [{ id: 'berserker_rage', remainingTurns: 2, damageMult: 1.5 }],
    }
    const target = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'hostile',
      col: 2,
      row: 0,
      hp: 50,
    }
    const ctx = makeCtx([caster, target])

    execute(ctx, caster, target, { strengthScaling: 1 })

    vi.advanceTimersByTime(500)

    // base = 4 + 6 = 10, ×1.5 = 15
    expect(target.hp).toBe(35)

    vi.useRealTimers()
    vi.restoreAllMocks()
  })
})
