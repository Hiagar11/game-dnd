// Composable для синхронизации состояния игры на стороне зрителя.
// Подписывается на socket-события и обновляет gameStore.
// Используется только в ViewerView.vue.

import { ref } from 'vue'
import { useGameStore } from '../stores/game'
import { useHeroesStore } from '../stores/heroes'
import { SYSTEM_TOKENS } from '../constants/systemTokens'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function useViewerSync(socket) {
  // Позиция камеры — транслируется с устройства мастера
  const offsetX = ref(0)
  const offsetY = ref(0)

  // Позиция курсора мастера в координатах КАРТЫ (map pixels).
  // null = курсор вне окна (скрыть).
  // Зритель конвертирует в экранные: screenX = cursorMapX + offsetX
  const cursorMapX = ref(null)
  const cursorMapY = ref(null)
  // Data URL или '' = использовать дефолтную иконку
  const cursorIconUrl = ref('')

  // Список токенов-героев, транслируемый мастером зрителям.
  // Хранится в heroesStore — тот же store доступен ViewerMenu для отображения.
  const heroesStore = useHeroesStore()

  // Колбэк, вызываемый при смене сценария (ViewerView перезагружает карту)
  let _onScenarioChange = null

  function onScenarioChange(cb) {
    _onScenarioChange = cb
  }

  // ── Подписка на события ────────────────────────────────────────────────────
  function attach() {
    // Мастер передвинул камеру.
    // mapCenterX/Y — пиксель карты, видимый в центре экрана мастера.
    // Пересчитываем в offset под размер экрана зрителя: offset = viewW/2 - mapCenter.
    socket.on('game:panned', ({ mapCenterX, mapCenterY }) => {
      offsetX.value = window.innerWidth / 2 - mapCenterX
      offsetY.value = window.innerHeight / 2 - mapCenterY
    })

    // Мастер перешёл в другой сценарий (через дверь)
    socket.on('game:scenario:changed', ({ scenarioId }) => {
      _onScenarioChange?.(scenarioId)
    })

    // ── Токены ────────────────────────────────────────────────────────────────
    socket.on('token:moved', ({ uid, col, row }) => {
      useGameStore().moveToken(uid, col, row)
    })

    socket.on('token:removed', ({ uid }) => {
      useGameStore().removeToken(uid)
    })

    // Размещение нового токена мастером во время игры.
    // Серверный broadcast включает tokenName + tokenImagePath — не нужен tokensStore.
    socket.on(
      'token:placed',
      ({ uid, tokenId, systemToken, col, row, hidden, tokenName, tokenImagePath }) => {
        if (hidden) return // игроки не видят скрытые токены

        const gameStore = useGameStore()

        if (systemToken) {
          const def = SYSTEM_TOKENS.find((t) => t.id === systemToken)
          if (!def) return
          gameStore.placedTokens.push({
            uid,
            tokenId: null,
            systemToken,
            col,
            row,
            hidden: false,
            name: def.name,
            src: def.src,
            meleeDmg: 0,
            rangedDmg: 0,
            visionRange: 0,
            defense: 0,
            evasion: 0,
          })
          return
        }

        const src = tokenImagePath ? `${API}/${tokenImagePath}` : ''
        gameStore.placedTokens.push({
          uid,
          tokenId: tokenId ? String(tokenId) : null,
          col,
          row,
          hidden: false,
          name: tokenName ?? 'Неизвестный',
          src,
          meleeDmg: 0,
          rangedDmg: 0,
          visionRange: 0,
          defense: 0,
          evasion: 0,
        })
      }
    )

    // Скрытость токена изменилась — убираем из поля зрения игрока при скрытии
    socket.on('token:hiddenChanged', ({ uid, hidden }) => {
      if (hidden) {
        const idx = useGameStore().placedTokens.findIndex((t) => t.uid === uid)
        if (idx !== -1) useGameStore().placedTokens.splice(idx, 1)
      }
    })

    // Курсор мастера: обновление позиции (map-координаты)
    socket.on('game:cursor', ({ mapX, mapY }) => {
      cursorMapX.value = mapX ?? null
      cursorMapY.value = mapY ?? null
    })

    // Курсор мастера: обновление иконки
    socket.on('game:cursor:icon', ({ iconDataUrl }) => {
      cursorIconUrl.value = iconDataUrl ?? ''
    })

    // Список героев обновлён мастером
    socket.on('game:heroes:updated', ({ heroes }) => {
      heroesStore.setHeroes(heroes)
    })
  }

  // ── Отписка (при размонтировании ViewerView) ──────────────────────────────
  function detach() {
    socket.off('game:panned')
    socket.off('game:scenario:changed')
    socket.off('token:moved')
    socket.off('token:removed')
    socket.off('token:placed')
    socket.off('token:hiddenChanged')
    socket.off('game:cursor')
    socket.off('game:cursor:icon')
    socket.off('game:heroes:updated')
  }

  return {
    offsetX,
    offsetY,
    cursorMapX,
    cursorMapY,
    cursorIconUrl,
    attach,
    detach,
    onScenarioChange,
  }
}
