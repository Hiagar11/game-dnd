<template>
  <div
    ref="viewRef"
    class="game-view"
    :class="{ 'game-view--combat': gameStore.combatMode }"
    @mousemove="onMouseMove"
    @contextmenu="onContextMenu"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <AppBackground src="/video/maw.gif" />

    <!-- ── Состояние 1: выбор карты ──────────────────────────────────────────── -->
    <GamePicker
      v-if="!selectedScenario"
      :campaigns="campaignsStore.campaigns"
      :sessions="gameSessionsStore.sessions"
      :loading="campaignsStore.loading"
      :loading-id="loadingId"
      :error="loadError"
      @select-campaign="selectCampaign"
      @resume-session="resumeSession"
      @delete-session="deleteSession"
    />

    <!-- ── Состояние 2: игровое поле ──────────────────────────────────────────── -->
    <template v-else>
      <div
        ref="mapRef"
        class="game-view__map"
        :style="{ transform: `translate(${offsetX}px, ${offsetY}px)` }"
        @mouseup="onMouseUp"
        @mousedown="onMouseDown"
        @click="(gameStore.selectPlacedToken(null), closeContextMenu())"
      >
        <GameMap :map-src="selectedScenario.mapImageUrl" @ready="onMapReady" />
        <GameGrid :width="mapSize.width" :height="mapSize.height" />
        <GameRangeOverlay :width="mapSize.width" :height="mapSize.height" />
        <GameTokens
          :width="mapSize.width"
          :height="mapSize.height"
          @door-transition="onDoorTransition"
        />
        <GameFog
          :width="mapSize.width"
          :height="mapSize.height"
          :hidden="auth.role === 'admin' && !gameStore.fogEnabled"
        />
      </div>

      <GameMenu @mouseenter="onMenuEnter" @mouseleave="onMenuLeave" />

      <!-- Трекер инициативы — появляется в боевом режиме над меню -->
      <GameCombatTracker />

      <!-- Кнопка возврата к выбору карты -->
      <button class="game-back" @mouseenter="playHover" @click="onExitClick">← К выбору</button>
    </template>

    <!-- Попап сохранения игровой сессии — появляется при нажатии «← К выбору» -->
    <GameSavePopup
      :visible="showSavePopup"
      :default-name="activeSessionName ?? gameStore.activeCampaign?.name ?? ''"
      :existing-names="gameSessionsStore.sessions.map((s) => s.name)"
      @save="onSaveSession"
      @skip="doActualExit"
    />

    <!-- Боевой попап: появляется когда образована боевая пара -->
    <GameCombatPopup
      :visible="!!gameStore.combatPair"
      @close="gameStore.setCombatPair(null, null)"
    />
  </div>
</template>

