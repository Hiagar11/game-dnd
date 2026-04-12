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
                  crossorigin="anonymous"
                  alt=""
                />
                <span>{{ trait.name }}</span>
              </button>
            </div>
          </div>

          <!-- Категория -->
          <div class="editor-items__label">
            Категория
            <FilterPills v-model="form.category" :options="CATEGORIES" aria-label="Категория" />
          </div>

          <button type="submit" class="editor-items__btn-add" :disabled="!form.name">
            + Добавить предмет
          </button>
        </form>
      </div>

      <!-- Список созданных предметов -->
      <div class="editor-items__list-col">
        <h2 class="editor-items__heading">Предметы ({{ filteredItems.length }})</h2>

        <div class="editor-items__filters">
          <FilterPills
            v-model="filterCat"
            :options="FILTER_OPTIONS"
            aria-label="Фильтр предметов"
          />
        </div>

        <p v-if="!filteredItems.length" class="editor-items__empty">
          {{
            store.items.length
              ? 'Нет предметов этой категории.'
              : 'Предметов пока нет. Создайте первый слева.'
          }}
        </p>

        <div class="editor-items__list">
          <div v-for="item in filteredItems" :key="item.id" class="editor-items__card">
            <div class="editor-items__card-icon">
              <img
                v-if="item.icon"
                :src="gameIconUrl(item.icon)"
                class="editor-items__icon-img"
                :alt="item.name"
                crossorigin="anonymous"
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
                    crossorigin="anonymous"
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
  import IconPickerInput from './IconPickerInput.vue'
  import FilterPills from './ui/FilterPills.vue'
  import { useItemsStore } from '../stores/items'
  import { useTraitsStore } from '../stores/traits'
  import { ITEM_CATEGORIES } from '../constants/itemEditorOptions'
  import { useItemEditor } from '../composables/useItemEditor'

  const CATEGORIES = ITEM_CATEGORIES

  const store = useItemsStore()
  const traitsStore = useTraitsStore()

  const {
    form,
    filterCategory: filterCat,
    filterOptions: FILTER_OPTIONS,
    filteredItems,
    gameIconUrl,
    traitById,
    toggleTrait,
    onSubmit,
  } = useItemEditor({ itemsStore: store, traitsStore })
</script>

<style scoped src="../assets/styles/components/editorItemsSection.scss"></style>
