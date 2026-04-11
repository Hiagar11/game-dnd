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
  import { ref, watch, onMounted, nextTick } from 'vue'
  import { PhPaperPlaneRight } from '@phosphor-icons/vue'

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

  function onSend() {
    const text = draft.value.trim()
    if (!text || props.loading) return
    draft.value = ''
    emit('send', text)
  }

  // Автопрокрутка вниз при новом сообщении или при появлении "печатает..."
  watch(
    () => [props.messages.length, props.loading],
    () => {
      nextTick(() => {
        if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
      })
    }
  )

  onMounted(() => {
    nextTick(() => {
      if (!el.value) return

      const rect = el.value.getBoundingClientRect()
      const vw = window.innerWidth
      const MARGIN = 12

      if (rect.top < MARGIN) below.value = true

      if (rect.left < MARGIN) {
        shiftX.value = MARGIN - rect.left
      } else if (rect.right > vw - MARGIN) {
        shiftX.value = -(rect.right - (vw - MARGIN))
      }

      ready.value = true
      inputEl.value?.focus()
    })
  })
</script>

<style scoped>
  .dialog-bubble {
    position: absolute;
    z-index: 20;

    /* По умолчанию — над токеном по центру */
    bottom: calc(100% + 12px);
    left: 50%;
    transform: translateX(calc(-50% + var(--shift, 0px)));
    background: #fff;
    color: #1a1a2e;
    font-family: var(--font-ui, sans-serif);
    border-radius: 14px;
    width: 280px;
    box-shadow: 0 3px 18px rgb(0 0 0 / 60%);
    pointer-events: auto;
    opacity: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    /* Хвостик снизу (по умолчанию — токен под облаком) */
    &::after {
      content: '';
      position: absolute;
      top: 100%;
      left: calc(50% - var(--shift, 0px));
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: #fff;
    }
  }

  .dialog-bubble--ready {
    opacity: 1;
    animation: bubble-pop 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  .dialog-bubble--below {
    bottom: auto;
    top: calc(100% + 12px);

    &::after {
      top: auto;
      bottom: 100%;
      border-top-color: transparent;
      border-bottom-color: #fff;
    }
  }

  /* ── История сообщений ── */
  .dialog-bubble__messages {
    padding: 10px 10px 6px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    max-height: 180px;
    min-height: 32px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgb(0 0 0 / 15%) transparent;
    scroll-behavior: smooth;
  }

  .dialog-bubble__msg {
    max-width: 90%;
    padding: 5px 10px;
    border-radius: 10px;
    font-size: 12.5px;
    font-weight: 600;
    line-height: 1.45;
    word-break: break-all;
    overflow-wrap: break-word;
  }

  /* Строка-обёртка для одного сообщения + аватарки */
  .dialog-bubble__msg-row {
    display: flex;
    align-items: flex-end;
    gap: 5px;
  }

  .dialog-bubble__msg-row--npc {
    justify-content: flex-start;
  }

  .dialog-bubble__msg-row--player {
    justify-content: flex-end;
  }

  /* Аватарка игрока рядом с его сообщением */
  .dialog-bubble__player-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    border: 1.5px solid rgb(79 70 229 / 40%);
    opacity: 0.9;
  }

  /* НПС — слева */
  .dialog-bubble__msg--npc {
    background: #f0f0f5;
    color: #1a1a2e;
    border-bottom-left-radius: 3px;
  }

  /* Игрок — справа */
  .dialog-bubble__msg--player {
    background: #4f46e5;
    color: #fff;
    border-bottom-right-radius: 3px;
  }

  /* ── Строка ввода ── */
  .dialog-bubble__input-row {
    display: flex;
    gap: 5px;
    align-items: center;
    padding: 6px 8px;
    border-top: 1px solid rgb(0 0 0 / 8%);
    background: #fafafa;
  }

  .dialog-bubble__npc-avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    border: 1.5px solid rgb(0 0 0 / 12%);
    opacity: 0.85;
  }

  .dialog-bubble__input {
    flex: 1;
    min-width: 0;
    border: 1px solid rgb(0 0 0 / 18%);
    border-radius: 8px;
    padding: 4px 8px;
    font-size: 12px;
    font-family: var(--font-ui, sans-serif);
    outline: none;
    background: #fff;
    color: #1a1a2e;

    &:focus {
      border-color: #4f46e5;
    }

    &:disabled {
      opacity: 0.5;
    }
  }

  .dialog-bubble__send {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    background: #4f46e5;
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    flex-shrink: 0;
    align-self: flex-end;

    &:hover:not(:disabled) {
      background: #4338ca;
    }

    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }

  /* ── Анимация "печатает..." ── */
  .dialog-bubble__typing {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    padding: 3px 2px;

    span {
      width: 5px;
      height: 5px;
      background: #9ca3af;
      border-radius: 50%;
      animation: typing-dot 1.2s infinite ease-in-out;

      &:nth-child(2) {
        animation-delay: 0.2s;
      }

      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
  }

  @keyframes typing-dot {
    0%,
    60%,
    100% {
      transform: translateY(0);
    }

    30% {
      transform: translateY(-4px);
    }
  }

  @keyframes bubble-pop {
    from {
      opacity: 0;
      scale: 0.72;
    }

    to {
      opacity: 1;
      scale: 1;
    }
  }

  /* ── Шкала отношений ── */

  .dialog-bubble__attitude-bar {
    padding: 4px 10px 7px;
    background: #fafafa;
    border-top: 1px solid rgb(0 0 0 / 6%);
  }

  .dialog-bubble__attitude-track {
    position: relative;
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(to right, #f87171 0%, #60a5fa 50%, #4ade80 100%);
  }

  .dialog-bubble__attitude-pin {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #60a5fa;
    box-shadow: 0 1px 4px rgb(0 0 0 / 40%);
    transition: left 0.5s ease;
  }
</style>
