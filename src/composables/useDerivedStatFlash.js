import { ref, watch } from 'vue'
import { ALL_DERIVED_KEYS } from '../constants/tokenStatKeys'

export function useDerivedStatFlash({ modelValue, computeDerived }) {
  const flashingKeys = ref(new Set())
  const arrowKeys = ref(new Set())

  let prevDerived = Object.fromEntries(ALL_DERIVED_KEYS.map((key) => [key, computeDerived(key)]))

  watch(
    modelValue,
    () => {
      const nextFlashing = new Set()

      for (const key of ALL_DERIVED_KEYS) {
        const next = computeDerived(key)
        if (next > prevDerived[key]) {
          nextFlashing.add(key)
        }
        prevDerived[key] = next
      }

      if (nextFlashing.size <= 0) return

      flashingKeys.value = nextFlashing
      arrowKeys.value = new Set(nextFlashing)

      setTimeout(() => {
        flashingKeys.value = new Set()
      }, 600)

      setTimeout(() => {
        arrowKeys.value = new Set()
      }, 2600)
    },
    { deep: true }
  )

  return {
    flashingKeys,
    arrowKeys,
  }
}
