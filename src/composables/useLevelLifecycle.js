import { onMounted, onUnmounted, watch } from 'vue'

export function useLevelLifecycle({
  scenariosStore,
  selectedScenario,
  onLevelBack,
  autoLoadScenario,
  editLevel,
}) {
  function onKeyDown(event) {
    if (event.key !== 'Escape') return
    if (selectedScenario.value) {
      event.stopImmediatePropagation()
      onLevelBack()
    }
  }

  onMounted(() => {
    scenariosStore.fetchScenarios()
    window.addEventListener('keydown', onKeyDown, { capture: true })
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown, { capture: true })
  })

  watch(
    () => autoLoadScenario.value,
    async (scenario) => {
      if (scenario) await editLevel(scenario)
    },
    { immediate: true }
  )
}
