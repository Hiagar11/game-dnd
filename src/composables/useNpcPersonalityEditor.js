import { NPC_NAMES } from '../constants/personalityTags'

export function useNpcPersonalityEditor(form) {
  function randomizeName() {
    const pool = NPC_NAMES.filter((name) => name !== form.value.npcName)
    form.value.npcName = pool[Math.floor(Math.random() * pool.length)]
  }

  function isTagActive(phrase) {
    return form.value.personality.includes(phrase)
  }

  function toggleTag(phrase) {
    if (isTagActive(phrase)) {
      form.value.personality = form.value.personality
        .replace(` ${phrase}`, '')
        .replace(`${phrase} `, '')
        .replace(phrase, '')
        .trim()
      return
    }

    const current = form.value.personality.trim()
    const separator = current.length > 0 ? ' ' : ''
    const next = `${current}${separator}${phrase}`
    if (next.length <= 500) form.value.personality = next
  }

  return {
    randomizeName,
    isTagActive,
    toggleTag,
  }
}
