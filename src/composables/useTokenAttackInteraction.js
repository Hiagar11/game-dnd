import { getSelectedToken } from '../utils/tokenFilters'
import { TOKEN_MOVE_STEP_DELAY_MS } from '../constants/timing'
import { sleep } from '../utils/async'
import { getCurrentScenarioId } from '../utils/scenario'
import { ADJACENT_2x2, expandOccupied2x2 } from './useTokenMove'

export function useTokenAttackInteraction({
  store,
  findPath,
  getSocket,
  closeContextMenu,
  getVisibleKeys,
}) {
  async function onAttackClick(npc) {
    const hero = getSelectedToken(store.placedTokens, store.selectedPlacedUid)
    if (!hero) return

    const heroUid = hero.uid
    const npcUid = npc.uid

    const alreadyAdjacent = ADJACENT_2x2.some(
      ([dc, dr]) => npc.col + dc === hero.col && npc.row + dr === hero.row
    )
    if (alreadyAdjacent) {
      closeContextMenu()
      store.setCombatPair(heroUid, npcUid)
      store.enterCombat(heroUid, getVisibleKeys())
      return
    }

    const occupied = new Set(
      store.placedTokens
        .filter((t) => t.uid !== heroUid && t.uid !== npcUid)
        .map((t) => `${t.col},${t.row}`)
    )
    const blocked = expandOccupied2x2(occupied)

    // Ближайшая свободная клетка рядом с НПС — без фильтрации по AP-зоне
    const target = ADJACENT_2x2.map(([dc, dr]) => ({ col: npc.col + dc, row: npc.row + dr }))
      .filter((cell) => cell.col >= 0 && cell.row >= 0 && !blocked.has(`${cell.col},${cell.row}`))
      .reduce((best, cell) => {
        if (!best) return cell
        const d = Math.abs(cell.col - hero.col) + Math.abs(cell.row - hero.row)
        const bd = Math.abs(best.col - hero.col) + Math.abs(best.row - hero.row)
        return d < bd ? cell : best
      }, null)

    if (!target) return

    const path = findPath(hero, target, store.walls, 999, occupied)
    if (!path || path.length === 0) return

    const scenarioId = getCurrentScenarioId(store)
    store.selectPlacedToken(null)
    closeContextMenu()

    for (const step of path) {
      if (!store.spendMovementPoint(heroUid)) break
      store.moveToken(heroUid, step.col, step.row)
      if (scenarioId) {
        getSocket()?.emit('token:move', { scenarioId, uid: heroUid, col: step.col, row: step.row })
      }
      await sleep(TOKEN_MOVE_STEP_DELAY_MS)
    }

    // Проверяем, дошёл ли герой до смежной клетки (MP могли кончиться раньше)
    const heroAfter = store.placedTokens.find((t) => t.uid === heroUid)
    const npcAfter = store.placedTokens.find((t) => t.uid === npcUid)
    if (!heroAfter || !npcAfter) return
    const arrived = ADJACENT_2x2.some(
      ([dc, dr]) => npcAfter.col + dc === heroAfter.col && npcAfter.row + dr === heroAfter.row
    )
    if (!arrived) {
      store.selectPlacedToken(heroUid)
      return
    }

    store.setCombatPair(heroUid, npcUid)
    store.enterCombat(heroUid, getVisibleKeys())
  }

  async function onNpcAttackClick(hero) {
    const npc = getSelectedToken(store.placedTokens, store.selectedPlacedUid)
    if (!npc) return

    const heroUid = hero.uid
    const npcUid = npc.uid

    const alreadyAdjacent = ADJACENT_2x2.some(
      ([dc, dr]) => hero.col + dc === npc.col && hero.row + dr === npc.row
    )
    if (alreadyAdjacent) {
      store.selectPlacedToken(null)
      closeContextMenu()
      store.setCombatPair(heroUid, npcUid, true)
      store.enterCombat(npcUid, getVisibleKeys())
      return
    }

    const occupied = new Set(
      store.placedTokens
        .filter((t) => t.uid !== npcUid && t.uid !== heroUid)
        .map((t) => `${t.col},${t.row}`)
    )
    const blocked = expandOccupied2x2(occupied)

    const target = ADJACENT_2x2.map(([dc, dr]) => ({ col: hero.col + dc, row: hero.row + dr }))
      .filter((cell) => cell.col >= 0 && cell.row >= 0 && !blocked.has(`${cell.col},${cell.row}`))
      .reduce((best, cell) => {
        if (!best) return cell
        const d = Math.abs(cell.col - npc.col) + Math.abs(cell.row - npc.row)
        const bd = Math.abs(best.col - npc.col) + Math.abs(best.row - npc.row)
        return d < bd ? cell : best
      }, null)

    if (!target) return

    const path = findPath(npc, target, store.walls, 999, occupied)
    if (!path || path.length === 0) return

    const scenarioId = getCurrentScenarioId(store)
    store.selectPlacedToken(null)
    closeContextMenu()

    for (const step of path) {
      if (!store.spendMovementPoint(npcUid)) break
      store.moveToken(npcUid, step.col, step.row)
      if (scenarioId) {
        getSocket()?.emit('token:move', { scenarioId, uid: npcUid, col: step.col, row: step.row })
      }
      await sleep(TOKEN_MOVE_STEP_DELAY_MS)
    }

    // Проверяем, дошёл ли NPC до смежной клетки
    const npcAfter = store.placedTokens.find((t) => t.uid === npcUid)
    const heroAfter = store.placedTokens.find((t) => t.uid === heroUid)
    if (!npcAfter || !heroAfter) return
    const arrived = ADJACENT_2x2.some(
      ([dc, dr]) => heroAfter.col + dc === npcAfter.col && heroAfter.row + dr === npcAfter.row
    )
    if (!arrived) return

    store.setCombatPair(heroUid, npcUid, true)
    store.enterCombat(npcUid, getVisibleKeys())
  }

  return {
    onAttackClick,
    onNpcAttackClick,
  }
}
