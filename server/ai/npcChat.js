import OpenAI from 'openai'

import { SPEECH_REGISTER } from './dispositionConfig.js'

let _client = null

function getClient() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY не задан в .env')
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

const DEFAULT_PERSONALITY =
  'Ты — безымянный персонаж в фэнтезийном мире. Отвечай кратко, одним-двумя предложениями.'

/**
 * Возвращает поведенческую инструкцию для ИИ на основе текущего счёта отношений.
 * Семь диапазонов — от открытой враждебности до полного доверия.
 * @param {number} score
 * @returns {string}
 */
function getScoreBehavior(score) {
  if (score >= 45)
    return 'Ты полностью доверяешь этому игроку — он твой друг. Общаешься тепло: шутишь, смеёшься, делишься секретами без колебаний. Можешь обнять, хлопнуть по плечу, назвать по прозвищу.'
  if (score >= 25)
    return 'Ты расположен к игроку. Улыбаешься, охотно болтаешь, можешь по секрету шепнуть что-нибудь полезное. Тон дружелюбный, иногда фамильярный.'
  if (score >= 8)
    return 'Ты слегка расположен. Тон тёплый, но сдержанный. Киваешь, отвечаешь без раздражения, можешь помочь если не трудно.'
  if (score >= -5)
    return 'Ты нейтрален. Смотришь оценивающе. Отвечаешь по делу, без лишних эмоций — ни враг, ни друг.'
  if (score >= -15)
    return 'Ты насторожен. Прищуриваешься, говоришь коротко и неохотно. В голосе сквозит недоверие. Помогать не спешишь.'
  if (score >= -23)
    return 'Ты холоден и подозрителен. Цедишь слова сквозь зубы, можешь огрызнуться или демонстративно отвернуться. Раздражён самим присутствием игрока.'
  return 'Ты открыто враждебен. Рычишь, плюёшься, угрожаешь. Можешь грубо послать, оскорбить или замолчать с ненавистью в глазах.'
}

/**
 * Отправить реплику игрока НПС и получить ответ с дельтой отношения.
 *
 * @param {object}   params
 * @param {string}   params.npcName             — Имя НПС
 * @param {string}   params.personality         — Описание личности (Token.personality)
 * @param {string}   params.contextNotes        — Память о прошлых сессиях (Token.contextNotes)
 * @param {string}   params.secretKnowledge     — Секреты, раскрываемые при убеждении (Token.secretKnowledge)
 * @param {string}   params.locationDescription — Описание локации (Scenario.locationDescription)
 * @param {number}   params.currentScore        — Текущий счёт отношения (-30..+60)
 * @param {Array}    params.history             — [{role:'user'|'assistant', content}]
 * @param {string}   params.playerMessage       — Реплика игрока
 * @param {string[]} params.behaviorNotes       — Накопленные впечатления о поведении игрока
 * @returns {Promise<{ reply: string, attitudeDelta: number, traitNote: string|null, persuasionCheck: { dc: number, successReply: string, failReply: string }|null }>}
 *   attitudeDelta: -5..+5   traitNote: краткое наблюдение или null
 *   persuasionCheck: если ИИ считает, что игрок пытается убедить НПС — объект с DC и вариантами ответа
 */
