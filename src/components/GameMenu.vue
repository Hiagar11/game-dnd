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
    const t = gameStore.placedTokens.find((p) => p.uid === gameStore.selectedPlacedUid)
    return !!(t && !t.systemToken)
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

<style lang="scss" scoped>
  .game-menu {
    position: fixed;
    bottom: 0;
    z-index: var(--z-menu);
    inline-size: 100%;
    block-size: var(--menu-height);
    background-color: var(--color-overlay);
    display: flex;
    animation: menu-slide-in var(--menu-animation-duration) ease-out var(--menu-animation-delay)
      both;

    /* Центральная часть: выступает вверх наравне с боковыми панелями */
    &__center {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      block-size: calc(100% + var(--menu-overflow));
      margin-block-start: calc(-1 * var(--menu-overflow));

      /* Когда выбран токен: 4/12 инфо + 8/12 пустой фон для перков, центр на 30px ниже боковых панелей */
      &--token {
        display: grid;
        grid-template-columns: calc(100% / 12 * 4) 1fr;
        grid-template-rows: 1fr;
        margin-block-start: calc(-1 * var(--menu-overflow) + 30px);
        block-size: calc(100% + var(--menu-overflow) - 30px);
      }
    }

    /* Область табов и списков */
    &__tab-area {
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
      flex: 1;
    }

    /* Пустая область для будущих перков */
    &__perks {
      background-image: url('/systemImage/panel-center.jpg');
      background-size: cover;
      background-position: center;
    }

    /* Полоса вкладок — ровно на высоту выступа, кнопки прижаты к низу */
    &__tabs {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      padding: 0 4px;
      block-size: var(--menu-overflow);
      background-color: transparent;
      flex-shrink: 0;
    }

    &__tab {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 14px;
      border: 1px solid rgb(255 255 255 / 20%);
      border-bottom: none;
      border-radius: 6px 6px 0 0;
      background-image: url('/systemImage/panel-center.jpg');
      background-size: cover;
      color: var(--color-text-muted);
      font-size: 11px;
      font-family: var(--font-ui);
      letter-spacing: 0.04em;
      cursor: pointer;
      transition:
        background var(--transition-fast),
        color var(--transition-fast);

      &:hover {
        background-image: url('/systemImage/panel-side.jpg');
        background-position: center;
        color: var(--color-text);
      }

      &--active {
        background-image: url('/systemImage/panel-side.jpg');
        background-position: center;
        color: var(--color-text);
        border-color: rgb(255 255 255 / 35%);
      }

      /* Цветовые акценты вкладок по отношению */
      &--hostile:hover,
      &--hostile#{&}--active {
        color: rgb(248 113 113);
        border-color: rgb(248 113 113 / 50%);
      }

      &--neutral:hover,
      &--neutral#{&}--active {
        color: rgb(96 165 250);
        border-color: rgb(96 165 250 / 50%);
      }

      &--friendly:hover,
      &--friendly#{&}--active {
        color: rgb(74 222 128);
        border-color: rgb(74 222 128 / 50%);
      }
    }

    &__actions {
      inline-size: var(--menu-side-width);
      block-size: calc(100% + var(--menu-overflow));
      margin-block-start: calc(-1 * var(--menu-overflow));
      background-image: url('/systemImage/panel-side.jpg');
      background-size: cover;
      background-position: bottom;
      border-top-left-radius: var(--menu-side-radius);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 14px;
    }
  }
</style>
