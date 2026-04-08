<template>
  <div
    ref="viewRef"
    class="game-view"
    @mousemove="onMouseMove"
    @contextmenu="onContextMenu"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <AppBackground src="/video/maw.gif" />

    <!-- ── Состояние 1: выбор карты ──────────────────────────────────────────── -->
    <template v-if="!selectedScenario">
      <div class="game-picker">
        <router-link class="game-picker__back" :to="{ name: 'menu' }">← Меню</router-link>

        <!-- ── Продолжить сохранённую игру ────────────────────────────────── -->
        <template v-if="gameSessionsStore.sessions.length">
          <h2 class="game-picker__title">Продолжить</h2>
          <div class="game-picker__grid">
            <div
              v-for="session in gameSessionsStore.sessions"
              :key="session.id ?? session._id"
              class="game-card game-card--session"
            >
              <div class="game-card__campaign-icon">📜</div>
              <p class="game-card__name">{{ session.name }}</p>
              <p class="game-card__meta">{{ session.campaignName }}</p>
              <p class="game-card__meta game-card__meta--sub">{{ session.currentScenarioName }}</p>
              <div class="game-card__session-actions">
                <button
                  class="game-card__btn game-card__btn--continue"
                  :disabled="loadingId === (session.id ?? session._id)"
                  @mouseenter="playHover"
                  @click="resumeSession(session)"
                >
                  <span v-if="loadingId === (session.id ?? session._id)">Загрузка…</span>
                  <span v-else>▶ Играть</span>
                </button>
                <button
                  class="game-card__btn game-card__btn--delete"
                  title="Удалить сохранение"
                  @mouseenter="playHover"
                  @click="deleteSession(session)"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
          <div class="game-picker__divider" />
        </template>

        <!-- ── Начать новый ────────────────────────────────────────────────── -->
        <h2 class="game-picker__title">Начать новый</h2>
        <p v-if="campaignsStore.loading" class="game-picker__hint">Загрузка…</p>
        <p v-else-if="!campaignsStore.campaigns.length" class="game-picker__hint">
          Нет сценариев. Мастер должен создать сценарий в редакторе.
        </p>
        <div v-else class="game-picker__grid">
          <button
            v-for="c in campaignsStore.campaigns"
            :key="c.id"
            class="game-card"
            :disabled="loadingId === c.id"
            @mouseenter="playHover"
            @click="selectCampaign(c)"
          >
            <div class="game-card__campaign-icon">🗺️</div>
            <p class="game-card__name">{{ c.name }}</p>
            <p class="game-card__meta">{{ campaignLevelCount(c) }} карт</p>
            <span v-if="loadingId === c.id" class="game-card__loading">Загрузка…</span>
          </button>
        </div>

        <p v-if="loadError" class="game-picker__error">{{ loadError }}</p>
      </div>
    </template>

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
        <GameFog :width="mapSize.width" :height="mapSize.height" />
      </div>

      <GameMenu @mouseenter="onMenuEnter" @mouseleave="onMenuLeave" />

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
  import { useSound } from '../composables/useSound'
  import { useAdminCursor } from '../composables/useAdminCursor'
  import AppBackground from '../components/AppBackground.vue'
  import GameMap from '../components/GameMap.vue'
  import GameGrid from '../components/GameGrid.vue'
  import GameRangeOverlay from '../components/GameRangeOverlay.vue'
  import GameFog from '../components/GameFog.vue'
  import GameTokens from '../components/GameTokens.vue'
  import GameMenu from '../components/GameMenu.vue'
  import GameSavePopup from '../components/GameSavePopup.vue'
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
  const { playHover, playClick } = useSound()

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

  onUnmounted(() => {
    if (sessionActive.value) {
      getSocket()?.emit('game:session:close')
      sessionActive.value = false
    }
  })

  const gameStore = useGameStore()
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
    // Подключаем сокет для трансляции зрителям
    if (auth.role === 'admin') {
      connect(auth.token)
    }
  })

  // Количество уровней в кампании — для подписи на карточке
  function campaignLevelCount(campaign) {
    const nodeIds = new Set(campaign.nodes.map((n) => String(n.scenarioId)))
    return scenariosStore.scenarios.filter((s) => s.tokensCount > 0 && nodeIds.has(String(s.id)))
      .length
  }

  function backToCampaigns() {
    gameStore.setActiveCampaign(null)
  }

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
      sessionChanged.value = false
      gameStore.currentScenario = full
      selectedScenario.value = full

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

  // Переход через дверь: двойной клик по токену-двери с привязанным targetScenarioId
  async function onDoorTransition({ targetScenarioId, sourceScenarioId }) {
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
    }
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
  }

  /* ─── Экран выбора карты ──────────────────────────────────────────────────── */
  .game-picker {
    position: relative;
    z-index: 1;
    height: 100%;
    overflow-y: auto;
    padding: var(--space-6) var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .game-picker__back {
    align-self: flex-start;
    font-size: 13px;
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--color-primary);
    }
  }

  .game-picker__title {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }

  .game-picker__hint {
    font-size: 13px;
    color: var(--color-text-muted);
  }

  .game-picker__level-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .game-picker__campaign-back {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    font-family: var(--font-ui);
    font-size: 13px;
    cursor: pointer;
    flex-shrink: 0;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--color-text);
    }
  }

  .game-picker__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--space-4);
  }

  .game-picker__error {
    font-size: 13px;
    color: var(--color-error);
  }

  .game-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: rgb(0 0 0 / 40%);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast);

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      background: rgb(255 255 255 / 5%);
    }

    &:disabled {
      cursor: wait;
      opacity: 0.6;
    }
  }

  .game-card__campaign-icon {
    font-size: 40px;
    padding: var(--space-6) 0 var(--space-2);
    text-align: center;
  }

  .game-card__img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }

  .game-card__no-img {
    width: 100%;
    aspect-ratio: 16 / 9;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(255 255 255 / 4%);
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .game-card__name {
    color: var(--color-text);
    padding: var(--space-2) var(--space-3);
    font-size: 13px;
    text-align: left;
    font-weight: 500;
  }

  .game-card__meta {
    padding: 0 var(--space-3) var(--space-2);
    font-size: 11px;
    color: var(--color-text-muted);
    text-align: left;
  }

  .game-card__loading {
    display: block;
    padding: var(--space-1) var(--space-3) var(--space-2);
    font-size: 11px;
    color: var(--color-text-muted);
  }

  /* ─── Карточка сохранённой сессии ──────────────────────────────────────────── */
  .game-card--session {
    cursor: default;
    border-color: rgb(255 255 255 / 20%);

    &:hover {
      border-color: var(--color-primary);
    }
  }

  .game-card__meta--sub {
    font-size: 10px;
    opacity: 0.65;
    padding-top: 0;
  }

  .game-card__session-actions {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3) var(--space-3);
    margin-top: auto;
  }

  .game-card__btn {
    font-size: 12px;
    cursor: pointer;

    &:disabled {
      opacity: 0.45;
      cursor: default;
    }

    &--continue {
      @include btn-primary;

      flex: 1;
      padding: var(--space-1) var(--space-3);
      font-size: 12px;
    }

    &--delete {
      @include btn-danger;

      padding: var(--space-1) var(--space-2);
      font-size: 12px;
    }
  }

  /* ─── Разделитель между секциями пикера ────────────────────────────────────── */
  .game-picker__divider {
    height: 1px;
    background: rgb(255 255 255 / 10%);
    margin: var(--space-2) 0;
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
