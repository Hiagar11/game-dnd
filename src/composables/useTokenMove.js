// Константы и утилиты для зоны движения токена.
// Вынесены в отдельный файл, потому что используются в двух местах:
//   - useGridDraw.js  (рисует зелёные клетки)
//   - GameRangeOverlay.vue (определяет куда можно кликнуть для хода)

// Радиус зоны хода — в клетках
export const RANGE_RADIUS = 4

// 4 направления 4-связного BFS: влево, вправо, вверх, вниз
const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

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
export function buildReachableCells(token, walls, radius = RANGE_RADIUS, occupiedKeys = new Set()) {
  // Быстрый лукап стен: "col,row" → true
  const wallSet = new Set(walls.map((w) => `${w.col},${w.row}`))

  // Set всех достижимых клеток (не считая начальную позицию токена)
  const reachable = new Set()

  // BFS-очередь: [col, row, stepsLeft]
  // Используем массив как очередь (shift медленнее Map, но карта не огромная)
  const queue = [[token.col, token.row, radius]]
  // Посещённые клетки — чтобы не обрабатывать одну клетку дважды
  const visited = new Set([`${token.col},${token.row}`])

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

      // Пропускаем уже посещённые, клетки-стены и занятые токенами
      if (visited.has(key) || wallSet.has(key) || occupiedKeys.has(key) || nc < 0 || nr < 0)
        continue

      visited.add(key)
      queue.push([nc, nr, steps - 1])
    }
  }

  return reachable
}

/**
 * BFS с отслеживанием родителей — находит кратчайший маршрут от позиции токена
 * до целевой клетки с учётом стен и ограничения RANGE_RADIUS.
 *
 * Отличие от buildReachableCells: здесь мы запоминаем, «откуда пришли» в каждую
 * клетку (parent map), чтобы потом восстановить цепочку клеток — реальный путь.
 *
 * @param {{ col: number, row: number }} token — текущая позиция токена
 * @param {{ col: number, row: number }} target — целевая клетка
 * @param {Array<{ col: number, row: number }>} walls — стены из store
 * @returns {{ col: number, row: number }[]|null} — шаги пути (без стартовой клетки) или null
 */
export function findPath(token, target, walls, radius = RANGE_RADIUS, occupiedKeys = new Set()) {
  const wallSet = new Set(walls.map((w) => `${w.col},${w.row}`))
  const startKey = `${token.col},${token.row}`
  const goalKey = `${target.col},${target.row}`

  if (startKey === goalKey) return []

  // parent[key] = ключ клетки, из которой пришли (null у стартовой)
  const parent = new Map([[startKey, null]])
  // stepCount[key] = количество шагов от старта до этой клетки
  const stepCount = new Map([[startKey, 0]])
  const queue = [[token.col, token.row]]

  outer: while (queue.length) {
    const [col, row] = queue.shift()
    const key = `${col},${row}`
    const nextSteps = (stepCount.get(key) ?? 0) + 1

    // Дальше радиуса хода не идём
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

  // Цель недостижима (нет в parent) — возвращаем null
  if (!parent.has(goalKey)) return null

  // Восстанавливаем путь: идём от цели назад к старту, затем разворачиваем
  const path = []
  let cur = goalKey
  while (cur !== startKey) {
    const [c, r] = cur.split(',').map(Number)
    path.unshift({ col: c, row: r })
    cur = parent.get(cur)
  }
  return path
}

/**
 * Возвращает Set клеток "col,row", из которых герой может атаковать враждебного НПС.
 *
 * Условие атаки:
 *   1. Клетка входит в reachableCells — герой может туда дойти за один ход.
 *   2. Клетка непосредственно (4-связно) соседняя с враждебным НПС.
 *
 * Таким образом, герой подходит к врагу вплотную и занимает клетку рядом с ним.
 *
 * @param {{ col: number, row: number, tokenType: string }} token — выбранный токен
 * @param {Array} placedTokens — все токены на карте из game store
 * @param {Array} walls — стены из game store
 * @returns {Set<string>}
 */
export function buildAttackCells(token, placedTokens, walls) {
  // Атака доступна только для героев
  if (token.tokenType !== 'hero') return new Set()

  const reachable = buildReachableCells(token, walls)

  // Позиции всех враждебных НПС на карте
  const hostiles = placedTokens.filter(
    (t) => t.tokenType === 'npc' && t.attitude === 'hostile' && t.uid !== token.uid
  )
  if (!hostiles.length) return new Set()

  const attackCells = new Set()

  for (const enemy of hostiles) {
    for (const [dc, dr] of DIRS) {
      const key = `${enemy.col + dc},${enemy.row + dr}`
      // Клетка должна быть в зоне хода (и не совпадать с позицией самого НПС)
      if (reachable.has(key)) attackCells.add(key)
    }
  }

  return attackCells
}

/**
 * Возвращает Set клеток "col,row", из которых герой может поговорить с нейтральным/союзным НПС.
 *
 * Условие разговора (зеркально атаке):
 *   1. Клетка входит в reachableCells.
 *   2. Клетка непосредственно (4-связно) соседняя с нейтральным или союзным НПС.
 *   3. Клетка НЕ входит в attackCells — атака имеет приоритет.
 *
 * @param {{ col: number, row: number, tokenType: string }} token — выбранный токен
 * @param {Array} placedTokens — все токены на карте из game store
 * @param {Array} walls — стены из game store
 * @returns {Set<string>}
 */
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
