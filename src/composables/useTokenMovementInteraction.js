import { TOKEN_MOVE_STEP_DELAY_MS } from '../constants/timing'
import { sleep } from '../utils/async'
import { getCurrentScenarioId } from '../utils/scenario'

export function useTokenMovementInteraction({
  store,
  dirs,
  findPath,
  getSocket,
  closeContextMenu,
  emitDoorTransition,
}) {
  async function moveTowardTarget(attackerUid, targetToken) {
    const attacker = store.placedTokens.find((t) => t.uid === attackerUid)
    if (!attacker) return false

    const ap = attacker.actionPoints ?? 0
    if (ap <= 0) return false

    const alreadyAdjacent = dirs.some(
      ([dc, dr]) => targetToken.col + dc === attacker.col && targetToken.row + dr === attacker.row
    )
    if (alreadyAdjacent) return true

    const occupied = new Set(
      store.placedTokens.filter((t) => t.uid !== attackerUid).map((t) => `${t.col},${t.row}`)
    )

    const maxSearchAp = 99
    const adjacentCells = dirs.map(([dc, dr]) => ({
      col: targetToken.col + dc,
      row: targetToken.row + dr,
    }))

    const dest = adjacentCells.reduce((best, cell) => {
      const d = Math.abs(cell.col - attacker.col) + Math.abs(cell.row - attacker.row)
      const bd = Math.abs(best.col - attacker.col) + Math.abs(best.row - attacker.row)
      return d < bd ? cell : best
    })

    const fullPath = findPath(attacker, dest, store.walls, maxSearchAp, occupied)
    if (!fullPath || fullPath.length === 0) return false

    const stepsToTake = fullPath.slice(0, Math.max(0, ap - 1))
    const scenarioId = getCurrentScenarioId(store)

    for (const step of stepsToTake) {
      if (!store.spendActionPoint(attackerUid)) break
      store.moveToken(attackerUid, step.col, step.row)
      if (scenarioId) {
        getSocket()?.emit('token:move', {
          scenarioId,
          uid: attackerUid,
          col: step.col,
          row: step.row,
        })
      }
      await sleep(TOKEN_MOVE_STEP_DELAY_MS)
    }

    const arrived = store.placedTokens.find((t) => t.uid === attackerUid)
    if (!arrived) return false

    return dirs.some(
      ([dc, dr]) => targetToken.col + dc === arrived.col && targetToken.row + dr === arrived.row
    )
  }

  async function onDoorWalk(selected, door) {
    const uid = selected.uid
    const scenarioId = getCurrentScenarioId(store)

    store.selectPlacedToken(null)
    closeContextMenu()

    const alreadyAdjacent = dirs.some(
      ([dc, dr]) => door.col + dc === selected.col && door.row + dr === selected.row
    )

    if (!alreadyAdjacent) {
      const occupied = new Set(
        store.placedTokens.filter((t) => t.uid !== uid).map((t) => `${t.col},${t.row}`)
      )
      const wallSet = new Set(store.walls.map((w) => `${w.col},${w.row}`))

      const freeAdjacentCells = dirs
        .map(([dc, dr]) => ({ col: door.col + dc, row: door.row + dr }))
        .filter((cell) => {
          const key = `${cell.col},${cell.row}`
          return cell.col >= 0 && cell.row >= 0 && !occupied.has(key) && !wallSet.has(key)
        })

      if (!freeAdjacentCells.length) return

      const dest = freeAdjacentCells.reduce((best, cell) => {
        const d = Math.abs(cell.col - selected.col) + Math.abs(cell.row - selected.row)
        const bd = Math.abs(best.col - selected.col) + Math.abs(best.row - selected.row)
        return d < bd ? cell : best
      })

      const path = findPath(selected, dest, store.walls, 999, occupied)
      if (!path || path.length === 0) return

      for (const step of path) {
        store.moveToken(uid, step.col, step.row)
        if (scenarioId) {
          getSocket()?.emit('token:move', { scenarioId, uid, col: step.col, row: step.row })
        }
        await sleep(TOKEN_MOVE_STEP_DELAY_MS)
      }
    }

    const buffer = store.placedTokens
      .filter(
        (t) => !t.systemToken && Math.abs(t.col - door.col) <= 1 && Math.abs(t.row - door.row) <= 1
      )
      .map((t) => ({ ...t }))

    const sourceScenarioId = store.currentScenario?.id ?? null
    emitDoorTransition({
      targetScenarioId: door.targetScenarioId,
      sourceScenarioId,
      buffer,
      initiatorUid: uid,
    })
  }

  return {
    moveTowardTarget,
    onDoorWalk,
  }
}
