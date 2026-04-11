import OpenAI from 'openai'

// Клиент инициализируется лениво — только при первом запросе.
// Это позволяет серверу стартовать без OPENAI_API_KEY (если AI не нужен).
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

// Дефолтный системный промпт — используется если у НПС нет своего поля personality.
const DEFAULT_PERSONALITY =
  'Ты — безымянный персонаж в фэнтезийном мире. Отвечай кратко, одним-двумя предложениями.'

/**
 * Отправить реплику игрока НПС и получить ответ.
 *
 * @param {object} params
 * @param {string} params.npcName       — Имя НПС (используется в промпте)
 * @param {string} params.personality   — Описание личности НПС (из Token.personality)
 * @param {string} params.playerMessage — Что сказал игрок
 * @returns {Promise<{ reply: string, attitudeChange: string|null }>}
 *   reply — реплика НПС
 *   attitudeChange — 'hostile' | 'friendly' | 'neutral' | null (null = не менять)
 */
export async function askNpc({ npcName, personality, playerMessage }) {
  const client = getClient()

  const systemPrompt = [
    `Ты — ${npcName}, персонаж в фэнтезийной ролевой игре.`,
    personality || DEFAULT_PERSONALITY,
    'Отвечай от первого лица, оставайся в роли. Не упоминай, что ты ИИ.',
    'Ответ — не более двух коротких предложений.',
    'Если действия или слова игрока меняют твоё отношение к нему — укажи это в поле attitudeChange:',
    '"hostile" — враждебность (угроза, оскорбление, обман); "friendly" — симпатия (убедил, помог, подкупил);',
    '"neutral" — вернулся к нейтралитету; null — отношение не изменилось.',
    'Отвечай ТОЛЬКО JSON: { "reply": "текст ответа", "attitudeChange": null | "hostile" | "friendly" | "neutral" }',
  ].join(' ')

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: playerMessage },
    ],
  })

  const raw = response.choices[0]?.message?.content?.trim() ?? '{}'
  try {
    const parsed = JSON.parse(raw)
    const reply =
      typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim() : 'Hmm...'
    const attitudeChange = ['hostile', 'friendly', 'neutral'].includes(parsed.attitudeChange)
      ? parsed.attitudeChange
      : null
    return { reply, attitudeChange }
  } catch {
    return { reply: raw || 'Hmm...', attitudeChange: null }
  }
}
