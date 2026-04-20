// Расы персонажей — оригинальная система.
// Каждая раса даёт стартовые бонусы к первичным характеристикам.

export const RACES = [
  {
    id: 'human',
    label: 'Человек',
    hint: '+1 ко всем характеристикам',
    bonuses: { strength: 1, agility: 1, intellect: 1, charisma: 1 },
  },
  {
    id: 'stoneling',
    label: 'Каменнорожд.',
    hint: '+3 Сила, +1 Ловкость',
    bonuses: { strength: 3, agility: 1, intellect: 0, charisma: 0 },
  },
  {
    id: 'windwalker',
    label: 'Ветроход',
    hint: '+1 Сила, +3 Ловкость',
    bonuses: { strength: 1, agility: 3, intellect: 0, charisma: 0 },
  },
  {
    id: 'gloomborn',
    label: 'Сумеречник',
    hint: '+1 Ловкость, +3 Интеллект',
    bonuses: { strength: 0, agility: 1, intellect: 3, charisma: 0 },
  },
  {
    id: 'embervein',
    label: 'Жаркокровный',
    hint: '+2 Сила, +2 Интеллект',
    bonuses: { strength: 2, agility: 0, intellect: 2, charisma: 0 },
  },
  {
    id: 'sylvari',
    label: 'Сильвари',
    hint: '+1 Ловкость, +1 Интеллект, +2 Харизма',
    bonuses: { strength: 0, agility: 1, intellect: 1, charisma: 2 },
  },
  {
    id: 'ironhide',
    label: 'Железнокожий',
    hint: '+3 Сила, +1 Харизма',
    bonuses: { strength: 3, agility: 0, intellect: 0, charisma: 1 },
  },
]

export function getRaceById(id) {
  return RACES.find((r) => r.id === id) ?? null
}
