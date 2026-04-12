import { computed } from 'vue'
import { EQUIP_SLOT_KEYS } from '../constants/inventorySlots'
import { DERIVED_ALIAS_MAP, DERIVED_MOD_KEYS, PRIMARY_KEYS } from '../constants/tokenStatKeys'

export function useTokenGearBonuses({ inventory, modelValue, traitsStore }) {
  const equippedItems = computed(() => {
    const equipped = inventory?.value?.equipped
    if (!equipped || typeof equipped !== 'object') return []
    return EQUIP_SLOT_KEYS.map((key) => equipped[key]).filter(Boolean)
  })

  const gearBonuses = computed(() => {
    const totals = Object.fromEntries([...PRIMARY_KEYS, ...DERIVED_MOD_KEYS].map((key) => [key, 0]))

    for (const item of equippedItems.value) {
      for (const traitId of item.traitIds ?? []) {
        const trait = traitsStore.traits.find((entry) => entry.id === traitId)
        if (!trait) continue

        for (const mod of trait.mods ?? []) {
          if (Object.prototype.hasOwnProperty.call(totals, mod.stat)) {
            totals[mod.stat] += Number(mod.value) || 0
          }
        }
      }
    }

    return totals
  })

  const totalStats = computed(() => {
    const stats = modelValue.value
    return {
      ...stats,
      strength: (stats.strength ?? 0) + gearBonuses.value.strength,
      agility: (stats.agility ?? 0) + gearBonuses.value.agility,
      intellect: (stats.intellect ?? 0) + gearBonuses.value.intellect,
      charisma: (stats.charisma ?? 0) + gearBonuses.value.charisma,
    }
  })

  const primaryBonus = (key) => gearBonuses.value[key] ?? 0
  const directDerivedBonus = (key) => gearBonuses.value[DERIVED_ALIAS_MAP[key] ?? key] ?? 0

  return {
    totalStats,
    primaryBonus,
    directDerivedBonus,
  }
}
