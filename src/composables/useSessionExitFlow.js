import { ref } from 'vue'

export function useSessionExitFlow({
  gameStore,
  gameSessionsStore,
  selectedScenario,
  getSocket,
  sessionActive,
  sessionChanged,
  stopTravelMusic,
  stopBattleMusic,
  playClick,
}) {
  const showSavePopup = ref(false)
  const showSummaryPopup = ref(false)
  const summaryNpcs = ref([])
  const activeSessionName = ref(null)

  function onBeforeUnload(e) {
    if (sessionActive.value && sessionChanged.value) {
      e.preventDefault()
    }
  }

  async function onExitClick() {
    playClick()
    if (!sessionActive.value) {
      return sessionChanged.value ? (showSavePopup.value = true) : doActualExit()
    }

    const res = await new Promise((resolve) => {
      getSocket()?.emit('npc:session:summary', resolve)
      setTimeout(() => resolve({ ok: true, npcs: [] }), 8000)
    })

    if (res?.ok && res.npcs?.length > 0) {
      summaryNpcs.value = res.npcs.map((npc) => {
        const placed = gameStore.placedTokens.find((t) => t.uid === npc.npcUid)
        return { ...npc, src: placed?.src ?? null }
      })
      showSummaryPopup.value = true
    } else if (sessionChanged.value) {
      showSavePopup.value = true
    } else {
      doActualExit()
    }
  }

  async function onSummaryConfirm(saves) {
    const socket = getSocket()
    await Promise.allSettled(
      saves.map(
        ({ tokenId, notes }) =>
          new Promise((resolve) =>
            socket?.emit('npc:save:notes', { tokenId, contextNotes: notes }, resolve)
          )
      )
    )
    showSummaryPopup.value = false
    showSavePopup.value = true
  }

  function onSummarySkip() {
    showSummaryPopup.value = false
    showSavePopup.value = true
  }

  function doActualExit() {
    showSavePopup.value = false
    showSummaryPopup.value = false
    activeSessionName.value = null
    stopTravelMusic()
    stopBattleMusic()
    if (sessionActive.value) {
      getSocket()?.emit('game:session:close')
      sessionActive.value = false
    }
    sessionChanged.value = false
    selectedScenario.value = null
    gameStore.currentScenario = null
  }

  async function onSaveSession(name, { resolve, reject }) {
    try {
      await gameSessionsStore.saveSession({
        name,
        campaignId: gameStore.activeCampaign?.id,
        campaignName: gameStore.activeCampaign?.name ?? '',
        currentScenarioId: selectedScenario.value?.id,
        currentScenarioName: selectedScenario.value?.name ?? '',
      })
      resolve()
      doActualExit()
    } catch (err) {
      reject(err)
    }
  }

  return {
    showSavePopup,
    showSummaryPopup,
    summaryNpcs,
    activeSessionName,
    onBeforeUnload,
    onExitClick,
    onSummaryConfirm,
    onSummarySkip,
    doActualExit,
    onSaveSession,
  }
}
