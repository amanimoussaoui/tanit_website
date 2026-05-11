import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import http from 'http'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { Server } from 'socket.io'

import authRoutes from './routes/auth'
import jobsRoutes from './routes/jobs'
import employersRoutes from './routes/employers'
import applicationsRoutes from './routes/applications'
import cvRoutes from './routes/cv'
import aiRoutes from './routes/ai'
import usersRoutes from './routes/users'
import { mailConfigured } from './lib/mail'

const app = express()
const port = Number(process.env.PORT) || 3001
const uploadDir = process.env.UPLOAD_DIR || './uploads'

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5174'

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

app.use('/uploads', express.static(path.resolve(uploadDir)))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tanit-talent-api' })
})

app.get('/api/health/mail', (_req, res) => {
  res.json({
    configured: mailConfigured(),
    hint: mailConfigured()
      ? 'SMTP variables present — test by accepting a candidature or set SMTP_DEBUG=1 for logs.'
      : 'Set SMTP_HOST, SMTP_USER, SMTP_PASS in backend/.env (see .env.example). Restart the API after changes.',
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/jobs', jobsRoutes)
app.use('/api/employers', employersRoutes)
app.use('/api/applications', applicationsRoutes)
app.use('/api/cv', cvRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/users', usersRoutes)

const server = http.createServer(app)

const io = new Server(server, {
  cors: { origin: frontendOrigin, credentials: true },
})

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string | undefined
  if (userId) {
    socket.join(`user:${userId}`)
  }
  socket.emit('notification', { message: 'Connected to Tanit Talent notifications' })
})

app.set('io', io)

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
  if (mailConfigured()) {
    console.log('[mail] SMTP variables detected — outbound email enabled if credentials are valid.')
  } else {
    console.warn('[mail] SMTP not configured — emails skipped. Add SMTP_HOST, SMTP_USER, SMTP_PASS to backend/.env')
  }
})
