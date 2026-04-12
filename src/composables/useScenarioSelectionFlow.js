import { ref } from 'vue'

export function useScenarioSelectionFlow({
  playClick,
  playTravelMusic,
  auth,
  getSocket,
  offsetX,
  offsetY,
  emitPan,
  emitHeroes,
  tokensStore,
  scenariosStore,
  campaignsStore,
  gameSessionsStore,
  gameStore,
  sessionActive,
  sessionChanged,
  setActiveSessionName,
}) {
  const selectedScenario = ref(null)
  const loadingId = ref(null)
  const loadError = ref('')

  async function selectCampaign(campaign) {
    playClick()
    loadError.value = ''
    gameStore.setActiveCampaign(campaign)

    if (!campaign.startScenarioId) {
      loadError.value =
        'У этого сценария не задана стартовая локация. Мастер должен отметить её в редакторе сценария.'
      return
    }

    const startScenario = scenariosStore.scenarios.find(
      (scenario) => String(scenario.id) === String(campaign.startScenarioId)
    )
    if (!startScenario) {
      loadError.value = 'Стартовая локация не найдена.'
      return
    }

    loadingId.value = campaign.id
    await selectScenario(startScenario)
    loadingId.value = null
  }

  async function selectScenario(scenario) {
    loadingId.value = scenario.id
    loadError.value = ''
    try {
      await tokensStore.fetchTokens()
      const full = await scenariosStore.fetchScenario(scenario.id)
      gameStore.setCellSize(full.cellSize ?? 60)
      gameStore.initPlacedTokens(full.placedTokens ?? [])
      gameStore.initWalls(full.walls ?? [])
      sessionChanged.value = false
      gameStore.currentScenario = full
      selectedScenario.value = full
      playTravelMusic()

      if (auth.role === 'admin') {
        const socket = getSocket()
        if (socket) {
          if (!sessionActive.value) {
            socket.emit(
              'game:session:open',
              {
                campaignId: String(gameStore.activeCampaign?.id ?? ''),
                campaignName: gameStore.activeCampaign?.name ?? '',
                scenarioId: String(full.id),
              },
              (res) => {
                if (res?.ok) {
                  sessionActive.value = true
                  emitPan(offsetX.value, offsetY.value)
                  emitHeroes()
                }
              }
            )
          } else {
            socket.emit('game:scenario:change', { scenarioId: String(full.id) })
          }
        }
      }
    } catch (err) {
      loadError.value = err.message || 'Не удалось загрузить карту'
    } finally {
      loadingId.value = null
    }
  }

  async function resumeSession(session) {
    playClick()
    const sessionId = session.id ?? session._id
    loadError.value = ''

    const campaign = campaignsStore.campaigns.find(
      (entry) => String(entry.id) === String(session.campaignId)
    )
    const scenario = scenariosStore.scenarios.find(
      (entry) => String(entry.id) === String(session.currentScenarioId)
    )
    if (!campaign || !scenario) {
      loadError.value = 'Сохранённый сценарий больше не доступен'
      return
    }

    loadingId.value = sessionId
    gameStore.setActiveCampaign(campaign)
    setActiveSessionName(session.name)
    await gameSessionsStore.restoreSession(sessionId)
    await selectScenario(scenario)
    loadingId.value = null
  }

  async function deleteSession(session) {
    playClick()
    const id = session.id ?? session._id
    if (!confirm(`Удалить сохранение «${session.name}»?`)) return
    await gameSessionsStore.deleteSession(id)
  }

  return {
    selectedScenario,
    loadingId,
    loadError,
    selectCampaign,
    selectScenario,
    resumeSession,
    deleteSession,
  }
}