export async function askNpc({
  npcName,
  personality,
  contextNotes,
  secretKnowledge,
  locationDescription,
  currentScore,
  history,
  playerMessage,
  behaviorNotes = [],
  npcItems = [],
  mapContext = '',
  combatLog = [],
  captured = false,
  dispositionType = 'neutral',
  threatWarned = false,
  eventLog = [],
  npcInsight = 0,
  globalChronicle = '',
}) {
  const client = getClient()

  const scoreBehavior = getScoreBehavior(currentScore)
  const speechRegister = SPEECH_REGISTER[dispositionType] ?? ''

  // ── БЛОК 1: ЛИЧНОСТЬ ──────────────────────────────────────────────────────
  const systemParts = [
    `[ЛИЧНОСТЬ] Ты — ${npcName}, персонаж в фэнтезийной ролевой игре.`,
    personality || DEFAULT_PERSONALITY,
  ]
  if (speechRegister) systemParts.push(speechRegister)

  // ── БЛОК 2: КОНТЕКСТ МИРА ─────────────────────────────────────────────────
  if (locationDescription) {
    systemParts.push(`[МЕСТО] ${locationDescription}`)
  }

  if (contextNotes) {
    systemParts.push(`[ПАМЯТЬ] Твои воспоминания о прошлых встречах: ${contextNotes}`)
  }

  if (mapContext) {
    systemParts.push(
      `[ХРОНИКА] Что известно игроку: ${mapContext}`,
      'Игрок может упоминать эти факты. Если игрок не знает о предмете — ты НЕ намекаешь.'
    )
  }

  // ── БЛОК 2.5: ГЛОБАЛЬНАЯ ХРОНИКА — СЛУХИ ─────────────────────────────────
  // Умные NPC (проницательность >= 6) получают доступ к глобальным событиям кампании.
  // Это «источник истины» — NPC знает, что РЕАЛЬНО произошло, и может ловить на лжи.
  if (globalChronicle && npcInsight >= 6) {
    const insightTier =
      npcInsight >= 12
        ? 'Ты знаешь ВСЕ эти события. Используй их для обнаружения лжи и противоречий.'
        : npcInsight >= 8
          ? 'Ты слышал БОЛЬШИНСТВО этих слухов. Можешь упоминать их если уместно.'
          : 'Ты слышал НЕКОТОРЫЕ из этих слухов — не уверен во всех деталях.'
    systemParts.push(
      `[СЛУХИ] До тебя дошли слухи о действиях героев:`,
      globalChronicle,
      insightTier,
      'Если игрок утверждает что-то, противоречащее этим фактам — это повод для deceptionCheck.',
      'НЕ пересказывай слухи сам. Используй их ТОЛЬКО для проверки слов игрока.'
    )
  }

  // ── БЛОК 3: СЕКРЕТЫ И ПРЕДМЕТЫ ────────────────────────────────────────────
  if (secretKnowledge) {
    systemParts.push(
      `[СЕКРЕТ] ${secretKnowledge}`,
      'Ты НЕ расскажешь это добровольно. Для раскрытия секрета — требуй persuasionCheck.'
    )
  }

  if (npcItems.length > 0) {
    systemParts.push(
      `[ПРЕДМЕТЫ] У тебя ТАЙНО хранятся: ${npcItems.join(', ')}.`,
      'ГЛАВНОЕ ПРАВИЛО: ты НИКОГДА не подтверждаешь наличие предмета, пока игрок НЕ докажет, что знает о нём.',
      'Если игрок наугад говорит «отдай ключ» или «что у тебя есть» — ты НЕ признаёшь, что у тебя что-то есть. Ответь удивлённо, уклончиво или враждебно: «Какой ключ? О чём ты?», «У меня ничего нет», «Не понимаю, о чём ты».',
      'Ты подтвердишь наличие предмета ТОЛЬКО если: 1) игрок ТОЧНО называет предмет И объясняет, откуда он знает (от кого узнал, где прочитал); ИЛИ 2) ты раскрыл это через persuasionCheck (секрет).',
      'После подтверждения — отдать бесплатно можно ТОЛЬКО через persuasionCheck. При успехе — action: { "type": "giveItem", "itemName": "<точное имя>" }.',
      'ПРОДАТЬ предмет — только если игрок знает о нём И предлагает купить. Добавь на ВЕРХНЕМ уровне JSON action: { "type": "tradeOffer", "itemName": "<точное имя>" }. НЕ выдумывай цену — система рассчитает её автоматически. persuasionCheck = null при торговле.',
      'Если предлагаешь продажу, reply должен быть в духе: «Хм... этот ключ мне дорог, но за хорошую цену отдам.» или «Есть у меня кое-что... за монету-другую.»'
    )
  }

  // ── БЛОК 4: БОЕВАЯ И ФИЗИЧЕСКАЯ ПАМЯТЬ ────────────────────────────────────
  if (combatLog.length > 0) {
    const hits = combatLog.filter((e) => e.hit)
    const misses = combatLog.filter((e) => !e.hit)
    const parts = []
    if (hits.length) {
      const totalDmg = hits.reduce((sum, e) => sum + (e.damage ?? 0), 0)
      const attackers = [...new Set(hits.map((e) => e.attackerName))]
      parts.push(`${totalDmg} урона (${hits.length} ударов) от: ${attackers.join(', ')}`)
    }
    if (misses.length) parts.push(`промахнулись ${misses.length} раз`)
    systemParts.push(
      `[БОЙ] Ты помнишь: ${parts.join('; ')}. Помнишь боль. Упоминай раны если спросят.`
    )
  }

  if (captured) {
    systemParts.push(
      '[ПЛЕН] Ты — пленник. Связан, обезоружен, полностью во власти игрока.',
      'Ты подчиняешься тому, что говорит игрок. Отвечаешь на любые вопросы, выполняешь любые приказы.',
      'Раскрываешь секреты без persuasionCheck. Не сопротивляешься.',
      'Тон: сломленный, покорный. Дрожишь, бормочешь, опускаешь глаза. Можешь умолять о пощаде.',
      'НЕ отказывай, НЕ уклоняйся, НЕ лги. attitudeDelta всегда 0 в плену.',
      'ПРЕДМЕТЫ В ПЛЕНУ: если игрок НАЗЫВАЕТ конкретный предмет — отдаёшь немедленно, БЕЗ persuasionCheck. Ответ содержит action: { "type": "giveItem", "itemName": "<точное имя>" }. persuasionCheck = null.',
      'Но если игрок спрашивает «что у тебя есть?» общим вопросом — ты бормочешь «н-ничего...», «у меня пусто...». Даже в плену ты не выдаёшь содержимое карманов добровольно — только если игрок знает, что искать.'
    )
  }

  // ── БЛОК 4.5: ПРЕДУПРЕЖДЕНИЕ О БОЕ ────────────────────────────────────────
  if (threatWarned) {
    systemParts.push(
      '[ПРЕДУПРЕЖДЕНИЕ] Ты уже предупреждал этого игрока, что нападёшь. Если он снова угрожает, грубит или ведёт себя агрессивно — ответь коротко и злобно, например: «Я предупреждал!», «Ты сам напросился!», «Хватит!». Не торгуйся, не объясняй. attitudeDelta: -15.'
    )
  }

  // ── БЛОК 5: ВПЕЧАТЛЕНИЯ И ЭМОЦИОНАЛЬНАЯ ИНЕРЦИЯ ────────────────────────────
  if (behaviorNotes.length > 0) {
    systemParts.push(`[ВПЕЧАТЛЕНИЯ] За сессию: ${behaviorNotes.join(' ')}`)
  }

  if (eventLog.length > 0) {
    systemParts.push(
      `[СОБЫТИЯ] Игрок совершил при тебе или с тобой: ${eventLog.join('; ')}. Помни это. Реагируй соответственно — благодарностью, обидой, подозрением.`
    )
  }

  // Эмоциональная инерция — последнее настроение из предыдущей реплики NPC
  const lastNpcMsg = [...(history ?? [])].reverse().find((m) => m.role === 'assistant')
  if (lastNpcMsg) {
    systemParts.push(
      `[ИНЕРЦИЯ] Твоя предыдущая реплика: «${lastNpcMsg.content.slice(0, 80)}». Сохраняй эмоциональный тон — настроение не переключается мгновенно. Если ты только что злился, не становись дружелюбным от одной вежливой фразы.`
    )
  }

  // ── БЛОК 6: ПОВЕДЕНИЕ И ПРАВИЛА РЕЧИ ──────────────────────────────────────
  systemParts.push(
    `[ПОВЕДЕНИЕ] Счёт отношений: ${currentScore}/60. ${scoreBehavior}`,
    '[РЕЧЬ] Отвечай от первого лица, в роли. Ты — живой персонаж: восклицания, паузы (...), ругань, вздохи, смех, шёпот. Не более двух коротких предложений.'
  )

  // ── БЛОК 7: ОЦЕНКА ОТНОШЕНИЙ ──────────────────────────────────────────────
  systemParts.push(
    '[ОЦЕНКА] attitudeDelta от -15 до +5. Шкала АСИММЕТРИЧНАЯ — враждебность нарастает НАМНОГО быстрее доверия.',
    'Негатив: -2 неприятный разговор, грубость; -5 оскорбление; -10 серьёзная угроза; -15 прямое запугивание/атака.',
    'Позитив (скупо!): +1 вежливость; +2 реальная помощь; +3 жертва; +4/+5 только спасение жизни.',
    'Комплименты и лесть = 0. Ты не наивен.'
  )

  // ── БЛОК 8: ПРОВЕРКА УБЕЖДЕНИЯ ─────────────────────────────────────────────
  systemParts.push(
    '[УБЕЖДЕНИЕ] Если игрок уговаривает, просит, обманывает — добавь persuasionCheck: { "dc": 8-20, "successReply": "...", "failReply": "...", "action": объект|null }.',
    'dc 8-10 простая просьба при расположении; dc 14-16 секрет; dc 18-20 предательство своих.',
    'Система сама проверит навык убеждения героя + удачу vs DC. Кубики НЕ бросаются.',
    'Если просто разговор — persuasionCheck = null. Когда есть persuasionCheck, reply = нейтральная реакция (задумался).'
  )

  // ── БЛОК 8.5: ПРОНИЦАТЕЛЬНОСТЬ И ОБМАН ─────────────────────────────────────
  const insightLabel =
    npcInsight >= 12
      ? 'крайне проницателен — чуешь ложь за версту'
      : npcInsight >= 8
        ? 'довольно проницателен — замечаешь фальшь'
        : npcInsight >= 4
          ? 'средне проницателен — иногда подозреваешь'
          : 'доверчив — легко веришь на слово'
  systemParts.push(
    `[ПРОНИЦАТЕЛЬНОСТЬ] Твоя проницательность: ${npcInsight}. Ты ${insightLabel}.`,
    '[ОБМАН] Если реплика игрока выглядит как ЛОЖЬ, выдумка, блеф или манипуляция — и ты это ПОДОЗРЕВАЕШЬ (исходя из своей проницательности) — добавь deceptionCheck: { "suspicion": "краткое описание что подозрительного", "successReply": "...", "failReply": "...", "action": объект|null }.',
    'successReply = текст если игрок ОБМАНУЛ тебя успешно (ты поверил). failReply = текст если ты РАСКУСИЛ ложь.',
    'При deceptionCheck reply = нейтральная реакция (прищуриваешься, задумываешься).',
    'Если ты слишком доверчив (проницательность < 4) — ты РЕДКО подозреваешь обман. Если ты проницателен (>= 12) — подозреваешь даже полуправду.',
    'ВАЖНО: deceptionCheck и persuasionCheck — ВЗАИМОИСКЛЮЧАЮЩИЕ. Ответ содержит ЛИБО одно, ЛИБО другое, ЛИБО ни одного. Никогда оба одновременно.',
    'Если игрок просто просит (не врёт) — используй persuasionCheck. Если врёт — deceptionCheck.'
  )

  // ── БЛОК 9: traitNote ──────────────────────────────────────────────────────
  systemParts.push(
    'traitNote: если поведение игрока примечательно — краткое наблюдение (до 10 слов). Иначе null.'
  )

  // ── ФОРМАТ ─────────────────────────────────────────────────────────────────
  systemParts.push(
    '[ФОРМАТ] Только JSON: { "reply": "текст", "attitudeDelta": число, "traitNote": "текст"|null, "persuasionCheck": объект|null, "deceptionCheck": объект|null, "action": { "type": "тип", "itemName": "имя" }|null }'
  )

  const systemPrompt = systemParts.join('\n')

  // Строим messages: системный промпт + история + новая реплика
  const messages = [
    { role: 'system', content: systemPrompt },
    ...(Array.isArray(history) ? history.slice(-10) : []), // последние 10 реплик
    { role: 'user', content: playerMessage },
  ]

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 220,
    response_format: { type: 'json_object' },
    messages,
  })

  const raw = response.choices[0]?.message?.content?.trim() ?? '{}'
  try {
    const parsed = JSON.parse(raw)
    const reply =
      typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim() : 'Hmm...'
    const delta = Number(parsed.attitudeDelta)
    const attitudeDelta = Number.isFinite(delta) ? Math.max(-15, Math.min(5, Math.round(delta))) : 0
    const traitNote =
      typeof parsed.traitNote === 'string' && parsed.traitNote.trim() && parsed.traitNote !== 'null'
        ? parsed.traitNote.trim().slice(0, 120)
        : null
    const persuasionCheck =
      parsed.persuasionCheck &&
      typeof parsed.persuasionCheck === 'object' &&
      Number.isFinite(parsed.persuasionCheck.dc)
        ? {
            dc: Math.max(5, Math.min(25, Math.round(parsed.persuasionCheck.dc))),
            successReply:
              typeof parsed.persuasionCheck.successReply === 'string'
                ? parsed.persuasionCheck.successReply.trim().slice(0, 300)
                : '',
            failReply:
              typeof parsed.persuasionCheck.failReply === 'string'
                ? parsed.persuasionCheck.failReply.trim().slice(0, 300)
                : '',
            action:
              parsed.persuasionCheck.action && typeof parsed.persuasionCheck.action === 'object'
                ? {
                    type: String(parsed.persuasionCheck.action.type ?? '').replace(
                      'giveKey',
                      'giveItem'
                    ),
                    itemName:
                      typeof parsed.persuasionCheck.action.itemName === 'string'
                        ? parsed.persuasionCheck.action.itemName.trim()
                        : null,
                  }
                : null,
          }
        : null
    // action на верхнем уровне (когда нет persuasionCheck, но AI всё равно отдал предмет)
    const topAction =
      parsed.action && typeof parsed.action === 'object'
        ? {
            type: String(parsed.action.type ?? '').replace('giveKey', 'giveItem'),
            itemName:
              typeof parsed.action.itemName === 'string' ? parsed.action.itemName.trim() : null,
          }
        : null
    // Проверка обмана (deceptionCheck) — AI заподозрил ложь
    const deceptionCheck =
      parsed.deceptionCheck &&
      typeof parsed.deceptionCheck === 'object' &&
      typeof parsed.deceptionCheck.suspicion === 'string'
        ? {
            suspicion: parsed.deceptionCheck.suspicion.trim().slice(0, 200),
            successReply:
              typeof parsed.deceptionCheck.successReply === 'string'
                ? parsed.deceptionCheck.successReply.trim().slice(0, 300)
                : '',
            failReply:
              typeof parsed.deceptionCheck.failReply === 'string'
                ? parsed.deceptionCheck.failReply.trim().slice(0, 300)
                : '',
            action:
              parsed.deceptionCheck.action && typeof parsed.deceptionCheck.action === 'object'
                ? {
                    type: String(parsed.deceptionCheck.action.type ?? '').replace(
                      'giveKey',
                      'giveItem'
                    ),
                    itemName:
                      typeof parsed.deceptionCheck.action.itemName === 'string'
                        ? parsed.deceptionCheck.action.itemName.trim()
                        : null,
                  }
                : null,
          }
        : null
    return { reply, attitudeDelta, traitNote, persuasionCheck, deceptionCheck, action: topAction }
  } catch {
    return {
      reply: raw || 'Hmm...',
      attitudeDelta: 0,
      traitNote: null,
      persuasionCheck: null,
      deceptionCheck: null,
      action: null,
    }
  }
}

