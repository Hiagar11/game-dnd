// Singleton-стейт тумана войны — разделяется между GameFog.vue и GameTokens.vue.
// Работает как useSound.js: переменные на уровне модуля, не пересоздаются при
// повторном вызове useFogVisibility().
//
// GameFog.vue — единственный хозяин данных:
//   1. При монтировании вызывает resetVisited() (сброс при смене сценария).
//   2. В watch(currentCells) вызывает addVisitedCells() — пишет в Set.
// GameTokens.vue — только читает: берёт visitedNotCurrentSet для скрытия токенов.

import { ref, computed } from 'vue'
import { useGameStore } from '../stores/game'
import { useTokensStore } from '../stores/tokens'
import { useHeroesStore } from '../stores/heroes'
import { RANGE_RADIUS } from './useTokenMove'
import { getHeroTokens } from '../utils/tokenFilters'

const REVEAL_RADIUS = RANGE_RADIUS + 2

// ─── Модульный уровень (singleton) ───────────────────────────────────────────
// Vue не отслеживает мутации Set, поэтому используем счётчик-триггер:
// любой watch/computed, обращающийся к visitedVersion.value, будет
// пересчитываться при каждом вызове addVisitedCells / resetVisited.
const visitedCells = new Set()
const visitedVersion = ref(0)

/**
 * Supercover DDA — трассирует луч от центра клетки героя до целевой клетки.
 * Возвращает true если путь свободен (или цель сама является стеной),
 * и false если есть промежуточная стена между героем и целью.
 *
 * Стены в радиусе видны автоматически: когда buildFogCells проверяет
 * traceRay(hero, wallCell) — луч доходит до стены первым, возвращает true,
 * стена добавляется в видимые. Клетки ЗА стеной скрыты, т.к. промежуточная
 * стена блокирует луч к ним и функция возвращает false.
 *
 * Особый случай — луч проходит точно через угол (thr === 0):
 *   Если оба соседних ортогональных блока — стены, луч заблокирован (false).
 *   Если хотя бы один открыт — луч проходит в щель.
 *
 * @param {number} hCol — колонка героя
 * @param {number} hRow — строка героя
 * @param {number} tCol — колонка цели
 * @param {number} tRow — строка цели
 * @param {Set<string>} wallSet — Set «col,row» (запятая)
 * @returns {boolean}
 */
function traceRay(hCol, hRow, tCol, tRow, wallSet) {
  if (hCol === tCol && hRow === tRow) return true

  const dx = tCol - hCol
  const dy = tRow - hRow
  const nx = Math.abs(dx)
  const ny = Math.abs(dy)
  const signX = dx > 0 ? 1 : -1
  const signY = dy > 0 ? 1 : -1

  let col = hCol
  let row = hRow

  for (let ix = 0, iy = 0; ix < nx || iy < ny; ) {
    // thr < 0  → следующий шаг по X
    // thr > 0  → следующий шаг по Y
    // thr === 0 → луч проходит точно через угол, шаг диагональный
    const thr = (1 + 2 * ix) * ny - (1 + 2 * iy) * nx

    if (thr === 0) {
      // Луч касается угла между четырьмя клетками.
      // Блокируем только если ОБЕ ортогональные клетки — стены.
      const wallH = wallSet.has(`${col + signX},${row}`)
      const wallV = wallSet.has(`${col},${row + signY}`)
      if (wallH && wallV) return false
      col += signX
      row += signY
      ix++
      iy++
    } else if (thr < 0) {
      col += signX
      ix++
    } else {
      row += signY
      iy++
    }

    // Достигли цели раньше, чем встретили промежуточную стену — путь свободен.
    // Если цель сама является стеной, то при следующей проверке wallSet
    // это будет обнаружено, но мы уже вернули true выше.
    if (col === tCol && row === tRow) return true
    // Промежуточная стена — цель за ней скрыта.
    if (wallSet.has(`${col},${row}`)) return false
  }

  return true
}

/**
 * Определяет зону видимости героя через лучевую трассировку (ray casting).
 * Для каждой клетки в радиусе REVEAL_RADIUS пускается луч из героя.
 *
 * Стены видны автоматически: луч к клетке-стене доходит до неё свободно
 * (нет ничего перед ней) → стена добавляется в visible. Клетки ЗА стеной
 * скрыты: луч к ним упирается в промежуточную стену → traceRay возвращает false.
 *
 * @param {{ col: number, row: number }} hero — позиция героя
 * @param {Set<string>} wallSet — Set «col,row» (запятая) для O(1) поиска
 * @returns {Set<string>} — ключи «col:row» видимых клеток (включая стены в радиусе)
 */
