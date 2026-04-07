<template>
  <div class="scenario-editor">
    <!-- ── Левая панель: список сценариев ────────────────────────── -->
    <CampaignPanel
      :campaigns="campaignsStore.campaigns"
      :loading="campaignsStore.loading"
      :active-campaign-id="activeCampaignId"
      :campaign-name="campaignName"
      :saving="saving"
      :save-success="saveSuccess"
      :save-error="saveError"
      @select="loadCampaign"
      @update:campaign-name="campaignName = $event"
      @save="saveCampaign"
      @reset="resetEditor"
      @delete="deleteCampaign"
    />

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
        <ScenarioNodeCard
          v-for="node in levelsWithNodes"
          :key="node.scenarioId"
          :node="node"
          :is-start="startScenarioId === node.scenarioId"
          :is-target="
            hoveredNodeId === node.scenarioId && connecting && connectingFromId !== node.scenarioId
          "
          :node-w="NODE_W"
          :node-h="NODE_H"
          @mousedown="startNodeDrag($event, node)"
          @dblclick.stop="onNodeDblClick(node)"
          @mouseenter="hoveredNodeId = node.scenarioId"
          @mouseleave="hoveredNodeId = null"
          @start-connect="startConnect($event, node)"
          @toggle-start="toggleStart(node.scenarioId)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { onMounted, onBeforeUnmount } from 'vue'
  import { useScenariosStore } from '../stores/scenarios'
  import { useCampaignsStore } from '../stores/campaigns'
  import { useGameStore } from '../stores/game'
  import { useScenarioGraph } from '../composables/useScenarioGraph'
  import { useCampaignCrud } from '../composables/useCampaignCrud'
  import CampaignPanel from './CampaignPanel.vue'
  import ScenarioNodeCard from './ScenarioNodeCard.vue'

  const emit = defineEmits(['open-level'])

  const scenariosStore = useScenariosStore()
  const campaignsStore = useCampaignsStore()
  const gameStore = useGameStore()

  const graph = useScenarioGraph()
  const {
    canvasRef,
    NODE_W,
    NODE_H,
    edges,
    levels,
    levelsWithNodes,
    displayEdges,
    connecting,
    connectingFromId,
    connectingStart,
    connectingEnd,
    hoveredNodeId,
    startNodeDrag,
    startConnect,
    onMouseMove,
    onMouseUp,
    removeEdge,
  } = graph

  const {
    activeCampaignId,
    campaignName,
    startScenarioId,
    saving,
    saveSuccess,
    saveError,
    loadCampaign,
    resetEditor,
    toggleStart,
    saveCampaign,
    deleteCampaign,
  } = useCampaignCrud(graph)

  // Горизонтальный скролл колёсиком мыши.
  // Нужен { passive: false }, чтобы вызов e.preventDefault() не игнорировался браузером.
  function onCanvasWheel(e) {
    e.preventDefault()
    canvasRef.value.scrollLeft += e.deltaY
  }

  onBeforeUnmount(() => {
    canvasRef.value?.removeEventListener('wheel', onCanvasWheel)
  })

  // Двойной клик по узлу: открываем редактор дверей для этого сценария.
  // Строим временный объект кампании с текущими рёбрами (даже если не сохранены) —
  // GameDoorPopup читает campaign.edges и фильтрует список связанных локаций.
  function onNodeDblClick(node) {
    const tempCampaign = {
      id: activeCampaignId.value,
      edges: edges.value.map((e) => ({ from: e.from, to: e.to })),
    }
    gameStore.setActiveCampaign(tempCampaign)
    emit('open-level', { scenario: node.scenario })
  }

  onMounted(async () => {
    await Promise.all([scenariosStore.fetchScenarios(), campaignsStore.fetchCampaigns()])
    canvasRef.value?.addEventListener('wheel', onCanvasWheel, { passive: false })
  })
</script>

<style scoped lang="scss">
  /* ─── Общая разметка ────────────────────────────────────────────── */
  .scenario-editor {
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* ─── Холст графа ──────────────────────────────────────────────── */
  .scenario-canvas {
    flex: 1;
    overflow: auto hidden;
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

    /* ─── Кастомный горизонтальный скроллбар ────────────────────── */
    &::-webkit-scrollbar {
      height: 5px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--color-primary-dark);
      border-radius: 3px;
      transition: background var(--transition-fast);

      &:hover {
        background: var(--color-primary);
      }
    }
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
</style>
