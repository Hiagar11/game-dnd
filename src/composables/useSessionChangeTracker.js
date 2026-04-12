import { watch } from 'vue'

export function useSessionChangeTracker({ gameStore, sessionActive, sessionChanged }) {
  watch(
    () => gameStore.placedTokens,
    () => {
      if (sessionActive.value) sessionChanged.value = true
    },
    { deep: true }
  )
}
