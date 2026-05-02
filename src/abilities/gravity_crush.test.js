import { describe, expect, it, vi } from 'vitest'
import { execute } from './executors/gravity_crush'
import { makeCtx } from './__testHelpers/makeCtx'

// В реальной сетке 1 игровая клетка = 2 единицы col/row (halfCell-единицы).
// Зона 2×2: targetCell = ЦЕНТР зоны (курсор стоит в пересечении четырёх клеток).

describe('abilities/executors/gravity_crush', () => {
  it('наносит урон врагам в зоне 2×2 и не трогает тех, кто вне зоны или союзник', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0) // d6 = 1

    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      col: 0,
      row: 0,
      intellect: 5,
      strength: 3,
    }
    // targetCell = {col:6, row:4} — зона: col[4,7] × row[2,5]
    const enemy1 = { uid: 'npc-1', tokenType: 'npc', col: 4, row: 4, hp: 30 } // в зоне
    const enemy2 = { uid: 'npc-2', tokenType: 'npc', col: 6, row: 4, hp: 30 } // правее — в зоне
    const enemy3 = { uid: 'npc-3', tokenType: 'npc', col: 2, row: 4, hp: 30 } // левее — вне зоны
    const ally = { uid: 'hero-2', tokenType: 'hero', col: 4, row: 2, hp: 30 } // в зоне, союзник

    const ctx = makeCtx([caster, enemy1, enemy2, enemy3, ally])
    execute(ctx, caster, { col: 6, row: 4 }, { color: '#8b5cf6' })

    // До импакта урон не применяется
    expect(enemy1.hp).toBe(30)
    vi.runAllTimers()

    // bonus = floor(5*0.65 + 3*0.4 + 15/25) = floor(3.25 + 1.2 + 0.6) = 5
    // dmg = 1 + 5 = 6
    expect(enemy1.hp).toBe(24)
    expect(enemy2.hp).toBe(24)
    expect(enemy3.hp).toBe(30) // вне зоны
    expect(ally.hp).toBe(30) // союзник

    expect(ctx.flash).toHaveBeenCalledWith('npc-1', 'gravity', 900)
    expect(ctx.flash).toHaveBeenCalledWith('npc-2', 'gravity', 900)
    expect(ctx.spawnDamage).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('наносит урон при нечётных halfCell-координатах курсора (overlap-логика)', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const caster = { uid: 'hero-1', tokenType: 'hero', col: 0, row: 0, intellect: 5, strength: 3 }
    // Курсор (5,3) — нечётные halfCell. Зона: col[3,6] × row[1,4].
    // Токены всегда на чётных позициях — старый hitSet их не находил.
    const inZone1 = { uid: 'npc-1', tokenType: 'npc', col: 4, row: 2, hp: 30 } // в зоне
    const inZone2 = { uid: 'npc-2', tokenType: 'npc', col: 6, row: 2, hp: 30 } // на правом краю
    const outside = { uid: 'npc-3', tokenType: 'npc', col: 0, row: 2, hp: 30 } // левее зоны

    const ctx = makeCtx([caster, inZone1, inZone2, outside])
    execute(ctx, caster, { col: 5, row: 3 }, {})
    vi.runAllTimers()

    expect(inZone1.hp).toBeLessThan(30)
    expect(inZone2.hp).toBeLessThan(30)
    expect(outside.hp).toBe(30)

    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('не затрагивает токены вне зоны видимости', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const caster = { uid: 'hero-1', tokenType: 'hero', col: 0, row: 0, intellect: 5, strength: 3 }
    const visibleEnemy = { uid: 'npc-1', tokenType: 'npc', col: 4, row: 4, hp: 20 } // в зоне, виден
    const hiddenEnemy = { uid: 'npc-2', tokenType: 'npc', col: 6, row: 4, hp: 20 } // в зоне, скрыт

    const ctx = makeCtx([caster, visibleEnemy, hiddenEnemy], {
      ctxOverrides: {
        isAreaVisible: vi.fn((col, row) => !(col === 6 && row === 4)),
      },
    })

    execute(ctx, caster, { col: 6, row: 4 }, {})
    vi.runAllTimers()

    expect(visibleEnemy.hp).toBeLessThan(20)
    expect(hiddenEnemy.hp).toBe(20)

    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('нейтральный враг становится hostile и запускает бой', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      col: 0,
      row: 0,
      intellect: 5,
      strength: 3,
      actionPoints: 0,
      movementPoints: 6,
    }
    const neutral = { uid: 'npc-1', tokenType: 'npc', attitude: 'neutral', col: 4, row: 4, hp: 30 }

    const ctx = makeCtx([caster, neutral])
    ctx.store.enterCombat.mockImplementation(() => {
      ctx.store.combatMode = true
      caster.actionPoints = 3
      caster.movementPoints = 6
    })

    execute(ctx, caster, { col: 6, row: 4 }, {})
    vi.runAllTimers()

    expect(neutral.attitude).toBe('hostile')
    expect(ctx.store.enterCombat).toHaveBeenCalledTimes(1)
    expect(caster.actionPoints).toBe(0)
    expect(caster.movementPoints).toBe(0)
    expect(ctx.store.endTurn).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('запускает снаряд от кастера до центра зоны после фазы каста', () => {
    vi.useFakeTimers()

    const caster = { uid: 'hero-1', tokenType: 'hero', col: 0, row: 0 }
    const ctx = makeCtx([caster])

    execute(ctx, caster, { col: 6, row: 4 }, { color: '#8b5cf6' })

    // До конца фазы каста снаряд ещё не запущен
    expect(ctx.store.abilityProjectile).toBeNull()

    // После CAST_MS (600мс) снаряд появляется
    vi.advanceTimersByTime(600)

    const proj = ctx.store.abilityProjectile
    expect(proj).not.toBeNull()
    expect(proj.fromX).toBeCloseTo((0 + 1) * 30) // центр кастера X
    expect(proj.fromY).toBeCloseTo((0 + 1) * 30) // центр кастера Y
    expect(proj.toX).toBeCloseTo(6 * 30) // центр зоны X = C*hc
    expect(proj.toY).toBeCloseTo(4 * 30) // центр зоны Y = R*hc
    expect(proj.durationMs).toBe(600)
    expect(proj.kind).toBe('gravityCrush')
    expect(proj.color).toBe('#8b5cf6')

    vi.useRealTimers()
  })

  it('возвращает false при отсутствии targetCell', () => {
    const caster = { uid: 'hero-1', tokenType: 'hero', col: 0, row: 0 }
    const ctx = makeCtx([caster])

    expect(execute(ctx, caster, null, {})).toBe(false)
    expect(execute(ctx, caster, { row: 5 }, {})).toBe(false)
  })
})
