<template>
  <!--
    Летящий снаряд способности — от кастера до точки удара.
    Появляется при store.abilityProjectile !== null.
    По завершении анимации сбрасывает store.abilityProjectile.
  -->
  <div v-if="proj" class="ability-projectile" :style="projectileStyle" @transitionend="onArrived">
    <img :src="iconUrl" class="ability-projectile__icon" alt="" />
  </div>
</template>

<script setup>
  import { computed, ref, watch, nextTick } from 'vue'
  import { useGameStore } from '../stores/game'

  const store = useGameStore()
  const proj = computed(() => store.abilityProjectile)

  const iconUrl = computed(() => {
    const icon = proj.value?.icon ?? 'fire-bolt'
    return `https://api.iconify.design/game-icons/${icon}.svg`
  })

  // arrived используется для запуска CSS transition:
  // сначала элемент появляется в точке from, затем за кадр — перемещаем в to.
  const arrived = ref(false)

  watch(proj, (v) => {
    if (v) {
      arrived.value = false
      nextTick(() => {
        // Следующий кадр — запускаем transition
        requestAnimationFrame(() => {
          arrived.value = true
        })
      })
    }
  })

  const projectileStyle = computed(() => {
    if (!proj.value) return {}
    const p = proj.value
    const x = arrived.value ? p.toX : p.fromX
    const y = arrived.value ? p.toY : p.fromY
    return {
      left: `${x}px`,
      top: `${y}px`,
      color: p.color ?? '#f97316',
      transition: arrived.value ? 'left 0.45s ease-in, top 0.45s ease-in' : 'none',
    }
  })

  function onArrived(e) {
    // transitionend fires for each property (left, top) — handle only once
    if (e.propertyName !== 'left') return
    store.abilityProjectile = null
  }
</script>

<style lang="scss" scoped>
  .ability-projectile {
    position: absolute;
    z-index: 5;
    pointer-events: none;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 0 8px currentcolor);

    &__icon {
      width: 36px;
      height: 36px;
      animation: projectile-spin 0.45s linear;
    }
  }

  @keyframes projectile-spin {
    0% {
      transform: rotate(0deg) scale(0.6);
    }

    50% {
      transform: rotate(180deg) scale(1.2);
    }

    100% {
      transform: rotate(360deg) scale(1);
    }
  }
</style>
