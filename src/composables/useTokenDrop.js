// Composable для обработки сброса токена на карту.
// Используется в GameView: вешается на @dragover и @drop на viewRef.
//
// offsetX, offsetY — реактивные смещения карты (из useMapPan).
// Нужны чтобы пересчитать viewport-координаты курсора в координаты на карте.

import { useGameStore } from '../stores/game'

export function useTokenDrop(offsetX, offsetY) {
  // dragover должен вызывать preventDefault() — иначе drop не сработает.
  // Это браузерное поведение: по умолчанию drop запрещён везде.
  function onDragOver(e) {
    // Проверяем что тянут именно токен, а не файл из ОС или текст
    if (!e.dataTransfer.types.includes('tokenid')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function onDrop(e) {
    e.preventDefault()

    const tokenId = e.dataTransfer.getData('tokenId')
    if (!tokenId) return

    // Стор вызывается здесь, а не на верхнем уровне модуля —
    // к моменту drop Pinia гарантированно инициализирована через app.use().
    const store = useGameStore()

    // Пересчёт координат:
    // viewRef занимает весь экран (0, 0) → (100vw, 100dvh).
    // Карта сдвинута на (offsetX, offsetY) трансформом.
    // Значит координаты на карте = координаты на экране − смещение карты.
    const mapX = e.clientX - offsetX.value
    const mapY = e.clientY - offsetY.value

    // Определяем ячейку: делим координату на размер ячейки и округляем вниз.
    const col = Math.floor(mapX / store.cellSize)
    const row = Math.floor(mapY / store.cellSize)

    // Отбрасываем сброс за пределы карты
    if (col < 0 || row < 0) return

    store.placeToken(tokenId, col, row)
  }

  return { onDragOver, onDrop }
}
