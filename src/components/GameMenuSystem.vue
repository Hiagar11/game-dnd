<template>
  <!--
    12-колоночный грид:
      • 7 колонок → системные токены
      • 5 колонок → правая панель: курсор мастера + переключатель стен (editorMode)
  -->
  <div class="game-menu-system">
    <!-- ── 7 кол.: системные токены ─────────────────────────────────────────── -->
    <div class="game-menu-system__tokens">
      <button
        v-for="token in SYSTEM_TOKENS"
        :key="token.id"
        class="game-menu-system__item"
        :title="token.name"
        draggable="false"
        @mouseenter="playHover"
        @dragstart="onDragStart($event, token)"
      >
        <img :src="token.src" :alt="token.name" class="game-menu-system__img" draggable="true" />
      </button>
    </div>

    <!-- ── 5 кол.: правая панель ────────────────────────────────────────────── -->
    <div class="game-menu-system__controls">
      <!--
        Игровой режим: выбор иконки курсора мастера.
        Режим редактора: переключатель стены.
        Оба блока не превышают высоту меню.
      -->
      <div v-if="!props.editorMode" class="game-menu-system__cursor-section">
        <span class="game-menu-system__cursor-label">Курсор мастера</span>

        <div
          class="game-menu-system__cursor-preview"
          :title="cursorIconUrl ? 'Текущая иконка' : 'Иконка по умолчанию'"
        >
          <img
            v-if="cursorIconUrl"
            :src="cursorIconUrl"
            alt="Иконка курсора"
            class="game-menu-system__cursor-img"
          />
          <span v-else class="game-menu-system__cursor-emoji">🎲</span>
        </div>

        <label class="game-menu-system__cursor-btn" title="Загрузить иконку курсора">
          📂
          <input
            type="file"
            accept="image/*"
            class="game-menu-system__cursor-input"
            @change="onIconUpload"
          />
        </label>

        <button
          v-if="cursorIconUrl"
          class="game-menu-system__cursor-btn game-menu-system__cursor-btn--reset"
          title="Сбросить иконку"
          @mouseenter="playHover"
          @click="resetIcon"
        >
          ✕
        </button>
      </div>

      <!--
        Диагональный квадрат: режим рисования стен.
        Показывается только в editorMode вместо секции курсора.
      -->
      <div v-if="props.editorMode" class="game-menu-system__wall">
        <button
          class="game-menu-system__wall-half game-menu-system__wall-half--draw"
          :class="{ 'game-menu-system__wall-half--active': gameStore.wallMode }"
          title="Рисовать стены"
          @click.stop="gameStore.wallMode = true"
        >
          <span class="game-menu-system__wall-icon game-menu-system__wall-icon--draw">🧱</span>
        </button>
        <button
          class="game-menu-system__wall-half game-menu-system__wall-half--off"
          :class="{ 'game-menu-system__wall-half--active': !gameStore.wallMode }"
          title="Выключить режим стен"
          @click.stop="gameStore.wallMode = false"
        >
          <span class="game-menu-system__wall-icon game-menu-system__wall-icon--off">✕</span>
        </button>
        <svg class="game-menu-system__wall-line" viewBox="0 0 56 56" aria-hidden="true">
          <line x1="2" y1="54" x2="54" y2="2" stroke="rgb(0 0 0 / 55%)" stroke-width="2" />
        </svg>
      </div>
      <!--
        Переключатель тумана войны — только для админа, во всех режимах.
        Отключает туман только для себя — игроки всегда видят туман независимо от этой настройки.
      -->
      <button
        v-if="auth.role === 'admin'"
        class="game-menu-system__fog-btn"
        :class="{ 'game-menu-system__fog-btn--off': !gameStore.fogEnabled }"
        :title="gameStore.fogEnabled ? 'Скрыть туман' : 'Показать туман'"
        @mouseenter="playHover"
        @click="gameStore.fogEnabled = !gameStore.fogEnabled"
      >
        <span class="game-menu-system__fog-icon">{{ gameStore.fogEnabled ? '🌫️' : '☀️' }}</span>
        <span class="game-menu-system__fog-label">{{
          gameStore.fogEnabled ? 'Туман' : 'Откл.'
        }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
  import { inject } from 'vue'
  import { SYSTEM_TOKENS, useGameStore } from '../stores/game'
  import { useAuthStore } from '../stores/auth'
  import { useSound } from '../composables/useSound'
  import { useCursorIconPicker } from '../composables/useCursorIconPicker'

  const props = defineProps({
    editorMode: { type: Boolean, default: false },
  })

  const gameStore = useGameStore()
  const auth = useAuthStore()

  // inject получает функцию setCursorIcon из GameView через provide.
  // Если компонент используется вне GameView — fallback на пустую функцию.
  const setCursorIcon = inject('setCursorIcon', () => {})
  const { playHover, playClick } = useSound()
  const { cursorIconUrl, onIconUpload, resetIcon } = useCursorIconPicker(setCursorIcon, playClick)

  // Drag системного токена: пишем в dataTransfer ключ 'systemToken' со строковым id.
  // В useTokenDrop этот ключ отличается от обычного 'tokenId' и роутится в placeSystemToken.
  function onDragStart(e, token) {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('systemToken', token.id)
  }
</script>

<style scoped src="../assets/styles/components/gameMenuSystem.scss"></style>
