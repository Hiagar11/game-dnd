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
        // Курсор мечи/пузыря над НПС (выбран герой) или над героем (выбран враг)
        'game-tokens__token--cursor-attack':
          !props.viewerMode &&
          ((placed.tokenType === 'npc' &&
            placed.attitude === 'hostile' &&
            isNpcReachable(placed)) ||
            (placed.tokenType === 'hero' && isHeroReachableByNpc(placed))),
        'game-tokens__token--cursor-talk':
          !props.viewerMode &&
          placed.tokenType === 'npc' &&
          (placed.attitude === 'neutral' || placed.attitude === 'friendly') &&
          isNpcReachable(placed),
        // Курсор перехода — над дверью когда выбран не-системный токен
        'game-tokens__token--cursor-door':
          !props.viewerMode &&
          placed.systemToken === 'door' &&
          !!placed.targetScenarioId &&
          isNonSystemSelected.value,
        'game-tokens__token--flash-hit': flashMap.get(placed.uid) === 'hit',
        'game-tokens__token--flash-miss': flashMap.get(placed.uid) === 'miss',
        'game-tokens__token--active-turn': currentTurnUid === placed.uid,
      }"
      :style="{
        left: `${placed.col * store.cellSize}px`,
        top: `${placed.row * store.cellSize}px`,
        width: `${store.cellSize}px`,
        height: `${store.cellSize}px`,
        '--cell': `${store.cellSize}px`,
      }"
      @click.stop="props.viewerMode ? onViewerClick(placed) : onTokenClick(placed, $event)"
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
        :system-token="!!placed.systemToken"
        @remove="handleRemove(placed.uid)"
        @edit="handleEdit(placed.uid)"
        @abilities="closeContextMenu()"
        @inventory="closeContextMenu()"
      />
      <!-- Облако диалога: умное позиционирование — не выходит за вьюпорт, закрывается снаружи -->
      <GameDialogBubble
        v-if="dialogBubbles.has(placed.uid)"
        :text="dialogBubbles.get(placed.uid)"
      />
      <!-- Столб золотого свечения активного хода — рендерится только для текущего токена -->
      <div v-if="currentTurnUid === placed.uid" class="game-tokens__turn-pillar" />
      <img :src="placed.src" :alt="placed.name" class="game-tokens__img" draggable="false" />
    </div>
  </div>

  <!--
    Попап редактирования живёт здесь — открывается при нажатии ≡ в контекстном меню.
    tokenId передаётся для заполнения формы текущими данными токена.
    При закрытии сбрасываем editTokenId в null.
  -->
  <!-- Значок боя: появляется после того, как герой подошёл вплотную к врагу -->
  <Transition name="combat">
    <div
      v-if="combatIconPos"
      class="game-tokens__combat-icon"
      :style="{ left: `${combatIconPos.x}px`, top: `${combatIconPos.y}px` }"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 40 40">
        <g transform="rotate(-45 20 20)" opacity="0.95">
          <rect x="18.5" y="4" width="3" height="22" rx="1" fill="#f87171" />
          <rect x="14" y="10" width="12" height="2.5" rx="1" fill="#fca5a5" />
          <polygon points="20,2 18,6 22,6" fill="#fca5a5" />
        </g>
        <g transform="rotate(45 20 20)" opacity="0.85">
          <rect x="18.5" y="4" width="3" height="22" rx="1" fill="#f87171" />
          <rect x="14" y="10" width="12" height="2.5" rx="1" fill="#fca5a5" />
          <polygon points="20,2 18,6 22,6" fill="#fca5a5" />
        </g>
      </svg>
    </div>
  </Transition>

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

  <!-- Всплывающие цифры урона — поверх всех токенов -->
  <DamageFloat ref="damageFloatRef" />
</template>

