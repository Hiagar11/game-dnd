import { TOKEN_MOVE_STEP_DELAY_MS } from '../constants/timing'
import { sleep } from '../utils/async'
import { getCurrentScenarioId } from '../utils/scenario'
import { isHeroToken, isNpcToken } from '../utils/tokenFilters'
import { ADJACENT_2x2, expandOccupied2x2 } from './useTokenMove'

const NEARBY_RADIUS = 3

export function useTokenMovementInteraction({
  store,
  dirs,
  findPath,
  getSocket,
  closeContextMenu,
  emitDoorTransition,
  emitContainerLoot,
  emitContainerEmpty,
  emitContainerLocked,
}) {
  async function moveTowardTarget(attackerUid, targetToken) {
    const attacker = store.placedTokens.find((t) => t.uid === attackerUid)
    if (!attacker) return false

    const mp = attacker.movementPoints ?? 0
    if (mp <= 0) return false

    const alreadyAdjacent = ADJACENT_2x2.some(
      ([dc, dr]) => targetToken.col + dc === attacker.col && targetToken.row + dr === attacker.row
    )
    if (alreadyAdjacent) return true

    const occupied = new Set(
      store.placedTokens
        .filter((t) => t.uid !== attackerUid && t.uid !== targetToken.uid)
        .map((t) => `${t.col},${t.row}`)
    )
    const blocked = expandOccupied2x2(occupied)

    const maxSearchMp = 99
    const dest = ADJACENT_2x2.map(([dc, dr]) => ({
      col: targetToken.col + dc,
      row: targetToken.row + dr,
    }))
      .filter((cell) => cell.col >= 0 && cell.row >= 0 && !blocked.has(`${cell.col},${cell.row}`))
      .reduce((best, cell) => {
        if (!best) return cell
        const d = Math.abs(cell.col - attacker.col) + Math.abs(cell.row - attacker.row)
        const bd = Math.abs(best.col - attacker.col) + Math.abs(best.row - attacker.row)
        return d < bd ? cell : best
      }, null)

    if (!dest) return false

    const fullPath = findPath(attacker, dest, store.walls, maxSearchMp, occupied)
    if (!fullPath || fullPath.length === 0) return false

    const stepsToTake = fullPath.slice(0, Math.max(0, mp))
    const scenarioId = getCurrentScenarioId(store)

    for (const step of stepsToTake) {
      if (!store.spendMovementPoint(attackerUid)) break
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

    return ADJACENT_2x2.some(
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
      // Исключаем героя и дверь-цель из occupied — expandOccupied2x2 расширяет
      // каждую позицию на ±1, и без исключения двери блокируются все соседние клетки
      const occupied = new Set(
        store.placedTokens
          .filter((t) => t.uid !== uid && t.uid !== door.uid)
          .map((t) => `${t.col},${t.row}`)
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

    // Все герои на карте + NPC вокруг двери (±1 клетка)
    const buffer = store.placedTokens
      .filter(
        (t) =>
          isHeroToken(t) ||
          (isNpcToken(t) && Math.abs(t.col - door.col) <= 1 && Math.abs(t.row - door.row) <= 1)
      )
      .map((t) => ({ ...t }))

    const sourceScenarioId = store.currentScenario?.id ?? null
    emitDoorTransition({
      targetScenarioId: door.targetScenarioId,
      globalMapExit: Boolean(door.globalMapExit),
      sourceScenarioId,
      buffer,
      initiatorUid: uid,
    })
  }

  /** Герой подходит к контейнеру (сундук/кувшин) → открыть → показать лут. */
  async function onContainerWalk(selected, container) {
    const uid = selected.uid
    const scenarioId = getCurrentScenarioId(store)

    store.selectPlacedToken(null)
    closeContextMenu()

    const alreadyAdjacent = dirs.some(
      ([dc, dr]) => container.col + dc === selected.col && container.row + dr === selected.row
    )

    if (!alreadyAdjacent) {
      const occupied = new Set(
        store.placedTokens
          .filter((t) => t.uid !== uid && t.uid !== container.uid)
          .map((t) => `${t.col},${t.row}`)
      )
      const wallSet = new Set(store.walls.map((w) => `${w.col},${w.row}`))

      const freeAdjacentCells = dirs
        .map(([dc, dr]) => ({ col: container.col + dc, row: container.row + dr }))
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

    // Мешочек — показать его предметы напрямую (без openContainer)
    if (container.systemToken === 'bag') {
      if (!container.items?.length) {
        emitContainerEmpty(container)
        return
      }
      emitContainerLoot({
        id: container.uid,
        col: container.col,
        row: container.row,
        items: container.items,
        sourceType: 'bag',
        isBagToken: true,
      })
      return
    }

    if (!container.opened) {
      // Если контейнер заперт — ищем ключ в инвентаре героя
      if (container.locked) {
        const hero = store.placedTokens.find((t) => t.uid === selected.uid)
        const inv = hero?.inventory
        if (!inv) {
          emitContainerLocked(container)
          return
        }
        const keyIdx = inv.cells.findIndex((c) => c && c.slot === 'key')
        if (keyIdx === -1) {
          emitContainerLocked(container)
          return
        }
        // Потратить ключ
        inv.cells[keyIdx] = null
        container.locked = false
      }
      const hero = store.placedTokens.find((t) => t.uid === selected.uid)
      const pile = store.openContainer(container.uid, hero?.level ?? 1)
      if (pile) emitContainerLoot(pile)
      else emitContainerEmpty(container)
    } else {
      // Уже открыт — ищем кучку лута рядом
      const pile = store.groundItems.find(
        (g) => Math.abs(g.col - container.col) + Math.abs(g.row - container.row) <= NEARBY_RADIUS
      )
      if (pile) {
        pile.sourceType = container.systemToken === 'item' ? 'chest' : 'jar'
        emitContainerLoot(pile)
      } else {
        emitContainerEmpty(container)
      }
    }
  }

  return {
    moveTowardTarget,
    onDoorWalk,
    onContainerWalk,
  }
}
