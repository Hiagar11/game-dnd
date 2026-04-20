import { normalizeInventorySnapshot } from '../utils/inventoryState'
import { getCurrentScenarioId } from '../utils/scenario'

export function useTokenEditActions({
  canSave,
  playClick,
  saving,
  saveError,
  form,
  isPlacedMode,
  isEditMode,
  inventoryModel,
  store,
  props,
  getSocket,
  tokensStore,
  fileRef,
  emit,
  localTreeIds,
  localAbilities,
  localPassives,
}) {
  async function onSave() {
    if (!canSave.value) return
    playClick()
    saving.value = true
    saveError.value = ''
    try {
      const { npcName, strength, agility, intellect, charisma } = form.value
      const name = npcName
      if (isPlacedMode.value) {
        const fields = {
          name,
          npcName,
          attitude: form.value.attitude,
          dispositionType: form.value.dispositionType,
          personality: form.value.personality,
          contextNotes: form.value.contextNotes,
          secretKnowledge: form.value.secretKnowledge,
          strength,
          agility,
          intellect,
          charisma,
          xp: form.value.xp ?? 0,
          level: form.value.level ?? 1,
          statPoints: form.value.statPoints ?? 0,
          autoLevel: !!form.value.autoLevel,
          race: form.value.race ?? '',
          inventory: normalizeInventorySnapshot(inventoryModel.value),
          treeActivatedIds: localTreeIds?.value ?? [],
          abilities: localAbilities?.value ?? [],
          passiveAbilities: localPassives?.value ?? [],
        }
        store.editPlacedToken(props.placedUid, fields)
        // Изменения живут только в Pinia-сторе до сохранения сессии.
        // В БД попадут при game:session:save → scenario:persist-tokens.
      } else if (isEditMode.value) {
        await tokensStore.editToken(props.tokenId, {
          name,
          npcName,
          attitude: form.value.attitude,
          dispositionType: form.value.dispositionType,
          personality: form.value.personality,
          contextNotes: form.value.contextNotes,
          secretKnowledge: form.value.secretKnowledge,
          strength,
          agility,
          intellect,
          charisma,
          race: form.value.race ?? '',
        })
      } else {
        const fd = new FormData()
        fd.append('image', fileRef.value)
        fd.append('name', name)
        fd.append('npcName', npcName ?? '')
        fd.append('tokenType', props.tokenType)
        fd.append('attitude', form.value.attitude)
        fd.append('dispositionType', form.value.dispositionType)
        fd.append('personality', form.value.personality)
        fd.append('contextNotes', form.value.contextNotes)
        fd.append('secretKnowledge', form.value.secretKnowledge)
        fd.append('strength', strength)
        fd.append('agility', agility)
        fd.append('intellect', intellect)
        fd.append('charisma', charisma)
        fd.append('race', form.value.race ?? '')
        await tokensStore.addToken(fd)
      }
      emit('close')
    } catch (err) {
      saveError.value = err.message ?? 'Ошибка при сохранении'
    } finally {
      saving.value = false
    }
  }

  async function onDelete() {
    playClick()
    if (isPlacedMode.value) {
      if (!confirm(`Убрать токен «${form.value.npcName || form.value.name}» с карты?`)) return
      store.removeToken(props.placedUid)
      const scenarioId = getCurrentScenarioId(store)
      if (scenarioId) getSocket()?.emit('token:remove', { scenarioId, uid: props.placedUid })
      emit('close')
      return
    }

    if (!confirm(`Удалить токен «${form.value.npcName || form.value.name}»?`)) return
    saving.value = true
    try {
      await tokensStore.deleteToken(props.tokenId)
      emit('close')
    } catch (err) {
      saveError.value = err.message || 'Ошибка при удалении'
    } finally {
      saving.value = false
    }
  }

  return {
    onSave,
    onDelete,
  }
}
