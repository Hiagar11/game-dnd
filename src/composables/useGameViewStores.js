import { useAuthStore } from '../stores/auth'
import { useGameStore } from '../stores/game'
import { useTokensStore } from '../stores/tokens'
import { useScenariosStore } from '../stores/scenarios'
import { useCampaignsStore } from '../stores/campaigns'
import { useGameSessionsStore } from '../stores/gameSessions'

export function useGameViewStores() {
  return {
    auth: useAuthStore(),
    gameStore: useGameStore(),
    tokensStore: useTokensStore(),
    scenariosStore: useScenariosStore(),
    campaignsStore: useCampaignsStore(),
    gameSessionsStore: useGameSessionsStore(),
  }
}