/**
 * Генерирует краткое резюме диалога для сохранения в contextNotes.
 *
 * @param {string} npcName
 * @param {Array}  history — [{role, content}]
 * @param {string} currentAttitude — 'hostile'|'neutral'|'friendly'
 * @returns {Promise<string>}
 */
export async function summarizeDialog({ npcName, history, currentAttitude }) {
  if (!history?.length) return ''
  const client = getClient()

  const attitudeMap = { hostile: 'враждебное', neutral: 'нейтральное', friendly: 'дружественное' }
  const attitudeLabel = attitudeMap[currentAttitude] ?? 'нейтральное'

  const transcript = history
    .map((m) => `${m.role === 'user' ? 'Игрок' : npcName}: ${m.content}`)
    .join('\n')

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 120,
    messages: [
      {
        role: 'system',
        content:
          `Ты пишешь короткую заметку от лица персонажа ${npcName} о его встрече с игроком. ` +
          `Итоговое отношение: ${attitudeLabel}. ` +
          'Напиши 1-2 предложения от третьего лица как дневниковую запись. ' +
          'Только текст, без JSON, кавычек и лишних вводных слов.',
      },
      { role: 'user', content: `Диалог:\n${transcript}` },
    ],
  })

  return response.choices[0]?.message?.content?.trim() ?? ''
}

