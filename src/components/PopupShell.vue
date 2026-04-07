<template>
  <Teleport to="body">
    <Transition name="popup-fade">
      <div v-if="visible" class="popup-shell" @click.self="$emit('close')">
        <div class="popup-shell__box" role="dialog" aria-modal="true" :aria-label="ariaLabel">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
  defineProps({
    visible: { type: Boolean, required: true },
    ariaLabel: { type: String, default: '' },
  })

  defineEmits(['close'])
</script>

<style scoped>
  .popup-shell {
    position: fixed;
    inset: 0;
    z-index: var(--z-popup, 300);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-overlay-strong);
    backdrop-filter: blur(2px);
  }

  .popup-shell__box {
    width: min(480px, 90vw);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-8);
    background: var(--color-surface);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-lg);
    box-shadow:
      0 8px 32px rgb(0 0 0 / 70%),
      0 0 16px var(--color-primary-glow);
  }

  .popup-fade-enter-active,
  .popup-fade-leave-active {
    transition: opacity 200ms ease;

    .popup-shell__box {
      transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
    }
  }

  .popup-fade-enter-from,
  .popup-fade-leave-to {
    opacity: 0;

    .popup-shell__box {
      transform: scale(0.95) translateY(8px);
    }
  }
</style>
