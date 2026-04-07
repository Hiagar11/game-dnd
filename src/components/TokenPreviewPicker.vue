<template>
  <div
    class="token-preview"
    :class="{ 'token-preview--static': readonly }"
    @click="!readonly && fileInput?.click()"
  >
    <img v-if="src" :src="src" alt="Превью токена" class="token-preview__img" />
    <span v-else class="token-preview__placeholder">
      <span class="token-preview__icon">+</span>
      <span>Выбрать<br />изображение</span>
    </span>
  </div>
  <input
    v-if="!readonly"
    ref="fileInput"
    type="file"
    accept="image/*"
    class="token-preview__input"
    @change="onFileChange"
  />
</template>

<script setup>
  import { ref } from 'vue'

  defineProps({
    src: { type: String, default: null },
    readonly: { type: Boolean, default: false },
  })

  const emit = defineEmits(['file'])
  const fileInput = ref(null)

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    emit('file', file)
  }
</script>

<style scoped>
  .token-preview {
    width: 96px;
    height: 96px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
    border: 2px dashed var(--color-primary);
    overflow: hidden;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgb(255 255 255 / 4%);
    transition: background var(--transition-fast);

    &:hover {
      background: rgb(255 255 255 / 10%);
    }

    &--static {
      cursor: default;
      border-style: solid;

      &:hover {
        background: rgb(255 255 255 / 4%);
      }
    }
  }

  .token-preview__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .token-preview__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    font-size: 11px;
    color: var(--color-text-muted);
    text-align: center;
    line-height: 1.3;
    padding: var(--space-2);
    pointer-events: none;
    user-select: none;
  }

  .token-preview__icon {
    font-size: 24px;
    color: var(--color-primary);
  }

  .token-preview__input {
    display: none;
  }
</style>
