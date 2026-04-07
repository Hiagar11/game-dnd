<template>
  <!-- Панель токенов: одна и та же карточка для NPC и Героев.
       tokenType='npc'  — обычные NPC, белая рамка по умолчанию
       tokenType='hero' — герои, золотая рамка всегда -->
  <div class="game-menu-token-list">
    <button
      class="game-menu-token-list__item game-menu-token-list__item--add"
      :title="tokenType === 'hero' ? 'Добавить героя' : 'Добавить NPC'"
      @mouseenter="playHover"
      @click="onAdd"
    >
      <span class="game-menu-token-list__add-icon">+</span>
    </button>

    <div v-for="token in filteredTokens" :key="token.id" class="game-menu-token-list__wrap">
      <button
        class="game-menu-token-list__item"
        :class="{
          'game-menu-token-list__item--hero': tokenType === 'hero',
          'game-menu-token-list__item--active': store.selectedToken?.id === token.id,
        }"
        :title="token.name"
        draggable="false"
        @mouseenter="playHover"
        @click="onSelect(token)"
        @dragstart="onDragStart($event, token)"
      >
        <img
          :src="token.src"
          :alt="token.name"
          class="game-menu-token-list__img"
          draggable="true"
        />
      </button>
      <button
        class="game-menu-token-list__delete"
        :title="`Удалить ${tokenType === 'hero' ? 'героя' : 'токен'}`"
        @mouseenter="playHover"
        @click="onDelete(token)"
      >
        ✕
      </button>
    </div>
  </div>

  <GameTokenEditPopup :visible="isPopupOpen" :token-type="tokenType" @close="onPopupClose" />
</template>

<script setup>
  import { ref, computed, onMounted, inject } from 'vue'
  import { useTokensStore } from '../stores/tokens'
  import { useTokenDrag } from '../composables/useTokenDrag'
  import { useSound } from '../composables/useSound'
  import GameTokenEditPopup from './GameTokenEditPopup.vue'

  const props = defineProps({
    tokenType: {
      type: String,
      default: 'npc',
      validator: (v) => ['npc', 'hero'].includes(v),
    },
  })

  const store = useTokensStore()
  const { onDragStart } = useTokenDrag()
  const { playHover, playClick } = useSound()

  const isPopupOpen = ref(false)

  // inject из GameView — явно шлёт heroes зрителям после изменений.
  // null-fallback: компонент работает и вне GameView (например в редакторе).
  const emitHeroes = inject('emitHeroes', null)

  const filteredTokens = computed(() =>
    props.tokenType === 'hero'
      ? store.tokens.filter((t) => t.tokenType === 'hero')
      : store.tokens.filter((t) => t.tokenType !== 'hero')
  )

  function onAdd() {
    isPopupOpen.value = true
    playClick()
  }

  function onSelect(token) {
    store.selectToken(token.id)
    playClick()
  }

  function onPopupClose() {
    isPopupOpen.value = false
    // После создания нового героя немедленно синхронизируем зрителей.
    if (props.tokenType === 'hero') emitHeroes?.()
  }

  async function onDelete(token) {
    const label = props.tokenType === 'hero' ? 'героя' : 'шаблон'
    if (!confirm(`Удалить ${label} «${token.name}»?`)) return
    playClick()
    try {
      await store.deleteToken(token.id)
      if (props.tokenType === 'hero') emitHeroes?.()
    } catch {
      // store.deleteToken пробрасывает ошибку — молча игнорируем в меню
    }
  }

  onMounted(() => store.fetchTokens())
</script>

<style scoped lang="scss">
  .game-menu-token-list {
    @include menu-panel-content;
  }

  .game-menu-token-list__item {
    @include menu-token-item;

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

  .game-menu-token-list__item--add {
    @include menu-token-add-btn;
  }

  .game-menu-token-list__add-icon {
    font-size: 28px;
    line-height: 1;
    user-select: none;
  }

  .game-menu-token-list__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .game-menu-token-list__wrap {
    position: relative;
  }

  .game-menu-token-list__delete {
    @include menu-token-delete-btn;
  }

  .game-menu-token-list__wrap:hover .game-menu-token-list__delete {
    opacity: 1;
  }
</style>
