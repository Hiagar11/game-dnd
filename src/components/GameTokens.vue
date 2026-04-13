<template>
  <div class="game-tokens" :style="{ width: `${width}px`, height: `${height}px` }">
    <div
      v-for="placed in store.placedTokens"
      :key="placed.uid"
      class="game-tokens__token"
      :class="tokenClasses(placed)"
      :style="tokenStyle(placed)"
      @click.stop="props.viewerMode ? onViewerClick(placed) : onTokenClick(placed, $event)"
      @dblclick.stop="!props.viewerMode && onDblClick(placed)"
      @contextmenu.stop.prevent="!props.viewerMode && onContextMenu(placed)"
    >
      <GameTokenContextMenu
        v-if="!props.viewerMode"
        :visible="ctxState.uid === placed.uid && ctxState.visible"
        :system-token="!!placed.systemToken"
        @remove="handleRemove(placed.uid)"
        @edit="handleEdit(placed.uid)"
        @abilities="handleAbilities(placed.uid)"
        @inventory="handleInventory(placed.uid)"
      />
      <GameDialogBubble
        v-if="dialogBubbles.has(placed.uid)"
        :messages="dialogBubbles.get(placed.uid).messages"
        :loading="dialogBubbles.get(placed.uid).loading"
        :npc-src="placed.src"
        :npc-name="placed.npcName || placed.name"
        :player-src="dialogBubbles.get(placed.uid).heroSrc ?? null"
        :npc-score="npcScoreForDialog(dialogBubbles.get(placed.uid), placed)"
        @send="onDialogSend(placed.uid, $event)"
      />
      <div v-if="currentTurnUid === placed.uid" class="game-tokens__turn-pillar" />
      <Transition name="attitude-arrow">
        <div
          v-if="attitudeArrows[placed.uid]"
          class="game-tokens__attitude-arrow"
          :class="`game-tokens__attitude-arrow--${attitudeArrows[placed.uid]}`"
        />
      </Transition>
      <img :src="placed.src" :alt="placed.name" class="game-tokens__img" draggable="false" />
    </div>
  </div>

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
      :initial-tab="editInitialTab"
      @close="closeEditPopup"
    />

    <GameDoorPopup
      :visible="doorPlacedUid !== null"
      :placed-uid="doorPlacedUid"
      @close="doorPlacedUid = null"
    />
  </template>

  <DamageFloat ref="damageFloatRef" />
</template>

