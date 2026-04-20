import { describe, expect, it } from 'vitest'
import { rollRarity, generateItem } from './lootGenerator'

describe('lootGenerator', () => {
  it('rolls rarity by weighted thresholds (weapon: 45/35/16/4)', () => {
    // normal: [0, 0.45)
    expect(rollRarity('weapon', () => 0.0)).toBe('normal')
    expect(rollRarity('weapon', () => 0.4499)).toBe('normal')
    // magic: [0.45, 0.80)
    expect(rollRarity('weapon', () => 0.4501)).toBe('magic')
    expect(rollRarity('weapon', () => 0.7999)).toBe('magic')
    // rare: [0.80, 0.96)
    expect(rollRarity('weapon', () => 0.8001)).toBe('rare')
    expect(rollRarity('weapon', () => 0.9599)).toBe('rare')
    // relic: [0.96, 1.0)
    expect(rollRarity('weapon', () => 0.9601)).toBe('relic')
  })

  it('generates an item with proper structure', () => {
    const item = generateItem('weapon', 3, () => 0.5)
    expect(item).toHaveProperty('name')
    expect(item).toHaveProperty('slot', 'weapon')
    expect(item).toHaveProperty('icon')
    expect(item).toHaveProperty('rarity')
    expect(item).toHaveProperty('rarityColor')
    expect(['normal', 'magic', 'rare', 'relic']).toContain(item.rarity)
  })

  it('normal items have no affixes', () => {
    const item = generateItem('helmet', 1, () => 0.0)
    expect(item.rarity).toBe('normal')
    expect(item.affixes).toHaveLength(0)
  })

  it('magic items have 1-2 affixes', () => {
    const item = generateItem('weapon', 3, () => 0.5)
    expect(item.rarity).toBe('magic')
    expect(item.affixes.length).toBeGreaterThanOrEqual(1)
    expect(item.affixes.length).toBeLessThanOrEqual(2)
  })

  it('generates random-slot items', () => {
    const item = generateItem('random', 1, () => 0.0)
    expect(item).not.toBeNull()
    expect(item.slot).toBeTruthy()
  })
})
