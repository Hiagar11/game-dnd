<script setup>
  import { ref, computed } from 'vue'
  import {
    PhSkull,
    PhHandshake,
    PhCircleDashed,
    PhGearSix,
    PhShieldStar,
  } from '@phosphor-icons/vue'
  import GameMenuIcon from './GameMenuIcon.vue'
  import GameMenuTokenList from './GameMenuTokenList.vue'
  import GameMenuSystem from './GameMenuSystem.vue'
  import GameMenuSelectedToken from './GameMenuSelectedToken.vue'
  import GameEndTurnButton from './GameEndTurnButton.vue'
  import { useGameStore } from '../stores/game'
  import { useSound } from '../composables/useSound'
  import { isNonSystemToken, getSelectedToken } from '../utils/tokenFilters'

  // Активная вкладка: 'hostile' | 'neutral' | 'friendly' | 'system' | 'heroes'
  // В режиме сценария (редактирование дверей) — только 'system'
  const props = defineProps({
    editorMode: { type: Boolean, default: false },
    // scenarioMode: true — открыто из редактора сценариев (только системные токены)
    scenarioMode: { type: Boolean, default: false },
  })
  const activeTab = ref(props.scenarioMode ? 'system' : 'neutral')
  const { playHover, playClick } = useSound()
  const gameStore = useGameStore()

  // Токен выбран на карте (не системный) — в этом случае прячем вкладки и списки
  const hasSelectedToken = computed(() => {
    const t = getSelectedToken(gameStore.placedTokens, gameStore.selectedPlacedUid)
    return isNonSystemToken(t)
  })

  function setTab(tab) {
    activeTab.value = tab
    playClick()
  }
</script>

<template>
  <aside class="game-menu">
    <GameMenuIcon />

    <div class="game-menu__center" :class="{ 'game-menu__center--token': hasSelectedToken }">
      <template v-if="hasSelectedToken">
        <GameMenuSelectedToken />
        <div class="game-menu__perks" />
      </template>

      <div v-else class="game-menu__tab-area">
        <nav class="game-menu__tabs">
          <!-- В режиме сценария (двери) показываем только системную вкладку -->
          <template v-if="!scenarioMode">
            <button
              class="game-menu__tab game-menu__tab--hostile"
              :class="{ 'game-menu__tab--active': activeTab === 'hostile' }"
              @mouseenter="playHover"
              @click="setTab('hostile')"
            >
              <PhSkull :size="13" />
              Враги
            </button>
            <button
              class="game-menu__tab game-menu__tab--neutral"
              :class="{ 'game-menu__tab--active': activeTab === 'neutral' }"
              @mouseenter="playHover"
              @click="setTab('neutral')"
            >
              <PhCircleDashed :size="13" />
              Нейтралы
            </button>
            <button
              class="game-menu__tab game-menu__tab--friendly"
              :class="{ 'game-menu__tab--active': activeTab === 'friendly' }"
              @mouseenter="playHover"
              @click="setTab('friendly')"
            >
              <PhHandshake :size="13" />
              Союзники
            </button>
          </template>
          <button
            class="game-menu__tab"
            :class="{ 'game-menu__tab--active': activeTab === 'system' }"
            @mouseenter="playHover"
            @click="setTab('system')"
          >
            <PhGearSix :size="13" />
            Системные
          </button>
          <button
            v-if="!scenarioMode"
            class="game-menu__tab"
            :class="{ 'game-menu__tab--active': activeTab === 'heroes' }"
            @mouseenter="playHover"
            @click="setTab('heroes')"
          >
            <PhShieldStar :size="13" />
            Герои
          </button>
        </nav>

        <template v-if="!scenarioMode">
          <GameMenuTokenList v-if="activeTab === 'hostile'" token-type="npc" attitude="hostile" />
          <GameMenuTokenList
            v-else-if="activeTab === 'neutral'"
            token-type="npc"
            attitude="neutral"
          />
          <GameMenuTokenList
            v-else-if="activeTab === 'friendly'"
            token-type="npc"
            attitude="friendly"
          />
          <GameMenuSystem v-else-if="activeTab === 'system'" :editor-mode="editorMode" />
          <GameMenuTokenList v-else token-type="hero" />
        </template>
        <!-- В режиме сценария всегда показываем системные токены -->
        <GameMenuSystem v-else :editor-mode="editorMode" />
      </div>
    </div>

    <div class="game-menu__actions">
      <GameEndTurnButton v-if="!editorMode" />
      <slot name="right-panel" />
    </div>
  </aside>
</template>

<style lang="scss" scoped src="../assets/styles/components/gameMenu.scss"></style>
