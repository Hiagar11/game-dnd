export const RANGE_RADIUS = 4

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

export function isInRange(token, col, row) {
  const centerCol = token.col + 0.5
  const centerRow = token.row + 0.5

  const dx = Math.max(Math.abs(col - centerCol), Math.abs(col + 1 - centerCol))
  const dy = Math.max(Math.abs(row - centerRow), Math.abs(row + 1 - centerRow))

  return Math.sqrt(dx * dx + dy * dy) <= RANGE_RADIUS
}

export function buildReachableCells(token, walls, radius = RANGE_RADIUS, occupiedKeys = new Set()) {
  const wallSet = new Set(walls.map((w) => `${w.col},${w.row}`))

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

      if (visited.has(key) || wallSet.has(key) || occupiedKeys.has(key) || nc < 0 || nr < 0)
        continue

      visited.add(key)
      queue.push([nc, nr, steps - 1])
    }
  }

  return reachable
}

export function findPath(token, target, walls, radius = RANGE_RADIUS, occupiedKeys = new Set()) {
  const wallSet = new Set(walls.map((w) => `${w.col},${w.row}`))
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

      if (parent.has(nkey) || wallSet.has(nkey) || occupiedKeys.has(nkey) || nc < 0 || nr < 0)
        continue

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

export function buildAttackCells(token, placedTokens, walls) {
  if (token.tokenType !== 'hero') return new Set()

  const reachable = buildReachableCells(token, walls)

  const hostiles = placedTokens.filter(
    (t) => t.tokenType === 'npc' && t.attitude === 'hostile' && t.uid !== token.uid
  )
  if (!hostiles.length) return new Set()

  const attackCells = new Set()

  for (const enemy of hostiles) {
    for (const [dc, dr] of DIRS) {
      const key = `${enemy.col + dc},${enemy.row + dr}`
      if (reachable.has(key)) attackCells.add(key)
    }
  }

  return attackCells
}

export function buildTalkCells(token, placedTokens, walls) {
  if (token.tokenType !== 'hero') return new Set()

  const reachable = buildReachableCells(token, walls)

  const friendly = placedTokens.filter(
    (t) =>
      t.tokenType === 'npc' &&
      (t.attitude === 'neutral' || t.attitude === 'friendly') &&
      t.uid !== token.uid
  )
  if (!friendly.length) return new Set()

  const talkCells = new Set()

  for (const npc of friendly) {
    for (const [dc, dr] of DIRS) {
      const key = `${npc.col + dc},${npc.row + dr}`
      if (reachable.has(key)) talkCells.add(key)
    }
  }

  return talkCells
}
