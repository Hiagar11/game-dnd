import { EQUIP_SLOT_KEYS } from '../constants/inventorySlots'

export function createEmptyInventory() {
  const equipped = Object.fromEntries(EQUIP_SLOT_KEYS.map((key) => [key, null]))
  return {
    cells: Array(20).fill(null),
    equipped,
    coins: 0,
  }
}

/**
 * Разбивает общее количество медяков на номиналы.
 * 1 золотой = 100 серебряных = 10 000 медяков.
 * @param {number} totalCopper
 * @returns {{ gold: number, silver: number, copper: number }}
 */
export function splitCoins(totalCopper) {
  const total = Math.max(0, Math.floor(totalCopper || 0))
  const gold = Math.floor(total / 10_000)
  const silver = Math.floor((total % 10_000) / 100)
  const copper = total % 100
  return { gold, silver, copper }
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

  const coins = Number.isFinite(raw.coins) && raw.coins >= 0 ? Math.floor(raw.coins) : 0

  return { cells, equipped, coins }
}
