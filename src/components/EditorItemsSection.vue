<template>
  <div class="editor-items">
    <div class="editor-items__layout">
      <!-- ─── Форма создания предмета ── -->
      <div class="editor-items__form-col">
        <h2 class="editor-items__heading">Создать предмет</h2>

        <form class="editor-items__form" @submit.prevent="onSubmit">
          <label class="editor-items__label">
            Название
            <input
              v-model.trim="form.name"
              type="text"
              class="editor-items__input"
              placeholder="Например: Длинный меч"
              maxlength="60"
              required
            />
          </label>

          <label class="editor-items__label">
            Тип
            <select v-model="form.type" class="editor-items__input">
              <option v-for="t in ITEM_TYPES" :key="t.value" :value="t.value">
                {{ t.label }}
              </option>
            </select>
          </label>

          <label class="editor-items__label">
            Иконка
            <IconPickerInput
              v-model="form.icon"
              placeholder="Начни печатать название: sword, poison…"
            />
          </label>

          <label class="editor-items__label">
            Описание
            <textarea
              v-model.trim="form.description"
              class="editor-items__textarea"
              placeholder="Краткое описание предмета и его эффектов"
              rows="3"
              maxlength="300"
            />
          </label>

          <button type="submit" class="editor-items__btn-add" :disabled="!form.name">
            + Добавить предмет
          </button>
        </form>
      </div>

      <!-- ─── Список созданных предметов ── -->
      <div class="editor-items__list-col">
        <h2 class="editor-items__heading">Предметы в игре ({{ store.items.length }})</h2>

        <p v-if="!store.items.length" class="editor-items__empty">
          Предметов пока нет. Создайте первый слева.
        </p>

        <div class="editor-items__list">
          <div v-for="item in store.items" :key="item.id" class="editor-items__card">
            <div class="editor-items__card-icon">
              <img
                v-if="item.icon"
                :src="gameIconUrl(item.icon)"
                class="editor-items__icon-img"
                :alt="item.name"
              />
              <span v-else class="editor-items__icon-placeholder">?</span>
            </div>

            <div class="editor-items__card-body">
              <span class="editor-items__card-name">{{ item.name }}</span>
              <span class="editor-items__card-type">{{ labelForType(item.type) }}</span>
              <span v-if="item.description" class="editor-items__card-desc">{{
                item.description
              }}</span>
            </div>

            <button
              class="editor-items__card-del"
              title="Удалить"
              @click="store.removeItem(item.id)"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import IconPickerInput from './IconPickerInput.vue'
  import { useItemsStore } from '../stores/items'

  const store = useItemsStore()

  const ITEM_TYPES = [
    { value: 'weapon', label: '⚔️ Оружие' },
    { value: 'armor', label: '🛡 Броня' },
    { value: 'potion', label: '🧪 Зелье' },
    { value: 'misc', label: '📦 Разное' },
  ]

  function labelForType(type) {
    return ITEM_TYPES.find((t) => t.value === type)?.label ?? type
  }

  // Formирует ссылку через Iconify API — поддерживает все 4000+ иконок game-icons.net
  function gameIconUrl(slug) {
    return `https://api.iconify.design/game-icons:${slug}.svg`
  }

  const form = ref({ name: '', type: 'weapon', icon: '', description: '' })

  function onSubmit() {
    store.addItem({ ...form.value })
    form.value = { name: '', type: 'weapon', icon: '', description: '' }
  }
</script>

<style scoped>
  .editor-items {
    padding: var(--space-6);
    height: 100%;
    overflow-y: auto;
  }

  .editor-items__layout {
    display: grid;
    grid-template-columns: 380px 1fr;
    gap: var(--space-8);
    align-items: flex-start;
  }

  .editor-items__heading {
    margin: 0 0 var(--space-4);
    font-family: var(--font-base);
    font-size: 18px;
    color: var(--color-primary);
  }

  /* ── Форма ── */

  .editor-items__form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .editor-items__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: 12px;
    font-family: var(--font-ui);
    color: var(--color-text-muted);
  }

  .editor-items__input {
    background: rgb(0 0 0 / 40%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-family: var(--font-ui);
    font-size: 14px;
    padding: var(--space-2) var(--space-3);
    outline: none;
    transition: border-color var(--transition-fast);

    &:focus {
      border-color: var(--color-primary);
    }
  }

  .editor-items__textarea {
    background: rgb(0 0 0 / 40%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-family: var(--font-ui);
    font-size: 14px;
    padding: var(--space-2) var(--space-3);
    outline: none;
    resize: vertical;
    transition: border-color var(--transition-fast);

    &:focus {
      border-color: var(--color-primary);
    }
  }

  .editor-items__icon-row {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .editor-items__icon-row .editor-items__input {
    flex: 1;
  }

  .editor-items__icon-preview {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    background: rgb(0 0 0 / 40%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .editor-items__icon-img {
    width: 28px;
    height: 28px;
    object-fit: contain;
    filter: invert(1) sepia(1) saturate(3) hue-rotate(5deg) brightness(0.9);
  }

  .editor-items__icon-placeholder {
    font-size: 18px;
    color: var(--color-text-muted);
  }

  .editor-items__hint {
    font-size: 11px;
    color: var(--color-text-muted);

    a {
      color: var(--color-primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .editor-items__btn-add {
    background: var(--color-primary);
    color: var(--color-on-primary);
    border: none;
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-6);
    font-family: var(--font-ui);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background var(--transition-fast);
    align-self: flex-start;

    &:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  /* ── Список карточек ── */

  .editor-items__list-col {
    min-width: 0;
  }

  .editor-items__empty {
    color: var(--color-text-muted);
    font-family: var(--font-ui);
    font-size: 14px;
  }

  .editor-items__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-height: 70vh;
    overflow-y: auto;
  }

  .editor-items__card {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    background: rgb(0 0 0 / 30%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);

    &:hover {
      border-color: rgb(200 154 74 / 40%);
    }
  }

  .editor-items__card-icon {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(0 0 0 / 30%);
    border-radius: var(--radius-sm);
  }

  .editor-items__card-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .editor-items__card-name {
    font-family: var(--font-ui);
    font-size: 14px;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .editor-items__card-type {
    font-size: 11px;
    color: var(--color-text-muted);
    font-family: var(--font-ui);
  }

  .editor-items__card-desc {
    font-size: 11px;
    color: var(--color-text-muted);
    font-family: var(--font-ui);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .editor-items__card-del {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 18px;
    cursor: pointer;
    padding: 0 var(--space-1);
    line-height: 1;
    transition: color var(--transition-fast);
    flex-shrink: 0;

    &:hover {
      color: var(--color-error);
    }
  }
</style>
