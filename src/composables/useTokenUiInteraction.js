import { ref } from 'vue'
import { getCurrentScenarioId } from '../utils/scenario'

export function useTokenUiInteraction({
  store,
  heroesStore,
  heroIds,
  wasDragged,
  getSocket,
  ctxState,
  openContextMenu,
  closeContextMenu,
  emitDoorTransition,
}) {
  const editPlacedUid = ref(null)
  const editInitialTab = ref('stats')
  const doorPlacedUid = ref(null)

  function onViewerClick(placed) {
    if (heroIds.value.has(placed.tokenId)) {
      heroesStore.selectedUid = heroesStore.selectedUid === placed.uid ? null : placed.uid
    }
  }

  function onContextMenu(placed) {
    if (wasDragged.value) return

    if (store.selectedPlacedUid !== placed.uid) {
      store.selectPlacedToken(placed.uid)
    }

    if (ctxState.value.visible && ctxState.value.uid === placed.uid) {
      closeContextMenu()
    } else {
      openContextMenu(placed.uid)
    }
  }

  function handleRemove(uid) {
    store.removeToken(uid)
    const scenarioId = getCurrentScenarioId(store)
    if (scenarioId) getSocket()?.emit('token:remove', { scenarioId, uid })
    closeContextMenu()
  }

  function handleEdit(uid) {
    const placed = store.placedTokens.find((t) => t.uid === uid)
    closeContextMenu()
    if (placed?.systemToken === 'door') {
      doorPlacedUid.value = uid
    } else {
      editInitialTab.value = 'stats'
      editPlacedUid.value = uid
    }
  }

  function handleInventory(uid) {
    closeContextMenu()
    editInitialTab.value = 'inventory'
    editPlacedUid.value = uid
  }

  function handleAbilities(uid) {
    closeContextMenu()
    editInitialTab.value = 'abilities'
    editPlacedUid.value = uid
  }

  function closeEditPopup() {
    editPlacedUid.value = null
    editInitialTab.value = 'stats'
  }

  function onDblClick(placed, clickTimerRef) {
    if (clickTimerRef.value !== null) {
      clearTimeout(clickTimerRef.value)
      clickTimerRef.value = null
    }
    store.setCombatPair(null, null)
    store.selectPlacedToken(placed.uid)
    closeContextMenu()
    if (placed.systemToken === 'door' && placed.targetScenarioId) {
      const sourceScenarioId = store.currentScenario?.id ?? null
      emitDoorTransition({ targetScenarioId: placed.targetScenarioId, sourceScenarioId })
    }
  }

  return {
    editPlacedUid,
    editInitialTab,
    doorPlacedUid,
    onViewerClick,
    onContextMenu,
    handleRemove,
    handleEdit,
    handleInventory,
    handleAbilities,
    closeEditPopup,
    onDblClick,
  }
}
