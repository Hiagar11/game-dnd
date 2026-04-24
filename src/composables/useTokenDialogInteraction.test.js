import { describe, expect, it, vi } from 'vitest'
import { useTokenDialogInteraction } from './useTokenDialogInteraction'

function buildDialogDeps(store, options = {}) {
  return useTokenDialogInteraction({
    store,
    getSocket: options.getSocket ?? vi.fn(() => null),
    closeContextMenu: options.closeContextMenu ?? vi.fn(),
    findPath: options.findPath ?? vi.fn(() => []),
    openBubble: options.openBubble ?? vi.fn(),
    closeBubble: options.closeBubble ?? vi.fn(),
    addNpcMessage: options.addNpcMessage ?? vi.fn(),
    addDiceRollMessage: options.addDiceRollMessage ?? vi.fn(),
    addPlayerMessage: options.addPlayerMessage ?? vi.fn(),
    addTradeOffer: options.addTradeOffer ?? vi.fn(),
    addWarningMessage: options.addWarningMessage ?? vi.fn(),
    triggerAttitudeArrow: options.triggerAttitudeArrow ?? vi.fn(),
    dialogBubbles: options.dialogBubbles ?? { value: new Map() },
    getVisibleKeys: options.getVisibleKeys ?? vi.fn(() => null),
  })
}

describe('useTokenDialogInteraction', () => {
  it('не открывает разговор во время боя', async () => {
    const hero = { uid: 'hero-1', tokenType: 'hero', col: 0, row: 0, name: 'Hero' }
    const npc = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'friendly',
      col: 1,
      row: 0,
      name: 'NPC',
    }

    const store = {
      combatMode: true,
      placedTokens: [hero, npc],
      selectedPlacedUid: hero.uid,
      walls: [],
      currentScenario: null,
      selectPlacedToken: vi.fn(),
      moveToken: vi.fn(),
      addGroundBag: vi.fn(),
      editPlacedToken: vi.fn(),
      enterCombat: vi.fn(),
    }

    const openBubble = vi.fn()
    const deps = buildDialogDeps(store, { openBubble })

    await deps.onTalkClick(npc)

    expect(openBubble).not.toHaveBeenCalled()
    expect(store.selectPlacedToken).not.toHaveBeenCalled()
  })

  it('не отправляет сообщения диалога во время боя', () => {
    const npc = {
      uid: 'npc-1',
      tokenType: 'npc',
      attitude: 'friendly',
      col: 1,
      row: 0,
      name: 'NPC',
    }

    const store = {
      combatMode: true,
      placedTokens: [npc],
      selectedPlacedUid: null,
      walls: [],
      currentScenario: null,
      selectPlacedToken: vi.fn(),
      moveToken: vi.fn(),
      addGroundBag: vi.fn(),
      editPlacedToken: vi.fn(),
      enterCombat: vi.fn(),
    }

    const addPlayerMessage = vi.fn()
    const getSocket = vi.fn()
    const deps = buildDialogDeps(store, { addPlayerMessage, getSocket })

    deps.onDialogSend(npc.uid, 'Привет')

    expect(addPlayerMessage).not.toHaveBeenCalled()
    expect(getSocket).not.toHaveBeenCalled()
  })
})
