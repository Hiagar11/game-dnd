import { getNpcAttitude, getSelectedToken } from '../utils/tokenFilters'
import { TOKEN_MOVE_STEP_DELAY_MS } from '../constants/timing'
import { sleep } from '../utils/async'
import { getCurrentScenarioId } from '../utils/scenario'

export function useTokenDialogInteraction({
  store,
  heroReachable,
  getSocket,
  closeContextMenu,
  dirs,
  findPath,
  openBubble,
  addNpcMessage,
  addPlayerMessage,
  triggerAttitudeArrow,
  damageFloatRef,
}) {
  async function onTalkClick(npc) {
    const hero = getSelectedToken(store.placedTokens, store.selectedPlacedUid)
    if (!hero) return

    const heroUid = hero.uid
    const alreadyAdjacent = dirs.some(
      ([dc, dr]) => npc.col + dc === hero.col && npc.row + dr === hero.row
    )

    if (!alreadyAdjacent) {
      const adjacent = dirs
        .map(([dc, dr]) => ({ col: npc.col + dc, row: npc.row + dr }))
        .filter((cell) => heroReachable.value.has(`${cell.col},${cell.row}`))
      if (!adjacent.length) return

      const target = adjacent.reduce((best, cell) => {
        const d = Math.abs(cell.col - hero.col) + Math.abs(cell.row - hero.row)
        const bd = Math.abs(best.col - hero.col) + Math.abs(best.row - hero.row)
        return d < bd ? cell : best
      })

      const path = findPath(
        hero,
        target,
        store.walls,
        hero.actionPoints ?? 0,
        new Set(
          store.placedTokens.filter((t) => t.uid !== hero.uid).map((t) => `${t.col},${t.row}`)
        )
      )
      if (!path) return

      const scenarioId = getCurrentScenarioId(store)
      store.selectPlacedToken(null)
      closeContextMenu()

      for (const step of path) {
        if (!store.spendActionPoint(heroUid)) break
        store.moveToken(heroUid, step.col, step.row)
        if (scenarioId) {
          getSocket()?.emit('token:move', {
            scenarioId,
            uid: heroUid,
            col: step.col,
            row: step.row,
          })
        }
        await sleep(TOKEN_MOVE_STEP_DELAY_MS)
      }
    } else {
      store.selectPlacedToken(null)
      closeContextMenu()
    }

    openBubble(npc.uid, hero.src ?? null)
    emitNpcTalk(npc, 'Привет!')
  }

  function emitNpcTalk(npc, playerMessage) {
    const socket = getSocket()
    if (!socket) return

    const scenarioId = getCurrentScenarioId(store)
    socket.emit('npc:talk', {
      npcUid: npc.uid,
      tokenId: npc.tokenId ?? null,
      scenarioId,
      placedAttitude: getNpcAttitude(npc),
      placedName: npc.npcName || npc.name || '',
      playerMessage,
    })

    function onReply({ npcUid, text, attitudeDelta, displayDelta, newScore, newAttitude }) {
      if (npcUid !== npc.uid) return
      socket.off('npc:reply', onReply)

      addNpcMessage(npc.uid, text, newScore)
      if (newAttitude && ['hostile', 'friendly', 'neutral'].includes(newAttitude)) {
        store.editPlacedToken(npc.uid, { attitude: newAttitude })
      }

      const arrowDelta = displayDelta ?? attitudeDelta
      if (arrowDelta > 0) {
        triggerAttitudeArrow(npc.uid, 'up')
        const cell = store.cellSize
        const x = npc.col * cell + cell * 0.75
        const y = npc.row * cell + cell * 0.25
        damageFloatRef.value?.spawn(npc.uid, '▲', x, y, '#4ade80')
      } else if (arrowDelta < 0) {
        triggerAttitudeArrow(npc.uid, 'down')
        const cell = store.cellSize
        const x = npc.col * cell + cell * 0.75
        const y = npc.row * cell + cell * 0.25
        damageFloatRef.value?.spawn(npc.uid, '▼', x, y, '#f87171')
      }
    }

    socket.on('npc:reply', onReply)
  }

  function onDialogSend(uid, playerText) {
    const npc = store.placedTokens.find((t) => t.uid === uid)
    if (!npc) return
    addPlayerMessage(uid, playerText)
    emitNpcTalk(npc, playerText)
  }

  return {
    onTalkClick,
    onDialogSend,
  }
}
