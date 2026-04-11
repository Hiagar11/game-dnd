<template>
  <Transition name="tracker">
    <div v-if="store.combatMode" class="combat-tracker">
      <!-- Бейдж: режим + раунд -->
      <div class="combat-tracker__badge">
        <svg
          class="combat-tracker__sword-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 256 256"
          fill="currentColor"
        >
          <path
            d="M229.66,26.34a8,8,0,0,0-11.32,0L196,48.69l-9.37-9.37a8,8,0,0,0-11.32,11.32L184.69,59.9,163,81.56,115.32,33.86A8,8,0,0,0,104,33.86L33.86,104a8,8,0,0,0,0,11.32L81.56,163,59.9,184.69,50.34,175.13A8,8,0,0,0,39,186.45L17,208.81A8,8,0,0,0,28.34,220.14L50.69,198l9.37,9.37a8,8,0,0,0,11.32-11.32L62.1,186.69l21.66-21.66,47.67,47.67a8,8,0,0,0,11.32,0L213.1,133a8,8,0,0,0,0-11.32L166,74.63l21.66-21.66,9.37,9.37a8,8,0,0,0,11.32-11.32L199,41.69l30.66-30.66A8,8,0,0,0,229.66,26.34ZM137.37,214.1,115.71,192.44l11.32-11.32a8,8,0,0,0-11.32-11.32L104.39,181.12,82,158.73,110.34,130.4l22,22a8,8,0,0,0,11.32-11.32l-22-22L128,112.72l22,22a8,8,0,0,0,11.32-11.32l-22-22L145.6,95.1l58.3,58.3Z"
          />
        </svg>
        <span class="combat-tracker__mode-label">БОЙ</span>
        <span class="combat-tracker__round">· раунд {{ store.combatRound }}</span>
      </div>

      <!-- Список инициативы -->
      <div ref="listRef" class="combat-tracker__list">
        <TransitionGroup name="entry">
          <div
            v-for="(entry, i) in store.initiativeOrder"
            :key="entry.uid"
            ref="itemRefs"
            class="combat-tracker__item"
            :class="{
              'combat-tracker__item--current': i === store.currentInitiativeIndex,
              'combat-tracker__item--hero': entry.tokenType === 'hero',
              'combat-tracker__item--hostile':
                entry.tokenType === 'npc' && entry.attitude === 'hostile',
            }"
          >
            <!-- Метка инициативы -->
            <span class="combat-tracker__init">{{ entry.initiative }}</span>
            <!-- Аватар -->
            <img class="combat-tracker__avatar" :src="entry.src" :alt="entry.name" />
            <!-- Имя токена -->
            <span class="combat-tracker__name">{{ entry.name }}</span>
            <!-- Стрелка текущего хода -->
            <span v-if="i === store.currentInitiativeIndex" class="combat-tracker__arrow">▶</span>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </Transition>
</template>

<script setup>
  import { ref, watch, nextTick } from 'vue'
  import { useGameStore } from '../stores/game'

  const store = useGameStore()
  const listRef = ref(null)
  const itemRefs = ref([])

  // Прокрутить список к текущему участнику при смене хода
  watch(
    () => store.currentInitiativeIndex,
    async () => {
      await nextTick()
      const items = listRef.value?.querySelectorAll('.combat-tracker__item')
      if (items?.[store.currentInitiativeIndex]) {
        items[store.currentInitiativeIndex].scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        })
      }
    }
  )
</script>

<style scoped>
  .combat-tracker {
    position: fixed;
    bottom: calc(var(--menu-height) + 10px);
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-menu);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px 6px 8px;
    background: linear-gradient(135deg, rgb(20 10 4 / 96%), rgb(40 20 6 / 96%));
    border: 1px solid rgb(180 100 30 / 45%);
    border-radius: 10px;
    box-shadow:
      0 0 0 1px rgb(0 0 0 / 60%),
      0 6px 30px rgb(0 0 0 / 70%),
      inset 0 1px 0 rgb(255 180 60 / 10%);
    backdrop-filter: blur(4px);
    max-width: calc(100vw - 80px);
    pointer-events: none;
  }

  /* ── Бейдж режима ─────────────────────────────────────────────────────────── */
  .combat-tracker__badge {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    color: rgb(220 120 40);
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .combat-tracker__sword-icon {
    flex-shrink: 0;
    opacity: 0.9;
  }

  .combat-tracker__round {
    color: rgb(200 150 60 / 70%);
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  /* ── Список ──────────────────────────────────────────────────────────────── */
  .combat-tracker__list {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    scroll-behavior: smooth;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  /* ── Элемент инициативы ──────────────────────────────────────────────────── */
  .combat-tracker__item {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px 3px 4px;
    border-radius: 6px;
    border: 1px solid transparent;
    transition:
      border-color 0.25s,
      background 0.25s,
      box-shadow 0.25s;
    flex-shrink: 0;

    /* Герой — золотая рамка */
    &--hero {
      border-color: rgb(200 160 50 / 30%);
    }

    /* Враг — красная рамка */
    &--hostile {
      border-color: rgb(200 60 60 / 30%);
    }

    /* Текущий ход — яркая подсветка */
    &--current {
      background: rgb(255 200 60 / 10%);
      border-color: rgb(220 160 50 / 70%);
      box-shadow: 0 0 10px rgb(220 140 30 / 25%);

      &.combat-tracker__item--hostile {
        background: rgb(220 60 60 / 12%);
        border-color: rgb(220 80 60 / 70%);
        box-shadow: 0 0 10px rgb(200 60 60 / 25%);
      }

      .combat-tracker__init {
        color: rgb(240 180 50);
      }

      .combat-tracker__name {
        color: rgb(255 230 160);
      }
    }
  }

  .combat-tracker__init {
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 800;
    color: rgb(160 120 50 / 80%);
    min-width: 14px;
    text-align: center;
  }

  .combat-tracker__avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
    background: rgb(0 0 0 / 40%);
    border: 1px solid rgb(255 255 255 / 10%);
  }

  .combat-tracker__name {
    font-family: var(--font-ui);
    font-size: 10px;
    color: rgb(180 160 130);
    white-space: nowrap;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .combat-tracker__arrow {
    font-size: 8px;
    color: rgb(240 180 50);
    margin-left: 2px;
    animation: arrow-pulse 1s ease-in-out infinite;
  }

  @keyframes arrow-pulse {
    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0.3;
    }
  }

  /* ── Анимации входа/выхода трекера ─────────────────────────────────────── */
  .tracker-enter-active,
  .tracker-leave-active {
    transition:
      opacity 0.4s ease,
      transform 0.4s ease;
  }

  .tracker-enter-from,
  .tracker-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(12px);
  }

  /* ── Анимации элементов списка (вылет при побеге врага) ─────────────────── */
  .entry-leave-active {
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;
  }

  .entry-leave-to {
    opacity: 0;
    transform: scale(0.8) translateX(-10px);
  }
</style>
