<template>
  <aside class="editor-sidebar">
    <router-link v-if="showBack" class="editor-sidebar__back" :to="{ name: 'menu' }"
      >← Меню</router-link
    >

    <div class="editor-sidebar__header">
      <span class="editor-sidebar__title">{{ title }}</span>
      <!-- <button class="editor-sidebar__new-btn" title="Создать новый" @click="$emit('create')">
        +
      </button> -->
    </div>

    <div class="editor-sidebar__list">
      <div v-for="s in scenarios" :key="s.id" class="editor-sidebar__item-wrap">
        <button
          class="editor-sidebar__item"
          :class="{ 'editor-sidebar__item--active': activeId === s.id }"
          @mouseenter="playHover"
          @click="onSelect(s)"
        >
          {{ s.name || 'Без названия' }}
        </button>
        <button
          class="editor-sidebar__item-del"
          title="Удалить"
          @mouseenter="playHover"
          @click="onDelete(s)"
        >
          ×
        </button>
      </div>
      <p v-if="!loading && !scenarios.length" class="editor-sidebar__empty">Нет загруженных карт</p>
    </div>
  </aside>
</template>

<script setup>
  import { useSound } from '../composables/useSound'

  defineProps({
    scenarios: { type: Array, required: true },
    loading: { type: Boolean, default: false },
    activeId: { type: String, default: null },
    title: { type: String, default: 'Карты' },
    showBack: { type: Boolean, default: false },
  })

  const emit = defineEmits(['select', 'create', 'delete'])

  const { playHover, playClick } = useSound()

  function onSelect(s) {
    emit('select', s)
    playClick()
  }

  function onDelete(s) {
    emit('delete', s)
    playClick()
  }
</script>

<style scoped>
  .editor-sidebar {
    width: 220px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-6);
    background: rgb(0 0 0 / 50%);
    border-right: 1px solid var(--color-border);
    overflow-y: auto;
  }

  .editor-sidebar__back {
    font-size: 13px;
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--color-primary);
    }
  }

  .editor-sidebar__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .editor-sidebar__title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
  }

  .editor-sidebar__new-btn {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      border-color var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  .editor-sidebar__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  /* Обёртка строки: кнопка выбора + кнопка удаления рядом */
  .editor-sidebar__item-wrap {
    display: flex;
    align-items: center;
    gap: var(--space-1);

    /* Кнопка удаления скрыта — появляется при наведении на строку */
    &:hover .editor-sidebar__item-del {
      opacity: 1;
    }
  }

  .editor-sidebar__item {
    /* flex: 1 чтобы кнопка выбора занимала всё доступное место */
    flex: 1;
    min-width: 0;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-text);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);

    &:hover {
      background: rgb(255 255 255 / 5%);
    }

    &--active {
      background: rgb(255 255 255 / 8%);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  /* Кнопка удаления — появляется при наведении на строку */
  .editor-sidebar__item-del {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    padding: 0;
    border-radius: var(--radius-sm);
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    transition:
      opacity var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      color: #e05555;
    }
  }

  .editor-sidebar__empty {
    font-size: 12px;
    color: var(--color-text-muted);
    text-align: center;
    padding: var(--space-4) 0;
  }
</style>
