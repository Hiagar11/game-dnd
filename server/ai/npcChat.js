import OpenAI from 'openai'

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
  if (score >= 75)
    return 'Ты полностью доверяешь этому игроку. Общаешься как с близким другом или союзником: тепло, открыто, делишься секретами и помогаешь без колебаний.'
  if (score >= 40)
    return 'Ты расположен к игроку. Говоришь приветливо и дружелюбно, охотно отвечаешь на вопросы, можешь рассказать немного больше, чем обычно.'
  if (score >= 10)
    return 'Ты слегка расположен к игроку. Тон нейтрально-тёплый. Готов помочь, если это не обременительно.'
  if (score >= -10)
    return 'Ты нейтрален. Отвечаешь по делу, без лишних эмоций. Не враг, но и не друг.'
  if (score >= -40)
    return 'Ты настороженно относишься к игроку. Отвечаешь коротко и осторожно. Мало доверяешь его намерениям, не спешишь помогать.'
  if (score >= -70)
    return 'Ты подозрителен и холоден. Почти не скрываешь неприязни. Отвечаешь сухо или раздражённо, помогать не собираешься.'
  return 'Ты открыто враждебен. Груб, отказываешь в помощи, можешь угрожать или демонстративно игнорировать вопросы.'
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
 * @param {number}   params.currentScore        — Текущий счёт отношения (-100..+100)
 * @param {Array}    params.history             — [{role:'user'|'assistant', content}]
 * @param {string}   params.playerMessage       — Реплика игрока
 * @param {string[]} params.behaviorNotes       — Накопленные впечатления о поведении игрока
 * @returns {Promise<{ reply: string, attitudeDelta: number, traitNote: string|null, persuasionCheck: { dc: number, successReply: string, failReply: string }|null }>}
 *   attitudeDelta: -3..+3   traitNote: краткое наблюдение или null
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
}) {
  const client = getClient()

  const scoreBehavior = getScoreBehavior(currentScore)

  const systemParts = [
    `Ты — ${npcName}, персонаж в фэнтезийной ролевой игре.`,
    personality || DEFAULT_PERSONALITY,
  ]

  if (locationDescription) {
    systemParts.push(`Место действия: ${locationDescription}`)
  }

  if (contextNotes) {
    systemParts.push(`Твои воспоминания о прошлых встречах с игроком: ${contextNotes}`)
  }

  if (secretKnowledge) {
    systemParts.push(
      `У тебя есть секретные знания: ${secretKnowledge}`,
      'Ты НЕ расскажешь это добровольно. Если игрок пытается выведать, уговорить, убедить тебя раскрыть секрет — требуй проверку убеждения (persuasionCheck).'
    )
  }

  // Накопленные впечатления о поведении игрока в текущей сессии
  if (behaviorNotes.length > 0) {
    systemParts.push(`Твои впечатления от этого игрока за сессию: ${behaviorNotes.join(' ')}`)
  }

  systemParts.push(
    `Счёт отношений: ${currentScore}/100. Твоё поведение сейчас: ${scoreBehavior}`,
    'Отвечай от первого лица, оставайся в роли. Не упоминай, что ты ИИ.',
    'Ответ — не более двух коротких предложений. Манера речи должна соответствовать уровню отношений.',
    'Оцени как новая реплика игрока влияет на твоё отношение: attitudeDelta от -3 до +3.',
    '-3 — грубая угроза/оскорбление; -1 — лёгкое недоверие; 0 — нейтрально;',
    '+1 — вежливость/интерес; +3 — искренняя помощь или убедительный аргумент.',
    'Если поведение игрока в этой реплике примечательно (что-то новое о его намерениях или манере), запиши наблюдение в traitNote (до 10 слов). Иначе null.',
    'ПРОВЕРКА УБЕЖДЕНИЯ: если игрок явно пытается уговорить, убедить, выпросить информацию, снизить цену, попросить помощь или обмануть — добавь persuasionCheck.',
    'persuasionCheck — объект { "dc": число 8-20, "successReply": "текст при успехе", "failReply": "текст при провале" }.',
    'dc зависит от сложности просьбы и твоего расположения: dc 8-10 — простая просьба при хорошем расположении; dc 14-16 — секретная информация; dc 18-20 — предательство своих интересов.',
    'Если реплика — обычный разговор без попытки убеждения, persuasionCheck = null.',
    'Когда persuasionCheck не null, поле reply должно содержать нейтральную реакцию (задумался, помедлил), а не финальный ответ.',
    'Отвечай ТОЛЬКО JSON: { "reply": "текст", "attitudeDelta": <число от -3 до 3>, "traitNote": "наблюдение или null", "persuasionCheck": <объект или null> }'
  )

  const systemPrompt = systemParts.join(' ')

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
    const attitudeDelta = Number.isFinite(delta) ? Math.max(-3, Math.min(3, Math.round(delta))) : 0
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
          }
        : null
    return { reply, attitudeDelta, traitNote, persuasionCheck }
  } catch {
    return { reply: raw || 'Hmm...', attitudeDelta: 0, traitNote: null, persuasionCheck: null }
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
