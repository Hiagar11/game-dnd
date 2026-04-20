// Утилита для преобразования токенов, пришедших с сервера, в формат клиентского стора.
//
// Сервер возвращает токены двух видов:
//   1. Системные (дверь, факел и т.д.) — определяются полем `systemToken`
//   2. Пользовательские — ссылаются на шаблон через `tokenId`
//
// После populate() на сервере tokenId приходит объектом { _id, name, imagePath, stats },
// поэтому нужно обрабатывать оба случая — строка и объект.

import { SYSTEM_TOKENS } from '../constants/systemTokens'
import { DEFAULT_AP, DEFAULT_MP } from '../constants/combat'
import { calcMaxHp } from './combatFormulas'
import { normalizeInventorySnapshot } from './inventoryState'
import { getNpcAttitude } from './tokenFilters'
import { getAbilityTreeById } from '../constants/abilityTree'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/**
 * Преобразует один серверный токен в клиентский формат.
 *
 * @param {object} serverToken - Объект токена с сервера (placedTokens[i])
 * @param {object[]} clientTokens - Массив шаблонов из tokensStore.tokens
 * @returns {object} Токен готовый для placedTokens в game store
 */
export function mapServerToken(serverToken, clientTokens) {
  const { uid, tokenId, systemToken, col, row, hidden } = serverToken

  // ── Системный токен (дверь и пр.) ──────────────────────────────────────────
  if (systemToken) {
    const def = SYSTEM_TOKENS.find((t) => t.id === systemToken)
    return {
      uid,
      tokenId: null,
      systemToken,
      targetScenarioId: serverToken.targetScenarioId ? String(serverToken.targetScenarioId) : null,
      globalMapExit: Boolean(serverToken.globalMapExit),
      col,
      row,
      hidden: hidden ?? false,
      name: def?.name ?? systemToken,
      src: serverToken.opened && def?.srcOpened ? def.srcOpened : (def?.src ?? ''),
      srcOpened: def?.srcOpened ?? null,
      opened: serverToken.opened ?? false,
      locked: serverToken.locked ?? false,
      halfSize: def?.halfSize ?? false,
      quarterSize: def?.quarterSize ?? false,
      items: serverToken.items ? [...serverToken.items] : undefined,
      strength: 0,
      agility: 0,
      intellect: 0,
      charisma: 0,
      inventory: null,
    }
  }

  // ── Пользовательский токен ──────────────────────────────────────────────────
  // tokenId может быть строкой (ID) или объектом (populate вернул полные данные)
  const id = tokenId && typeof tokenId === 'object' ? String(tokenId._id) : String(tokenId)
  const def = clientTokens.find((t) => t.id === id)

  // Запасной источник src: populated tokenId содержит imagePath, если сервер
  // вернул полные данные через populate() (GET /api/scenarios/:id).
  // Защищает от ситуации, когда tokensStore ещё не загружен или токен удалён.
  const tokenObj = tokenId && typeof tokenId === 'object' ? tokenId : null
  const fallbackSrc = tokenObj?.imagePath ? `${API}/${tokenObj.imagePath}` : ''

  return {
    uid,
    tokenId: id,
    col,
    row,
    hidden: hidden ?? false,
    // Предпочитаем сохранённые в schema переопределения шаблонным значениям.
    // serverToken.name / .tokenType / etc. равны null если не были явно заданы —
    // в этом случае падаем на def (загруженный шаблон) или tokenObj (populate).
    name: serverToken.name ?? def?.name ?? tokenObj?.name ?? 'Неизвестный',
    tokenType: serverToken.tokenType ?? def?.tokenType ?? tokenObj?.tokenType ?? 'npc',
    attitude: getNpcAttitude(serverToken.attitude ?? def?.attitude ?? tokenObj?.attitude),
    npcName: serverToken.npcName ?? def?.npcName ?? tokenObj?.npcName ?? '',
    personality: serverToken.personality ?? def?.personality ?? tokenObj?.personality ?? '',
    contextNotes: serverToken.contextNotes ?? def?.contextNotes ?? tokenObj?.contextNotes ?? '',
    secretKnowledge:
      serverToken.secretKnowledge ?? def?.secretKnowledge ?? tokenObj?.secretKnowledge ?? '',
    dispositionType:
      serverToken.dispositionType ?? def?.dispositionType ?? tokenObj?.dispositionType ?? 'neutral',
    src: def?.src ?? fallbackSrc,
    strength: serverToken.strength ?? def?.strength ?? tokenObj?.stats?.strength ?? 0,
    agility: serverToken.agility ?? def?.agility ?? tokenObj?.stats?.agility ?? 0,
    intellect: serverToken.intellect ?? def?.intellect ?? tokenObj?.stats?.intellect ?? 0,
    charisma: serverToken.charisma ?? def?.charisma ?? tokenObj?.stats?.charisma ?? 0,
    // Опыт и уровень — предпочитаем сохранённое переопределение в экземпляре
    xp: serverToken.xp ?? def?.xp ?? tokenObj?.xp ?? 0,
    level: serverToken.level ?? def?.level ?? tokenObj?.level ?? 1,
    statPoints: serverToken.statPoints ?? 0,
    autoLevel: serverToken.autoLevel ?? false,
    // HP: берём сохранённое override-значение или пересчитываем из характеристик по формуле
    maxHp:
      serverToken.maxHp ??
      calcMaxHp(
        serverToken.strength ?? def?.strength ?? tokenObj?.stats?.strength ?? 0,
        serverToken.agility ?? def?.agility ?? tokenObj?.stats?.agility ?? 0
      ),
    hp:
      serverToken.hp ??
      calcMaxHp(
        serverToken.strength ?? def?.strength ?? tokenObj?.stats?.strength ?? 0,
        serverToken.agility ?? def?.agility ?? tokenObj?.stats?.agility ?? 0
      ),
    actionPoints: serverToken.actionPoints ?? DEFAULT_AP,
    movementPoints: serverToken.movementPoints ?? DEFAULT_MP,
    race: serverToken.race ?? def?.race ?? tokenObj?.race ?? '',
    inventory: normalizeInventorySnapshot(serverToken.inventory),
    // Дерево способностей и активные слоты
    treeActivatedIds: serverToken.treeActivatedIds ?? [],
    abilities: refreshAbilities(serverToken.abilities ?? []),
    passiveAbilities: serverToken.passiveAbilities ?? [],
  }
}

/**
 * Обновляет поля способностей из abilityTree.js.
 * Сохранённые на токене объекты могут быть устаревшими —
 * подтягиваем актуальные поля (areaType, requiresShield и др.)
 * по id способности, сохраняя порядок слотов.
 */
function refreshAbilities(abilities) {
  return abilities.map((slot) => {
    if (!slot?.id) return slot
    const fresh = getAbilityTreeById(slot.id)
    if (!fresh) return slot
    return { ...fresh }
  })
}
