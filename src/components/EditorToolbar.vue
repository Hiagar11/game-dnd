<template>
  <div class="editor-toolbar">
    <router-link class="editor-toolbar__back" :to="{ name: 'menu' }">←</router-link>

    <!-- Название сценария -->
    <input
      :value="name"
      type="text"
      class="editor-toolbar__name"
      placeholder="Название сценария"
      maxlength="80"
      @input="$emit('update:name', $event.target.value)"
    />

    <div class="editor-toolbar__sep" />

    <!-- Размер ячейки сетки -->
    <label class="editor-toolbar__cell-label">Ячейка</label>
    <input
      :value="cellSize"
      type="range"
      min="20"
      max="120"
      step="5"
      class="editor-toolbar__slider"
      @input="onCellSizeChange($event.target.valueAsNumber)"
    />
    <input
      :value="cellSize"
      type="number"
      min="20"
      max="120"
      class="editor-toolbar__number"
      @change="onCellSizeChange($event.target.valueAsNumber)"
    />
    <span class="editor-toolbar__px">px</span>

    <div class="editor-toolbar__sep" />

    <!-- Изменить карту -->
    <button class="editor-toolbar__btn" :disabled="uploading" @click="$emit('change-map')">
      <span v-if="uploading" class="editor-toolbar__spinner" />
      <span v-else>Карта...</span>
    </button>

    <div class="editor-toolbar__sep" />

    <p v-if="error" class="editor-toolbar__error">{{ error }}</p>

    <!-- Удалить сценарий -->
    <button
      v-if="scenarioId"
      class="editor-toolbar__btn editor-toolbar__btn--delete"
      :disabled="saving"
      @click="$emit('delete')"
    >
      Удалить
    </button>

    <!-- Сохранить / Создать -->
    <button
      class="editor-toolbar__btn editor-toolbar__btn--save"
      :disabled="!canSave || saving"
      @click="$emit('save')"
    >
      <span v-if="saving" class="editor-toolbar__spinner editor-toolbar__spinner--dark" />
      <span v-else>{{ scenarioId ? 'Сохранить' : 'Создать' }}</span>
    </button>
  </div>
</template>

<script setup>
  defineProps({
    name: { type: String, required: true },
    cellSize: { type: Number, required: true },
    uploading: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    canSave: { type: Boolean, default: false },
    // null — режим создания (кнопки «Удалить» нет), строка — режим редактирования
    scenarioId: { type: String, default: null },
    error: { type: String, default: '' },
  })

  const emit = defineEmits([
    'update:name',
    'update:cellSize',
    // Передаёт новый cellSize — родитель может сразу перерисовать холст.
    // Отдельное событие позволяет не зависеть от порядка обновления реактивности.
    'redraw',
    'change-map',
    'save',
    'delete',
  ])

  function onCellSizeChange(val) {
    emit('update:cellSize', val)
    emit('redraw', val)
  }
</script>

<style scoped>
  .editor-toolbar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    background: rgb(0 0 0 / 65%);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid rgb(255 255 255 / 10%);
  }

  .editor-toolbar__back {
    flex-shrink: 0;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    text-decoration: none;
    font-size: 14px;
    transition:
      color var(--transition-fast),
      border-color var(--transition-fast);

    &:hover {
      color: var(--color-primary);
      border-color: var(--color-primary);
    }
  }

  .editor-toolbar__name {
    flex-shrink: 0;
    width: 200px;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: rgb(0 0 0 / 40%);
    color: var(--color-text);
    font-size: 13px;
    font-family: var(--font-ui);
    transition: border-color var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  .editor-toolbar__sep {
    width: 1px;
    height: 20px;
    flex-shrink: 0;
    background: rgb(255 255 255 / 15%);
  }

  .editor-toolbar__cell-label {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
  }

  .editor-toolbar__slider {
    width: 120px;
    flex-shrink: 0;
    accent-color: var(--color-primary);
    cursor: pointer;
  }

  .editor-toolbar__number {
    width: 52px;
    flex-shrink: 0;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: rgb(0 0 0 / 40%);
    color: var(--color-text);
    font-size: 12px;
    font-family: var(--font-ui);
    text-align: center;
    transition: border-color var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  .editor-toolbar__px {
    font-size: 11px;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .editor-toolbar__error {
    flex: 1;
    font-size: 12px;
    color: #f87171;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .editor-toolbar__btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-4);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    font-size: 13px;
    font-family: var(--font-ui);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      color var(--transition-fast);

    &:hover:not(:disabled) {
      border-color: var(--color-text-muted);
      color: var(--color-text);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &--save {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #1a1200;
      font-weight: 600;

      &:hover:not(:disabled) {
        background: var(--color-primary-hover);
        border-color: var(--color-primary-hover);
      }
    }

    &--delete {
      border-color: rgb(220 38 38 / 50%);
      color: #f87171;

      &:hover:not(:disabled) {
        background: rgb(220 38 38 / 15%);
        border-color: #f87171;
      }
    }
  }

  .editor-toolbar__spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgb(255 255 255 / 20%);
    border-top-color: var(--color-text-muted);
    border-radius: 50%;
    animation: toolbar-spin 0.7s linear infinite;

    &--dark {
      border-color: rgb(0 0 0 / 20%);
      border-top-color: #1a1a1a;
    }
  }

  @keyframes toolbar-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
