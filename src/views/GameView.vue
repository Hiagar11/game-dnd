<template>
  <div
    ref="viewRef"
    class="game-view"
    :class="{ 'game-view--combat': gameStore.combatMode }"
    @mousemove="onMouseMove"
    @mousedown="onGameMouseDown"
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
          @container-loot="onOpenLoot"
        />
        <GameFog
          :key="selectedScenario?.id"
          :width="mapSize.width"
          :height="mapSize.height"
          :hidden="auth.role === 'admin' && !gameStore.fogEnabled"
        />
        <GameAbilityProjectile />
        <GameAbilityImpact />
        <GameMeleeSlash />
        <GameShieldBash />
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

    <!-- Попап памяти НПС при уходе с карты (через дверь / глобальную карту) -->
    <GameSessionSummaryPopup
      :visible="showMapLeaveSummary"
      :npcs="mapLeaveSummaryNpcs"
      @save="onMapLeaveMemorySave"
      @skip="onMapLeaveMemorySkip"
    />

    <!-- Боевой попап: появляется когда образована боевая пара -->
    <GameCombatPopup
      :visible="!!gameStore.combatPair"
      @close="gameStore.setCombatPair(null, null)"
    />

    <!-- Попап подбора лута с земли — двойной инвентарь -->
    <GameLootPickupPopup :pile="lootPile" @close="lootPile = null" />

    <!-- Глобальная карта — полноэкранный оверлей с анимацией колесницы -->
    <GameGlobalMapOverlay
      :phase="travel.phase.value"
      :global-map="travel.globalMap.value"
      :source-stop="travel.sourceStop.value"
      :target-stop="travel.targetStop.value"
      :chariot-progress="travel.chariotProgress.value"
      :reachable-stops="travel.reachableStops.value"
      :path-points="travel.pathPoints.value"
      @confirm="travel.confirmTravel()"
      @cancel="travel.cancelTravel()"
      @choose="travel.chooseDestination($event)"
      @enter-complete="travel.onEnterComplete()"
      @exit-complete="travel.onExitComplete()"
    />
  </div>
</template>

<script setup>
  import { ref, inject } from 'vue'
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
  import GameAbilityProjectile from '../components/GameAbilityProjectile.vue'
  import GameAbilityImpact from '../components/GameAbilityImpact.vue'
  import GameMeleeSlash from '../components/GameMeleeSlash.vue'
  import GameShieldBash from '../components/GameShieldBash.vue'
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
  import { useGlobalMapTravel } from '../composables/useGlobalMapTravel'
  import { useGlobalMapsStore } from '../stores/globalMaps'
  import GameGlobalMapOverlay from '../components/GameGlobalMapOverlay.vue'

  const { viewRef, mapRef, canvasRef, mapSize } = useGameViewRefs()

  const { offsetX, offsetY, onMouseDown, onMouseMove, onMouseUp, onContextMenu } = useMapPan(
    viewRef,
    canvasRef
  )

  const { onDragOver, onDragLeave, onDrop } = useTokenDrop(offsetX, offsetY)
  const { close: closeContextMenu } = useTokenContextMenu()

  function onGameMouseDown(e) {
    if (e.button !== 2) return
    gameStore.selectPlacedToken(null)
  }
  const { playHover, playClick, playNext } = useSound()

  const { auth, gameStore, tokensStore, scenariosStore, campaignsStore, gameSessionsStore } =
    useGameViewStores()
  const globalMapsStore = useGlobalMapsStore()
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

  // ─── Память НПС при уходе с карты ────────────────────────────────────────
  const showMapLeaveSummary = ref(false)
  const mapLeaveSummaryNpcs = ref([])
  const mapLeaveResolve = ref(null)

  async function onMapLeaveMemorySave(saves) {
    const socket = getSocket()
    if (socket && saves.length > 0) {
      const savesWithUid = saves
        .map((s) => {
          const npc = mapLeaveSummaryNpcs.value.find((n) => n.tokenId === s.tokenId)
          return { scenarioId: npc?.scenarioId, uid: npc?.npcUid, contextNotes: s.notes }
        })
        .filter((s) => s.scenarioId && s.uid)
      await new Promise((resolve) =>
        socket.emit('npc:save:memory', { saves: savesWithUid }, resolve)
      )
    }
    showMapLeaveSummary.value = false
    mapLeaveResolve.value?.()
    mapLeaveResolve.value = null
  }

  function onMapLeaveMemorySkip() {
    showMapLeaveSummary.value = false
    mapLeaveResolve.value?.()
    mapLeaveResolve.value = null
  }

  const selectScenarioForMap = async (scenario) => {
    mapSize.value = { width: 0, height: 0 }
    // При смене карты — предлагаем сохранить память NPC с текущей локации
    if (sessionActive.value && auth.role === 'admin') {
      await new Promise((resolve) => {
        const socket = getSocket()
        if (!socket) {
          resolve()
          return
        }
        socket.emit('npc:map:summary', (res) => {
          if (res?.ok && res.npcs?.length > 0) {
            mapLeaveSummaryNpcs.value = res.npcs.map((npc) => {
              const placed = gameStore.placedTokens.find((t) => t.uid === npc.npcUid)
              return { ...npc, src: placed?.src ?? null }
            })
            mapLeaveResolve.value = resolve
            showMapLeaveSummary.value = true
          } else {
            resolve()
          }
        })
        setTimeout(resolve, 8000)
      })
    }
    await selectScenario(scenario)
  }

  const { onDoorTransition, placeBufferAroundDoor, centerOnToken } = useDoorTransition({
    scenariosStore,
    gameStore,
    selectScenario: selectScenarioForMap,
    viewRef,
    offsetX,
    offsetY,
    onGlobalMapExit: (payload) => {
      // Удаляем мёртвых NPC с текущей локации перед уходом (кроме захваченных)
      const scenarioId = String(gameStore.currentScenario?.id ?? '')
      if (scenarioId) {
        const deadNpcs = gameStore.placedTokens.filter(
          (t) => t.tokenType === 'npc' && !t.systemToken && !t.captured && (t.hp ?? 1) <= 0
        )
        const socket = getSocket()
        for (const npc of deadNpcs) {
          gameStore.removeToken(npc.uid)
          socket?.emit('token:remove', { scenarioId, uid: npc.uid })
        }
      }
      travel.initTravel(payload)
    },
  })

  const travel = useGlobalMapTravel({
    globalMapsStore,
    scenariosStore,
    gameStore,
    selectScenario: selectScenarioForMap,
    centerOnDoor: centerOnToken,
    placeBuffer: placeBufferAroundDoor,
  })

  const { onMapReady } = useMapReadyHandler({ canvasRef, mapSize, mapRef })

  // ─── Ground loot popup ────────────────────────────────────────────────────
  const lootPile = ref(null)

  function onOpenLoot(pile) {
    lootPile.value = pile
  }
  // Регистрируем обработчик для вызова из GameRangeOverlay
  const overlayOpenLoot = inject('overlayOpenLoot', ref(null))
  overlayOpenLoot.value = onOpenLoot
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
