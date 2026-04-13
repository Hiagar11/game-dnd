/**
 * Находит ближайшую свободную суб-клетку рядом с токеном для сброса предмета.
 * Токен занимает 2×2 суб-клетки: (col, col+1) × (row, row+1).
 * Ищем первую свободную клетку из кольца соседей вокруг токена.
 *
 * @param {number} tokenCol — левый столбец токена (sub-cell)
 * @param {number} tokenRow — верхняя строка токена (sub-cell)
 * @param {{ col: number, row: number }[]} occupiedCells — уже занятые клетки (другие кучки и т.д.)
 * @returns {{ col: number, row: number }}
 */
export function findDropCell(tokenCol, tokenRow, occupiedCells = []) {
  const occupied = new Set(occupiedCells.map((c) => `${c.col},${c.row}`))

  // Кандидаты — кольцо вокруг 2×2 блока токена (12 клеток), по часовой стрелке
  const ring = [
    { col: tokenCol - 1, row: tokenRow - 1 },
    { col: tokenCol, row: tokenRow - 1 },
    { col: tokenCol + 1, row: tokenRow - 1 },
    { col: tokenCol + 2, row: tokenRow - 1 },
    { col: tokenCol + 2, row: tokenRow },
    { col: tokenCol + 2, row: tokenRow + 1 },
    { col: tokenCol + 2, row: tokenRow + 2 },
    { col: tokenCol + 1, row: tokenRow + 2 },
    { col: tokenCol, row: tokenRow + 2 },
    { col: tokenCol - 1, row: tokenRow + 2 },
    { col: tokenCol - 1, row: tokenRow + 1 },
    { col: tokenCol - 1, row: tokenRow },
  ]

  return ring.find((c) => !occupied.has(`${c.col},${c.row}`)) ?? ring[0]
}
