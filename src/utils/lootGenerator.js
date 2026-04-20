import {
  RARITY_WEIGHTS_BY_PROFILE,
  SLOT_RARITY_PROFILES,
  RARITY_COLORS,
} from '../constants/lootRarity'
import { ITEM_BASES } from '../constants/itemBases'
import { AFFIXES, RARITY_AFFIX_COUNTS } from '../constants/itemAffixes'

/* ── helpers ──────────────────────────────────────────────────────── */

function randInt(min, max, random = Math.random) {
  return Math.floor(random() * (max - min + 1)) + min
}

function weightedPick(entries, random = Math.random) {
  const total = entries.reduce((s, e) => s + e.weight, 0)
  let roll = random() * total
  for (const entry of entries) {
    roll -= entry.weight
    if (roll <= 0) return entry
  }
  return entries[entries.length - 1]
}

/* ── rarity roll ──────────────────────────────────────────────────── */

export function rollRarity(slot, random = Math.random) {
  const profile = SLOT_RARITY_PROFILES[slot] ?? 'other'
  const weights = RARITY_WEIGHTS_BY_PROFILE[profile] ?? RARITY_WEIGHTS_BY_PROFILE.other
  return weightedPick(weights, random).rarity
}

/* ── implicit roll ────────────────────────────────────────────────── */

function rollImplicit(base, random = Math.random) {
  if (!base.implicit) return null
  const { stat, min, max } = base.implicit
  return { stat, value: randInt(min, max, random) }
}

/* ── affix roll ───────────────────────────────────────────────────── */

function bestTier(affix, ilvl) {
  const eligible = affix.tiers.filter((t) => t.ilvl <= ilvl)
  return eligible.length ? eligible[eligible.length - 1] : null
}

function rollAffixes(rarity, ilvl, random = Math.random) {
  const limits = RARITY_AFFIX_COUNTS[rarity]
  if (!limits) return []

  const prefixPool = AFFIXES.filter((a) => a.type === 'prefix' && bestTier(a, ilvl))
  const suffixPool = AFFIXES.filter((a) => a.type === 'suffix' && bestTier(a, ilvl))

  const prefixCount = limits.prefixes > 0 ? randInt(1, limits.prefixes, random) : 0
  const suffixCount =
    limits.suffixes > 0 ? randInt(rarity === 'rare' ? 1 : 0, limits.suffixes, random) : 0

  const picked = []
  const usedStats = new Set()

  function pickFrom(pool, count) {
    const available = pool.filter((a) => !usedStats.has(a.stat))
    const need = Math.min(count, available.length)
    for (let i = 0; i < need; i++) {
      const remaining = available.filter((a) => !usedStats.has(a.stat))
      if (!remaining.length) break
      const idx = Math.floor(random() * remaining.length)
      const affix = remaining[idx]
      const tier = bestTier(affix, ilvl)
      const value = randInt(tier.min, tier.max, random)
      picked.push({ name: affix.name, stat: affix.stat, value, type: affix.type })
      usedStats.add(affix.stat)
    }
  }

  pickFrom(prefixPool, prefixCount)
  pickFrom(suffixPool, suffixCount)

  return picked
}

/* ── compose item name (PoE-стиль) ────────────────────────────────── */

function composeName(base, affixes, rarity) {
  const prefix = affixes.find((a) => a.type === 'prefix')
  const suffix = affixes.find((a) => a.type === 'suffix')

  if (rarity === 'normal') return base.name
  if (rarity === 'magic') {
    const parts = []
    if (prefix) parts.push(prefix.name)
    parts.push(base.name)
    if (suffix) parts.push(suffix.name)
    return parts.join(' ')
  }
  // rare/relic — используем все
  const parts = []
  if (prefix) parts.push(prefix.name)
  parts.push(base.name)
  if (suffix) parts.push(suffix.name)
  return parts.join(' ')
}

/* ── main generator ───────────────────────────────────────────────── */

/**
 * Генерирует готовый предмет (PoE-стиль).
 * @param {string} slot   — слот (weapon/armor/helmet/…) или 'random' для случайного
 * @param {number} ilvl   — уровень предмета (1-7), влияет на тир аффиксов
 * @param {Function} random — опциональная функция рандома для тестов
 * @param {string|null} forcedRarity — если задан, редкость не рандомится
 * @returns {object} готовый предмет с полями: name, slot, icon, rarity, rarityColor, implicit, affixes
 */
export function generateItem(slot, ilvl = 1, random = Math.random, forcedRarity = null) {
  const pool = slot === 'random' ? ITEM_BASES : ITEM_BASES.filter((b) => b.slot === slot)

  if (!pool.length) return null

  const base = pool[Math.floor(random() * pool.length)]
  const rarity = forcedRarity ?? rollRarity(base.slot, random)
  const implicit = rollImplicit(base, random)
  let affixes = rollAffixes(rarity, ilvl, random)

  // Relic: один аффикс удваивается, один становится проклятым (отрицательным)
  if (rarity === 'relic' && affixes.length >= 2) {
    const doubleIdx = Math.floor(random() * Math.min(affixes.length, 2))
    affixes[doubleIdx] = { ...affixes[doubleIdx], value: affixes[doubleIdx].value * 2 }

    const curseIdx = affixes.length - 1
    affixes[curseIdx] = {
      ...affixes[curseIdx],
      value: -Math.abs(affixes[curseIdx].value),
      cursed: true,
    }
  }

  const name = composeName(base, affixes, rarity)

  const item = {
    name,
    slot: base.slot,
    icon: base.icon,
    rarity,
    rarityColor: RARITY_COLORS[rarity],
    implicit,
    affixes,
  }

  // Оружие: масштабируем baseDamage по ilvl
  if (base.baseDamage) {
    const lvlBonus = Math.max(0, ilvl - 1)
    item.baseDamage = {
      min: base.baseDamage.min + Math.floor(lvlBonus * 0.5),
      max: base.baseDamage.max + lvlBonus,
    }
    if (base.apCost) item.apCost = base.apCost
  }

  // Броня: масштабируем baseArmor по ilvl
  if (base.baseArmor != null) {
    const lvlBonus = Math.max(0, ilvl - 1)
    item.baseArmor = base.baseArmor + Math.floor(lvlBonus * 0.5)
  }

  return item
}
