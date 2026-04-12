import { computed, provide, watch } from 'vue'
import { getHeroTokens } from '../utils/tokenFilters'

export function useHeroBroadcast({ tokensStore, sessionActive, getSocket }) {
  const heroTokens = computed(() => getHeroTokens(tokensStore.tokens))

  function emitHeroes() {
    if (!sessionActive.value) return
    getSocket()?.emit('game:heroes:set', { heroes: heroTokens.value })
  }

  provide('emitHeroes', emitHeroes)
  watch(heroTokens, emitHeroes)

  return {
    emitHeroes,
  }
}
