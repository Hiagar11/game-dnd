<template>
  <!--
    Летящий снаряд способности — от кастера до точки удара.
    Появляется при store.abilityProjectile !== null.
    По завершении анимации сбрасывает store.abilityProjectile.
  -->
  <div
    v-if="proj"
    class="ability-projectile"
    :class="{ 'ability-projectile--blood': proj.kind === 'bloodBolt' }"
    :style="projectileStyle"
    @transitionend="onArrived"
  >
    <template v-if="proj.kind === 'bloodBolt'">
      <div class="ability-projectile__singularity">
        <div class="ability-projectile__ring ability-projectile__ring--outer" />
        <div class="ability-projectile__ring ability-projectile__ring--inner" />
        <div class="ability-projectile__core" />
      </div>
    </template>
    <img v-else :src="iconUrl" class="ability-projectile__icon" alt="" />
  </div>
</template>

<script setup>
  import { computed, ref, watch, nextTick } from 'vue'
  import { useGameStore } from '../stores/game'
  import { playBloodProjectile } from '../composables/useSound'

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
      if (v.kind === 'bloodBolt') playBloodProjectile()
      arrived.value = false
      nextTick(() => {
        // Даём браузеру зафиксировать стартовую позицию у кастера,
        // затем отдельным кадром запускаем полёт к цели.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            arrived.value = true
          })
        })
      })
    }
  })

  const projectileStyle = computed(() => {
    if (!proj.value) return {}
    const p = proj.value
    const durationMs = p.durationMs ?? 450
    const dx = (p.toX ?? 0) - (p.fromX ?? 0)
    const dy = (p.toY ?? 0) - (p.fromY ?? 0)
    return {
      left: `${p.fromX}px`,
      top: `${p.fromY}px`,
      color: p.color ?? '#f97316',
      transform: arrived.value
        ? `translate(-50%, -50%) translate(${dx}px, ${dy}px)`
        : 'translate(-50%, -50%) translate(0px, 0px)',
      transition: `transform ${durationMs}ms linear`,
    }
  })

  function onArrived(e) {
    if (e.propertyName !== 'transform') return
    store.abilityProjectile = null
  }
</script>

<style lang="scss" scoped>
  .ability-projectile {
    position: absolute;
    z-index: 5;
    pointer-events: none;
    will-change: transform;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 0 8px currentcolor);

    &__icon {
      width: 36px;
      height: 36px;
      animation: projectile-spin 0.45s linear;
    }
  }

  .ability-projectile--blood {
    filter: drop-shadow(0 0 10px rgb(220 38 38 / 95%)) drop-shadow(0 0 18px rgb(127 29 29 / 85%));
    width: 42px;
    height: 42px;
  }

  .ability-projectile__singularity {
    position: relative;
    width: 42px;
    height: 42px;
    opacity: 0;
    transform: scale(0.2);
    animation:
      blood-singularity-birth 0.22s ease-out forwards,
      blood-singularity-flight 0.52s linear 0.12s infinite;
  }

  .ability-projectile__ring,
  .ability-projectile__core {
    position: absolute;
    inset: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
  }

  .ability-projectile__ring {
    border-style: solid;
    border-color: rgb(220 38 38 / 82%);
    mix-blend-mode: screen;
  }

  .ability-projectile__ring--outer {
    width: 34px;
    height: 34px;
    border-width: 2px;
    border-color: rgb(255 219 219 / 98%) rgb(127 29 29 / 22%) rgb(220 38 38 / 92%)
      rgb(127 29 29 / 18%);
    animation: blood-ring-outer 0.48s linear infinite;
  }

  .ability-projectile__ring--inner {
    width: 18px;
    height: 18px;
    border-width: 1px;
    border-color: rgb(255 239 239 / 96%) rgb(127 29 29 / 16%) rgb(248 113 113 / 92%)
      rgb(127 29 29 / 10%);
    animation: blood-ring-inner 0.3s linear infinite reverse;
  }

  .ability-projectile__core {
    width: 15px;
    height: 15px;
    background:
      radial-gradient(
        circle,
        rgb(255 248 248 / 100%) 0%,
        rgb(255 198 198 / 88%) 22%,
        transparent 54%
      ),
      conic-gradient(
        from 0deg,
        rgb(127 29 29 / 0%) 0deg,
        rgb(220 38 38 / 92%) 130deg,
        rgb(127 29 29 / 0%) 220deg,
        rgb(248 113 113 / 92%) 310deg,
        rgb(127 29 29 / 0%) 360deg
      );
    box-shadow:
      0 0 12px 2px rgb(220 38 38 / 86%),
      0 0 20px 8px rgb(127 29 29 / 34%);
    animation: blood-core-pulse 0.32s ease-in-out infinite;
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

  @keyframes blood-projectile-spin {
    0% {
      transform: rotate(0deg) scale(0.45);
      opacity: 0.8;
    }

    40% {
      transform: rotate(190deg) scale(1.05);
      opacity: 1;
    }

    100% {
      transform: rotate(390deg) scale(0.92);
      opacity: 1;
    }
  }

  @keyframes blood-singularity-flight {
    0% {
      transform: scale(0.72);
      opacity: 0.92;
    }

    45% {
      transform: scale(1.04);
      opacity: 1;
    }

    100% {
      transform: scale(0.9);
      opacity: 0.96;
    }
  }

  @keyframes blood-singularity-birth {
    0% {
      opacity: 0;
      transform: scale(0.15);
    }

    100% {
      opacity: 1;
      transform: scale(0.84);
    }
  }

  @keyframes blood-ring-outer {
    0% {
      transform: translate(-50%, -50%) rotate(0deg) scale(0.92);
    }

    100% {
      transform: translate(-50%, -50%) rotate(360deg) scale(1.08);
    }
  }

  @keyframes blood-ring-inner {
    0% {
      transform: translate(-50%, -50%) rotate(0deg) scale(0.86);
    }

    100% {
      transform: translate(-50%, -50%) rotate(360deg) scale(1.14);
    }
  }

  @keyframes blood-core-pulse {
    0% {
      transform: translate(-50%, -50%) scale(0.76);
      opacity: 0.84;
    }

    50% {
      transform: translate(-50%, -50%) scale(1.16);
      opacity: 1;
    }

    100% {
      transform: translate(-50%, -50%) scale(0.88);
      opacity: 0.9;
    }
  }
</style>
