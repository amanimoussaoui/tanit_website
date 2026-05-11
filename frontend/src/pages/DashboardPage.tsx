import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  User,
  FileText,
  Briefcase,
  Send,
  Sparkles,
  Bell,
  Settings,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/PageTransition'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { TanitCvQualityUploader } from '@project/project-.jsx'

type NavItem =
  | {
      key: string
      to: '/dashboard'
      hash: '' | `#${string}`
      label: string
      icon: typeof LayoutDashboard
      badge?: number
    }
  | { key: string; to: '/jobs'; label: string; icon: typeof LayoutDashboard }
  | { key: string; to: '/profile'; label: string; icon: typeof LayoutDashboard }

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const location = useLocation()
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [competences, setCompetences] = useState('')

  type ApplicationRow = {
    id: string
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
    appliedAt: string
    job: { title: string; employer?: { companyName?: string | null } }
  }

  const apps = useQuery({
    queryKey: ['applications'],
    queryFn: () => apiFetch<{ applications: ApplicationRow[] }>('/api/applications/me'),
    enabled: !!user,
  })

  const suggestions = useQuery({
    queryKey: ['ai-suggestions', user?.id],
    queryFn: async () => {
      try {
        return await apiFetch<{ suggestions: { job: unknown; matchPercent: number }[] }>(
          `/api/ai/suggestions-db/${user!.id}`,
        )
      } catch {
        return { suggestions: [] }
      }
    },
    enabled: !!user?.id,
  })

  const profileQ = useQuery({
    queryKey: ['users-me'],
    queryFn: () =>
      apiFetch<{
        user: { nom: string; email: string; role: 'candidat' | 'recruteur' | 'admin' }
        profil: { bio?: string; competences?: string[]; cv_path?: string | null; score?: number | null }
      }>('/api/users/me'),
    enabled: !!user,
  })

  useEffect(() => {
    if (!profileQ.data) return
    setNom(profileQ.data.user.nom ?? '')
    setEmail(profileQ.data.user.email ?? '')
    setBio(profileQ.data.profil?.bio ?? '')
    setCompetences((profileQ.data.profil?.competences ?? []).join(', '))
  }, [profileQ.data])

  const saveProfile = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          nom,
          email,
          profil: {
            bio,
            competences: competences
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          },
        }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users-me'] })
      await qc.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const profileScore = Math.min(100, Math.max(0, Number(profileQ.data?.profil?.score ?? 0)))
  const [gauge, setGauge] = useState(0)
  useEffect(() => {
    const t = window.setTimeout(() => setGauge(profileScore), 200)
    return () => window.clearTimeout(t)
  }, [profileScore])

  const skillBars = (profileQ.data?.profil?.competences ?? []).slice(0, 8).map((name, i, arr) => ({
    name,
    pct: Math.max(48, Math.round(96 - (i * 40) / Math.max(arr.length, 1))),
  }))

  const pendingApplications =
    apps.data?.applications?.filter((a) => a.status === 'PENDING').length ?? 0

  const navItems: NavItem[] = useMemo(
    () => [
      { key: 'overview', to: '/dashboard', hash: '', label: 'Vue d’ensemble', icon: LayoutDashboard },
      { key: 'profil', to: '/dashboard', hash: '#profil', label: 'Mon profil', icon: User },
      { key: 'cv', to: '/dashboard', hash: '#cv', label: 'Mon CV (IA)', icon: FileText },
      { key: 'jobs', to: '/jobs', label: 'Offres d’emploi', icon: Briefcase },
      {
        key: 'applications',
        to: '/dashboard',
        hash: '#candidatures',
        label: 'Mes candidatures',
        icon: Send,
        ...(pendingApplications > 0 ? { badge: pendingApplications } : {}),
      },
      { key: 'suggestions', to: '/dashboard', hash: '#suggestions', label: 'Suggestions IA', icon: Sparkles },
      { key: 'notifications', to: '/dashboard', hash: '#notifications', label: 'Notifications', icon: Bell },
      { key: 'settings', to: '/profile', label: 'Compte', icon: Settings },
    ],
    [pendingApplications],
  )

  const path = location.pathname
  const rawHash = location.hash || ''
  const dashboardHashNorm = rawHash === '' ? '#overview' : rawHash

  function navItemActive(item: NavItem): boolean {
    if (item.to === '/dashboard') {
      if (path !== '/dashboard') return false
      if (item.hash === '') return dashboardHashNorm === '#overview'
      return dashboardHashNorm === item.hash
    }
    return path === item.to
  }

  useEffect(() => {
    if (path !== '/dashboard') return
    const slug = dashboardHashNorm.replace(/^#/, '') || 'overview'
    const el = document.getElementById(`section-${slug}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [path, dashboardHashNorm])

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <PageTransition>
      <div className="flex min-h-[calc(100vh-80px)]">
        <aside className="hidden w-[240px] shrink-0 border-r border-[var(--border)] bg-white md:block">
          <div className="flex flex-col items-center gap-2 border-b border-[var(--border)] p-6">
            <div className="flex size-14 items-center justify-center rounded-full bg-[var(--yellow)] text-lg font-extrabold">
              {initials}
            </div>
            <div className="text-center">
              <div className="font-heading font-extrabold">{user?.name}</div>
              <div className="text-xs text-[var(--gray)]">{user?.role === 'ADMIN' ? 'Administrateur' : 'Candidat'}</div>
            </div>
          </div>
          <nav className="space-y-1 p-3">
            {navItems.map((item) => {
              const href = item.to === '/dashboard' ? `${item.to}${'hash' in item ? item.hash : ''}` : item.to
              const active = navItemActive(item)
              return (
                <Link
                  key={item.key}
                  to={href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                    active ? 'bg-black text-white' : 'text-[var(--gray)] hover:bg-[var(--bg)]',
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {'badge' in item && item.badge != null && (
                    <span className="ml-auto shrink-0 rounded-full bg-[var(--yellow)] px-2 py-0.5 text-[10px] font-bold text-black">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="flex-1 space-y-8 p-4 scroll-mt-28 sm:p-8">
          <section id="section-overview" className="scroll-mt-28">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-extrabold">Welcome back, {user?.name?.split(' ')[0]}</h1>
              <p className="text-sm text-[var(--gray)]">Your AI-powered career cockpit.</p>
            </div>
            <div className="text-right text-sm text-[var(--gray)]">
              <span className="hidden sm:inline">Analyse du CV plus bas sur cette page.</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Applications Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="inline-flex rounded-full bg-[var(--lavender)] px-3 py-1 text-2xl font-extrabold">
                  {apps.data?.applications?.length ?? 0}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Interviews Scheduled</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="inline-flex rounded-full bg-[var(--mint)] px-3 py-1 text-2xl font-extrabold">2</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Compatibility</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="inline-flex rounded-full bg-[var(--yellow)] px-3 py-1 text-2xl font-extrabold">{profileScore}%</span>
              </CardContent>
            </Card>
          </div>
          </section>

          <section id="section-candidatures" className="scroll-mt-28">
          <Card>
            <CardHeader>
              <CardTitle>Mes candidatures</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!apps.data?.applications?.length && (
                <p className="text-sm text-[var(--gray)]">Tu n’as encore postulé à aucune offre. Consulte les offres et envoie une candidature.</p>
              )}
              {apps.data?.applications?.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)]/40 px-4 py-3"
                >
                  <div>
                    <div className="font-heading font-semibold text-black">{a.job.title}</div>
                    <div className="text-xs text-[var(--gray)]">{a.job.employer?.companyName ?? '—'}</div>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-bold',
                      a.status === 'PENDING' && 'bg-[var(--yellow)] text-black',
                      a.status === 'ACCEPTED' && 'bg-[var(--mint)] text-black',
                      a.status === 'REJECTED' && 'bg-[var(--border)] text-[var(--gray)]',
                    )}
                  >
                    {a.status === 'PENDING' && 'En attente'}
                    {a.status === 'ACCEPTED' && 'Acceptée'}
                    {a.status === 'REJECTED' && 'Refusée'}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
          </section>

          <section id="section-profil" className="scroll-mt-28">
          <Card>
            <CardHeader>
              <CardTitle>Mon profil (candidat)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nom</Label>
                  <Input className="mt-1" value={nom} onChange={(e) => setNom(e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea className="mt-1" value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              <div>
                <Label>Compétences (séparées par virgules)</Label>
                <Input
                  className="mt-1"
                  value={competences}
                  onChange={(e) => setCompetences(e.target.value)}
                  placeholder="React, Node.js, PostgreSQL"
                />
              </div>
              {profileQ.data?.profil?.cv_path && (
                <p className="text-xs text-[var(--gray)]">CV uploadé: {profileQ.data.profil.cv_path}</p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  className="rounded-full"
                  onClick={() => saveProfile.mutate()}
                  disabled={saveProfile.isPending || profileQ.isLoading}
                >
                  Modifier mon profil
                </Button>
                {saveProfile.isSuccess && (
                  <span className="text-sm font-medium text-green-700">Profil mis à jour.</span>
                )}
                {saveProfile.isError && (
                  <span className="text-sm font-medium text-red-600">
                    {(saveProfile.error as Error).message}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
          </section>

          <section id="section-cv" className="scroll-mt-28">
          <Card>
            <CardHeader>
              <CardTitle>Analyse IA du CV (qualité du contenu)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {profileScore > 0 && (
                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg)]/40 p-4">
                  <div
                    className="relative flex size-24 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(var(--mint) ${gauge * 3.6}deg, var(--border) 0deg)`,
                    }}
                  >
                    <div className="flex size-[4.5rem] items-center justify-center rounded-full bg-white font-heading text-lg font-extrabold">
                      {gauge}
                    </div>
                  </div>
                  <div className="text-sm text-[var(--gray)]">
                    Score enregistré sur ton profil (dernier PDF analysé via le backend + FastAPI). Envoie un nouveau CV ci-dessous pour
                    rafraîchir cette note et le retour automatique sur la richesse du contenu.
                  </div>
                </div>
              )}

              <TanitCvQualityUploader
                onUploaded={() => {
                  void qc.invalidateQueries({ queryKey: ['users-me'] })
                  void qc.invalidateQueries({ queryKey: ['me'] })
                }}
              />

              {skillBars.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-black">Compétences sur le profil (extrait précédemment)</h3>
                  <div className="space-y-4">
                    {skillBars.map((s) => (
                      <div key={s.name}>
                        <div className="mb-1 flex justify-between text-sm font-semibold">
                          <span>{s.name}</span>
                          <span>{s.pct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
                          <motion.div
                            className="h-full rounded-full bg-[var(--mint)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${s.pct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--gray)]">Charge un CV en PDF pour remplir automatiquement les compétences extraites et le score qualité.</p>
              )}
            </CardContent>
          </Card>
          </section>

          <section id="section-suggestions" className="scroll-mt-28">
          <Card>
            <CardHeader>
              <CardTitle>Suggestions IA (offres)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(suggestions.data?.suggestions as { job?: { title?: string; employer?: { companyName?: string } }; matchPercent?: number }[] | undefined)?.map(
                (row, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white px-4 py-3">
                    <div>
                      <div className="font-heading font-extrabold">{row.job && 'title' in row.job ? row.job.title : 'Matched role'}</div>
                      <div className="text-sm text-[var(--mint)]">{row.job && 'employer' in row.job ? row.job.employer?.companyName : 'Tanit Labs'}</div>
                    </div>
                    <span className="rounded-full bg-[var(--mint)] px-3 py-1 text-xs font-bold">{row.matchPercent ?? 88}% match</span>
                  </div>
                ),
              )}
              {(!suggestions.data?.suggestions || suggestions.data.suggestions.length === 0) && (
                <p className="text-sm text-[var(--gray)]">Upload a CV or browse jobs to populate matches.</p>
              )}
            </CardContent>
          </Card>
          </section>

          <section id="section-notifications" className="scroll-mt-28">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--gray)]">
              {pendingApplications > 0 ? (
                <p>
                  Tu as <strong className="text-black">{pendingApplications}</strong> candidature
                  {pendingApplications > 1 ? 's' : ''} en attente de réponse du recruteur.
                </p>
              ) : (
                <p>Aucune alerte urgente pour l’instant. Les mises à jour sur tes candidatures apparaîtront ici.</p>
              )}
            </CardContent>
          </Card>
          </section>
        </main>
      </div>
    </PageTransition>
  )
}
