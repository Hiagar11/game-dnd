import { RARITY_WEIGHTS_BY_PROFILE, SLOT_RARITY_PROFILES } from '../constants/lootRarity'

export const SLOT_STAT_WEIGHTS = {
  weapon: { damage: 6, hit_chance: 3.4, initiative: 1.9, defense: 0.2 },
  two_handed: { damage: 7, hit_chance: 2.8, initiative: 1.5, defense: 0.15 },
  ranged: { hit_chance: 5.2, damage: 4.2, initiative: 2.5, dodge: 0.9 },
  magic_weapon: { magic_power: 5.5, damage: 3.1, hit_chance: 2.2, resistance: 0.8 },
  helmet: { defense: 4.5, resistance: 3.1, dodge: 1.1 },
  armor: { defense: 5.2, resistance: 2.8, initiative: 1 },
  offhand: { defense: 4.2, resistance: 3.4, dodge: 1.5, magic_power: 0.6 },
  gloves: { hit_chance: 3.7, damage: 3.2, dodge: 1.9 },
  boots: { initiative: 4.3, dodge: 3.5, hit_chance: 1.3, resistance: 0.8 },
  legs: { defense: 3.6, dodge: 2.7, resistance: 2.4 },
  belt: { defense: 2.2, damage: 1.5, initiative: 1.4, resistance: 1.1 },
  cloak: { dodge: 3.2, resistance: 3, magic_power: 2.3, persuasion: 0.9 },
  amulet: { magic_power: 4.6, resistance: 2.3, persuasion: 2.2, damage: 0.8 },
  ring: {
    damage: 1.9,
    hit_chance: 1.8,
    initiative: 1.6,
    persuasion: 1.5,
    defense: 1.2,
    dodge: 1.4,
    magic_power: 1.9,
    resistance: 1.7,
  },
  potion: {},
  other: {
    damage: 1.8,
    hit_chance: 1.7,
    initiative: 1.5,
    persuasion: 1.4,
    defense: 1.4,
    dodge: 1.5,
    magic_power: 1.7,
    resistance: 1.6,
  },
}

export const OWNER_STAT_MOD_WEIGHTS = {
  strength: { damage: 2.4, defense: 1.7, hit_chance: 0.9 },
  agility: { initiative: 2.2, dodge: 2.1, hit_chance: 1.5, damage: 0.8 },
  intellect: { magic_power: 2.6, resistance: 1.5 },
  charisma: { persuasion: 2.5, resistance: 0.8, initiative: 0.5 },
}

export function rarityProfileForSlot(slot) {
  return SLOT_RARITY_PROFILES[slot] ?? 'other'
}

export function rollRarityCount(slot, maxTraits, random = Math.random) {
  const profile = rarityProfileForSlot(slot)
  const baseWeights = RARITY_WEIGHTS_BY_PROFILE[profile] ?? RARITY_WEIGHTS_BY_PROFILE.other
  const eligible = baseWeights.filter((r) => r.count <= maxTraits)
  if (!eligible.length) return 0

  const total = eligible.reduce((s, r) => s + r.weight, 0)
  let rand = random() * total
  for (const r of eligible) {
    rand -= r.weight
    if (rand <= 0) return r.count
  }
  return eligible[eligible.length - 1].count
}

export function statWeightsForSlot(slot) {
  return SLOT_STAT_WEIGHTS[slot] ?? SLOT_STAT_WEIGHTS.other
}

export function positiveTraitsPool(traits) {
  return traits.filter((trait) => (trait.mods ?? []).some((mod) => Number(mod?.value) > 0))
}

export function traitWeight(trait, slot, ownerStats = {}) {
  const mods = Array.isArray(trait?.mods) ? trait.mods : []
  if (!mods.length) return 0.05

  const slotWeights = statWeightsForSlot(slot)
  const primaryKeys = ['strength', 'agility', 'intellect', 'charisma']
  const totalPrimary = primaryKeys.reduce(
    (sum, key) => sum + Math.max(0, Number(ownerStats[key]) || 0),
    0
  )

  let weight = 0
  for (const mod of mods) {
    const stat = mod?.stat
    const value = Number(mod?.value) || 0
    if (!stat || !value) continue

    const signFactor = value > 0 ? 1 : 0.2
    const slotAffinity = slotWeights[stat] ?? 0.12
    let ownerAffinity = 0

    if (totalPrimary > 0) {
      for (const primaryKey of primaryKeys) {
        const share = Math.max(0, Number(ownerStats[primaryKey]) || 0) / totalPrimary
        ownerAffinity += share * (OWNER_STAT_MOD_WEIGHTS[primaryKey]?.[stat] ?? 0)
      }
    }

    const magnitude = Math.max(1, Math.abs(value))
    weight += signFactor * (slotAffinity * 2.4 + ownerAffinity * 1.8 + magnitude * 0.05)
  }

  return Math.max(0.05, weight)
}

export function pickWeightedTraitIds(traits, count, slot, ownerStats = {}, random = Math.random) {
  const pool = [...traits]
  const selectedIds = []

  for (let index = 0; index < count && pool.length; index += 1) {
    const weightedPool = pool
      .map((trait) => ({ trait, weight: traitWeight(trait, slot, ownerStats) }))
      .filter((entry) => entry.weight > 0)

    if (!weightedPool.length) break

    const total = weightedPool.reduce((sum, entry) => sum + entry.weight, 0)
    let rand = random() * total
    let picked = weightedPool[weightedPool.length - 1].trait

    for (const entry of weightedPool) {
      rand -= entry.weight
      if (rand <= 0) {
        picked = entry.trait
        break
      }
    }

    selectedIds.push(picked.id)
    const removeIndex = pool.findIndex((trait) => trait.id === picked.id)
    if (removeIndex !== -1) pool.splice(removeIndex, 1)
  }

  return selectedIds
}
