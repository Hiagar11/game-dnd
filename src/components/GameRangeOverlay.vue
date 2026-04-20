<template>
  <!--
    Прозрачный слой поверх карты, активный только когда выбран токен.
    Отвечает за:
      1. Смену курсора на сапог при наведении на клетку в зоне хода.
      2. Клик по клетке в зоне → токен плавно перемещается туда.
      3. Клик вне зоны → снятие выделения.

    z-index: 2 — между сеткой (авто) и токенами (--z-tokens: 3).
    У токенов pointer-events: auto, поэтому клики по самим токенам
    уходят к ним, а не к этому слою.
  -->
  <div
    v-if="selectedToken && !isWalking"
    class="game-range-overlay"
    :class="[
      cursorInRange && !hoveredToken ? 'game-range-overlay--boot' : '',
      hoveredTokenCursorClass,
      store.pendingAbility?.areaType === 'targeted' ? 'game-range-overlay--cursor-aoe' : '',
    ]"
    :style="{ width: `${width}px`, height: `${height}px` }"
    @mousemove="onMouseMove"
    @click.stop="onClick"
    @contextmenu.stop.prevent="onRightClick"
    @mouseleave="onMouseLeave"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  />
</template>

<script setup>
  import { ref, computed, inject } from 'vue'
  import { useGameStore } from '../stores/game'
  import { useSocket } from '../composables/useSocket'
  import { buildReachableCells, findPath } from '../composables/useTokenMove'
  import { useTokenDrop } from '../composables/useTokenDrop'
  import {
    getSelectedNonSystemToken,
    isHeroToken,
    isHostileNpcToken,
    isNeutralNpcToken,
    isTalkableNpcToken,
  } from '../utils/tokenFilters'
  import { getCurrentScenarioId } from '../utils/scenario'
  import { TOKEN_MOVE_STEP_DELAY_MS } from '../constants/timing'
  import { DEFAULT_AP, DEFAULT_MP } from '../constants/combat'
  import { sleep } from '../utils/async'

  // Отслеживаем Ctrl для режима агрессии по нейтральным NPC
  const ctrlHeld = ref(false)

  defineProps({
    // Размеры карты — оверлей должен покрывать её полностью
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  })

  const store = useGameStore()
  const { getSocket } = useSocket()

  // Получаем смещение карты от GameView (provide/inject) — нужно для useTokenDrop
  const offsetX = inject('offsetX')
  const offsetY = inject('offsetY')
  const { onDragOver, onDragLeave, onDrop } = useTokenDrop(offsetX, offsetY)

  // Обработчики кликов по токену, зарегистрированные GameTokens через provide/inject
  const overlayTokenClick = inject('overlayTokenClick', ref(null))
  const overlayTokenContextMenu = inject('overlayTokenContextMenu', ref(null))
  const overlayOpenLoot = inject('overlayOpenLoot', ref(null))
  const overlayExecuteAoE = inject('overlayExecuteAoE', ref(null))

  // true — курсор над клеткой в зоне хода → показываем следы
  const cursorInRange = ref(false)

  // Токен (не выбранный) под курсором мыши — для курсора и перенаправления кликов
  const hoveredToken = ref(null)

  /**
   * Ищет размещённый токен (кроме выбранного) чей блок покрывает (col, row).
   * halfSize-токены занимают 1×2 sub-cells, обычные — 2×2.
   */
  function getTokenAtCell(col, row) {
    return (
      store.placedTokens.find((t) => {
        if (t.uid === selectedToken.value?.uid) return false
        const spanX = t.halfSize || t.quarterSize ? 0 : 1
        const spanY = t.quarterSize ? 0 : 1
        return col >= t.col && col <= t.col + spanX && row >= t.row && row <= t.row + spanY
      }) ?? null
    )
  }

  /**
   * Ищет кучку лута на земле, чей sub-cell совпадает с (col, row).
   */
  function getGroundPileAtCell(col, row) {
    return store.groundItems.find((g) => g.col === col && g.row === row) ?? null
  }

  // Кучка лута (не токен) под курсором мыши
  const hoveredPile = ref(null)

  const CONTAINER_TOKENS = new Set(['item', 'jar', 'bag'])

  /**
   * CSS-класс курсора в зависимости от типа токена/кучки под мышью.
   */
  const hoveredTokenCursorClass = computed(() => {
    if (hoveredPile.value) return 'game-range-overlay--cursor-open'
    const t = hoveredToken.value
    if (!t) return ''
    if (isHostileNpcToken(t)) return 'game-range-overlay--cursor-attack'
    // Ctrl+наведение на нейтрального NPC → курсор агрессии
    if (ctrlHeld.value && isNeutralNpcToken(t) && isHeroToken(selectedToken.value))
      return 'game-range-overlay--cursor-aggro'
    if (isTalkableNpcToken(t)) return 'game-range-overlay--cursor-talk'
    if (t.systemToken === 'door' && (t.targetScenarioId || t.globalMapExit))
      return 'game-range-overlay--cursor-door'
    if (
      CONTAINER_TOKENS.has(t.systemToken) &&
      !(!t.items?.length && (t.opened || t.systemToken === 'bag'))
    )
      return 'game-range-overlay--cursor-open'
    return ''
  })

  // true — идёт анимация ходьбы. Блокируем повторные клики в этот период.
  const isWalking = ref(false)

  // Токен, который сейчас выбран (null если ни один, и null для системных токенов —
  // дверей, факелов и пр., которые не перемещаются)
  const selectedToken = computed(() => {
    return getSelectedNonSystemToken(store.placedTokens, store.selectedPlacedUid)
  })

  // Множество достижимых клеток (обновляется при смене токена или стен).
  // BFS знает про стены — зона не пространяется за них.
  // Радиус = текущие MP токена (если 0 — зона пустая)
  const reachableCells = computed(() => {
    const t = selectedToken.value
    if (!t) return new Set()
    const mp = t.movementPoints ?? 0
    if (mp <= 0) return new Set()
    const occupied = new Set(
      store.placedTokens
        .filter((entry) => entry.uid !== t.uid)
        .map((entry) => `${entry.col},${entry.row}`)
    )
    return buildReachableCells(t, store.walls, mp, occupied)
  })
  /**
   * Переводит позицию мыши (clientX/Y) в координату клетки (col, row).
   * Использует currentTarget.getBoundingClientRect() — работает корректно
   * даже если карта масштабирована через CSS transform.
   */
  function getCellAt(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hc = store.halfCell
    return {
      col: Math.floor((x - store.gridNormOX) / hc),
      row: Math.floor((y - store.gridNormOY) / hc),
    }
  }

  function onMouseLeave() {
    cursorInRange.value = false
    hoveredToken.value = null
    hoveredPile.value = null
    store.setHoveredPath([])
    store.setHoveredCell(null)
    store.abilityPreviewCells = []
  }

  function onMouseMove(e) {
    ctrlHeld.value = e.ctrlKey
    if (!selectedToken.value) return
    const { col, row } = getCellAt(e)

    // ── AoE-превью для targeted-способности ───────────────────────────────
    if (store.pendingAbility?.areaType === 'targeted') {
      const size = store.pendingAbility.areaSize ?? 1
      const cells = []
      for (let dc = -size + 1; dc <= size; dc++) {
        for (let dr = -size + 1; dr <= size; dr++) {
          cells.push({ col: col + dc, row: row + dr })
        }
      }
      store.abilityPreviewCells = cells
      store.setHoveredCell(null)
      store.setHoveredPath([])
      hoveredToken.value = null
      hoveredPile.value = null
      cursorInRange.value = false
      return
    }
    store.abilityPreviewCells = []

    // Проверяем, есть ли чужой токен под курсором
    hoveredToken.value = getTokenAtCell(col, row)
    // Проверяем кучку лута на земле
    hoveredPile.value = !hoveredToken.value ? getGroundPileAtCell(col, row) : null

    // При выборе цели single-target способности — не строим путь/зону хода
    if (store.pendingAbility?.areaType === 'single') {
      store.setHoveredCell(null)
      store.setHoveredPath([])
      cursorInRange.value = false
      return
    }

    const key = `${col},${row}`
    const inRange = reachableCells.value.has(key)
    cursorInRange.value = inRange && !hoveredToken.value && !hoveredPile.value

    if (inRange && !hoveredToken.value && !hoveredPile.value) {
      store.setHoveredCell({ col, row })
      const mp = selectedToken.value.movementPoints ?? 0
      const occupied = new Set(
        store.placedTokens
          .filter((entry) => entry.uid !== selectedToken.value.uid)
          .map((entry) => `${entry.col},${entry.row}`)
      )
      const path = findPath(selectedToken.value, { col, row }, store.walls, mp, occupied)
      store.setHoveredPath(path ?? [])
    } else {
      store.setHoveredCell(null)
      store.setHoveredPath([])
    }
  }

  function onRightClick(e) {
    const { col, row } = getCellAt(e)
    const hitToken = hoveredToken.value ?? getTokenAtCell(col, row)
    if (hitToken && overlayTokenContextMenu.value) {
      // Сбрасываем фокус пути при вызове контекстного меню
      store.setHoveredCell(null)
      store.setHoveredPath([])
      cursorInRange.value = false
      overlayTokenContextMenu.value(hitToken)
    }
  }

  function onClick(e) {
    if (!selectedToken.value || isWalking.value) return

    const { col, row } = getCellAt(e)

    // ── Клик при targeted AoE-способности → запустить способность ────────
    if (store.pendingAbility?.areaType === 'targeted') {
      if (overlayExecuteAoE.value) overlayExecuteAoE.value({ col, row })
      store.abilityPreviewCells = []
      return
    }

    // Клик по кучке лута на земле — открыть попап
    const hitPile = hoveredPile.value ?? getGroundPileAtCell(col, row)
    if (hitPile && overlayOpenLoot.value) {
      overlayOpenLoot.value(hitPile)
      return
    }

    // Используем токен, уже найденный в onMouseMove (надёжнее повторного getTokenAtCell)
    const hitToken = hoveredToken.value ?? getTokenAtCell(col, row)
    if (hitToken && overlayTokenClick.value) {
      overlayTokenClick.value(hitToken, e)
      return
    }

    if (reachableCells.value.has(`${col},${row}`)) {
      // Захватываем uid и AP до снятия выделения — после deselect computed вернёт null
      const uid = selectedToken.value.uid
      const mp = selectedToken.value.movementPoints ?? 0
      const scenarioId = getCurrentScenarioId(store)
      const occupied = new Set(
        store.placedTokens
          .filter((entry) => entry.uid !== uid)
          .map((entry) => `${entry.col},${entry.row}`)
      )

      // Путь строится с ограничением по MP
      const path = findPath(selectedToken.value, { col, row }, store.walls, mp, occupied)
      if (!path || path.length === 0) {
        store.selectPlacedToken(null)
        return
      }

      // Ходьба началась — скрываем оверлей, но выделение остаётся — инфо-меню продолжает показывать AP реактивно
      isWalking.value = true

      // Шаги задержаны на 380ms — чуть больше CSS transition (350ms) на токене,
      // чтобы каждый следующий шаг начинался только когда предыдущий визуально завершился.
      ;(async () => {
        for (const step of path) {
          // Тратим AP; если они кончились — останавливаем ход
          if (!store.spendMovementPoint(uid)) break
          store.moveToken(uid, step.col, step.row)
          if (scenarioId) {
            getSocket()?.emit('token:move', { scenarioId, uid, col: step.col, row: step.row })
          }
          await sleep(TOKEN_MOVE_STEP_DELAY_MS)
        }
        // Мирное время: если все AP потрачены — восстанавливаем всем без сброса выделения
        if (!store.combatMode) {
          const remainingMP = store.placedTokens.find((t) => t.uid === uid)?.movementPoints ?? 0
          if (remainingMP === 0) {
            for (const t of store.placedTokens) {
              t.actionPoints = DEFAULT_AP
              t.movementPoints = DEFAULT_MP
            }
          }
        }
        isWalking.value = false
      })()
    } else {
      // Клик вне зоны — снимаем выделение
      store.selectPlacedToken(null)
    }
  }
