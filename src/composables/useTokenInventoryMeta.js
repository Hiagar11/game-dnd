import { computed } from 'vue'

export function useTokenInventoryMeta(form) {
  const ownerStatsForInventory = computed(() => ({
    strength: Number(form.value.strength ?? 0) || 0,
    agility: Number(form.value.agility ?? 0) || 0,
    intellect: Number(form.value.intellect ?? 0) || 0,
    charisma: Number(form.value.charisma ?? 0) || 0,
  }))

  const itemGenerationLevel = computed(() => {
    const stats = ownerStatsForInventory.value
    const total = stats.strength + stats.agility + stats.intellect + stats.charisma
    return Math.max(1, Math.round(total / 4) || 1)
  })

  return {
    ownerStatsForInventory,
    itemGenerationLevel,
  }
}
