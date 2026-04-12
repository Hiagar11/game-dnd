import { describe, expect, it } from 'vitest'
import { createEmptyInventory, normalizeInventorySnapshot } from './inventoryState'

describe('inventoryState', () => {
  it('creates empty inventory with expected slots', () => {
    const inventory = createEmptyInventory()
    expect(inventory.cells).toHaveLength(20)
    expect(Object.keys(inventory.equipped)).toHaveLength(12)
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
})