<script setup>
  import { ref, onMounted, watch, onUnmounted, provide, computed } from 'vue'
  import { useMapPan } from '../composables/useMapPan'
  import { useGameStore } from '../stores/game'
  import { useTokensStore } from '../stores/tokens'
  import { useScenariosStore } from '../stores/scenarios'
  import { useCampaignsStore } from '../stores/campaigns'
  import { useGameSessionsStore } from '../stores/gameSessions'
  import { useAuthStore } from '../stores/auth'
  import { useSocket } from '../composables/useSocket'
  import {
    useSound,
    playBattleMusic,
    stopBattleMusic,
    playTravelMusic,
    stopTravelMusic,
  } from '../composables/useSound'
  import { useAdminCursor } from '../composables/useAdminCursor'
  import AppBackground from '../components/AppBackground.vue'
  import GamePicker from '../components/GamePicker.vue'
  import GameMap from '../components/GameMap.vue'
  import GameGrid from '../components/GameGrid.vue'
  import GameRangeOverlay from '../components/GameRangeOverlay.vue'
  import GameFog from '../components/GameFog.vue'
  import GameTokens from '../components/GameTokens.vue'
  import GameMenu from '../components/GameMenu.vue'
  import GameCombatTracker from '../components/GameCombatTracker.vue'
  import GameSavePopup from '../components/GameSavePopup.vue'
  import GameCombatPopup from '../components/GameCombatPopup.vue'
  import { useTokenDrop } from '../composables/useTokenDrop'
  import { useTokenContextMenu } from '../composables/useTokenContextMenu'

  const viewRef = ref(null)
  const mapRef = ref(null)
  const canvasRef = ref(null)

  const { offsetX, offsetY, onMouseDown, onMouseMove, onMouseUp, onContextMenu } = useMapPan(
    viewRef,
    canvasRef
  )

  const { onDragOver, onDrop } = useTokenDrop(offsetX, offsetY)
  const { close: closeContextMenu } = useTokenContextMenu()
  const { playHover, playClick, playNext } = useSound()

  const auth = useAuthStore()
  const { connect, getSocket } = useSocket()

  // Флаг: открыта ли активная сессия трансляции для зрителей
  const sessionActive = ref(false)
  // Флаг: произошли ли изменения в текущей игровой сессии (токены добавлены/убраны/изменены).
  // Попап сохранения показываем только если изменения есть.
  const sessionChanged = ref(false)

  // Трансляция курсора мастера зрителям.
  // setCursorIcon передаём через provide, чтобы GameMenuSystem мог вызвать его без пропсов.
  // provide/inject — это встроенный механизм Vue для передачи данных от родителя к потомкам,
  // минуя цепочки пропсов (нет необходимости пробрасывать setCursorIcon через GameMenu → GameMenuSystem).
  const { setCursorIcon, onMenuEnter, onMenuLeave, blockCursor, unblockCursor } = useAdminCursor(
    getSocket,
    sessionActive,
    offsetX,
    offsetY
  )
  provide('setCursorIcon', setCursorIcon)
  provide('blockCursor', blockCursor)
  provide('unblockCursor', unblockCursor)
  provide('offsetX', offsetX)
  provide('offsetY', offsetY)

  // Throttle для game:pan — шлём не чаще 30fps (32ms), чтобы не перегружать сокет.
  // Используем throttle вместо debounce: debounce ждёт паузы (плохо при плавном панорамировании),
  // throttle — шлёт регулярно ПОКА идёт движение.
  //
  // Вместо сырых пикселей шлём mapCenterX/Y — координату пикселя карты,
  // которая видна в центре экрана мастера. Каждый зритель пересчитывает
  // оффсет под свой размер экрана: offsetX = viewW/2 - mapCenterX.
  // Это гарантирует, что все видят одну и ту же точку карты в центре.
  let panLastEmit = 0
  function emitPan(x, y) {
    const viewW = viewRef.value?.offsetWidth ?? window.innerWidth
    const viewH = viewRef.value?.offsetHeight ?? window.innerHeight
    getSocket()?.emit('game:pan', {
      mapCenterX: viewW / 2 - x,
      mapCenterY: viewH / 2 - y,
    })
  }
  watch([offsetX, offsetY], ([x, y]) => {
    if (!sessionActive.value) return
    const now = Date.now()
    if (now - panLastEmit < 32) return
    panLastEmit = now
    emitPan(x, y)
  })

  function onSpaceKey(e) {
    if (e.code !== 'Space') return
    const tag = e.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return
    e.preventDefault()
    if (gameStore.combatPair) gameStore.setCombatPair(null, null)
    playNext()
    gameStore.endTurn()
  }

  onUnmounted(() => {
    window.removeEventListener('keydown', onSpaceKey)
    window.removeEventListener('beforeunload', onBeforeUnload)
    if (sessionActive.value) {
      getSocket()?.emit('game:session:close')
      sessionActive.value = false
    }
  })

  const gameStore = useGameStore()

  watch(
    () => gameStore.combatMode,
    (active) => {
      if (active) {
        stopTravelMusic()
        playBattleMusic()
      } else {
        stopBattleMusic()
        playTravelMusic()
      }
    }
  )

  const tokensStore = useTokensStore()
  const scenariosStore = useScenariosStore()
  const campaignsStore = useCampaignsStore()
  const gameSessionsStore = useGameSessionsStore()

  // Герои — токены с tokenType === 'hero' из библиотеки мастера.
  // emitHeroes вызывается явно: в watch (при изменении списка) И из компонента после создания.
  // provide/inject — чтобы не тянуть пропсы через GameMenu → GameMenuHeroes.
  const heroTokens = computed(() => tokensStore.tokens.filter((t) => t.tokenType === 'hero'))
  function emitHeroes() {
    if (!sessionActive.value) return
    getSocket()?.emit('game:heroes:set', { heroes: heroTokens.value })
  }
  provide('emitHeroes', emitHeroes)
  watch(heroTokens, emitHeroes)

  // Следим за изменениями токенов на карте — если сессия активна, помечаем что «что-то изменилось».
  // deep: true нужен, потому что placedTokens — массив объектов, и Vue не заметит мутации вложенных свойств.
  watch(
    () => gameStore.placedTokens,
    () => {
      if (sessionActive.value) sessionChanged.value = true
    },
    { deep: true }
  )

  const mapSize = ref({ width: 0, height: 0 })
  const selectedScenario = ref(null)
  const loadingId = ref(null)
  const loadError = ref('')

  onMounted(() => {
    scenariosStore.fetchScenarios()
    campaignsStore.fetchCampaigns()
    gameSessionsStore.fetchSessions()
    window.addEventListener('keydown', onSpaceKey)
    window.addEventListener('beforeunload', onBeforeUnload)
    // Подключаем сокет для трансляции зрителям
    if (auth.role === 'admin') {
      connect(auth.token)
    }
  })

  // Выбор сценария: сразу открываем стартовую локацию
  async function selectCampaign(campaign) {
    playClick()
    loadError.value = ''
    gameStore.setActiveCampaign(campaign)

    if (!campaign.startScenarioId) {
      loadError.value =
        'У этого сценария не задана стартовая локация. Мастер должен отметить её в редакторе сценария.'
      return
    }

    const startScenario = scenariosStore.scenarios.find(
      (s) => String(s.id) === String(campaign.startScenarioId)
    )
    if (!startScenario) {
      loadError.value = 'Стартовая локация не найдена.'
      return
    }

    loadingId.value = campaign.id
    // Сбрасываем сценарий к эталонному состоянию редактора перед новой игрой
    await scenariosStore.resetScenario(startScenario.id)
    await selectScenario(startScenario)
    loadingId.value = null
  }

  // ─── Выбор карты ─────────────────────────────────────────────────────────────
  async function selectScenario(s) {
    loadingId.value = s.id
    loadError.value = ''
    try {
      await tokensStore.fetchTokens()
      const full = await scenariosStore.fetchScenario(s.id)
      gameStore.setCellSize(full.cellSize ?? 60)
      gameStore.initPlacedTokens(full.placedTokens ?? [])
      gameStore.initWalls(full.walls ?? [])
      sessionChanged.value = false
      gameStore.currentScenario = full
      selectedScenario.value = full
      playTravelMusic()

      // Открываем/обновляем сессию для зрителей
      if (auth.role === 'admin') {
        const socket = getSocket()
        if (socket) {
          if (!sessionActive.value) {
            socket.emit(
              'game:session:open',
              {
                campaignId: String(gameStore.activeCampaign?.id ?? ''),
                campaignName: gameStore.activeCampaign?.name ?? '',
                scenarioId: String(full.id),
              },
              (res) => {
                if (res?.ok) {
                  sessionActive.value = true
                  // Сразу шлём положение камеры — watch не сработает если мастер не двигал.
                  emitPan(offsetX.value, offsetY.value)
                  // Сразу шлём героев: watch не сработает, если heroTokens
                  // был вычислен до открытия сессии (fetchTokens работает раньше).
                  emitHeroes()
                }
              }
            )
          } else {
            socket.emit('game:scenario:change', { scenarioId: String(full.id) })
          }
        }
      }
    } catch (err) {
      loadError.value = err.message || 'Не удалось загрузить карту'
    } finally {
      loadingId.value = null
    }
  }

  // ─── Выход из игры с предложением сохранения ─────────────────────────────────
  const showSavePopup = ref(false)
  const activeSessionName = ref(null)

  // Нативный диалог браузера при перезагрузке или закрытии вкладки.
  // Показывается только если сессия активна и есть несохранённые изменения.
  function onBeforeUnload(e) {
    if (sessionActive.value && sessionChanged.value) {
      e.preventDefault()
    }
  }

  // Кнопка «← К выбору»: если идёт сессия — показываем попап, иначе выходим сразу.
  function onExitClick() {
    playClick()
    if (sessionActive.value && sessionChanged.value) {
      showSavePopup.value = true
    } else {
      doActualExit()
    }
  }

  // Реальный выход — закрывает сокет-сессию и возвращает на экран выбора.
  function doActualExit() {
    showSavePopup.value = false
    activeSessionName.value = null
    stopTravelMusic()
    stopBattleMusic()
    if (sessionActive.value) {
      getSocket()?.emit('game:session:close')
      sessionActive.value = false
    }
    sessionChanged.value = false
    selectedScenario.value = null
    gameStore.currentScenario = null
  }

  // Вызывается попапом: emit('save', name, { resolve, reject })
  async function onSaveSession(name, { resolve, reject }) {
    try {
      await gameSessionsStore.saveSession({
        name,
        campaignId: gameStore.activeCampaign?.id,
        campaignName: gameStore.activeCampaign?.name ?? '',
        currentScenarioId: selectedScenario.value?.id,
        currentScenarioName: selectedScenario.value?.name ?? '',
      })
      resolve()
      doActualExit()
    } catch (err) {
      reject(err)
    }
  }

  // ─── Продолжить сохранённую сессию ───────────────────────────────────────────
  async function resumeSession(session) {
    playClick()
    const sessionId = session.id ?? session._id
    loadError.value = ''
    const campaign = campaignsStore.campaigns.find(
      (c) => String(c.id) === String(session.campaignId)
    )
    const scenario = scenariosStore.scenarios.find(
      (s) => String(s.id) === String(session.currentScenarioId)
    )
    if (!campaign || !scenario) {
      loadError.value = 'Сохранённый сценарий больше не доступен'
      return
    }
    loadingId.value = sessionId
    gameStore.setActiveCampaign(campaign)
    activeSessionName.value = session.name
    // Восстанавливаем снапшот токенов/тумана из сессии в сценарий перед загрузкой
    await gameSessionsStore.restoreSession(sessionId)
    await selectScenario(scenario)
    loadingId.value = null
  }

  // ─── Удалить сохранение ───────────────────────────────────────────────────────
  async function deleteSession(session) {
    playClick()
    const id = session.id ?? session._id
    if (!confirm(`Удалить сохранение «${session.name}»?`)) return
    await gameSessionsStore.deleteSession(id)
  }

  // Переход через дверь: токен дошёл до двери, собраны все токены из буфера.
  // Загружаем целевой сценарий, затем размещаем буферные токены вокруг входной двери.
  async function onDoorTransition({ targetScenarioId, sourceScenarioId, buffer, initiatorUid }) {
    const target = scenariosStore.scenarios.find((s) => String(s.id) === String(targetScenarioId))
    if (!target) return
    mapSize.value = { width: 0, height: 0 }
    await selectScenario(target)

    // Найти дверь на новой карте, которая ведёт обратно в исходный сценарий
    const backDoor = gameStore.placedTokens.find(
      (t) => t.systemToken === 'door' && String(t.targetScenarioId) === String(sourceScenarioId)
    )
    if (backDoor) {
      centerOnToken(backDoor)
      if (buffer?.length) {
        // placeBufferAroundDoor возвращает новый uid токена-инициатора
        const newInitiatorUid = placeBufferAroundDoor(backDoor, buffer, initiatorUid)
        // Автовыбираем инициатора — в новой локации он сразу готов к действию
        if (newInitiatorUid) gameStore.selectPlacedToken(newInitiatorUid)
      }
    }
  }

  /**
   * Размещает токены из буфера вокруг целевой двери.
   * Использует BFS-расширение: сначала ближайшие клетки (радиус 1),
   * если не хватает — ищем следующий радиус.
   *
   * Токены из буфера добавляются В ТЕКУЩИЙ gameStore.placedTokens.
   * Существующие токены на новой карте не удаляются.
   */
  function placeBufferAroundDoor(door, buffer, initiatorUid = null) {
    // Удаляем с новой карты токены с теми же tokenId, что в буфере:
    // это дубли, появившиеся потому что selectScenario загружает исходные данные из БД.
    // Например, герой перешёл в B → вернулся в A: A перезагружается из БД (герой там есть),
    // а буфер несёт того же героя → без этой очистки будет два экземпляра.
    const bufferTokenIds = new Set(buffer.map((bt) => bt.tokenId).filter(Boolean))
    for (let i = gameStore.placedTokens.length - 1; i >= 0; i--) {
      const t = gameStore.placedTokens[i]
      if (!t.systemToken && t.tokenId && bufferTokenIds.has(t.tokenId)) {
        gameStore.placedTokens.splice(i, 1)
      }
    }

    // Занятые клетки: токены новой карты (буферные ещё не добавлены)
    const occupiedKeys = new Set(gameStore.placedTokens.map((t) => `${t.col},${t.row}`))
    const wallKeys = new Set(gameStore.walls.map((w) => `${w.col},${w.row}`))

    // BFS-поиск свободных клеток, расходящийся от двери кольцами
    const freeQueue = []
    const visited = new Set([`${door.col},${door.row}`])
    const pendingSearch = [{ col: door.col, row: door.row }]

    // Ищем столько свободных клеток, сколько токенов в буфере
    let searchIdx = 0
    while (freeQueue.length < buffer.length && searchIdx < pendingSearch.length) {
      const { col, row } = pendingSearch[searchIdx++]
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (dc === 0 && dr === 0) continue
          const nc = col + dc
          const nr = row + dr
          const key = `${nc},${nr}`
          if (visited.has(key)) continue
          visited.add(key)
          if (!wallKeys.has(key) && !occupiedKeys.has(key)) {
            freeQueue.push({ col: nc, row: nr })
            occupiedKeys.add(key) // резервируем клетку, чтобы не занять её дважды
          } else {
            pendingSearch.push({ col: nc, row: nr }) // расширяем поиск
          }
        }
      }
    }

    // Добавляем токены из буфера в placedTokens новой карты
    let initiatorNewUid = null
    buffer.forEach((bt, i) => {
      const cell = freeQueue[i]
      if (!cell) return // места не нашлось — очень плотная карта
      // Генерируем свежий uid, чтобы не конфликтовать с существующими токенами
      const newUid = crypto.randomUUID()
      if (bt.uid === initiatorUid) initiatorNewUid = newUid
      gameStore.placedTokens.push({
        ...bt,
        uid: newUid,
        col: cell.col,
        row: cell.row,
      })
    })
    return initiatorNewUid
  }

  // Центрирует вид на токене по его позиции в сетке
  function centerOnToken(placed) {
    const cell = gameStore.cellSize
    const tokenX = placed.col * cell + cell / 2
    const tokenY = placed.row * cell + cell / 2
    const viewW = viewRef.value?.offsetWidth ?? window.innerWidth
    const viewH = viewRef.value?.offsetHeight ?? window.innerHeight
    offsetX.value = viewW / 2 - tokenX
    offsetY.value = viewH / 2 - tokenY
  }

  // GameMap вызывает emit('ready', canvas) когда изображение нарисовано
  const onMapReady = (canvas) => {
    canvasRef.value = canvas
    mapSize.value = { width: canvas.width, height: canvas.height }
    mapRef.value.style.width = `${canvas.width}px`
    mapRef.value.style.height = `${canvas.height}px`
  }
