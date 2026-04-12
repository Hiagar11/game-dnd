<template>
  <Transition name="ctx">
    <div v-if="visible" class="token-ctx-menu" @click.stop @contextmenu.stop.prevent>
      <button
        v-if="!systemToken"
        class="token-ctx-menu__btn token-ctx-menu__btn--tl"
        title="Способности"
        @mouseenter="playHover"
        @click="onAbilities"
      >
        <PhMagicWand :size="13" weight="fill" />
      </button>

      <button
        class="token-ctx-menu__btn token-ctx-menu__btn--tr token-ctx-menu__btn--danger"
        title="Убрать с карты"
        @mouseenter="playHover"
        @click="onRemove"
      >
        <PhX :size="13" weight="bold" />
      </button>

      <button
        v-if="!systemToken"
        class="token-ctx-menu__btn token-ctx-menu__btn--bl"
        title="Инвентарь"
        @mouseenter="playHover"
        @click="onInventory"
      >
        <PhBackpack :size="13" weight="fill" />
      </button>

      <button
        class="token-ctx-menu__btn token-ctx-menu__btn--br"
        title="Характеристики"
        @mouseenter="playHover"
        @click="onEdit"
      >
        <PhScroll :size="13" weight="fill" />
      </button>
    </div>
  </Transition>
</template>

<script setup>
  import { PhX, PhMagicWand, PhBackpack, PhScroll } from '@phosphor-icons/vue'
  import { useSound } from '../composables/useSound'

  defineProps({
    visible: { type: Boolean, required: true },
    systemToken: { type: Boolean, default: false },
  })

  const emit = defineEmits(['remove', 'edit', 'abilities', 'inventory'])

  const { playHover, playClick } = useSound()

  function onRemove() {
    emit('remove')
    playClick()
  }

  function onEdit() {
    emit('edit')
    playClick()
  }

  function onAbilities() {
    emit('abilities')
    playClick()
  }

  function onInventory() {
    emit('inventory')
    playClick()
  }
</script>

<style scoped lang="scss" src="../assets/styles/components/gameTokenContextMenu.scss"></style>
