// Утилита для преобразования токенов, пришедших с сервера, в формат клиентского стора.
//
// Сервер возвращает токены двух видов:
//   1. Системные (дверь, факел и т.д.) — определяются полем `systemToken`
//   2. Пользовательские — ссылаются на шаблон через `tokenId`
//
// После populate() на сервере tokenId приходит объектом { _id, name, imagePath, stats },
// поэтому нужно обрабатывать оба случая — строка и объект.

import { SYSTEM_TOKENS } from '../constants/systemTokens'

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
      col,
      row,
      hidden: hidden ?? false,
      name: def?.name ?? systemToken,
      src: def?.src ?? '',
      strength: 0,
      agility: 0,
      intellect: 0,
      charisma: 0,
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
    name: def?.name ?? tokenObj?.name ?? 'Неизвестный',
    src: def?.src ?? fallbackSrc,
    tokenType: def?.tokenType ?? tokenObj?.tokenType ?? 'npc',
    attitude: def?.attitude ?? tokenObj?.attitude ?? 'neutral',
    strength: def?.strength ?? tokenObj?.stats?.strength ?? 0,
    agility: def?.agility ?? tokenObj?.stats?.agility ?? 0,
    intellect: def?.intellect ?? tokenObj?.stats?.intellect ?? 0,
    charisma: def?.charisma ?? tokenObj?.stats?.charisma ?? 0,
    // Опыт и уровень — берём из шаблона (def из tokensStore) или из populated tokenId
    xp: def?.xp ?? tokenObj?.xp ?? 0,
    level: def?.level ?? tokenObj?.level ?? 1,
    // HP: берём сохранённое значение или пересчитываем из характеристик по формуле
    // maxHp = 10 + strength*2 + agility
    maxHp:
      serverToken.maxHp ??
      10 +
        (def?.strength ?? tokenObj?.stats?.strength ?? 0) * 2 +
        (def?.agility ?? tokenObj?.stats?.agility ?? 0),
    hp:
      serverToken.hp ??
      10 +
        (def?.strength ?? tokenObj?.stats?.strength ?? 0) * 2 +
        (def?.agility ?? tokenObj?.stats?.agility ?? 0),
    actionPoints: serverToken.actionPoints ?? 4,
    npcName: def?.npcName ?? tokenObj?.npcName ?? '',
    personality: def?.personality ?? tokenObj?.personality ?? '',
  }
}
