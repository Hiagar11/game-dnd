<template>
  <div
    ref="viewRef"
    class="game-view"
    :class="{ 'game-view--combat': gameStore.combatMode }"
    @mousemove="onMouseMove"
    @contextmenu="onContextMenu"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
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
        <GameGroundLoot :width="mapSize.width" :height="mapSize.height" @open-loot="onOpenLoot" />
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

    <!-- Попап итогов диалогов НПС — появляется до попапа сохранения -->
    <GameSessionSummaryPopup
      :visible="showSummaryPopup"
      :npcs="summaryNpcs"
      @save="onSummaryConfirm"
      @skip="onSummarySkip"
    />

    <!-- Боевой попап: появляется когда образована боевая пара -->
    <GameCombatPopup
      :visible="!!gameStore.combatPair"
      @close="gameStore.setCombatPair(null, null)"
    />

    <!-- Попап подбора лута с земли — двойной инвентарь -->
    <GameLootPickupPopup :pile="lootPile" @close="lootPile = null" />
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { useMapPan } from '../composables/useMapPan'
  import { useSocket } from '../composables/useSocket'
  import {
    useSound,
    playBattleMusic,
    stopBattleMusic,
    playTravelMusic,
    stopTravelMusic,
  } from '../composables/useSound'
  import { useGameViewProviders } from '../composables/useGameViewProviders'
  import AppBackground from '../components/AppBackground.vue'
  import GamePicker from '../components/GamePicker.vue'
  import GameMap from '../components/GameMap.vue'
  import GameGrid from '../components/GameGrid.vue'
  import GameRangeOverlay from '../components/GameRangeOverlay.vue'
  import GameFog from '../components/GameFog.vue'
  import GameTokens from '../components/GameTokens.vue'
  import GameGroundLoot from '../components/GameGroundLoot.vue'
  import GameMenu from '../components/GameMenu.vue'
  import GameCombatTracker from '../components/GameCombatTracker.vue'
  import GameSavePopup from '../components/GameSavePopup.vue'
  import GameCombatPopup from '../components/GameCombatPopup.vue'
  import GameLootPickupPopup from '../components/GameLootPickupPopup.vue'
  import GameSessionSummaryPopup from '../components/GameSessionSummaryPopup.vue'
  import { useTokenDrop } from '../composables/useTokenDrop'
  import { useTokenContextMenu } from '../composables/useTokenContextMenu'
  import { useDoorTransition } from '../composables/useDoorTransition'
  import { useSessionExitFlow } from '../composables/useSessionExitFlow'
  import { useScenarioSelectionFlow } from '../composables/useScenarioSelectionFlow'
  import { usePanBroadcast } from '../composables/usePanBroadcast'
  import { useSpaceTurnHotkey } from '../composables/useSpaceTurnHotkey'
  import { useCombatMusicSync } from '../composables/useCombatMusicSync'
  import { useSessionChangeTracker } from '../composables/useSessionChangeTracker'
  import { useHeroBroadcast } from '../composables/useHeroBroadcast'
  import { useMapReadyHandler } from '../composables/useMapReadyHandler'
  import { useGameViewMountLifecycle } from '../composables/useGameViewMountLifecycle'
  import { useGameViewRefs } from '../composables/useGameViewRefs'
  import { useGameViewStores } from '../composables/useGameViewStores'

  const { viewRef, mapRef, canvasRef, mapSize } = useGameViewRefs()

  const { offsetX, offsetY, onMouseDown, onMouseMove, onMouseUp, onContextMenu } = useMapPan(
    viewRef,
    canvasRef
  )

  const { onDragOver, onDragLeave, onDrop } = useTokenDrop(offsetX, offsetY)
  const { close: closeContextMenu } = useTokenContextMenu()
  const { playHover, playClick, playNext } = useSound()

  const { auth, gameStore, tokensStore, scenariosStore, campaignsStore, gameSessionsStore } =
    useGameViewStores()
  const { connect, getSocket } = useSocket()

  // Флаг: открыта ли активная сессия трансляции для зрителей
  const sessionActive = ref(false)
  // Флаг: произошли ли изменения в текущей игровой сессии (токены добавлены/убраны/изменены).
  // Попап сохранения показываем только если изменения есть.
  const sessionChanged = ref(false)

  const { onMenuEnter, onMenuLeave } = useGameViewProviders({
    getSocket,
    sessionActive,
    offsetX,
    offsetY,
  })

  const { emitPan } = usePanBroadcast({
    viewRef,
    offsetX,
    offsetY,
    getSocket,
    sessionActive,
  })

  useSpaceTurnHotkey({ gameStore, playNext })

  useCombatMusicSync({
    gameStore,
    playBattleMusic,
    stopBattleMusic,
    playTravelMusic,
    stopTravelMusic,
  })

  const { emitHeroes } = useHeroBroadcast({ tokensStore, sessionActive, getSocket })

  useSessionChangeTracker({ gameStore, sessionActive, sessionChanged })

  const {
    selectedScenario,
    loadingId,
    loadError,
    selectCampaign,
    selectScenario,
    resumeSession,
    deleteSession,
  } = useScenarioSelectionFlow({
    playClick,
    playTravelMusic,
    auth,
    getSocket,
    offsetX,
    offsetY,
    emitPan,
    emitHeroes,
    tokensStore,
    scenariosStore,
    campaignsStore,
    gameSessionsStore,
    gameStore,
    sessionActive,
    sessionChanged,
    setActiveSessionName: (name) => {
      activeSessionName.value = name
    },
  })

  const {
    showSavePopup,
    showSummaryPopup,
    summaryNpcs,
    activeSessionName,
    onBeforeUnload,
    onExitClick,
    onSummaryConfirm,
    onSummarySkip,
    doActualExit,
    onSaveSession,
  } = useSessionExitFlow({
    gameStore,
    gameSessionsStore,
    selectedScenario,
    getSocket,
    sessionActive,
    sessionChanged,
    stopTravelMusic,
    stopBattleMusic,
    playClick,
  })

  useGameViewMountLifecycle({
    scenariosStore,
    campaignsStore,
    gameSessionsStore,
    onBeforeUnload,
    auth,
    connect,
    stopTravelMusic,
    stopBattleMusic,
    sessionActive,
    getSocket,
  })

  const { onDoorTransition } = useDoorTransition({
    scenariosStore,
    gameStore,
    selectScenario: async (scenario) => {
      mapSize.value = { width: 0, height: 0 }
      await selectScenario(scenario)
    },
    viewRef,
    offsetX,
    offsetY,
    // Когда герой входит в дверь «выход в глоб. карту» — пока просто логируем.
    // В будущем здесь переключение на глобальную карту.
    onGlobalMapExit: (payload) => {
      console.info('[GlobalMapExit]', payload)
    },
  })

  const { onMapReady } = useMapReadyHandler({ canvasRef, mapSize, mapRef })

  // ─── Ground loot popup ────────────────────────────────────────────────────
  const lootPile = ref(null)

  function onOpenLoot(pile) {
    lootPile.value = pile
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
