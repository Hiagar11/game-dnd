// Composable для сохранения/обновления/удаления уровня (EditorLevelSection).
// Отделяет логику персистентности от UI-логики компонента.
import { ref, nextTick } from 'vue'
import { useGameStore } from '../stores/game'
import { useScenariosStore } from '../stores/scenarios'

// Собирает массив токенов для отправки на сервер — без лишних полей UI
function buildTokensPayload(placedTokens, includeHidden = false) {
  return placedTokens.map(({ uid, tokenId, systemToken, targetScenarioId, col, row, hidden }) => ({
    uid,
    ...(systemToken ? { systemToken } : { tokenId }),
    ...(targetScenarioId ? { targetScenarioId } : {}),
    col,
    row,
    hidden: includeHidden ? (hidden ?? false) : false,
  }))
}

export function useLevelSave(selectedScenario, isEditingLevel, autoLoadScenario, exitGame, goBack) {
  const gameStore = useGameStore()
  const store = useScenariosStore()

  // ─── Попап: ввод названия нового уровня ──────────────────────────────────────
  const showSavePopup = ref(false)
  const levelName = ref('')
  const levelNameInputRef = ref(null)
  const saving = ref(false)
  const saveError = ref('')
  const saveSuccess = ref(false)
  const saveToastMsg = ref('')

  function openSavePopup() {
    levelName.value = ''
    saveError.value = ''
    showSavePopup.value = true
    nextTick(() => levelNameInputRef.value?.focus())
  }

  function closeSavePopup() {
    showSavePopup.value = false
  }

  // ─── Диспетчер кнопки сохранения ─────────────────────────────────────────────
  function onSaveBtnClick() {
    isEditingLevel.value ? onUpdateLevel() : openSavePopup()
  }

  // ─── Обновление существующего уровня через PATCH ──────────────────────────────
  async function onUpdateLevel() {
    saving.value = true
    saveError.value = ''
    try {
      const tokens = buildTokensPayload(gameStore.placedTokens, true)
      await store.saveLevelTokens(selectedScenario.value.id, tokens)
      if (autoLoadScenario.value) {
        goBack()
      } else {
        exitGame()
        saveToastMsg.value = 'Уровень обновлён'
        saveSuccess.value = true
        setTimeout(() => (saveSuccess.value = false), 3000)
      }
    } catch (err) {
      saveError.value = err.message || 'Ошибка при обновлении'
    } finally {
      saving.value = false
    }
  }

  // ─── Создание нового уровня ───────────────────────────────────────────────────
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
      await store.createScenario({
        name: levelName.value,
        mapImagePath: selectedScenario.value.mapImagePath,
        cellSize: selectedScenario.value.cellSize,
        placedTokens: tokens,
      })
      closeSavePopup()
      saveToastMsg.value = 'Уровень сохранён'
      saveSuccess.value = true
      setTimeout(() => (saveSuccess.value = false), 3000)
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
