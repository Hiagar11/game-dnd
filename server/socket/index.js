import jwt from 'jsonwebtoken'
import Scenario from '../models/Scenario.js'

// ─── Socket.io обработчики событий ───────────────────────────────────────────
// Эта функция принимает io (сервер Socket.io) и навешивает все обработчики.

export function setupSocket(io) {
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
        const { scenarioId, tokenId, uid, col, row, hidden = false } = data

        const scenario = await Scenario.findById(scenarioId)
        if (!scenario) return ackError(ack, 'Сценарий не найден')

        const placed = { uid, tokenId, col, row, hidden }
        scenario.placedTokens.push(placed)
        await scenario.save()

        // Отправляем всем в комнате (включая отправителя)
        io.to(scenarioId).emit('token:placed', placed)
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
          'name imagePath stats'
        )

        if (!scenario) return ackError(ack, 'Сценарий не найден')

        const isAdmin = role === 'admin'
        const placedTokens = isAdmin
          ? scenario.placedTokens
          : scenario.placedTokens.filter((t) => !t.hidden)

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

    socket.on('disconnect', () => {
      console.log(`[socket] ${username} отключился — ${socket.id}`)
    })
  })
}

// ─── Хелпер: ответ с ошибкой через ack-колбэк ────────────────────────────────
function ackError(ack, message) {
  ack?.({ ok: false, error: message })
}
