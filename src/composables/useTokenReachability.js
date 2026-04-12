// Зоны достижимости токенов на карте.
// Вынесено из GameTokens.vue: вычисляет heroReachable / npcReachable
// и функции проверки для клика-атаки и клика-разговора.
import { computed } from 'vue'
import { buildReachableCells } from './useTokenMove'
import { getSelectedToken, isHeroToken } from '../utils/tokenFilters'

// 8 направлений: 4 стороны + 4 диагонали.
// Экспортируется, т.к. используется в GameTokens.vue для проверки смежных клеток.
export const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]

export function useTokenReachability(store) {
  // Клетки в зоне достижимости выбранного героя — нужны для определения курсора над НПС
  const heroReachable = computed(() => {
    const sel = getSelectedToken(store.placedTokens, store.selectedPlacedUid)
    if (!sel || sel.systemToken || !isHeroToken(sel)) return new Set()
    const ap = sel.actionPoints ?? 0
    if (ap <= 0) return new Set()
    const occupied = new Set(
      store.placedTokens.filter((t) => t.uid !== sel.uid).map((t) => `${t.col},${t.row}`)
    )
    return buildReachableCells(sel, store.walls, ap, occupied)
  })

  // Клетки в зоне достижимости выбранного враждебного НПС — для курсора над героями
  const npcReachable = computed(() => {
    const sel = getSelectedToken(store.placedTokens, store.selectedPlacedUid)
    if (!sel || sel.systemToken || sel.tokenType !== 'npc' || sel.attitude !== 'hostile')
      return new Set()
    const ap = sel.actionPoints ?? 0
    if (ap <= 0) return new Set()
    const occupied = new Set(
      store.placedTokens.filter((t) => t.uid !== sel.uid).map((t) => `${t.col},${t.row}`)
    )
    return buildReachableCells(sel, store.walls, ap, occupied)
  })

  // Проверяет, есть ли хотя бы одна соседняя клетка НПС в зоне достижимости героя
  function isNpcReachable(placed) {
    const r = heroReachable.value
    if (!r.size) return false
    return DIRS.some(([dc, dr]) => r.has(`${placed.col + dc},${placed.row + dr}`))
  }

  // Проверяет, находится ли герой в зоне достижимости выбранного НПС
  function isHeroReachableByNpc(placed) {
    if (!npcReachable.value.size) return false
    return DIRS.some(([dc, dr]) => npcReachable.value.has(`${placed.col + dc},${placed.row + dr}`))
  }

  return { heroReachable, npcReachable, isNpcReachable, isHeroReachableByNpc }
}
