import { EQUIP_SLOT_KEYS } from '../constants/inventorySlots'

export function createEmptyInventory() {
  const equipped = Object.fromEntries(EQUIP_SLOT_KEYS.map((key) => [key, null]))
  return {
    cells: Array(20).fill(null),
    equipped,
  }
}

export function normalizeInventorySnapshot(raw) {
  const empty = createEmptyInventory()
  if (!raw || typeof raw !== 'object') return empty

  const cells = Array.isArray(raw.cells)
    ? [...raw.cells.slice(0, 20), ...Array(Math.max(0, 20 - raw.cells.length)).fill(null)]
    : empty.cells

  const equipped = { ...empty.equipped }
  if (raw.equipped && typeof raw.equipped === 'object') {
    for (const key of EQUIP_SLOT_KEYS) {
      if (Object.prototype.hasOwnProperty.call(raw.equipped, key)) {
        equipped[key] = raw.equipped[key] ?? null
      }
    }
  }

  return { cells, equipped }
}
