import { ref, watch } from 'vue'
import { createEmptyInventory, normalizeInventorySnapshot } from '../utils/inventoryState'
import { getNpcAttitude } from '../utils/tokenFilters'

export function useTokenEditFormState({
  props,
  isPlacedMode,
  isEditMode,
  store,
  tokensStore,
  saveError,
}) {
  const defaultStats = { strength: 0, agility: 0, intellect: 0, charisma: 0 }

  const form = ref({
    name: '',
    npcName: '',
    attitude: 'neutral',
    dispositionType: 'neutral',
    personality: '',
    contextNotes: '',
    ...defaultStats,
  })

  const inventoryModel = ref(null)
  const previewSrc = ref(null)
  const fileRef = ref(null)

  function populateFormFromToken(token) {
    const {
      name,
      npcName,
      src,
      strength,
      agility,
      intellect,
      charisma,
      attitude,
      personality,
      contextNotes,
    } = token

    form.value = {
      name,
      npcName: npcName ?? '',
      attitude: getNpcAttitude(attitude),
      dispositionType: token.dispositionType ?? 'neutral',
      personality: personality ?? '',
      contextNotes: contextNotes ?? '',
      strength,
      agility,
      intellect,
      charisma,
    }
    inventoryModel.value = normalizeInventorySnapshot(token?.inventory)
    previewSrc.value = src
  }

  function resetForm() {
    saveError.value = ''
    if (isPlacedMode.value) {
      const token = store.placedTokens.find((entry) => entry.uid === props.placedUid)
      if (token) populateFormFromToken(token)
      return
    }

    if (isEditMode.value) {
      const token = tokensStore.tokens.find((entry) => entry.id === props.tokenId)
      if (token) populateFormFromToken(token)
      return
    }

    form.value = {
      name: props.defaultName,
      npcName: '',
      attitude: getNpcAttitude(props.defaultAttitude),
      dispositionType: 'neutral',
      personality: '',
      contextNotes: '',
      ...defaultStats,
    }
    previewSrc.value = null
    fileRef.value = null
    inventoryModel.value = createEmptyInventory()
  }

  watch(
    () => props.visible,
    (visible) => {
      if (visible) resetForm()
    }
  )

  return {
    form,
    inventoryModel,
    previewSrc,
    fileRef,
  }
}
