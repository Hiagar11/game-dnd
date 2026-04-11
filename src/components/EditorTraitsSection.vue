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
          <button
            class="editor-traits__filter-btn"
            :class="{ 'editor-traits__filter-btn--active': filterCategory === null }"
            @click="filterCategory = null"
          >
            Все
          </button>
          <button
            v-for="c in CATEGORIES"
            :key="c.value"
            class="editor-traits__filter-btn"
            :class="{ 'editor-traits__filter-btn--active': filterCategory === c.value }"
            @click="filterCategory = c.value"
          >
            {{ c.label }}
          </button>
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
  import { ref } from 'vue'
  import IconPickerInput from './IconPickerInput.vue'
  import { useTraitsStore } from '../stores/traits'

  const store = useTraitsStore()

  const CATEGORIES = [
    { value: 'passive', label: '🔵 Пассивное' },
    { value: 'active', label: '⚡ Активное' },
    { value: 'status', label: '☠️ Статус-эффект' },
    { value: 'racial', label: '🧝 Расовое' },
    { value: 'class', label: '⚔️ Классовое' },
  ]

  function labelForCategory(cat) {
    return CATEGORIES.find((c) => c.value === cat)?.label ?? cat
  }

  function gameIconUrl(slug) {
    return `https://api.iconify.design/game-icons:${slug}.svg`
  }

  const STATS = [
    { value: 'strength', label: 'Сила' },
    { value: 'agility', label: 'Ловкость' },
    { value: 'intellect', label: 'Интеллект' },
    { value: 'charisma', label: 'Харизма' },
    { value: 'damage', label: 'Урон' },
    { value: 'critChance', label: 'Шанс удара' },
    { value: 'defense', label: 'Защита' },
    { value: 'evasion', label: 'Уклонение' },
    { value: 'initiative', label: 'Инициатива' },
    { value: 'resistance', label: 'Сопротивление' },
    { value: 'magicPower', label: 'Маг. сила' },
    { value: 'persuasion', label: 'Убеждение' },
  ]

  function labelForStat(val) {
    return STATS.find((s) => s.value === val)?.label ?? val
  }

  const form = ref({ name: '', category: 'passive', icon: '', mods: [{ stat: '', value: 0 }] })
  const filterCategory = ref(null)

  function addMod() {
    form.value.mods.push({ stat: '', value: 0 })
  }

  function removeMod(idx) {
    form.value.mods.splice(idx, 1)
  }

  const filteredTraits = computed(() =>
    filterCategory.value
      ? store.traits.filter((t) => t.category === filterCategory.value)
      : store.traits
  )

  function onSubmit() {
    store.addTrait({ ...form.value })
    form.value = { name: '', category: 'passive', icon: '', mods: [{ stat: '', value: 0 }] }
  }
</script>

<style scoped>
  .editor-traits {
    padding: var(--space-6);
    height: 100%;
    overflow-y: auto;
  }

  .editor-traits__layout {
    display: grid;
    grid-template-columns: 380px 1fr;
    gap: var(--space-8);
    align-items: flex-start;
  }

  .editor-traits__heading {
    margin: 0 0 var(--space-4);
    font-family: var(--font-base);
    font-size: 18px;
    color: var(--color-primary);
  }

  /* ── Форма ── */

  .editor-traits__form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .editor-traits__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: 12px;
    font-family: var(--font-ui);
    color: var(--color-text-muted);
  }

  .editor-traits__input {
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

  .editor-traits__stat-row {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    margin-bottom: var(--space-1);
  }

  .editor-traits__stat-select {
    flex: 1;
  }

  .editor-traits__stat-input {
    width: 72px;
    flex-shrink: 0;
    text-align: center;

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }

  .editor-traits__mod-btn {
    flex-shrink: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    font-size: 13px;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast),
      color var(--transition-fast);
  }

  .editor-traits__mod-btn--remove {
    background: none;
    color: var(--color-text-muted);
    width: 28px;
    height: 28px;
    font-size: 16px;
    line-height: 1;
    padding: 0;
  }

  .editor-traits__mod-btn--remove:hover {
    color: var(--color-error);
    border-color: var(--color-error);
  }

  .editor-traits__mod-btn--add {
    display: block;
    width: 100%;
    background: #12122a;
    color: #777;
    border: 1px dashed #3a3a5a;
    border-radius: var(--radius-sm);
    padding: 5px var(--space-3);
    margin-top: var(--space-1);
    font-family: var(--font-ui);
    font-size: 12px;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast),
      color var(--transition-fast);
  }

  .editor-traits__mod-btn--add:hover {
    background: #1a1a38;
    border-color: #557;
    color: #aaa;
  }

  .editor-traits__icon-row {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .editor-traits__icon-row .editor-traits__input {
    flex: 1;
  }

  .editor-traits__icon-preview {
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

  .editor-traits__icon-img {
    width: 28px;
    height: 28px;
    object-fit: contain;
    filter: invert(1) sepia(1) saturate(3) hue-rotate(5deg) brightness(0.9);
  }

  .editor-traits__icon-placeholder {
    font-size: 18px;
    color: var(--color-text-muted);
  }

  .editor-traits__hint {
    font-size: 11px;
    color: var(--color-text-muted);

    a {
      color: var(--color-primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    code {
      color: var(--color-primary-hover);
      font-size: 11px;
    }
  }

  .editor-traits__btn-add {
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

  /* ── Фильтр ── */

  .editor-traits__filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin-bottom: var(--space-3);
  }

  .editor-traits__filter-btn {
    background: rgb(0 0 0 / 30%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-family: var(--font-ui);
    font-size: 11px;
    padding: 3px var(--space-2);
    cursor: pointer;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      color: var(--color-text);
      border-color: rgb(200 154 74 / 40%);
    }

    &--active {
      background: rgb(200 154 74 / 15%);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  /* ── Список карточек ── */

  .editor-traits__list-col {
    min-width: 0;
  }

  .editor-traits__empty {
    color: var(--color-text-muted);
    font-family: var(--font-ui);
    font-size: 14px;
  }

  .editor-traits__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-height: 65vh;
    overflow-y: auto;
  }

  .editor-traits__card {
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

  .editor-traits__card-icon {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(0 0 0 / 30%);
    border-radius: var(--radius-sm);
  }

  .editor-traits__card-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .editor-traits__card-name {
    font-family: var(--font-ui);
    font-size: 14px;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .editor-traits__card-category {
    font-size: 11px;
    color: var(--color-text-muted);
    font-family: var(--font-ui);
  }

  .editor-traits__card-stat {
    font-size: 11px;
    color: var(--color-text-muted);
    font-family: var(--font-ui);
  }

  .editor-traits__card-stat--pos {
    color: #4ade80;
  }

  .editor-traits__card-stat--neg {
    color: #f87171;
  }

  .editor-traits__card-del {
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
