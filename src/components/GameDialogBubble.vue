<template>
  <!--
    Облако диалога с историей сообщений.
    - messages: [{who:'npc'|'player', text}] — прокручиваемая история
    - loading: true — анимация "печатает..."
    - Эмитит 'send' с текстом при отправке игроком

    Позиционирование (onMounted + nextTick):
      1. Рендерится над токеном, opacity: 0.
      2. getBoundingClientRect — замер реального положения.
      3. Если обрезается сверху → вниз (--below).
      4. Горизонтальная коррекция если выходит за края вьюпорта.
      5. opacity: 1 + анимация появления.

    Хвостик: CSS-переменная --shift двигает облако,
    counter-shift на хвостике удерживает его над центром токена.
    Закрывается по клику вне облака — родитель через v-if.
    @click.stop предотвращает закрытие при клике внутри.
  -->
  <div
    ref="el"
    class="dialog-bubble"
    :class="{ 'dialog-bubble--below': below, 'dialog-bubble--ready': ready }"
    :style="{ '--shift': `${shiftX}px` }"
    @click.stop
  >
    <!-- Прокручиваемая история сообщений -->
    <div ref="scrollEl" class="dialog-bubble__messages">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="dialog-bubble__msg-row"
        :class="`dialog-bubble__msg-row--${msg.who}`"
      >
        <div class="dialog-bubble__msg" :class="`dialog-bubble__msg--${msg.who}`">
          {{ msg.text }}
        </div>
        <img
          v-if="msg.who === 'player' && playerSrc"
          :src="playerSrc"
          class="dialog-bubble__player-avatar"
          aria-hidden="true"
        />
      </div>

      <!-- Анимация "печатает..." пока ИИ думает -->
      <div v-if="loading" class="dialog-bubble__msg-row dialog-bubble__msg-row--npc">
        <div class="dialog-bubble__msg dialog-bubble__msg--npc">
          <span class="dialog-bubble__typing">
            <span />
            <span />
            <span />
          </span>
        </div>
      </div>
    </div>

    <!-- Строка ввода -->
    <div class="dialog-bubble__input-row">
      <img v-if="npcSrc" :src="npcSrc" class="dialog-bubble__npc-avatar" aria-hidden="true" />
      <input
        ref="inputEl"
        v-model.trim="draft"
        class="dialog-bubble__input"
        placeholder="Ответить..."
        maxlength="200"
        :disabled="loading"
        @keydown.enter.prevent="onSend"
      />
      <button class="dialog-bubble__send" :disabled="!draft || loading" @click="onSend">
        <PhPaperPlaneRight :size="14" weight="fill" />
      </button>
    </div>

    <!-- Шкала отношений -->
    <div class="dialog-bubble__attitude-bar">
      <div class="dialog-bubble__attitude-track">
        <div
          class="dialog-bubble__attitude-pin"
          :style="{ left: `${((props.npcScore + 100) / 200) * 100}%` }"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, toRef } from 'vue'
  import { PhPaperPlaneRight } from '@phosphor-icons/vue'
  import { useDialogBubblePosition } from '../composables/useDialogBubblePosition'

  const props = defineProps({
    messages: { type: Array, required: true },
    loading: { type: Boolean, default: false },
    npcSrc: { type: String, default: null },
    playerSrc: { type: String, default: null },
    npcScore: { type: Number, default: 0 },
  })

  const emit = defineEmits(['send'])

  const el = ref(null)
  const scrollEl = ref(null)
  const inputEl = ref(null)
  const draft = ref('')
  const below = ref(false)
  const shiftX = ref(0)
  const ready = ref(false)

  const messagesRef = toRef(props, 'messages')
  const loadingRef = toRef(props, 'loading')

  function onSend() {
    const text = draft.value.trim()
    if (!text || props.loading) return
    draft.value = ''
    emit('send', text)
  }

  useDialogBubblePosition({
    el,
    scrollEl,
    inputEl,
    messages: messagesRef,
    loading: loadingRef,
    below,
    shiftX,
    ready,
  })
</script>

<style scoped src="../assets/styles/components/gameDialogBubble.scss"></style>
