import { watch, onUnmounted } from 'vue'
import { normalizeInventorySnapshot } from '../utils/inventoryState'
import { getCurrentScenarioId } from '../utils/scenario'

export function usePlacedInventorySync({ inventoryModel, props, isPlacedMode, store, getSocket }) {
  let inventorySaveTimer = null

  function inventoriesEqual(a, b) {
    return (
      JSON.stringify(normalizeInventorySnapshot(a)) ===
      JSON.stringify(normalizeInventorySnapshot(b))
    )
  }

  function queueInventoryPersist(inventory) {
    clearTimeout(inventorySaveTimer)
    const scenarioId = getCurrentScenarioId(store)
    if (!scenarioId || !props.placedUid) return
    const payload = normalizeInventorySnapshot(inventory)
    inventorySaveTimer = setTimeout(() => {
      getSocket()?.emit('token:edit', {
        scenarioId,
        uid: props.placedUid,
        fields: { inventory: payload },
      })
    }, 250)
  }

  watch(
    inventoryModel,
    (value) => {
      if (!props.visible || !isPlacedMode.value || !props.placedUid) return
      const token = store.placedTokens.find((t) => t.uid === props.placedUid)
      if (!token) return

      const normalized = normalizeInventorySnapshot(value)
      if (inventoriesEqual(normalized, token.inventory)) return

      store.editPlacedToken(props.placedUid, { inventory: normalized })
      queueInventoryPersist(normalized)
    },
    { deep: true }
  )

  onUnmounted(() => {
    clearTimeout(inventorySaveTimer)
  })
}
