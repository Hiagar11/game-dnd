<template>
  <div class="editor-items">
    <div class="editor-items__layout">
      <!-- Форма создания предмета -->
      <div class="editor-items__form-col">
        <h2 class="editor-items__heading">Создать предмет</h2>

        <form class="editor-items__form" @submit.prevent="onSubmit">
          <!-- Иконка + название в одну строку -->
          <div class="editor-items__name-row">
            <IconPickerInput
              v-model="form.icon"
              class="editor-items__icon-picker"
              placeholder="Иконка..."
            />
            <input
              v-model.trim="form.name"
              type="text"
              class="editor-items__input editor-items__name-input"
              placeholder="Название предмета"
              maxlength="60"
              required
            />
          </div>

          <!-- Выбор свойств -->
          <div class="editor-items__label">
            Свойства предмета
            <p v-if="!traitsStore.traits.length" class="editor-items__traits-empty">
              Сначала создайте свойства во вкладке «Создание свойств».
            </p>
            <div v-else class="editor-items__traits-grid">
              <button
                v-for="trait in traitsStore.traits"
                :key="trait.id"
                type="button"
                class="editor-items__trait-chip"
                :class="{ 'editor-items__trait-chip--selected': form.traitIds.includes(trait.id) }"
                @click="toggleTrait(trait.id)"
              >
                <img
                  v-if="trait.icon"
                  :src="gameIconUrl(trait.icon)"
                  class="editor-items__trait-chip-icon"
                  alt=""
                />
                <span>{{ trait.name }}</span>
              </button>
            </div>
          </div>

          <button type="submit" class="editor-items__btn-add" :disabled="!form.name">
            + Добавить предмет
          </button>
        </form>
      </div>

      <!-- Список созданных предметов -->
      <div class="editor-items__list-col">
        <h2 class="editor-items__heading">Предметы ({{ store.items.length }})</h2>

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
              <div class="editor-items__card-traits">
                <span
                  v-for="traitId in item.traitIds"
                  :key="traitId"
                  class="editor-items__card-trait"
                >
                  <img
                    v-if="traitById(traitId)?.icon"
                    :src="gameIconUrl(traitById(traitId).icon)"
                    class="editor-items__card-trait-icon"
                    alt=""
                  />
                  {{ traitById(traitId)?.name ?? '?' }}
                </span>
                <span v-if="!item.traitIds?.length" class="editor-items__card-no-traits">
                  без свойств
                </span>
              </div>
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
  import { useTraitsStore } from '../stores/traits'

  const store = useItemsStore()
  const traitsStore = useTraitsStore()

  function gameIconUrl(slug) {
    return `https://api.iconify.design/game-icons:${slug}.svg`
  }

  function traitById(id) {
    return traitsStore.traits.find((t) => t.id === id)
  }

  const form = ref({ name: '', icon: '', traitIds: [] })

  function toggleTrait(id) {
    const idx = form.value.traitIds.indexOf(id)
    if (idx === -1) {
      form.value.traitIds.push(id)
    } else {
      form.value.traitIds.splice(idx, 1)
    }
  }

  function onSubmit() {
    store.addItem({ ...form.value, traitIds: [...form.value.traitIds] })
    form.value = { name: '', icon: '', traitIds: [] }
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
    grid-template-columns: 400px 1fr;
    gap: var(--space-8);
    align-items: flex-start;
  }

  .editor-items__heading {
    margin: 0 0 var(--space-4);
    font-family: var(--font-base);
    font-size: 18px;
    color: var(--color-primary);
  }

  .editor-items__form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .editor-items__name-row {
    display: flex;
    gap: var(--space-2);
    align-items: flex-start;
  }

  .editor-items__icon-picker {
    width: 180px;
    flex-shrink: 0;
  }

  .editor-items__name-input {
    flex: 1;
    height: 40px;
  }

  .editor-items__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
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
  }

  .editor-items__input:focus {
    border-color: var(--color-primary);
  }

  .editor-items__traits-empty {
    margin: 0;
    font-size: 12px;
    color: var(--color-text-muted);
    font-family: var(--font-ui);
  }

  .editor-items__traits-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .editor-items__trait-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgb(0 0 0 / 35%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-family: var(--font-ui);
    font-size: 12px;
    padding: 4px 8px;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast),
      color var(--transition-fast);
  }

  .editor-items__trait-chip:hover {
    border-color: #557;
    color: var(--color-text);
  }

  .editor-items__trait-chip--selected {
    background: rgb(200 154 74 / 15%);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .editor-items__trait-chip-icon {
    width: 16px;
    height: 16px;
    object-fit: contain;
    filter: invert(1) sepia(1) saturate(3) hue-rotate(5deg) brightness(0.9);
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
  }

  .editor-items__btn-add:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .editor-items__btn-add:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

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
    align-items: flex-start;
    gap: var(--space-3);
    background: rgb(0 0 0 / 30%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    transition: border-color var(--transition-fast);
  }

  .editor-items__card:hover {
    border-color: rgb(200 154 74 / 40%);
  }

  .editor-items__card-icon {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(0 0 0 / 30%);
    border-radius: var(--radius-sm);
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

  .editor-items__card-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
    min-width: 0;
  }

  .editor-items__card-name {
    font-family: var(--font-ui);
    font-size: 14px;
    color: var(--color-text);
  }

  .editor-items__card-traits {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .editor-items__card-trait {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgb(200 154 74 / 10%);
    border: 1px solid rgb(200 154 74 / 30%);
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--color-primary);
    padding: 2px 6px;
  }

  .editor-items__card-trait-icon {
    width: 13px;
    height: 13px;
    object-fit: contain;
    filter: invert(1) sepia(1) saturate(3) hue-rotate(5deg) brightness(0.9);
  }

  .editor-items__card-no-traits {
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--color-text-muted);
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
  }

  .editor-items__card-del:hover {
    color: var(--color-error);
  }
</style>
