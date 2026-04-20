import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { connectDB } from './config/db.js'
import { setupSocket } from './socket/index.js'
import authRoutes from './routes/auth.js'
import tokenRoutes from './routes/tokens.js'
import mapRoutes from './routes/maps.js'
import globalMapRoutes from './routes/globalMaps.js'
import scenarioRoutes from './routes/scenarios.js'
import campaignRoutes from './routes/campaigns.js'
import makeGameSessionRoutes from './routes/gameSessions.js'
import aiRoutes from './routes/ai.js'

// Загружаем .env из папки server/ — независимо от того, откуда запущен процесс.
// process.env читается внутри функций (lazy), поэтому вызов здесь успевает до первого обращения.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '.env') })

const app = express()
const httpServer = createServer(app)

// ─── Socket.io ────────────────────────────────────────────────────────────────
// CORS для Socket.io: разрешаем фронт (обычно Vite на :5173) и prod-домен
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
})
setupSocket(io)

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json())

// Статика: раздаём загруженные изображения токенов
// Файл запрашивается как: GET /uploads/tokens/filename.png
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ─── API-роуты ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/tokens', tokenRoutes)
app.use('/api/maps', mapRoutes)
app.use('/api/global-maps', globalMapRoutes)
app.use('/api/scenarios', scenarioRoutes)
app.use('/api/campaigns', campaignRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/game-sessions', makeGameSessionRoutes())

// ─── Healthcheck ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// ─── 404 для неизвестных API-роутов ───────────────────────────────────────────
app.use('/api', (_req, res) => res.status(404).json({ error: 'Не найдено' }))

// ─── Запуск ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3000

connectDB()
  .then(() =>
    httpServer.listen(PORT, () => console.log(`[server] Сервер запущен: http://localhost:${PORT}`))
  )
  .catch((err) => {
    console.error('[server] Не удалось подключиться к MongoDB:', err.message)
    process.exit(1)
  })