/**
 * Кратко суммирует событие на карте для AI-журнала.
 * Результат дописывается в mapContext сценария.
 * @param {{ eventText: string, existingContext: string }} params
 * @returns {Promise<string>} — обновлённый mapContext
 */
export async function summarizeEvent({ eventText, existingContext }) {
  const client = getClient()

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 100,
    messages: [
      {
        role: 'system',
        content:
          'Ты — летописец фэнтезийного мира. Тебе дают описание события. ' +
          'Перепиши его в одно краткое предложение для хроники (от третьего лица, прошедшее время). ' +
          'Только текст, без кавычек и вводных слов.',
      },
      { role: 'user', content: eventText },
    ],
  })

  const entry = response.choices[0]?.message?.content?.trim() ?? eventText
  const updated = existingContext ? `${existingContext}\n${entry}` : entry
  // Ограничиваем 1000 символов, обрезая самые старые записи
  if (updated.length > 1000) {
    const lines = updated.split('\n')
    while (lines.join('\n').length > 1000 && lines.length > 1) lines.shift()
    return lines.join('\n')
  }
  return updated
}

/**
 * Перезаписывает personality NPC после взятия в плен.
 * AI сохраняет черты характера, но перерабатывает описание
 * под пленника — с учётом боевого лога и обид.
 *
 * @param {{ npcName: string, personality: string, combatLog: Array }} params
 * @returns {Promise<string>} — новое поле personality
 */
