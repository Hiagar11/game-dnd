import { ref, onUnmounted } from 'vue'

export function useNpcDialog(store) {
  const dialogBubbles = ref(new Map())

  const bubbleCleanups = new Map()

  const attitudeArrows = ref({})

  function closeBubble(uid) {
    const m = new Map(dialogBubbles.value)
    m.delete(uid)
    dialogBubbles.value = m
    bubbleCleanups.get(uid)?.()
    bubbleCleanups.delete(uid)
  }

  function openBubble(uid, heroSrc = null) {
    closeBubble(uid)
    const next = new Map(dialogBubbles.value)
    const placed = store.placedTokens.find((t) => t.uid === uid)
    const initScore =
      placed?.attitude === 'friendly' ? 50 : placed?.attitude === 'hostile' ? -50 : 0
    next.set(uid, { messages: [], loading: true, heroSrc, npcScore: initScore })
    dialogBubbles.value = next
    const timer = setTimeout(() => {
      function onOutsideClick(e) {
        const insideBubble = e.composedPath().some((el) => el.classList?.contains('dialog-bubble'))
        if (!insideBubble) closeBubble(uid)
      }
      document.addEventListener('click', onOutsideClick, true)
      bubbleCleanups.set(uid, () => document.removeEventListener('click', onOutsideClick, true))
    }, 150)
    bubbleCleanups.set(uid, () => clearTimeout(timer))
  }

  function addNpcMessage(uid, text, npcScore) {
    const m = new Map(dialogBubbles.value)
    const b = m.get(uid)
    if (!b) return
    const update = { ...b, messages: [...b.messages, { who: 'npc', text }], loading: false }
    if (npcScore !== undefined) update.npcScore = npcScore
    m.set(uid, update)
    dialogBubbles.value = m
  }

  function addPlayerMessage(uid, text) {
    const m = new Map(dialogBubbles.value)
    const b = m.get(uid)
    if (!b) return
    m.set(uid, { ...b, messages: [...b.messages, { who: 'player', text }], loading: true })
    dialogBubbles.value = m
  }

  function triggerAttitudeArrow(uid, direction) {
    attitudeArrows.value = { ...attitudeArrows.value, [uid]: direction }
    setTimeout(() => {
      const next = { ...attitudeArrows.value }
      delete next[uid]
      attitudeArrows.value = next
    }, 1500)
  }

  onUnmounted(() => {
    for (const cleanup of bubbleCleanups.values()) cleanup()
    bubbleCleanups.clear()
  })

  return {
    dialogBubbles,
    attitudeArrows,
    closeBubble,
    openBubble,
    addNpcMessage,
    addPlayerMessage,
    triggerAttitudeArrow,
  }
}
