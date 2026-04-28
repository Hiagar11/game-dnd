import {
  getSelectedToken,
  isSameFaction,
  isHeroToken,
  isHostileNpcToken,
  isNeutralNpcToken,
  isNonSystemToken,
  isTalkableNpcToken,
} from '../utils/tokenFilters'
import { getForcedTauntTargetUid, isTauntAttackViolation } from '../utils/stunMechanics'
import { getAbilityCombatProfile } from '../utils/abilityCombatProfile'
import {
  BERSERKER_VISION_RADIUS,
  hasBerserkerRageEffect,
  isInBerserkerVisionRadius,
} from '../utils/berserkerRageMode'

const CONTAINER_TOKENS = new Set(['item', 'jar', 'bag'])
const ADJACENT_DIRS = [
  { dc: -1, dr: -1 },
  { dc: 0, dr: -1 },
  { dc: 1, dr: -1 },
  { dc: -1, dr: 0 },
  { dc: 1, dr: 0 },
  { dc: -1, dr: 1 },
  { dc: 0, dr: 1 },
  { dc: 1, dr: 1 },
]

function getCurrentTurnUid(store) {
  const order = store.initiativeOrder ?? []
  const currentIndex = store.currentInitiativeIndex ?? 0
  return order[currentIndex]?.uid ?? null
}

