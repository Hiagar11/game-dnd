// Проверяет допустимость взаимодействия для отображения курсора и разрешения клика.
// Реальная достижимость (AP, занятые клетки, стены) проверяется в обработчиках действий.
import { getSelectedToken, isHostileNpcToken } from '../utils/tokenFilters'

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
  // Возвращает true, если НПС является допустимой целью для выбранного токена.
  // Работает для любого не-системного токена в фокусе (герой или НПС).
  // Реальная достижимость — AP и путь — проверяется в самом обработчике клика.
  function isNpcReachable() {
    const sel = getSelectedToken(store.placedTokens, store.selectedPlacedUid)
    return !!(sel && !sel.systemToken)
  }

  // Возвращает true, если герой является допустимой целью атаки (выбран враждебный НПС).
  function isHeroReachableByNpc() {
    const sel = getSelectedToken(store.placedTokens, store.selectedPlacedUid)
    return !!(sel && !sel.systemToken && isHostileNpcToken(sel))
  }

  return { isNpcReachable, isHeroReachableByNpc }
}
