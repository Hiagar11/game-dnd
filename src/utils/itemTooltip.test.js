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
})
