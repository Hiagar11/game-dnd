// Composable для трансляции позиции курсора админа зрителям через сокет.
// Используется только в GameView.vue (только admin-роль).
//
// Координаты курсора передаются в ПРОСТРАНСТВЕ КАРТЫ (map pixels):
//   mapX = e.clientX - offsetX  — какой пиксель карты находится под курсором
// Зритель пересчитывает в экранные координаты: screenX = mapX + viewer.offsetX
// Это гарантирует одинаковую точку карты на любых разрешениях экрана.

import { onMounted, onUnmounted } from 'vue'

const THROTTLE_MS = 33 // ~30 fps
const MAX_ICON_SIZE = 256_000 // 256 KB в base64-символах

// offsetX/offsetY — реактивные рефы из useMapPan, передаются снаружи
export function useAdminCursor(getSocket, sessionActiveRef, offsetX, offsetY) {
  let lastEmit = 0

  function onMouseMove(e) {
    if (!sessionActiveRef.value) return
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

  return { setCursorIcon }
}
