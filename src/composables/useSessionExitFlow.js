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
    if (!sessionChanged.value) return
    // Показываем нативный диалог "Покинуть страницу?"
    e.preventDefault()
    // Если пользователь нажал "Остаться" — setTimeout срабатывает и мы показываем свой попап.
    // Если нажал "Покинуть" — страница закрывается, setTimeout не выполняется.
    // Снапшоты сценария в обоих случаях откатываются сервером через disconnect.
    setTimeout(() => {
      showSavePopup.value = true
    }, 0)
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
    // Сохраняем contextNotes только в placedTokens сценария (шаблон Token не трогаем).
    // При явном сохранении уровня persist-tokens запишет всё в defaultPlacedTokens.
    const memorySaves = saves
      .map((s) => {
        const npc = summaryNpcs.value.find((n) => n.tokenId === s.tokenId)
        return { scenarioId: npc?.scenarioId, uid: npc?.npcUid, contextNotes: s.notes }
      })
      .filter((s) => s.scenarioId && s.uid)
    if (memorySaves.length > 0) {
      await new Promise((resolve) =>
        socket?.emit('npc:save:memory', { saves: memorySaves }, resolve)
      )
    }
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
      // Перед созданием снапшота — пушим текущее состояние всех токенов в БД
      const scenarioId = selectedScenario.value?.id
      if (scenarioId) {
        const tokens = gameStore.placedTokens.map((t) => ({ uid: t.uid, fields: { ...t } }))
        await new Promise((res, rej) => {
          const socket = getSocket()
          if (!socket) return res()
          socket.emit('scenario:persist-tokens', { scenarioId, tokens }, (response) => {
            response?.ok ? res() : rej(new Error(response?.error ?? 'persist-tokens error'))
          })
          // Таймаут на случай если сокет не ответит
          setTimeout(res, 5000)
        })
      }

      await gameSessionsStore.saveSession({
        name,
        campaignId: gameStore.activeCampaign?.id,
        campaignName: gameStore.activeCampaign?.name ?? '',
        currentScenarioId: scenarioId,
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
