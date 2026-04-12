import { watch } from 'vue'

export function useCombatMusicSync({
  gameStore,
  playBattleMusic,
  stopBattleMusic,
  playTravelMusic,
  stopTravelMusic,
}) {
  watch(
    () => gameStore.combatMode,
    (active) => {
      if (active) {
        stopTravelMusic()
        playBattleMusic()
      } else {
        stopBattleMusic()
        playTravelMusic()
      }
    }
  )
}
