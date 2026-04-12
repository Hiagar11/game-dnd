<template>
  <aside
    class="viewer-menu"
    @mouseenter="$emit('menu-hover', true)"
    @mouseleave="$emit('menu-hover', false)"
  >
    <div class="viewer-menu__side" />

    <div class="viewer-menu__center">
      <nav class="viewer-menu__tabs">
        <button class="viewer-menu__tab viewer-menu__tab--active">Герои</button>
      </nav>

      <div class="viewer-menu__heroes">
        <p v-if="!heroesStore.heroes.length" class="viewer-menu__empty">Герои пока не выбраны…</p>
        <TransitionGroup name="hero-magic" @enter="onHeroEnter">
          <div
            v-for="hero in heroesStore.heroes"
            :key="hero.id"
            class="viewer-menu__hero"
            :title="hero.name"
          >
            <img :src="hero.src" :alt="hero.name" class="viewer-menu__hero-img" draggable="false" />
          </div>
        </TransitionGroup>
      </div>
    </div>

    <div class="viewer-menu__side viewer-menu__side--right" />
  </aside>
</template>

<script setup>
  import { useHeroesStore } from '../stores/heroes'

  defineEmits(['menu-hover'])

  const heroesStore = useHeroesStore()
  const FLAME_COLORS = ['#f20', '#00cc44', '#0066ff']

  function onHeroEnter(el) {
    el.style.setProperty(
      '--flame-color',
      FLAME_COLORS[Math.floor(Math.random() * FLAME_COLORS.length)]
    )
  }
</script>

<style scoped lang="scss" src="../assets/styles/components/viewerMenu.scss"></style>
