// ─── Composable: логика дерева способностей ─────────────────────
// Принимает реактивные статы токена и список активированных способностей.
// Возвращает для каждой способности статус: locked / available / activated.

import { computed } from 'vue'
import { ABILITY_TREE, TIERS, getAbilitiesByTier } from '../constants/abilityTree'

/**
 * Статусы способности в дереве:
 * - 'locked'    — статы не дотягивают или пререквизиты не активированы
 * - 'available' — можно изучить (статы ОК + пререквизиты активированы)
 * - 'activated' — уже активирована в слоте
 */

export function useAbilityTree(stats, activatedIds) {
  // Множество активированных ID для быстрой проверки
  const activatedSet = computed(() => new Set(activatedIds.value))

  // Проверка: хватает ли статов
  function meetsStatRequirements(ability) {
    const r = ability.requirements
    const s = stats.value
    return (
      (s.strength ?? 0) >= r.strength &&
      (s.agility ?? 0) >= r.agility &&
      (s.intellect ?? 0) >= r.intellect &&
      (s.charisma ?? 0) >= r.charisma
    )
  }

  // Проверка: все пререквизиты активированы
  function meetsAbilityRequirements(ability) {
    if (!ability.requiredAbilities.length) return true
    return ability.requiredAbilities.every((id) => activatedSet.value.has(id))
  }

  // Статус каждой способности
  function getStatus(ability) {
    if (activatedSet.value.has(ability.id)) return 'activated'
    if (meetsStatRequirements(ability) && meetsAbilityRequirements(ability)) return 'available'
    return 'locked'
  }

  // Дерево сгруппированное по тирам — для UI
  const tree = computed(() =>
    TIERS.map((tier) => ({
      tier,
      abilities: getAbilitiesByTier(tier).map((ability) => ({
        ...ability,
        status: getStatus(ability),
      })),
    }))
  )

  // Только видимые (available + activated) — скрываем locked, прячем пустые тиры
  const visibleTree = computed(() =>
    tree.value
      .map((group) => ({
        ...group,
        abilities: group.abilities.filter((a) => a.status !== 'locked'),
      }))
      .filter((group) => group.abilities.length > 0)
  )

  // Плоский список всех способностей со статусами
  const flatTree = computed(() =>
    ABILITY_TREE.map((ability) => ({
      ...ability,
      status: getStatus(ability),
    }))
  )

  // Только доступные для изучения (available)
  const availableAbilities = computed(() => flatTree.value.filter((a) => a.status === 'available'))

  // Только активированные
  const activatedAbilities = computed(() => flatTree.value.filter((a) => a.status === 'activated'))

  // Сколько очков активации использовано
  const usedActivationPoints = computed(() => activatedSet.value.size)

  // Форматирование требований для подсказки
  function formatRequirements(ability) {
    const r = ability.requirements
    const parts = []
    if (r.strength) parts.push(`S≥${r.strength}`)
    if (r.agility) parts.push(`A≥${r.agility}`)
    if (r.intellect) parts.push(`I≥${r.intellect}`)
    if (r.charisma) parts.push(`C≥${r.charisma}`)
    return parts.join(' ')
  }

  // Проверка: какие конкретно требования не выполнены
  function getMissingRequirements(ability) {
    const r = ability.requirements
    const s = stats.value
    const missing = []
    if ((s.strength ?? 0) < r.strength) missing.push(`S: ${s.strength ?? 0}/${r.strength}`)
    if ((s.agility ?? 0) < r.agility) missing.push(`A: ${s.agility ?? 0}/${r.agility}`)
    if ((s.intellect ?? 0) < r.intellect) missing.push(`I: ${s.intellect ?? 0}/${r.intellect}`)
    if ((s.charisma ?? 0) < r.charisma) missing.push(`C: ${s.charisma ?? 0}/${r.charisma}`)

    const missingAbilities = ability.requiredAbilities.filter((id) => !activatedSet.value.has(id))

    return { stats: missing, abilities: missingAbilities }
  }

  return {
    tree,
    visibleTree,
    flatTree,
    availableAbilities,
    activatedAbilities,
    usedActivationPoints,
    getStatus,
    formatRequirements,
    getMissingRequirements,
  }
}
