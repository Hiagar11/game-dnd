import { computed } from 'vue'

export function useTokenEditMode(props) {
  const isPlacedMode = computed(() => props.placedUid !== null)
  const isEditMode = computed(() => props.tokenId !== null || isPlacedMode.value)

  return {
    isPlacedMode,
    isEditMode,
  }
}