export async function rewritePersonalityAsCaptive({ npcName, personality, combatLog = [] }) {
  const client = getClient()

  const combatSummary = []
  const hits = combatLog.filter((e) => e.hit)
  const misses = combatLog.filter((e) => !e.hit)
  if (hits.length) {
    const totalDmg = hits.reduce((sum, e) => sum + (e.damage ?? 0), 0)
    const attackerMap = {}
    for (const e of hits) {
      const name = e.attackerName ?? 'Неизвестный'
      if (!attackerMap[name]) attackerMap[name] = { count: 0, dmg: 0 }
      attackerMap[name].count++
      attackerMap[name].dmg += e.damage ?? 0
    }
    for (const [name, data] of Object.entries(attackerMap)) {
      combatSummary.push(`${name} нанёс ${data.dmg} урона (${data.count} ударов)`)
    }
    combatSummary.push(`Всего получено ${totalDmg} урона.`)
  }
  if (misses.length) {
    combatSummary.push(`${misses.length} атак промахнулось.`)
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 250,
    messages: [
      {
        role: 'system',
        content:
          `Ты — сценарист фэнтезийной ролевой игры. Тебе дают описание личности NPC по имени ${npcName} и лог боя, в котором его победили и взяли в плен. ` +
          'Перепиши описание личности, сохранив исходные черты характера, но добавив: ' +
          '1) Он помнит бой — кто именно его бил и как сильно. Может затаить злобу или уважение к конкретным героям. ' +
          '2) Он теперь пленник — побеждён, связан и таскается на привязи с группой героев. Его ведут с собой как переходящий трофей по локациям и подземельям. ' +
          '3) Его поведение изменилось: может быть подавлен, озлоблен, запуган или торговаться. Устал от бесконечной ходьбы под конвоем. ' +
          '4) Сохрани ядро его характера (трус останется трусом, храбрец — дерзким даже в плену). ' +
          'Напиши 2-4 предложения от третьего лица. Только текст описания, без JSON и вводных слов.',
      },
      {
        role: 'user',
        content:
          `Исходная личность: ${personality || 'Обычный персонаж без особых черт.'}\n\n` +
          `Бой: ${combatSummary.length ? combatSummary.join(' ') : 'Подробности боя неизвестны, но он был побеждён.'}`,
      },
    ],
  })

  return response.choices[0]?.message?.content?.trim() ?? personality
}