export function useTokenClickInteraction({
  store,
  abilityExec,
  onDoorWalk,
  onContainerWalk,
  moveTowardTarget,
  runQuickAttack,
  runBerserkerAttack,
  flashToken,
  closeContextMenu,
  onAttackClick,
  onNpcAttackClick,
  onTalkClick,
  isNpcReachable,
  isHeroReachableByNpc,
  getVisibleKeys,
  onCaptureClick,
  emitDoorTransition,
  onTauntBlocked,
}) {
  function isBlockedCell(col, row, attackerUid, defenderUid) {
    const wallBlocked = (store.walls ?? []).some((wall) => wall.col === col && wall.row === row)
    if (wallBlocked) return true

    return store.placedTokens.some((token) => {
      if (!token || token.systemToken) return false
      if (token.uid === attackerUid || token.uid === defenderUid) return false
      return token.col === col && token.row === row
    })
  }

  function pickBerserkJumpCell(attacker, defender) {
    const candidates = ADJACENT_DIRS.map(({ dc, dr }) => ({
      col: defender.col + dc,
      row: defender.row + dr,
      distance: Math.hypot(attacker.col - (defender.col + dc), attacker.row - (defender.row + dr)),
    }))
      .filter((cell) => !isBlockedCell(cell.col, cell.row, attacker.uid, defender.uid))
      .sort((a, b) => a.distance - b.distance)

    return candidates[0] ?? null
  }

  function getBerserkAttacker() {
    const selectedUid = store.selectedPlacedUid
    if (!selectedUid) return null

    const attacker = store.placedTokens.find((token) => token.uid === selectedUid)
    if (!attacker || !hasBerserkerRageEffect(attacker)) return null

    // В бою — только в свой ход и с очками действия.
    // Вне боя — достаточно того, что выбран сам кастер с активным эффектом.
    if (store.combatMode) {
      const currentTurnUid = getCurrentTurnUid(store)
      if (selectedUid !== currentTurnUid) return null
      if ((attacker.actionPoints ?? 0) <= 0) return null
    }

    return attacker
  }

  /**
   * Выбирает случайную цель из всех видимых берсерку токенов
   * (в радиусе вижения, любой фракции, кроме самого берсерка и системных).
   * Если берсерк под провокацией — пул сужается до провокатора (если тот в радиусе).
   */
  function pickRandomBerserkVictim(attacker) {
    const tauntUid = getForcedTauntTargetUid(attacker, store.placedTokens)

    let pool = store.placedTokens.filter(
      (token) =>
        isNonSystemToken(token) &&
        token.uid !== attacker.uid &&
        isInBerserkerVisionRadius(attacker, token, BERSERKER_VISION_RADIUS)
    )

    if (tauntUid) {
      pool = pool.filter((token) => token.uid === tauntUid)
    }

    if (!pool.length) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }

  function removeBerserkerRageEffect(token) {
    if (!token?.activeEffects?.length) return
    token.activeEffects = token.activeEffects.filter((e) => e?.id !== 'berserker_rage')
  }

  /**
   * Истощение после ярости — пропуск ровно одного следующего хода.
   * Большой apPenalty подхватывается isStunned() в useGameCombat и приводит
   * к авто-skip с сообщением «Истощение после ярости». remainingTurns=1
   * тикается до 0 в момент пропуска — следующий за ним ход уже нормальный.
   */
  function applyBerserkerExhaustion(token) {
    if (!token) return
    if (!token.activeEffects) token.activeEffects = []
    token.activeEffects = token.activeEffects.filter((e) => e?.id !== 'berserker_exhausted')
    token.activeEffects.push({
      id: 'berserker_exhausted',
      name: 'Истощение после ярости',
      apPenalty: 99,
      remainingTurns: 1,
    })
  }

  async function runBerserkJumpAttack(attacker) {
    if (!attacker) return

    // Великий рандом: цель выбирается из всех видимых, клик — лишь триггер.
    const defender = pickRandomBerserkVictim(attacker)
    if (!defender) {
      // Под провокацией провокатор не в радиусе — нечего бить.
      if (getForcedTauntTargetUid(attacker, store.placedTokens)) {
        onTauntBlocked?.(attacker)
      }
      return
    }

    closeContextMenu()

    // Нейтрал, попавший под удар, становится враждебным.
    if (isNeutralNpcToken(defender)) {
      defender.attitude = 'hostile'
    }

    // Удар вне боя сразу запускает бой — берсерк-инициатор ходит первым.
    if (!store.combatMode) {
      store.enterCombat(attacker.uid, getVisibleKeys())
    }

    const landingCell = pickBerserkJumpCell(attacker, defender)

    // Анимация прыжка: 500мс, на 30% (≈150мс) токен почти невидим — телепортируем.
    flashToken?.(attacker.uid, 'berserk-jump', 500)
    await new Promise((resolve) => setTimeout(resolve, 150))
    if (landingCell) {
      store.moveToken(attacker.uid, landingCell.col, landingCell.row)
    }
    // Дожидаемся завершения анимации появления.
    await new Promise((resolve) => setTimeout(resolve, 350))

    const liveAttacker = store.placedTokens.find((token) => token.uid === attacker.uid)
    const liveDefender = store.placedTokens.find((token) => token.uid === defender.uid)
    if (liveAttacker && liveDefender) {
      runBerserkerAttack(liveAttacker, liveDefender)
    }

    // После удара — снимаем ярость, вешаем «истощение» (пропуск 1 хода)
    // и форсируем переход хода независимо от AP.
    if (liveAttacker) {
      removeBerserkerRageEffect(liveAttacker)
      applyBerserkerExhaustion(liveAttacker)
    }
    store.endTurn()
  }

  async function runQuickAttackFlow(attackerUid, defenderUid) {
    if (!attackerUid || !defenderUid) return

    const attacker = store.placedTokens.find((token) => token.uid === attackerUid)
    const defender = store.placedTokens.find((token) => token.uid === defenderUid)
    if (!attacker || !defender) return

    // Провокация: атакующий под taunt может бить только провокатора
    if (isTauntAttackViolation(attacker, defender, store.placedTokens)) {
      onTauntBlocked?.(attacker)
      return
    }

    if (!store.combatMode) {
      // При обычном ЛКМ-ударе инициатор сразу начинает бой первым.
      store.enterCombat(attackerUid, getVisibleKeys())
    }

    closeContextMenu()

    const reached = await moveTowardTarget(attackerUid, defender)
    if (!reached) {
      store.endTurn()
      return
    }

    const currentTurnUid = getCurrentTurnUid(store)
    if (currentTurnUid && currentTurnUid !== attackerUid) return

    const liveAttacker = store.placedTokens.find((token) => token.uid === attackerUid)
    const liveDefender = store.placedTokens.find((token) => token.uid === defenderUid)
    if (liveAttacker && liveDefender) runQuickAttack(liveAttacker, liveDefender)
  }

  async function onTokenClick(placed, event) {
    // ── Режим выбора клетки для targeted-способности ──────────────────
    // Позволяем кликать прямо по токену: берем его текущую клетку как точку применения.
    if (store.pendingAbility?.areaType === 'targeted') {
      abilityExec.executeAbility({ col: placed.col, row: placed.row })
      return
    }

    // ── Режим выбора цели способности ─────────────────────────────
    if (store.pendingAbility && abilityExec.needsTargetToken.value) {
      const casterUid = store.pendingAbility.tokenUid
      const caster = store.placedTokens.find((t) => t.uid === casterUid)

      // Способность только на союзников кастера — проверяем относительно его фракции
      if (store.pendingAbility.allyOnly) {
        if (!caster || !isSameFaction(caster, placed)) return
      }

      const abilityProfile = getAbilityCombatProfile(store.pendingAbility)

      // Провокация: атакующие single-способности можно направлять только в провокатора.
      // Не трогаем бафы/поддержку (allyOnly) и небоевые способности без урона.
      const forcedTauntTargetUid = getForcedTauntTargetUid(caster, store.placedTokens)
      const isOffensiveAbility =
        !store.pendingAbility.allyOnly && abilityProfile.damageKind !== 'none'
      if (isOffensiveAbility && forcedTauntTargetUid && placed.uid !== forcedTauntTargetUid) {
        onTauntBlocked?.(caster)
        return
      }

      // Способность на нейтрального NPC в мирное время → агрессия + бой
      if (!store.combatMode && isNeutralNpcToken(placed) && !placed.systemToken) {
        placed.attitude = 'hostile'
        // Инициатор агрессии становится первым в очереди боя.
        store.enterCombat(casterUid, getVisibleKeys())
      }

      // Ближний бой — сначала подойти к цели.
      // Дальние/магические single-способности работают с места.
      if (abilityProfile.requiresApproach) {
        const casterUid = store.pendingAbility.tokenUid
        const reached = await moveTowardTarget(casterUid, placed)
        if (!reached) {
          store.pendingAbility = null
          store.endTurn()
          return
        }
        // После движения берём актуальную ссылку на цель
        const liveTarget = store.placedTokens.find((t) => t.uid === placed.uid)
        if (!liveTarget) {
          store.pendingAbility = null
          return
        }
        abilityExec.executeAbility(liveTarget)
        return
      }

      abilityExec.executeAbility(placed)
      return
    }

    const berserkAttacker = getBerserkAttacker()
    // Под яростью клик по любому не-системному токену в радиусе — триггер удара.
    // Сама цель выбирается случайно внутри runBerserkJumpAttack.
    const canBerserkJumpAttack =
      !!berserkAttacker &&
      placed.uid !== berserkAttacker.uid &&
      isNonSystemToken(placed) &&
      isInBerserkerVisionRadius(berserkAttacker, placed, BERSERKER_VISION_RADIUS)

    if (canBerserkJumpAttack) {
      await runBerserkJumpAttack(berserkAttacker, placed)
      return
    }

    const selected = getSelectedToken(store.placedTokens, store.selectedPlacedUid)

    // Герой идёт через дверь
    if (placed.systemToken === 'door' && (placed.targetScenarioId || placed.globalMapExit)) {
      if (isNonSystemToken(selected)) {
        onDoorWalk(selected, placed)
        return
      }
    }

    // Герой идёт к контейнеру (сундук/кувшин)
    if (CONTAINER_TOKENS.has(placed.systemToken) && isNonSystemToken(selected)) {
      if (!placed.items?.length && (placed.opened || placed.systemToken === 'bag')) return
      onContainerWalk(selected, placed)
      return
    }

    // Ctrl+клик — открыть боевой попап (ручной бой)
    if (event?.ctrlKey) {
      event.preventDefault()
      if (!selected) return

      const isHeroAttackingNpc =
        isHeroToken(selected) && isHostileNpcToken(placed) && !placed.systemToken
      const isNpcAttackingHero = isHostileNpcToken(selected) && isHeroToken(placed)
      // Первый удар: герой → нейтральный NPC (Ctrl+клик в мирное время)
      const isFirstStrike =
        isHeroToken(selected) && isNeutralNpcToken(placed) && !placed.systemToken

      if (!isHeroAttackingNpc && !isNpcAttackingHero && !isFirstStrike) return

      // Нейтральный NPC становится враждебным → герой атакует первым
      if (isFirstStrike) placed.attitude = 'hostile'

      closeContextMenu()

      // Провокация должна работать симметрично: для героя и NPC под taunt.
      if (isTauntAttackViolation(selected, placed, store.placedTokens)) {
        onTauntBlocked?.(selected)
        return
      }

      // Провокация: NPC под таунтом может атаковать только провокатора
      if (isNpcAttackingHero) {
        if (isTauntAttackViolation(selected, placed, store.placedTokens)) {
          onTauntBlocked?.(selected)
          return
        }
      }

      if (isHeroAttackingNpc || isFirstStrike) {
        onAttackClick(placed)
        return
      }

      onNpcAttackClick(placed)
      return
    }

    // Если есть выбранный токен и кликаем на другой — проверяем доступное действие.
    // Действие имеет приоритет над переключением фокуса.
    if (selected && selected.uid !== placed.uid) {
      // Захват: любой выбранный токен → оглушённый НПС
      if (placed.stunned && !placed.captured && isNpcReachable(placed)) {
        onCaptureClick(placed)
        return
      }
      // Атака: только герой → враждебный НПС
      if (
        isHeroToken(selected) &&
        isHostileNpcToken(placed) &&
        !placed.stunned &&
        isNpcReachable(placed)
      ) {
        await runQuickAttackFlow(selected.uid, placed.uid)
        return
      }
      // Атака враждебного НПС → герой
      if (isHeroToken(placed) && isHeroReachableByNpc(placed)) {
        // Провокация: NPC под таунтом может атаковать только провокатора
        if (isTauntAttackViolation(selected, placed, store.placedTokens)) {
          onTauntBlocked?.(selected)
          return
        }
        await runQuickAttackFlow(selected.uid, placed.uid)
        return
      }
      // Разговор: герой или НПС → нейтральный/дружественный НПС
      if (!store.combatMode && isTalkableNpcToken(placed) && isNpcReachable(placed)) {
        onTalkClick(placed)
        return
      }
    }

    // Нет доступного действия — фокус на токене
    store.setCombatPair(null, null)
    store.selectPlacedToken(placed.uid)
    closeContextMenu()

    // Дверь без выбранного героя (ДМ кликает) → переход сцены
    if (placed.systemToken === 'door' && placed.targetScenarioId) {
      const sourceScenarioId = store.currentScenario?.id ?? null
      emitDoorTransition?.({ targetScenarioId: placed.targetScenarioId, sourceScenarioId })
    }
  }

  return {
    onTokenClick,
  }
}
