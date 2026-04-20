import { describe, expect, it } from 'vitest'
import { getExecutor } from './registry'

/**
 * Тесты для реестра экзекьюторов способностей.
 * Проверяем, что все способности автоматически зарегистрированы.
 */
describe('abilities/registry — автоматическая регистрация', () => {
  const EXPECTED_IDS = [
    'power_strike',
    'shield_bash',
    'invisibility',
    'disguise',
    'heal',
    'poison-strike',
    'blood-bolt',
    'gravity-bolt',
    'blood-drain',
    'gravity-crush',
    'gravity-well',
    'blood-rain',
    'poison-cloud',
    'teleport',
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
