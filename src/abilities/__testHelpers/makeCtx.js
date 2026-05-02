import { vi } from 'vitest'

/**
 * Базовая фабрика контекста для тестов экзекьюторов способностей.
 *
 * Что внутри:
 * - `store` с `placedTokens`, `walls`, `combatMode`, координатной сеткой,
 *   `moveToken`/`editPlacedToken`, и заглушками `enterCombat`/`endTurn`/
 *   `checkCombatEnd` через `vi.fn()` — тесты могут навешивать `.mockImplementation`.
 * - `ctx.enterCombatFromAbility` и `ctx.completeCombatHandoff` — реальные
 *   реализации, повторяющие логику useAbilityExecution.js, обёрнутые в
 *   `vi.fn()` (можно проверять `toHaveBeenCalled*`).
 * - Звуки/визуалы (flash, spawnDamage, playRushScream, playCleaveStab и т.д.) —
 *   `vi.fn()`-заглушки. Лишние не мешают.
 *
 * @param {object[]} placedTokens — токены на карте
 * @param {object} [options]
 * @param {object[]} [options.walls=[]]
 * @param {boolean} [options.combatMode=false]
 * @param {object} [options.storeOverrides] — поля/методы стора, перекрывают дефолт
 * @param {object} [options.ctxOverrides]   — поля/методы ctx, перекрывают дефолт
 */
export function makeCtx(placedTokens, options = {}) {
  const { walls = [], combatMode = false, storeOverrides = {}, ctxOverrides = {} } = options

  const store = {
    placedTokens,
    walls,
    combatMode,
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
    abilityProjectile: null,
    enterCombat: vi.fn(),
    endTurn: vi.fn(),
    checkCombatEnd: vi.fn(),
    ...storeOverrides,
  }

  const ctx = {
    store,
    spawnDamage: vi.fn(),
    damageFloat: { value: { spawn: vi.fn() } },
    flash: vi.fn(),
    triggerVfx: vi.fn(),
    addEffect: vi.fn((token, effect) => {
      if (!token.activeEffects) token.activeEffects = []
      const existing = token.activeEffects.findIndex((e) => e.id === effect.id)
      if (existing !== -1) token.activeEffects.splice(existing, 1)
      token.activeEffects.push({ ...effect })
    }),
    removeEffect: vi.fn((token, effectId) => {
      if (!token.activeEffects) return
      token.activeEffects = token.activeEffects.filter((e) => e.id !== effectId)
    }),
    hasEffect: vi.fn((token, effectId) => {
      return token.activeEffects?.some((e) => e.id === effectId) ?? false
    }),
    playRushScream: vi.fn(),
    playRushImpact: vi.fn(),
    playCleaveStab: vi.fn(),
    playCleaveCrack: vi.fn(),
    playShadowEnter: vi.fn(),
    playShadowExit: vi.fn(),
    playGravityCastStart: vi.fn(),
    playGravityCrushCenter: vi.fn(),
    // По умолчанию все клетки видимые. Тест на туман переопределяет через ctxOverrides.
    isAreaVisible: vi.fn(() => true),
    enterCombatFromAbility: vi.fn((casterUid, actionPointsAfterCast = 0) => {
      if (store.combatMode || typeof store.enterCombat !== 'function') {
        return { started: false, shouldAutoEndTurn: false }
      }
      store.enterCombat(casterUid)
      const combatCaster = store.placedTokens.find((t) => t.uid === casterUid)
      if (!combatCaster) return { started: true, shouldAutoEndTurn: false }

      combatCaster.actionPoints = Math.min(
        combatCaster.actionPoints ?? actionPointsAfterCast,
        actionPointsAfterCast
      )
      const shouldAutoEndTurn = (combatCaster.actionPoints ?? 0) <= 0
      if (shouldAutoEndTurn) combatCaster.movementPoints = 0
      return { started: true, shouldAutoEndTurn, casterUid }
    }),
    completeCombatHandoff: vi.fn((handoff) => {
      if (!handoff?.shouldAutoEndTurn || !store.combatMode) return
      store.endTurn()
    }),
    ...ctxOverrides,
  }

  return ctx
}
