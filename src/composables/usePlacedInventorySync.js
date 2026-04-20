import { watch } from 'vue'
import { normalizeInventorySnapshot } from '../utils/inventoryState'

export function usePlacedInventorySync({ inventoryModel, props, isPlacedMode, store }) {
  function inventoriesEqual(a, b) {
    return (
      JSON.stringify(normalizeInventorySnapshot(a)) ===
      JSON.stringify(normalizeInventorySnapshot(b))
    )
  }

  watch(
    inventoryModel,
    (value) => {
      if (!props.visible || !isPlacedMode.value || !props.placedUid) return
      const token = store.placedTokens.find((t) => t.uid === props.placedUid)
      if (!token) return

      const normalized = normalizeInventorySnapshot(value)
      if (inventoriesEqual(normalized, token.inventory)) return

      // Если оружие убрано из слота — сбросить флаг armed
      const hasWeapon = !!normalized?.equipped?.weapon
      const fields = { inventory: normalized }
      if (!hasWeapon && token.armed) fields.armed = false

      // Обновляем только локальный store; в БД попадёт при сохранении сессии
      store.editPlacedToken(props.placedUid, fields)
    },
    { deep: true }
  )
}
