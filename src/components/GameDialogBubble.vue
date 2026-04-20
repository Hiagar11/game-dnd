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
        <!-- Обычное сообщение NPC / игрока -->
        <template v-if="msg.who === 'npc' || msg.who === 'player'">
          <div class="dialog-bubble__msg" :class="`dialog-bubble__msg--${msg.who}`">
            {{ msg.text }}
          </div>
          <span v-if="msg.who === 'npc' && npcName" class="dialog-bubble__npc-name">
            {{ npcName }}
          </span>
          <img
            v-if="msg.who === 'player' && playerSrc"
            :src="playerSrc"
            class="dialog-bubble__player-avatar"
            aria-hidden="true"
          />
        </template>

        <!-- Бросок кубика (проверка убеждения) -->
        <template v-if="msg.who === 'dice'">
          <div
            class="dialog-bubble__dice"
            :class="msg.success ? 'dialog-bubble__dice--success' : 'dialog-bubble__dice--fail'"
          >
            <!-- Обман: heroDeception + luck vs npcInsight -->
            <template v-if="msg.type === 'deception'">
              <span class="dialog-bubble__dice-icon">🎭</span>
              <span class="dialog-bubble__dice-label">Обман</span>
              <span class="dialog-bubble__dice-roll">
                {{ msg.deception }}
                <span v-if="msg.luck" class="dialog-bubble__dice-mod">+🍀{{ msg.luck }}</span>
                = {{ msg.total }} / 👁{{ msg.npcInsight }}
              </span>
            </template>
            <!-- Убеждение: heroPersuasion + luck vs DC -->
            <template v-else>
              <span class="dialog-bubble__dice-icon">✨</span>
              <span class="dialog-bubble__dice-label">Убеждение</span>
              <span class="dialog-bubble__dice-roll">
                {{ msg.persuasion }}
                <span v-if="msg.luck" class="dialog-bubble__dice-mod">+🍀{{ msg.luck }}</span>
                = {{ msg.total }} / {{ msg.dc }}
              </span>
            </template>
            <span class="dialog-bubble__dice-result">
              {{ msg.success ? 'Успех!' : 'Провал' }}
            </span>
          </div>
        </template>

        <!-- Торговое предложение -->
        <template v-if="msg.who === 'trade'">
          <div class="dialog-bubble__trade">
            <div class="dialog-bubble__trade-header">
              <span class="dialog-bubble__trade-icon">🪙</span>
              Торговля
            </div>
            <div class="dialog-bubble__trade-item">
              {{ msg.itemName }}
            </div>
            <div class="dialog-bubble__trade-price">
              {{ formatPrice(msg.price) }}
            </div>
            <div v-if="!msg.resolved" class="dialog-bubble__trade-actions">
              <button
                class="dialog-bubble__trade-btn dialog-bubble__trade-btn--buy"
                @click="onBuy(msg)"
              >
                Купить
              </button>
              <button
                class="dialog-bubble__trade-btn dialog-bubble__trade-btn--decline"
                @click="onDecline(msg)"
              >
                Отказаться
              </button>
            </div>
            <div v-else class="dialog-bubble__trade-resolved">
              {{ msg.resolved }}
            </div>
          </div>
        </template>

        <!-- Предупреждение о враждебности -->
        <template v-if="msg.who === 'warning'">
          <div class="dialog-bubble__warning">
            <span class="dialog-bubble__warning-icon">⚠️</span>
            <span class="dialog-bubble__warning-text">{{ msg.text }}</span>
          </div>
        </template>
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
      <button
        v-if="speech.isSupported"
        class="dialog-bubble__mic"
        :class="{ 'dialog-bubble__mic--active': speech.isListening.value }"
        :disabled="loading"
        :title="speech.isListening.value ? 'Остановить запись' : 'Голосовой ввод'"
        @click="speech.toggle()"
      >
        <PhMicrophone :size="14" weight="fill" />
      </button>
      <button class="dialog-bubble__send" :disabled="!draft || loading" @click="onSend">
        <PhPaperPlaneRight :size="14" weight="fill" />
      </button>
    </div>

    <!-- Шкала отношений -->
    <div class="dialog-bubble__attitude-bar">
      <div class="dialog-bubble__attitude-track">
        <div
          class="dialog-bubble__attitude-pin"
          :style="{ left: `${((props.npcScore + 30) / 90) * 100}%` }"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, toRef } from 'vue'
  import { PhPaperPlaneRight, PhMicrophone } from '@phosphor-icons/vue'
  import { useDialogBubblePosition } from '../composables/useDialogBubblePosition'
  import { useSpeechToText } from '../composables/useSpeechToText'
  import { splitCoins } from '../utils/inventoryState'

  const props = defineProps({
    messages: { type: Array, required: true },
    loading: { type: Boolean, default: false },
    npcSrc: { type: String, default: null },
    npcName: { type: String, default: '' },
    playerSrc: { type: String, default: null },
    npcScore: { type: Number, default: 0 },
  })

  const emit = defineEmits(['send', 'trade-accept', 'trade-decline'])

  const el = ref(null)
  const scrollEl = ref(null)
  const inputEl = ref(null)
  const draft = ref('')
  const below = ref(false)
  const shiftX = ref(0)
  const ready = ref(false)

  const messagesRef = toRef(props, 'messages')
  const loadingRef = toRef(props, 'loading')

  // Голосовой ввод — Web Speech API (Chrome/Edge)
  const speech = useSpeechToText({ target: draft, lang: 'ru-RU' })

  function onSend() {
    const text = draft.value.trim()
    if (!text || props.loading) return
    draft.value = ''
    emit('send', text)
  }

  function formatPrice(copper) {
    const { gold, silver, copper: cp } = splitCoins(copper)
    const parts = []
    if (gold) parts.push(`${gold} зол.`)
    if (silver) parts.push(`${silver} сер.`)
    if (cp) parts.push(`${cp} мед.`)
    return parts.join(' ') || '0 мед.'
  }

  function onBuy(msg) {
    msg.resolved = 'Покупка...'
    emit('trade-accept', { npcUid: msg.npcUid, itemName: msg.itemName, price: msg.price })
  }

  function onDecline(msg) {
    msg.resolved = 'Отказ'
    emit('trade-decline', { npcUid: msg.npcUid })
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
