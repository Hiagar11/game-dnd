import jwt from 'jsonwebtoken'
import Scenario from '../models/Scenario.js'
import Token from '../models/Token.js'

// ─── Socket.io обработчики событий ───────────────────────────────────────────
// Эта функция принимает io (сервер Socket.io) и навешивает все обработчики.

export function setupSocket(io) {
  // ─── Активные игровые сессии ──────────────────────────────────────────────
  // Map: userId (admin) → { adminSocketId, adminName, campaignId, campaignName, scenarioId, offsetX, offsetY }
  const sessions = new Map()
  // ─── Текущие позиции токенов (только в памяти, без записи в БД) ────────
  // Map: scenarioId → Map<uid, { col, row }>
  // Сбрасывается при закрытии сессии — позиции возвращаются к сохранённым в БД
  const livePositions = new Map()

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
        scenario.placedTokens.push(placed)
        await scenario.save()

        // Добавляем данные токена для зрителей (изображение + имя) чтобы не делать доп. запрос
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
        }

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
    socket.on('game:session:open', ({ campaignId, campaignName, scenarioId }, ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')

      // Сбрасываем предыдущие позиции — новая сессия должна начинать с дефолтных из БД
      livePositions.delete(scenarioId)

      const sessionId = socket.user.id
      sessions.set(sessionId, {
        adminSocketId: socket.id,
        adminName: username,
        campaignId,
        campaignName,
        scenarioId,
        mapCenterX: null,
        mapCenterY: null,
        cursorMapX: null,
        cursorMapY: null,
        cursorIconDataUrl: null,
        heroes: [],
        selectedTokenUid: null,
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
    socket.on('game:session:close', (ack) => {
      if (role !== 'admin') return ackError(ack, 'Недостаточно прав')

      const session = sessions.get(socket.user.id)
      if (session?.scenarioId) livePositions.delete(session.scenarioId)

      sessions.delete(socket.user.id)
      io.emit('sessions:updated', listSessions())
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

    socket.on('disconnect', () => {
      console.log(`[socket] ${username} отключился — ${socket.id}`)
      // Если отключился admin с активной сессией — закрываем её и сбрасываем позиции
      if (role === 'admin' && sessions.has(socket.user.id)) {
        const session = sessions.get(socket.user.id)
        if (session?.scenarioId) livePositions.delete(session.scenarioId)
        sessions.delete(socket.user.id)
        io.emit('sessions:updated', listSessions())
      }
    })
  })
}

// ─── Хелпер: ответ с ошибкой через ack-колбэк ────────────────────────────────
function ackError(ack, message) {
  ack?.({ ok: false, error: message })
}