<script setup>
  import { ref, computed, watch, inject } from 'vue'
  import { useGameStore } from '../stores/game'
  import { useHeroesStore } from '../stores/heroes'
  import { useFogVisibility } from '../composables/useFogVisibility'
  import { useTokenContextMenu } from '../composables/useTokenContextMenu'
  import { wasDragged } from '../composables/useMapPan'
  import { useSocket } from '../composables/useSocket'
  import { buildReachableCells, findPath } from '../composables/useTokenMove'
  import { DIRS, useTokenReachability } from '../composables/useTokenReachability'
  import { useNpcDialog } from '../composables/useNpcDialog'
  import { useTokenDialogInteraction } from '../composables/useTokenDialogInteraction'
  import { useTokenCombatInteraction } from '../composables/useTokenCombatInteraction'
  import { useTokenMovementInteraction } from '../composables/useTokenMovementInteraction'
  import { useTokenAttackInteraction } from '../composables/useTokenAttackInteraction'
  import { useTokenUiInteraction } from '../composables/useTokenUiInteraction'
  import { useGameTokenPresentation } from '../composables/useGameTokenPresentation'
  import { useTokenClickInteraction } from '../composables/useTokenClickInteraction'
  import {
    getHeroTokens,
    getHostileNpcTokens,
    getSelectedNonSystemToken,
  } from '../utils/tokenFilters'
  import GameTokenContextMenu from './GameTokenContextMenu.vue'
  import GameTokenEditPopup from './GameTokenEditPopup.vue'
  import GameDoorPopup from './GameDoorPopup.vue'
  import DamageFloat from './DamageFloat.vue'
  import GameDialogBubble from './GameDialogBubble.vue'

  const props = defineProps({
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    viewerMode: { type: Boolean, default: false },
  })

  const emit = defineEmits(['door-transition'])

  const store = useGameStore()
  const heroesStore = useHeroesStore()
  const { visitedNotCurrentSet, currentCells } = useFogVisibility()

  const damageFloatRef = ref(null)

  const {
    dialogBubbles,
    attitudeArrows,
    openBubble,
    addNpcMessage,
    addDiceRollMessage,
    addPlayerMessage,
    triggerAttitudeArrow,
  } = useNpcDialog(store)

  const { flashMap, runQuickAttack } = useTokenCombatInteraction({ store, damageFloatRef })

  const currentTurnUid = computed(() => {
    if (!store.combatMode) return null
    return store.initiativeOrder[store.currentInitiativeIndex]?.uid ?? null
  })

  const getVisibleKeys = () => (store.fogEnabled ? currentCells.value : null)
  const { state: ctxState, open: openContextMenu, close: closeContextMenu } = useTokenContextMenu()

  const fogHiddenKeys = computed(() => (store.fogEnabled ? visitedNotCurrentSet.value : new Set()))
  const { getSocket } = useSocket()

  const isNonSystemSelected = computed(() => {
    return !!getSelectedNonSystemToken(store.placedTokens, store.selectedPlacedUid)
  })

  const { isNpcReachable, isHeroReachableByNpc } = useTokenReachability(store)

  const { moveTowardTarget, onDoorWalk } = useTokenMovementInteraction({
    store,
    dirs: DIRS,
    findPath,
    getSocket,
    closeContextMenu,
    emitDoorTransition: (payload) => emit('door-transition', payload),
  })

  const { onTalkClick, onDialogSend } = useTokenDialogInteraction({
    store,
    getSocket,
    closeContextMenu,
    dirs: DIRS,
    findPath,
    openBubble,
    addNpcMessage,
    addDiceRollMessage,
    addPlayerMessage,
    triggerAttitudeArrow,
    damageFloatRef,
    dialogBubbles,
  })

  const { onAttackClick, onNpcAttackClick } = useTokenAttackInteraction({
    store,
    dirs: DIRS,
    findPath,
    getSocket,
    closeContextMenu,
    getVisibleKeys,
  })

  watch(
    () => store.placedTokens.map((t) => `${t.uid}:${t.col}:${t.row}:${t.actionPoints}`),
    () => {
      if (store.combatMode) return
      const heroes = getHeroTokens(store.placedTokens)
      const hostiles = getHostileNpcTokens(store.placedTokens)
      if (!heroes.length || !hostiles.length) return

      for (const hero of heroes) {
        const ap = hero.actionPoints ?? 0
        if (ap <= 0) continue
        const zone = buildReachableCells(hero, store.walls, ap)
        const enemy = hostiles.find((npc) => zone.has(`${npc.col},${npc.row}`))
        if (enemy) {
          store.enterCombat(enemy.uid, getVisibleKeys())
          return
        }
      }
    },
    { deep: false }
  )

  const heroIds = computed(() => new Set(heroesStore.heroes.map((h) => h.id)))

  const clickTimer = ref(null)
  const DBLCLICK_DELAY = 220
  const { onTokenClick } = useTokenClickInteraction({
    store,
    onDoorWalk,
    moveTowardTarget,
    runQuickAttack,
    closeContextMenu,
    onAttackClick,
    onNpcAttackClick,
    onTalkClick,
    isNpcReachable,
    isHeroReachableByNpc,
    getVisibleKeys,
    clickTimer,
    dblClickDelay: DBLCLICK_DELAY,
  })

  // Регистрируем обработчики для вызова из GameRangeOverlay
  const overlayTokenClick = inject('overlayTokenClick', ref(null))
  overlayTokenClick.value = (placed) => onTokenClick(placed, null)

  const overlayTokenContextMenu = inject('overlayTokenContextMenu', ref(null))
  overlayTokenContextMenu.value = (placed) => onContextMenu(placed)

  const { tokenClasses, tokenStyle, npcScoreForDialog } = useGameTokenPresentation({
    props,
    store,
    heroesStore,
    fogHiddenKeys,
    isNpcReachable,
    isHeroReachableByNpc,
    isNonSystemSelected,
    flashMap,
    currentTurnUid,
  })

  const {
    editPlacedUid,
    editInitialTab,
    doorPlacedUid,
    onViewerClick,
    onContextMenu,
    handleRemove,
    handleEdit,
    handleInventory,
    handleAbilities,
    closeEditPopup,
    onDblClick: onUiDblClick,
  } = useTokenUiInteraction({
    store,
    heroesStore,
    heroIds,
    wasDragged,
    getSocket,
    ctxState,
    openContextMenu,
    closeContextMenu,
    emitDoorTransition: (payload) => emit('door-transition', payload),
  })

  function onDblClick(placed) {
    onUiDblClick(placed, clickTimer)
  }

  const combatIconPos = computed(() => {
    if (!store.combatPair) return null
    const hero = store.placedTokens.find((t) => t.uid === store.combatPair.heroUid)
    const npc = store.placedTokens.find((t) => t.uid === store.combatPair.npcUid)
    if (!hero || !npc) return null
    return {
      x: ((hero.col + npc.col) / 2 + 1) * store.halfCell + store.gridNormOX,
      y: ((hero.row + npc.row) / 2 + 1) * store.halfCell + store.gridNormOY,
    }
  })
</script>

<style scoped lang="scss" src="../assets/styles/components/gameTokens.scss"></style>
