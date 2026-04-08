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
        'game-tokens__token--viewer-selected':
          props.viewerMode && heroesStore.selectedUid === placed.uid,
        'game-tokens__token--admin-selected':
          props.viewerMode && heroesStore.adminSelectedUid === placed.uid,
        'game-tokens__token--shaking': store.shakingTokenUid === placed.uid,
        'game-tokens__token--fog-hidden': fogHiddenKeys.has(`${placed.col}:${placed.row}`),
        // Золотое свечение для героев — всегда, во всех режимах
        'game-tokens__token--hero': placed.tokenType === 'hero',
        // Цветная рамка по отношению — только для пользовательских НПС (не системные, не герои)
        'game-tokens__token--hostile': placed.tokenType === 'npc' && placed.attitude === 'hostile',
        'game-tokens__token--friendly':
          placed.tokenType === 'npc' && placed.attitude === 'friendly',
        'game-tokens__token--neutral':
          placed.tokenType === 'npc' &&
          placed.attitude !== 'hostile' &&
          placed.attitude !== 'friendly',
        // Курсор мечи/пузыря над НПС, когда выбран герой и НПС в зоне достижимости
        'game-tokens__token--cursor-attack':
          !props.viewerMode &&
          placed.tokenType === 'npc' &&
          placed.attitude === 'hostile' &&
          isNpcReachable(placed),
        'game-tokens__token--cursor-talk':
          !props.viewerMode &&
          placed.tokenType === 'npc' &&
          (placed.attitude === 'neutral' || placed.attitude === 'friendly') &&
          isNpcReachable(placed),
      }"
      :style="{
        left: `${placed.col * store.cellSize}px`,
        top: `${placed.row * store.cellSize}px`,
        width: `${store.cellSize}px`,
        height: `${store.cellSize}px`,
      }"
      @click.stop="
        props.viewerMode
          ? onViewerClick(placed)
          : (store.selectPlacedToken(placed.uid), closeContextMenu())
      "
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
      :token-type="store.placedTokens.find((t) => t.uid === editPlacedUid)?.tokenType ?? 'npc'"
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
  import { useHeroesStore } from '../stores/heroes'
  import { useFogVisibility } from '../composables/useFogVisibility'
  import { useTokenContextMenu } from '../composables/useTokenContextMenu'
  import { wasDragged } from '../composables/useMapPan'
  import { useSocket } from '../composables/useSocket'
  import { buildReachableCells } from '../composables/useTokenMove'
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
  const heroesStore = useHeroesStore()
  const { visitedNotCurrentSet } = useFogVisibility()
  const { state: ctxState, open: openContextMenu, close: closeContextMenu } = useTokenContextMenu()

  // Ключи «col:row» токенов, которые нужно скрыть туманом.
  // Когда туман выключен (админ), возвращаем пустой Set — все токены видны.
  // visitedNotCurrentSet реактивен: обновляется при движении героев.
  const fogHiddenKeys = computed(() => (store.fogEnabled ? visitedNotCurrentSet.value : new Set()))
  const { getSocket } = useSocket()

  // Клетки в зоне достижимости выбранного героя — нужны для определения курсора над НПС
  const heroReachable = computed(() => {
    const sel = store.placedTokens.find((t) => t.uid === store.selectedPlacedUid)
    if (!sel || sel.systemToken || sel.tokenType !== 'hero') return new Set()
    return buildReachableCells(sel, store.walls)
  })

  const DIRS = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]

  // Проверяет, есть ли хотя бы одна соседняя клетка НПС в зоне достижимости героя
  function isNpcReachable(placed) {
    const r = heroReachable.value
    if (!r.size) return false
    return DIRS.some(([dc, dr]) => r.has(`${placed.col + dc},${placed.row + dr}`))
  }

  // ── Выделение в режиме зрителя ────────────────────────────────────────────
  // Зритель может выбрать героя кликом — уходит в heroesStore.selectedUid,
  // читается там же в useGridDraw для отрисовки зелёной зоны.
  // Set ID героев — для проверки по tokenId разместённого токена
  const heroIds = computed(() => new Set(heroesStore.heroes.map((h) => h.id)))

  function onViewerClick(placed) {
    // Клик на героя — выбираем / снимаем выделение
    if (heroIds.value.has(placed.tokenId)) {
      heroesStore.selectedUid = heroesStore.selectedUid === placed.uid ? null : placed.uid
    }
  }
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

  /*
    Выделение на стороне зрителя — пульсирующее зелёное кольцо.
    Отличается от admin-выделения (вращающийся градиент) чтобы визуально
    разграничить «выбрал мастер» и «выбрал игрок».
  */

  /*
    Выделение токена мастером — золотое/янтарное кольцо.
    Отличается от зелёного кольца игрока.
  */
  .game-tokens__token--admin-selected::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: var(--radius-full);
    padding: 3px;
    background: conic-gradient(
      rgb(250 204 21) 0deg,
      rgb(234 179 8) 90deg,
      transparent 160deg,
      transparent 200deg,
      rgb(234 179 8) 270deg,
      rgb(250 204 21) 360deg
    );
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask-composite: exclude;
    animation: token-spin 2s linear infinite;
  }

  .game-tokens__token--viewer-selected::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: var(--radius-full);
    padding: 3px;
    background: conic-gradient(
      rgb(74 222 128) 0deg,
      rgb(34 197 94) 90deg,
      transparent 160deg,
      transparent 200deg,
      rgb(34 197 94) 270deg,
      rgb(74 222 128) 360deg
    );
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask-composite: exclude;
    animation: token-spin 3s linear infinite;
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

  /*
    Цветная рамка отношения НПС — outline на самом диве токена.
    outline не сдвигает layout (в отличие от border) и рисуется поверх padding, поэтому
    всегда виден независимо от других псевдоэлементов.
    Дефолт (neutral) — синий, friendly — зелёный, hostile — красный.
  */

  /* Герои — золотое свечение, всегда видно на карте */
  .game-tokens__token--hero {
    outline: 2px solid rgb(250 204 21 / 95%);
    outline-offset: -2px;
    border-radius: var(--radius-full);
    filter: drop-shadow(0 0 5px rgb(250 204 21 / 65%));
  }

  .game-tokens__token--neutral {
    outline: 2px solid rgb(96 165 250 / 80%);
    outline-offset: -2px;
    border-radius: var(--radius-full);
  }

  .game-tokens__token--hostile {
    outline: 2px solid rgb(248 113 113 / 90%);
    outline-offset: -2px;
    border-radius: var(--radius-full);
  }

  .game-tokens__token--friendly {
    outline: 2px solid rgb(74 222 128 / 90%);
    outline-offset: -2px;
    border-radius: var(--radius-full);
  }

  /* Курсор «мечи» — враждебный НПС в зоне атаки героя */
  .game-tokens__token--cursor-attack {
    cursor:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cg transform='rotate(-45 20 20)' opacity='0.95'%3E%3Crect x='18.5' y='4' width='3' height='22' rx='1' fill='%23f87171'/%3E%3Crect x='14' y='10' width='12' height='2.5' rx='1' fill='%23fca5a5'/%3E%3Cpolygon points='20,2 18,6 22,6' fill='%23fca5a5'/%3E%3C/g%3E%3Cg transform='rotate(45 20 20)' opacity='0.70'%3E%3Crect x='18.5' y='4' width='3' height='22' rx='1' fill='%23f87171'/%3E%3Crect x='14' y='10' width='12' height='2.5' rx='1' fill='%23fca5a5'/%3E%3Cpolygon points='20,2 18,6 22,6' fill='%23fca5a5'/%3E%3C/g%3E%3C/svg%3E")
        20 20,
      crosshair;
  }

  /* Курсор «пузырь» — нейтральный/союзный НПС в зоне диалога героя */
  .game-tokens__token--cursor-talk {
    cursor:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect x='6' y='6' width='22' height='16' rx='4' fill='%2360a5fa' opacity='0.9'/%3E%3Cpolygon points='10,22 8,28 16,22' fill='%2360a5fa' opacity='0.9'/%3E%3Ccircle cx='13' cy='14' r='2' fill='white'/%3E%3Ccircle cx='18' cy='14' r='2' fill='white'/%3E%3Ccircle cx='23' cy='14' r='2' fill='white'/%3E%3C/svg%3E")
        20 20,
      pointer;
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
