import { ref } from 'vue'
import { useNpcPersonalityEditor } from './useNpcPersonalityEditor'

export function useTokenPersonalityEditorUi(form) {
  const personalityTextarea = ref(null)
  const { randomizeName, isTagActive, toggleTag } = useNpcPersonalityEditor(form)

  return {
    personalityTextarea,
    randomizeName,
    isTagActive,
    toggleTag,
  }
}
