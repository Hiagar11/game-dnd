<template>
  <div class="editor-toolbar">
    <button class="editor-toolbar__back" @mouseenter="playHover" @click="onBack">←</button>

    <!-- Название сценария -->
    <input
      :value="name"
      type="text"
      class="editor-toolbar__name"
      :placeholder="namePlaceholder"
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
    <button
      class="editor-toolbar__btn"
      :disabled="uploading"
      @mouseenter="playHover"
      @click="onChangeMap"
    >
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
      @mouseenter="playHover"
      @click="onDelete"
    >
      Удалить
    </button>

    <!-- Сохранить / Создать -->
    <button
      class="editor-toolbar__btn editor-toolbar__btn--save"
      :disabled="!canSave || saving"
      @mouseenter="playHover"
      @click="onSave"
    >
      <span v-if="saving" class="editor-toolbar__spinner editor-toolbar__spinner--dark" />
      <span v-else>{{ scenarioId ? 'Сохранить' : 'Создать' }}</span>
    </button>
  </div>
</template>

<script setup>
  import { useSound } from '../composables/useSound'

  defineProps({
    name: { type: String, required: true },
    namePlaceholder: { type: String, default: 'Название сценария' },
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
    'back',
    'change-map',
    'save',
    'delete',
  ])

  const { playHover, playClick } = useSound()

  function onBack() {
    emit('back')
    playClick()
  }

  function onChangeMap() {
    emit('change-map')
    playClick()
  }

  function onDelete() {
    emit('delete')
    playClick()
  }

  function onSave() {
    emit('save')
    playClick()
  }

  function onCellSizeChange(val) {
    emit('update:cellSize', val)
    emit('redraw', val)
  }
</script>

<style scoped lang="scss">
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
    @include btn-ghost;

    flex-shrink: 0;
    padding: var(--space-1) var(--space-3);
    font-size: 14px;
  }

  .editor-toolbar__name {
    @include form-input;

    flex-shrink: 0;
    width: 200px;
    padding: var(--space-1) var(--space-3);

    &::placeholder {
      color: rgb(255 255 255 / 45%);
    }
  }

  .editor-toolbar__sep {
    width: 1px;
    height: 20px;
    flex-shrink: 0;
    background: rgb(255 255 255 / 15%);
  }

  .editor-toolbar__cell-label {
    @include field-label;

    flex-shrink: 0;
  }

  .editor-toolbar__slider {
    width: 120px;
    flex-shrink: 0;
    accent-color: var(--color-primary);
    cursor: pointer;
  }

  .editor-toolbar__number {
    @include form-input($font-size: 12px);

    width: 52px;
    flex-shrink: 0;
    text-align: center;
  }

  .editor-toolbar__px {
    font-size: 11px;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .editor-toolbar__error {
    @include text-error;

    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .editor-toolbar__btn {
    @include btn-ghost;

    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-4);
    font-size: 13px;

    // Переопределяем hover призрака: менее акцентный (text-muted → text)
    &:hover:not(:disabled) {
      border-color: var(--color-text-muted);
      color: var(--color-text);
    }

    &--save {
      @include btn-primary;

      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-1) var(--space-4);
    }

    &--delete {
      @include btn-danger;

      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-1) var(--space-4);
    }
  }

  .editor-toolbar__spinner {
    @include spinner(12px, $anim: toolbar-spin);

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
