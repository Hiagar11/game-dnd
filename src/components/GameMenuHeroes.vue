<template>
  <!-- Вкладка «Герои» — персонажи игроков. Только admin видит кнопку «+». -->
  <div class="game-menu-heroes">
    <button
      class="game-menu-heroes__item game-menu-heroes__item--add"
      title="Добавить героя"
      @mouseenter="playHover"
      @click="onAddHero"
    >
      <span class="game-menu-heroes__add-icon">+</span>
    </button>

    <!--
      div-обёртка для каждого героя: position:relative — якорь для кнопки-крестика.
      Крестик появляется при наведении на обёртку через CSS.
    -->
    <div v-for="token in heroTokens" :key="token.id" class="game-menu-heroes__wrap">
      <button
        class="game-menu-heroes__item game-menu-heroes__item--hero"
        :class="{ 'game-menu-heroes__item--active': store.selectedToken?.id === token.id }"
        :title="token.name"
        draggable="false"
        @mouseenter="playHover"
        @click="onSelectHero(token)"
        @dragstart="onDragStart($event, token)"
      >
        <img :src="token.src" :alt="token.name" class="game-menu-heroes__img" draggable="true" />
      </button>
      <button
        class="game-menu-heroes__delete"
        title="Удалить героя"
        @mouseenter="playHover"
        @click="onDeleteHero(token)"
      >
        ✕
      </button>
    </div>
  </div>

  <GameTokenEditPopup :visible="isPopupOpen" token-type="hero" @close="onPopupClose" />
</template>

<script setup>
  import { ref, computed, onMounted, inject } from 'vue'
  import { useTokensStore } from '../stores/tokens'
  import { useTokenDrag } from '../composables/useTokenDrag'
  import { useSound } from '../composables/useSound'
  import { getHeroTokens } from '../utils/tokenFilters'
  import GameTokenEditPopup from './GameTokenEditPopup.vue'

  const store = useTokensStore()
  const { onDragStart } = useTokenDrag()
  const { playHover, playClick } = useSound()

  const isPopupOpen = ref(false)

  function onAddHero() {
    isPopupOpen.value = true
    playClick()
  }

  function onSelectHero(token) {
    store.selectToken(token.id)
    playClick()
  }

  const heroTokens = computed(() => getHeroTokens(store.tokens))

  // inject из GameView — явно шлёт heroes зрителям сразу после добавления.
  // Это надёжнее чем watch: срабатывает синхронно в callback popup.
  const emitHeroes = inject('emitHeroes', null)

  async function onDeleteHero(token) {
    if (!confirm(`Удалить героя «${token.name}»?`)) return
    playClick()
    try {
      await store.deleteToken(token.id)
      emitHeroes?.()
    } catch {
      // store.deleteToken пробрасывает ошибку — молча игнорируем в меню
    }
  }

  function onPopupClose() {
    isPopupOpen.value = false
    // После создания нового героя — немедленно синхронизируем зрителей.
    // nextTick не нужен: store.tokens уже обновлён к моменту закрытия попапа.
    emitHeroes?.()
  }

  onMounted(() => store.fetchTokens())
</script>

<style scoped>
  .game-menu-heroes {
    flex-grow: 1;
    padding: var(--space-2);
    background-image: url('/systemImage/panel-center.jpg');
    background-size: 340px;
    background-position: center;
    box-shadow:
      inset 15px 0 15px -5px var(--color-overlay-strong),
      inset -15px 0 15px -5px var(--color-overlay-strong);
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: var(--space-2);
    min-height: 0;
    overflow-y: auto;
  }

  .game-menu-heroes__item {
    position: relative;
    width: var(--token-size);
    height: var(--token-size);
    flex-shrink: 0;
    padding: 0;
    border: 2px solid rgb(255 255 255 / 40%);
    border-radius: var(--radius-full);
    background: var(--color-overlay);
    cursor: pointer;
    overflow: hidden;
    transition:
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);

    &:hover {
      border-color: rgb(255 255 255 / 70%);
    }

    &--hero {
      border-color: var(--color-primary);
      box-shadow: 0 0 8px var(--color-primary-glow);

      &:hover {
        box-shadow: 0 0 14px var(--color-primary-glow);
      }
    }

    &--active {
      border-color: var(--color-primary);
      box-shadow: 0 0 14px var(--color-primary-glow);
    }
  }

  .game-menu-heroes__item--add {
    border-style: dashed;
    border-color: rgb(255 255 255 / 30%);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    transition:
      border-color var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  .game-menu-heroes__add-icon {
    font-size: 28px;
    line-height: 1;
    user-select: none;
  }

  .game-menu-heroes__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* ── Обёртка токена-героя: якорь для кнопки удаления ────────────────────── */
  .game-menu-heroes__wrap {
    position: relative;
  }

  .game-menu-heroes__delete {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 18px;
    height: 18px;
    padding: 0;
    border-radius: var(--radius-full);
    background: rgb(80 0 0 / 90%);
    color: #fff;
    border: 1px solid rgb(160 0 0 / 80%);
    font-size: 9px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    z-index: 2;
    transition:
      opacity var(--transition-fast),
      background-color var(--transition-fast);

    &:hover {
      background-color: rgb(160 0 0);
    }
  }

  .game-menu-heroes__wrap:hover .game-menu-heroes__delete {
    opacity: 1;
  }
</style>
