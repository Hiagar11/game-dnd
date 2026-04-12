<template>
  <div class="editor-toolbar">
    <button class="editor-toolbar__back" @mouseenter="playHover" @click="onBack">←</button>

    <input
      :value="name"
      type="text"
      class="editor-toolbar__name"
      :placeholder="namePlaceholder"
      maxlength="80"
      @input="$emit('update:name', $event.target.value)"
    />

    <div class="editor-toolbar__sep" />

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

    <button
      v-if="scenarioId"
      class="editor-toolbar__btn editor-toolbar__btn--delete"
      :disabled="saving"
      @mouseenter="playHover"
      @click="onDelete"
    >
      Удалить
    </button>

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
    scenarioId: { type: String, default: null },
    error: { type: String, default: '' },
  })

  const emit = defineEmits([
    'update:name',
    'update:cellSize',
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

<style scoped lang="scss" src="../assets/styles/components/editorToolbar.scss"></style>
