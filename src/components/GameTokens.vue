<template>
  <div
    class="game-tokens"
    :class="{ 'game-tokens--ctrl': ctrlHeld && heroSelected }"
    :style="{ width: `${width}px`, height: `${height}px` }"
    @contextmenu.prevent="onMapRightClick"
  >
    <div
      v-for="placed in store.placedTokens"
      :key="placed.uid"
      :ref="
        (el) => {
          if (el) tokenElMap.set(placed.uid, el)
          else tokenElMap.delete(placed.uid)
        }
      "
      class="game-tokens__token"
      :class="[
        tokenClasses(placed),
        { 'game-tokens__token--dialog-open': dialogBubbles.has(placed.uid) },
      ]"
      :style="tokenStyle(placed)"
      @click.stop="props.viewerMode ? onViewerClick(placed) : onTokenClick(placed, $event)"
      @contextmenu.stop.prevent="!props.viewerMode && onContextMenu(placed)"
    >
      <GameTokenContextMenu
        v-if="!props.viewerMode && !isContainerToken(placed)"
        :visible="ctxState.uid === placed.uid && ctxState.visible"
        :system-token="!!placed.systemToken"
        @remove="handleRemove(placed.uid)"
        @edit="handleEdit(placed.uid)"
        @abilities="handleAbilities(placed.uid)"
        @inventory="handleInventory(placed.uid)"
      />
      <GameItemContextMenu
        v-if="!props.viewerMode && isContainerToken(placed)"
        :visible="ctxState.uid === placed.uid && ctxState.visible"
        :lockable="placed.systemToken === 'item'"
        :locked="!!placed.locked"
        @configure="handleItemConfigure(placed.uid, $event)"
        @remove="handleRemove(placed.uid)"
        @toggle-lock="handleToggleLock(placed.uid)"
        @close="closeContextMenu()"
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
        @trade-accept="onTradeAccept($event.npcUid, $event.itemName, $event.price)"
        @trade-decline="onTradeDecline($event.npcUid)"
      />
      <GameBattleCryBubble
        :text="battleCries[placed.uid] ?? ''"
        :anchor-el="tokenElMap.get(placed.uid) ?? null"
      />
      <div v-if="currentTurnUid === placed.uid" class="game-tokens__turn-pillar" />
      <!-- Золотая стрелка: есть нераспределённые очки характеристик -->
      <div
        v-if="placed.tokenType === 'hero' && (placed.statPoints ?? 0) > 0"
        class="game-tokens__level-up-arrow"
        title="Нераспределённые очки характеристик"
        @click.stop="handleEdit(placed.uid)"
      >
        ▲
      </div>
      <Transition name="attitude-arrow">
        <div
          v-if="attitudeArrows[placed.uid]"
          class="game-tokens__attitude-arrow"
          :class="`game-tokens__attitude-arrow--${attitudeArrows[placed.uid]}`"
        />
      </Transition>
      <!-- Наручники — захваченный NPC -->
      <div v-if="placed.captured" class="game-tokens__captured-icon">⛓</div>
      <!-- Звёзды — оглушённый NPC -->
      <div v-if="placed.stunned && !placed.captured" class="game-tokens__stunned-icon">💫</div>
      <!-- Кольцо выделения выбранного токена -->
      <div
        v-if="store.selectedPlacedUid === placed.uid && !placed.systemToken"
        class="game-tokens__selection-ring"
      />
      <img
        :src="placed.src"
        :alt="placed.name"
        class="game-tokens__img"
        :draggable="!props.viewerMode && isContainerToken(placed)"
        @dragstart="isContainerToken(placed) && onContainerDragStart($event, placed)"
      />
      <!-- HP-полоска в режиме боя -->
      <div
        v-if="store.combatMode && !placed.systemToken && (placed.maxHp ?? 0) > 0"
        class="game-tokens__hp-bar"
      >
        <div
          class="game-tokens__hp-fill"
          :class="hpBarClass(placed)"
          :style="{ width: hpPercent(placed) + '%' }"
        />
      </div>
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
  import { ref, computed, watch, inject, onMounted, onUnmounted } from 'vue'
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
  import { useAbilityExecution } from '../composables/useAbilityExecution'
  import {
    getHeroTokens,
    getHostileNpcTokens,
    getSelectedNonSystemToken,
    isHeroToken,
  } from '../utils/tokenFilters'
  import { playLevelUp } from '../composables/useSound'
  import { getCurrentScenarioId } from '../utils/scenario'
  import GameTokenContextMenu from './GameTokenContextMenu.vue'
  import GameItemContextMenu from './GameItemContextMenu.vue'
  import GameTokenEditPopup from './GameTokenEditPopup.vue'
  import GameDoorPopup from './GameDoorPopup.vue'
  import DamageFloat from './DamageFloat.vue'
  import GameDialogBubble from './GameDialogBubble.vue'
  import GameBattleCryBubble from './GameBattleCryBubble.vue'

  const props = defineProps({
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    viewerMode: { type: Boolean, default: false },
  })

  const emit = defineEmits(['door-transition', 'container-loot'])

  const store = useGameStore()
  const heroesStore = useHeroesStore()
  const { visitedNotCurrentSet, currentCells } = useFogVisibility()
  const { getSocket } = useSocket()

  const damageFloatRef = ref(null)
  const tokenElMap = new Map()

  // Отслеживаем зажатый Ctrl для режима агрессии по нейтральным NPC
  const ctrlHeld = ref(false)
  function onCtrlChange(e) {
    ctrlHeld.value = e.ctrlKey
  }
  function onBlur() {
    ctrlHeld.value = false
  }

  const {
    dialogBubbles,
    attitudeArrows,
    openBubble,
    closeBubble,
    addNpcMessage,
    addDiceRollMessage,
    addPlayerMessage,
    addTradeOffer,
    addWarningMessage,
    prependMessages,
    triggerAttitudeArrow,
  } = useNpcDialog(store)

  const { flashMap, flashToken, runQuickAttack } = useTokenCombatInteraction({
    store,
    damageFloatRef,
    getSocket,
  })

  const currentTurnUid = computed(() => {
    if (!store.combatMode) return null
    return store.initiativeOrder[store.currentInitiativeIndex]?.uid ?? null
  })

  // ── Боевые крики враждебных НПС через AI ──────────────────────────────────
  const battleCries = ref({})

  watch(currentTurnUid, (uid) => {
    if (!uid) return
    const token = store.placedTokens.find((t) => t.uid === uid)
    if (!token || token.tokenType !== 'npc' || token.attitude !== 'hostile') return

    const socket = getSocket()
    if (!socket) return

    // Собираем контекст боя
    const heroes = getHeroTokens(store.placedTokens)
    const heroInfo = heroes.map((h) => `${h.name} (HP ${h.hp ?? '?'}/${h.maxHp ?? '?'})`).join(', ')
    const npcHpInfo = `HP ${token.hp ?? '?'}/${token.maxHp ?? '?'}`
    const combatLog = token.combatLog ?? []
    const recentHits = combatLog.filter((e) => e.hit).length
    const combatContext =
      `Ты — ${token.npcName || token.name}. ${npcHpInfo}. ` +
      `Противники: ${heroInfo || 'неизвестные герои'}. ` +
      (recentHits > 0 ? `Ты получил ${recentHits} ударов в этом бою. ` : '') +
      'Сейчас твой ход — атакуй!'

    socket.emit('npc:battleCry', {
      npcUid: token.uid,
      tokenId: token.tokenId ?? null,
      npcName: token.npcName || token.name,
      combatContext,
    })
  })

  // Слушаем ответ AI и показываем мини-облако
  onMounted(() => {
    window.addEventListener('keydown', onCtrlChange)
    window.addEventListener('keyup', onCtrlChange)
    window.addEventListener('mousemove', onCtrlChange)
    window.addEventListener('blur', onBlur)
    const socket = getSocket()
    if (!socket) return
    socket.on('npc:battleCryReply', ({ npcUid, text }) => {
      battleCries.value = { ...battleCries.value, [npcUid]: text }
      setTimeout(() => {
        const next = { ...battleCries.value }
        delete next[npcUid]
        battleCries.value = next
      }, 3500)
    })
    // Авто-суммаризация памяти: сервер дописал contextNotes в БД — обновляем стор
    // чтобы при открытии попапа редактирования токена было актуальное значение.
    socket.on('npc:memory:updated', ({ npcUid, contextNotes }) => {
      store.editPlacedToken(npcUid, { contextNotes })
    })
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onCtrlChange)
    window.removeEventListener('keyup', onCtrlChange)
    window.removeEventListener('mousemove', onCtrlChange)
    window.removeEventListener('blur', onBlur)
    getSocket()?.off('npc:battleCryReply')
    getSocket()?.off('npc:memory:updated')
  })

  // ── XP-награда и левелап после боя ──────────────────────────────────────
  watch(
    () => store.lastXpReport,
    (report) => {
      if (!report?.length) return
      let hasLevelUp = false
      const heroNames = []
      const totalXp = report[0]?.xpGained ?? 0
      for (const entry of report) {
        const token = store.placedTokens.find((t) => t.uid === entry.uid)
        if (!token) continue
        heroNames.push(token.name)
        const cs = store.cellSize
        const x = (token.col + 1) * (cs / 2) + store.gridNormOX
        const y = (token.row + 1) * (cs / 2) + store.gridNormOY
        damageFloatRef.value?.spawn(entry.uid, `+${entry.xpGained} XP`, x, y, '#fbbf24')
        if (entry.newLevel > entry.oldLevel) {
          hasLevelUp = true
          // Показываем «Новый уровень!» с небольшой задержкой после XP
          setTimeout(() => {
            damageFloatRef.value?.spawn(entry.uid, '⭐ Новый уровень!', x, y - 20, '#fbbf24')
          }, 600)
        }
      }
      if (hasLevelUp) playLevelUp()

      // AI-журнал: записываем итог боя
      const scenarioId = getCurrentScenarioId(store)
      if (scenarioId) {
        const names = heroNames.join(', ')
        const eventText = hasLevelUp
          ? `Герои (${names}) победили врагов и получили по ${totalXp} XP. Кто-то повысил уровень!`
          : `Герои (${names}) победили врагов и получили по ${totalXp} XP.`
        getSocket()?.emit('map:journal', { scenarioId, eventText })
      }
    }
  )

  const getVisibleKeys = () => (store.fogEnabled ? currentCells.value : null)
  const { state: ctxState, open: openContextMenu, close: closeContextMenu } = useTokenContextMenu()

  const fogHiddenKeys = computed(() => (store.fogEnabled ? visitedNotCurrentSet.value : new Set()))

  const isNonSystemSelected = computed(() => {
    return !!getSelectedNonSystemToken(store.placedTokens, store.selectedPlacedUid)
  })

  // Выбран ли герой — для режима агрессии (Ctrl)
  const heroSelected = computed(() => {
    const sel = getSelectedNonSystemToken(store.placedTokens, store.selectedPlacedUid)
    return !!sel && isHeroToken(sel)
  })

  const { isNpcReachable, isHeroReachableByNpc } = useTokenReachability(store)

  const { moveTowardTarget, onDoorWalk, onContainerWalk } = useTokenMovementInteraction({
    store,
    dirs: DIRS,
    findPath,
    getSocket,
    closeContextMenu,
    emitDoorTransition: (payload) => emit('door-transition', payload),
    emitContainerLoot: (pile) => emit('container-loot', pile),
    emitContainerEmpty: (container) => {
      const cs = store.cellSize
      const x = (container.col + 1) * (cs / 2) + store.gridNormOX
      const y = (container.row + 1) * (cs / 2) + store.gridNormOY
      damageFloatRef.value?.spawn(container.uid, 'Пусто', x, y, '#999')
    },
    emitContainerLocked: (container) => {
      const cs = store.cellSize
      const x = (container.col + 1) * (cs / 2) + store.gridNormOX
      const y = (container.row + 1) * (cs / 2) + store.gridNormOY
      damageFloatRef.value?.spawn(container.uid, '🔒 Заперто', x, y, '#f59e0b')
    },
  })

  const { onTalkClick, onDialogSend, onTradeAccept, onTradeDecline } = useTokenDialogInteraction({
    store,
    getSocket,
    closeContextMenu,
    findPath,
    openBubble,
    closeBubble,
    addNpcMessage,
    addDiceRollMessage,
    addPlayerMessage,
    addTradeOffer,
    addWarningMessage,
    prependMessages,
    triggerAttitudeArrow,
    dialogBubbles,
    getVisibleKeys,
  })

  const { onAttackClick, onNpcAttackClick } = useTokenAttackInteraction({
    store,
    findPath,
    getSocket,
    closeContextMenu,
    getVisibleKeys,
  })

  watch(
    () => store.placedTokens.map((t) => `${t.uid}:${t.col}:${t.row}:${t.movementPoints}`),
    () => {
      if (store.combatMode) return
      const heroes = getHeroTokens(store.placedTokens)
      const hostiles = getHostileNpcTokens(store.placedTokens)
      if (!heroes.length || !hostiles.length) return

      for (const hero of heroes) {
        const mp = hero.movementPoints ?? 0
        if (mp <= 0) continue
        const zone = buildReachableCells(hero, store.walls, mp)
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

  function onCaptureClick(npc) {
    store.editPlacedToken(npc.uid, {
      captured: true,
      attitude: 'neutral',
      stunned: false,
    })
    const cs = store.cellSize
    const x = (npc.col + 1) * (cs / 2) + store.gridNormOX
    const y = (npc.row + 1) * (cs / 2) + store.gridNormOY
    damageFloatRef.value?.spawn(npc.uid, '⛓ Захвачен', x, y, '#a78bfa')
    store.checkCombatEnd()

    const scenarioId = getCurrentScenarioId(store)
    const socket = getSocket()

    // Персистим состояние captured + combatLog на сервер
    if (scenarioId && socket) {
      socket.emit('token:edit', {
        scenarioId,
        uid: npc.uid,
        fields: {
          captured: true,
          attitude: 'neutral',
          stunned: false,
          combatLog: npc.combatLog ?? [],
        },
      })
    }

    // AI перезаписывает personality под пленника
    socket?.emit(
      'npc:capture',
      {
        scenarioId,
        uid: npc.uid,
        tokenId: npc.tokenId ?? null,
        npcName: npc.npcName || npc.name || '',
        combatLog: npc.combatLog ?? [],
      },
      (res) => {
        if (res?.ok && res.personality) {
          store.editPlacedToken(npc.uid, { personality: res.personality })
        }
      }
    )
  }

  const abilityExec = useAbilityExecution(damageFloatRef, flashToken)

  // Регистрируем обработчик AoE-клика из GameRangeOverlay
  const overlayExecuteAoE = inject('overlayExecuteAoE', ref(null))
  overlayExecuteAoE.value = (targetCell) => {
    abilityExec.executeAbility(targetCell)
  }

  const { onTokenClick } = useTokenClickInteraction({
    store,
    abilityExec,
    onDoorWalk,
    onContainerWalk,
    moveTowardTarget,
    runQuickAttack,
    closeContextMenu,
    onAttackClick,
    onNpcAttackClick,
    onTalkClick,
    isNpcReachable,
    isHeroReachableByNpc,
    getVisibleKeys,
    onCaptureClick,
    emitDoorTransition: (payload) => emit('door-transition', payload),
  })

  // Регистрируем обработчики для вызова из GameRangeOverlay
  const overlayTokenClick = inject('overlayTokenClick', ref(null))
  overlayTokenClick.value = (placed, event) => onTokenClick(placed, event ?? null)

  const overlayTokenContextMenu = inject('overlayTokenContextMenu', ref(null))
  overlayTokenContextMenu.value = (placed) => onContextMenu(placed)

  const { tokenClasses, tokenStyle, npcScoreForDialog, hpPercent, hpBarClass } =
    useGameTokenPresentation({
      props,
      store,
      heroesStore,
      fogHiddenKeys,
      isNpcReachable,
      isHeroReachableByNpc,
      isNonSystemSelected,
      flashMap,
      currentTurnUid,
      ctrlHeld,
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

  function onMapRightClick() {
    store.selectPlacedToken(null)
    closeContextMenu()
  }

  function handleItemConfigure(uid, { slot, rarity }) {
    store.configureItemToken(uid, slot, rarity)
    closeContextMenu()
  }

  function handleToggleLock(uid) {
    const placed = store.placedTokens.find((t) => t.uid === uid)
    if (placed) placed.locked = !placed.locked
  }

  const CONTAINER_IDS = new Set(['item', 'jar', 'bag'])
  function isContainerToken(placed) {
    return CONTAINER_IDS.has(placed.systemToken)
  }

  function onContainerDragStart(e, placed) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('placedUid', placed.uid)
    e.dataTransfer.setData('systemToken', placed.systemToken)
    if (placed.halfSize) e.dataTransfer.setData('halfSize', '1')
    if (placed.quarterSize) e.dataTransfer.setData('quarterSize', '1')
    closeContextMenu()
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
