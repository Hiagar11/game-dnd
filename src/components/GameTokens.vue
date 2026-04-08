<template>
  <!--
    Слой токенов на карте — четвёртый слой (поверх сетки, под туманом).
    Каждый токен позиционируется абсолютно внутри слоя по col/row * cellSize.
    pointer-events: none на контейнере — клики проходят сквозь пустое пространство.
    Сами токены включают pointer-events обратно через CSS (see .game-tokens__token).
  -->
  <div class="game-tokens" :style="{ width: `${width}px`, height: `${height}px` }">
    <div
      v-for="placed in store.placedTokens"
      :key="placed.uid"
      class="game-tokens__token"
      :class="{
        'game-tokens__token--selected': store.selectedPlacedUid === placed.uid,
        'game-tokens__token--shaking': store.shakingTokenUid === placed.uid,
        'game-tokens__token--fog-hidden': fogHiddenKeys.has(`${placed.col}:${placed.row}`),
      }"
      :style="{
        left: `${placed.col * store.cellSize}px`,
        top: `${placed.row * store.cellSize}px`,
        width: `${store.cellSize}px`,
        height: `${store.cellSize}px`,
      }"
      @click.stop="!props.viewerMode && (store.selectPlacedToken(placed.uid), closeContextMenu())"
      @dblclick.stop="!props.viewerMode && onDblClick(placed)"
      @contextmenu.stop.prevent="!props.viewerMode && onContextMenu(placed)"
    >
      <!--
        Меню рендерится ДО картинки в DOM, чтобы быть визуально за ней.
        Дополнительно: img имеет z-index: 1, меню — z-index: 0.
      -->
      <GameTokenContextMenu
        v-if="!props.viewerMode"
        :visible="ctxState.uid === placed.uid && ctxState.visible"
        @remove="handleRemove(placed.uid)"
        @edit="handleEdit(placed.uid)"
      />
      <img :src="placed.src" :alt="placed.name" class="game-tokens__img" draggable="false" />
    </div>
  </div>

  <!--
    Попап редактирования живёт здесь — открывается при нажатии ≡ в контекстном меню.
    tokenId передаётся для заполнения формы текущими данными токена.
    При закрытии сбрасываем editTokenId в null.
  -->
  <template v-if="!props.viewerMode">
    <GameTokenEditPopup
      :visible="editPlacedUid !== null"
      :placed-uid="editPlacedUid"
      @close="editPlacedUid = null"
    />

    <GameDoorPopup
      :visible="doorPlacedUid !== null"
      :placed-uid="doorPlacedUid"
      @close="doorPlacedUid = null"
    />
  </template>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useGameStore } from '../stores/game'
  import { useFogVisibility } from '../composables/useFogVisibility'
  import { useTokenContextMenu } from '../composables/useTokenContextMenu'
  import { wasDragged } from '../composables/useMapPan'
  import { useSocket } from '../composables/useSocket'
  import GameTokenContextMenu from './GameTokenContextMenu.vue'
  import GameTokenEditPopup from './GameTokenEditPopup.vue'
  import GameDoorPopup from './GameDoorPopup.vue'

  const props = defineProps({
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    // viewerMode: true — режим зрителя: нет контекстного меню, попапов и drag-событий
    viewerMode: { type: Boolean, default: false },
  })

  const emit = defineEmits(['door-transition'])

  const store = useGameStore()
  const { visitedNotCurrentSet } = useFogVisibility()
  const { state: ctxState, open: openContextMenu, close: closeContextMenu } = useTokenContextMenu()

  // Ключи «col:row» токенов, которые нужно скрыть туманом.
  // Когда туман выключен (админ), возвращаем пустой Set — все токены видны.
  // visitedNotCurrentSet реактивен: обновляется при движении героев.
  const fogHiddenKeys = computed(() => (store.fogEnabled ? visitedNotCurrentSet.value : new Set()))
  const { getSocket } = useSocket()
  // Правый клик: выбираем токен, открываем меню.
  // Повторный правый клик по тому же токену закрывает меню (тоггл).
  // Если перед этим было перетаскивание карты — игнорируем: contextmenu
  // всегда стреляет после mouseup, даже если пользователь просто тащил карту.
  function onContextMenu(placed) {
    if (wasDragged.value) return

    // selectPlacedToken имеет тоггл-логику: повторный вызов на уже выбранном
    // токене снял бы выделение. Поэтому выбираем только если не выбран.
    if (store.selectedPlacedUid !== placed.uid) {
      store.selectPlacedToken(placed.uid)
    }

    if (ctxState.value.visible && ctxState.value.uid === placed.uid) {
      closeContextMenu()
    } else {
      openContextMenu(placed.uid)
    }
  }

  function handleRemove(uid) {
    store.removeToken(uid)
    const scenarioId = String(store.currentScenario?.id ?? '')
    if (scenarioId) getSocket()?.emit('token:remove', { scenarioId, uid })
    closeContextMenu()
  }

  const editPlacedUid = ref(null)
  const doorPlacedUid = ref(null)

  function handleEdit(uid) {
    const placed = store.placedTokens.find((t) => t.uid === uid)
    closeContextMenu()
    if (placed?.systemToken === 'door') {
      doorPlacedUid.value = uid
    } else {
      editPlacedUid.value = uid
    }
  }

  function onDblClick(placed) {
    if (placed.systemToken === 'door' && placed.targetScenarioId) {
      const sourceScenarioId = store.currentScenario?.id ?? null
      emit('door-transition', { targetScenarioId: placed.targetScenarioId, sourceScenarioId })
    }
  }
