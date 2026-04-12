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
}) {
  async function onSave() {
    if (!canSave.value) return
    playClick()
    saving.value = true
    saveError.value = ''
    try {
      const { name, npcName, strength, agility, intellect, charisma } = form.value
      if (isPlacedMode.value) {
        const fields = {
          name,
          npcName,
          attitude: form.value.attitude,
          dispositionType: form.value.dispositionType,
          personality: form.value.personality,
          contextNotes: form.value.contextNotes,
          strength,
          agility,
          intellect,
          charisma,
          inventory: normalizeInventorySnapshot(inventoryModel.value),
        }
        store.editPlacedToken(props.placedUid, fields)
        // Persist placed-token edits to backend so session save keeps latest values.
        const scenarioId = getCurrentScenarioId(store)
        if (scenarioId) {
          getSocket()?.emit('token:edit', { scenarioId, uid: props.placedUid, fields })
        }
      } else if (isEditMode.value) {
        await tokensStore.editToken(props.tokenId, {
          name,
          npcName,
          attitude: form.value.attitude,
          dispositionType: form.value.dispositionType,
          personality: form.value.personality,
          contextNotes: form.value.contextNotes,
          strength,
          agility,
          intellect,
          charisma,
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
        fd.append('strength', strength)
        fd.append('agility', agility)
        fd.append('intellect', intellect)
        fd.append('charisma', charisma)
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
      if (!confirm(`Убрать токен «${form.value.name}» с карты?`)) return
      store.removeToken(props.placedUid)
      const scenarioId = getCurrentScenarioId(store)
      if (scenarioId) getSocket()?.emit('token:remove', { scenarioId, uid: props.placedUid })
      emit('close')
      return
    }

    if (!confirm(`Удалить токен «${form.value.name}»?`)) return
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
