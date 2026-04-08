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
    </div>
  </div>
</template>

<script setup>
  import { ref, inject } from 'vue'
  import { SYSTEM_TOKENS } from '../stores/game'
  import { useGameStore } from '../stores/game'
  import { useSound } from '../composables/useSound'

  const props = defineProps({
    editorMode: { type: Boolean, default: false },
  })

  // gameStore используется в других местах компонента — оставляем импорт без изменений
  const gameStore = useGameStore()

  // inject получает функцию setCursorIcon из GameView через provide.
  // Если компонент используется вне GameView — fallback на пустую функцию.
  const setCursorIcon = inject('setCursorIcon', () => {})

  // Превью выбранной иконки (хранится только в памяти, не в БД)
  const cursorIconUrl = ref('')
  const { playHover, playClick } = useSound()

  // Пользователь выбрал файл — читаем как base64 через FileReader
  function onIconUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      cursorIconUrl.value = dataUrl
      setCursorIcon(dataUrl)
    }
    reader.readAsDataURL(file)

    // Сбрасываем input чтобы можно было загрузить тот же файл повторно
    e.target.value = ''
  }

  // Убираем кастомную иконку — зрители увидят дефолтный эмодзи 🎲
  function resetIcon() {
    playClick()
    cursorIconUrl.value = ''
    setCursorIcon(null)
  }

  // Drag системного токена: пишем в dataTransfer ключ 'systemToken' со строковым id.
  // В useTokenDrop этот ключ отличается от обычного 'tokenId' и роутится в placeSystemToken.
  function onDragStart(e, token) {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('systemToken', token.id)
  }
</script>

<style scoped lang="scss">
  /* Корневой контейнер: грид 7+5 колонок */
  .game-menu-system {
    flex-grow: 1;
    display: grid;
    grid-template-columns: 7fr 5fr;
    min-height: 0;
  }

  /* ── 7 кол.: токены ─────────────────────────────────────────────────────── */
  .game-menu-system__tokens {
    padding: var(--space-2);
    background-image: url('/systemImage/panel-center.jpg');
    background-size: 340px;
    background-position: center;
    box-shadow:
      inset 15px 0 15px -5px var(--color-overlay-strong),
      inset -15px 0 15px -5px var(--color-overlay-strong);
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: var(--space-2);
    min-height: 0;
    overflow-y: auto;
  }

  .game-menu-system__item {
    width: var(--token-size);
    height: var(--token-size);
    flex-shrink: 0;
    padding: 0;
    border: 2px solid rgb(255 255 255 / 40%);
    border-radius: var(--radius-full);
    background: var(--color-overlay);
    cursor: grab;
    overflow: hidden;
    transition: border-color var(--transition-fast);

    &:hover {
      border-color: rgb(255 255 255 / 70%);
    }

    &:active {
      cursor: grabbing;
    }
  }

  .game-menu-system__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* ── 5 кол.: правая панель ──────────────────────────────────────────────── */
  .game-menu-system__controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-2);
    border-left: 1px solid rgb(255 255 255 / 10%);
    background: rgb(0 0 0 / 20%);
    min-height: 0;
    overflow: hidden;
  }

  /* ── Секция курсора ─────────────────────────────────────────────────────── */
  .game-menu-system__cursor-section {
    width: 100%;

    /* flex: 1 — секция растягивается на всю доступную высоту панели,
       но не выходит за её пределы */
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: rgb(0 0 0 / 30%);
    border-radius: var(--radius-sm);
    border: 1px solid rgb(255 255 255 / 15%);
    overflow: hidden;
  }

  .game-menu-system__cursor-label {
    font-size: 11px;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .game-menu-system__cursor-preview {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid rgb(255 255 255 / 30%);
    background: var(--color-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .game-menu-system__cursor-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .game-menu-system__cursor-emoji {
    font-size: 20px;
    line-height: 1;
  }

  .game-menu-system__cursor-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid rgb(255 255 255 / 30%);
    border-radius: var(--radius-sm);
    background: var(--color-overlay);
    color: var(--color-text);
    font-size: 14px;
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color var(--transition-fast);

    &:hover {
      border-color: rgb(255 255 255 / 70%);
    }
  }

  .game-menu-system__cursor-btn--reset {
    font-size: 11px;
    color: var(--color-text-muted);
  }

  .game-menu-system__cursor-input {
    display: none;
  }

  /* ── Диагональный переключатель стен ────────────────────────────────────── */
  .game-menu-system__wall {
    position: relative;
    width: 56px;
    height: 56px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 2px solid rgb(255 255 255 / 25%);
    flex-shrink: 0;
  }

  .game-menu-system__wall-half {
    position: absolute;
    inset: 0;
    border: none;
    cursor: pointer;
    background: rgb(0 0 0 / 55%);
    transition: background var(--transition-fast);
  }

  .game-menu-system__wall-half--draw {
    clip-path: polygon(0 0, 100% 0, 0 100%);

    &:hover {
      background: rgb(220 38 38 / 45%);
    }

    &.game-menu-system__wall-half--active {
      background: rgb(220 38 38 / 70%);
    }
  }

  .game-menu-system__wall-half--off {
    clip-path: polygon(100% 0, 100% 100%, 0 100%);

    &:hover {
      background: rgb(74 222 128 / 25%);
    }

    &.game-menu-system__wall-half--active {
      background: rgb(74 222 128 / 35%);
    }
  }

  .game-menu-system__wall-icon {
    position: absolute;
    font-size: 14px;
    line-height: 1;
    pointer-events: none;
    user-select: none;
  }

  .game-menu-system__wall-icon--draw {
    top: 7px;
    left: 7px;
  }

  .game-menu-system__wall-icon--off {
    bottom: 7px;
    right: 9px;
    font-size: 11px;
    color: rgb(255 255 255 / 80%);
  }

  .game-menu-system__wall-line {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
</style>
