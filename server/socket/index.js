import jwt from 'jsonwebtoken'
import Scenario from '../models/Scenario.js'
import Campaign from '../models/Campaign.js'
import Token from '../models/Token.js'
import {
  askNpc,
  summarizeDialog,
  summarizeEvent,
  rewritePersonalityAsCaptive,
  generateBattleCry,
} from '../ai/npcChat.js'
import {
  getAttitudeThresholds,
  getPersuasionMultiplier,
  ATTITUDE_WEIGHTS,
} from '../ai/dispositionConfig.js'
// eslint-disable-next-line no-unused-vars -- будет использоваться при расчёте торговли
import { getItemPrice, applyAttitudeDiscount } from '../utils/itemPrice.js'

// ─── Socket.io обработчики событий ───────────────────────────────────────────
// Эта функция принимает io (сервер Socket.io) и навешивает все обработчики.

// Активные сессии и функция закрытия — экспортируются для REST-эндпоинта (sendBeacon).
export const activeSessions = new Map()
// Map: scenarioId → Map<uid, { col, row }>
export const activeLivePositions = new Map()

/** Восстанавливает снапшоты и очищает память сессии. Вызывается из сокета и REST. */
export async function forceCloseSession(userId, io) {
  const session = activeSessions.get(userId)
  if (!session) return
  if (session.scenarioId) activeLivePositions.delete(session.scenarioId)
  activeSessions.delete(userId)
  if (io) {
    const sessionList = Array.from(activeSessions.entries()).map(([sid, s]) => ({
      sessionId: sid,
      adminName: s.adminName,
      campaignId: s.campaignId,
      campaignName: s.campaignName,
      scenarioId: s.scenarioId,
    }))
    io.emit('sessions:updated', sessionList)
  }
  if (session.scenarioSnapshots?.size > 0) {
    await Promise.allSettled(
      Array.from(session.scenarioSnapshots.entries()).map(([sid, snap]) =>
        Scenario.findByIdAndUpdate(sid, {
          $set: { placedTokens: snap.placedTokens, revealedCells: snap.revealedCells },
        })
      )
    )
  }
}

