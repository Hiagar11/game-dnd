import { describe, expect, it, vi } from 'vitest'
import { useTokenClickInteraction } from './useTokenClickInteraction'

function buildDeps(store, abilityExec, options = {}) {
  const { moveTowardTarget = vi.fn(), runQuickAttack = vi.fn() } = options
  return useTokenClickInteraction({
    store,
    abilityExec,
    onDoorWalk: vi.fn(),
    onContainerWalk: vi.fn(),
    moveTowardTarget,
    runQuickAttack,
    closeContextMenu: vi.fn(),
    onAttackClick: vi.fn(),
    onNpcAttackClick: vi.fn(),
    onTalkClick: vi.fn(),
    isNpcReachable: vi.fn(() => false),
    isHeroReachableByNpc: vi.fn(() => false),
    getVisibleKeys: vi.fn(() => new Set(['0:0', '1:0'])),
    onCaptureClick: vi.fn(),
    emitDoorTransition: vi.fn(),
  })
}

describe('useTokenClickInteraction', () => {
  it('при способности по нейтралу в мирное время инициатором боя делает кастера', async () => {
    const hero = { uid: 'hero-1', tokenType: 'hero', col: 0, row: 0, name: 'Hero' }
    const neutralNpc = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'neutral',
      col: 1,
      row: 0,
      name: 'Neutral NPC',
    }

    const store = {
      combatMode: false,
      pendingAbility: { id: 'test', areaType: 'single', tokenUid: hero.uid },
      placedTokens: [hero, neutralNpc],
      selectedPlacedUid: hero.uid,
      enterCombat: vi.fn(),
      endTurn: vi.fn(),
      setCombatPair: vi.fn(),
      selectPlacedToken: vi.fn(),
    }

    const abilityExec = {
      needsTargetToken: { value: true },
      executeAbility: vi.fn(),
    }

    const { onTokenClick } = buildDeps(store, abilityExec)
    await onTokenClick(neutralNpc, null)

    expect(neutralNpc.attitude).toBe('hostile')
    expect(store.enterCombat).toHaveBeenCalledTimes(1)
    expect(store.enterCombat).toHaveBeenCalledWith(hero.uid, expect.any(Set))
    expect(abilityExec.executeAbility).toHaveBeenCalledWith(neutralNpc)
  })

  it('при Ctrl first strike инициатором боя делает выбранного атакующего', async () => {
    const hero = { uid: 'hero-1', tokenType: 'hero', col: 0, row: 0, name: 'Hero' }
    const neutralNpc = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'neutral',
      col: 1,
      row: 0,
      name: 'Neutral NPC',
    }

    const store = {
      combatMode: false,
      pendingAbility: null,
      placedTokens: [hero, neutralNpc],
      selectedPlacedUid: hero.uid,
      enterCombat: vi.fn(),
      endTurn: vi.fn(),
      setCombatPair: vi.fn(),
      selectPlacedToken: vi.fn(),
    }

    const abilityExec = {
      needsTargetToken: { value: false },
      executeAbility: vi.fn(),
    }

    const moveTowardTarget = vi.fn(() => Promise.resolve(false))
    const { onTokenClick } = buildDeps(store, abilityExec, { moveTowardTarget })

    const preventDefault = vi.fn()
    await onTokenClick(neutralNpc, { ctrlKey: true, preventDefault })

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(neutralNpc.attitude).toBe('hostile')
    expect(store.enterCombat).toHaveBeenCalledTimes(1)
    expect(store.enterCombat).toHaveBeenCalledWith(hero.uid, expect.any(Set))
  })

  it('не делает автo-quick-attack после входа в бой, если ход не у инициатора', async () => {
    const hero = { uid: 'hero-1', tokenType: 'hero', col: 0, row: 0, name: 'Hero' }
    const neutralNpc = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'neutral',
      col: 1,
      row: 0,
      name: 'Neutral NPC',
    }
    const otherNpc = {
      uid: 'npc-2',
      tokenType: 'npc',
      attitude: 'hostile',
      col: 5,
      row: 5,
      name: 'Other NPC',
    }

    const store = {
      combatMode: false,
      pendingAbility: null,
      placedTokens: [hero, neutralNpc, otherNpc],
      selectedPlacedUid: hero.uid,
      initiativeOrder: [],
      currentInitiativeIndex: 0,
      enterCombat: vi.fn(() => {
        store.combatMode = true
        store.initiativeOrder = [{ uid: otherNpc.uid }, { uid: hero.uid }]
        store.currentInitiativeIndex = 0
      }),
      endTurn: vi.fn(),
      setCombatPair: vi.fn(),
      selectPlacedToken: vi.fn(),
    }

    const abilityExec = {
      needsTargetToken: { value: false },
      executeAbility: vi.fn(),
    }

    const moveTowardTarget = vi.fn(() => Promise.resolve(true))
    const runQuickAttack = vi.fn()
    const { onTokenClick } = buildDeps(store, abilityExec, { moveTowardTarget, runQuickAttack })

    const preventDefault = vi.fn()
    await onTokenClick(neutralNpc, { ctrlKey: true, preventDefault })

    expect(store.enterCombat).toHaveBeenCalledTimes(1)
    expect(runQuickAttack).not.toHaveBeenCalled()
  })
})
