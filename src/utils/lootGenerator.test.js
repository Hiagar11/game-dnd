import { describe, expect, it } from 'vitest'
import { pickWeightedTraitIds, rollRarityCount } from './lootGenerator'

describe('lootGenerator', () => {
  it('rolls rarity by fixed thresholds (60/25/10/5)', () => {
    expect(rollRarityCount('weapon', 4, () => 0.0)).toBe(1)
    expect(rollRarityCount('weapon', 4, () => 0.5999)).toBe(1)
    expect(rollRarityCount('weapon', 4, () => 0.6001)).toBe(2)
    expect(rollRarityCount('weapon', 4, () => 0.8499)).toBe(2)
    expect(rollRarityCount('weapon', 4, () => 0.9001)).toBe(3)
    expect(rollRarityCount('weapon', 4, () => 0.9701)).toBe(4)
  })

  it('picks unique trait ids without replacement', () => {
    const traits = [
      { id: 'a', mods: [{ stat: 'damage', value: 2 }] },
      { id: 'b', mods: [{ stat: 'damage', value: 3 }] },
      { id: 'c', mods: [{ stat: 'damage', value: 4 }] },
    ]

    const selected = pickWeightedTraitIds(traits, 3, 'weapon', { strength: 10 }, () => 0)
    expect(selected).toHaveLength(3)
    expect(new Set(selected).size).toBe(3)
  })
})
