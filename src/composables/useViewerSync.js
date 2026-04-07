// Composable для синхронизации состояния игры на стороне зрителя.
// Подписывается на socket-события и обновляет gameStore.
// Используется только в ViewerView.vue.

import { ref } from 'vue'
import { useGameStore } from '../stores/game'
import { SYSTEM_TOKENS } from '../constants/systemTokens'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function useViewerSync(socket) {
  // Позиция камеры — транслируется с устройства мастера
  const offsetX = ref(0)
  const offsetY = ref(0)

  // Колбэк, вызываемый при смене сценария (ViewerView перезагружает карту)
  let _onScenarioChange = null

  function onScenarioChange(cb) {
    _onScenarioChange = cb
  }

  // ── Подписка на события ────────────────────────────────────────────────────
  function attach() {
    // Мастер передвинул камеру
    socket.on('game:panned', ({ offsetX: x, offsetY: y }) => {
      offsetX.value = x
      offsetY.value = y
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
  }

  // ── Отписка (при размонтировании ViewerView) ──────────────────────────────
  function detach() {
    socket.off('game:panned')
    socket.off('game:scenario:changed')
    socket.off('token:moved')
    socket.off('token:removed')
    socket.off('token:placed')
    socket.off('token:hiddenChanged')
  }

  return { offsetX, offsetY, attach, detach, onScenarioChange }
}

// Подписывается на socket-события и обновляет gameStore.
// Используется только в ViewerView.vue.

import { ref } from 'vue'
import { useGameStore } from '../stores/game'
import { useTokensStore } from '../stores/tokens'
import { SYSTEM_TOKENS } from '../constants/systemTokens'

export function useViewerSync(socket) {
  // Позиция камеры — транслируется с устройства мастера
  const offsetX = ref(0)
  const offsetY = ref(0)

  // Колбэк, вызываемый при смене сценария (ViewerView перезагружает карту)
  let _onScenarioChange = null

  function onScenarioChange(cb) {
    _onScenarioChange = cb
  }

  // ── Подписка на события ────────────────────────────────────────────────────
  function attach() {
    // Мастер передвинул камеру
    socket.on('game:panned', ({ offsetX: x, offsetY: y }) => {
      offsetX.value = x
      offsetY.value = y
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

    // Токен размещён (дроп мастером во время игры)
    socket.on('token:placed', ({ uid, tokenId, systemToken, col, row, hidden }) => {
      if (hidden) return // игроки не видят скрытые токены

      const gameStore = useGameStore()
      const tokensStore = useTokensStore()

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

      const id = String(tokenId)
      const def = tokensStore.tokens.find((t) => t.id === id)
      if (!def) return

      gameStore.placedTokens.push({
        uid,
        tokenId: id,
        col,
        row,
        hidden: false,
        name: def.name,
        src: def.src,
        meleeDmg: def.meleeDmg ?? 0,
        rangedDmg: def.rangedDmg ?? 0,
        visionRange: def.visionRange ?? 0,
        defense: def.defense ?? 0,
        evasion: def.evasion ?? 0,
      })
    })

    // Скрытость токена изменилась
    socket.on('token:hiddenChanged', ({ uid, hidden }) => {
      const gameStore = useGameStore()
      if (hidden) {
        // Скрыт мастером — убираем из поля зрения
        const idx = gameStore.placedTokens.findIndex((t) => t.uid === uid)
        if (idx !== -1) gameStore.placedTokens.splice(idx, 1)
      }
      // Если hidden: false — токен был ранее невидим игрокам, теперь his данные
      // придут только при следующей синхронизации (game:session:join или re-join).
      // Полная поддержка reveal — в следующем итерации.
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
  }

  return { offsetX, offsetY, attach, detach, onScenarioChange }
}