</script>

<style scoped>
  .game-tokens {
    position: absolute;
    top: 0;
    left: 0;
    z-index: var(--z-tokens);

    /* Пустое пространство слоя не перехватывает клики — проходят к карте */
    pointer-events: none;
  }

  .game-tokens__token {
    position: absolute;
    padding: 4px;

    /* Включаем клики обратно только на самом токене */
    pointer-events: auto;
    cursor: pointer;

    /*
      Плавное перемещение при смене col/row через moveToken().
      left и top меняются мгновенно в JS, а transition анимирует их.
      0.35s — пауза достаточная, чтобы движение выглядело плавным, но не затяжным.
    */
    transition:
      left 0.35s ease,
      top 0.35s ease;
  }

  /*
    Токен в посещённой (dim) зоне — скрыт, но сохраняет своё место в потоке.
    pointer-events: none — не реагирует на клики пока невидим.
    Туман (fog GIF) отображается поверх: unvisited-клетки уже скрыты им;
    visited-клетки скрыты этим правилом.
  */
  .game-tokens__token--fog-hidden {
    visibility: hidden;
    pointer-events: none;
  }

  .game-tokens__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: var(--radius-full);

    /*
      position: relative + z-index: 1 гарантируют, что картинка токена
      всегда поверх контекстного меню (z-index: 0).
    */
    position: relative;
    z-index: 1;
  }

  /*
    Вращающийся бордер через ::before + conic-gradient + CSS mask.

    Как это работает:
    1. ::before занимает всю площадь токена (inset: 0).
    2. padding: 3px создаёт «кольцо» — разницу между content-box и border-box.
    3. background: conic-gradient рисует конический градиент на всём круге.
    4. mask убирает внутреннюю часть (content-box), оставляя только кольцо:
         - первая маска: content-box (внутренний круг) — белый = видимый
         - вторая маска: весь элемент — белый = видимый
         - mask-composite: exclude = XOR: видно только то, что есть в одной маске
           → остаётся только кольцо шириной padding.
    5. animation вращает ::before — вместе с ним вращается и градиент.
  */

  .game-tokens__token--selected::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: var(--radius-full);
    padding: 3px;
    background: conic-gradient(
      var(--color-primary) 0deg,
      var(--color-primary-dark) 90deg,
      transparent 160deg,
      transparent 200deg,
      var(--color-primary-dark) 270deg,
      var(--color-primary) 360deg
    );
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask-composite: exclude;
    animation: token-spin 3s linear infinite;
  }

  @keyframes token-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Тряска токена — запускается когда дверь не настроена перед сохранением */
  .game-tokens__token--shaking .game-tokens__img {
    animation: token-shake 0.65s ease;
  }

  @keyframes token-shake {
    0%,
    100% {
      transform: translateX(0) rotate(0);
    }

    15% {
      transform: translateX(-7px) rotate(-4deg);
    }

    30% {
      transform: translateX(7px) rotate(4deg);
    }

    45% {
      transform: translateX(-6px) rotate(-3deg);
    }

    60% {
      transform: translateX(6px) rotate(3deg);
    }

    75% {
      transform: translateX(-3px) rotate(-1deg);
    }

    90% {
      transform: translateX(3px) rotate(1deg);
    }
  }
</style>
