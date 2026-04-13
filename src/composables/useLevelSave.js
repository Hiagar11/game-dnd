import { ref, nextTick, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { useScenariosStore } from '../stores/scenarios'

function buildTokensPayload(placedTokens, includeHidden = false) {
  return placedTokens.map(
    ({ uid, tokenId, systemToken, targetScenarioId, col, row, hidden, inventory }) => ({
      uid,
      ...(systemToken ? { systemToken } : { tokenId }),
      ...(targetScenarioId ? { targetScenarioId } : {}),
      col,
      row,
      hidden: includeHidden ? (hidden ?? false) : false,
      inventory: inventory ?? null,
    })
  )
}

function buildWallsPayload(walls) {
  return walls.map(({ col, row }) => ({ col, row }))
}

export function useLevelSave(selectedScenario, isEditingLevel, autoLoadScenario, exitGame, goBack) {
  const gameStore = useGameStore()
  const store = useScenariosStore()

  const showSavePopup = ref(false)
  const levelName = ref('')
  const levelNameInputRef = ref(null)
  const locationDescription = ref('')
  const saving = ref(false)
  const saveError = ref('')
  const saveSuccess = ref(false)
  const saveToastMsg = ref('')
  let successTimer = null

  onUnmounted(() => clearTimeout(successTimer))

  function openSavePopup() {
    levelName.value = ''
    saveError.value = ''
    locationDescription.value = selectedScenario.value?.locationDescription ?? ''
    showSavePopup.value = true
    nextTick(() => levelNameInputRef.value?.focus())
  }

  function closeSavePopup() {
    showSavePopup.value = false
  }

  function onSaveBtnClick() {
    isEditingLevel.value ? onUpdateLevel() : openSavePopup()
  }

  async function onUpdateLevel() {
    saving.value = true
    saveError.value = ''
    try {
      const tokens = buildTokensPayload(gameStore.placedTokens, true)
      const walls = buildWallsPayload(gameStore.walls)
      await store.saveLevelTokens(selectedScenario.value.id, tokens, undefined, walls)
      if (autoLoadScenario.value) {
        goBack()
      } else {
        exitGame()
        saveToastMsg.value = 'Уровень обновлён'
        saveSuccess.value = true
        clearTimeout(successTimer)
        successTimer = setTimeout(() => (saveSuccess.value = false), 3000)
      }
    } catch (err) {
      saveError.value = err.message || 'Ошибка при обновлении'
    } finally {
      saving.value = false
    }
  }

  async function onSaveLevel() {
    if (!levelName.value) return
    const duplicate = store.scenarios.find(
      (s) => s.name.trim().toLowerCase() === levelName.value.toLowerCase()
    )
    if (duplicate) {
      saveError.value = 'Это имя уже занято другой картой или уровнем'
      return
    }
    saving.value = true
    saveError.value = ''
    try {
      const tokens = buildTokensPayload(gameStore.placedTokens)
      const walls = buildWallsPayload(gameStore.walls)
      await store.createScenario({
        name: levelName.value,
        mapImagePath: selectedScenario.value.mapImagePath,
        cellSize: selectedScenario.value.cellSize,
        gridOffsetX: selectedScenario.value.gridOffsetX ?? 0,
        gridOffsetY: selectedScenario.value.gridOffsetY ?? 0,
        locationDescription: locationDescription.value,
        placedTokens: tokens,
        walls,
      })
      closeSavePopup()
      exitGame()
      saveToastMsg.value = 'Уровень сохранён'
      saveSuccess.value = true
      clearTimeout(successTimer)
      successTimer = setTimeout(() => (saveSuccess.value = false), 3000)
    } catch (err) {
      saveError.value = err.message || 'Ошибка при сохранении'
    } finally {
      saving.value = false
    }
  }

  return {
    showSavePopup,
    levelName,
    levelNameInputRef,
    locationDescription,
    saving,
    saveError,
    saveSuccess,
    saveToastMsg,
    openSavePopup,
    closeSavePopup,
    onSaveBtnClick,
    onSaveLevel,
    onUpdateLevel,
  }
}
