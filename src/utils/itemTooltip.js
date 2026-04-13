const SLOT_LABELS = {
  weapon: 'Оружие',
  two_handed: 'Двуручное оружие',
  ranged: 'Дальнобойное оружие',
  magic_weapon: 'Магическое оружие',
  helmet: 'Шлем',
  armor: 'Броня',
  offhand: 'Щит / доп. рука',
  gloves: 'Перчатки',
  boots: 'Сапоги',
  legs: 'Поножи',
  belt: 'Пояс',
  cloak: 'Плащ',
  amulet: 'Амулет',
  ring: 'Кольцо',
  potion: 'Зелье',
  other: 'Прочее',
}

const STAT_LABELS = {
  damage: 'Урон',
  hit_chance: 'Шанс удара',
  initiative: 'Инициатива',
  persuasion: 'Убеждение',
  defense: 'Защита',
  dodge: 'Уклонение',
  magic_power: 'Маг. сила',
  resistance: 'Сопротивление',
}

export function translateSlot(slot) {
  return SLOT_LABELS[slot] ?? slot ?? 'Предмет'
}

export function translateStat(stat) {
  return STAT_LABELS[stat?.toLowerCase()] ?? stat
}

export function translateElement(element) {
  switch (element) {
    case 'fire':
      return 'Огонь'
    case 'water':
      return 'Вода'
    case 'earth':
      return 'Земля'
    case 'air':
      return 'Воздух'
    default:
      return element ?? 'Стихия'
  }
}

export function traitData(traitId, traits = [], overrides = {}) {
  const trait = traits.find((x) => x.id === traitId)
  if (!trait) return { name: '', mods: [] }
  const modsSource = overrides[traitId] ?? trait.mods ?? []
  const mods = modsSource.map((mod) => ({
    text: `${translateStat(mod.stat)} ${mod.value >= 0 ? '+' : ''}${mod.value}`,
    positive: mod.value >= 0,
  }))
  return { name: trait.name, mods }
}

export function effectRows(item) {
  return (item?.effects ?? []).map((effect, index) => {
    switch (effect.kind) {
      case 'healing':
        return {
          key: `effect_${index}`,
          name: 'Эффект',
          mods: [{ text: `Лечение +${effect.restoreHp} HP`, positive: true }],
        }
      case 'mana':
        return {
          key: `effect_${index}`,
          name: 'Эффект',
          mods: [{ text: `Мана +${effect.restoreMana}`, positive: true }],
        }
      case 'poison_weapon_buff':
        return {
          key: `effect_${index}`,
          name: 'Эффект',
          mods: [
            { text: `Яд: ${effect.poisonDamagePerTurn} урона/ход`, positive: true },
            { text: `${effect.turns} ход.`, positive: true },
          ],
        }
      case 'elemental_buff':
        return {
          key: `effect_${index}`,
          name: 'Эффект',
          mods: [
            {
              text: `${translateElement(effect.element)} урон +${effect.bonusDamage}`,
              positive: true,
            },
            {
              text: `${translateElement(effect.element)} сопр. +${effect.resistance}`,
              positive: true,
            },
            { text: `${effect.turns} ход.`, positive: true },
          ],
        }
      case 'stamina': {
        const actionPointsText =
          effect.actionPoints?.mode === 'full'
            ? 'Очки действия: полностью'
            : effect.actionPoints?.mode === 'current_plus'
              ? `Очки действия: +${effect.actionPoints.value} к текущим`
              : `Очки действия: +${effect.actionPoints?.value ?? 0}`
        return {
          key: `effect_${index}`,
          name: 'Эффект',
          mods: [{ text: actionPointsText, positive: true }],
        }
      }
      default:
        return {
          key: `effect_${index}`,
          name: 'Эффект',
          mods: [{ text: 'Неизвестный эффект', positive: false }],
        }
    }
  })
}

export function buildTooltipRows(item, traits = []) {
  const overrides = item?.traitOverrides ?? {}
  return [
    ...(item?.traitIds ?? []).map((traitId) => ({
      key: traitId,
      ...traitData(traitId, traits, overrides),
    })),
    ...effectRows(item),
  ]
}