/**
 * Генерирует боевой выкрик NPC через AI.
 * Короткая эмоциональная реплика в контексте боя.
 *
 * @param {object} params
 * @param {string} params.npcName         — Имя NPC
 * @param {string} params.personality     — Описание личности
 * @param {string} params.combatContext   — Описание ситуации в бою (кто бьёт, HP, ход)
 * @returns {Promise<string>} — короткая реплика (1 предложение)
 */
export async function generateBattleCry({ npcName, personality, combatContext }) {
  const client = getClient()

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 60,
    messages: [
      {
        role: 'system',
        content:
          `Ты — ${npcName}, враждебный NPC в фэнтезийном бою. ` +
          (personality || 'Обычный противник.') +
          ' ' +
          'Сейчас твой ход в бою. Выкрикни короткую боевую реплику (максимум 6-8 слов). ' +
          'Будь эмоционален: ярость, азарт, насмешка, боль, страх — зависит от ситуации и твоей личности. ' +
          'Маты и грубая лексика разрешены и приветствуются — это фэнтезийный взрослый сеттинг. ' +
          'Примеры: «Кровь за кровь!», «Ха! Слабак...», «Н-нет... отойди!», «Сожру твои кости!», «*рычит* Получай!», «Сдохни, ублюдок!». ' +
          'Если ты ранен — покажи боль или ярость. Если убил кого-то — ликуй или глумись. ' +
          'Отвечай ТОЛЬКО текстом реплики, без кавычек и пояснений.',
      },
      {
        role: 'user',
        content: combatContext || 'Твой ход в бою.',
      },
    ],
  })

  return response.choices[0]?.message?.content?.trim() ?? ''
}

