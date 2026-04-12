import { provide } from 'vue'
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

  return {
    onMenuEnter,
    onMenuLeave,
  }
}
