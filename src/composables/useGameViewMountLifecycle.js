import { onMounted, onUnmounted } from 'vue'

export function useGameViewMountLifecycle({
  scenariosStore,
  campaignsStore,
  gameSessionsStore,
  onBeforeUnload,
  auth,
  connect,
  stopTravelMusic,
  stopBattleMusic,
  sessionActive,
  getSocket,
}) {
  onMounted(() => {
    scenariosStore.fetchScenarios()
    campaignsStore.fetchCampaigns()
    gameSessionsStore.fetchSessions()
    window.addEventListener('beforeunload', onBeforeUnload)
    if (auth.role === 'admin') {
      connect(auth.token)
    }
  })

  onUnmounted(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    stopTravelMusic()
    stopBattleMusic()
    if (sessionActive.value) {
      getSocket()?.emit('game:session:close')
      sessionActive.value = false
    }
  })
}
