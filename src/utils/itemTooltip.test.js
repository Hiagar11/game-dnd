import { describe, expect, it } from 'vitest'
import { buildTooltipRows, translateSlot } from './itemTooltip'

describe('itemTooltip', () => {
  it('translates known slots', () => {
    expect(translateSlot('weapon')).toBe('Оружие')
    expect(translateSlot('unknown-slot')).toBe('unknown-slot')
  })

  it('builds rows from affixes and implicit', () => {
    const item = {
      implicit: { stat: 'damage', value: 3 },
      affixes: [
        { name: 'Острый', stat: 'damage', value: 4, type: 'prefix' },
        { name: 'Меткости', stat: 'hit_chance', value: 2, type: 'suffix' },
      ],
    }

    const rows = buildTooltipRows(item)
    expect(rows.length).toBe(3)
    expect(rows[0].implicit).toBe(true)
    expect(rows[0].mods[0].text).toBe('Урон +3')
    expect(rows[1].name).toBe('Острый')
    expect(rows[2].name).toBe('Меткости')
  })

  it('builds rows for items with effects only', () => {
    const item = {
      effects: [{ kind: 'healing', restoreHp: 10 }],
    }

    const rows = buildTooltipRows(item)
    expect(rows.length).toBe(1)
    expect(rows[0].name).toBe('Эффект')
  })

  it('handles cursed affixes (negative values)', () => {
    const item = {
      affixes: [{ name: 'Скорости', stat: 'initiative', value: -3, type: 'suffix', cursed: true }],
    }

    const rows = buildTooltipRows(item)
    expect(rows[0].mods[0].text).toBe('Инициатива -3')
    expect(rows[0].mods[0].positive).toBe(false)
  })
})
