// Боевая система: режим боя, инициатива, видимость врагов, управление ходами.
// Используется как внутренний composable хранилища game.js.

import { ref } from 'vue'
import { DEFAULT_MP } from '../constants/combat'
import { isStunned, getStunEffectName } from '../utils/stunMechanics'
import { getBaseActionPoints } from '../utils/actionPoints'
import {
  getHeroTokens,
  getHostileNpcTokens,
  getNpcAttitude,
  isNpcToken,
} from '../utils/tokenFilters'
import { levelFromXp } from '../utils/xpFormula'

// Радиус видимости: враг считается «видимым», если находится в пределах
// VISIBILITY_RADIUS клеток от любого героя (расстояние по Евклиду).
const VISIBILITY_RADIUS = 6

/**
 * @param {import('vue').Ref<Array>} placedTokens — реактивный массив токенов на карте
 * @param {import('vue').Ref<string|null>} selectedPlacedUid — uid выбранного токена
 */
export function useGameCombat(placedTokens, selectedPlacedUid) {
  const combatMode = ref(false)
  const justExitedCombat = ref(false) // флаг для предотвращения повторного входа сразу после выхода
  // Массив { uid, initiative, name, src, tokenType, attitude } — отсортирован по убыванию инициативы.
  const initiativeOrder = ref([])
  const currentInitiativeIndex = ref(0) // индекс текущего участника в initiativeOrder
  const combatRound = ref(0) // номер текущего раунда боя
  // uid → кол-во раундов, в которые враг был вне зоны видимости.
  const enemyHiddenTurns = ref({})

  // Пара токенов в боевом контакте — показывает значок мечей между ними
  // { heroUid: string, npcUid: string, npcInitiated: boolean } | null
  const combatPair = ref(null)

  // Информация о пропуске хода из-за оглушения — для UI-подсказки
  // { uid, name, reason } | null
  const stunSkipInfo = ref(null)
  function setCombatPair(heroUid, npcUid, npcInitiated = false) {
    combatPair.value = heroUid && npcUid ? { heroUid, npcUid, npcInitiated } : null
  }

  function applyTurnStartResources(token) {
    if (!token) return
    token.actionPoints = getBaseActionPoints(token) + (token.bonusAp ?? 0)
    token.bonusAp = 0
    token.movementPoints = DEFAULT_MP
    token.spentActionPointsThisTurn = false
  }

  /** Проверяет, находится ли токен в зоне видимости хотя бы одного героя */
  function isTokenVisible(token) {
    const heroes = getHeroTokens(placedTokens.value)
    return heroes.some((hero) => {
      const dc = Math.abs(hero.col - token.col)
      const dr = Math.abs(hero.row - token.row)
      return Math.sqrt(dc * dc + dr * dr) <= VISIBILITY_RADIUS
    })
  }

  /** Бросок d20 инициативы для всех не-системных токенов, сортировка по убыванию */
  function rollInitiativeAll(excludeUid = null, visibleKeys = null) {
    return placedTokens.value
      .filter((t) => {
        if (t.systemToken || t.uid === excludeUid) return false
        // Нейтральные NPC в бой не вступают.
        // Враждебные и союзные NPC участвуют в порядке инициативы.
        if (isNpcToken(t) && getNpcAttitude(t) === 'neutral') return false
        // Если передана карта видимости — включаем только видимых токенов
        if (visibleKeys && !visibleKeys.has(`${t.col}:${t.row}`)) return false
        return true
      })
      .map((t) => ({
        uid: t.uid,
        initiative: Math.floor(Math.random() * 20) + 1,
        name: t.name,
        src: t.src,
        tokenType: t.tokenType ?? 'npc',
        attitude: getNpcAttitude(t),
      }))
      .sort((a, b) => b.initiative - a.initiative)
  }

  /**
   * Войти в боевой режим.
   * @param {string|null} firstUid — uid токена, который начал бой (встаёт ПЕРВЫМ в инициативу).
   * @param {Set<string>|null} visibleKeys — Set «col:row» видимых клеток; если null — все токены.
   */
  function enterCombat(firstUid = null, visibleKeys = null) {
    if (combatMode.value) return

    // Защита от повторного входа сразу после выхода из боя
    if (justExitedCombat.value) return

    // ── Автолевелинг NPC: масштабируем статы враждебных NPC до уровня группы ──
    const heroesForAutoLevel = getHeroTokens(placedTokens.value)
    if (heroesForAutoLevel.length) {
      const avgHeroLevel =
        Math.round(
          heroesForAutoLevel.reduce((sum, h) => sum + (h.level ?? 1), 0) / heroesForAutoLevel.length
        ) || 1
      const hostileNpcs = getHostileNpcTokens(placedTokens.value)
      for (const npc of hostileNpcs) {
        // Базовое оружие NPC (если ещё нет) — по текущему уровню
        if (!npc.npcWeapon) {
          const npcLvl = npc.level ?? 1
          const npcLvlBonus = Math.max(0, npcLvl - 1)
          npc.npcWeapon = {
            baseDamage: {
              min: 1 + Math.floor(npcLvlBonus * 0.5),
              max: 2 + npcLvlBonus,
            },
          }
        }
        if (!npc.autoLevel) continue
        const oldLevel = npc.level ?? 1
        if (avgHeroLevel <= oldLevel) continue
        const scale = 1 + (avgHeroLevel - oldLevel) * 0.3
        npc.level = avgHeroLevel
        npc.strength = Math.round((npc.strength ?? 5) * scale)
        npc.agility = Math.round((npc.agility ?? 5) * scale)
        npc.intellect = Math.round((npc.intellect ?? 5) * scale)
        npc.charisma = Math.round((npc.charisma ?? 5) * scale)
        // Пересчитываем HP по новой формуле: 10 + strength*2 + agility
        npc.maxHp = 10 + npc.strength * 2 + npc.agility
        npc.hp = npc.maxHp
        // Авто-оружие NPC: масштабируем урон по уровню
        const lvlBonus = Math.max(0, avgHeroLevel - 1)
        npc.npcWeapon = {
          baseDamage: {
            min: 1 + Math.floor(lvlBonus * 0.5),
            max: 2 + lvlBonus,
          },
        }
      }
    }

    // Остальные токены разыгрывают порядок по d20; firstUid в жеребьёвке не участвует
    const order = rollInitiativeAll(firstUid, visibleKeys)
    if (firstUid) {
      const t = placedTokens.value.find((e) => e.uid === firstUid)
      if (t) {
        order.unshift({
          uid: t.uid,
          initiative: 21, // инициатор всегда первый, вне d20
          name: t.name,
          src: t.src,
          tokenType: t.tokenType ?? 'npc',
          attitude: getNpcAttitude(t),
        })
      }
    }
    initiativeOrder.value = order
    currentInitiativeIndex.value = 0
    combatRound.value = 1
    enemyHiddenTurns.value = {}
    combatMode.value = true

    // Если бой стартует на уже воодушевлённом токене, бонусный AP должен стать
    // реальным очком действия сразу, а не ждать следующего endTurn().
    const currentUid = initiativeOrder.value[0]?.uid
    const currentToken = placedTokens.value.find((t) => t.uid === currentUid)
    applyTurnStartResources(currentToken)
    // Автоматически переключаем выбор на первый токен в очереди инициативы
    selectedPlacedUid.value = currentUid ?? null
  }

  // Последний XP-отчёт — массив { uid, xpGained, newXp, oldLevel, newLevel }
  const lastXpReport = ref([])

  /** Выйти из боевого режима — все враги убиты или сбежали */
  function exitCombat() {
    // ── Начисление XP команде героев ──────────────────────────────────────
    const heroes = getHeroTokens(placedTokens.value)
    // Считаем XP по всем NPC которые побеждены/захвачены — включая бывших
    // враждебных, у которых attitude сменился на 'neutral' при захвате.
    const defeatedXp = placedTokens.value
      .filter(
        (t) =>
          isNpcToken(t) &&
          !t.systemToken &&
          (t.stunned || t.captured || (t.hp ?? 1) <= 0) &&
          (getNpcAttitude(t) === 'hostile' || t.captured)
      )
      .reduce((sum, t) => sum + (t.level ?? 1) * 25, 0)
    const xpReport = []
    if (defeatedXp > 0 && heroes.length > 0) {
      const share = Math.ceil(defeatedXp / heroes.length)
      for (const hero of heroes) {
        const oldXp = hero.xp ?? 0
        const oldLevel = hero.level ?? levelFromXp(oldXp)
        const newXp = oldXp + share
        const newLevel = levelFromXp(newXp)
        const pointsGained = newLevel - oldLevel
        hero.xp = newXp
        hero.level = newLevel
        if (pointsGained > 0) hero.statPoints = (hero.statPoints ?? 0) + pointsGained
        xpReport.push({ uid: hero.uid, xpGained: share, newXp, oldLevel, newLevel })
      }
    }
    lastXpReport.value = xpReport

    combatMode.value = false
    initiativeOrder.value = []
    currentInitiativeIndex.value = 0
    combatRound.value = 0
    enemyHiddenTurns.value = {}
    // Восстановить AP и MP всем токенам
    for (const t of placedTokens.value) {
      t.actionPoints = getBaseActionPoints(t)
      t.movementPoints = DEFAULT_MP
      t.spentActionPointsThisTurn = false
    }

    // Установить флаг защиты от повторного входа
    justExitedCombat.value = true
    setTimeout(() => {
      justExitedCombat.value = false
    }, 300)
  }

  /** Проверка условия конца боя: нет живых активных врагов */
  function checkCombatEnd() {
    const hostiles = getHostileNpcTokens(placedTokens.value)
    if (!hostiles.length) {
      exitCombat()
      return
    }
    // Враги побеждены если все оглушены/захвачены или скрылись
    const allDefeated = hostiles.every(
      (t) => t.stunned || t.captured || (enemyHiddenTurns.value[t.uid] ?? 0) >= 3
    )
    if (allDefeated) exitCombat()
  }

  /**
   * Завершить ход.
   * Мирный режим → восстановить AP всем.
   * Боевой режим → передать ход следующему по инициативе;
   *   при начале нового раунда — проверить видимость врагов и условие выхода из боя.
   */
  function endTurn() {
    if (!combatMode.value) {
      for (const t of placedTokens.value) {
        t.actionPoints = getBaseActionPoints(t)
        t.movementPoints = DEFAULT_MP
      }
      return
    }

    // ── Боевой режим ──────────────────────────────────────────────────────────
    const order = initiativeOrder.value
    if (!order.length) return

    // Забрать AP у текущего участника
    const currUid = order[currentInitiativeIndex.value]?.uid
    const currToken = placedTokens.value.find((t) => t.uid === currUid)
    if (currToken) {
      currToken.actionPoints = 0
      currToken.movementPoints = 0
      // Эффекты типа taunt живут "полный ход владельца" и тикают в конце его хода.
      tickTurnBoundEffectsOnTurnEnd(currToken)
    }

    // Перейти к следующему
    const prevIndex = currentInitiativeIndex.value
    const nextIndex = prevIndex + 1
    const isNewRound = nextIndex >= order.length
    currentInitiativeIndex.value = isNewRound ? 0 : nextIndex

    if (isNewRound) {
      combatRound.value++

      // Обновить счётчики скрытых ходов для враждебных токенов
      const hostiles = getHostileNpcTokens(placedTokens.value)
      for (const t of hostiles) {
        if (isTokenVisible(t)) {
          enemyHiddenTurns.value[t.uid] = 0
        } else {
          enemyHiddenTurns.value[t.uid] = (enemyHiddenTurns.value[t.uid] ?? 0) + 1
        }
      }

      // Убрать сбежавших (> 3 раундов вне видимости) из порядка инициативы
      const fledUids = new Set(
        hostiles.filter((t) => (enemyHiddenTurns.value[t.uid] ?? 0) >= 3).map((t) => t.uid)
      )
      if (fledUids.size) {
        initiativeOrder.value = initiativeOrder.value.filter((e) => !fledUids.has(e.uid))
        if (currentInitiativeIndex.value >= initiativeOrder.value.length) {
          currentInitiativeIndex.value = 0
        }
      }

      checkCombatEnd()
      if (!combatMode.value) return // Бой завершён — exitCombat уже восстановил AP
    }

    // Восстановить AP следующему участнику и выбрать его
    const nextUid = initiativeOrder.value[currentInitiativeIndex.value]?.uid
    const nextToken = placedTokens.value.find((t) => t.uid === nextUid)
    if (nextToken) {
      // Оглушённые/захваченные пропускают ход
      if (isStunned(nextToken, getBaseActionPoints(nextToken))) {
        nextToken.actionPoints = 0
        nextToken.movementPoints = 0
        // Уведомляем UI о пропуске хода
        const reason = getStunEffectName(nextToken) ?? 'Оглушён'
        stunSkipInfo.value = { uid: nextUid, name: nextToken.name, reason }
        // Тикаем эффекты (чтобы оглушение уменьшалось)
        tickTokenEffects(nextToken)
        // Задержка для показа подсказки, затем следующий ход
        setTimeout(() => {
          stunSkipInfo.value = null
          endTurn()
        }, 1200)
        return
      }

      // Тик эффектов (яд наносит урон, истёкшие снимаются)
      tickTokenEffects(nextToken)

      applyTurnStartResources(nextToken)
      selectedPlacedUid.value = nextUid

      // Если текущий ход перешёл к участнику боевой пары, оставляем попап открытым.
      // Если ход перешёл к кому-то вне пары — закрываем попап.
      if (combatPair.value) {
        const isCombatPairParticipant =
          nextUid === combatPair.value.heroUid || nextUid === combatPair.value.npcUid
        if (!isCombatPairParticipant) {
          combatPair.value = null
        }
      }
    }
  }

  /**
   * Уменьшает remainingTurns для всех эффектов токена.
   * Обрабатывает эффекты по СВОЙСТВАМ (damagePerTurn, healPerTurn),
   * а не по конкретным ID.
   */
  function tickTokenEffects(token) {
    if (!token.activeEffects?.length) return

    const expired = []

    for (const effect of token.activeEffects) {
      if (effect.remainingTurns == null) continue

      // taunt уменьшается в конце хода владельца (см. tickTurnBoundEffectsOnTurnEnd)
      if (effect.id === 'taunt') continue

      // Урон каждый ход (яд, кровотечение и т.д.)
      if (effect.damagePerTurn) {
        token.hp = Math.max(0, (token.hp ?? 0) - effect.damagePerTurn)
      }

      // Лечение каждый ход (регенерация и т.д.)
      if (effect.healPerTurn) {
        const maxHp = token.maxHp ?? token.hp ?? 0
        token.hp = Math.min(maxHp, (token.hp ?? 0) + effect.healPerTurn)
      }

      effect.remainingTurns--
      if (effect.remainingTurns <= 0) expired.push(effect)
    }

    for (const fx of expired) {
      // Откат визуала
      if (fx.id === 'disguise' && fx.originalSrc) {
        token.src = fx.originalSrc
      }
      token.activeEffects = token.activeEffects.filter((e) => e.id !== fx.id)
    }
  }

  /**
   * Эффекты, чей таймер должен уменьшаться именно по завершении хода владельца.
   * Для провокации это предотвращает off-by-one, когда второй ход "сгорает" до атаки.
   */
  function tickTurnBoundEffectsOnTurnEnd(token) {
    if (!token?.activeEffects?.length) return

    const expiredIds = []

    for (const effect of token.activeEffects) {
      if (effect.id !== 'taunt' || effect.remainingTurns == null) continue
      effect.remainingTurns--
      if (effect.remainingTurns <= 0) expiredIds.push(effect.id)
    }

    if (!expiredIds.length) return
    token.activeEffects = token.activeEffects.filter((e) => !expiredIds.includes(e.id))
  }

  return {
    combatMode,
    initiativeOrder,
    currentInitiativeIndex,
    combatRound,
    enemyHiddenTurns,
    combatPair,
    stunSkipInfo,
    lastXpReport,
    setCombatPair,
    isTokenVisible,
    enterCombat,
    exitCombat,
    checkCombatEnd,
    endTurn,
  }
}
