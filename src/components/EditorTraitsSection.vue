<template>
  <div class="editor-traits">
    <div class="editor-traits__layout">
      <!-- ─── Форма создания свойства ── -->
      <div class="editor-traits__form-col">
        <h2 class="editor-traits__heading">Создать свойство</h2>

        <form class="editor-traits__form" @submit.prevent="onSubmit">
          <label class="editor-traits__label">
            Название
            <input
              v-model.trim="form.name"
              type="text"
              class="editor-traits__input"
              placeholder="Например: Ночное зрение"
              maxlength="60"
              required
            />
          </label>

          <label class="editor-traits__label">
            Категория
            <select v-model="form.category" class="editor-traits__input">
              <option v-for="c in CATEGORIES" :key="c.value" :value="c.value">
                {{ c.label }}
              </option>
            </select>
          </label>

          <label class="editor-traits__label">
            Иконка
            <IconPickerInput
              v-model="form.icon"
              placeholder="Начни печатать название: fire, poison…"
            />
          </label>

          <div class="editor-traits__label">
            Модификаторы характеристик
            <div v-for="(mod, idx) in form.mods" :key="idx" class="editor-traits__stat-row">
              <select v-model="mod.stat" class="editor-traits__input editor-traits__stat-select">
                <option value="">— нет модификатора</option>
                <option v-for="s in STATS" :key="s.value" :value="s.value">
                  {{ s.label }}
                </option>
              </select>
              <input
                v-model.number="mod.value"
                type="number"
                class="editor-traits__input editor-traits__stat-input"
                :disabled="!mod.stat"
                placeholder="+2"
              />
              <button
                v-if="form.mods.length > 1"
                type="button"
                class="editor-traits__mod-btn editor-traits__mod-btn--remove"
                title="Удалить"
                @click="removeMod(idx)"
              >
                ×
              </button>
            </div>
            <button
              type="button"
              class="editor-traits__mod-btn editor-traits__mod-btn--add"
              @click="addMod"
            >
              + Добавить модификатор
            </button>
          </div>

          <button type="submit" class="editor-traits__btn-add" :disabled="!form.name">
            + Добавить свойство
          </button>
        </form>
      </div>

      <!-- ─── Список созданных свойств ── -->
      <div class="editor-traits__list-col">
        <h2 class="editor-traits__heading">Свойства в игре ({{ store.traits.length }})</h2>

        <!-- Фильтр по категориям -->
        <div class="editor-traits__filters">
          <FilterPills
            v-model="filterCategory"
            :options="FILTER_OPTIONS"
            aria-label="Фильтр свойств"
          />
        </div>

        <p v-if="!filteredTraits.length" class="editor-traits__empty">
          {{
            store.traits.length
              ? 'Нет свойств в этой категории.'
              : 'Свойств пока нет. Создайте первое слева.'
          }}
        </p>

        <div class="editor-traits__list">
          <div v-for="trait in filteredTraits" :key="trait.id" class="editor-traits__card">
            <div class="editor-traits__card-icon">
              <img
                v-if="trait.icon"
                :src="gameIconUrl(trait.icon)"
                class="editor-traits__icon-img"
                :alt="trait.name"
                crossorigin="anonymous"
              />
              <span v-else class="editor-traits__icon-placeholder">?</span>
            </div>

            <div class="editor-traits__card-body">
              <span class="editor-traits__card-name">{{ trait.name }}</span>
              <span class="editor-traits__card-category">{{
                labelForCategory(trait.category)
              }}</span>
              <span v-for="(mod, i) in trait.mods" :key="i" class="editor-traits__card-stat">
                {{ labelForStat(mod.stat) }}
                <b
                  :class="
                    mod.value >= 0
                      ? 'editor-traits__card-stat--pos'
                      : 'editor-traits__card-stat--neg'
                  "
                >
                  {{ mod.value >= 0 ? '+' : '' }}{{ mod.value }}
                </b>
              </span>
            </div>

            <button
              class="editor-traits__card-del"
              title="Удалить"
              @click="store.removeTrait(trait.id)"
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
  import { useTraitsStore } from '../stores/traits'
  import { TRAIT_CATEGORIES, TRAIT_STATS } from '../constants/traitEditorOptions'
  import { useTraitEditor } from '../composables/useTraitEditor'

  const store = useTraitsStore()
  const CATEGORIES = TRAIT_CATEGORIES
  const STATS = TRAIT_STATS

  const {
    form,
    filterCategory,
    filterOptions: FILTER_OPTIONS,
    filteredTraits,
    labelForCategory,
    labelForStat,
    gameIconUrl,
    addMod,
    removeMod,
    onSubmit,
  } = useTraitEditor(store)
</script>

<style scoped src="../assets/styles/components/editorTraitsSection.scss"></style>
