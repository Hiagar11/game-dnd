import { describe, expect, it, vi } from 'vitest'
import { useTokenClickInteraction } from './useTokenClickInteraction'

function buildDeps(store, abilityExec, options = {}) {
  const {
    moveTowardTarget = vi.fn(),
    runQuickAttack = vi.fn(),
    onAttackClick = vi.fn(),
    onNpcAttackClick = vi.fn(),
    onTalkClick = vi.fn(),
    onTauntBlocked = vi.fn(),
    isNpcReachable = vi.fn(() => false),
    isHeroReachableByNpc = vi.fn(() => false),
  } = options
  return useTokenClickInteraction({
    store,
    abilityExec,
    onDoorWalk: vi.fn(),
    onContainerWalk: vi.fn(),
    moveTowardTarget,
    runQuickAttack,
    closeContextMenu: vi.fn(),
    onAttackClick,
    onNpcAttackClick,
    onTalkClick,
    isNpcReachable,
    isHeroReachableByNpc,
    getVisibleKeys: vi.fn(() => new Set(['0:0', '1:0'])),
    onCaptureClick: vi.fn(),
    emitDoorTransition: vi.fn(),
    onTauntBlocked,
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

    const onAttackClick = vi.fn()
    const { onTokenClick } = buildDeps(store, abilityExec, { onAttackClick })

    const preventDefault = vi.fn()
    await onTokenClick(neutralNpc, { ctrlKey: true, preventDefault })

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(neutralNpc.attitude).toBe('hostile')
    expect(onAttackClick).toHaveBeenCalledTimes(1)
    expect(onAttackClick).toHaveBeenCalledWith(neutralNpc)
    expect(store.enterCombat).not.toHaveBeenCalled()
  })

  it('при Ctrl first strike не делает auto-quick-attack, а открывает боевой попап', async () => {
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

    const runQuickAttack = vi.fn()
    const onAttackClick = vi.fn()
    const { onTokenClick } = buildDeps(store, abilityExec, { runQuickAttack, onAttackClick })

    const preventDefault = vi.fn()
    await onTokenClick(neutralNpc, { ctrlKey: true, preventDefault })

    expect(onAttackClick).toHaveBeenCalledTimes(1)
    expect(runQuickAttack).not.toHaveBeenCalled()
  })

  it('при обычном ЛКМ по враждебному NPC выполняет быстрый удар', async () => {
    const hero = { uid: 'hero-1', tokenType: 'hero', col: 0, row: 0, name: 'Hero' }
    const hostileNpc = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'hostile',
      col: 1,
      row: 0,
      name: 'Hostile NPC',
    }

    const store = {
      combatMode: false,
      pendingAbility: null,
      placedTokens: [hero, hostileNpc],
      selectedPlacedUid: hero.uid,
      initiativeOrder: [{ uid: hero.uid }],
      currentInitiativeIndex: 0,
      enterCombat: vi.fn(() => {
        store.combatMode = true
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
    const { onTokenClick } = buildDeps(store, abilityExec, {
      moveTowardTarget,
      runQuickAttack,
      isNpcReachable: vi.fn(() => true),
    })

    await onTokenClick(hostileNpc, { ctrlKey: false })

    expect(store.enterCombat).toHaveBeenCalledTimes(1)
    expect(moveTowardTarget).toHaveBeenCalledTimes(1)
    expect(runQuickAttack).toHaveBeenCalledTimes(1)
  })

  it('в бою не открывает разговор по клику на дружественного/нейтрального NPC', async () => {
    const hero = { uid: 'hero-1', tokenType: 'hero', col: 0, row: 0, name: 'Hero' }
    const friendlyNpc = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'friendly',
      col: 1,
      row: 0,
      name: 'Friendly NPC',
    }

    const store = {
      combatMode: true,
      pendingAbility: null,
      placedTokens: [hero, friendlyNpc],
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

    const onTalkClick = vi.fn()
    const { onTokenClick } = buildDeps(store, abilityExec, {
      onTalkClick,
      isNpcReachable: vi.fn(() => true),
    })

    await onTokenClick(friendlyNpc, { ctrlKey: false })

    expect(onTalkClick).not.toHaveBeenCalled()
  })

  it('в мирном режиме открывает разговор по клику на дружественного NPC', async () => {
    const hero = { uid: 'hero-1', tokenType: 'hero', col: 0, row: 0, name: 'Hero' }
    const friendlyNpc = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'friendly',
      col: 1,
      row: 0,
      name: 'Friendly NPC',
    }

    const store = {
      combatMode: false,
      pendingAbility: null,
      placedTokens: [hero, friendlyNpc],
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

    const onTalkClick = vi.fn()
    const { onTokenClick } = buildDeps(store, abilityExec, {
      onTalkClick,
      isNpcReachable: vi.fn(() => true),
    })

    await onTokenClick(friendlyNpc, { ctrlKey: false })

    expect(onTalkClick).toHaveBeenCalledTimes(1)
    expect(onTalkClick).toHaveBeenCalledWith(friendlyNpc)
  })

  it('под провокацией блокирует offensive-способность по цели не-провокатору', async () => {
    const caster = {
      uid: 'hero-1',
      tokenType: 'hero',
      col: 0,
      row: 0,
      name: 'Hero',
      activeEffects: [{ id: 'taunt', byUid: 'npc-1', remainingTurns: 2 }],
    }
    const provokerNpc = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'hostile',
      col: 1,
      row: 0,
      name: 'Provoker',
      hp: 10,
    }
    const otherNpc = {
      uid: 'npc-2',
      tokenType: 'npc',
      attitude: 'hostile',
      col: 2,
      row: 0,
      name: 'Other',
      hp: 10,
    }

    const store = {
      combatMode: true,
      pendingAbility: {
        id: 'powerStrike',
        areaType: 'single',
        tokenUid: caster.uid,
        allyOnly: false,
        damageKind: 'physical',
      },
      placedTokens: [caster, provokerNpc, otherNpc],
      selectedPlacedUid: caster.uid,
      enterCombat: vi.fn(),
      endTurn: vi.fn(),
      setCombatPair: vi.fn(),
      selectPlacedToken: vi.fn(),
    }

    const abilityExec = {
      needsTargetToken: { value: true },
      executeAbility: vi.fn(),
    }

    const onTauntBlocked = vi.fn()
    const { onTokenClick } = buildDeps(store, abilityExec, { onTauntBlocked })

    await onTokenClick(otherNpc, null)

    expect(onTauntBlocked).toHaveBeenCalledTimes(1)
    expect(abilityExec.executeAbility).not.toHaveBeenCalled()
  })

  it('герой под провокацией не может сделать quick-атаку по не-провокатору', async () => {
    const hero = {
      uid: 'hero-1',
      tokenType: 'hero',
      col: 0,
      row: 0,
      name: 'Hero',
      activeEffects: [{ id: 'taunt', byUid: 'npc-1', remainingTurns: 2 }],
    }
    const provokerNpc = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'hostile',
      col: 1,
      row: 0,
      name: 'Provoker',
      hp: 10,
    }
    const otherNpc = {
      uid: 'npc-2',
      tokenType: 'npc',
      attitude: 'hostile',
      col: 2,
      row: 0,
      name: 'Other',
      hp: 10,
    }

    const store = {
      combatMode: true,
      pendingAbility: null,
      placedTokens: [hero, provokerNpc, otherNpc],
      selectedPlacedUid: hero.uid,
      initiativeOrder: [{ uid: hero.uid }],
      currentInitiativeIndex: 0,
      enterCombat: vi.fn(),
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
    const onTauntBlocked = vi.fn()
    const { onTokenClick } = buildDeps(store, abilityExec, {
      moveTowardTarget,
      runQuickAttack,
      onTauntBlocked,
      isNpcReachable: vi.fn(() => true),
    })

    await onTokenClick(otherNpc, { ctrlKey: false })

    expect(onTauntBlocked).toHaveBeenCalledTimes(1)
    expect(moveTowardTarget).not.toHaveBeenCalled()
    expect(runQuickAttack).not.toHaveBeenCalled()
  })
})
