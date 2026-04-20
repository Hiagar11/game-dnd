<template>
  <div class="scenario-editor">
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

    <div ref="canvasRef" class="scenario-canvas">
      <div
        class="scenario-canvas__content"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
      >
        <p v-if="!levels.length" class="scenario-canvas__hint">
          Нет заполненных карт. Сначала расставьте токены на картах в разделе «Заполнить карты».
        </p>
        <p v-else-if="levels.length && !edges.length" class="scenario-canvas__hint">
          Перетящите <strong>золотую точку</strong> на карточке к другой, чтобы создать связь.
        </p>

        <svg class="scenario-canvas__svg" width="3000" height="2000">
          <g v-for="edge in displayEdges" :key="edge.key">
            <line :x1="edge.x1" :y1="edge.y1" :x2="edge.x2" :y2="edge.y2" class="scenario-edge" />
            <line
              :x1="edge.x1"
              :y1="edge.y1"
              :x2="edge.x2"
              :y2="edge.y2"
              stroke="transparent"
              stroke-width="16"
              style="pointer-events: auto; cursor: pointer"
              @click="removeEdge(edge)"
              @contextmenu.prevent="removeEdge(edge)"
            />
            <!-- Название остановки на рёбрах к глобальной карте -->
            <text
              v-if="edge.stopLabel"
              :x="(edge.x1 + edge.x2) / 2"
              :y="(edge.y1 + edge.y2) / 2 - 6"
              class="scenario-edge__label"
            >
              {{ edge.stopLabel }}
            </text>
          </g>

          <line
            v-if="connecting"
            :x1="connectingStart.x"
            :y1="connectingStart.y"
            :x2="connectingEnd.x"
            :y2="connectingEnd.y"
            class="scenario-edge scenario-edge--temp"
          />
        </svg>

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

        <!-- Карточка глобальной карты -->
        <div
          v-if="globalMapNode"
          class="global-map-node"
          :class="{
            'global-map-node--target':
              hoveredNodeId === GLOBAL_MAP_NODE_ID &&
              connecting &&
              connectingFromId !== GLOBAL_MAP_NODE_ID,
          }"
          :style="{
            left: globalMapNode.x + 'px',
            top: globalMapNode.y + 'px',
            width: NODE_W + 'px',
            height: NODE_H + 'px',
          }"
          @mousedown="startNodeDrag($event, globalMapNode)"
          @mouseenter="hoveredNodeId = GLOBAL_MAP_NODE_ID"
          @mouseleave="hoveredNodeId = null"
        >
          <img
            v-if="globalMapNode.globalMap.imageUrl"
            :src="globalMapNode.globalMap.imageUrl"
            class="global-map-node__img"
            draggable="false"
          />
          <div v-else class="global-map-node__no-img">🌍</div>
          <div class="global-map-node__footer">
            <span class="global-map-node__label">Глобальная карта</span>
          </div>
          <div
            class="scenario-node__port"
            title="Перетяните от другой карточки для создания связи"
          />
        </div>
      </div>
    </div>

    <!-- Попап выбора остановки на глобальной карте -->
    <GlobalMapStopPicker
      :visible="showStopPicker"
      :stops="globalMapStops"
      @close="showStopPicker = false"
      @pick="onStopPicked"
    />
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
  import { useScenariosStore } from '../stores/scenarios'
  import { useCampaignsStore } from '../stores/campaigns'
  import { useGlobalMapsStore } from '../stores/globalMaps'
  import { useGameStore } from '../stores/game'
  import { useScenarioGraph } from '../composables/useScenarioGraph'
  import { useCampaignCrud } from '../composables/useCampaignCrud'
  import CampaignPanel from './CampaignPanel.vue'
  import ScenarioNodeCard from './ScenarioNodeCard.vue'
  import GlobalMapStopPicker from './GlobalMapStopPicker.vue'

  const emit = defineEmits(['open-level'])

  const scenariosStore = useScenariosStore()
  const campaignsStore = useCampaignsStore()
  const globalMapsStore = useGlobalMapsStore()
  const gameStore = useGameStore()

  const graph = useScenarioGraph()
  const {
    canvasRef,
    NODE_W,
    NODE_H,
    GLOBAL_MAP_NODE_ID,
    edges,
    levels,
    levelsWithNodes,
    globalMapNode,
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
    globalMapId,
    saving,
    saveSuccess,
    saveError,
    loadCampaign,
    resetEditor,
    toggleStart,
    saveCampaign,
    deleteCampaign,
  } = useCampaignCrud(graph)

  // ─── Попап выбора остановки ──────────────────────────────────────────────────
  const showStopPicker = ref(false)
  const pendingConnectFromId = ref(null)

  // Остановки текущей глобальной карты, исключая уже занятые другими связями
  const globalMapStops = computed(() => {
    const allStops = globalMapNode.value?.globalMap?.stops ?? []
    // Собираем uid остановок, уже привязанных к какому-либо сценарию
    const usedUids = new Set(
      edges.value.filter((e) => e.to === null && e.stopUid).map((e) => e.stopUid)
    )
    return allStops.filter((s) => !usedUids.has(s.uid))
  })

  // Когда тянут связь К глобальной карте — открываем попап
  graph.setOnConnectToGlobalMap((fromScenarioId) => {
    pendingConnectFromId.value = fromScenarioId
    showStopPicker.value = true
  })

  function onStopPicked(stop) {
    if (pendingConnectFromId.value) {
      graph.addEdge(pendingConnectFromId.value, GLOBAL_MAP_NODE_ID, stop.uid)
    }
    showStopPicker.value = false
    pendingConnectFromId.value = null
  }

  function onCanvasWheel(e) {
    e.preventDefault()
    canvasRef.value.scrollLeft += e.deltaY
  }

  onBeforeUnmount(() => {
    canvasRef.value?.removeEventListener('wheel', onCanvasWheel)
  })

  function onNodeDblClick(node) {
    const tempCampaign = {
      id: activeCampaignId.value,
      edges: edges.value.map((e) => ({ from: e.from, to: e.to, stopUid: e.stopUid || null })),
    }
    gameStore.setActiveCampaign(tempCampaign)
    emit('open-level', { scenario: node.scenario })
  }

  onMounted(async () => {
    await Promise.all([
      scenariosStore.fetchScenarios(),
      campaignsStore.fetchCampaigns(),
      globalMapsStore.fetchMaps(),
    ])
    // Если есть глобальная карта — берём первую и показываем на холсте
    if (globalMapsStore.maps.length) {
      const gm = globalMapsStore.maps[0]
      graph.globalMapData.value = gm
      globalMapId.value = gm.id
    }
    canvasRef.value?.addEventListener('wheel', onCanvasWheel, { passive: false })
  })
