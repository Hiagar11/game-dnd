import { describe, expect, it, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import { useGameCombat } from './useGameCombat'
import { DEFAULT_AP, DEFAULT_MP } from '../constants/combat'

function hero(uid, overrides = {}) {
  return {
    uid,
    tokenType: 'hero',
    name: `Hero ${uid}`,
    col: 0,
    row: 0,
    level: 1,
    xp: 0,
    actionPoints: 0,
    movementPoints: 0,
    ...overrides,
  }
}

function npc(uid, overrides = {}) {
  return {
    uid,
    tokenType: 'npc',
    name: `NPC ${uid}`,
    attitude: 'hostile',
    col: 1,
    row: 0,
    level: 1,
    hp: 10,
    maxHp: 10,
    actionPoints: 0,
    movementPoints: 0,
    ...overrides,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useGameCombat', () => {
  it('ставит инициатора боя первым и исключает нейтральных NPC из инициативы', () => {
    const placedTokens = ref([
      hero('h1', { bonusAp: 2 }),
      hero('h2'),
      npc('n1', { attitude: 'hostile' }),
      npc('n2', { attitude: 'neutral' }),
    ])
    const selectedPlacedUid = ref(null)

    const randomSpy = vi.spyOn(Math, 'random')
    randomSpy.mockReturnValueOnce(0.1).mockReturnValueOnce(0.8).mockReturnValueOnce(0.6)

    const combat = useGameCombat(placedTokens, selectedPlacedUid)
    combat.enterCombat('h1')

    expect(combat.combatMode.value).toBe(true)
    expect(combat.combatRound.value).toBe(1)
    expect(combat.currentInitiativeIndex.value).toBe(0)

    const orderUids = combat.initiativeOrder.value.map((entry) => entry.uid)
    expect(orderUids.includes('n2')).toBe(false)
    expect(orderUids[0]).toBe('h1')
    expect(combat.initiativeOrder.value[0]?.initiative).toBe(21)

    const currentUid = combat.initiativeOrder.value[0]?.uid
    const currentToken = placedTokens.value.find((token) => token.uid === currentUid)
    expect(currentToken?.actionPoints).toBe(DEFAULT_AP + 2)
    expect(currentToken?.bonusAp ?? 0).toBe(0)
    expect(currentToken?.movementPoints).toBe(DEFAULT_MP)
  })

  it('включает союзного NPC в инициативу, но исключает нейтрального', () => {
    const placedTokens = ref([
      hero('h1'), // инициатор
      hero('h2'),
      npc('n1', { attitude: 'hostile' }),
      npc('n2', { attitude: 'friendly' }),
      npc('n3', { attitude: 'neutral' }),
    ])
    const selectedPlacedUid = ref(null)

    const randomSpy = vi.spyOn(Math, 'random')
    // h2 -> 17, n1 -> 13, n2 -> 7; h1 добавляется первым с initiative=21
    randomSpy.mockReturnValueOnce(0.8).mockReturnValueOnce(0.6).mockReturnValueOnce(0.3)

    const combat = useGameCombat(placedTokens, selectedPlacedUid)
    combat.enterCombat('h1')

    const orderUids = combat.initiativeOrder.value.map((entry) => entry.uid)
    expect(orderUids).toContain('n2')
    expect(orderUids).not.toContain('n3')
    expect(orderUids[0]).toBe('h1')
  })

  it('enterCombat оставляет инициатора первым и активным в очереди', () => {
    const placedTokens = ref([
      hero('h1'), // инициатор — должен быть первым
      hero('h2'),
      npc('n1', { attitude: 'hostile' }),
    ])
    const selectedPlacedUid = ref('h1') // до боя был выбран инициатор

    const randomSpy = vi.spyOn(Math, 'random')
    // h2 → инициатива 19, n1 → 11; h1 добавляется первым с initiative=21
    randomSpy.mockReturnValueOnce(0.9).mockReturnValueOnce(0.5)

    const combat = useGameCombat(placedTokens, selectedPlacedUid)
    combat.enterCombat('h1')

    const orderUids = combat.initiativeOrder.value.map((e) => e.uid)
    expect(orderUids[0]).toBe('h1') // инициатор всегда первый

    // selectedPlacedUid переключён на активный токен в очереди (инициатора)
    expect(selectedPlacedUid.value).toBe('h1')
  })

  it('инициатор в бою ходит первым и не дублируется', () => {
    // Полный цикл: герой1(инициатор) → герой2 → NPC1 → новый раунд
    const placedTokens = ref([
      hero('h1', { col: 0, row: 0 }), // инициатор
      hero('h2', { col: 0, row: 0 }),
      npc('n1', { attitude: 'hostile', col: 1, row: 0 }),
    ])
    const selectedPlacedUid = ref(null)

    const randomSpy = vi.spyOn(Math, 'random')
    // h2 → 0.9*20+1 = 19, n1 → 0.5*20+1 = 11; порядок: h1(21), h2(19), n1(11)
    randomSpy.mockReturnValueOnce(0.9).mockReturnValueOnce(0.5)

    const combat = useGameCombat(placedTokens, selectedPlacedUid)
    combat.enterCombat('h1')

    const orderUids = combat.initiativeOrder.value.map((e) => e.uid)
    expect(orderUids).toEqual(['h1', 'h2', 'n1'])
    expect(combat.initiativeOrder.value.filter((e) => e.uid === 'h1')).toHaveLength(1) // только один
    expect(combat.currentInitiativeIndex.value).toBe(0)
    expect(selectedPlacedUid.value).toBe('h1')

    // endTurn → передать ход с инициатора (index=0, h1) на следующего (index=1, h2)
    combat.endTurn()
    expect(combat.currentInitiativeIndex.value).toBe(1)
    expect(selectedPlacedUid.value).toBe('h2')

    // endTurn → передать ход на NPC (index=2, n1)
    combat.endTurn()
    expect(combat.currentInitiativeIndex.value).toBe(2)
    expect(selectedPlacedUid.value).toBe('n1')
    expect(combat.combatRound.value).toBe(1)

    // endTurn → конец раунда, переход на новый раунд (index=0, h1)
    combat.endTurn()
    expect(combat.currentInitiativeIndex.value).toBe(0)
    expect(selectedPlacedUid.value).toBe('h1')
    expect(combat.combatRound.value).toBe(2)

    // Инициатор h1 остался ровно одним в очереди и первым
    expect(combat.initiativeOrder.value.filter((e) => e.uid === 'h1')).toHaveLength(1)
    expect(combat.initiativeOrder.value[0]?.uid).toBe('h1')
  })

  it('в мирном режиме endTurn восстанавливает AP/MP всем токенам', () => {
    const placedTokens = ref([
      hero('h1', { actionPoints: 0, movementPoints: 1 }),
      npc('n1', { actionPoints: 1, movementPoints: 0 }),
    ])
    const selectedPlacedUid = ref(null)
    const combat = useGameCombat(placedTokens, selectedPlacedUid)

    combat.endTurn()

    for (const token of placedTokens.value) {
      expect(token.actionPoints).toBe(DEFAULT_AP)
      expect(token.movementPoints).toBe(DEFAULT_MP)
    }
  })

  it('в бою endTurn передаёт ход следующему и выбирает его', () => {
    const placedTokens = ref([
      hero('h1', { actionPoints: 2, movementPoints: 2, col: 0, row: 0 }),
      npc('n1', { actionPoints: 1, movementPoints: 1, col: 1, row: 0 }),
    ])
    const selectedPlacedUid = ref(null)

    vi.spyOn(Math, 'random').mockReturnValue(0.9)

    const combat = useGameCombat(placedTokens, selectedPlacedUid)
    combat.enterCombat(null)

    const currUid = combat.initiativeOrder.value[combat.currentInitiativeIndex.value].uid
    const currToken = placedTokens.value.find((token) => token.uid === currUid)
    expect(currToken).toBeTruthy()

    combat.endTurn()

    const prevToken = placedTokens.value.find((token) => token.uid === currUid)
    expect(prevToken?.actionPoints).toBe(0)
    expect(prevToken?.movementPoints).toBe(0)

    const nextUid = combat.initiativeOrder.value[combat.currentInitiativeIndex.value].uid
    const nextToken = placedTokens.value.find((token) => token.uid === nextUid)
    expect(selectedPlacedUid.value).toBe(nextUid)
    expect(nextToken?.actionPoints).toBe(DEFAULT_AP)
    expect(nextToken?.movementPoints).toBe(DEFAULT_MP)
  })

  it('при смене хода боевая пара закрывается если ход перешёл к кому-то вне пары', () => {
    const placedTokens = ref([
      hero('h1', { col: 0, row: 0 }),
      hero('h2', { col: 0, row: 0 }),
      npc('n1', { attitude: 'hostile', col: 1, row: 0 }),
    ])
    const selectedPlacedUid = ref(null)

    const randomSpy = vi.spyOn(Math, 'random')
    randomSpy.mockReturnValueOnce(0.9).mockReturnValueOnce(0.5)

    const combat = useGameCombat(placedTokens, selectedPlacedUid)
    combat.enterCombat('h1')

    // Открываем боевую пару: h2 (герой) vs n1 (враг)
    combat.setCombatPair('h2', 'n1')
    expect(combat.combatPair.value).toEqual({ heroUid: 'h2', npcUid: 'n1', npcInitiated: false })

    // Текущий ход: h1 (инициатор, вне пары)
    expect(combat.initiativeOrder.value[combat.currentInitiativeIndex.value].uid).toBe('h1')

    // endTurn → ход переходит на h2 (участник пары) — пара остаётся открытой
    combat.endTurn()
    expect(combat.combatPair.value).not.toBeNull()
    expect(combat.combatPair.value.npcUid).toBe('n1')

    // endTurn → ход переходит на n1 (участник пары) — пара остаётся открытой
    combat.endTurn()
    expect(combat.combatPair.value).not.toBeNull()

    // endTurn → ход переходит на h1 (НЕ участник пары) — пара закрывается
    combat.endTurn()
    expect(combat.combatPair.value).toBeNull()
  })

  it('на новом раунде увеличивает счётчик hidden turns у невидимого врага', () => {
    const placedTokens = ref([
      hero('h1', { col: 0, row: 0 }),
      npc('n1', { attitude: 'hostile', col: 20, row: 20 }),
    ])
    const selectedPlacedUid = ref(null)

    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const combat = useGameCombat(placedTokens, selectedPlacedUid)
    combat.enterCombat(null)

    // 2 участника: второй endTurn завершает круг и начинает новый раунд.
    combat.endTurn()
    combat.endTurn()

    expect(combat.combatRound.value).toBe(2)
    expect(combat.enemyHiddenTurns.value.n1).toBe(1)
  })

  it('checkCombatEnd завершает бой если враждебных NPC не осталось', () => {
    const placedTokens = ref([hero('h1'), npc('n1', { attitude: 'neutral' })])
    const selectedPlacedUid = ref('h1')
    const combat = useGameCombat(placedTokens, selectedPlacedUid)

    combat.enterCombat(null)
    combat.checkCombatEnd()

    expect(combat.combatMode.value).toBe(false)
    expect(combat.initiativeOrder.value).toEqual([])
    expect(combat.combatRound.value).toBe(0)
    expect(combat.currentInitiativeIndex.value).toBe(0)
  })

  it('exitCombat начисляет XP героям за побеждённых/захваченных NPC', () => {
    const placedTokens = ref([
      hero('h1', { level: 1, xp: 0 }),
      hero('h2', { level: 1, xp: 0 }),
      npc('n1', { level: 2, stunned: true, hp: 0, attitude: 'hostile' }),
    ])
    const selectedPlacedUid = ref(null)
    const combat = useGameCombat(placedTokens, selectedPlacedUid)

    combat.exitCombat()

    const hero1 = placedTokens.value.find((token) => token.uid === 'h1')
    const hero2 = placedTokens.value.find((token) => token.uid === 'h2')

    expect(hero1?.xp).toBe(25)
    expect(hero2?.xp).toBe(25)
    expect(combat.lastXpReport.value).toHaveLength(2)
    expect(combat.lastXpReport.value[0].xpGained).toBe(25)
  })

  it('провокация тикает в конце хода владельца и держится 2 его хода', () => {
    const placedTokens = ref([
      hero('h1', { col: 0, row: 0 }),
      hero('h2', {
        col: 2,
        row: 0,
        activeEffects: [{ id: 'taunt', byUid: 'n1', remainingTurns: 2 }],
      }),
      npc('n1', { attitude: 'hostile', col: 1, row: 0 }),
    ])
    const selectedPlacedUid = ref(null)

    const randomSpy = vi.spyOn(Math, 'random')
    randomSpy.mockReturnValueOnce(0.9).mockReturnValueOnce(0.5)

    const combat = useGameCombat(placedTokens, selectedPlacedUid)
    combat.enterCombat('h1')

    const tauntTurns = () =>
      placedTokens.value.find((t) => t.uid === 'h2')?.activeEffects?.find((e) => e.id === 'taunt')
        ?.remainingTurns

    expect(tauntTurns()).toBe(2)

    // Ход h1 -> следующий h2: на чужом ходе таунт не тикает
    combat.endTurn()
    expect(selectedPlacedUid.value).toBe('h2')
    expect(tauntTurns()).toBe(2)

    // Ход h2 завершился: первый тик taunt
    combat.endTurn()
    expect(selectedPlacedUid.value).toBe('n1')
    expect(tauntTurns()).toBe(1)

    // Ход n1 -> следующий h1: на чужом ходе таунт НЕ тикает
    combat.endTurn()
    expect(selectedPlacedUid.value).toBe('h1')
    expect(tauntTurns()).toBe(1)

    // Ход h1 -> следующий h2: на чужом ходе таунт не тикает
    combat.endTurn()
    expect(selectedPlacedUid.value).toBe('h2')
    expect(tauntTurns()).toBe(1)

    // Ход h2 завершился: второй тик, эффект снимается
    combat.endTurn()
    expect(selectedPlacedUid.value).toBe('n1')
    expect(tauntTurns()).toBeUndefined()
  })

  it('оглушённый токен с taunt не теряет 2 стака за один пропуск хода', () => {
    vi.useFakeTimers()
    const placedTokens = ref([
      hero('h1', { col: 0, row: 0 }),
      hero('h2', {
        col: 2,
        row: 0,
        stunned: true,
        activeEffects: [{ id: 'taunt', byUid: 'n1', remainingTurns: 2, apPenalty: 3 }],
      }),
      npc('n1', { attitude: 'hostile', col: 1, row: 0 }),
    ])
    const selectedPlacedUid = ref(null)

    const randomSpy = vi.spyOn(Math, 'random')
    randomSpy.mockReturnValueOnce(0.9).mockReturnValueOnce(0.5)

    const combat = useGameCombat(placedTokens, selectedPlacedUid)
    combat.enterCombat('h1')

    const tauntTurns = () =>
      placedTokens.value.find((t) => t.uid === 'h2')?.activeEffects?.find((e) => e.id === 'taunt')
        ?.remainingTurns

    // h1 -> h2 (stunned): списания taunt пока нет
    combat.endTurn()
    // selectedPlacedUid для пропущенного хода не переключается на stunned-токен
    expect(selectedPlacedUid.value).toBe('h1')
    expect(tauntTurns()).toBe(2)

    // После авто-пропуска хода h2 должен списаться ровно 1 стак taunt
    vi.advanceTimersByTime(1200)
    expect(tauntTurns()).toBe(1)

    vi.useRealTimers()
  })
})
