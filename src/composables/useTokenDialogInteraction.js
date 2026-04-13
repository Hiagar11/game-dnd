import { getNpcAttitude, getSelectedToken } from '../utils/tokenFilters'
import { TOKEN_MOVE_STEP_DELAY_MS } from '../constants/timing'
import { sleep } from '../utils/async'
import { getCurrentScenarioId } from '../utils/scenario'

export function useTokenDialogInteraction({
  store,
  getSocket,
  closeContextMenu,
  dirs,
  findPath,
  openBubble,
  addNpcMessage,
  addDiceRollMessage,
  addPlayerMessage,
  triggerAttitudeArrow,
  damageFloatRef,
  dialogBubbles,
}) {
  async function onTalkClick(npc) {
    const hero = getSelectedToken(store.placedTokens, store.selectedPlacedUid)
    if (!hero) return

    const heroUid = hero.uid
    const heroSrc = hero.src ?? null

    const alreadyAdjacent = dirs.some(
      ([dc, dr]) => npc.col + dc === hero.col && npc.row + dr === hero.row
    )

    store.selectPlacedToken(null)
    closeContextMenu()

    if (!alreadyAdjacent) {
      // Исключаем героя и NPC-цель из occupied — expandOccupied2x2 расширяет
      // каждую позицию на ±1, и без исключения NPC блокируются все соседние клетки
      const occupied = new Set(
        store.placedTokens
          .filter((t) => t.uid !== heroUid && t.uid !== npc.uid)
          .map((t) => `${t.col},${t.row}`)
      )

      // Ближайшая свободная клетка рядом с НПС — без фильтрации по AP-зоне
      const dest = dirs
        .map(([dc, dr]) => ({ col: npc.col + dc, row: npc.row + dr }))
        .filter((cell) => !occupied.has(`${cell.col},${cell.row}`))
        .reduce((best, cell) => {
          if (!best) return cell
          const d = Math.abs(cell.col - hero.col) + Math.abs(cell.row - hero.row)
          const bd = Math.abs(best.col - hero.col) + Math.abs(best.row - hero.row)
          return d < bd ? cell : best
        }, null)

      if (!dest) return // НПС полностью окружён другими токенами

      // Строим полный путь без ограничения AP и идём сколько хватит очков действий
      const path = findPath(hero, dest, store.walls, 999, occupied)
      if (!path || path.length === 0) return // путь заблокирован стенами

      const scenarioId = getCurrentScenarioId(store)

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
    }

    // Диалог открываем только если теперь стоим рядом с НПС
    const arrivedHero = store.placedTokens.find((t) => t.uid === heroUid)
    if (!arrivedHero) return

    const nowAdjacent = dirs.some(
      ([dc, dr]) => npc.col + dc === arrivedHero.col && npc.row + dr === arrivedHero.row
    )
    if (!nowAdjacent) return

    openBubble(npc.uid, heroSrc, heroUid)
    emitNpcTalk(npc, 'Привет!')
  }

  function getHeroPersuasion(npcUid) {
    const bubble = dialogBubbles.value?.get(npcUid)
    const heroUid = bubble?.heroUid
    if (!heroUid) return 0
    const hero = store.placedTokens.find((t) => t.uid === heroUid)
    if (!hero) return 0
    const c = hero.charisma ?? 0
    const i = hero.intellect ?? 0
    return Math.floor((c * 2 + i) / 3)
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
      heroPersuasion: getHeroPersuasion(npc.uid),
    })

    function onReply({
      npcUid,
      text,
      attitudeDelta,
      displayDelta,
      newScore,
      newAttitude,
      diceRoll,
    }) {
      if (npcUid !== npc.uid) return
      socket.off('npc:reply', onReply)

      if (diceRoll) addDiceRollMessage(npc.uid, diceRoll)
      addNpcMessage(npc.uid, text, newScore)
      if (newAttitude && ['hostile', 'friendly', 'neutral'].includes(newAttitude)) {
        store.editPlacedToken(npc.uid, { attitude: newAttitude })
      }

      const arrowDelta = displayDelta ?? attitudeDelta
      if (arrowDelta > 0) {
        triggerAttitudeArrow(npc.uid, 'up')
        const hc = store.halfCell
        const cs = store.cellSize
        const x = npc.col * hc + store.gridNormOX + cs * 0.75
        const y = npc.row * hc + store.gridNormOY + cs * 0.25
        damageFloatRef.value?.spawn(npc.uid, '▲', x, y, '#4ade80')
      } else if (arrowDelta < 0) {
        triggerAttitudeArrow(npc.uid, 'down')
        const hc = store.halfCell
        const cs = store.cellSize
        const x = npc.col * hc + store.gridNormOX + cs * 0.75
        const y = npc.row * hc + store.gridNormOY + cs * 0.25
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