function buildFogCells(hero, wallSet) {
  const cells = new Set()

  for (let dc = -REVEAL_RADIUS; dc <= REVEAL_RADIUS; dc++) {
    for (let dr = -REVEAL_RADIUS; dr <= REVEAL_RADIUS; dr++) {
      // Отсекаем клетки вне радиуса (круговая форма)
      if (Math.sqrt(dc * dc + dr * dr) > REVEAL_RADIUS) continue

      const tc = hero.col + dc
      const tr = hero.row + dr
      if (tc < 0 || tr < 0) continue

      if (traceRay(hero.col, hero.row, tc, tr, wallSet)) {
        cells.add(`${tc}:${tr}`)
      }
    }
  }

  return cells
}

export function useFogVisibility() {
  const gameStore = useGameStore()
  const tokensStore = useTokensStore()
  const heroesStore = useHeroesStore()

  // ─── Текущая зона видимости ─────────────────────────────────────────────
  // Множество ключей «col:row», освещённых героями прямо сейчас.
  // Источник hero ID: tokensStore (мастер) + heroesStore (зритель).
  // На стороне зрителя tokensStore пуст — heroesStore заполняется через сокет.
  const currentCells = computed(() => {
    const heroIds = new Set([
      ...getHeroTokens(tokensStore.tokens).map((t) => t.id),
      ...heroesStore.heroes.map((t) => t.id),
    ])

    // Строим Set стен заранее — O(1) для каждой проверки внутри BFS
    const wallSet = new Set(gameStore.walls.map((w) => `${w.col},${w.row}`))

    const cells = new Set()

    for (const pt of gameStore.placedTokens) {
      if (!heroIds.has(pt.tokenId)) continue

      // BFS от каждого героя — добавляем все видимые клетки в общий результат
      for (const key of buildFogCells(pt, wallSet)) {
        cells.add(key)
      }
    }

    return cells
  })

  // ─── Список клеток для dim-overlay (GameFog: v-for rect) ────────────────
  // Массив «col:row» — посещённые, но герой уже ушёл.
  const visitedNotCurrentList = computed(() => {
    visitedVersion.value // зависимость от счётчика
    const curr = currentCells.value
    return [...visitedCells].filter((key) => !curr.has(key))
  })

  // ─── Set клеток для быстрой проверки (GameTokens: .has()) ──────────────
  // Set нужен, т.к. O(1) для .has() — важно при рендере каждого токена.
  const visitedNotCurrentSet = computed(() => {
    visitedVersion.value
    const curr = currentCells.value
    const result = new Set()
    for (const key of visitedCells) {
      if (!curr.has(key)) result.add(key)
    }
    return result
  })

  // ─── SVG-путь для fog-mask (GameFog: fog GIF маска) ─────────────────────
  // Единый <path> вместо N <rect> — минимум DOM-узлов.
  const visitedPath = computed(() => {
    visitedVersion.value

    if (visitedCells.size === 0) return ''

    const hc = gameStore.halfCell
    const ox = gameStore.gridNormOX
    const oy = gameStore.gridNormOY
    let d = ''

    for (const key of visitedCells) {
      const col = parseInt(key.split(':')[0], 10)
      const row = parseInt(key.split(':')[1], 10)
      d += `M${col * hc + ox},${row * hc + oy}h${hc}v${hc}h${-hc}Z`
    }

    return d
  })

  // Размытие границ тумана (~70% от cellSize ≈ переход шириной 1 клетку)
  const blurRadius = computed(() => Math.round(gameStore.cellSize * 0.7))

  // ─── Вспомогательные функции ─────────────────────────────────────────────
  function getCol(key) {
    return parseInt(key.split(':')[0], 10)
  }

  function getRow(key) {
    return parseInt(key.split(':')[1], 10)
  }

  // Добавляет новые клетки в историю посещений.
  // Вызывается из GameFog.vue → watch(currentCells).
  function addVisitedCells(cells) {
    let changed = false
    for (const key of cells) {
      if (!visitedCells.has(key)) {
        visitedCells.add(key)
        changed = true
      }
    }
    if (changed) visitedVersion.value++
  }

  // Полный сброс истории — вызывается из GameFog.vue → onMounted.
  // Гарантирует чистое состояние при переходе в другой сценарий.
  function resetVisited() {
    visitedCells.clear()
    visitedVersion.value++
  }

  return {
    currentCells,
    visitedNotCurrentList,
    visitedNotCurrentSet,
    visitedPath,
    blurRadius,
    getCol,
    getRow,
    addVisitedCells,
    resetVisited,
  }
}
