// ─── Composable: AI-подсказки при прокачке ──────────────────────
// Определяет способности, до открытия которых не хватает 1 очка,
// и запрашивает у AI одну загадочную загадку-намёк.

import { ref } from 'vue'
import { ABILITY_TREE } from '../constants/abilityTree'
import { useApi } from './useApi'

/**
 * @param {import('vue').Ref<object>} stats  — { strength, agility, intellect, charisma }
 * @param {import('vue').Ref<string[]>} activatedIds — массив уже активированных ID
 */
export function useAbilityHints(stats, activatedIds) {
  const hints = ref([])
  const loading = ref(false)

  /**
   * Находит способности, до открытия которых не хватает ровно 1 очка
   * в одном стате (остальные статы ОК), и пререквизиты выполнены.
   */
  function findNearAbilities() {
    const s = stats.value
    const activated = new Set(activatedIds.value)

    return ABILITY_TREE.filter((ability) => {
      if (activated.has(ability.id)) return false

      const r = ability.requirements

      if (ability.requiredAbilities.length) {
        const allPrereqsMet = ability.requiredAbilities.every((id) => activated.has(id))
        if (!allPrereqsMet) return false
      }

      const statKeys = ['strength', 'agility', 'intellect', 'charisma']
      let missingCount = 0
      let totalMissing = 0

      for (const key of statKeys) {
        const diff = r[key] - (s[key] ?? 0)
        if (diff > 0) {
          missingCount++
          totalMissing += diff
        }
      }

      return missingCount === 1 && totalMissing === 1
    }).map((ability) => ({
      name: ability.name,
      description: ability.description,
    }))
  }

  /**
   * Вызывается после распределения очка.
   * Проверяет, есть ли «почти открытые», и запрашивает одну AI-загадку.
   */
  async function checkAndFetchHints() {
    hints.value = []
    const near = findNearAbilities()
    if (!near.length) return

    loading.value = true
    try {
      const api = useApi()
      const data = await api.post('/api/ai/ability-hints', { abilities: near })
      if (Array.isArray(data.hints) && data.hints.length) {
        // Всегда берём только первую подсказку
        hints.value = [data.hints[0]]
      }
    } catch (err) {
      console.warn('[ability-hints] Не удалось получить подсказки:', err.message)
    } finally {
      loading.value = false
    }
  }

  /** Скрыть подсказки (пользователь закрыл) */
  function dismissHints() {
    hints.value = []
  }

  return { hints, loading, checkAndFetchHints, dismissHints }
}
