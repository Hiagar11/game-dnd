// Проверяет допустимость взаимодействия для отображения курсора и разрешения клика.
// Реальная достижимость (AP, занятые клетки, стены) проверяется в обработчиках действий.
import { getSelectedToken, isHeroToken, isHostileNpcToken } from '../utils/tokenFilters'

// 8 направлений: 4 стороны + 4 диагонали.
// Экспортируется — используется в GameTokens.vue для проверки смежных клеток.
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
  // Возвращает true, если НПС является допустимой целью (у игрока выбран герой).
  // Реальная достижимость — AP и путь — проверяется в самом обработчике клика.
  function isNpcReachable() {
    const sel = getSelectedToken(store.placedTokens, store.selectedPlacedUid)
    return !!(sel && !sel.systemToken && isHeroToken(sel))
  }

  // Возвращает true, если герой является допустимой целью атаки (выбран враждебный НПС).
  function isHeroReachableByNpc() {
    const sel = getSelectedToken(store.placedTokens, store.selectedPlacedUid)
    return !!(sel && !sel.systemToken && isHostileNpcToken(sel))
  }

  return { isNpcReachable, isHeroReachableByNpc }
}
