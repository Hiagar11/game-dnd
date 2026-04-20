import { describe, it, expect } from 'vitest'
import { getItemPrice, applyAttitudeDiscount } from './itemPrice'

describe('getItemPrice', () => {
  it('returns 0 for null/undefined', () => {
    expect(getItemPrice(null)).toBe(0)
    expect(getItemPrice(undefined)).toBe(0)
  })

  it('calculates normal weapon price (no affixes)', () => {
    const item = { slot: 'weapon', rarity: 'normal', affixes: [] }
    // 500 * 1 * (1 + 0) = 500
    expect(getItemPrice(item)).toBe(500)
  })

  it('calculates magic weapon with 2 affixes', () => {
    const item = { slot: 'weapon', rarity: 'magic', affixes: [{}, {}] }
    // 500 * 3 * (1 + 2*0.3) = 500 * 3 * 1.6 = 2400
    expect(getItemPrice(item)).toBe(2400)
  })

  it('calculates rare ring with 4 affixes', () => {
    const item = { slot: 'ring', rarity: 'rare', affixes: [{}, {}, {}, {}] }
    // 450 * 10 * (1 + 4*0.3) = 450 * 10 * 2.2 = 9900
    expect(getItemPrice(item)).toBe(9900)
  })

  it('calculates relic armor with 4 affixes', () => {
    const item = { slot: 'armor', rarity: 'relic', affixes: [{}, {}, {}, {}] }
    // 600 * 30 * (1 + 4*0.3) = 600 * 30 * 2.2 = 39600
    expect(getItemPrice(item)).toBe(39600)
  })

  it('uses "other" base price for unknown slot', () => {
    const item = { slot: 'unknown_slot', rarity: 'normal', affixes: [] }
    // 300 * 1 * 1 = 300
    expect(getItemPrice(item)).toBe(300)
  })

  it('handles system item (key)', () => {
    const key = { slot: 'key', name: 'Ключ', icon: 'key' }
    // 2000 * 1 * 1 = 2000 (no rarity/affixes)
    expect(getItemPrice(key)).toBe(2000)
  })
})

describe('applyAttitudeDiscount', () => {
  it('returns same price at score 0', () => {
    expect(applyAttitudeDiscount(1000, 0)).toBe(1000)
  })

  it('gives 30% discount at score +60', () => {
    // mult = 1 - 60 * 0.005 = 0.7
    expect(applyAttitudeDiscount(1000, 60)).toBe(700)
  })

  it('adds 50% markup at score -30', () => {
    // mult = 1 - (-30) * 0.0167 = 1.501
    expect(applyAttitudeDiscount(1000, -30)).toBe(1501)
  })

  it('scales linearly at score +30', () => {
    // mult = 1 - 30 * 0.005 = 0.85
    expect(applyAttitudeDiscount(1000, 30)).toBe(850)
  })

  it('never returns less than 1', () => {
    expect(applyAttitudeDiscount(1, 100)).toBeGreaterThanOrEqual(1)
  })
})
