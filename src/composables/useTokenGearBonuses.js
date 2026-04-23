import { computed } from 'vue'
import { EQUIP_SLOT_KEYS } from '../constants/inventorySlots'
import { DERIVED_ALIAS_MAP, DERIVED_MOD_KEYS, PRIMARY_KEYS } from '../constants/tokenStatKeys'
import { getRaceById } from '../constants/races'
import { getPassiveDerivedBonus, getPassivePrimaryBonus } from '../utils/passiveBonuses'

export function useTokenGearBonuses({ inventory, modelValue, passiveAbilities }) {
  const equippedItems = computed(() => {
    const equipped = inventory?.value?.equipped
    if (!equipped || typeof equipped !== 'object') return []
    return EQUIP_SLOT_KEYS.map((key) => equipped[key]).filter(Boolean)
  })

  const gearBonuses = computed(() => {
    const totals = Object.fromEntries([...PRIMARY_KEYS, ...DERIVED_MOD_KEYS].map((key) => [key, 0]))

    for (const item of equippedItems.value) {
      // Implicit mod
      if (item.implicit) {
        const key = DERIVED_ALIAS_MAP[item.implicit.stat] ?? item.implicit.stat
        if (Object.prototype.hasOwnProperty.call(totals, key)) {
          totals[key] += Number(item.implicit.value) || 0
        }
      }

      // Affixes (PoE-стиль)
      for (const affix of item.affixes ?? []) {
        const key = DERIVED_ALIAS_MAP[affix.stat] ?? affix.stat
        if (Object.prototype.hasOwnProperty.call(totals, key)) {
          totals[key] += Number(affix.value) || 0
        }
      }

      // Legacy: traitIds (backward compatibility)
      for (const traitId of item.traitIds ?? []) {
        const trait = (item.traitOverrides?.[traitId] ?? []).length
          ? { mods: item.traitOverrides[traitId] }
          : null
        if (!trait) continue
        for (const mod of trait.mods ?? []) {
          const modKey = DERIVED_ALIAS_MAP[mod.stat] ?? mod.stat
          if (Object.prototype.hasOwnProperty.call(totals, modKey)) {
            totals[modKey] += Number(mod.value) || 0
          }
        }
      }
    }

    return totals
  })

  const raceBonuses = computed(() => {
    const race = getRaceById(modelValue.value?.race)
    return race?.bonuses ?? {}
  })

  const passiveIds = computed(() => {
    if (Array.isArray(passiveAbilities?.value)) return passiveAbilities.value
    return modelValue.value?.passiveAbilities ?? []
  })

  const primaryBonusFromItemsRace = (key) =>
    (gearBonuses.value[key] ?? 0) + (raceBonuses.value[key] ?? 0)

  const primaryBonusFromPassives = (key) => getPassivePrimaryBonus(passiveIds.value, key)

  const derivedBonusFromItems = (key) => gearBonuses.value[DERIVED_ALIAS_MAP[key] ?? key] ?? 0

  const derivedBonusFromPassives = (key) => getPassiveDerivedBonus(passiveIds.value, key)

  const totalStats = computed(() => {
    const stats = modelValue.value
    return {
      ...stats,
      strength:
        (stats.strength ?? 0) +
        primaryBonusFromItemsRace('strength') +
        primaryBonusFromPassives('strength'),
      agility:
        (stats.agility ?? 0) +
        primaryBonusFromItemsRace('agility') +
        primaryBonusFromPassives('agility'),
      intellect:
        (stats.intellect ?? 0) +
        primaryBonusFromItemsRace('intellect') +
        primaryBonusFromPassives('intellect'),
      charisma:
        (stats.charisma ?? 0) +
        primaryBonusFromItemsRace('charisma') +
        primaryBonusFromPassives('charisma'),
    }
  })

  const primaryBonus = (key) => primaryBonusFromItemsRace(key) + primaryBonusFromPassives(key)

  const directDerivedBonus = (key) => derivedBonusFromItems(key) + derivedBonusFromPassives(key)

  return {
    totalStats,
    primaryBonus,
    directDerivedBonus,
    primaryBonusFromItemsRace,
    primaryBonusFromPassives,
    derivedBonusFromItems,
    derivedBonusFromPassives,
  }
}
