import { describe, it, expect, vi, beforeEach } from 'vitest'

// useSound использует Audio/AudioContext, мокируем до импорта модуля
vi.mock('../composables/useSound', () => ({
  playTauntCry: vi.fn(),
}))

import { execute } from './executors/berserkerRage'
import * as soundModule from '../composables/useSound'

function makeCtx(overrides = {}) {
  const token = { uid: 'hero-1', col: 2, row: 3 }
  const store = {
    placedTokens: [token],
    cellSize: 60,
    gridNormOX: 0,
    gridNormOY: 0,
    editPlacedToken: vi.fn(),
  }
  return {
    store,
    token,
    ctx: {
      store,
      addEffect: vi.fn(),
      flash: vi.fn(),
      damageFloat: { value: { spawn: vi.fn() } },
      ...overrides,
    },
  }
}

describe('berserkerRage executor', () => {
  beforeEach(() => vi.clearAllMocks())

  it('накладывает эффект berserker_rage с damageMult=1.5 и evasionMult=0.8 на 3 хода', () => {
    const { ctx, token } = makeCtx()
    execute(ctx, token, null, { icon: 'enrage', color: '#ef4444' })

    expect(ctx.addEffect).toHaveBeenCalledTimes(1)
    const [calledToken, effect] = ctx.addEffect.mock.calls[0]
    expect(calledToken.uid).toBe('hero-1')
    expect(effect.id).toBe('berserker_rage')
    expect(effect.remainingTurns).toBe(3)
    expect(effect.damageMult).toBe(1.5)
    expect(effect.evasionMult).toBe(0.8)
  })

  it('делает вспышку flash на кастере', () => {
    const { ctx, token } = makeCtx()
    execute(ctx, token, null, {})

    expect(ctx.flash).toHaveBeenCalledWith('hero-1', 'taunt')
  })

  it('воспроизводит звук playTauntCry', () => {
    const { ctx, token } = makeCtx()
    execute(ctx, token, null, {})

    expect(soundModule.playTauntCry).toHaveBeenCalledTimes(1)
  })

  it('показывает DamageFloat с текстом +50% урон', () => {
    const { ctx, token } = makeCtx()
    execute(ctx, token, null, {})

    expect(ctx.damageFloat.value.spawn).toHaveBeenCalledWith(
      'hero-1',
      '⚔ +50% урон',
      expect.any(Number),
      expect.any(Number),
      '#ef4444'
    )
  })

  it('ничего не делает если токен не найден в placedTokens', () => {
    const { ctx } = makeCtx()
    execute(ctx, { uid: 'ghost-99' }, null, {})

    expect(ctx.addEffect).not.toHaveBeenCalled()
    expect(ctx.flash).not.toHaveBeenCalled()
  })
})
