import { useGameStore } from '../stores/game'
import { useTokensStore } from '../stores/tokens'
import { useSocket } from './useSocket'
import { useSound } from './useSound'

export function useTokenEditDeps() {
  const store = useGameStore()
  const tokensStore = useTokensStore()
  const { getSocket } = useSocket()
  const { playHover, playClick } = useSound()

  return {
    store,
    tokensStore,
    getSocket,
    playHover,
    playClick,
  }
}
