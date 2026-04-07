// Composable для управления кампанией (save/load/delete + стартовая локация).
// Используется в EditorScenarioSection — отделяет CRUD от логики графа.
import { ref } from 'vue'
import { useCampaignsStore } from '../stores/campaigns'

export function useCampaignCrud(graph) {
  const campaignsStore = useCampaignsStore()

  const activeCampaignId = ref(null)
  const campaignName = ref('')
  const startScenarioId = ref(null)
  const saving = ref(false)
  const saveSuccess = ref(false)
  const saveError = ref('')

  // ─── Загрузить кампанию в редактор ───────────────────────────────────────────
  function loadCampaign(campaign) {
    activeCampaignId.value = campaign.id
    campaignName.value = campaign.name
    startScenarioId.value = campaign.startScenarioId ?? null
    saveSuccess.value = false
    saveError.value = ''
    graph.loadGraphFromCampaign(campaign)
  }

  // ─── Сбросить до пустого состояния ───────────────────────────────────────────
  function resetEditor() {
    activeCampaignId.value = null
    campaignName.value = ''
    startScenarioId.value = null
    saveSuccess.value = false
    saveError.value = ''
    graph.resetGraph()
  }

  // Переключить стартовую локацию (повторный клик снимает отметку)
  function toggleStart(scenarioId) {
    startScenarioId.value = startScenarioId.value === scenarioId ? null : scenarioId
  }

  // ─── Сохранить / обновить кампанию ───────────────────────────────────────────
  async function saveCampaign() {
    if (!campaignName.value) return
    saving.value = true
    saveError.value = ''
    saveSuccess.value = false
    try {
      const data = {
        name: campaignName.value,
        nodes: graph.levelsWithNodes.value.map(({ scenarioId, x, y }) => ({ scenarioId, x, y })),
        edges: graph.edges.value,
        startScenarioId: startScenarioId.value || null,
      }
      if (activeCampaignId.value) {
        await campaignsStore.updateCampaign(activeCampaignId.value, data)
      } else {
        const result = await campaignsStore.createCampaign(data)
        activeCampaignId.value = result.id
      }
      saveSuccess.value = true
      setTimeout(() => (saveSuccess.value = false), 3000)
    } catch (err) {
      saveError.value = err.message || 'Ошибка при сохранении'
    } finally {
      saving.value = false
    }
  }

  // ─── Удалить кампанию ────────────────────────────────────────────────────────
  async function deleteCampaign() {
    if (!confirm(`Удалить сценарий «${campaignName.value}»?`)) return
    try {
      await campaignsStore.deleteCampaign(activeCampaignId.value)
      resetEditor()
    } catch (err) {
      saveError.value = err.message || 'Ошибка при удалении'
    }
  }

  return {
    activeCampaignId,
    campaignName,
    startScenarioId,
    saving,
    saveSuccess,
    saveError,
    loadCampaign,
    resetEditor,
    toggleStart,
    saveCampaign,
    deleteCampaign,
  }
}
