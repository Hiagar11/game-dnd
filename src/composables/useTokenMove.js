// Константы и утилиты для зоны движения токена.
// Вынесены в отдельный файл, потому что используются в двух местах:
//   - useGridDraw.js  (рисует зелёные клетки)
//   - GameRangeOverlay.vue (определяет куда можно кликнуть для хода)

// Радиус зоны хода — в клетках
export const RANGE_RADIUS = 4

/**
 * Проверяет, попадает ли клетка (col, row) ЦЕЛИКОМ в круг радиуса RANGE_RADIUS
 * с центром в центре клетки токена.
 *
 * Алгоритм — «самый дальний угол»:
 * Берём максимальное расстояние от центра токена до любого из 4 углов клетки.
 * Если даже самый дальний угол ≤ RANGE_RADIUS — вся клетка внутри круга.
 *
 * @param {{ col: number, row: number }} token — позиция токена в сетке
 * @param {number} col — колонка проверяемой клетки
 * @param {number} row — строка проверяемой клетки
 * @returns {boolean}
 */
export function isInRange(token, col, row) {
  // Центр токена — середина его клетки (+0.5 в каждую сторону)
  const centerCol = token.col + 0.5
  const centerRow = token.row + 0.5

  const dx = Math.max(Math.abs(col - centerCol), Math.abs(col + 1 - centerCol))
  const dy = Math.max(Math.abs(row - centerRow), Math.abs(row + 1 - centerRow))

  return Math.sqrt(dx * dx + dy * dy) <= RANGE_RADIUS
}

/**
 * BFS от позиции токена с учётом стен.
 * Возвращает Set строк "col,row" — все клетки, достижимые
 * за ≤ RANGE_RADIUS шагов (4-связный обход, стены блокируют путь).
 *
 * Почему BFS, а не просто проверка расстояния:
 *   isInRange не знает про стены. BFS идёт «по клеткам» и не проходит
 *   сквозь стену, даже если цель геометрически близко.
 *
 * @param {{ col: number, row: number }} token — позиция токена
 * @param {Array<{ col: number, row: number }>} walls — массив стен из store
 * @returns {Set<string>}
 */
export function buildReachableCells(token, walls) {
  // Быстрый лукап стен: "col,row" → true
  const wallSet = new Set(walls.map((w) => `${w.col},${w.row}`))

  // Set всех достижимых клеток (не считая начальную позицию токена)
  const reachable = new Set()

  // BFS-очередь: [col, row, stepsLeft]
  // Используем массив как очередь (shift медленнее Map, но карта не огромная)
  const queue = [[token.col, token.row, RANGE_RADIUS]]
  // Посещённые клетки — чтобы не обрабатывать одну клетку дважды
  const visited = new Set([`${token.col},${token.row}`])

  // 4 направления: влево, вправо, вверх, вниз
  const DIRS = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]

  while (queue.length) {
    const [col, row, steps] = queue.shift()

    // Начальная клетка токена не красится (он уже там стоит)
    if (col !== token.col || row !== token.row) {
      reachable.add(`${col},${row}`)
    }

    // Шаги закончились — соседей не добавляем
    if (steps === 0) continue

    for (const [dc, dr] of DIRS) {
      const nc = col + dc
      const nr = row + dr
      const key = `${nc},${nr}`

      // Пропускаем уже посещённые и клетки-стены
      if (visited.has(key) || wallSet.has(key) || nc < 0 || nr < 0) continue

      visited.add(key)
      queue.push([nc, nr, steps - 1])
    }
  }

  return reachable
}
