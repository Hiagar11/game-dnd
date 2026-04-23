import { ref, nextTick, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { useScenariosStore } from '../stores/scenarios'
import { normalizePassiveAbilityIds } from '../utils/passiveAbilities'

function buildTokensPayload(placedTokens, includeHidden = false) {
  return placedTokens.map((t) => ({
    uid: t.uid,
    ...(t.systemToken ? { systemToken: t.systemToken } : { tokenId: t.tokenId }),
    ...(t.targetScenarioId ? { targetScenarioId: t.targetScenarioId } : {}),
    ...(t.globalMapExit ? { globalMapExit: true } : {}),
    col: t.col,
    row: t.row,
    hidden: includeHidden ? (t.hidden ?? false) : false,
    inventory: t.inventory ?? null,
    // Переопределяемые поля экземпляра (null → на сервере фолбэк к шаблону)
    tokenType: t.tokenType ?? null,
    name: t.name ?? null,
    attitude: t.attitude ?? null,
    npcName: t.npcName ?? null,
    personality: t.personality ?? null,
    contextNotes: t.contextNotes ?? null,
    dispositionType: t.dispositionType ?? null,
    strength: t.strength ?? null,
    agility: t.agility ?? null,
    intellect: t.intellect ?? null,
    charisma: t.charisma ?? null,
    hp: t.hp ?? null,
    maxHp: t.maxHp ?? null,
    // XP, уровень, очки характеристик, автолевел
    xp: t.xp ?? 0,
    level: t.level ?? 1,
    statPoints: t.statPoints ?? 0,
    autoLevel: !!t.autoLevel,
    race: t.race ?? '',
    armed: !!t.armed,
    secretKnowledge: t.secretKnowledge ?? null,
    // Дерево способностей и активные слоты
    treeActivatedIds: t.treeActivatedIds ?? [],
    abilities: t.abilities ?? [],
    passiveAbilities: normalizePassiveAbilityIds(t.passiveAbilities ?? []),
    // Боевые статусы
    stunned: !!t.stunned,
    captured: !!t.captured,
    combatLog: t.combatLog ?? [],
    // Контейнеры / визуал
    items: t.items ?? undefined,
    opened: !!t.opened,
    locked: !!t.locked,
    halfSize: !!t.halfSize,
    quarterSize: !!t.quarterSize,
  }))
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
  const mapContext = ref('')
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
    mapContext.value = selectedScenario.value?.mapContext ?? ''
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
        mapContext: mapContext.value,
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
    mapContext,
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
