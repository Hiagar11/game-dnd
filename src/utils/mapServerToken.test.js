import { describe, expect, it, vi } from 'vitest'

vi.mock('../constants/systemTokens', () => ({
  SYSTEM_TOKENS: [],
}))

vi.mock('./inventoryState', () => ({
  normalizeInventorySnapshot: (inventory) => inventory ?? null,
}))

vi.mock('../constants/abilityTree', () => ({
  getAbilityTreeById: () => null,
}))

import { mapServerToken } from './mapServerToken'

describe('mapServerToken', () => {
  it('поднимает устаревшие actionPoints из сохранения до базового значения по уровню', () => {
    const mapped = mapServerToken(
      {
        uid: 'hero-1',
        tokenId: 'hero-template',
        tokenType: 'hero',
        level: 4,
        actionPoints: 2,
        col: 1,
        row: 1,
      },
      [
        {
          id: 'hero-template',
          name: 'Hero',
          tokenType: 'hero',
          level: 4,
          strength: 5,
          agility: 5,
          src: '/hero.png',
        },
      ]
    )

    expect(mapped.level).toBe(4)
    expect(mapped.actionPoints).toBe(3)
  })

  it('сохраняет повышенные actionPoints, если они уже не ниже базового значения', () => {
    const mapped = mapServerToken(
      {
        uid: 'hero-1',
        tokenId: 'hero-template',
        tokenType: 'hero',
        level: 4,
        actionPoints: 5,
        col: 1,
        row: 1,
      },
      [
        {
          id: 'hero-template',
          name: 'Hero',
          tokenType: 'hero',
          level: 4,
          strength: 5,
          agility: 5,
          src: '/hero.png',
        },
      ]
    )

    expect(mapped.actionPoints).toBe(5)
  })
})