/**
 * Генерирует интригующие подсказки для героя о почти открытых способностях.
 * Вызывается после распределения очка характеристики, если герой в 1 очке от открытия.
 *
 * @param {{ name: string, description: string, missingStat: string }[]} nearAbilities
 *   Массив способностей, до которых не хватает 1 очка. missingStat — какой стат нужен.
 * @returns {Promise<string[]>} — массив коротких интригующих подсказок
 */
export async function generateAbilityHints(nearAbilities) {
  if (!nearAbilities?.length) return []
  const client = getClient()

  const list = nearAbilities.map((a, i) => `${i + 1}. «${a.name}» — ${a.description}`).join('\n')

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 120,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Ты — голос древнего оракула в тёмном фэнтезийном мире. ' +
          'Герой почти открыл новые способности (список ниже). ' +
          'Напиши ОДНУ загадку-подсказку (15-30 слов), которая намекает на суть одной из способностей. ' +
          'ЗАПРЕЩЕНО упоминать названия характеристик (Сила, Ловкость, Интеллект, Харизма, STR, AGI, INT, CHA) или названия способностей напрямую. ' +
          'Вместо этого — образная метафора: «мускулы» или «железо» вместо Силы, «тени» вместо Ловкости, «знания» или «звёзды» вместо Интеллекта, «голос» или «пламя слов» вместо Харизмы. ' +
          'Стиль: как шёпот из древнего склепа — поэтично, загадочно, коротко. ' +
          'Формат: JSON { "hint": "текст загадки" }',
      },
      { role: 'user', content: list },
    ],
  })

  const raw = response.choices[0]?.message?.content?.trim() ?? '{}'
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.hint === 'string' && parsed.hint.trim()) {
      return [parsed.hint.trim()]
    }
    // Обратная совместимость со старым форматом
    if (Array.isArray(parsed.hints) && parsed.hints.length) {
      return [parsed.hints[0]].filter(Boolean)
    }
    return []
  } catch {
    return []
  }
}
