<template>
  <!--
    Мини-облако боевого выкрика NPC.
    Показывается на 3 сек, потом плавно исчезает.
    Стиль похож на обычный диалог, но без поля ввода.
  -->
  <Transition name="battle-cry">
    <Teleport v-if="text" to="body">
      <div class="battle-cry-bubble" :style="bubbleStyle" @click.stop>
        <div class="battle-cry-bubble__msg">{{ text }}</div>
        <div class="battle-cry-bubble__tail" />
      </div>
    </Teleport>
  </Transition>
</template>

<script setup>
  import { computed } from 'vue'

  const props = defineProps({
    text: { type: String, default: '' },
    anchorEl: { type: Object, default: null },
  })

  // Позиция рассчитывается от якорного элемента (токена)
  const bubbleStyle = computed(() => {
    if (!props.anchorEl) return {}
    const rect = props.anchorEl.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const top = rect.top - 12
    return {
      position: 'fixed',
      left: `${cx}px`,
      top: `${top}px`,
      transform: 'translateX(-50%) translateY(-100%)',
    }
  })
</script>

<style scoped lang="scss" src="../assets/styles/components/gameBattleCryBubble.scss"></style>
