<script setup>
  import { onMounted, onUnmounted } from 'vue'

  const prevent = (e) => e.preventDefault()
  onMounted(() => document.addEventListener('contextmenu', prevent))
  onUnmounted(() => document.removeEventListener('contextmenu', prevent))
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>
