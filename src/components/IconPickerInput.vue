<template>
  <div class="icon-picker" ref="rootEl">
    <div class="icon-picker__row">
      <input
        ref="inputEl"
        v-model="query"
        type="text"
        class="icon-picker__input"
        :placeholder="placeholder"
        autocomplete="off"
        @input="onInput"
        @focus="onFocus"
        @keydown.escape="close"
        @keydown.down.prevent="moveDown"
        @keydown.up.prevent="moveUp"
        @keydown.enter.prevent="selectActive"
      />
      <div class="icon-picker__preview">
        <img v-if="modelValue" :src="iconUrl(modelValue)" class="icon-picker__preview-img" alt="" />
        <span v-else class="icon-picker__preview-placeholder">?</span>
      </div>
    </div>

    <!-- Выпадающий список подсказок -->
    <div v-if="showDropdown" class="icon-picker__dropdown">
      <div v-if="loading" class="icon-picker__status">Поиск…</div>
      <div v-else-if="!suggestions.length && query.length >= 2" class="icon-picker__status">
        Ничего не найдено
      </div>
      <button
        v-for="(slug, i) in suggestions"
        :key="slug"
        type="button"
        class="icon-picker__suggestion"
        :class="{ 'icon-picker__suggestion--active': i === activeIdx }"
        @mousedown.prevent="select(slug)"
      >
        <img :src="iconUrl(slug)" class="icon-picker__sug-img" alt="" />
        <span class="icon-picker__sug-name">{{ slug }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, onMounted, onUnmounted } from 'vue'

  const props = defineProps({
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: 'Например: sword' },
  })

  const emit = defineEmits(['update:modelValue'])

  const rootEl = ref(null)
  const query = ref(props.modelValue)
  const suggestions = ref([])
  const loading = ref(false)
  const showDropdown = ref(false)
  const activeIdx = ref(-1)

  let debounceTimer = null

  // Синхронизируем query при внешнем изменении modelValue
  watch(
    () => props.modelValue,
    (val) => {
      if (val !== query.value) query.value = val
    }
  )

  function iconUrl(slug) {
    return `https://api.iconify.design/game-icons:${slug}.svg`
  }

  function onInput() {
    activeIdx.value = -1
    const q = query.value.trim()

    // Сразу сообщаем наверх — пользователь может вручную вписать точный слаг
    emit('update:modelValue', q)

    if (q.length < 2) {
      suggestions.value = []
      showDropdown.value = false
      return
    }

    showDropdown.value = true
    loading.value = true

    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => fetchSuggestions(q), 300)
  }

  function onFocus() {
    if (query.value.trim().length >= 2 && suggestions.value.length) {
      showDropdown.value = true
    }
  }

  async function fetchSuggestions(q) {
    try {
      const url = `https://api.iconify.design/search?query=${encodeURIComponent(q)}&prefix=game-icons&limit=12`
      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      // data.icons — массив вида ["game-icons:sword", ...]
      suggestions.value = (data.icons ?? []).map((s) => s.replace('game-icons:', ''))
    } catch {
      suggestions.value = []
    } finally {
      loading.value = false
    }
  }

  function select(slug) {
    query.value = slug
    emit('update:modelValue', slug)
    close()
  }

  function close() {
    showDropdown.value = false
    activeIdx.value = -1
  }

  function moveDown() {
    if (!showDropdown.value) return
    activeIdx.value = Math.min(activeIdx.value + 1, suggestions.value.length - 1)
  }

  function moveUp() {
    if (!showDropdown.value) return
    activeIdx.value = Math.max(activeIdx.value - 1, -1)
  }

  function selectActive() {
    if (activeIdx.value >= 0 && suggestions.value[activeIdx.value]) {
      select(suggestions.value[activeIdx.value])
    }
  }

  // Клик вне — закрыть
  function onDocClick(e) {
    if (rootEl.value && !rootEl.value.contains(e.target)) {
      close()
    }
  }

  onMounted(() => document.addEventListener('mousedown', onDocClick))
  onUnmounted(() => {
    document.removeEventListener('mousedown', onDocClick)
    clearTimeout(debounceTimer)
  })
</script>

<style scoped>
  .icon-picker {
    position: relative;
  }

  .icon-picker__row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .icon-picker__input {
    flex: 1;
    background: rgb(0 0 0 / 40%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-family: var(--font-ui);
    font-size: 14px;
    padding: 6px 10px;
    outline: none;
    transition: border-color var(--transition-fast);
  }

  .icon-picker__input:focus {
    border-color: var(--color-primary);
  }

  .icon-picker__preview {
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

  .icon-picker__preview-img {
    width: 28px;
    height: 28px;
    object-fit: contain;
    filter: invert(1) sepia(1) saturate(3) hue-rotate(5deg) brightness(0.9);
  }

  .icon-picker__preview-placeholder {
    font-size: 18px;
    color: var(--color-text-muted);
  }

  /* ── Дропдаун ── */

  .icon-picker__dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: #0f0f22;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    z-index: 200;
    max-height: 260px;
    overflow-y: auto;
    box-shadow: 0 8px 24px rgb(0 0 0 / 60%);
  }

  .icon-picker__status {
    padding: 10px 12px;
    font-size: 12px;
    color: var(--color-text-muted);
    font-family: var(--font-ui);
  }

  .icon-picker__suggestion {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    background: none;
    border: none;
    padding: 6px 12px;
    cursor: pointer;
    transition: background var(--transition-fast);
    text-align: left;
  }

  .icon-picker__suggestion:hover,
  .icon-picker__suggestion--active {
    background: rgb(200 154 74 / 10%);
  }

  .icon-picker__sug-img {
    width: 24px;
    height: 24px;
    object-fit: contain;
    flex-shrink: 0;
    filter: invert(1) sepia(1) saturate(3) hue-rotate(5deg) brightness(0.9);
  }

  .icon-picker__sug-name {
    font-family: var(--font-ui);
    font-size: 13px;
    color: var(--color-text);
  }
</style>
