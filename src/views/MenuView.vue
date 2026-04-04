<template>
  <div class="container">
    <h1 class="visually-hidden">Kokopelli`s game</h1>
    <AppBackground src="/video/mainBackground.mp4" :brightness="0.8" />
    <nav class="menu">
      <router-link
        v-for="item in menuItems"
        :key="item.to"
        class="menu__link"
        :to="item.to"
        @mouseenter="playHover"
        @click="playClick"
      >
        {{ item.label }}
      </router-link>
    </nav>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useSound } from '../composables/useSound'
  import { useAuthStore } from '../stores/auth'
  import AppBackground from '../components/AppBackground.vue'

  const { playHover, playClick } = useSound()
  const auth = useAuthStore()

  // Игрок видит только «Играть». Мастер (admin) видит также «Редактор».
  const menuItems = computed(() => {
    const items = [{ to: '/game', label: 'Играть' }]
    if (auth.role === 'admin') {
      items.push({ to: '/editor', label: 'Редактор' })
    }
    return items
  })
</script>

<style scoped>
  .container {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: 1fr auto;
    inline-size: 100vw;
    block-size: 100dvh;
    padding: var(--space-8);
  }

  .menu {
    grid-column: 2;
    grid-row: 2;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-4);
  }

  .menu__link {
    text-decoration: none;
    color: inherit;
    font-weight: bold;
    font-size: 1.5rem;
  }

  .menu__link:hover {
    color: var(--color-primary);
  }
</style>
