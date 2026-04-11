export const HIT_DC = 10

export function calcCritChance(t) {
  return Math.floor(((t?.agility ?? 0) * 2 + (t?.strength ?? 0)) / 5)
}

export function calcDamageBonus(t) {
  return Math.floor(((t?.strength ?? 0) * 2 + (t?.agility ?? 0)) / 5)
}

export function calcEvasion(t) {
  return Math.floor(((t?.agility ?? 0) * 3 + (t?.strength ?? 0)) / 5)
}

export function calcDefense(t) {
  return Math.floor(((t?.strength ?? 0) + (t?.agility ?? 0)) / 4)
}

export function calcMaxHp(strength = 0, agility = 0) {
  return 10 + strength * 2 + agility
}
