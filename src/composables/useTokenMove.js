import { isHostileNpcToken, isTalkableNpcToken } from '../utils/tokenFilters'

// Радиус = 8 sub-cell шагов (= 4 основные ячейки)
export const RANGE_RADIUS = 8

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

// ─── Утилиты для 2×2 токенов на sub-grid ────────────────────────────────────

/** Проверяет, пересекает ли позиция 2×2-токена стену */
function isWallBlocked(col, row, wallSet) {
  for (let dc = 0; dc < 2; dc++) {
    for (let dr = 0; dr < 2; dr++) {
      if (wallSet.has(`${col + dc},${row + dr}`)) return true
    }
  }
  return false
}

/**
 * Раскладывает позиции других токенов (2×2) в set запрещённых top-left координат.
 * Два 2×2-блока пересекаются если |c1-c2| < 2 && |r1-r2| < 2.
 * Поэтому для каждого occupied (oc, or) блокируем позиции (oc-1..oc+1, or-1..or+1).
 */
export function expandOccupied2x2(occupiedKeys) {
  const blocked = new Set()
  for (const key of occupiedKeys) {
    const [c, r] = key.split(',').map(Number)
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        blocked.add(`${c + dc},${r + dr}`)
      }
    }
  }
  return blocked
}

// ─── Проверка дальности ──────────────────────────────────────────────────────

export function isInRange(token, col, row) {
  // token и target в sub-cell координатах; токен занимает 2×2
  const centerCol = token.col + 1 // центр 2×2 = +1 sub-cell
  const centerRow = token.row + 1

  const dx = Math.max(Math.abs(col - centerCol), Math.abs(col + 2 - centerCol))
  const dy = Math.max(Math.abs(row - centerRow), Math.abs(row + 2 - centerRow))

  return Math.sqrt(dx * dx + dy * dy) <= RANGE_RADIUS
}

// ─── Достижимые клетки (BFS) ─────────────────────────────────────────────────

export function buildReachableCells(token, walls, radius = RANGE_RADIUS, occupiedKeys = new Set()) {
  const wallSet = new Set(walls.map((w) => `${w.col},${w.row}`))
  const blockedByOthers = expandOccupied2x2(occupiedKeys)

  const reachable = new Set()

  const queue = [[token.col, token.row, radius]]
  const visited = new Set([`${token.col},${token.row}`])

  while (queue.length) {
    const [col, row, steps] = queue.shift()

    if (col !== token.col || row !== token.row) {
      reachable.add(`${col},${row}`)
    }

    if (steps === 0) continue

    for (const [dc, dr] of DIRS) {
      const nc = col + dc
      const nr = row + dr
      const key = `${nc},${nr}`

      if (visited.has(key) || nc < 0 || nr < 0) continue
      if (isWallBlocked(nc, nr, wallSet)) continue
      if (blockedByOthers.has(key)) continue

      visited.add(key)
      queue.push([nc, nr, steps - 1])
    }
  }

  return reachable
}

// ─── Поиск пути (BFS) ────────────────────────────────────────────────────────

export function findPath(token, target, walls, radius = RANGE_RADIUS, occupiedKeys = new Set()) {
  const wallSet = new Set(walls.map((w) => `${w.col},${w.row}`))
  const blockedByOthers = expandOccupied2x2(occupiedKeys)
  const startKey = `${token.col},${token.row}`
  const goalKey = `${target.col},${target.row}`

  if (startKey === goalKey) return []

  const parent = new Map([[startKey, null]])
  const stepCount = new Map([[startKey, 0]])
  const queue = [[token.col, token.row]]

  outer: while (queue.length) {
    const [col, row] = queue.shift()
    const key = `${col},${row}`
    const nextSteps = (stepCount.get(key) ?? 0) + 1

    if (nextSteps > radius) continue

    for (const [dc, dr] of DIRS) {
      const nc = col + dc
      const nr = row + dr
      const nkey = `${nc},${nr}`

      if (parent.has(nkey) || nc < 0 || nr < 0) continue
      if (isWallBlocked(nc, nr, wallSet)) continue
      if (blockedByOthers.has(nkey)) continue

      parent.set(nkey, key)
      stepCount.set(nkey, nextSteps)

      if (nkey === goalKey) break outer

      queue.push([nc, nr])
    }
  }

  if (!parent.has(goalKey)) return null

  const path = []
  let cur = goalKey
  while (cur !== startKey) {
    const [c, r] = cur.split(',').map(Number)
    path.unshift({ col: c, row: r })
    cur = parent.get(cur)
  }
  return path
}

// ─── Соседние позиции для 2×2 токенов ──────────────────────────────────────

/**
 * Позиции (top-left sub-cell), из которых 2×2-герой кардинально касается 2×2-врага.
 * Два 2×2 блока «рядом», когда один индекс совпадает ±1 а другой = ±2.
 */
const ADJACENT_2x2 = [
  [-2, -1],
  [-2, 0],
  [-2, 1],
  [2, -1],
  [2, 0],
  [2, 1],
  [-1, -2],
  [0, -2],
  [1, -2],
  [-1, 2],
  [0, 2],
  [1, 2],
]

export { ADJACENT_2x2 }

export function buildAttackCells(token, placedTokens, walls) {
  if (token.tokenType !== 'hero') return new Set()

  const reachable = buildReachableCells(token, walls)

  const hostiles = placedTokens.filter((t) => isHostileNpcToken(t) && t.uid !== token.uid)
  if (!hostiles.length) return new Set()

  const attackCells = new Set()

  for (const enemy of hostiles) {
    for (const [dc, dr] of ADJACENT_2x2) {
      const key = `${enemy.col + dc},${enemy.row + dr}`
      if (reachable.has(key)) attackCells.add(key)
    }
  }

  return attackCells
}

export function buildTalkCells(token, placedTokens, walls) {
  if (token.tokenType !== 'hero') return new Set()

  const reachable = buildReachableCells(token, walls)

  const friendly = placedTokens.filter((t) => isTalkableNpcToken(t) && t.uid !== token.uid)
  if (!friendly.length) return new Set()

  const talkCells = new Set()

  for (const npc of friendly) {
    for (const [dc, dr] of ADJACENT_2x2) {
      const key = `${npc.col + dc},${npc.row + dr}`
      if (reachable.has(key)) talkCells.add(key)
    }
  }

  return talkCells
}
