import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { sendMail } from '../lib/mail'
import type { AuthRequest } from '../middleware/auth'
import { authRequired, requireRole } from '../middleware/auth'

const router = Router()

function appUrl(path: string) {
  const base = (process.env.FRONTEND_ORIGIN || 'http://localhost:5174').replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function mailToJson(r: Awaited<ReturnType<typeof sendMail>>) {
  return {
    sent: r.ok && !r.skipped,
    skipped: r.skipped,
    error: r.err ?? null,
  }
}

router.get('/me', authRequired, requireRole('CANDIDATE', 'ADMIN'), async (req: AuthRequest, res) => {
  const candidate = await prisma.candidate.findUnique({ where: { userId: req.userId! } })
  if (!candidate) {
    res.status(400).json({ error: 'Candidate profile missing' })
    return
  }

  const applications = await prisma.application.findMany({
    where: { candidateId: candidate.id },
    include: {
      job: { include: { employer: { select: { companyName: true, logoUrl: true } } } },
    },
    orderBy: { appliedAt: 'desc' },
  })

  res.json({ applications })
})

router.get('/employer', authRequired, requireRole('EMPLOYER', 'ADMIN'), async (req: AuthRequest, res) => {
  let where:
    | { job: { employerId: string } }
    | undefined

  if (req.userRole === 'ADMIN') {
    where = undefined
  } else {
    const employer = await prisma.employer.findUnique({ where: { userId: req.userId! } })
    if (!employer) {
      res.status(400).json({ error: 'Employer profile missing' })
      return
    }
    where = { job: { employerId: employer.id } }
  }

  const applications = await prisma.application.findMany({
    where,
    include: {
      job: {
        select: {
          id: true,
          title: true,
          employer: { select: { companyName: true } },
        },
      },
      candidate: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { appliedAt: 'desc' },
  })

  res.json({ applications })
})

router.post('/', authRequired, requireRole('CANDIDATE', 'ADMIN'), async (req: AuthRequest, res) => {
  const schema = z.object({ jobId: z.string().min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const candidate = await prisma.candidate.findUnique({
    where: { userId: req.userId! },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!candidate) {
    res.status(400).json({ error: 'Candidate profile missing' })
    return
  }

  const job = await prisma.job.findUnique({
    where: { id: parsed.data.jobId },
    include: {
      employer: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
  })
  if (!job) {
    res.status(404).json({ error: 'Job not found' })
    return
  }

  try {
    const application = await prisma.application.create({
      data: {
        candidateId: candidate.id,
        jobId: job.id,
      },
      include: {
        job: { include: { employer: { include: { user: true } } } },
        candidate: { include: { user: true } },
      },
    })

    const recruiterMail = application.job.employer.user.email
    const candName = application.candidate.user.name
    const candMail = application.candidate.user.email
    const dash = appUrl('/recruiter-dashboard')

    const mailResult = await sendMail({
      to: recruiterMail,
      subject: `[Tanit Talent] Nouvelle candidature — ${job.title}`,
      text: [
        `${candName} (${candMail}) a postulé pour : ${job.title}.`,
        `Entreprise : ${job.employer.companyName}.`,
        '',
        `Statut actuel : en attente de votre décision.`,
        `Tableau recruteur : ${dash}`,
      ].join('\n'),
    })

    res.status(201).json({
      application: {
        id: application.id,
        status: application.status,
        appliedAt: application.appliedAt,
        jobId: application.jobId,
      },
      mail: mailToJson(mailResult),
    })
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    if (code === 'P2002') {
      res.status(409).json({ error: 'Already applied' })
      return
    }
    throw e
  }
})

router.patch(
  '/:applicationId/status',
  authRequired,
  requireRole('EMPLOYER', 'ADMIN'),
  async (req: AuthRequest, res) => {
    const bodyParsed = z.object({ status: z.enum(['ACCEPTED', 'REJECTED']) }).safeParse(req.body)
    if (!bodyParsed.success) {
      res.status(400).json({ error: bodyParsed.error.flatten() })
      return
    }

    async function employerScope(): Promise<'all' | string | null> {
      if (req.userRole === 'ADMIN') return 'all'
      const emp = await prisma.employer.findUnique({
        where: { userId: req.userId! },
        select: { id: true },
      })
      return emp?.id ?? null
    }

    const scope = await employerScope()
    if (scope === null) {
      res.status(400).json({ error: 'Employer profile missing' })
      return
    }

    const applicationId = typeof req.params.applicationId === 'string' ? req.params.applicationId : ''
    if (!applicationId) {
      res.status(400).json({ error: 'Missing application id' })
      return
    }

    const existing = await prisma.application.findFirst({
      where: {
        id: applicationId,
        ...(scope === 'all' ? {} : { job: { employerId: scope } }),
      },
      include: {
        job: { include: { employer: { include: { user: { select: { name: true, email: true } } } } } },
        candidate: { include: { user: { select: { name: true, email: true } } } },
      },
    })

    if (!existing) {
      res.status(404).json({ error: 'Application not found' })
      return
    }

    if (existing.status !== 'PENDING') {
      res.status(409).json({ error: `Application already ${existing.status}` })
      return
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status: bodyParsed.data.status },
      include: {
        job: { include: { employer: { select: { companyName: true } } } },
        candidate: { include: { user: true } },
      },
    })

    const decisionLabel = updated.status === 'ACCEPTED' ? 'acceptée' : 'non retenue'
    const mailResult = await sendMail({
      to: updated.candidate.user.email,
      subject: `[Tanit Talent] Candidature ${decisionLabel} — ${updated.job.title}`,
      text: [
        `Bonjour ${updated.candidate.user.name},`,
        '',
        `Votre candidature pour « ${updated.job.title} » chez « ${updated.job.employer.companyName} » a été ${decisionLabel}.`,
        '',
        `Connectez-vous pour suivre vos candidatures : ${appUrl('/dashboard#candidatures')}`,
      ].join('\n'),
    })

    res.json({
      application: updated,
      mail: mailToJson(mailResult),
    })
  },
)

export default router
