<template>
  <div class="inv-panel">
    <!-- ─── ЛЕВАЯ ЧАСТЬ: бумажная кукла с ячейками экипировки ──────── -->
    <div class="inv-panel__doll">
      <!-- Силуэт персонажа — декоративный, указывает зоны надевания -->
      <svg
        class="inv-panel__silhouette"
        viewBox="0 0 240 380"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <!-- Голова -->
        <ellipse cx="120" cy="36" rx="24" ry="28" />
        <!-- Шея -->
        <rect x="112" y="63" width="16" height="14" rx="4" />
        <!-- Туловище -->
        <path
          d="M76 80 C58 84 54 108 54 136 L54 206 C54 212 60 214 76 214
             L164 214 C180 214 186 212 186 206 L186 136 C186 108 182 84 164 80 Z"
        />
        <!-- Левая рука -->
        <path
          d="M60 94 C40 108 34 140 36 172 C36 180 42 184 50 180
             C58 176 60 168 60 158 C58 132 66 112 78 102 Z"
        />
        <!-- Правая рука -->
        <path
          d="M180 94 C200 108 206 140 204 172 C204 180 198 184 190 180
             C182 176 180 168 180 158 C182 132 174 112 162 102 Z"
        />
        <!-- Левая нога -->
        <path
          d="M80 212 C74 248 72 284 72 320 C72 332 78 338 90 338
             C102 338 106 332 106 320 C106 284 104 248 100 212 Z"
        />
        <!-- Правая нога -->
        <path
          d="M140 212 C136 248 134 284 134 320 C134 332 138 338 150 338
             C162 338 168 332 168 320 C168 284 166 248 160 212 Z"
        />
        <!-- Левая стопа -->
        <ellipse cx="88" cy="350" rx="20" ry="8" />
        <!-- Правая стопа -->
        <ellipse cx="152" cy="350" rx="20" ry="8" />
      </svg>

      <!-- ── Ячейки экипировки ──────────────────────────────────────── -->

      <!-- Шлем — над головой по центру -->
      <div class="inv-panel__slot inv-panel__slot--helmet" title="Шлем">
        <span class="inv-panel__slot-label">Шлем</span>
      </div>

      <!-- Амулет — шея по центру -->
      <div class="inv-panel__slot inv-panel__slot--amulet" title="Амулет">
        <span class="inv-panel__slot-label">Амулет</span>
      </div>

      <!-- Плащ — правее от шеи -->
      <div class="inv-panel__slot inv-panel__slot--cloak" title="Плащ">
        <span class="inv-panel__slot-label">Плащ</span>
      </div>

      <!-- Броня — грудь по центру -->
      <div class="inv-panel__slot inv-panel__slot--armor" title="Броня">
        <span class="inv-panel__slot-label">Броня</span>
      </div>

      <!-- Оружие — левая рука -->
      <div class="inv-panel__slot inv-panel__slot--weapon" title="Оружие (осн. рука)">
        <span class="inv-panel__slot-label">Оружие</span>
      </div>

      <!-- Щит / доп. оружие — правая рука -->
      <div class="inv-panel__slot inv-panel__slot--offhand" title="Щит / второе оружие">
        <span class="inv-panel__slot-label">Щит</span>
      </div>

      <!-- Перчатки — под левой рукой -->
      <div class="inv-panel__slot inv-panel__slot--gloves" title="Перчатки">
        <span class="inv-panel__slot-label">Перч.</span>
      </div>

      <!-- Пояс — талия по центру -->
      <div class="inv-panel__slot inv-panel__slot--belt" title="Пояс">
        <span class="inv-panel__slot-label">Пояс</span>
      </div>

      <!-- Поножи — бёдра по центру -->
      <div class="inv-panel__slot inv-panel__slot--legs" title="Поножи">
        <span class="inv-panel__slot-label">Ноги</span>
      </div>

      <!-- Сапоги — ступни по центру -->
      <div class="inv-panel__slot inv-panel__slot--boots" title="Сапоги">
        <span class="inv-panel__slot-label">Сапоги</span>
      </div>

      <!-- Кольцо левое — по левую сторону от сапог -->
      <div class="inv-panel__slot inv-panel__slot--ring-left" title="Кольцо (левая рука)">
        <span class="inv-panel__slot-label">Кольцо</span>
      </div>

      <!-- Кольцо правое — по правую сторону от сапог -->
      <div class="inv-panel__slot inv-panel__slot--ring-right" title="Кольцо (правая рука)">
        <span class="inv-panel__slot-label">Кольцо</span>
      </div>
    </div>

    <!-- ─── ПРАВАЯ ЧАСТЬ: сетка предметов в сумке ─────────────────── -->
    <div class="inv-panel__bag">
      <p class="inv-panel__bag-title">Сумка</p>
      <div class="inv-panel__grid">
        <div
          v-for="(cell, i) in cells"
          :key="i"
          class="inv-panel__cell"
          :title="cell ? cell.name : ''"
          @contextmenu.prevent="openCtx($event, i)"
        >
          <img
            v-if="cell?.icon"
            :src="gameIconUrl(cell.icon)"
            class="inv-panel__cell-icon"
            :alt="cell.name"
          />
          <span v-else-if="cell" class="inv-panel__cell-name">{{ cell.name }}</span>
        </div>
      </div>
    </div>

    <!-- Контекстное меню списка предметов -->
    <Teleport to="body">
      <div
        v-if="ctx.visible"
        class="inv-ctx"
        :style="{ top: `${ctx.y}px`, left: `${ctx.x}px` }"
        @mouseleave="closeCtx"
      >
        <p class="inv-ctx__title">Поместить предмет</p>
        <p v-if="!itemsStore.items.length" class="inv-ctx__empty">
          Нет созданных предметов.
          <br />
          Создайте во вкладке &laquo;Создание предметов&raquo;
        </p>
        <button
          v-for="item in itemsStore.items"
          :key="item.id"
          class="inv-ctx__item"
          @click="placeItem(item)"
        >
          <img
            v-if="item.icon"
            :src="gameIconUrl(item.icon)"
            class="inv-ctx__item-icon"
            :alt="item.name"
          />
          <span v-else class="inv-ctx__item-icon-placeholder">?</span>
          <span>{{ item.name }}</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted } from 'vue'
  import { useItemsStore } from '../stores/items'

  const itemsStore = useItemsStore()

  // ─── Состояние ячеек сумки ──────────────────────────────────────────
  // index → item (null = пусто)
  const cells = ref(Array(20).fill(null))

  // ─── Контекстное меню ───────────────────────────────────────────────
  const ctx = ref({ visible: false, x: 0, y: 0, cellIdx: null })

  function gameIconUrl(slug) {
    return `https://api.iconify.design/game-icons:${slug}.svg`
  }

  function openCtx(event, cellIdx) {
    ctx.value = { visible: true, x: event.clientX, y: event.clientY, cellIdx }
  }

  function closeCtx() {
    ctx.value.visible = false
  }

  function placeItem(item) {
    if (ctx.value.cellIdx !== null) {
      cells.value[ctx.value.cellIdx] = item
    }
    closeCtx()
  }

  // Закрытие по клику вне меню
  function onDocClick() {
    if (ctx.value.visible) closeCtx()
  }

  onMounted(() => document.addEventListener('click', onDocClick, true))
  onUnmounted(() => document.removeEventListener('click', onDocClick, true))
