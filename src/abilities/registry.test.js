import { describe, expect, it, vi } from 'vitest'

vi.mock('../composables/useSound', () => ({
  playBattleMusic: vi.fn(),
  duckBattleMusic: vi.fn(),
  restoreBattleMusic: vi.fn(),
  stopBattleMusic: vi.fn(),
  playTravelMusic: vi.fn(),
  stopTravelMusic: vi.fn(),
  playSuccess: vi.fn(),
  playFist: vi.fn(),
  playSword: vi.fn(),
  playMiss: vi.fn(),
  playLevelUp: vi.fn(),
  playShieldBash: vi.fn(),
  playQuickStep: vi.fn(),
  playInspire: vi.fn(),
  playBloodCast: vi.fn(),
  playBloodProjectile: vi.fn(),
  playBloodImpact: vi.fn(),
  playMainMenuMusic: vi.fn(),
  stopMainMenuMusic: vi.fn(),
  useSound: vi.fn(() => ({})),
}))

import { getExecutor } from './registry'

/**
 * Тесты для реестра экзекьюторов способностей.
 * Проверяем, что все способности автоматически зарегистрированы.
 */
describe('abilities/registry — автоматическая регистрация', () => {
  const EXPECTED_IDS = [
    'cleave',
    'power_strike',
    'shield_bash',
    'invisibility',
    'disguise',
    'heal',
    'poison-strike',
    'quick_step',
    'inspire',
    'blood_bolt',
    'gravity_bolt',
    'blood_leech',
    'gravity-crush',
    'gravity-well',
    'blood-rain',
    'poison-cloud',
    'teleport',
    'taunt',
  ]

  it.each(EXPECTED_IDS)('экзекьютор для "%s" зарегистрирован', (id) => {
    const executor = getExecutor(id)
    expect(executor).toBeTypeOf('function')
  })

  it('несуществующая способность → null', () => {
    expect(getExecutor('nonexistent-ability')).toBeNull()
  })

  it('все зарегистрированные экзекьюторы — функции', () => {
    for (const id of EXPECTED_IDS) {
      expect(getExecutor(id)).toBeTypeOf('function')
    }
  })
})