</script>

<style scoped lang="scss">
  .game-view {
    position: relative;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    color: var(--color-text);
    font-family: var(--font-ui);
    user-select: none;

    &::after {
      content: '';
      position: fixed;
      inset: 0;
      z-index: 9999;
      pointer-events: none;
      box-shadow: inset 0 0 0 0 transparent;
      transition: box-shadow 0.6s ease;
    }

    &--combat::after {
      box-shadow: inset 0 0 80px 20px rgb(200 30 30 / 35%);
      animation: combat-pulse 2.5s ease-in-out infinite;
    }
  }

  @keyframes combat-pulse {
    0%,
    100% {
      box-shadow: inset 0 0 80px 20px rgb(200 30 30 / 35%);
    }

    50% {
      box-shadow: inset 0 0 120px 40px rgb(200 30 30 / 18%);
    }
  }

  /* ─── Игровое поле ────────────────────────────────────────────────────────── */
  .game-view__map {
    position: absolute;
    top: 0;
    left: 0;
    z-index: var(--z-map);
    cursor: grab;

    &:active {
      cursor: grabbing;
    }

    &::after {
      content: '';
      position: absolute;
      inset: calc(-1 * var(--map-border-size));
      z-index: var(--z-map-border);
      pointer-events: none;
      border: var(--map-border-size) solid transparent;
      border-image: url('/systemImage/border.jpg') var(--map-border-slice) round;
      clip-path: inset(0 round var(--map-border-radius));
    }
  }

  /* ─── Кнопка возврата ────────────────────────────────────────────────────── */
  .game-back {
    position: fixed;
    top: var(--space-4);
    left: var(--space-4);
    z-index: 20;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: rgb(0 0 0 / 70%);
    color: var(--color-text-muted);
    font-size: 13px;
    font-family: var(--font-ui);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }
</style>