</script>

<style scoped lang="scss">
  .scenario-editor {
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

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

  .scenario-canvas__svg {
    position: absolute;
    inset: 0;
    pointer-events: none;
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

    &__label {
      fill: #4ade80;
      font-size: 11px;
      font-weight: 600;
      text-anchor: middle;
      pointer-events: none;
      filter: drop-shadow(0 1px 2px rgb(0 0 0 / 80%));
    }
  }

  .global-map-node {
    position: absolute;
    border-radius: var(--radius-md);
    border: 2px dashed rgb(100 200 120 / 60%);
    background: var(--color-surface);
    overflow: visible;
    cursor: grab;
    user-select: none;
    transition:
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);

    &:hover {
      border-color: rgb(100 200 120 / 90%);
    }

    &--target {
      border-color: #4ade80;
      box-shadow: 0 0 12px rgb(74 222 128 / 40%);
    }
  }

  .global-map-node__img {
    display: block;
    width: 100%;
    height: 74px;
    object-fit: cover;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    pointer-events: none;
  }

  .global-map-node__no-img {
    height: 74px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    background: rgb(100 200 120 / 5%);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    pointer-events: none;
  }

  .global-map-node__footer {
    display: flex;
    align-items: center;
    padding: var(--space-1) var(--space-2);
  }

  .global-map-node__label {
    flex: 1;
    font-size: 11px;
    color: #4ade80;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    pointer-events: none;
  }
</style>
