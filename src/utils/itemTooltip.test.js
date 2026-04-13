import { describe, expect, it } from 'vitest'
import { buildTooltipRows, translateSlot } from './itemTooltip'

describe('itemTooltip', () => {
  it('translates known slots', () => {
    expect(translateSlot('weapon')).toBe('Оружие')
    expect(translateSlot('unknown-slot')).toBe('unknown-slot')
  })

  it('builds rows from traits and effects', () => {
    const item = {
      traitIds: ['t1'],
      effects: [{ kind: 'healing', restoreHp: 10 }],
    }
    const traits = [{ id: 't1', name: 'Меткость', mods: [{ stat: 'hit_chance', value: 2 }] }]

    const rows = buildTooltipRows(item, traits)
    expect(rows.length).toBe(2)
    expect(rows[0].name).toBe('Меткость')
    expect(rows[1].name).toBe('Эффект')
  })

  it('applies traitOverrides for relic items', () => {
    const item = {
      traitIds: ['t1', 't2'],
      traitOverrides: {
        t1: [{ stat: 'damage', value: 6 }],
        t2: [{ stat: 'defense', value: -3 }],
      },
    }
    const traits = [
      { id: 't1', name: 'Огонь', mods: [{ stat: 'damage', value: 3 }] },
      { id: 't2', name: 'Земля', mods: [{ stat: 'defense', value: 3 }] },
    ]

    const rows = buildTooltipRows(item, traits)
    expect(rows[0].mods[0].text).toBe('Урон +6')
    expect(rows[0].mods[0].positive).toBe(true)
    expect(rows[1].mods[0].text).toBe('Защита -3')
    expect(rows[1].mods[0].positive).toBe(false)
  })
})
