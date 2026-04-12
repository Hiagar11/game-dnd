import { ref } from 'vue'

export function useLevelScenarioFlow({ scenariosStore, gameStore, tokensStore, playClick }) {
  const selectedScenario = ref(null)
  const mapSize = ref({ width: 0, height: 0 })
  const loadingId = ref(null)
  const loadError = ref('')
  const isEditingLevel = ref(false)
  const deletingId = ref(null)
  const deleteError = ref('')

  async function loadScenarioData(scenario, editMode = false) {
    loadingId.value = scenario.id
    loadError.value = ''
    try {
      await tokensStore.fetchTokens()
      const full = await scenariosStore.fetchScenario(scenario.id)
      gameStore.setCellSize(full.cellSize ?? 60)
      gameStore.initPlacedTokens(full.placedTokens ?? [])
      gameStore.initWalls(full.walls ?? [])
      gameStore.currentScenario = full
      selectedScenario.value = full
      isEditingLevel.value = editMode
    } catch (error) {
      loadError.value = error.message || 'Не удалось загрузить карту'
    } finally {
      loadingId.value = null
    }
  }

  const selectScenario = (scenario) => loadScenarioData(scenario, false)
  const editLevel = (scenario) => loadScenarioData(scenario, true)

  async function onDeleteLevel(scenario) {
    if (
      !confirm(
        `Удалить уровень «${scenario.name || 'Без названия'}»?\nОн исчезнет из раздела «Играть».`
      )
    ) {
      return
    }
    playClick()
    deletingId.value = scenario.id
    deleteError.value = ''
    try {
      await scenariosStore.deleteScenario(String(scenario.id))
    } catch (error) {
      deleteError.value = error.message || 'Ошибка при удалении'
    } finally {
      deletingId.value = null
    }
  }

  return {
    selectedScenario,
    mapSize,
    loadingId,
    loadError,
    isEditingLevel,
    deletingId,
    deleteError,
    selectScenario,
    editLevel,
    onDeleteLevel,
  }
}