<script setup>
  import { ref, computed, watch, onUnmounted } from 'vue'
  import { useGameStore } from '../stores/game'
  import { useHeroesStore } from '../stores/heroes'
  import { useFogVisibility } from '../composables/useFogVisibility'
  import { useTokenContextMenu } from '../composables/useTokenContextMenu'
  import { wasDragged } from '../composables/useMapPan'
  import { useSocket } from '../composables/useSocket'
  import { buildReachableCells, findPath } from '../composables/useTokenMove'
  import { playSuccess, playFist } from '../composables/useSound'
  import GameTokenContextMenu from './GameTokenContextMenu.vue'
  import GameTokenEditPopup from './GameTokenEditPopup.vue'
  import GameDoorPopup from './GameDoorPopup.vue'
  import DamageFloat from './DamageFloat.vue'
  import GameDialogBubble from './GameDialogBubble.vue'

  const props = defineProps({
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    // viewerMode: true — режим зрителя: нет контекстного меню, попапов и drag-событий
    viewerMode: { type: Boolean, default: false },
  })

  const emit = defineEmits(['door-transition'])

  const store = useGameStore()
  const heroesStore = useHeroesStore()
  const { visitedNotCurrentSet, currentCells } = useFogVisibility()

  // ref на компонент DamageFloat — вызываем spawn() при нанесении урона
  const damageFloatRef = ref(null)

  // uid токена → текст облака диалога. Map позволяет нескольким НПС говорить одновременно.
  const dialogBubbles = ref(new Map())

  // Map uid → функция очистки (снимает document-слушатель кликов снаружи)
  const bubbleCleanups = new Map()

  // Закрыть облако конкретного токена и снять слушатель
  function closeBubble(uid) {
    const m = new Map(dialogBubbles.value)
    m.delete(uid)
    dialogBubbles.value = m
    bubbleCleanups.get(uid)?.()
    bubbleCleanups.delete(uid)
  }

  // Показывает облако диалога. Закрывается по клику вне облака (без таймера).
  function showDialogBubble(uid, text) {
    // Сначала закрываем предыдущее облако этого токена, если было
    closeBubble(uid)

    const next = new Map(dialogBubbles.value)
    next.set(uid, text)
    dialogBubbles.value = next

    // Запускаем слушатель с задержкой, чтобы не поймать текущий клик
    const timer = setTimeout(() => {
      function onOutsideClick(e) {
        // composedPath позволяет правильно проверить клики внутри shadow DOM
        const insideBubble = e.composedPath().some((el) => el.classList?.contains('dialog-bubble'))
        if (!insideBubble) closeBubble(uid)
      }
      // capture: true — перехватываем до любого .stop в дочерних элементах
      document.addEventListener('click', onOutsideClick, true)
      bubbleCleanups.set(uid, () => document.removeEventListener('click', onOutsideClick, true))
    }, 150)

    // Пока таймер не сработал — cleanups хранит отмену таймера
    bubbleCleanups.set(uid, () => clearTimeout(timer))
  }

  // Снимаем все слушатели при размонтировании компонента
  onUnmounted(() => {
    for (const cleanup of bubbleCleanups.values()) cleanup()
    bubbleCleanups.clear()
  })

  // uid → 'hit' | 'miss' — токены с активным flash-эффектом
  const flashMap = ref(new Map())

  // uid токена, чей сейчас ход (боевой режим) — для анимации активного хода
  const currentTurnUid = computed(() => {
    if (!store.combatMode) return null
    return store.initiativeOrder[store.currentInitiativeIndex]?.uid ?? null
  })

  // Возвращает Set видимых клеток когда туман включён, иначе null (все токены участвуют)
  const getVisibleKeys = () => (store.fogEnabled ? currentCells.value : null)
  const { state: ctxState, open: openContextMenu, close: closeContextMenu } = useTokenContextMenu()

  // Ключи «col:row» токенов, которые нужно скрыть туманом.
  // Когда туман выключен (админ), возвращаем пустой Set — все токены видны.
  // visitedNotCurrentSet реактивен: обновляется при движении героев.
  const fogHiddenKeys = computed(() => (store.fogEnabled ? visitedNotCurrentSet.value : new Set()))
  const { getSocket } = useSocket()

  // true — выбран не-системный токен (нужно для отображения курсора перехода на дверях)
  const isNonSystemSelected = computed(() => {
    const sel = store.placedTokens.find((t) => t.uid === store.selectedPlacedUid)
    return !!(sel && !sel.systemToken)
  })

  // Клетки в зоне достижимости выбранного героя — нужны для определения курсора над НПС
  const heroReachable = computed(() => {
    const sel = store.placedTokens.find((t) => t.uid === store.selectedPlacedUid)
    if (!sel || sel.systemToken || sel.tokenType !== 'hero') return new Set()
    const ap = sel.actionPoints ?? 0
    if (ap <= 0) return new Set()
    const occupied = new Set(
      store.placedTokens.filter((t) => t.uid !== sel.uid).map((t) => `${t.col},${t.row}`)
    )
    return buildReachableCells(sel, store.walls, ap, occupied)
  })

  // Следим за позициями токенов: как только враг входит в зону AP любого героя —
  // автоматически начинается боевой режим.
  watch(
    () => store.placedTokens.map((t) => `${t.uid}:${t.col}:${t.row}:${t.actionPoints}`),
    () => {
      if (store.combatMode) return
      const heroes = store.placedTokens.filter((t) => t.tokenType === 'hero')
      const hostiles = store.placedTokens.filter(
        (t) => t.tokenType === 'npc' && t.attitude === 'hostile'
      )
      if (!heroes.length || !hostiles.length) return

      for (const hero of heroes) {
        const ap = hero.actionPoints ?? 0
        if (ap <= 0) continue
        const zone = buildReachableCells(hero, store.walls, ap)
        const enemy = hostiles.find((npc) => zone.has(`${npc.col},${npc.row}`))
        if (enemy) {
          // Враг вошёл в зону первым → он встаёт первым в инициативу
          store.enterCombat(enemy.uid, getVisibleKeys())
          return
        }
      }
    },
    { deep: false }
  )

  // 8 направлений: 4 стороны + 4 диагонали
  const DIRS = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]

  // Проверяет, есть ли хотя бы одна соседняя клетка НПС в зоне достижимости героя
  function isNpcReachable(placed) {
    const r = heroReachable.value
    if (!r.size) return false
    return DIRS.some(([dc, dr]) => r.has(`${placed.col + dc},${placed.row + dr}`))
  }

  // Клетки в зоне достижимости выбранного враждебного НПС — для курсора над героями
  const npcReachable = computed(() => {
    const sel = store.placedTokens.find((t) => t.uid === store.selectedPlacedUid)
    if (!sel || sel.systemToken || sel.tokenType !== 'npc' || sel.attitude !== 'hostile')
      return new Set()
    const ap = sel.actionPoints ?? 0
    if (ap <= 0) return new Set()
    const occupied = new Set(
      store.placedTokens.filter((t) => t.uid !== sel.uid).map((t) => `${t.col},${t.row}`)
    )
    return buildReachableCells(sel, store.walls, ap, occupied)
  })

  // Проверяет, находится ли герой в зоне достижимости выбранного НПС
  function isHeroReachableByNpc(placed) {
    if (!npcReachable.value.size) return false
    return DIRS.some(([dc, dr]) => npcReachable.value.has(`${placed.col + dc},${placed.row + dr}`))
  }

  // ── Выделение в режиме зрителя ────────────────────────────────────────────
  // Зритель может выбрать героя кликом — уходит в heroesStore.selectedUid,
  // читается там же в useGridDraw для отрисовки зелёной зоны.
  // Set ID героев — для проверки по tokenId разместённого токена
  const heroIds = computed(() => new Set(heroesStore.heroes.map((h) => h.id)))

  // Таймер для разделения одиночного и двойного клика.
  // Браузер при dblclick генерирует: click → click → dblclick.
  // Без задержки onTokenClick срабатывает раньше onDblClick и атака запускается вместо выделения.
  let clickTimer = null
  const DBLCLICK_DELAY = 220 // мс — чуть больше стандартного браузерного порога

  // ── Боевые формулы (дублируют GameCombatPopup, чтобы не тащить зависимость) ──
  const HIT_DC = 10
  function calcCritChance(t) {
    return Math.floor(((t?.agility ?? 0) * 2 + (t?.strength ?? 0)) / 5)
  }
  function calcDamageBonus(t) {
    return Math.floor(((t?.strength ?? 0) * 2 + (t?.agility ?? 0)) / 5)
  }

  // Воспроизводит flash на токене-защищающемся: 'hit' (красный) или 'miss' (синий)
  function flashToken(uid, type) {
    flashMap.value = new Map(flashMap.value).set(uid, type)
    setTimeout(() => {
      const next = new Map(flashMap.value)
      next.delete(uid)
      flashMap.value = next
    }, 600)
  }

  // Мгновенный бой без попапа: вызывается по Ctrl+Click
  function runQuickAttack(attackerToken, defenderToken) {
    if (!store.spendActionPoint(attackerToken.uid)) {
      // AP закончились ещё на движении — ход всё равно завершаем, иначе зависнет
      store.endTurn()
      return
    }

    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + calcCritChance(attackerToken)

    if (total >= HIT_DC) {
      // Попал — красный flash на защищающемся
      flashToken(defenderToken.uid, 'hit')
      playSuccess()

      const d4 = Math.floor(Math.random() * 4) + 1
      const dmgTotal = d4 + calcDamageBonus(attackerToken)

      // Применяем урон
      const liveDefender = store.placedTokens.find((t) => t.uid === defenderToken.uid)
      if (liveDefender) {
        store.editPlacedToken(liveDefender.uid, {
          hp: Math.max(0, (liveDefender.hp ?? 0) - dmgTotal),
        })
      }
      playFist()

      // Всплывающая цифра урона
      const cell = store.cellSize
      const x = defenderToken.col * cell + cell / 2
      const y = defenderToken.row * cell + cell / 2
      damageFloatRef.value?.spawn(defenderToken.uid, `-${dmgTotal}`, x, y)
    } else {
      // Промах — синий flash на защищающемся
      flashToken(defenderToken.uid, 'miss')
    }

    // Экспресс-атака всегда завершает ход автоматически
    store.endTurn()
  }

  // Двигает attackerUid к клетке вплотную к targetToken, тратя AP на шаги.
  // Возвращает true если атакующий уже вплотную или успешно дошёл, false если путь недоступен.
  // reachableSet — Set достижимых клеток атакующего (heroReachable / npcReachable).
  async function moveAdjacentTo(attackerUid, targetToken, reachableSet) {
    const attacker = store.placedTokens.find((t) => t.uid === attackerUid)
    if (!attacker) return false

    // Уже вплотную — движение не нужно
    const alreadyAdjacent = DIRS.some(
      ([dc, dr]) => targetToken.col + dc === attacker.col && targetToken.row + dr === attacker.row
    )
    if (alreadyAdjacent) return true

    // Соседние клетки цели, которые атакующий может достичь
    const adjacent = DIRS.map(([dc, dr]) => ({
      col: targetToken.col + dc,
      row: targetToken.row + dr,
    })).filter((cell) => reachableSet.has(`${cell.col},${cell.row}`))

    if (!adjacent.length) return false

    // Ближайшая к атакующему по Манхэттену
    const dest = adjacent.reduce((best, cell) => {
      const d = Math.abs(cell.col - attacker.col) + Math.abs(cell.row - attacker.row)
      const bd = Math.abs(best.col - attacker.col) + Math.abs(best.row - attacker.row)
      return d < bd ? cell : best
    })

    const path = findPath(
      attacker,
      dest,
      store.walls,
      attacker.actionPoints ?? 0,
      new Set(
        store.placedTokens.filter((t) => t.uid !== attackerUid).map((t) => `${t.col},${t.row}`)
      )
    )
    if (path === null) return false

    const scenarioId = String(store.currentScenario?.id ?? '')

    for (const step of path) {
      if (!store.spendActionPoint(attackerUid)) break
      store.moveToken(attackerUid, step.col, step.row)
      if (scenarioId) {
        getSocket()?.emit('token:move', {
          scenarioId,
          uid: attackerUid,
          col: step.col,
          row: step.row,
        })
      }
      await new Promise((resolve) => setTimeout(resolve, 380))
    }

    // Проверяем, дошли ли вплотную после движения
    const arrived = store.placedTokens.find((t) => t.uid === attackerUid)
    if (!arrived) return false
    return DIRS.some(
      ([dc, dr]) => targetToken.col + dc === arrived.col && targetToken.row + dr === arrived.row
    )
  }

  // Двигает attackerUid максимально близко к targetToken, расходуя все доступные AP.
  // Используется в Ctrl+Click когда цель за пределами досягаемости за 1 ход.
  // Возвращает true если удалось подойти вплотную, false — если только приблизились.
  async function moveTowardTarget(attackerUid, targetToken) {
    const attacker = store.placedTokens.find((t) => t.uid === attackerUid)
    if (!attacker) return false

    const ap = attacker.actionPoints ?? 0
    if (ap <= 0) return false

    // Уже вплотную — движения не нужно, сразу разрешаем атаку
    const alreadyAdjacent = DIRS.some(
      ([dc, dr]) => targetToken.col + dc === attacker.col && targetToken.row + dr === attacker.row
    )
    if (alreadyAdjacent) return true

    const occupied = new Set(
      store.placedTokens.filter((t) => t.uid !== attackerUid).map((t) => `${t.col},${t.row}`)
    )

    // Пробуем найти путь к любой соседней клетке цели без ограничения AP
    // — чтобы узнать полный маршрут, а потом пройти столько шагов, сколько позволяют AP
    const MAX_AP_SEARCH = 99
    const adjacentCells = DIRS.map(([dc, dr]) => ({
      col: targetToken.col + dc,
      row: targetToken.row + dr,
    }))

    // Ближайшая к атакующему соседняя клетка цели (по Манхэттену) — целевая точка движения
    const dest = adjacentCells.reduce((best, cell) => {
      const d = Math.abs(cell.col - attacker.col) + Math.abs(cell.row - attacker.row)
      const bd = Math.abs(best.col - attacker.col) + Math.abs(best.row - attacker.row)
      return d < bd ? cell : best
    })

    // Полный путь без ограничения AP (узнаём направление)
    const fullPath = findPath(attacker, dest, store.walls, MAX_AP_SEARCH, occupied)
    if (!fullPath || fullPath.length === 0) return false

    // Идём максимум (ap - 1) шагов — резервируем 1 AP для самого удара
    const stepsToTake = fullPath.slice(0, Math.max(0, ap - 1))
    const scenarioId = String(store.currentScenario?.id ?? '')

    for (const step of stepsToTake) {
      if (!store.spendActionPoint(attackerUid)) break
      store.moveToken(attackerUid, step.col, step.row)
      if (scenarioId) {
        getSocket()?.emit('token:move', {
          scenarioId,
          uid: attackerUid,
          col: step.col,
          row: step.row,
        })
      }
      await new Promise((resolve) => setTimeout(resolve, 380))
    }

    // Проверяем: дошли ли вплотную?
    const arrived = store.placedTokens.find((t) => t.uid === attackerUid)
    if (!arrived) return false
    return DIRS.some(
      ([dc, dr]) => targetToken.col + dc === arrived.col && targetToken.row + dr === arrived.row
    )
  }

  // Переход через дверь: выбранный токен идёт вплотную к двери (AP не тратится — переход всегда бесплатен),
  // затем в буфер попадают все не-системные токены в радиусе 1 клетки от двери, потом эмитится событие перехода.
  async function onDoorWalk(selected, door) {
    const uid = selected.uid
    const scenarioId = String(store.currentScenario?.id ?? '')

    // Снимаем выделение до ходьбы — оверлей исчезнет, анимация токена остаётся
    store.selectPlacedToken(null)
    closeContextMenu()

    // Оцениваем соседние клетки двери (譜ебышевское расстояние 1)
    const alreadyAdjacent = DIRS.some(
      ([dc, dr]) => door.col + dc === selected.col && door.row + dr === selected.row
    )

    if (!alreadyAdjacent) {
      // Занятые клетки (наш токен не считается препятствием)
      const occupied = new Set(
        store.placedTokens.filter((t) => t.uid !== uid).map((t) => `${t.col},${t.row}`)
      )
      const wallSet = new Set(store.walls.map((w) => `${w.col},${w.row}`))

      // Свободные соседние клетки двери: не стены, не заняты токенами, не за краем карты
      const freeAdjacentCells = DIRS.map(([dc, dr]) => ({
        col: door.col + dc,
        row: door.row + dr,
      })).filter((cell) => {
        const key = `${cell.col},${cell.row}`
        return cell.col >= 0 && cell.row >= 0 && !occupied.has(key) && !wallSet.has(key)
      })

      if (!freeAdjacentCells.length) return // дверь полностью заблокирована

      // Ближайшая по Мэнхэттену клетка для подхода
      const dest = freeAdjacentCells.reduce((best, cell) => {
        const d = Math.abs(cell.col - selected.col) + Math.abs(cell.row - selected.row)
        const bd = Math.abs(best.col - selected.col) + Math.abs(best.row - selected.row)
        return d < bd ? cell : best
      })

      // Путь без ограничения AP — переход через дверь всегда завершается
      const path = findPath(selected, dest, store.walls, 999, occupied)
      if (!path || path.length === 0) return // путь недоступен

      for (const step of path) {
        store.moveToken(uid, step.col, step.row)
        if (scenarioId) {
          getSocket()?.emit('token:move', { scenarioId, uid, col: step.col, row: step.row })
        }
        await new Promise((resolve) => setTimeout(resolve, 380))
      }
    }

    // Собираем буфер: все не-системные токены в радиусе 1 клетки (Чебышев) от двери
    const buffer = store.placedTokens
      .filter(
        (t) => !t.systemToken && Math.abs(t.col - door.col) <= 1 && Math.abs(t.row - door.row) <= 1
      )
      .map((t) => ({ ...t })) // снапшот объекта

    const sourceScenarioId = store.currentScenario?.id ?? null
    emit('door-transition', {
      targetScenarioId: door.targetScenarioId,
      sourceScenarioId,
      buffer,
      // uid токена-инициатора: после перехода его новый uid будет автовыбран
      initiatorUid: uid,
    })
  }

  // Одиночный клик — действие (с задержкой, чтобы уступить двойному клику).
  function onTokenClick(placed, event) {
    // Переход через дверь: клик по двери при выбранном не-системном токене.
    // Приоритет перед боевыми проверками.
    if (placed.systemToken === 'door' && placed.targetScenarioId) {
      const sel = store.placedTokens.find((t) => t.uid === store.selectedPlacedUid)
      if (sel && !sel.systemToken) {
        onDoorWalk(sel, placed)
        return
      }
    }

    // Ctrl+Click — экспресс-бой.
    // Если цель вплотную или достижима за 1 ход — атакуем сразу.
    // Если цель далеко — двигаемся максимально близко (расходуем все AP),
    // чтобы в следующем ходе оказаться ещё ближе.
    if (event?.ctrlKey) {
      event.preventDefault()
      const sel = store.placedTokens.find((t) => t.uid === store.selectedPlacedUid)
      if (!sel) return

      const isHeroAttackingNpc =
        sel.tokenType === 'hero' &&
        placed.tokenType === 'npc' &&
        placed.attitude === 'hostile' &&
        !placed.systemToken

      const isNpcAttackingHero =
        sel.tokenType === 'npc' && sel.attitude === 'hostile' && placed.tokenType === 'hero'

      if (!isHeroAttackingNpc && !isNpcAttackingHero) return

      if (!store.combatMode) store.enterCombat(sel.uid, getVisibleKeys())
      store.selectPlacedToken(null)
      closeContextMenu()

      // moveTowardTarget: идёт вплотную если возможно, иначе — максимально близко
      moveTowardTarget(sel.uid, placed).then((reached) => {
        if (!reached) {
          // Не дошли до цели — в любом случае заканчиваем ход,
          // иначе ход зависает (AP может быть > 0 если путь не найден)
          store.endTurn()
          return
        }
        const liveAttacker = store.placedTokens.find((t) => t.uid === sel.uid)
        const liveDefender = store.placedTokens.find((t) => t.uid === placed.uid)
        if (liveAttacker && liveDefender) runQuickAttack(liveAttacker, liveDefender)
      })
      return
    }

    if (clickTimer !== null) {
      // Второй click подряд — это начало dblclick, не запускаем действие
      clearTimeout(clickTimer)
      clickTimer = null
      return
    }
    clickTimer = setTimeout(() => {
      clickTimer = null
      // Только теперь выполняем действие: атака, если условия выполнены
      if (
        heroReachable.value.size > 0 &&
        placed.tokenType === 'npc' &&
        placed.attitude === 'hostile' &&
        isNpcReachable(placed)
      ) {
        onAttackClick(placed)
      } else if (
        npcReachable.value.size > 0 &&
        placed.tokenType === 'hero' &&
        isHeroReachableByNpc(placed)
      ) {
        onNpcAttackClick(placed)
      } else if (
        heroReachable.value.size > 0 &&
        placed.tokenType === 'npc' &&
        (placed.attitude === 'neutral' || placed.attitude === 'friendly') &&
        isNpcReachable(placed)
      ) {
        onTalkClick(placed)
      }
    }, DBLCLICK_DELAY)
  }

  // Герой подходит вплотную к нейтральному / союзному НПС, затем НПС показывает облако диалога.
  async function onTalkClick(npc) {
    const hero = store.placedTokens.find((t) => t.uid === store.selectedPlacedUid)
    if (!hero) return

    const heroUid = hero.uid

    const alreadyAdjacent = DIRS.some(
      ([dc, dr]) => npc.col + dc === hero.col && npc.row + dr === hero.row
    )

    if (!alreadyAdjacent) {
      // Соседние клетки НПС, достижимые героем
      const adjacent = DIRS.map(([dc, dr]) => ({ col: npc.col + dc, row: npc.row + dr })).filter(
        (cell) => heroReachable.value.has(`${cell.col},${cell.row}`)
      )
      if (!adjacent.length) return

      const target = adjacent.reduce((best, cell) => {
        const d = Math.abs(cell.col - hero.col) + Math.abs(cell.row - hero.row)
        const bd = Math.abs(best.col - hero.col) + Math.abs(best.row - hero.row)
        return d < bd ? cell : best
      })

      const path = findPath(
        hero,
        target,
        store.walls,
        hero.actionPoints ?? 0,
        new Set(
          store.placedTokens.filter((t) => t.uid !== hero.uid).map((t) => `${t.col},${t.row}`)
        )
      )
      if (!path) return

      const scenarioId = String(store.currentScenario?.id ?? '')
      store.selectPlacedToken(null)
      closeContextMenu()

      for (const step of path) {
        if (!store.spendActionPoint(heroUid)) break
        store.moveToken(heroUid, step.col, step.row)
        if (scenarioId) {
          getSocket()?.emit('token:move', {
            scenarioId,
            uid: heroUid,
            col: step.col,
            row: step.row,
          })
        }
        await new Promise((resolve) => setTimeout(resolve, 380))
      }
    } else {
      store.selectPlacedToken(null)
      closeContextMenu()
    }

    // НПС говорит привет
    showDialogBubble(npc.uid, 'Привет!')
  }

  // Герой идёт в ближайшую ячейку рядом с НПС и после этого появляется значок сстычки мечей.
  async function onAttackClick(npc) {
    const hero = store.placedTokens.find((t) => t.uid === store.selectedPlacedUid)
    if (!hero) return

    const heroUid = hero.uid
    const npcUid = npc.uid

    // Если герой уже стоит вплотную к НПС — сразу начинаем бой без движения
    const alreadyAdjacent = DIRS.some(
      ([dc, dr]) => npc.col + dc === hero.col && npc.row + dr === hero.row
    )
    if (alreadyAdjacent) {
      store.selectPlacedToken(null)
      closeContextMenu()
      store.setCombatPair(heroUid, npcUid)
      store.enterCombat(heroUid, getVisibleKeys())
      return
    }

    // Соседние клетки НПС, которые герой может достичь
    const adjacent = DIRS.map(([dc, dr]) => ({
      col: npc.col + dc,
      row: npc.row + dr,
    })).filter((cell) => heroReachable.value.has(`${cell.col},${cell.row}`))

    if (!adjacent.length) return

    // Ближайшая к герою по Мэнхэттену
    const target = adjacent.reduce((best, cell) => {
      const d = Math.abs(cell.col - hero.col) + Math.abs(cell.row - hero.row)
      const bd = Math.abs(best.col - hero.col) + Math.abs(best.row - hero.row)
      return d < bd ? cell : best
    })

    const path = findPath(
      hero,
      target,
      store.walls,
      hero.actionPoints ?? 0,
      new Set(store.placedTokens.filter((t) => t.uid !== hero.uid).map((t) => `${t.col},${t.row}`))
    )
    if (path === null) return

    const scenarioId = String(store.currentScenario?.id ?? '')

    store.selectPlacedToken(null)
    closeContextMenu()

    for (const step of path) {
      if (!store.spendActionPoint(heroUid)) break
      store.moveToken(heroUid, step.col, step.row)
      if (scenarioId) {
        getSocket()?.emit('token:move', { scenarioId, uid: heroUid, col: step.col, row: step.row })
      }
      await new Promise((resolve) => setTimeout(resolve, 380))
    }

    // Показываем значок боя; остаётся до следующего действия
    store.setCombatPair(heroUid, npcUid)
    // Герой атаковал первым → он встаёт последним в инициативу
    store.enterCombat(heroUid, getVisibleKeys())
  }

  // НПС идёт к ближайшей клетке рядом с героем и начинает бой первым
  async function onNpcAttackClick(hero) {
    const npc = store.placedTokens.find((t) => t.uid === store.selectedPlacedUid)
    if (!npc) return

    const heroUid = hero.uid
    const npcUid = npc.uid

    // Если НПС уже стоит вплотную к герою — сразу начинаем бой без движения
    const alreadyAdjacent = DIRS.some(
      ([dc, dr]) => hero.col + dc === npc.col && hero.row + dr === npc.row
    )
    if (alreadyAdjacent) {
      store.selectPlacedToken(null)
      closeContextMenu()
      store.setCombatPair(heroUid, npcUid, true)
      store.enterCombat(npcUid, getVisibleKeys())
      return
    }

    // Соседние клетки героя, которые НПС может достичь
    const adjacent = DIRS.map(([dc, dr]) => ({
      col: hero.col + dc,
      row: hero.row + dr,
    })).filter((cell) => npcReachable.value.has(`${cell.col},${cell.row}`))

    if (!adjacent.length) return

    // Ближайшая к НПС по Манхэттену
    const target = adjacent.reduce((best, cell) => {
      const d = Math.abs(cell.col - npc.col) + Math.abs(cell.row - npc.row)
      const bd = Math.abs(best.col - npc.col) + Math.abs(best.row - npc.row)
      return d < bd ? cell : best
    })

    const path = findPath(
      npc,
      target,
      store.walls,
      npc.actionPoints ?? 0,
      new Set(store.placedTokens.filter((t) => t.uid !== npc.uid).map((t) => `${t.col},${t.row}`))
    )
    if (path === null) return

    const scenarioId = String(store.currentScenario?.id ?? '')

    store.selectPlacedToken(null)
    closeContextMenu()

    for (const step of path) {
      if (!store.spendActionPoint(npcUid)) break
      store.moveToken(npcUid, step.col, step.row)
      if (scenarioId) {
        getSocket()?.emit('token:move', { scenarioId, uid: npcUid, col: step.col, row: step.row })
      }
      await new Promise((resolve) => setTimeout(resolve, 380))
    }

    // НПС атаковал первым → флаг npcInitiated = true
    store.setCombatPair(heroUid, npcUid, true)
    store.enterCombat(npcUid, getVisibleKeys())
  }

  // Позиция значка мечей — посередине между героем и НПС
  const combatIconPos = computed(() => {
    if (!store.combatPair) return null
    const hero = store.placedTokens.find((t) => t.uid === store.combatPair.heroUid)
    const npc = store.placedTokens.find((t) => t.uid === store.combatPair.npcUid)
    if (!hero || !npc) return null
    return {
      x: ((hero.col + npc.col) / 2 + 0.5) * store.cellSize,
      y: ((hero.row + npc.row) / 2 + 0.5) * store.cellSize,
    }
  })

  // ── Выделение в режиме зрителя ────────────────────────────────────────────
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

  // Stub — откроется когда будет реализован экран инвентаря / способностей
  // eslint-disable-next-line no-unused-vars

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

  // Двойной клик: выбрать токен / снять выбор;
  // если токен является дверью — дополнительно инициировать переход.
  function onDblClick(placed) {
    // Отменяем одиночный клик, если он ещё ждёт в таймере
    if (clickTimer !== null) {
      clearTimeout(clickTimer)
      clickTimer = null
    }
    store.setCombatPair(null, null)
    store.selectPlacedToken(placed.uid)
    closeContextMenu()
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

  /*
    Курсор «дверь» — системный токен-дверь когда выбран не-системный токен.
    Золотая арка — намёк на проход в другую локацию.
  */
  .game-tokens__token--cursor-door {
    cursor:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect x='12' y='14' width='16' height='18' rx='1' fill='none' stroke='%23fbbf24' stroke-width='2.5' opacity='0.9'/%3E%3Cpath d='M12 14 Q20 4 28 14' fill='none' stroke='%23fbbf24' stroke-width='2.5' opacity='0.9'/%3E%3Crect x='22' y='21' width='3' height='3' rx='1.5' fill='%23fbbf24' opacity='0.9'/%3E%3Ccircle cx='30' cy='10' r='4' fill='%23fbbf24' opacity='0.5'/%3E%3Ccircle cx='30' cy='10' r='2' fill='%23fbbf24' opacity='0.9'/%3E%3C/svg%3E")
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

  /* ── Активный ход: пульсация токена ────────────────────────────────────────── */
  .game-tokens__token--active-turn .game-tokens__img {
    animation: token-pulse 1.4s ease-in-out infinite;
  }

  @keyframes token-pulse {
    0%,
    100% {
      transform: scale(1);
    }

    50% {
      transform: scale(1.06);
    }
  }

  /* ── Столб золотого свечения ─────────────────────────────────────────────── */

  /*
    .game-tokens__turn-pillar — абсолютно позиционирован внутри токена.
    Столб уходит вверх из центра токена: высокий градиент снизу вверх,
    анимируется один раз при появлении.
    pointer-events: none — не перехватывает клики.
  */
  .game-tokens__turn-pillar {
    position: absolute;
    bottom: 50%;
    left: 50%;
    width: 40px;
    height: 180px;
    transform: translateX(-50%);
    background: linear-gradient(
      to top,
      rgb(250 204 21 / 85%) 0%,
      rgb(250 204 21 / 40%) 40%,
      rgb(250 204 21 / 0%) 100%
    );
    filter: blur(6px);
    pointer-events: none;
    animation: pillar-rise 2s ease-out forwards;
  }

  @keyframes pillar-rise {
    0% {
      opacity: 0;
      height: 0;
      filter: blur(4px);
    }

    20% {
      opacity: 1;
    }

    70% {
      opacity: 0.85;
      height: 180px;
    }

    100% {
      opacity: 0;
      height: 200px;
      filter: blur(12px);
    }
  }

  /* Тряска токена — запускается когда дверь не настроена перед сохранением */
  .game-tokens__token--shaking .game-tokens__img {
    animation: token-shake 0.65s ease;
  }

  /* ── Экспресс-бой: flash-эффекты на токене ──────────────────────────────── */

  /* Попадание — красное свечение */
  .game-tokens__token--flash-hit .game-tokens__img {
    animation: token-flash-hit 0.6s ease;
  }

  @keyframes token-flash-hit {
    0% {
      filter: brightness(1);
    }

    20% {
      filter: brightness(2.5) sepia(1) saturate(5) hue-rotate(-20deg);
    }

    50% {
      filter: brightness(1.8) sepia(1) saturate(4) hue-rotate(-20deg);
      box-shadow: 0 0 20px 8px rgb(239 68 68 / 70%);
    }

    100% {
      filter: brightness(1);
    }
  }

  /* Промах — синее свечение */
  .game-tokens__token--flash-miss .game-tokens__img {
    animation: token-flash-miss 0.6s ease;
  }

  @keyframes token-flash-miss {
    0% {
      filter: brightness(1);
    }

    20% {
      filter: brightness(2) sepia(1) saturate(5) hue-rotate(190deg);
    }

    50% {
      filter: brightness(1.6) sepia(1) saturate(4) hue-rotate(190deg);
    }

    100% {
      filter: brightness(1);
    }
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

  /* Знак скрещенных мечей — появляется между токенами в момент атаки */
  .game-tokens__combat-icon {
    position: absolute;
    z-index: calc(var(--z-tokens) + 1);
    transform: translate(-50%, -50%);
    pointer-events: none;
    filter: drop-shadow(0 0 6px rgb(239 68 68 / 80%));
    animation: combat-pop 0.25s ease-out both;
  }

  @keyframes combat-pop {
    from {
      transform: translate(-50%, -50%) scale(0.3);
      opacity: 0;
    }

    to {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }

  /* Transition для Transition-компонента */
  .combat-enter-active {
    animation: combat-pop 0.25s ease-out both;
  }

  .combat-leave-active {
    transition: opacity 0.3s ease;
  }

  .combat-leave-to {
    opacity: 0;
  }
</style>
