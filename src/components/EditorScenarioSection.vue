<template>
  <div class="scenario-editor">
    <!-- ── Левая панель: список сценариев ────────────────────────── -->
    <div class="scenario-panel">
      <div class="scenario-panel__header">Сценарии</div>

      <div class="scenario-panel__list">
        <button
          v-for="c in campaignsStore.campaigns"
          :key="c.id"
          class="scenario-panel__item"
          :class="{ 'scenario-panel__item--active': activeCampaignId === c.id }"
          @click="loadCampaign(c)"
        >
          {{ c.name }}
        </button>
        <p
          v-if="!campaignsStore.campaigns.length && !campaignsStore.loading"
          class="scenario-panel__empty"
        >
          Нет сохранённых сценариев
        </p>
      </div>

      <div class="scenario-panel__footer">
        <input
          v-model.trim="campaignName"
          class="scenario-panel__input"
          type="text"
          placeholder="Название сценария"
          maxlength="80"
          @keydown.enter="saveCampaign"
        />
        <button
          class="scenario-panel__btn"
          :disabled="!campaignName || saving"
          @click="saveCampaign"
        >
          {{ saving ? 'Сохраняю…' : activeCampaignId ? 'Обновить' : 'Сохранить' }}
        </button>
        <div v-if="activeCampaignId" class="scenario-panel__actions">
          <button class="scenario-panel__btn scenario-panel__btn--secondary" @click="resetEditor">
            Новый
          </button>
          <button
            class="scenario-panel__btn scenario-panel__btn--danger"
            :disabled="saving"
            @click="onDeleteCampaign"
          >
            Удалить
          </button>
        </div>
        <p v-if="saveSuccess" class="scenario-panel__success">✔ Сохранено</p>
        <p v-if="saveError" class="scenario-panel__error">{{ saveError }}</p>
      </div>
    </div>

    <!-- ── Главный холст графа ───────────────────────────────── -->
    <div ref="canvasRef" class="scenario-canvas">
      <div
        class="scenario-canvas__content"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
      >
        <!-- Подсказки -->
        <p v-if="!levels.length" class="scenario-canvas__hint">
          Нет заполненных карт. Сначала расставьте токены на картах в разделе «Заполнить карты».
        </p>
        <p v-else-if="levels.length && !edges.length" class="scenario-canvas__hint">
          Перетящите <strong>золотую точку</strong> на карточке к другой, чтобы создать связь.
        </p>

        <!-- SVG: рёбра графа -->
        <svg
          class="scenario-canvas__svg"
          style="position: absolute; inset: 0; pointer-events: none"
          width="3000"
          height="2000"
        >
          <!-- Существующие связи -->
          <g v-for="edge in displayEdges" :key="edge.key">
            <!-- Видимая линия -->
            <line :x1="edge.x1" :y1="edge.y1" :x2="edge.x2" :y2="edge.y2" class="scenario-edge" />
            <!-- Невидимая широкая полоса для клика -->
            <line
              :x1="edge.x1"
              :y1="edge.y1"
              :x2="edge.x2"
              :y2="edge.y2"
              stroke="transparent"
              stroke-width="16"
              style="pointer-events: auto; cursor: pointer"
              @click="removeEdge(edge)"
            />
          </g>

          <!-- Временная даштная линия при создании связи -->
          <line
            v-if="connecting"
            :x1="connectingStart.x"
            :y1="connectingStart.y"
            :x2="connectingEnd.x"
            :y2="connectingEnd.y"
            class="scenario-edge scenario-edge--temp"
          />
        </svg>

        <!-- Карточки локаций (узлы графа) -->
        <div
          v-for="node in levelsWithNodes"
          :key="node.scenarioId"
          class="scenario-node"
          :class="{
            'scenario-node--target':
              hoveredNodeId === node.scenarioId &&
              connecting &&
              connectingFromId !== node.scenarioId,
            'scenario-node--start': startScenarioId === node.scenarioId,
          }"
          :style="{
            left: node.x + 'px',
            top: node.y + 'px',
            width: NODE_W + 'px',
            height: NODE_H + 'px',
          }"
          @mousedown="startNodeDrag($event, node)"
          @dblclick.stop="onNodeDblClick(node)"
          @mouseenter="hoveredNodeId = node.scenarioId"
          @mouseleave="hoveredNodeId = null"
        >
          <!-- Значок стартовой локации -->
          <div
            v-if="startScenarioId === node.scenarioId"
            class="scenario-node__start-badge"
            title="Стартовая локация"
          >
            ⭐
          </div>

          <img
            v-if="node.scenario.mapImageUrl"
            :src="node.scenario.mapImageUrl"
            class="scenario-node__img"
            draggable="false"
          />
          <div v-else class="scenario-node__no-img">Нет карты</div>

          <!-- Нижняя строка: название + кнопка стартовой локации -->
          <div class="scenario-node__footer">
            <span class="scenario-node__name">{{ node.scenario.name || 'Без названия' }}</span>
            <button
              class="scenario-node__start-btn"
              :class="{ 'scenario-node__start-btn--active': startScenarioId === node.scenarioId }"
              :title="
                startScenarioId === node.scenarioId ? 'Снять как стартовую' : 'Назначить стартовой'
              "
              @mousedown.stop
              @click.stop="toggleStart(node.scenarioId)"
            >
              {{ startScenarioId === node.scenarioId ? '★' : '☆' }}
            </button>
          </div>

          <!-- Порт для создания связей -->
          <div
            class="scenario-node__port"
            title="Перетящите к другой карточке чтобы создать связь"
            @mousedown.stop="startConnect($event, node)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, reactive, onMounted } from 'vue'
  import { useScenariosStore } from '../stores/scenarios'
  import { useCampaignsStore } from '../stores/campaigns'
  import { useGameStore } from '../stores/game'

  const emit = defineEmits(['open-level'])

  const scenariosStore = useScenariosStore()
  const campaignsStore = useCampaignsStore()
  const gameStore = useGameStore()

  // ─── Константы размеров ──────────────────────────────────────────────────
  const NODE_W = 160
  const NODE_H = 110
  const GRID_COLS = 4
  const GRID_GAP = 52
  // Порог в пикселях: драг активируется только при движении больше этого значения
  const DRAG_THRESHOLD = 5

  // ─── Состояние кампании ────────────────────────────────────────────
  const activeCampaignId = ref(null)
  const campaignName = ref('')
  const saving = ref(false)
  const saveSuccess = ref(false)
  const saveError = ref('')
  // ID сценария, помеченного как стартовая локация (null = не задана)
  const startScenarioId = ref(null)

  // ─── Граф: позиции узлов и рёбра ───────────────────────────────
  // nodePos[scenarioId] = { x, y } — позиция центра карточки на холсте
  const nodePos = reactive({})
  const edges = ref([]) // [{ from: scenarioId, to: scenarioId }]

  // ─── Взаимодействие с холстом ─────────────────────────────────────
  const canvasRef = ref(null)
  const draggingNodeId = ref(null)
  const _dragOffset = { x: 0, y: 0 } // pendingDrag: mousedown зафиксирован — драг начинается после преодоления DRAG_THRESHOLD
  const pendingDrag = ref(null) // { nodeId, startX, startY, offsetX, offsetY }
  const connecting = ref(false)
  const connectingFromId = ref(null)
  const connectingStart = ref({ x: 0, y: 0 })
  const connectingEnd = ref({ x: 0, y: 0 })
  const hoveredNodeId = ref(null)

  // ─── Вычисляемые ─────────────────────────────────────────────────
  const levels = computed(() => scenariosStore.scenarios.filter((s) => s.tokensCount > 0))

  function defaultX(i) {
    return (i % GRID_COLS) * (NODE_W + GRID_GAP) + GRID_GAP
  }
  function defaultY(i) {
    return Math.floor(i / GRID_COLS) * (NODE_H + GRID_GAP) + GRID_GAP
  }

  // Каждый уровень получает позицию: сохранённую или дефолтную в сетке
  const levelsWithNodes = computed(() =>
    levels.value.map((s, i) => {
      const sid = String(s.id)
      return {
        scenarioId: sid,
        scenario: s,
        x: nodePos[sid]?.x ?? defaultX(i),
        y: nodePos[sid]?.y ?? defaultY(i),
      }
    })
  )

  // Рёбра с пиксельными координатами для SVG
  const displayEdges = computed(() =>
    edges.value.flatMap((edge) => {
      const fn = levelsWithNodes.value.find((n) => n.scenarioId === edge.from)
      const tn = levelsWithNodes.value.find((n) => n.scenarioId === edge.to)
      if (!fn || !tn) return []
      return [
        {
          key: `${edge.from}__${edge.to}`,
          x1: fn.x + NODE_W / 2,
          y1: fn.y + NODE_H / 2,
          x2: tn.x + NODE_W / 2,
          y2: tn.y + NODE_H / 2,
          from: edge.from,
          to: edge.to,
        },
      ]
    })
  )

  // ─── Координаты релативно холста ───────────────────────────────────
  // clientX/clientY — оконные координаты, canvasRef — скролляемый контейнер.
  // scrollLeft/scrollTop компенсируют прокрутку, давая позицию внутри content.
  function canvasPos(e) {
    const c = canvasRef.value
    const r = c.getBoundingClientRect()
    return { x: e.clientX - r.left + c.scrollLeft, y: e.clientY - r.top + c.scrollTop }
  }

  // ─── Перемещение узла ────────────────────────────────────────────────
  // mousedown только регистрирует потенциальный драг (до порога DRAG_THRESHOLD).
  // Это позволяет отличать одиночный клик/двойной клик (открытие редактора дверей) от драга.
  function startNodeDrag(e, node) {
    // Клик по порту запускает создание связи, а не перемещение
    if (e.target.classList.contains('scenario-node__port')) return
    e.preventDefault()
    const pos = canvasPos(e)
    pendingDrag.value = {
      nodeId: node.scenarioId,
      startX: pos.x,
      startY: pos.y,
      offsetX: pos.x - node.x,
      offsetY: pos.y - node.y,
    }
  }

  // ─── Создание связи драгом с порта ────────────────────────────────
  function startConnect(e, node) {
    e.preventDefault()
    connecting.value = true
    connectingFromId.value = node.scenarioId
    connectingStart.value = { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 }
    connectingEnd.value = canvasPos(e)
  }

  // ─── Обработчики движения мыши ──────────────────────────────────
  function onMouseMove(e) {
    const pos = canvasPos(e)
    // Проверяем порог перед активацией драга
    if (pendingDrag.value && !draggingNodeId.value) {
      const dx = Math.abs(pos.x - pendingDrag.value.startX)
      const dy = Math.abs(pos.y - pendingDrag.value.startY)
      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        draggingNodeId.value = pendingDrag.value.nodeId
        _dragOffset.x = pendingDrag.value.offsetX
        _dragOffset.y = pendingDrag.value.offsetY
        pendingDrag.value = null
      }
    }
    if (draggingNodeId.value) {
      nodePos[draggingNodeId.value] = {
        x: Math.max(0, pos.x - _dragOffset.x),
        y: Math.max(0, pos.y - _dragOffset.y),
      }
    }
    if (connecting.value) {
      connectingEnd.value = pos
    }
  }

  function onMouseUp() {
    if (
      connecting.value &&
      connectingFromId.value &&
      hoveredNodeId.value &&
      hoveredNodeId.value !== connectingFromId.value
    ) {
      addEdge(connectingFromId.value, hoveredNodeId.value)
    }
    connecting.value = false
    connectingFromId.value = null
    draggingNodeId.value = null
    pendingDrag.value = null
  }

  // ─── Управление рёбрами ──────────────────────────────────────────
  function addEdge(fromId, toId) {
    const exists = edges.value.some(
      (e) => (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
    )
    if (!exists) edges.value.push({ from: fromId, to: toId })
  }

  function removeEdge(edge) {
    edges.value = edges.value.filter(
      (e) =>
        !((e.from === edge.from && e.to === edge.to) || (e.from === edge.to && e.to === edge.from))
    )
  }

  // Переключить стартовую локацию (повторный клик снимает отметку)
  function toggleStart(scenarioId) {
    startScenarioId.value = startScenarioId.value === scenarioId ? null : scenarioId
  }

  // ─── Загрузка кампании ─────────────────────────────────────────
  function loadCampaign(campaign) {
    activeCampaignId.value = campaign.id
    campaignName.value = campaign.name
    saveSuccess.value = false
    saveError.value = ''

    // Очистить текущее состояние
    Object.keys(nodePos).forEach((k) => delete nodePos[k])
    edges.value = []

    // Восстановить позиции узлов
    for (const node of campaign.nodes) {
      nodePos[String(node.scenarioId)] = { x: node.x, y: node.y }
    }
    // Восстановить рёбра
    edges.value = campaign.edges.map((e) => ({ from: String(e.from), to: String(e.to) }))
    // Восстановить стартовую локацию
    startScenarioId.value = campaign.startScenarioId ?? null
  }

  function resetEditor() {
    activeCampaignId.value = null
    campaignName.value = ''
    saveSuccess.value = false
    saveError.value = ''
    startScenarioId.value = null
    Object.keys(nodePos).forEach((k) => delete nodePos[k])
    edges.value = []
  }

  // ─── Сохранение кампании ───────────────────────────────────────
  async function saveCampaign() {
    if (!campaignName.value) return
    saving.value = true
    saveError.value = ''
    saveSuccess.value = false
    try {
      const data = {
        name: campaignName.value,
        // Сохраняем позиции всех уровней (включая новые, которые ещё не были в кампании)
        nodes: levelsWithNodes.value.map(({ scenarioId, x, y }) => ({ scenarioId, x, y })),
        edges: edges.value,
        startScenarioId: startScenarioId.value || null,
      }
      if (activeCampaignId.value) {
        await campaignsStore.updateCampaign(activeCampaignId.value, data)
      } else {
        const result = await campaignsStore.createCampaign(data)
        activeCampaignId.value = result.id
      }
      saveSuccess.value = true
      setTimeout(() => (saveSuccess.value = false), 3000)
    } catch (err) {
      saveError.value = err.message || 'Ошибка при сохранении'
    } finally {
      saving.value = false
    }
  }

  async function onDeleteCampaign() {
    if (!confirm(`Удалить сценарий «${campaignName.value}»?`)) return
    try {
      await campaignsStore.deleteCampaign(activeCampaignId.value)
      resetEditor()
    } catch (err) {
      saveError.value = err.message || 'Ошибка при удалении'
    }
  }

  // ─── Открытие уровня для редактирования дверей ────────────────────────────
  // Двойной клик по узлу переключает секцию на «Заполнить карты»,
  // предварительно задав activeCampaign с текущими рёбрами графа.
  // GameDoorPopup автоматически отфильтрует список только связанными локациями.
  function onNodeDblClick(node) {
    // Сбрасываем незавершённый drag чтобы не было конфликта
    pendingDrag.value = null
    draggingNodeId.value = null

    // Построить временный объект кампании с текущим состоянием рёбер (даже если не сохранён).
    // getConnectedIds в GameDoorPopup читает campaign.edges → фильтрует список.
    const tempCampaign = {
      id: activeCampaignId.value,
      edges: edges.value.map((e) => ({ from: e.from, to: e.to })),
    }
    gameStore.setActiveCampaign(tempCampaign)

    emit('open-level', { scenario: node.scenario })
  }

  // ─── Жизненный цикл ─────────────────────────────────────────────────
  onMounted(async () => {
    await Promise.all([scenariosStore.fetchScenarios(), campaignsStore.fetchCampaigns()])
  })
</script>

<style scoped>
  /* ─── Общая разметка ────────────────────────────────────────────── */
  .scenario-editor {
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* ─── Левая панель: список сценариев ────────────────────── */
  .scenario-panel {
    width: 210px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-6);
    background: rgb(0 0 0 / 50%);
    border-right: 1px solid var(--color-border);
    overflow-y: auto;
  }

  .scenario-panel__header {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
  }

  .scenario-panel__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
  }

  .scenario-panel__item {
    text-align: left;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text);
    font-family: var(--font-ui);
    font-size: 13px;
    cursor: pointer;
    transition: background var(--transition-fast);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover {
      background: rgb(255 255 255 / 6%);
    }

    &--active {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  .scenario-panel__empty {
    font-size: 12px;
    color: var(--color-text-muted);
    text-align: center;
    padding: var(--space-4) 0;
  }

  .scenario-panel__footer {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-block-start: var(--space-4);
    border-block-start: 1px solid var(--color-border);
  }

  .scenario-panel__input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: rgb(255 255 255 / 5%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-family: var(--font-ui);
    font-size: 13px;
    outline: none;
    box-sizing: border-box;

    &:focus {
      border-color: var(--color-primary);
    }
  }

  .scenario-panel__btn {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-primary);
    background: rgb(0 0 0 / 40%);
    color: var(--color-primary);
    font-family: var(--font-ui);
    font-size: 13px;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      color var(--transition-fast);

    &:hover:not(:disabled) {
      background: var(--color-primary);
      color: #000;
    }

    &:disabled {
      opacity: 0.4;
      cursor: default;
    }

    &--secondary {
      border-color: var(--color-border);
      color: var(--color-text-muted);
    }

    &--danger {
      border-color: #ef4444;
      color: #ef4444;

      &:hover:not(:disabled) {
        background: #ef4444;
        color: #fff;
      }
    }
  }

  .scenario-panel__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .scenario-panel__success {
    font-size: 12px;
    color: #4ade80;
    text-align: center;
  }

  .scenario-panel__error {
    font-size: 12px;
    color: #f87171;
    text-align: center;
  }

  /* ─── Холст графа ──────────────────────────────────────────────── */
  .scenario-canvas {
    flex: 1;
    overflow: auto;
    min-height: 0;
    background:
      radial-gradient(circle at 50% 50%, rgb(200 154 74 / 3%) 0%, transparent 70%),
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 39px,
        rgb(255 255 255 / 3%) 39px,
        rgb(255 255 255 / 3%) 40px
      ),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 39px,
        rgb(255 255 255 / 3%) 39px,
        rgb(255 255 255 / 3%) 40px
      );
  }

  .scenario-canvas__content {
    position: relative;
    width: 3000px;
    height: 2000px;
  }

  .scenario-canvas__hint {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 14px;
    color: var(--color-text-muted);
    text-align: center;
    pointer-events: none;
    max-width: 400px;
    line-height: 1.6;

    strong {
      color: var(--color-primary);
    }
  }

  /* ─── SVG рёбра ─────────────────────────────────────────────────── */
  .scenario-edge {
    stroke: var(--color-primary);
    stroke-width: 2;
    opacity: 0.8;
    filter: drop-shadow(0 0 4px var(--color-primary-glow));

    &--temp {
      stroke-dasharray: 8 5;
      opacity: 0.5;
      filter: none;
    }
  }

  /* ─── Карточка локации ──────────────────────────────────────── */
  .scenario-node {
    position: absolute;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    overflow: visible;
    cursor: grab;
    user-select: none;
    transition:
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);

    &:hover {
      border-color: rgb(200 154 74 / 50%);
    }

    &--target {
      border-color: var(--color-primary);
      box-shadow: 0 0 12px var(--color-primary-glow);
    }
  }

  .scenario-node__img {
    display: block;
    width: 100%;
    height: 74px;
    object-fit: cover;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    pointer-events: none;
  }

  .scenario-node__no-img {
    height: 74px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--color-text-muted);
    background: rgb(255 255 255 / 3%);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    pointer-events: none;
  }

  .scenario-node__name {
    flex: 1;
    font-size: 12px;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
  }

  .scenario-node__footer {
    display: flex;
    align-items: center;
    padding: var(--space-1) var(--space-2);
    gap: var(--space-1);
  }

  .scenario-node__port {
    position: absolute;
    right: -7px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--color-primary);
    border: 2px solid var(--color-bg);
    cursor: crosshair;
    z-index: 2;
    transition:
      transform var(--transition-fast),
      box-shadow var(--transition-fast);

    &:hover {
      transform: translateY(-50%) scale(1.4);
      box-shadow: 0 0 8px var(--color-primary-glow);
    }
  }

  /* Стартовая карточка — золотая рамка */
  .scenario-node--start {
    border-color: #facc15;
    box-shadow: 0 0 10px rgb(250 204 21 / 40%);
  }

  /* Значок ⭐ в углу стартовой карточки */
  .scenario-node__start-badge {
    position: absolute;
    top: 4px;
    left: 4px;
    font-size: 14px;
    line-height: 1;
    pointer-events: none;
    z-index: 3;
    filter: drop-shadow(0 0 3px rgb(250 204 21 / 80%));
  }

  /* Кнопка ☆/★ для назначения стартовой локации */
  .scenario-node__start-btn {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 1px solid rgb(255 255 255 / 20%);
    border-radius: 50%;
    background: rgb(0 0 0 / 40%);
    color: rgb(255 255 255 / 60%);
    font-size: 12px;
    line-height: 18px;
    text-align: center;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      color var(--transition-fast),
      border-color var(--transition-fast);

    &:hover {
      background: rgb(0 0 0 / 70%);
      color: #facc15;
      border-color: #facc15;
    }

    &--active {
      background: rgb(0 0 0 / 70%);
      color: #facc15;
      border-color: #facc15;
    }
  }
</style>