</script>

<style scoped>
  /* ── Корневой контейнер ─────────────────────────────────────────────── */

  .inv-panel {
    display: flex;
    gap: var(--space-6);
    align-items: flex-start;
  }

  /* ── Бумажная кукла ─────────────────────────────────────────────────── */

  .inv-panel__doll {
    position: relative;
    width: 320px;
    height: 470px;
    flex-shrink: 0;
  }

  .inv-panel__silhouette {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;

    /* Призрачный силуэт — намекает на зоны надевания */
    fill: var(--color-primary);
    opacity: 0.08;
  }

  /* ── Базовый стиль ячейки экипировки ───────────────────────────────── */

  .inv-panel__slot {
    position: absolute;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(0 0 0 / 40%);
    border: 1px solid rgb(200 154 74 / 30%);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast);

    &:hover {
      border-color: var(--color-primary);
      background: rgb(200 154 74 / 8%);
    }
  }

  .inv-panel__slot-label {
    font-size: 7px;
    font-family: var(--font-ui);
    color: var(--color-text-muted);
    text-align: center;
    line-height: 1.1;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    pointer-events: none;
    user-select: none;
  }

  /* ── Позиции каждой ячейки ──────────────────────────────────────────── */

  /* Центрирование по горизонтали: left: calc(50% - 22px) */

  .inv-panel__slot--helmet {
    top: 2px;
    left: calc(50% - 22px);
  }

  .inv-panel__slot--amulet {
    top: 90px;
    left: calc(50% - 22px);
  }

  /* Плащ — справа от шеи */
  .inv-panel__slot--cloak {
    top: 84px;
    right: 5px;
  }

  .inv-panel__slot--armor {
    top: 165px;
    left: calc(50% - 22px);
  }

  /* Руки — по бокам на уровне груди */
  .inv-panel__slot--weapon {
    top: 198px;
    left: 5px;
  }

  .inv-panel__slot--offhand {
    top: 198px;
    right: 5px;
  }

  /* Перчатки — под оружием (левая рука) */
  .inv-panel__slot--gloves {
    top: 252px;
    left: 5px;
  }

  .inv-panel__slot--belt {
    top: 252px;
    left: calc(50% - 22px);
  }

  .inv-panel__slot--legs {
    top: 310px;
    left: calc(50% - 22px);
  }

  .inv-panel__slot--boots {
    top: 416px;
    left: calc(50% - 22px);
  }

  /* Кольца — по бокам от сапог */
  .inv-panel__slot--ring-left {
    top: 416px;
    left: 5px;
  }

  .inv-panel__slot--ring-right {
    top: 416px;
    right: 5px;
  }

  /* ── Сетка вещей ────────────────────────────────────────────────────── */

  .inv-panel__bag {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    height: 470px;
  }

  .inv-panel__bag-title {
    margin: 0;
    font-size: 11px;
    font-family: var(--font-ui);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .inv-panel__grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(5, 1fr);
    gap: 6px;
  }

  .inv-panel__cell {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(0 0 0 / 40%);
    border: 1px solid rgb(200 154 74 / 20%);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast);

    &:hover {
      border-color: var(--color-primary);
      background: rgb(200 154 74 / 8%);
    }
  }

  .inv-panel__cell-icon {
    width: 60%;
    height: 60%;
    object-fit: contain;
    filter: invert(1) sepia(1) saturate(2) hue-rotate(5deg) brightness(0.85);
    pointer-events: none;
  }

  .inv-panel__cell-name {
    font-size: 8px;
    font-family: var(--font-ui);
    color: var(--color-text-muted);
    text-align: center;
    line-height: 1.1;
    padding: 2px;
    overflow: hidden;
    overflow-wrap: break-word;
  }

  /* ── Контекстное меню списка предметов ────────────────────────────── */

  .inv-ctx {
    position: fixed;
    z-index: var(--z-popup, 300);
    min-width: 200px;
    max-width: 280px;
    background: var(--color-surface);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-md);
    padding: var(--space-2);
    box-shadow:
      0 8px 32px rgb(0 0 0 / 70%),
      0 0 10px var(--color-primary-glow);
  }

  .inv-ctx__title {
    margin: 0 0 var(--space-2);
    padding: 0 var(--space-2);
    font-size: 11px;
    font-family: var(--font-ui);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-1);
  }

  .inv-ctx__empty {
    margin: var(--space-2) 0;
    padding: 0 var(--space-2);
    font-size: 12px;
    font-family: var(--font-ui);
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .inv-ctx__item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-1) var(--space-2);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-family: var(--font-ui);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    transition: background var(--transition-fast);

    &:hover {
      background: rgb(200 154 74 / 12%);
      color: var(--color-primary);
    }
  }

  .inv-ctx__item-icon {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    object-fit: contain;
    filter: invert(1) sepia(1) saturate(2) hue-rotate(5deg) brightness(0.85);
  }

  .inv-ctx__item-icon-placeholder {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: var(--color-text-muted);
  }
</style>
