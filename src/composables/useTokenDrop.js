// Composable для обработки сброса токена на карту.
// Используется в GameView: вешается на @dragover и @drop на viewRef.
//
// offsetX, offsetY — реактивные смещения карты (из useMapPan).
// Нужны чтобы пересчитать viewport-координаты курсора в координаты на карте.

import { useGameStore } from '../stores/game'
import { useSocket } from './useSocket'
import { getCurrentScenarioId } from '../utils/scenario'

export function useTokenDrop(offsetX, offsetY) {
  function getDropCell(e) {
    const store = useGameStore()
    const mapX = e.clientX - offsetX.value
    const mapY = e.clientY - offsetY.value
    const hc = store.halfCell
    const col = Math.floor((mapX - store.gridNormOX) / hc)
    const row = Math.floor((mapY - store.gridNormOY) / hc)
    return { col, row }
  }

  function onDragOver(e) {
    // Проверяем что тянут токен (обычный или системный), а не файл из ОС или текст
    const hasToken =
      e.dataTransfer.types.includes('tokenid') ||
      e.dataTransfer.types.includes('systemtoken') ||
      e.dataTransfer.types.includes('placeduid')
    if (!hasToken) return
    e.preventDefault()
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes('placeduid') ? 'move' : 'copy'

    const store = useGameStore()
    const { col, row } = getDropCell(e)
    if (col >= 0 && row >= 0) {
      const halfSize = e.dataTransfer.types.includes('halfsize')
      const quarterSize = e.dataTransfer.types.includes('quartersize')
      store.setDropPreviewCell({ col, row, halfSize, quarterSize })
    } else {
      store.setDropPreviewCell(null)
    }
  }

  function onDragLeave() {
    useGameStore().setDropPreviewCell(null)
  }

  function onDrop(e) {
    e.preventDefault()

    const store = useGameStore()
    const { getSocket } = useSocket()

    store.setDropPreviewCell(null)

    const { col, row } = getDropCell(e)
    if (col < 0 || row < 0) return

    const scenarioId = getCurrentScenarioId(store)

    // Перемещение уже размещённого контейнера (drag с карты)
    const placedUid = e.dataTransfer.getData('placedUid')
    if (placedUid) {
      store.moveToken(placedUid, col, row)
      if (scenarioId) {
        getSocket()?.emit('token:move', { scenarioId, uid: placedUid, col, row })
      }
      return
    }

    // Сначала проверяем системный токен — у него свой action
    const systemToken = e.dataTransfer.getData('systemToken')
    if (systemToken) {
      const uid = store.placeSystemToken(systemToken, col, row)
      // Транслируем размещение зрителям через сокет
      if (uid && scenarioId) {
        getSocket()?.emit('token:place', { scenarioId, systemToken, uid, col, row, hidden: false })
      }
      return
    }

    const tokenId = e.dataTransfer.getData('tokenId')
    if (tokenId) {
      const uid = store.placeToken(tokenId, col, row)
      // Транслируем размещение зрителям через сокет
      if (uid && scenarioId) {
        getSocket()?.emit('token:place', { scenarioId, tokenId, uid, col, row, hidden: false })
      }
    }
  }

  return { onDragOver, onDragLeave, onDrop }
}
