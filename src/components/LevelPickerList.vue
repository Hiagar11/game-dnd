<template>
  <div class="level-picker">
    <h2 class="level-picker__title">Выберите карту для расстановки</h2>

    <p v-if="loading" class="level-picker__hint">Загрузка…</p>
    <p v-else-if="!maps.length" class="level-picker__hint">
      Нет карт. Сначала загрузите их в разделе «Загрузить карты».
    </p>

    <div v-else class="level-picker__grid">
      <LevelCard
        v-for="s in maps"
        :key="s.id"
        :scenario="s"
        :is-loading="loadingId === s.id"
        @click="emit('select-map', s)"
      />
    </div>

    <p v-if="loadError" class="level-picker__error">{{ loadError }}</p>

    <!-- ── Сохранённые уровни ─────────────────────────────────────────── -->
    <!-- Тот же список, что видит игрок в GameView. Удаление здесь скрывает -->
    <!-- уровень из «Играть», т.к. оба читают из одного сценарийного стора.  -->
    <h2 class="level-picker__title level-picker__title--levels">Сохранённые уровни</h2>

    <p v-if="!levels.length && !loading" class="level-picker__hint">Нет сохранённых уровней.</p>

    <div v-else class="level-picker__grid">
      <div v-for="s in levels" :key="s.id" class="level-card-wrap">
        <LevelCard :scenario="s" :is-loading="loadingId === s.id" @click="emit('edit-level', s)" />
        <button
          class="level-card__del"
          title="Удалить уровень"
          :disabled="deletingId === s.id"
          @mouseenter="playHover"
          @click="emit('delete-level', s)"
        >
          {{ deletingId === s.id ? '…' : '×' }}
        </button>
      </div>
    </div>

    <p v-if="deleteError" class="level-picker__error">{{ deleteError }}</p>
  </div>
</template>

<script setup>
  import { useSound } from '../composables/useSound'
  import LevelCard from './LevelCard.vue'

  defineProps({
    maps: { type: Array, default: () => [] },
    levels: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    loadingId: { type: [String, Number], default: null },
    loadError: { type: String, default: '' },
    deletingId: { type: [String, Number], default: null },
    deleteError: { type: String, default: '' },
  })

  const emit = defineEmits(['select-map', 'edit-level', 'delete-level'])

  const { playHover } = useSound()
</script>

<style scoped lang="scss">
  .level-picker {
    padding: var(--space-6) var(--space-8);
    overflow-y: auto;
    height: 100%;
  }

  .level-picker__title {
    font-size: 18px;
    font-weight: 600;
    margin-block-end: var(--space-5);

    /* Заголовок раздела «Сохранённые уровни» с отступом сверху */
    &--levels {
      margin-block-start: var(--space-8);
    }
  }

  .level-picker__hint {
    font-size: 13px;
    color: var(--color-text-muted);
  }

  .level-picker__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-4);
    margin-block-start: var(--space-4);
  }

  .level-picker__error {
    margin-block-start: var(--space-4);
    font-size: 13px;
    color: var(--color-error);
  }

  /* Обёртка: position:relative для абсолютной кнопки × */
  .level-card-wrap {
    position: relative;

    /* Кнопка × появляется при наведении */
    &:hover .level-card__del {
      opacity: 1;
    }
  }

  .level-card__del {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    width: 24px;
    height: 24px;
    border-radius: var(--radius-sm);
    border: none;
    background: rgb(0 0 0 / 70%);
    backdrop-filter: blur(4px);
    color: var(--color-text-muted);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    transition:
      opacity var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      color: var(--color-error);
    }

    &:disabled {
      cursor: default;
      opacity: 0.4;
    }
  }
</style>
