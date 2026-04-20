import { getRaceById } from '../constants/races'
import { EQUIP_SLOT_KEYS } from '../constants/inventorySlots'
import { WEAPON_SLOTS } from '../constants/itemBases'

export const HIT_DC = 10

/** Штраф к попаданию при двойном оружии */
export const DUAL_WIELD_HIT_PENALTY = 2

/**
 * Возвращает объект с эффективными базовыми характеристиками токена
 * (с учётом расовых бонусов).
 */
export function getEffectiveStats(token) {
  const rb = getRaceById(token?.race)?.bonuses ?? {}
  return {
    strength: (token?.strength ?? 0) + (rb.strength ?? 0),
    agility: (token?.agility ?? 0) + (rb.agility ?? 0),
    intellect: (token?.intellect ?? 0) + (rb.intellect ?? 0),
    charisma: (token?.charisma ?? 0) + (rb.charisma ?? 0),
  }
}

export function calcCritChance(t) {
  const a = t?.agility ?? 0
  const i = t?.intellect ?? 0
  return Math.floor((a * 3 + i) / 5)
}

export function calcPerception(t) {
  const i = t?.intellect ?? 0
  const a = t?.agility ?? 0
  return Math.floor((i * 3 + a) / 4)
}

export function calcEvasion(t) {
  const a = t?.agility ?? 0
  const c = t?.charisma ?? 0
  const s = t?.strength ?? 0
  return Math.floor((a * 2 + c + s) / 5)
}

export function calcMagicResist(t) {
  const c = t?.charisma ?? 0
  const i = t?.intellect ?? 0
  const s = t?.strength ?? 0
  return Math.floor((c * 2 + i + s) / 4)
}

export function calcBlock(t) {
  const s = t?.strength ?? 0
  const a = t?.agility ?? 0
  return Math.floor((s * 2 + a) / 4)
}

export function calcCritDamage(t) {
  const s = t?.strength ?? 0
  const a = t?.agility ?? 0
  return Math.floor((s + a) / 3)
}

export function calcArmorPen(t) {
  const s = t?.strength ?? 0
  const a = t?.agility ?? 0
  return Math.floor((s * 2 + a) / 5)
}

export function calcMagicPen(t) {
  const i = t?.intellect ?? 0
  const c = t?.charisma ?? 0
  return Math.floor((i * 2 + c) / 4)
}

export function calcLuck(t) {
  const c = t?.charisma ?? 0
  const a = t?.agility ?? 0
  return Math.floor((c * 2 + a) / 4)
}

export function calcStealth(t) {
  const a = t?.agility ?? 0
  const i = t?.intellect ?? 0
  return Math.floor((a * 2 + i) / 4)
}

export function calcHealing(t) {
  const i = t?.intellect ?? 0
  const c = t?.charisma ?? 0
  const s = t?.strength ?? 0
  return Math.floor((i * 2 + c + s) / 5)
}

export function calcInitiative(t) {
  const a = t?.agility ?? 0
  const i = t?.intellect ?? 0
  return Math.floor((a * 2 + i) / 3)
}

export function calcPersuasion(t) {
  const c = t?.charisma ?? 0
  const i = t?.intellect ?? 0
  return Math.floor((c * 3 + i) / 4)
}

export function calcDeception(t) {
  const c = t?.charisma ?? 0
  const a = t?.agility ?? 0
  const i = t?.intellect ?? 0
  return Math.floor((c * 2 + a + i) / 4)
}

export function calcMaxHp(strength = 0, agility = 0) {
  return 10 + strength * 2 + agility
}

/**
 * Возвращает активное оружие токена.
 * Герой: equipped[activeWeaponSlot] (дефолт 'weapon').
 * NPC: npcWeapon.
 */
export function getActiveWeapon(token) {
  const slot = token?.activeWeaponSlot ?? 'weapon'
  return token?.inventory?.equipped?.[slot] ?? token?.npcWeapon ?? null
}

/**
 * Проверяет, является ли оружие токена магическим.
 */
export function isMagicWeapon(token) {
  return getActiveWeapon(token)?.slot === 'magic_weapon'
}

/**
 * Получить диапазон урона оружия для токена.
 * Без оружия: { min: 1, max: 1 } (кулаки = 1 урон)
 */
export function getWeaponDamageRange(token) {
  const weapon = getActiveWeapon(token)
  if (weapon?.baseDamage) return weapon.baseDamage
  return { min: 1, max: 1 }
}

/**
 * Стоимость атаки в очках действия.
 * Двуручное/дальнобойное оружие стоит 2 AP, остальное — 1.
 */
export function getAttackApCost(token) {
  return getActiveWeapon(token)?.apCost ?? 1
}

/**
 * Возвращает оружие из оффхенда (если это оружие, а не щит).
 */
export function getOffhandWeapon(token) {
  const offhand = token?.inventory?.equipped?.offhand ?? null
  if (!offhand) return null
  return WEAPON_SLOTS.has(offhand.slot) ? offhand : null
}

/**
 * Проверяет, держит ли токен оружие в обеих руках (dual wield).
 */
export function isDualWielding(token) {
  return getActiveWeapon(token) !== null && getOffhandWeapon(token) !== null
}

/**
 * Ролл урона оффхенд-оружия: половина от случайного ролла.
 */
export function rollOffhandDamage(token, random = Math.random) {
  const offhand = getOffhandWeapon(token)
  if (!offhand?.baseDamage) return 0
  const { min, max } = offhand.baseDamage
  const roll = Math.floor(random() * (max - min + 1)) + min
  return Math.max(1, Math.floor(roll / 2))
}

/**
 * Ролл урона оружия (заменяет d4).
 * Возвращает случайное число в диапазоне baseDamage оружия.
 */
export function rollWeaponDamage(token, random = Math.random) {
  const { min, max } = getWeaponDamageRange(token)
  return Math.floor(random() * (max - min + 1)) + min
}

/**
 * Суммарная броня со всей экипировки токена.
 * Складывает baseArmor каждого надетого предмета.
 */
export function calcTotalArmor(token) {
  const equipped = token?.inventory?.equipped
  if (!equipped || typeof equipped !== 'object') return 0
  let total = 0
  for (const key of EQUIP_SLOT_KEYS) {
    total += equipped[key]?.baseArmor ?? 0
  }
  return total
}
