import { provide, ref } from 'vue'
import { useAdminCursor } from './useAdminCursor'

export function useGameViewProviders({ getSocket, sessionActive, offsetX, offsetY }) {
  const { setCursorIcon, onMenuEnter, onMenuLeave, blockCursor, unblockCursor } = useAdminCursor(
    getSocket,
    sessionActive,
    offsetX,
    offsetY
  )

  provide('setCursorIcon', setCursorIcon)
  provide('blockCursor', blockCursor)
  provide('unblockCursor', unblockCursor)
  provide('offsetX', offsetX)
  provide('offsetY', offsetY)

  // Общие ref для передачи кликов по токенам из GameRangeOverlay в GameTokens.
  // GameTokens регистрирует обработчики, GameRangeOverlay вызывает их.
  const overlayTokenClick = ref(null)
  provide('overlayTokenClick', overlayTokenClick)

  const overlayTokenContextMenu = ref(null)
  provide('overlayTokenContextMenu', overlayTokenContextMenu)

  return {
    onMenuEnter,
    onMenuLeave,
  }
}
