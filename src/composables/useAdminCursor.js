// Composable для трансляции позиции курсора админа зрителям через сокет.
// Используется только в GameView.vue (только admin-роль).
//
// Координаты курсора передаются в ПРОСТРАНСТВЕ КАРТЫ (map pixels):
//   mapX = e.clientX - offsetX  — какой пиксель карты находится под курсором
// Зритель пересчитывает в экранные координаты: screenX = mapX + viewer.offsetX
// Это гарантирует одинаковую точку карты на любых разрешениях экрана.

import { watch, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { getSelectedToken, isHeroToken } from '../utils/tokenFilters'

const THROTTLE_MS = 33 // ~30 fps
const MAX_ICON_SIZE = 256_000 // 256 KB в base64-символах

// offsetX/offsetY — реактивные рефы из useMapPan, передаются снаружи
export function useAdminCursor(getSocket, sessionActiveRef, offsetX, offsetY) {
  const gameStore = useGameStore()

  // Курсор виден зрителям только пока выбран токен-герой.
  // Проверяем: selectedPlacedUid → placedToken → tokenType === 'hero'
  const isHeroSelected = computed(() => {
    const placed = getSelectedToken(gameStore.placedTokens, gameStore.selectedPlacedUid)
    return isHeroToken(placed)
  })

  // Когда герой снят с выбора — сразу прячем курсор у зрителей (не ждём движения мыши)
  watch(isHeroSelected, (val) => {
    if (!val && sessionActiveRef.value) {
      getSocket()?.emit('game:cursor', { mapX: null, mapY: null })
    }
  })

  // При любом изменении выбранного токена — сообщаем зрителям uid.
  // Зрители показывают выделение на нужном токене.
  watch(
    () => gameStore.selectedPlacedUid,
    (uid) => {
      if (!sessionActiveRef.value) return
      getSocket()?.emit('game:token:select', { uid: uid ?? null })
    }
  )

  let lastEmit = 0
  // Когда мастер находится над своим меню или открыт попап — позицию курсора не шлём
  let menuActive = false
  let popupBlocked = false

  function onMouseMove(e) {
    if (!sessionActiveRef.value) return
    // Курсор шлём только когда выбран токен-герой
    if (!isHeroSelected.value) return
    if (menuActive || popupBlocked) return
    const now = Date.now()
    if (now - lastEmit < THROTTLE_MS) return
    lastEmit = now
    // Переводим экранные координаты в координаты карты.
    // offsetX — сдвиг карты: если карта сдвинута на 100px вправо (offsetX=100),
    // то курсор на экране в позиции 0 смотрит на пиксель карты -100.
    getSocket()?.emit('game:cursor', {
      mapX: e.clientX - offsetX.value,
      mapY: e.clientY - offsetY.value,
    })
  }

  // null — сигнал «скрыть курсор» у зрителей
  function onMouseLeave() {
    if (!sessionActiveRef.value) return
    getSocket()?.emit('game:cursor', { mapX: null, mapY: null })
  }

  // Мастер навёл на своё меню — прячем курсор у зрителей на последней позиции
  function onMenuEnter() {
    menuActive = true
    onMouseLeave()
  }

  // Мастер вернулся на карту — возобновляем передачу позиции
  function onMenuLeave() {
    menuActive = false
  }

  // Попап открылся — прячем курсор у зрителей пока попап открыт
  function blockCursor() {
    popupBlocked = true
    onMouseLeave()
  }

  // Попап закрылся — снимаем блокировку
  function unblockCursor() {
    popupBlocked = false
  }

  // Отправляет Data URL (base64) выбранной иконки курсора всем зрителям.
  // Вызывается один раз при смене иконки — не при каждом движении мыши.
  function setCursorIcon(dataUrl) {
    if (dataUrl && dataUrl.length > MAX_ICON_SIZE) {
      console.warn('[useAdminCursor] Иконка слишком большая (>256 КБ), сжмите изображение')
      return
    }
    getSocket()?.emit('game:cursor:icon', { iconDataUrl: dataUrl ?? null })
  }

  onMounted(() => {
    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseleave', onMouseLeave)
  })

  return { setCursorIcon, onMenuEnter, onMenuLeave, blockCursor, unblockCursor }
}