</script>

<style scoped>
  .game-range-overlay {
    position: absolute;
    top: 0;
    left: 0;

    /*
      z-index: 2 — выше сетки, но ниже токенов (--z-tokens: 3).
      Благодаря этому клики по самим токенам дойдут до них,
      а клики по пустым клеткам — до нас.
    */
    z-index: 2;
    cursor: default;
  }

  /*
    Курсор-следы — два следа ступни, показываются над клетками в зоне хода.
    SVG встроен в CSS через data URI (не нужен отдельный файл).
    Горячая точка (20 20) — центр курсора, где происходит клик.

    Структура SVG:
      - Правая нога (сзади, 35% opacity): верх, справа
      - Левая нога (спереди, 90% opacity): низ, слева
    Каждая нога — эллипс (пад) + 4 круга (пальцы).
  */

  /* Курсор «мечи» — враждебный НПС */
  .game-range-overlay--cursor-attack {
    cursor:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cg transform='rotate(-45 20 20)' opacity='0.95'%3E%3Crect x='18.5' y='4' width='3' height='22' rx='1' fill='%23f87171'/%3E%3Crect x='14' y='10' width='12' height='2.5' rx='1' fill='%23fca5a5'/%3E%3Cpolygon points='20,2 18,6 22,6' fill='%23fca5a5'/%3E%3C/g%3E%3Cg transform='rotate(45 20 20)' opacity='0.70'%3E%3Crect x='18.5' y='4' width='3' height='22' rx='1' fill='%23f87171'/%3E%3Crect x='14' y='10' width='12' height='2.5' rx='1' fill='%23fca5a5'/%3E%3Cpolygon points='20,2 18,6 22,6' fill='%23fca5a5'/%3E%3C/g%3E%3C/svg%3E")
        20 20,
      crosshair;
  }

  /* Курсор «меч» — агрессия: Ctrl+наведение на нейтрального NPC */
  .game-range-overlay--cursor-aggro {
    cursor:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cg transform='rotate(-45 20 20)' opacity='0.95'%3E%3Crect x='18.5' y='4' width='3' height='22' rx='1' fill='%23fb923c'/%3E%3Crect x='14' y='10' width='12' height='2.5' rx='1' fill='%23fdba74'/%3E%3Cpolygon points='20,2 18,6 22,6' fill='%23fdba74'/%3E%3C/g%3E%3C/svg%3E")
        20 20,
      crosshair;
  }

  /* Курсор «пузырь» — нейтральный/союзный НПС */
  .game-range-overlay--cursor-talk {
    cursor:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect x='6' y='6' width='22' height='16' rx='4' fill='%2360a5fa' opacity='0.9'/%3E%3Cpolygon points='10,22 8,28 16,22' fill='%2360a5fa' opacity='0.9'/%3E%3Ccircle cx='13' cy='14' r='2' fill='white'/%3E%3Ccircle cx='18' cy='14' r='2' fill='white'/%3E%3Ccircle cx='23' cy='14' r='2' fill='white'/%3E%3C/svg%3E")
        20 20,
      pointer;
  }

  /* Курсор «дверь» — системный токен-дверь с настроенным переходом */
  .game-range-overlay--cursor-door {
    cursor:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect x='12' y='14' width='16' height='18' rx='1' fill='none' stroke='%23fbbf24' stroke-width='2.5' opacity='0.9'/%3E%3Cpath d='M12 14 Q20 4 28 14' fill='none' stroke='%23fbbf24' stroke-width='2.5' opacity='0.9'/%3E%3Crect x='22' y='21' width='3' height='3' rx='1.5' fill='%23fbbf24' opacity='0.9'/%3E%3Ccircle cx='30' cy='10' r='4' fill='%23fbbf24' opacity='0.5'/%3E%3Ccircle cx='30' cy='10' r='2' fill='%23fbbf24' opacity='0.9'/%3E%3C/svg%3E")
        20 20,
      pointer;
  }

  /* Курсор «открыть» — контейнер (сундук/кувшин) */
  .game-range-overlay--cursor-open {
    cursor:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect x='8' y='18' width='24' height='14' rx='2' fill='%23fbbf24' opacity='0.9'/%3E%3Crect x='10' y='20' width='20' height='10' rx='1' fill='%2392400e' opacity='0.6'/%3E%3Cpath d='M8 18 L14 8 L26 8 L32 18' fill='none' stroke='%23fbbf24' stroke-width='2.5' stroke-linejoin='round' opacity='0.9'/%3E%3Ccircle cx='20' cy='25' r='2' fill='%23fbbf24' opacity='0.9'/%3E%3C/svg%3E")
        20 20,
      pointer;
  }

  /* Курсор «прицел» — AoE-способность выбирает зону */
  .game-range-overlay--cursor-aoe {
    cursor: crosshair;
  }

  /* Курсор «следы» — клетка в зоне хода */
  .game-range-overlay--boot {
    cursor:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cg opacity='0.35'%3E%3Cellipse cx='28' cy='16' rx='5' ry='8' fill='%234ade80'/%3E%3Ccircle cx='24' cy='7' r='2.2' fill='%234ade80'/%3E%3Ccircle cx='28' cy='6' r='2.5' fill='%234ade80'/%3E%3Ccircle cx='32' cy='7' r='2.2' fill='%234ade80'/%3E%3Ccircle cx='35' cy='10' r='1.8' fill='%234ade80'/%3E%3C/g%3E%3Cg opacity='0.9'%3E%3Cellipse cx='12' cy='28' rx='5' ry='8' fill='%234ade80'/%3E%3Ccircle cx='8' cy='19' r='2.2' fill='%234ade80'/%3E%3Ccircle cx='12' cy='18' r='2.5' fill='%234ade80'/%3E%3Ccircle cx='16' cy='19' r='2.2' fill='%234ade80'/%3E%3Ccircle cx='19' cy='22' r='1.8' fill='%234ade80'/%3E%3C/g%3E%3C/svg%3E")
        20 20,
      pointer;
  }
</style>
