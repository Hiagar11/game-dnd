import { onMounted, onUnmounted } from 'vue'

export function useSpaceTurnHotkey({ gameStore, playNext }) {
  function onSpaceKey(event) {
    if (event.code !== 'Space') return
    const tag = event.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable) return
    event.preventDefault()
    if (gameStore.combatPair) gameStore.setCombatPair(null, null)
    playNext()
    gameStore.endTurn()
  }

  onMounted(() => {
    window.addEventListener('keydown', onSpaceKey)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onSpaceKey)
  })
}
