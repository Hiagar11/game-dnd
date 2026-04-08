<template>
  <div class="game-menu-system">
    <!-- ── Секция: иконка курсора мастера ──────────────────────────────────── -->
    <div class="game-menu-system__cursor-section">
      <span class="game-menu-system__cursor-label">Курсор мастера</span>

      <!-- Превью текущей иконки (или эмодзи по умолчанию) -->
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

      <!-- Кнопка выбора файла — скрытый input активируется кликом по кнопке -->
      <label class="game-menu-system__cursor-btn" title="Загрузить иконку курсора">
        📂
        <input
          type="file"
          accept="image/*"
          class="game-menu-system__cursor-input"
          @change="onIconUpload"
        />
      </label>

      <!-- Сброс иконки до дефолтной -->
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

    <!-- ── Режим строительства стен (виден только в редакторе) ─────────────── -->
    <div v-if="props.editorMode" class="game-menu-system__wall-section">
      <span class="game-menu-system__wall-label">Стены</span>
      <label class="game-menu-system__wall-toggle">
        <input
          type="checkbox"
          class="game-menu-system__wall-input"
          :checked="gameStore.wallMode"
          @change="gameStore.wallMode = true"
        />
        <span class="game-menu-system__wall-chip game-menu-system__wall-chip--on">Рисовать</span>
      </label>
      <label class="game-menu-system__wall-toggle">
        <input
          type="checkbox"
          class="game-menu-system__wall-input"
          :checked="!gameStore.wallMode"
          @change="gameStore.wallMode = false"
        />
        <span class="game-menu-system__wall-chip game-menu-system__wall-chip--off">Выключить</span>
      </label>
    </div>

    <!-- ── Системные токены (двери, ловушки и т.д.) ────────────────────────── -->
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
</template>

<script setup>
  import { ref, inject } from 'vue'
  import { SYSTEM_TOKENS } from '../stores/game'
  import { useGameStore } from '../stores/game'
  import { useSound } from '../composables/useSound'

  // editorMode: true — компонент используется во вкладке редактора;
  // чекбоксы стен видны только там (в игровом режиме они не нужны).
  const props = defineProps({
    editorMode: { type: Boolean, default: false },
  })

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
  .game-menu-system {
    @include menu-panel-content;
  }

  /* ── Секция выбора иконки курсора ──────────────────────────────────────── */
  .game-menu-system__cursor-section {
    /* Занимает всю ширину, располагается перед токенами */
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: rgb(0 0 0 / 30%);
    border-radius: var(--radius-sm);
    border: 1px solid rgb(255 255 255 / 15%);
  }

  .game-menu-system__cursor-label {
    font-size: 11px;
    color: var(--color-text-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Круглое превью текущей иконки */
  .game-menu-system__cursor-preview {
    width: 32px;
    height: 32px;
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
    font-size: 18px;
    line-height: 1;
  }

  /* Кнопка загрузки файла — label со скрытым <input> */
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

  /* Скрытый file input — визуальная кнопка это label */
  .game-menu-system__cursor-input {
    display: none;
  }

  /* ── Системные токены ───────────────────────────────────────────────────── */
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

  /* ── Режим стен ───────────────────────────────────────────── */
  .game-menu-system__wall-section {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: rgb(0 0 0 / 30%);
    border-radius: var(--radius-sm);
    border: 1px solid rgb(255 255 255 / 15%);
  }

  .game-menu-system__wall-label {
    font-size: 11px;
    color: var(--color-text-muted);
    white-space: nowrap;
    flex-shrink: 0;
    margin-inline-end: var(--space-1);
  }

  .game-menu-system__wall-toggle {
    display: flex;
    cursor: pointer;
  }

  /* Скрываем стандартный checkbox - визуальная часть это chip-кнопка */
  .game-menu-system__wall-input {
    display: none;
  }

  .game-menu-system__wall-chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-family: var(--font-ui);
    border: 1px solid transparent;
    transition:
      background var(--transition-fast),
      color var(--transition-fast),
      border-color var(--transition-fast);

    /* Неактивный вид */
    background: var(--color-overlay);
    color: var(--color-text-muted);
    border-color: rgb(255 255 255 / 15%);
  }

  /* Активный чекбокс даёт chip яркий вид */
  .game-menu-system__wall-input:checked + .game-menu-system__wall-chip--on {
    background: rgb(220 38 38 / 70%);
    color: #fff;
    border-color: rgb(220 38 38 / 90%);
  }

  .game-menu-system__wall-input:checked + .game-menu-system__wall-chip--off {
    background: rgb(74 222 128 / 30%);
    color: #fff;
    border-color: rgb(74 222 128 / 60%);
  }
</style>
