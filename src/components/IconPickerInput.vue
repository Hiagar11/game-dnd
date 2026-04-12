<template>
  <div ref="rootEl" class="icon-picker">
    <div class="icon-picker__row">
      <input
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
        <img
          v-if="modelValue"
          :src="iconUrl(modelValue)"
          class="icon-picker__preview-img"
          crossorigin="anonymous"
          alt=""
        />
        <span v-else class="icon-picker__preview-placeholder">?</span>
      </div>
    </div>

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
        <img :src="iconUrl(slug)" class="icon-picker__sug-img" crossorigin="anonymous" alt="" />
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

  watch(
    () => props.modelValue,
    (val) => {
      if (val !== query.value) query.value = val
    }
  )

  function iconUrl(slug) {
    return `https://api.iconify.design/game-icons/${slug}.svg`
  }

  function onInput() {
    activeIdx.value = -1
    const q = query.value.trim()

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

<style scoped src="../assets/styles/components/iconPickerInput.css"></style>
