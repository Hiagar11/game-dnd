<template>
  <div
    class="editor-map__dropzone"
    :class="{ 'editor-map__dropzone--uploading': uploading }"
    @dragover.prevent
    @drop.prevent="onDrop"
    @click="$emit('open-picker')"
  >
    <span v-if="uploading" class="editor-map__spinner" />
    <template v-else>
      <span class="editor-map__dropzone-icon">🗺</span>
      <p>Перетащите изображение<br />или <span class="editor-map__link">нажмите</span></p>
      <small>JPEG / PNG / WebP · до 20 МБ</small>
    </template>
  </div>
</template>

<script setup>
  defineProps({
    uploading: { type: Boolean, default: false },
  })

  const emit = defineEmits(['open-picker', 'file'])

  function onDrop(e) {
    const file = e.dataTransfer.files?.[0]
    if (file) emit('file', file)
  }
</script>

<style scoped>
  .editor-map__dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: 200px;
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-sm);
    background: rgb(0 0 0 / 20%);
    cursor: pointer;
    text-align: center;
    font-size: 13px;
    color: var(--color-text-muted);
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast);

    &:hover {
      border-color: var(--color-primary);
      background: rgb(255 255 255 / 3%);
    }

    &--uploading {
      cursor: wait;
    }
  }

  .editor-map__dropzone-icon {
    font-size: 40px;
  }

  .editor-map__link {
    color: var(--color-primary);
    text-decoration: underline;
  }

  .editor-map__spinner {
    display: inline-block;
    width: 32px;
    height: 32px;
    border: 3px solid rgb(255 255 255 / 15%);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: dropzone-spin 0.7s linear infinite;
  }

  @keyframes dropzone-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
