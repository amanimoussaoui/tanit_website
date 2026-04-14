import { Router } from 'express'
import axios from 'axios'
import { prisma } from '../lib/prisma'
import type { AuthRequest } from '../middleware/auth'
import { authRequired, optionalAuth } from '../middleware/auth'

const router = Router()
const fastapi = () => process.env.FASTAPI_URL || 'http://localhost:8000'

router.post('/score', authRequired, async (req: AuthRequest, res) => {
  try {
    const { data } = await axios.post(`${fastapi()}/score`, req.body, { timeout: 30_000 })
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: 'AI service unavailable', detail: String(e) })
  }
})

router.post('/match', authRequired, async (req: AuthRequest, res) => {
  try {
    const { data } = await axios.post(`${fastapi()}/match`, req.body, { timeout: 30_000 })
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: 'AI service unavailable', detail: String(e) })
  }
})

router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const { data } = await axios.post(`${fastapi()}/chat`, req.body, { timeout: 60_000 })
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: 'AI service unavailable', detail: String(e) })
  }
})

router.get('/suggestions/:userId', authRequired, async (req: AuthRequest, res) => {
  if (req.params.userId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  try {
    const { data } = await axios.get(`${fastapi()}/suggestions/${req.params.userId}`, { timeout: 30_000 })
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: 'AI service unavailable', detail: String(e) })
  }
})

/** Fallback job suggestions from DB when FastAPI is down */
router.get('/suggestions-db/:userId', authRequired, async (req: AuthRequest, res) => {
  if (req.params.userId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  const candidate = await prisma.candidate.findUnique({
    where: { userId: req.userId },
    include: { user: true },
  })
  if (!candidate) {
    res.status(400).json({ error: 'Candidate not found' })
    return
  }

  const jobs = await prisma.job.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { employer: { select: { companyName: true, logoUrl: true } } },
  })

  const skills = new Set(candidate.skills.map((s) => s.toLowerCase()))
  const withMatch = jobs.map((job) => {
    let match = 60
    if (skills.size) {
      const overlap = job.skills.filter((s) => skills.has(s.toLowerCase())).length
      match = Math.min(99, 55 + overlap * 8)
    }
    return { job, matchPercent: match }
  })

  res.json({ suggestions: withMatch })
})

export default router
