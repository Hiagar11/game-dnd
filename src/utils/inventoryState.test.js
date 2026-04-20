import { describe, expect, it } from 'vitest'
import { createEmptyInventory, normalizeInventorySnapshot, splitCoins } from './inventoryState'

describe('inventoryState', () => {
  it('creates empty inventory with expected slots', () => {
    const inventory = createEmptyInventory()
    expect(inventory.cells).toHaveLength(20)
    expect(Object.keys(inventory.equipped)).toHaveLength(13)
    expect(inventory.coins).toBe(0)
  })

  it('normalizes cells length and whitelists equipped keys', () => {
    const raw = {
      cells: [1, 2],
      equipped: {
        weapon: { id: 'w1' },
        hacked: { id: 'x1' },
      },
    }

    const normalized = normalizeInventorySnapshot(raw)
    expect(normalized.cells).toHaveLength(20)
    expect(normalized.equipped.weapon).toEqual({ id: 'w1' })
    expect(normalized.equipped.hacked).toBeUndefined()
  })

  it('normalizes coins', () => {
    expect(normalizeInventorySnapshot({ coins: 300 }).coins).toBe(300)
    expect(normalizeInventorySnapshot({ coins: -5 }).coins).toBe(0)
    expect(normalizeInventorySnapshot({}).coins).toBe(0)
  })
})

describe('splitCoins', () => {
  it('splits copper into denominations', () => {
    expect(splitCoins(0)).toEqual({ gold: 0, silver: 0, copper: 0 })
    expect(splitCoins(99)).toEqual({ gold: 0, silver: 0, copper: 99 })
    expect(splitCoins(100)).toEqual({ gold: 0, silver: 1, copper: 0 })
    expect(splitCoins(300)).toEqual({ gold: 0, silver: 3, copper: 0 })
    expect(splitCoins(10_000)).toEqual({ gold: 1, silver: 0, copper: 0 })
    expect(splitCoins(12_345)).toEqual({ gold: 1, silver: 23, copper: 45 })
  })
})
