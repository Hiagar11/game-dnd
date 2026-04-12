import { computed } from 'vue'

export function useDispositionHint({ form, options }) {
  const dispositionHint = computed(
    () => options.find((option) => option.value === form.value.dispositionType)?.hint ?? ''
  )

  return {
    dispositionHint,
  }
}