export function setupSocket(io) {
  // ─── Активные игровые сессии ──────────────────────────────────────────────
  // Map: userId (admin) → { adminSocketId, adminName, campaignId, campaignName, scenarioId, offsetX, offsetY }
  const sessions = activeSessions
  // ─── Текущие позиции токенов (только в памяти, без записи в БД) ────────
  // Map: scenarioId → Map<uid, { col, row }>
  // Сбрасывается при закрытии сессии — позиции возвращаются к сохранённым в БД
  const livePositions = activeLivePositions

  function applyLivePositions(scenarioId, placedTokens) {
    const live = livePositions.get(String(scenarioId))
    if (!live) return placedTokens
    return placedTokens.map((pt) => {
      const pos = live.get(String(pt.uid))
      return pos ? { ...pt, col: pos.col, row: pos.row } : pt
    })
  }
  function listSessions() {
    return Array.from(sessions.entries()).map(([sessionId, s]) => ({
      sessionId,
      adminName: s.adminName,
      campaignId: s.campaignId,
      campaignName: s.campaignName,
      scenarioId: s.scenarioId,
    }))
  }

  // ─── Глобальная хроника кампании ──────────────────────────────────────────
  // Записывает ключевое событие в хронику кампании (Campaign.globalChronicle).
  // Умные NPC получают эту хронику как «слухи» для обнаружения лжи.
  // Лимит ~2000 символов — старые записи удаляются FIFO.
  const CHRONICLE_MAX = 2000
  async function appendChronicle(campaignId, entry) {
    if (!campaignId || !entry) return
    try {
      const campaign = await Campaign.findById(campaignId)
      if (!campaign) return
      let chronicle = campaign.globalChronicle ?? ''
      chronicle = chronicle ? chronicle + '\n' + entry : entry
      // FIFO: убираем самые старые строки, если превышен лимит
      while (chronicle.length > CHRONICLE_MAX) {
        const idx = chronicle.indexOf('\n')
        if (idx === -1) break
        chronicle = chronicle.slice(idx + 1)
      }
      campaign.globalChronicle = chronicle
      await campaign.save()
    } catch (err) {
      console.error('[appendChronicle] ошибка:', err.message)
    }
  }

  // ─── Закрытие сессии: восстановление снапшотов + очистка памяти ──────────
  // Используется в game:session:close (нормальный выход) и в disconnect (резкое закрытие).
  // fire-and-forget — не ждём завершения, чтобы не блокировать disconnect.
  function closeAdminSession(userId) {
    forceCloseSession(userId, io).catch((err) =>
      console.error('[closeAdminSession] ошибка:', err.message)
    )
  }

  // ─── Middleware: проверка JWT при подключении ─────────────────────────────
  // Клиент должен передавать токен в handshake:
  //   const socket = io('http://localhost:3000', {
  //     auth: { token: localStorage.getItem('jwt') }
  //   })
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) {
      return next(new Error('Необходима авторизация'))
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      // Сохраняем данные пользователя на объекте сокета
      socket.user = { id: payload.id, username: payload.username, role: payload.role }
      next()
    } catch {
      next(new Error('Токен недействителен'))
    }
  })

  io.on('connection', (socket) => {
    const { username, role } = socket.user
    console.log(`[socket] ${username} (${role}) подключился — ${socket.id}`)

    // ─── Вход в комнату сценария ──────────────────────────────────────────
    // Клиент присоединяется к комнате сценария, чтобы получать обновления только для него.
    // Событие: scenario:join { scenarioId }
    socket.on('scenario:join', async ({ scenarioId }) => {
      socket.join(scenarioId)
      console.log(`[socket] ${username} вошёл в сценарий ${scenarioId}`)
    })

    // ─── Размещение токена на карте ───────────────────────────────────────
    // Событие: token:place { scenarioId, tokenId, uid, col, row, hidden }
    // Только admin может размещать токены.
    socket.on('token:place', async (data, ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')

      try {
        const { scenarioId, tokenId, uid, col, row, hidden = false, systemToken = null } = data

        const scenario = await Scenario.findById(scenarioId)
        if (!scenario) return ackError(ack, 'Сценарий не найден')

        const placed = { uid, tokenId: tokenId ?? null, systemToken, col, row, hidden }
        // tokenType кешируется в схеме для надёжной загрузки без populate
        let tokenName = null
        let tokenImagePath = null
        let tokenAttitude = 'neutral'
        let tokenType = 'npc'
        if (tokenId) {
          const tokenDoc = await Token.findById(tokenId)
            .select('name imagePath attitude tokenType')
            .lean()
          tokenName = tokenDoc?.name ?? null
          tokenImagePath = tokenDoc?.imagePath ?? null
          tokenAttitude = tokenDoc?.attitude ?? 'neutral'
          tokenType = tokenDoc?.tokenType ?? 'npc'
          placed.tokenType = tokenType
        }
        scenario.placedTokens.push(placed)
        await scenario.save()

        io.to(scenarioId).emit('token:placed', {
          uid,
          col,
          row,
          hidden,
          tokenId: tokenId ?? null,
          systemToken,
          tokenName,
          tokenImagePath,
          attitude: tokenAttitude,
          tokenType,
        })
        ack?.({ ok: true })
      } catch {
        ackError(ack, 'Ошибка сервера')
      }
    })

    // ─── Перемещение токена ───────────────────────────────────────────────
    // Событие: token:move { scenarioId, uid, col, row }
    socket.on('token:move', async (data, ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')

      try {
        const { scenarioId, uid, col, row } = data

        const scenario = await Scenario.findById(scenarioId)
        if (!scenario) return ackError(ack, 'Сценарий не найден')

        const pt = scenario.placedTokens.find((t) => t.uid === uid)
        if (!pt) return ackError(ack, 'Токен не найден в сценарии')

        pt.col = col
        pt.row = row
        await scenario.save()

        io.to(scenarioId).emit('token:moved', { uid, col, row })
        ack?.({ ok: true })
      } catch {
        ackError(ack, 'Ошибка сервера')
      }
    })

    // ─── Удаление токена с карты ──────────────────────────────────────────
    // Событие: token:remove { scenarioId, uid }
    socket.on('token:remove', async (data, ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')

      try {
        const { scenarioId, uid } = data

        await Scenario.findByIdAndUpdate(scenarioId, {
          $pull: { placedTokens: { uid } },
        })

        io.to(scenarioId).emit('token:removed', { uid })
        ack?.({ ok: true })
      } catch {
        ackError(ack, 'Ошибка сервера')
      }
    })

    // ─── Переключение видимости токена ────────────────────────────────────
    // Событие: token:setHidden { scenarioId, uid, hidden }
    // Когда DM "открывает" токен — игроки его видят.
    socket.on('token:setHidden', async (data, ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')

      try {
        const { scenarioId, uid, hidden } = data

        const scenario = await Scenario.findById(scenarioId)
        if (!scenario) return ackError(ack, 'Сценарий не найден')

        const pt = scenario.placedTokens.find((t) => t.uid === uid)
        if (!pt) return ackError(ack, 'Токен не найден')

        pt.hidden = Boolean(hidden)
        await scenario.save()

        // admin видит всё, players — только если не hidden
        io.to(scenarioId).emit('token:hiddenChanged', { uid, hidden: pt.hidden })
        ack?.({ ok: true })
      } catch {
        ackError(ack, 'Ошибка сервера')
      }
    })

    // ─── Туман войны: открыть клетки ─────────────────────────────────────
    // Событие: fog:reveal { scenarioId, cells: [{col, row}] }
    socket.on('fog:reveal', async (data, ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')

      try {
        const { scenarioId, cells } = data

        // $addToSet не работает с массивом объектов — используем findById + save
        const scenario = await Scenario.findById(scenarioId)
        if (!scenario) return ackError(ack, 'Сценарий не найден')

        for (const cell of cells) {
          const exists = scenario.revealedCells.some(
            (c) => c.col === cell.col && c.row === cell.row
          )
          if (!exists) scenario.revealedCells.push(cell)
        }
        await scenario.save()

        io.to(scenarioId).emit('fog:revealed', { cells })
        ack?.({ ok: true })
      } catch {
        ackError(ack, 'Ошибка сервера')
      }
    })

    // ─── Туман войны: сброс (закрыть все клетки) ──────────────────────────
    // Событие: fog:reset { scenarioId }
    socket.on('fog:reset', async (data, ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')

      try {
        const { scenarioId } = data
        await Scenario.findByIdAndUpdate(scenarioId, { $set: { revealedCells: [] } })
        io.to(scenarioId).emit('fog:reset')
        ack?.({ ok: true })
      } catch {
        ackError(ack, 'Ошибка сервера')
      }
    })

    // ─── Редактирование полей размещённого токена ────────────────────────────
    // Событие: token:edit { scenarioId, uid, fields: { name, attitude, hp, … } }
    // Персистирует переименование / смену характеристик в БД чтобы они пережили сохранение.
    socket.on('token:edit', async ({ scenarioId, uid, fields }, ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')
      try {
        const ALLOWED = [
          'name',
          'attitude',
          'hp',
          'maxHp',
          'npcName',
          'personality',
          'contextNotes',
          'secretKnowledge',
          'dispositionType',
          'strength',
          'agility',
          'intellect',
          'charisma',
          'inventory',
          'xp',
          'level',
          'statPoints',
          'autoLevel',
          'race',
          'heroClass',
          'armed',
          'stunned',
          'captured',
          'combatLog',
          'items',
          'opened',
          'locked',
        ]
        // contextNotes живёт только в placedTokens (сессионная память) —
        // в defaultPlacedTokens не пишем, чтобы сброс к эталону её стирал.
        const SKIP_IN_DEFAULT = new Set(['contextNotes'])
        const ptUpdate = {}
        const defUpdate = {}
        for (const key of ALLOWED) {
          if (Object.prototype.hasOwnProperty.call(fields, key)) {
            ptUpdate[`placedTokens.$[pt].${key}`] = fields[key] ?? null
            if (!SKIP_IN_DEFAULT.has(key)) {
              defUpdate[`defaultPlacedTokens.$[def].${key}`] = fields[key] ?? null
            }
          }
        }
        if (Object.keys(ptUpdate).length === 0) {
          ack?.({ ok: true })
          return
        }
        await Scenario.findOneAndUpdate(
          { _id: scenarioId, 'placedTokens.uid': uid },
          { $set: { ...ptUpdate, ...defUpdate } },
          { arrayFilters: [{ 'pt.uid': uid }, { 'def.uid': uid }] }
        )
        ack?.({ ok: true })
      } catch {
        ackError(ack, 'Ошибка сервера')
      }
    })

    // ─── Сохранение всех placed-токенов перед сохранением сессии ────────
    // Событие: scenario:persist-tokens { scenarioId, tokens: [ { uid, fields } ] }
    // Клиент отправляет текущие поля всех размещённых токенов;
    // сервер обновляет placedTokens + defaultPlacedTokens в Scenario.
    // Вызывается ДО POST /api/game-sessions, чтобы снапшот содержал актуальные данные.
    socket.on('scenario:persist-tokens', async ({ scenarioId, tokens }, ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')
      try {
        if (!Array.isArray(tokens) || tokens.length === 0) {
          ack?.({ ok: true })
          return
        }
        const scenario = await Scenario.findById(scenarioId)
        if (!scenario) return ackError(ack, 'Сценарий не найден')

        const ALLOWED = [
          'name',
          'attitude',
          'hp',
          'maxHp',
          'npcName',
          'personality',
          'contextNotes',
          'secretKnowledge',
          'dispositionType',
          'strength',
          'agility',
          'intellect',
          'charisma',
          'inventory',
          'xp',
          'level',
          'statPoints',
          'autoLevel',
          'race',
          'heroClass',
          'armed',
          'stunned',
          'captured',
          'combatLog',
          'items',
          'opened',
          'locked',
          'treeActivatedIds',
          'abilities',
          'passiveAbilities',
        ]
        const SKIP_IN_DEFAULT = new Set(['contextNotes'])

        for (const { uid, fields } of tokens) {
          if (!uid || !fields) continue
          const pt = scenario.placedTokens.find((t) => String(t.uid) === String(uid))
          if (!pt) continue
          const def = scenario.defaultPlacedTokens?.find((t) => String(t.uid) === String(uid))
          for (const key of ALLOWED) {
            if (Object.prototype.hasOwnProperty.call(fields, key)) {
              pt[key] = fields[key] ?? null
              if (def && !SKIP_IN_DEFAULT.has(key)) def[key] = fields[key] ?? null
            }
          }
        }
        scenario.markModified('placedTokens')
        if (scenario.defaultPlacedTokens?.length) scenario.markModified('defaultPlacedTokens')
        await scenario.save()

        // Обновляем снапшот сессии, чтобы close без повторного save не откатил
        const session = sessions.get(socket.user.id)
        if (session?.scenarioSnapshots?.has(String(scenarioId))) {
          session.scenarioSnapshots.set(String(scenarioId), {
            placedTokens: JSON.parse(JSON.stringify(scenario.placedTokens)),
            revealedCells: JSON.parse(JSON.stringify(scenario.revealedCells ?? [])),
          })
        }

        ack?.({ ok: true })
      } catch (err) {
        console.error('[scenario:persist-tokens]', err.message)
        ackError(ack, 'Ошибка сервера')
      }
    })

    // ─── Загрузка сценария (синхронизация) ───────────────────────────────
    // Событие: scenario:sync { scenarioId }
    // Отправляем всем в комнате актуальное состояние — используется при подключении нового игрока.
    socket.on('scenario:sync', async (data, ack) => {
      try {
        const scenario = await Scenario.findById(data.scenarioId).populate(
          'placedTokens.tokenId',
          'name imagePath stats attitude tokenType'
        )

        if (!scenario) return ackError(ack, 'Сценарий не найден')

        const isAdmin = role === 'admin'
        const rawTokens = isAdmin
          ? scenario.placedTokens
          : scenario.placedTokens.filter((t) => !t.hidden)
        const placedTokens = applyLivePositions(data.scenarioId, rawTokens)

        ack?.({
          ok: true,
          scenario: {
            id: scenario._id,
            name: scenario.name,
            mapImagePath: scenario.mapImagePath,
            cellSize: scenario.cellSize,
            gridOffsetX: scenario.gridOffsetX ?? 0,
            gridOffsetY: scenario.gridOffsetY ?? 0,
            placedTokens,
            revealedCells: scenario.revealedCells,
          },
        })
      } catch {
        ackError(ack, 'Ошибка сервера')
      }
    })

    // ─── Открытие игровой сессии (admin) ─────────────────────────────────────
    // Событие: game:session:open { campaignId, campaignName, scenarioId }
    // Создаёт публичную сессию — зрители видят её в лобби.
    // При открытии снимается снапшот сценария, чтобы восстановить его при выходе без сохранения.
    socket.on('game:session:open', async ({ campaignId, campaignName, scenarioId }, ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')

      // Сбрасываем предыдущие позиции — новая сессия должна начинать с дефолтных из БД
      livePositions.delete(scenarioId)

      const sessionId = socket.user.id

      // Снимаем снапшот сценария ДО начала игры.
      // Если выйти без сохранения — сценарий будет восстановлен из этого снапшота.
      // scenarioSnapshots: Map<scenarioId, { placedTokens, revealedCells }>
      const scenarioSnapshots = new Map()
      try {
        const scenario = await Scenario.findById(scenarioId).lean()
        if (scenario) {
          scenarioSnapshots.set(String(scenarioId), {
            placedTokens: JSON.parse(JSON.stringify(scenario.placedTokens ?? [])),
            revealedCells: JSON.parse(JSON.stringify(scenario.revealedCells ?? [])),
          })
        }
      } catch (err) {
        console.error('[game:session:open] не удалось сделать снапшот сценария:', err.message)
      }

      // Диалог и оценки отношения хранятся в памяти до закрытия сессии:
      //   npcScores:       Map<npcUid, number>             — -30..+60
      //   npcCooldowns:    Map<npcUid, number>             — остаток ходов запрета роста
      //   npcHistory:      Map<npcUid, [{role, content}]>  — история GPT
      //   npcMeta:         Map<npcUid, {tokenId, name, attitude}>
      //   npcBehaviorNotes:Map<npcUid, string[]>           — накопленные впечатления (макс. 5 штук)
      //   npcEventLogs:    Map<npcUid, string[]>           — журнал событий (бой, торговля и т.д.)
      sessions.set(sessionId, {
        adminSocketId: socket.id,
        adminName: username,
        campaignId,
        campaignName,
        scenarioId,
        scenarioSnapshots,
        mapCenterX: null,
        mapCenterY: null,
        cursorMapX: null,
        cursorMapY: null,
        cursorIconDataUrl: null,
        heroes: [],
        selectedTokenUid: null,
        npcScores: new Map(),
        npcCooldowns: new Map(),
        npcHistory: new Map(),
        npcMeta: new Map(),
        npcBehaviorNotes: new Map(),
        npcWarnings: new Map(),
        npcEventLogs: new Map(),
        // npcSummarizeAt: Map<npcUid, number> — кол-во реплик истории, уже вошедших в contextNotes.
        // Используется для авто-суммаризации во время сессии (каждые SUMMARIZE_EVERY реплик).
        npcSummarizeAt: new Map(),
      })

      socket.join(`viewer:${sessionId}`)
      io.emit('sessions:updated', listSessions())
      ack?.({ ok: true, sessionId })
    })

    // ─── Смена сценария в рамках сессии (admin, переход через дверь) ─────────
    // Событие: game:scenario:change { scenarioId }
    // Переводит всех зрителей в новую комнату сценария.
    socket.on('game:scenario:change', async ({ scenarioId }, ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')

      const sessionId = socket.user.id
      const session = sessions.get(sessionId)
      if (!session) return ackError(ack, 'Нет активной сессии')

      const oldScenarioId = session.scenarioId
      session.scenarioId = scenarioId
      session.mapCenterX = null
      session.mapCenterY = null

      // Сбрасываем позиции нового сценария
      livePositions.delete(scenarioId)

      // Снимаем снапшот нового сценария, если ещё не снят (первый визит)
      if (session.scenarioSnapshots && !session.scenarioSnapshots.has(String(scenarioId))) {
        try {
          const scenario = await Scenario.findById(scenarioId).lean()
          if (scenario) {
            session.scenarioSnapshots.set(String(scenarioId), {
              placedTokens: JSON.parse(JSON.stringify(scenario.placedTokens ?? [])),
              revealedCells: JSON.parse(JSON.stringify(scenario.revealedCells ?? [])),
            })
          }
        } catch (err) {
          console.error('[game:scenario:change] не удалось сделать снапшот:', err.message)
        }
      }

      // Переводим зрителей в комнату нового сценария
      const viewerRoom = `viewer:${sessionId}`
      const viewerSockets = await io.in(viewerRoom).fetchSockets()
      for (const s of viewerSockets) {
        if (s.id !== socket.id) {
          s.leave(oldScenarioId)
          s.join(scenarioId)
        }
      }

      io.to(viewerRoom).emit('game:scenario:changed', { scenarioId })
      ack?.({ ok: true })
    })

    // ─── Позиция курсора мастера (admin) ────────────────────────────────────
    // Событие: game:cursor { x, y }  (x, y — доли экрана 0..1, или -1 = вне окна)
    // Fire-and-forget: транслируем всем зрителям без сохранения в БД.
    socket.on('game:cursor', ({ mapX, mapY }) => {
      if (role !== 'admin') return
      const sessionId = socket.user.id
      const session = sessions.get(sessionId)
      if (!session) return
      session.cursorMapX = mapX ?? null
      session.cursorMapY = mapY ?? null
      socket.to(`viewer:${sessionId}`).emit('game:cursor', { mapX, mapY })
    })

    // ─── Иконка курсора мастера (admin) ──────────────────────────────────────
    // Событие: game:cursor:icon { iconDataUrl }  (base64 Data URL или null = сброс)
    // Хранится в памяти сессии, передаётся новым зрителям при входе.
    // Лимит: 256 КБ — проверяем на клиенте, дублируем на сервере для безопасности.
    socket.on('game:cursor:icon', ({ iconDataUrl }) => {
      if (role !== 'admin') return
      const sessionId = socket.user.id
      const session = sessions.get(sessionId)
      if (!session) return
      if (iconDataUrl && iconDataUrl.length > 256_000) return // защита от слишком больших данных
      session.cursorIconDataUrl = iconDataUrl ?? null
      socket
        .to(`viewer:${sessionId}`)
        .emit('game:cursor:icon', { iconDataUrl: session.cursorIconDataUrl })
    })

    // ─── Список героев сессии (admin) ────────────────────────────────────────────
    // Событие: game:heroes:set { heroes: [{id, name, src, ...stats}] }
    // Мастер обновил список токенов-героев — транслируем зрителям.
    socket.on('game:heroes:set', ({ heroes }) => {
      if (role !== 'admin') return
      const sessionId = socket.user.id
      const session = sessions.get(sessionId)
      if (!session) return
      session.heroes = Array.isArray(heroes) ? heroes : []
      socket.to(`viewer:${sessionId}`).emit('game:heroes:updated', { heroes: session.heroes })
    })
    // ─── Выбор токена мастером (admin) ─────────────────────────────────────────
    // Событие: game:token:select { uid }  (uid = null — снял выделение)
    // Транслируем зрителям чтобы они видели какой токен выбран у мастера.
    socket.on('game:token:select', ({ uid }) => {
      if (role !== 'admin') return
      const sessionId = socket.user.id
      const session = sessions.get(sessionId)
      if (!session) return
      session.selectedTokenUid = uid ?? null
      socket
        .to(`viewer:${sessionId}`)
        .emit('game:token:selected', { uid: session.selectedTokenUid })
    })
    // ─── Синхронизация панорамы (admin) ──────────────────────────────────────
    // Событие: game:pan { mapCenterX, mapCenterY }
    // mapCenter — пиксель карты, видимый в центре экрана мастера.
    // Каждый клиент сам пересчитывает offset = viewW/2 - mapCenterX под свой экран.
    socket.on('game:pan', ({ mapCenterX, mapCenterY }) => {
      if (role !== 'admin') return

      const sessionId = socket.user.id
      const session = sessions.get(sessionId)
      if (!session) return

      session.mapCenterX = mapCenterX
      session.mapCenterY = mapCenterY
      socket.to(`viewer:${sessionId}`).emit('game:panned', { mapCenterX, mapCenterY })
    })

    // ─── Закрытие сессии (admin) ──────────────────────────────────────────────
    // Событие: game:session:close
    // При закрытии восстанавливает ВСЕ посещённые сценарии из снапшотов,
    // снятых в начале сессии. Это гарантирует, что несохранённые изменения
    // не попадут в следующий запуск игры.
    socket.on('game:session:close', async (ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')
      closeAdminSession(socket.user.id)
      ack?.({ ok: true })
    })

    // ─── Список активных сессий ───────────────────────────────────────────────
    // Событие: game:sessions:list (ack) → [{ sessionId, adminName, campaignName, ... }]
    socket.on('game:sessions:list', (ack) => {
      ack?.({ ok: true, sessions: listSessions() })
    })

    // ─── Вход зрителя в сессию ────────────────────────────────────────────────
    // Событие: game:session:join { sessionId }
    // Возвращает снапшот текущего состояния игры.
    socket.on('game:session:join', async ({ sessionId }, ack) => {
      const session = sessions.get(sessionId)
      if (!session) return ackError(ack, 'Сессия не найдена или уже завершена')

      socket.join(`viewer:${sessionId}`)
      socket.join(session.scenarioId)

      try {
        const scenario = await Scenario.findById(session.scenarioId).populate(
          'placedTokens.tokenId',
          'name imagePath stats attitude tokenType'
        )
        if (!scenario) return ackError(ack, 'Сценарий не найден')

        // Игроки видят только не скрытые токены + применяем текущие позиции
        const rawTokens = scenario.placedTokens.filter((t) => !t.hidden)
        const placedTokens = applyLivePositions(session.scenarioId, rawTokens)

        ack?.({
          ok: true,
          session: {
            sessionId,
            campaignId: session.campaignId,
            campaignName: session.campaignName,
            scenarioId: session.scenarioId,
            mapCenterX: session.mapCenterX ?? null,
            mapCenterY: session.mapCenterY ?? null,
            cursorMapX: session.cursorMapX ?? null,
            cursorMapY: session.cursorMapY ?? null,
            cursorIconDataUrl: session.cursorIconDataUrl ?? null,
            heroes: session.heroes ?? [],
            selectedTokenUid: session.selectedTokenUid ?? null,
          },
          scenario: {
            id: String(scenario._id),
            mapImagePath: scenario.mapImagePath,
            cellSize: scenario.cellSize ?? 60,
            placedTokens,
            revealedCells: scenario.revealedCells,
          },
        })
      } catch {
        ackError(ack, 'Ошибка сервера')
      }
    })

    // ─── Диалог с НПС через ИИ ────────────────────────────────────────────────
    // Событие: npc:talk { npcUid, tokenId, scenarioId, placedAttitude, placedName, playerMessage, heroPersuasion }
    // Сервер запрашивает OpenAI, накапливает счёт отношения и бродкастит token:attitude при смене.
    // Если ИИ определяет попытку убеждения — бросает d20 + heroPersuasion vs DC.
    socket.on(
      'npc:talk',
      async ({
        npcUid,
        tokenId,
        scenarioId,
        placedAttitude,
        placedName,
        playerMessage,
        heroPersuasion,
        heroDeception,
        heroLuck,
        npcItems,
        mapContext,
        combatLog,
        captured,
      }) => {
        try {
          const tokenDoc = tokenId
            ? await Token.findById(tokenId)
                .select(
                  'name npcName personality contextNotes secretKnowledge dispositionType intellect'
                )
                .lean()
            : null

          // Поля personality/contextNotes/secretKnowledge могут быть переопределены
          // в placedToken (сценарий), если пользователь отредактировал размещённый токен.
          // placedToken-значения имеют приоритет над шаблоном.
          // Загружаем сценарий один раз — для overrides и locationDescription.
          const scenarioDoc = scenarioId
            ? await Scenario.findById(scenarioId).select('locationDescription placedTokens').lean()
            : null
          const placedOverrides = scenarioDoc?.placedTokens?.find((pt) => pt.uid === npcUid) ?? {}

          const npcName =
            placedOverrides.npcName?.trim() ||
            tokenDoc?.npcName?.trim() ||
            tokenDoc?.name ||
            placedName ||
            'Незнакомец'
          const personality = placedOverrides.personality ?? tokenDoc?.personality ?? ''
          const contextNotes = placedOverrides.contextNotes ?? tokenDoc?.contextNotes ?? ''
          const secretKnowledge = placedOverrides.secretKnowledge ?? tokenDoc?.secretKnowledge ?? ''
          const dispositionType =
            placedOverrides.dispositionType ?? tokenDoc?.dispositionType ?? 'neutral'
          // Проницательность NPC для механики обмана (из placed-токена или шаблона)
          const npcIntellect = placedOverrides.intellect ?? tokenDoc?.intellect ?? 0
          const thresholds = getAttitudeThresholds(dispositionType)
          const persuasionMult = getPersuasionMultiplier(
            Number.isFinite(heroPersuasion) ? heroPersuasion : 0
          )
          const message =
            typeof playerMessage === 'string' ? playerMessage.slice(0, 200) : 'Привет!'

          const locationDescription = scenarioDoc?.locationDescription ?? ''

          // Состояние сессии для этого НПС
          const adminId = socket.user.id
          const session = sessions.get(adminId)
          const scores = session?.npcScores
          const cooldowns = session?.npcCooldowns
          const histories = session?.npcHistory
          const metaMap = session?.npcMeta
          const behaviorNotesMap = session?.npcBehaviorNotes
          const warningsMap = session?.npcWarnings

          // ── Восстановление персистентных данных диалога из БД ──────────────
          if (!scores.has(npcUid)) {
            // attitudeScore из БД (пережил прошлую сессию), иначе — по disposition
            const persistedScore = placedOverrides.attitudeScore
            const initScore = Number.isFinite(persistedScore)
              ? persistedScore
              : placedAttitude === 'friendly'
                ? 30
                : placedAttitude === 'hostile'
                  ? -20
                  : 0
            scores.set(npcUid, initScore)
          }
          if (!cooldowns.has(npcUid)) cooldowns.set(npcUid, 0)
          if (!histories.has(npcUid)) {
            // Восстанавливаем историю диалога из БД (последние 10 реплик)
            const persisted = placedOverrides.dialogHistory
            const restored = Array.isArray(persisted) ? [...persisted] : []
            histories.set(npcUid, restored)
          }
          if (!behaviorNotesMap.has(npcUid)) {
            const persisted = placedOverrides.behaviorNotes
            behaviorNotesMap.set(npcUid, Array.isArray(persisted) ? [...persisted] : [])
          }
          const eventLogsMap = session?.npcEventLogs
          if (!eventLogsMap.has(npcUid)) {
            const persisted = placedOverrides.eventLog
            eventLogsMap.set(npcUid, Array.isArray(persisted) ? [...persisted] : [])
          }
          // npcSummarizeAt: инициализируем указателем на конец уже существующей истории —
          // это предотвращает повторную суммаризацию реплик, восстановленных из БД.
          const summarizeAtMap = session?.npcSummarizeAt
          if (summarizeAtMap && !summarizeAtMap.has(npcUid)) {
            const restoredLen = histories.get(npcUid)?.length ?? 0
            summarizeAtMap.set(npcUid, restoredLen)
          }
          if (!metaMap.has(npcUid)) {
            metaMap.set(npcUid, {
              tokenId: tokenId ?? null,
              name: npcName,
              attitude: placedAttitude ?? 'neutral',
            })
          }

          const currentScore = scores.get(npcUid)
          const history = histories.get(npcUid)
          // Флаг первого сообщения — приветствие не меняет отношения
          const isFirstMessage = history.length === 0

          const {
            reply,
            attitudeDelta: rawDelta,
            traitNote,
            persuasionCheck,
            deceptionCheck,
            action: aiAction,
          } = await askNpc({
            npcName,
            personality,
            contextNotes,
            secretKnowledge,
            locationDescription,
            currentScore,
            history,
            playerMessage: message,
            behaviorNotes: behaviorNotesMap.get(npcUid) ?? [],
            npcItems: Array.isArray(npcItems) ? npcItems : [],
            mapContext: typeof mapContext === 'string' ? mapContext : '',
            combatLog: Array.isArray(combatLog) ? combatLog : [],
            captured: !!captured,
            dispositionType,
            threatWarned: warningsMap?.get(npcUid) ?? false,
            eventLog: eventLogsMap.get(npcUid) ?? [],
            npcInsight: Number.isFinite(npcIntellect) ? Math.max(0, npcIntellect) : 0,
            // Глобальная хроника кампании — «слухи» для умных NPC
            globalChronicle: session?.campaignId
              ? ((await Campaign.findById(session.campaignId).select('globalChronicle').lean())
                  ?.globalChronicle ?? '')
              : '',
          })

          // ── Проверка убеждения (d20 + модификатор героя vs DC) ──
          // Пленники подчиняются безоговорочно — бросок не нужен.
          let diceRoll = null
          let finalReply = reply
          let finalAction = aiAction ?? null
          if (persuasionCheck) {
            if (captured) {
              // Пленник: автоуспех без броска
              diceRoll = null
              finalReply = persuasionCheck.successReply || reply
              if (persuasionCheck.action) finalAction = persuasionCheck.action
            } else {
              const mod = Number.isFinite(heroPersuasion) ? Math.max(0, heroPersuasion) : 0
              const luck = Number.isFinite(heroLuck) ? Math.max(0, heroLuck) : 0
              // Бонус удачи — случайное число от 0 до luck (чем выше luck, тем больше шанс)
              const luckBonus = luck > 0 ? Math.floor(Math.random() * (luck + 1)) : 0
              const total = mod + luckBonus
              const success = total >= persuasionCheck.dc
              diceRoll = {
                persuasion: mod,
                luck: luckBonus,
                total,
                dc: persuasionCheck.dc,
                success,
              }
              finalReply = success
                ? persuasionCheck.successReply || reply
                : persuasionCheck.failReply || reply
              // action только при успехе persuasion
              if (success && persuasionCheck.action) {
                finalAction = persuasionCheck.action
              } else if (!success) {
                finalAction = null
              }
            }
          }

          // ── Проверка обмана (heroDeception + luck vs npcInsight) ──
          // AI заподозрил ложь → сервер сравнивает навык обмана героя с проницательностью NPC
          if (deceptionCheck && !persuasionCheck) {
            const mod = Number.isFinite(heroDeception) ? Math.max(0, heroDeception) : 0
            const luck = Number.isFinite(heroLuck) ? Math.max(0, heroLuck) : 0
            const luckBonus = luck > 0 ? Math.floor(Math.random() * (luck + 1)) : 0
            const heroTotal = mod + luckBonus
            const npcCheck = Number.isFinite(npcIntellect) ? Math.max(0, npcIntellect) : 0
            const success = heroTotal >= npcCheck
            diceRoll = {
              type: 'deception',
              deception: mod,
              luck: luckBonus,
              total: heroTotal,
              npcInsight: npcCheck,
              success,
            }
            finalReply = success
              ? deceptionCheck.successReply || reply
              : deceptionCheck.failReply || reply
            if (success && deceptionCheck.action) {
              finalAction = deceptionCheck.action
            } else if (!success) {
              finalAction = null
            }
          }

          history.push({ role: 'user', content: message })
          history.push({ role: 'assistant', content: finalReply })

          // Кулдаун: если положительный рост запрещён, игнорируем delta
          let cd = cooldowns.get(npcUid)
          // Асимметричные веса: негатив ×1.0 (AI даёт финальные очки), позитив ×0.6 × persuasionMult
          let attitudeDelta
          if (rawDelta > 0) {
            attitudeDelta = Math.round(rawDelta * ATTITUDE_WEIGHTS.positive * persuasionMult)
          } else if (rawDelta < 0) {
            attitudeDelta = Math.round(rawDelta * ATTITUDE_WEIGHTS.negative)
          } else {
            attitudeDelta = 0
          }
          // Приветствие не должно менять отношения — только реальный диалог
          if (isFirstMessage) attitudeDelta = 0
          if (attitudeDelta > 0 && cd > 0) {
            attitudeDelta = 0 // запрет роста в течение кулдауна
          }
          // Уменьшаем кулдаун на 1 за каждое сообщение (независимо от знака дельты)
          if (cd > 0) cooldowns.set(npcUid, cd - 1)

          const newScore = Math.max(-30, Math.min(60, currentScore + attitudeDelta))
          scores.set(npcUid, newScore)

          // Пленник, отдавший предмет по принуждению — становится угрюмым.
          // Принудительно опускаем счёт до -12 (≈20% шкалы, близко к враждебному).
          // Применяем только если текущий счёт выше -12: не «награждаем» тех, кто и так был озлоблен.
          if (captured && finalAction?.type === 'giveItem' && newScore > -12) {
            scores.set(npcUid, -12)
          }

          // Читаем актуальный счёт — он мог быть скорректирован выше
          const finalScore = scores.get(npcUid)
          if (traitNote) {
            const notes = behaviorNotesMap.get(npcUid)
            notes.push(traitNote)
            if (notes.length > 5) notes.shift()
          }

          // Запускаем кулдаун 2 сообщения после положительного сдвига (защита от спама комплиментов)
          if (attitudeDelta > 0 && newScore > currentScore && !isFirstMessage) {
            cooldowns.set(npcUid, 2)
          }

          // Пороги: определяются начальным attitude НПС
          const prevAttitude = metaMap.get(npcUid).attitude
          const newAttitude =
            finalScore > thresholds.ally
              ? 'friendly'
              : finalScore < thresholds.enemy
                ? 'hostile'
                : 'neutral'
          metaMap.get(npcUid).attitude = newAttitude

          // ── Предупреждение и инициация боя ──────────────────────────────────
          let warning = false
          let initiateCombat = false

          if (!captured && newAttitude === 'hostile' && prevAttitude !== 'hostile') {
            // NPC перешёл в состояние враждебности → начинаем бой (пленники не нападают)
            initiateCombat = true
          } else if (newAttitude !== 'hostile' && attitudeDelta <= -2) {
            // Счёт приближается к порогу врага — предупреждение
            const distToEnemy = Math.abs(finalScore - thresholds.enemy)
            if (distToEnemy <= 8) {
              warning = true
              warningsMap?.set(npcUid, true)
            }
          }

          if (newAttitude !== prevAttitude && scenarioId) {
            io.to(String(scenarioId)).emit('token:attitude', { uid: npcUid, attitude: newAttitude })
            // Персистим смену отношения в Сценарий, чтобы оно пережило сохранение сессии
            Scenario.findOneAndUpdate(
              { _id: scenarioId, 'placedTokens.uid': npcUid },
              { $set: { 'placedTokens.$.attitude': newAttitude } }
            ).catch(() => {})
          }

          socket.emit('npc:reply', {
            npcUid,
            text: finalReply,
            attitudeDelta,
            newScore: finalScore,
            newAttitude,
            cooldownLeft: cooldowns.get(npcUid),
            traitNote: traitNote ?? null,
            diceRoll,
            action: finalAction,
            warning,
            initiateCombat,
          })

          // ── Персистим историю диалога, впечатления и счёт в БД ──────────────
          // Сохраняем последние 10 реплик (5 пар user/assistant), чтобы не раздувать документ
          if (scenarioId) {
            const trimmedHistory = history.slice(-10)
            const trimmedNotes = (behaviorNotesMap.get(npcUid) ?? []).slice(-5)
            Scenario.findOneAndUpdate(
              { _id: scenarioId, 'placedTokens.uid': npcUid },
              {
                $set: {
                  'placedTokens.$.dialogHistory': trimmedHistory,
                  'placedTokens.$.behaviorNotes': trimmedNotes,
                  'placedTokens.$.attitudeScore': newScore,
                },
              }
            ).catch((e) => console.error('[npc:talk] persist dialog error:', e.message))
          }

          // ── Авто-суммаризация памяти каждые SUMMARIZE_EVERY реплик ──────────
          // Срабатывает асинхронно, не блокирует ответ игроку.
          // Новые реплики (с момента последней суммаризации) сжимаются AI в 1-2 предложения
          // и дописываются в contextNotes — НПС «помнит» произошедшее уже в текущей сессии.
          const SUMMARIZE_EVERY = 6 // 3 обмена (user + assistant = 2 реплики × 3)
          if (summarizeAtMap && scenarioId) {
            const prevAt = summarizeAtMap.get(npcUid) ?? 0
            if (history.length - prevAt >= SUMMARIZE_EVERY) {
              const newMessages = history.slice(prevAt)
              summarizeAtMap.set(npcUid, history.length) // обновляем до await чтобы избежать двойного запуска
              ;(async () => {
                try {
                  const summary = await summarizeDialog({
                    npcName,
                    history: newMessages,
                    currentAttitude: newAttitude,
                  })
                  if (!summary) return

                  // Загружаем текущий contextNotes и дописываем
                  const doc = await Scenario.findOne(
                    { _id: scenarioId, 'placedTokens.uid': npcUid },
                    { 'placedTokens.$': 1 }
                  ).lean()
                  const currentNotes = doc?.placedTokens?.[0]?.contextNotes ?? ''
                  const combined = currentNotes ? `${currentNotes}\n${summary}` : summary
                  // Ограничиваем 800 символами, обрезая самое старое
                  const trimmed =
                    combined.length > 800 ? combined.slice(combined.length - 800) : combined

                  await Scenario.findOneAndUpdate(
                    { _id: scenarioId, 'placedTokens.uid': npcUid },
                    { $set: { 'placedTokens.$.contextNotes': trimmed } }
                  )

                  // Уведомляем DM — стор на клиенте обновит contextNotes без перезагрузки
                  socket.emit('npc:memory:updated', { npcUid, contextNotes: trimmed })
                } catch (err) {
                  console.error('[npc:talk] auto-summarize error:', err.message)
                }
              })()
            }
          }
        } catch (err) {
          console.error('[npc:talk] ошибка:', err.message)
          socket.emit('npc:reply', {
            npcUid,
            text: 'Приветствую, путник.',
            attitudeDelta: 0,
            newScore: 0,
            newAttitude: null,
          })
        }
      }
    )

    // ─── Боевой выкрик NPC через AI ─────────────────────────────────────────
    socket.on('npc:battleCry', async ({ npcUid, tokenId, npcName, combatContext }) => {
      try {
        const tokenDoc = tokenId
          ? await Token.findById(tokenId).select('personality npcName name').lean()
          : null
        const name = tokenDoc?.npcName?.trim() || tokenDoc?.name || npcName || 'Противник'
        const personality = tokenDoc?.personality ?? ''
        const cry = await generateBattleCry({
          npcName: name,
          personality,
          combatContext: typeof combatContext === 'string' ? combatContext.slice(0, 300) : '',
        })
        if (cry) {
          socket.emit('npc:battleCryReply', { npcUid, text: cry })
        }
      } catch (err) {
        console.error('[npc:battleCry] ошибка:', err.message)
      }
    })

    // ─── Итог сессии: суммаризация диалогов НПС ──────────────────────────────
    // Событие: npc:session:summary → ack({ ok, npcs: [{npcUid, tokenId, name, attitude, summary, scenarioId}] })
    socket.on('npc:session:summary', async (ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')
      const session = sessions.get(socket.user.id)
      if (!session?.npcMeta?.size) return ack?.({ ok: true, npcs: [] })
      const scenarioId = session.scenarioId

      try {
        const results = await Promise.all(
          Array.from(session.npcMeta.entries()).map(async ([npcUid, meta]) => {
            const history = session.npcHistory.get(npcUid) ?? []
            if (!history.length) return null
            const summary = await summarizeDialog({
              npcName: meta.name,
              history,
              currentAttitude: meta.attitude,
            })
            return {
              npcUid,
              tokenId: meta.tokenId,
              name: meta.name,
              attitude: meta.attitude,
              summary,
              scenarioId,
            }
          })
        )
        ack?.({ ok: true, npcs: results.filter(Boolean) })
      } catch (err) {
        console.error('[npc:session:summary] ошибка:', err.message)
        ack?.({ ok: false, error: err.message })
      }
    })

    // ─── Запись события NPC (торговля, бой, подарок и т.д.) ─────────────────
    // Событие: npc:event { scenarioId, uid, text }
    // Fire-and-forget: пишем в in-memory + сразу в БД (без ожидания ответа)
    socket.on('npc:event', ({ scenarioId, uid, text }) => {
      if (role !== 'admin') return
      if (!scenarioId || !uid || typeof text !== 'string' || !text.trim()) return

      const session = sessions.get(socket.user.id)
      const eventLogsMap = session?.npcEventLogs
      if (eventLogsMap) {
        if (!eventLogsMap.has(uid)) eventLogsMap.set(uid, [])
        const logs = eventLogsMap.get(uid)
        logs.push(text.slice(0, 120))
        if (logs.length > 10) logs.shift()
        Scenario.findOneAndUpdate(
          { _id: scenarioId, 'placedTokens.uid': uid },
          { $set: { 'placedTokens.$.eventLog': logs.slice(-10) } }
        ).catch((e) => console.error('[npc:event] persist error:', e.message))
      }
      // Записываем событие NPC в глобальную хронику кампании
      const npcName = session?.npcMeta?.get(uid)?.name ?? 'NPC'
      appendChronicle(session?.campaignId, `[${npcName}] ${text.slice(0, 120)}`)
    })

    // ─── Список НПС для сохранения памяти при смене карты ───────────────────
    // Событие: npc:map:summary → ack({ ok, npcs })
    // Возвращает только тех NPC, с которыми были диалоги или события в текущей сессии,
    // для отображения в попапе выбора перед переходом на другую карту.
    socket.on('npc:map:summary', async (ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')
      const session = sessions.get(socket.user.id)
      const scenarioId = session?.scenarioId
      if (!session?.npcMeta?.size) return ack?.({ ok: true, npcs: [] })

      try {
        const results = await Promise.all(
          Array.from(session.npcMeta.entries()).map(async ([npcUid, meta]) => {
            const history = session.npcHistory.get(npcUid) ?? []
            const events = session.npcEventLogs?.get(npcUid) ?? []
            if (!history.length && !events.length) return null

            const summary = history.length
              ? await summarizeDialog({
                  npcName: meta.name,
                  history,
                  currentAttitude: meta.attitude,
                })
              : events.join('. ')

            return {
              npcUid,
              tokenId: meta.tokenId,
              name: meta.name,
              attitude: meta.attitude,
              summary,
              scenarioId,
            }
          })
        )
        ack?.({ ok: true, npcs: results.filter(Boolean) })
      } catch (err) {
        console.error('[npc:map:summary] ошибка:', err.message)
        ack?.({ ok: false, error: err.message })
      }
    })

    // ─── Сохранение памяти NPC в placedToken сценария ───────────────────────
    // Событие: npc:save:memory { saves: [{ scenarioId, uid, contextNotes }] }
    // После сохранения — очищает dialogHistory/behaviorNotes/eventLog из placedToken:
    // сырая история больше не нужна, контекст живёт в contextNotes.
    socket.on('npc:save:memory', async ({ saves }, ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')
      if (!Array.isArray(saves)) return ack?.({ ok: true })
      try {
        await Promise.all(
          saves.map(({ scenarioId, uid, contextNotes }) => {
            if (!scenarioId || !uid) return null
            return Scenario.findOneAndUpdate(
              { _id: scenarioId, 'placedTokens.uid': uid },
              {
                $set: { 'placedTokens.$.contextNotes': String(contextNotes ?? '').slice(0, 800) },
                $unset: {
                  'placedTokens.$.dialogHistory': '',
                  'placedTokens.$.behaviorNotes': '',
                  'placedTokens.$.eventLog': '',
                },
              }
            )
          })
        )
        ack?.({ ok: true })
      } catch (err) {
        ackError(ack, err.message)
      }
    })

    // ─── Сохранение заметок НПС (contextNotes) ───────────────────────────────
    // Событие: npc:save:notes { tokenId, contextNotes }
    socket.on('npc:save:notes', async ({ tokenId, contextNotes }, ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')
      if (!tokenId) return ack?.({ ok: true })
      try {
        await Token.findByIdAndUpdate(tokenId, {
          contextNotes: String(contextNotes ?? '').slice(0, 800),
        })
        ack?.({ ok: true })
      } catch (err) {
        ackError(ack, err.message)
      }
    })

    // ─── Захват NPC — AI перезаписывает personality ──────────────────────────
    // Событие: npc:capture { scenarioId, uid, tokenId, npcName, combatLog }
    socket.on('npc:capture', async ({ scenarioId, uid, tokenId, npcName, combatLog }, ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')
      try {
        const tokenDoc = tokenId ? await Token.findById(tokenId).select('personality').lean() : null
        const oldPersonality = tokenDoc?.personality ?? ''

        const newPersonality = await rewritePersonalityAsCaptive({
          npcName: npcName || 'Незнакомец',
          personality: oldPersonality,
          combatLog: Array.isArray(combatLog) ? combatLog : [],
        })

        // Обновляем personality в шаблоне токена (Token)
        if (tokenId) {
          await Token.findByIdAndUpdate(tokenId, { personality: newPersonality })
        }

        // Обновляем personality в placedTokens сценария
        if (scenarioId && uid) {
          await Scenario.findOneAndUpdate(
            { _id: scenarioId, 'placedTokens.uid': uid },
            {
              $set: {
                'placedTokens.$[pt].personality': newPersonality,
                'defaultPlacedTokens.$[def].personality': newPersonality,
              },
            },
            { arrayFilters: [{ 'pt.uid': uid }, { 'def.uid': uid }] }
          )
        }

        ack?.({ ok: true, personality: newPersonality })

        // Записываем захват NPC в глобальную хронику кампании
        const session = sessions.get(socket.user.id)
        appendChronicle(session?.campaignId, `Герои захватили ${npcName || 'NPC'} в плен`)
      } catch (err) {
        ackError(ack, err.message)
      }
    })

    // ── AI-журнал событий на карте ──────────────────────────────────────────
    socket.on('map:journal', async ({ scenarioId, eventText }, ack) => {
      if (!scenarioId || typeof eventText !== 'string' || !eventText.trim()) {
        return ackError(ack, 'Некорректные параметры')
      }
      try {
        const scenario = await Scenario.findById(scenarioId)
        if (!scenario) return ackError(ack, 'Сценарий не найден')

        const updated = await summarizeEvent({
          eventText: eventText.slice(0, 500),
          existingContext: scenario.mapContext ?? '',
        })
        scenario.mapContext = updated
        await scenario.save()
        // Уведомляем всех участников об обновлённом контексте
        io.emit('map:contextUpdated', { scenarioId, mapContext: updated })
        ack?.({ ok: true, mapContext: updated })

        // Записываем ключевое событие карты в глобальную хронику кампании
        const session = sessions.get(socket.user.id)
        appendChronicle(session?.campaignId, eventText.slice(0, 200))
      } catch (err) {
        console.error('[map:journal] ошибка:', err.message)
        ackError(ack, err.message)
      }
    })

    socket.on('disconnect', () => {
      console.log(`[socket] ${username} отключился — ${socket.id}`)
      // Если отключился admin с активной сессией — закрываем её, восстанавливаем снапшоты
      if (role === 'admin' && sessions.has(socket.user.id)) {
        closeAdminSession(socket.user.id)
      }
    })
  })
}

// ─── Хелпер: ответ с ошибкой через ack-колбэк ────────────────────────────────
function ackError(ack, message) {
  ack?.({ ok: false, error: message })
}
