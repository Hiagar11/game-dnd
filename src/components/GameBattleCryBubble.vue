<template>
  <!--
    Мини-облако боевого выкрика NPC.
    Показывается на 3 сек, потом плавно исчезает.
    Позиционируется абсолютно внутри родительского токен-дива.
  -->
  <Transition name="battle-cry">
    <div v-if="text" class="battle-cry-bubble" @click.stop>
      <div class="battle-cry-bubble__msg">{{ text }}</div>
    </div>
  </Transition>
</template>

<script setup>
  defineProps({
    text: { type: String, default: '' },
  })
</script>

<style scoped lang="scss" src="../assets/styles/components/gameBattleCryBubble.scss"></style>
