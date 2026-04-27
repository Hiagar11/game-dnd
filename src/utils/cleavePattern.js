const DEFAULT_DIRECTION = 'n'

const DIRECTION_PATTERNS = {
  n: [
    { dc: -2, dr: -2 },
    { dc: 0, dr: -2 },
    { dc: 2, dr: -2 },
  ],
  ne: [
    { dc: 0, dr: -2 },
    { dc: 2, dr: -2 },
    { dc: 2, dr: 0 },
  ],
  e: [
    { dc: 2, dr: -2 },
    { dc: 2, dr: 0 },
    { dc: 2, dr: 2 },
  ],
  se: [
    { dc: 2, dr: 0 },
    { dc: 2, dr: 2 },
    { dc: 0, dr: 2 },
  ],
  s: [
    { dc: -2, dr: 2 },
    { dc: 0, dr: 2 },
    { dc: 2, dr: 2 },
  ],
  sw: [
    { dc: -2, dr: 0 },
    { dc: -2, dr: 2 },
    { dc: 0, dr: 2 },
  ],
  w: [
    { dc: -2, dr: -2 },
    { dc: -2, dr: 0 },
    { dc: -2, dr: 2 },
  ],
  nw: [
    { dc: 0, dr: -2 },
    { dc: -2, dr: -2 },
    { dc: -2, dr: 0 },
  ],
}

function getDirectionByAngleDeg(angleDeg) {
  if (angleDeg > -22.5 && angleDeg <= 22.5) return 'e'
  if (angleDeg > 22.5 && angleDeg <= 67.5) return 'se'
  if (angleDeg > 67.5 && angleDeg <= 112.5) return 's'
  if (angleDeg > 112.5 && angleDeg <= 157.5) return 'sw'
  if (angleDeg > 157.5 || angleDeg <= -157.5) return 'w'
  if (angleDeg > -157.5 && angleDeg <= -112.5) return 'nw'
  if (angleDeg > -112.5 && angleDeg <= -67.5) return 'n'
  return 'ne'
}

export function resolveCleavePatternByPointer(caster, pointerCell) {
  if (!caster || pointerCell?.col == null || pointerCell?.row == null) {
    return DIRECTION_PATTERNS[DEFAULT_DIRECTION]
  }

  const centerCol = (caster.col ?? 0) + 1
  const centerRow = (caster.row ?? 0) + 1
  const dx = pointerCell.col - centerCol
  const dy = pointerCell.row - centerRow

  if (dx === 0 && dy === 0) return DIRECTION_PATTERNS[DEFAULT_DIRECTION]

  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  const direction = getDirectionByAngleDeg(angleDeg)
  return DIRECTION_PATTERNS[direction] ?? DIRECTION_PATTERNS[DEFAULT_DIRECTION]
}

export function buildCleaveCells(caster, pointerCell) {
  const baseCol = caster?.col ?? 0
  const baseRow = caster?.row ?? 0
  const pattern = resolveCleavePatternByPointer(caster, pointerCell)
  return pattern.map(({ dc, dr }) => ({ col: baseCol + dc, row: baseRow + dr }))
}
