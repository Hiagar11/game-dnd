import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { getAbilityById } from '../constants/abilities'
import { playMiss } from './useSound'
import {
  getActiveWeapon,
  getEffectiveStats,
  rollWeaponDamage,
  calcCritChance,
  calcEvasion,
  calcArmorPen,
  calcTotalArmor,
  calcBlock,
  calcCritDamage,
  HIT_DC,
} from '../utils/combatFormulas'

/**
 * Composable для исполнения способностей.
 *
 * Способности делятся по areaType:
 *  - null          → на себя (невидимость)
 *  - 'single'      → выбор одной цели (маскировка, лечение, отравление)
 *  - 'targeted'    → выбор клетки на карте (AoE)
 *  - 'self'        → мгновенно вокруг себя
 *
 * Логика:
 *  1. Игрок кликает слот → store.pendingAbility устанавливается
 *  2. Для 'single' / 'targeted' → ожидаем клик по карте / токену
 *  3. executeAbility() — тратит AP, применяет эффект, сбрасывает pending
 */
export function useAbilityExecution(damageFloatRef, flashTokenFn) {
  const store = useGameStore()

  /** Текущий кастер — тот, кто выбрал способность */
  const caster = computed(() => {
    const uid = store.pendingAbility?.tokenUid
    if (!uid) return null
    return store.placedTokens.find((t) => t.uid === uid) ?? null
  })

  /**
   * Может ли способность быть использована мгновенно (без выбора цели)?
   * areaType === null  → на себя
   * areaType === 'self' → аура вокруг себя
   */
  const isInstant = computed(() => {
    const at = store.pendingAbility?.areaType
    return at === null || at === 'self'
  })

  /** Нужен ли выбор цели-токена */
  const needsTargetToken = computed(() => store.pendingAbility?.areaType === 'single')

  /** Нужен ли выбор клетки на карте */
  const needsTargetCell = computed(() => store.pendingAbility?.areaType === 'targeted')

  // ─── Применение эффекта ──────────────────────────────────────
  function addEffect(token, effect) {
    if (!token.activeEffects) token.activeEffects = []
    // Не дублировать один и тот же эффект
    const existing = token.activeEffects.findIndex((e) => e.id === effect.id)
    if (existing !== -1) token.activeEffects.splice(existing, 1)
    token.activeEffects.push({ ...effect })
  }

  function removeEffect(token, effectId) {
    if (!token.activeEffects) return
    token.activeEffects = token.activeEffects.filter((e) => e.id !== effectId)
  }

  function hasEffect(token, effectId) {
    return token.activeEffects?.some((e) => e.id === effectId) ?? false
  }

  // ─── Исполнение по ID способности ────────────────────────────
  /**
   * @param {object}      [target] — целевой токен (для single) или { col, row } (для targeted)
   */
  function executeAbility(target) {
    const ability = store.pendingAbility
    if (!ability) return false
    const token = caster.value
    if (!token) return false

    // Проверяем достаточность AP (но не тратим пока)
    // Для power_strike: стоимость = max(apCost, weapon.apCost)
    let cost = ability.apCost ?? 1
    if (ability.id === 'power_strike') {
      const weaponAp = getActiveWeapon(token)?.apCost ?? 1
      cost = Math.max(cost, weaponAp)
    }
    if (store.combatMode && (token.actionPoints ?? 0) < cost) return false

    // Диспетчер по ID — проверка target внутри каждого case
    let applied = true
    switch (ability.id) {
      case 'power_strike':
        if (!target) return false
        applyPowerStrike(token, target, ability)
        break
      case 'invisibility':
        applyInvisibility(token)
        break
      case 'disguise':
        if (!target) return false
        applyDisguise(token, target)
        break
      case 'heal':
        if (!target) return false
        applyHeal(token, target)
        break
      case 'poison-strike':
        if (!target) return false
        applyPoison(token, target)
        break
      case 'blood-bolt':
      case 'gravity-bolt':
      case 'blood-drain':
        if (!target) return false
        applyMagicStrike(ability, token, target)
        break
      case 'gravity-crush':
      case 'gravity-well':
      case 'blood-rain':
      case 'poison-cloud':
        if (target?.col == null) return false
        executeAoE(ability, token, target)
        break
      case 'teleport':
        if (target?.col == null) return false
        applyTeleport(token, target)
        break
      default:
        applied = false
        break
    }

    // Тратим AP только если способность действительно применилась
    if (applied && store.combatMode) token.actionPoints -= cost

    // Сброс pending
    store.pendingAbility = null

    // Если AP кончились — автозавершение хода
    if (store.combatMode && (token.actionPoints ?? 0) <= 0) {
      store.endTurn()
    }

    return true
  }

  // ─── Невидимость ─────────────────────────────────────────────
  function applyInvisibility(token) {
    addEffect(token, {
      id: 'invisibility',
      name: 'Невидимость',
      icon: 'invisible',
      color: '#c4b5fd',
      remainingTurns: 3,
    })
  }

  // ─── Маскировка ──────────────────────────────────────────────
  function applyDisguise(tokenCaster, targetToken) {
    addEffect(tokenCaster, {
      id: 'disguise',
      name: 'Маскировка',
      icon: 'domino-mask',
      color: '#94a3b8',
      remainingTurns: 5,
      // Запоминаем оригинальный src и src маскировки
      originalSrc: tokenCaster.src,
      disguiseSrc: targetToken.src,
    })
    // Сразу подменяем картинку
    tokenCaster.src = targetToken.src
  }

  // ─── Лечение ─────────────────────────────────────────────────
  function applyHeal(tokenCaster, targetToken) {
    const intellect = tokenCaster.intellect ?? 0
    const healAmount = 5 + Math.floor(intellect * 1.5)
    const maxHp = store.calcMaxHp(targetToken)
    targetToken.hp = Math.min((targetToken.hp ?? maxHp) + healAmount, maxHp)
  }

  // ─── Отравление ──────────────────────────────────────────────
  function applyPoison(tokenCaster, targetToken) {
    const intellect = tokenCaster.intellect ?? 0
    const dmgPerTurn = 2 + Math.floor(intellect * 0.5)
    addEffect(targetToken, {
      id: 'poison',
      name: 'Отравление',
      icon: 'poison-bottle',
      color: '#4ade80',
      remainingTurns: 3,
      damagePerTurn: dmgPerTurn,
      casterUid: tokenCaster.uid,
    })
    // Мгновенный «тик» отравления — показываем урон и вспышку
    spawnStrikeDamage(targetToken, dmgPerTurn, '#4ade80')
  }

  // ─── Магический удар (кровь / гравитация) ────────────────────
  function applyMagicStrike(ability, tokenCaster, targetToken) {
    const abilityDef = getAbilityById(ability.id) ?? ability
    const color = abilityDef.color ?? '#e2e8f0'
    const intellect = tokenCaster.intellect ?? 0

    // Базовый урон: d8 + intellect
    const roll = Math.floor(Math.random() * 8) + 1
    const dmg = roll + intellect

    // Наносим урон
    targetToken.hp = Math.max(0, (targetToken.hp ?? 0) - dmg)
    spawnStrikeDamage(targetToken, dmg, color)

    // Кровавый снаряд: кастер теряет 2 HP (жертва крови)
    if (ability.id === 'blood-bolt') {
      tokenCaster.hp = Math.max(1, (tokenCaster.hp ?? 0) - 2)
    }

    // Кровавое иссушение: вампиризм 50% урона
    if (ability.id === 'blood-drain') {
      const healAmt = Math.floor(dmg * 0.5)
      const maxHp = store.calcMaxHp(tokenCaster)
      tokenCaster.hp = Math.min((tokenCaster.hp ?? maxHp) + healAmt, maxHp)
    }

    // Гравитационный удар: замедление на 1 ход (−AP)
    if (ability.id === 'gravity-bolt') {
      addEffect(targetToken, {
        id: 'gravity-slow',
        name: 'Притяжение',
        icon: 'magnet-blast',
        color: '#8b5cf6',
        remainingTurns: 1,
        apPenalty: 1,
        casterUid: tokenCaster.uid,
      })
    }
  }

  /**
   * Общая утилита: вспышка на токене + DamageFloat.
   */
  // ─── Силовой удар (заменяет обычную атаку, ×1.5 урона) ────────
  function applyPowerStrike(attackerToken, defenderToken, ability) {
    const eStats = getEffectiveStats(attackerToken)
    const dStats = getEffectiveStats(defenderToken)
    const multiplier = ability.damageMultiplier ?? 1.5

    // Бросок попадания: d20 + hitBonus − evasion
    const d20 = Math.floor(Math.random() * 20) + 1
    const hitBonus = calcCritChance(eStats)
    const evasion = calcEvasion(dStats)
    const total = d20 + hitBonus - evasion
    const isHit = total >= HIT_DC

    if (!isHit) {
      // Промах
      if (flashTokenFn) flashTokenFn(defenderToken.uid, 'miss')
      playMiss()
      return
    }

    // Бросок урона оружием
    const weaponRoll = rollWeaponDamage(attackerToken)
    const isCrit = d20 === 20
    const pen = calcArmorPen(eStats)
    const rawArmor = calcTotalArmor(defenderToken)
    const reduction = Math.max(0, rawArmor - pen)

    let dmg = Math.max(1, weaponRoll - reduction)

    // Крит-множитель
    if (isCrit) {
      const critMult = 1 + calcCritDamage(eStats) * 0.1
      dmg = Math.max(1, Math.round(dmg * critMult))
    }

    // Применяем множитель Силового удара
    dmg = Math.max(1, Math.round(dmg * multiplier))

    // Шанс блока
    const blockChance = calcBlock(dStats) * 2
    if (Math.random() * 100 < blockChance) {
      dmg = Math.max(1, Math.floor(dmg / 2))
    }

    // Наносим урон
    const liveDefender = store.placedTokens.find((t) => t.uid === defenderToken.uid)
    if (liveDefender) {
      const newHp = Math.max(0, (liveDefender.hp ?? 0) - dmg)
      store.editPlacedToken(liveDefender.uid, { hp: newHp })

      if (newHp === 0 && liveDefender.tokenType === 'npc') {
        store.editPlacedToken(liveDefender.uid, { stunned: true })
        store.checkCombatEnd()
      }
    }

    // Визуал: SVG-дуга меча + мощная тряска (звук привязан к анимации в GameMeleeSlash)
    const slashColor = ability.color ?? '#ef4444'
    store.meleeSlash = { col: defenderToken.col, row: defenderToken.row, color: slashColor }
    if (flashTokenFn) flashTokenFn(defenderToken.uid, 'slash')

    // Числа урона
    if (damageFloatRef?.value) {
      const hc = store.cellSize / 2
      const ox = store.gridNormOX
      const oy = store.gridNormOY
      const cx = (defenderToken.col + 1) * hc + ox
      const cy = (defenderToken.row + 1) * hc + oy
      damageFloatRef.value.spawn(defenderToken.uid, `-${dmg}`, cx, cy, slashColor)
    }
  }

  // ─── Вспомогательные: DamageFloat + Flash ────────────────────
  function spawnStrikeDamage(targetToken, dmg, color) {
    if (flashTokenFn) flashTokenFn(targetToken.uid, 'hit')

    if (damageFloatRef?.value) {
      const hc = store.cellSize / 2
      const ox = store.gridNormOX
      const oy = store.gridNormOY
      const cx = (targetToken.col + 1) * hc + ox
      const cy = (targetToken.row + 1) * hc + oy
      damageFloatRef.value.spawn(targetToken.uid, `-${dmg}`, cx, cy, color)
    }
  }

  // ─── Тик эффектов (вызывать в endTurn) ───────────────────────
  /**
   * Уменьшает remainingTurns для всех эффектов токена.
   * Если remainingTurns <= 0 — снимает эффект и откатывает визуал.
   */
  function tickEffects(token) {
    if (!token.activeEffects?.length) return

    const expired = []

    for (const effect of token.activeEffects) {
      if (effect.remainingTurns == null) continue

      // Яд наносит урон каждый ход
      if (effect.id === 'poison' && effect.damagePerTurn) {
        token.hp = Math.max(0, (token.hp ?? 0) - effect.damagePerTurn)
      }

      // Замедление (гравитация) отнимает AP в начале хода
      if (effect.id === 'gravity-slow' && effect.apPenalty) {
        token.actionPoints = Math.max(0, (token.actionPoints ?? 0) - effect.apPenalty)
      }

      effect.remainingTurns--
      if (effect.remainingTurns <= 0) expired.push(effect.id)
    }

    for (const id of expired) {
      onEffectExpire(token, id)
      removeEffect(token, id)
    }
  }

  /** Callback при истечении эффекта — откат визуала */
  function onEffectExpire(token, effectId) {
    if (effectId === 'disguise') {
      // Вернуть оригинальное изображение
      const fx = token.activeEffects?.find((e) => e.id === 'disguise')
      if (fx?.originalSrc) token.src = fx.originalSrc
    }
    // invisibility — CSS-класс снимается автоматически (нет activeEffects = нет класса)
  }

  // ─── Телепортация ─────────────────────────────────────────────
  function applyTeleport(token, targetCell) {
    // Вспышка-растворение в точке отправления
    if (flashTokenFn) flashTokenFn(token.uid, 'teleport')

    // Перемещаем токен после короткой задержки (растворение)
    setTimeout(() => {
      store.moveToken(token.uid, targetCell.col, targetCell.row)

      // Вспышка появления в точке прибытия
      if (flashTokenFn) flashTokenFn(token.uid, 'teleport')
    }, 200)
  }

  // ─── AoE (targeted) — полный flow ────────────────────────────
  /**
   * 1. Снаряд летит от кастера до точки удара
   * 2. По прилёте — вспышка на клетках
   * 3. Урон по затронутым токенам + DamageFloat
   *
   * @param {object} ability — { id, areaSize, color, icon, ... }
   * @param {object} casterToken — кастер
   * @param {{ col: number, row: number }} targetCell — центр AoE (sub-cell)
   */
  function executeAoE(ability, casterToken, targetCell) {
    const hc = store.cellSize / 2
    const ox = store.gridNormOX
    const oy = store.gridNormOY
    const size = ability.areaSize ?? 1

    // Координаты центра кастера (пиксели)
    const fromX = (casterToken.col + 1) * hc + ox
    const fromY = (casterToken.row + 1) * hc + oy

    // Координаты центра AoE-зоны (пиксели)
    const toX = (targetCell.col + 0.5) * hc + ox
    const toY = (targetCell.row + 0.5) * hc + oy

    // Собираем sub-cells зоны (areaSize = 2 → 4×4 sub-cells)
    const cells = []
    for (let dc = -size + 1; dc <= size; dc++) {
      for (let dr = -size + 1; dr <= size; dr++) {
        cells.push({ col: targetCell.col + dc, row: targetCell.row + dr })
      }
    }

    const abilityDef = getAbilityById(ability.id) ?? ability
    const icon = abilityDef.icon ?? 'game-icons:fire-bolt'
    const color = abilityDef.color ?? '#f97316'

    // 1) Снаряд
    store.abilityProjectile = { fromX, fromY, toX, toY, color, icon }

    // 2) Через 500 мс (время полёта) — impact + урон
    setTimeout(() => {
      store.abilityProjectile = null
      store.abilityImpact = { cells, color }

      // 3) Рассчитываем урон по всем токенам в зоне
      applyAoeDamage(casterToken, cells, color)
    }, 500)
  }

  /**
   * Находит все токены, чьи sub-cell-позиции попадают в зону AoE,
   * наносит урон и показывает DamageFloat.
   */
  function applyAoeDamage(casterToken, cells, color) {
    const hc = store.cellSize / 2
    const ox = store.gridNormOX
    const oy = store.gridNormOY

    // Сет строк «col,row» для быстрого поиска
    const cellSet = new Set(cells.map((c) => `${c.col},${c.row}`))

    // Токен занимает 2×2 sub-cells: col,row … col+1,row+1
    const hit = store.placedTokens.filter((t) => {
      if (t.uid === casterToken.uid) return false
      for (let dc = 0; dc < 2; dc++) {
        for (let dr = 0; dr < 2; dr++) {
          if (cellSet.has(`${t.col + dc},${t.row + dr}`)) return true
        }
      }
      return false
    })

    const intellect = casterToken.intellect ?? 0
    // Урон = d6 + intellect
    for (const t of hit) {
      const roll = Math.floor(Math.random() * 6) + 1
      const dmg = roll + intellect
      t.hp = Math.max(0, (t.hp ?? 0) - dmg)

      // DamageFloat
      if (damageFloatRef?.value) {
        const cx = (t.col + 1) * hc + ox
        const cy = (t.row + 1) * hc + oy
        damageFloatRef.value.spawn(t.uid, dmg, cx, cy, color)
      }
    }
  }

  return {
    caster,
    isInstant,
    needsTargetToken,
    needsTargetCell,
    addEffect,
    removeEffect,
    hasEffect,
    executeAbility,
    executeAoE,
    tickEffects,
  }
}
