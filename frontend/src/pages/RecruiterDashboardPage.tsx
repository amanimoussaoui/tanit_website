import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { Job } from '@/types/job'
import { cn } from '@/lib/utils'

type EmployerApplication = {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  appliedAt: string
  job: { id: string; title: string; employer?: { companyName?: string | null } }
  candidate: { user: { name: string; email: string } }
}

type StatusPatchResponse = {
  mail?: { sent: boolean; skipped: boolean; error: string | null }
}

export function RecruiterDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [mailFeedback, setMailFeedback] = useState<{ tone: 'ok' | 'warn' | 'err'; msg: string } | null>(null)

  const jobsQ = useQuery({
    queryKey: ['jobs-mine'],
    queryFn: () => apiFetch<{ jobs: Job[] }>('/api/jobs/mine'),
  })

  const appsQ = useQuery({
    queryKey: ['applications-employer'],
    queryFn: () => apiFetch<{ applications: EmployerApplication[] }>('/api/applications/employer'),
  })

  const mailHealth = useQuery({
    queryKey: ['mail-health'],
    queryFn: () => apiFetch<{ configured: boolean; hint: string }>('/api/health/mail'),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACCEPTED' | 'REJECTED' }) =>
      apiFetch<StatusPatchResponse>(`/api/applications/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ['applications-employer'] })
      void qc.invalidateQueries({ queryKey: ['mail-health'] })
      const m = data.mail
      if (m?.sent) {
        setMailFeedback({ tone: 'ok', msg: 'Décision enregistrée. Un e-mail a été envoyé au candidat.' })
      } else if (m?.skipped) {
        setMailFeedback({
          tone: 'warn',
          msg: 'Décision enregistrée, mais aucun e-mail envoyé : SMTP non configuré dans backend/.env (SMTP_HOST, SMTP_USER, SMTP_PASS). Redémarrez le serveur après modification.',
        })
      } else if (m?.error) {
        setMailFeedback({ tone: 'err', msg: `Décision enregistrée. Échec envoi e-mail : ${m.error}` })
      } else {
        setMailFeedback(null)
      }
    },
    onError: () => {
      setMailFeedback({ tone: 'err', msg: 'Impossible de mettre à jour la candidature.' })
    },
  })

  const jobs = jobsQ.data?.jobs ?? []
  const applications = appsQ.data?.applications ?? []

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
      {mailHealth.data && !mailHealth.data.configured && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>E-mails désactivés.</strong> {mailHealth.data.hint}
        </div>
      )}

      {mailFeedback && (
        <div
          className={cn(
            'mb-4 rounded-2xl border px-4 py-3 text-sm font-medium',
            mailFeedback.tone === 'ok' && 'border-[var(--mint)] bg-[var(--mint)]/15 text-black',
            mailFeedback.tone === 'warn' && 'border-amber-300 bg-amber-50 text-amber-950',
            mailFeedback.tone === 'err' && 'border-red-200 bg-red-50 text-red-900',
          )}
          role="status"
        >
          {mailFeedback.msg}
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold">Recruiter Dashboard</h1>
          <p className="text-sm text-[var(--gray)]">
            Bonjour {user?.name}, gérez vos offres publiées et suivez votre activité.
          </p>
        </div>
        <Button variant="yellow" className="rounded-full" asChild>
          <Link to="/post-job">Publier une offre</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Offres publiées</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="rounded-full bg-[var(--yellow)] px-3 py-1 text-2xl font-extrabold">
              {jobs.length}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidatures reçues</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="rounded-full bg-[var(--mint)] px-3 py-1 text-2xl font-extrabold">{applications.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portail public</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <Link to="/jobs">Voir les offres côté candidat</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Candidatures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {appsQ.isLoading && <p className="text-sm text-[var(--gray)]">Chargement…</p>}
          {!appsQ.isLoading && applications.length === 0 && (
            <p className="text-sm text-[var(--gray)]">Aucune candidature pour le moment.</p>
          )}
          {applications.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-heading font-extrabold">{a.job.title}</div>
                <div className="mt-1 text-xs text-[var(--gray)]">
                  {new Date(a.appliedAt).toLocaleDateString(undefined, {
                    dateStyle: 'medium',
                  })}
                </div>
                <div className="mt-1 text-sm font-semibold text-black">{a.candidate.user.name}</div>
                <div className="text-xs text-[var(--mint)]">{a.candidate.user.email}</div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-bold',
                    a.status === 'PENDING' && 'bg-[var(--yellow)] text-black',
                    a.status === 'ACCEPTED' && 'bg-[var(--mint)] text-black',
                    a.status === 'REJECTED' && 'bg-[var(--border)] text-[var(--gray)]',
                  )}
                >
                  {a.status === 'PENDING' && 'En attente'}
                  {a.status === 'ACCEPTED' && 'Acceptée'}
                  {a.status === 'REJECTED' && 'Refusée'}
                </span>
                {a.status === 'PENDING' && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full border-black"
                      disabled={statusMut.isPending}
                      onClick={() => statusMut.mutate({ id: a.id, status: 'ACCEPTED' })}
                    >
                      Accepter
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-full text-red-700 hover:bg-red-50"
                      disabled={statusMut.isPending}
                      onClick={() => statusMut.mutate({ id: a.id, status: 'REJECTED' })}
                    >
                      Refuser
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Mes offres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {jobsQ.isLoading && <p className="text-sm text-[var(--gray)]">Chargement…</p>}
          {!jobsQ.isLoading && jobs.length === 0 && (
            <p className="text-sm text-[var(--gray)]">Aucune offre publiée pour le moment.</p>
          )}
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-heading font-extrabold">{job.title}</div>
                <div className="text-xs text-[var(--gray)]">
                  {job.type} · {job.location}
                </div>
              </div>
              <div className="text-xs font-semibold text-[var(--gray)]">
                {job.salaryMin != null && job.salaryMax != null
                  ? `${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()} TND`
                  : 'Salaire non précisé'}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
