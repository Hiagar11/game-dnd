<template>
  <div class="editor-shell">
    <AppBackground src="/video/mainBackground.mp4" :brightness="0.4" />

    <div class="editor-body">
      <!-- Левая навигация: переключение разделов -->
      <nav class="editor-nav">
        <router-link class="editor-nav__back" :to="{ name: 'menu' }">← Меню</router-link>

        <div class="editor-nav__sections">
          <button
            v-for="item in NAV_ITEMS"
            :key="item.key"
            class="editor-nav__btn"
            :class="{ 'editor-nav__btn--active': activeSection === item.key }"
            @click="activeSection = item.key"
          >
            {{ item.label }}
          </button>
        </div>
      </nav>

      <!-- Правая область: текущий раздел -->
      <main class="editor-content">
        <EditorMapsSection v-if="activeSection === 'maps'" />
        <EditorLevelSection v-else-if="activeSection === 'levels'" />
        <EditorScenarioSection v-else />
      </main>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import AppBackground from '../components/AppBackground.vue'
  import EditorMapsSection from '../components/EditorMapsSection.vue'
  import EditorLevelSection from '../components/EditorLevelSection.vue'
  import EditorScenarioSection from '../components/EditorScenarioSection.vue'

  const NAV_ITEMS = [
    { key: 'maps', label: 'Загрузить карты' },
    { key: 'levels', label: 'Заполнить карты' },
    { key: 'scenarios', label: 'Создать сценарий' },
  ]

  const activeSection = ref('maps')
</script>

<style scoped>
  .editor-shell {
    position: relative;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    color: var(--color-text);
    font-family: var(--font-ui);
  }

  .editor-body {
    position: relative;
    z-index: 1;
    display: flex;
    height: 100%;
  }

  /* ─── Левая навигация ─────────────────────────────────────────────────────── */
  .editor-nav {
    width: 190px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-6);
    background: rgb(0 0 0 / 60%);
    border-right: 1px solid var(--color-border);
  }

  .editor-nav__back {
    font-size: 13px;
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--color-primary);
    }
  }

  .editor-nav__sections {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }

  .editor-nav__btn {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-text);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);

    &:hover {
      background: rgb(255 255 255 / 5%);
    }

    &--active {
      background: rgb(255 255 255 / 8%);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  /* ─── Правая область контента ─────────────────────────────────────────────── */
  .editor-content {
    flex: 1;
    overflow: hidden;
  }
</style>
