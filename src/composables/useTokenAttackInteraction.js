import { getSelectedToken } from '../utils/tokenFilters'
import { TOKEN_MOVE_STEP_DELAY_MS } from '../constants/timing'
import { sleep } from '../utils/async'
import { getCurrentScenarioId } from '../utils/scenario'

export function useTokenAttackInteraction({
  store,
  dirs,
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

    const alreadyAdjacent = dirs.some(
      ([dc, dr]) => npc.col + dc === hero.col && npc.row + dr === hero.row
    )
    if (alreadyAdjacent) {
      store.selectPlacedToken(null)
      closeContextMenu()
      store.setCombatPair(heroUid, npcUid)
      store.enterCombat(heroUid, getVisibleKeys())
      return
    }

    const occupied = new Set(
      store.placedTokens.filter((t) => t.uid !== heroUid).map((t) => `${t.col},${t.row}`)
    )

    // Ближайшая свободная клетка рядом с НПС — без фильтрации по AP-зоне
    const target = dirs
      .map(([dc, dr]) => ({ col: npc.col + dc, row: npc.row + dr }))
      .filter((cell) => !occupied.has(`${cell.col},${cell.row}`))
      .reduce((best, cell) => {
        if (!best) return cell
        const d = Math.abs(cell.col - hero.col) + Math.abs(cell.row - hero.row)
        const bd = Math.abs(best.col - hero.col) + Math.abs(best.row - hero.row)
        return d < bd ? cell : best
      }, null)

    if (!target) return // НПС полностью окружён другими токенами

    // Строим полный путь без ограничения AP и идём сколько хватит очков действий
    const path = findPath(hero, target, store.walls, 999, occupied)
    if (!path || path.length === 0) return

    const scenarioId = getCurrentScenarioId(store)
    store.selectPlacedToken(null)
    closeContextMenu()

    for (const step of path) {
      if (!store.spendActionPoint(heroUid)) break
      store.moveToken(heroUid, step.col, step.row)
      if (scenarioId) {
        getSocket()?.emit('token:move', { scenarioId, uid: heroUid, col: step.col, row: step.row })
      }
      await sleep(TOKEN_MOVE_STEP_DELAY_MS)
    }

    store.setCombatPair(heroUid, npcUid)
    store.enterCombat(heroUid, getVisibleKeys())
  }

  async function onNpcAttackClick(hero) {
    const npc = getSelectedToken(store.placedTokens, store.selectedPlacedUid)
    if (!npc) return

    const heroUid = hero.uid
    const npcUid = npc.uid

    const alreadyAdjacent = dirs.some(
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
      store.placedTokens.filter((t) => t.uid !== npcUid).map((t) => `${t.col},${t.row}`)
    )

    // Ближайшая свободная клетка рядом с героем — без фильтрации по AP-зоне
    const target = dirs
      .map(([dc, dr]) => ({ col: hero.col + dc, row: hero.row + dr }))
      .filter((cell) => !occupied.has(`${cell.col},${cell.row}`))
      .reduce((best, cell) => {
        if (!best) return cell
        const d = Math.abs(cell.col - npc.col) + Math.abs(cell.row - npc.row)
        const bd = Math.abs(best.col - npc.col) + Math.abs(best.row - npc.row)
        return d < bd ? cell : best
      }, null)

    if (!target) return // Герой полностью окружён другими токенами

    // Строим полный путь без ограничения AP и идём сколько хватит очков действий
    const path = findPath(npc, target, store.walls, 999, occupied)
    if (!path || path.length === 0) return

    const scenarioId = getCurrentScenarioId(store)
    store.selectPlacedToken(null)
    closeContextMenu()

    for (const step of path) {
      if (!store.spendActionPoint(npcUid)) break
      store.moveToken(npcUid, step.col, step.row)
      if (scenarioId) {
        getSocket()?.emit('token:move', { scenarioId, uid: npcUid, col: step.col, row: step.row })
      }
      await sleep(TOKEN_MOVE_STEP_DELAY_MS)
    }

    store.setCombatPair(heroUid, npcUid, true)
    store.enterCombat(npcUid, getVisibleKeys())
  }

  return {
    onAttackClick,
    onNpcAttackClick,
  }
}
