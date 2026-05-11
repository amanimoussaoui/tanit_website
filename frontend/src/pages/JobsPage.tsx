import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'
import { PageTransition } from '@/components/PageTransition'
import { apiFetch } from '@/lib/api'
import type { Job } from '@/types/job'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

function aiScore(id: string) {
  return 68 + (id.charCodeAt(2) % 28)
}

const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship']
const experiences = ['Junior', 'Mid', 'Senior', 'Lead']

export function JobsPage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [applyFlash, setApplyFlash] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const applyMut = useMutation({
    mutationFn: (jobId: string) =>
      apiFetch<unknown>('/api/applications', { method: 'POST', body: JSON.stringify({ jobId }) }),
    onSuccess: async () => {
      setApplyFlash({ tone: 'ok', text: 'Candidature envoyée. Le recruteur en est informé par e-mail (si SMTP est configuré).' })
      await qc.invalidateQueries({ queryKey: ['applications'] })
    },
    onError: (e: Error) => setApplyFlash({ tone: 'err', text: e.message }),
  })

  const [params] = useSearchParams()
  const [keyword, setKeyword] = useState(params.get('keyword') ?? '')
  const [location, setLocation] = useState(params.get('location') ?? '')
  const [type, setType] = useState('')
  const [experience, setExperience] = useState('')
  /** Si actif, envoie salaryMin à l’API ; sinon aucun filtre salaire (évite d’exclure les offres sous le seuil par défaut). */
  const [salaryFilterActive, setSalaryFilterActive] = useState(false)
  const [salaryMin, setSalaryMin] = useState(3000)
  const [aiMin, setAiMin] = useState(0)
  const [types, setTypes] = useState<string[]>([])
  const [sort, setSort] = useState<'newest' | 'salary'>('newest')

  const qs = useMemo(() => {
    const q = new URLSearchParams()
    if (keyword) q.set('keyword', keyword)
    if (location) q.set('location', location)
    if (type) q.set('type', type)
    q.set('sort', sort)
    if (salaryFilterActive) q.set('salaryMin', String(salaryMin))
    return q.toString()
  }, [keyword, location, type, sort, salaryMin, salaryFilterActive])

  const q = useQuery({
    queryKey: ['jobs', qs],
    queryFn: () => apiFetch<{ jobs: Job[]; total: number }>(`/api/jobs?${qs}&take=50`),
    staleTime: 0,
  })

  const apiJobs = q.data?.jobs ?? []
  let jobs = [...apiJobs]

  if (experience) {
    jobs = jobs.filter((j) => j.title.toLowerCase().includes(experience.toLowerCase()) || j.description?.toLowerCase().includes(experience.toLowerCase()))
  }
  if (types.length) {
    jobs = jobs.filter((j) => types.some((t) => j.type.toLowerCase() === t.toLowerCase()))
  }
  jobs = jobs.filter((j) => aiScore(j.id) >= aiMin)

  const hiddenBySidebarFilters = apiJobs.length > 0 && jobs.length === 0

  return (
    <PageTransition>
      <section className="border-b border-[var(--border)] bg-[var(--bg)] py-12">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl font-extrabold">Find Your Dream Job</h1>
          <form
            className="mt-6 grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
            onSubmit={(e) => e.preventDefault()}
          >
            <Input placeholder="Keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
            <select
              className="h-11 rounded-full border border-[var(--border)] bg-white px-4 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Job Type</option>
              {jobTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-full border border-[var(--border)] bg-white px-4 text-sm"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            >
              <option value="">Experience</option>
              {experiences.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <Button type="button" variant="yellow" className="rounded-full" onClick={() => q.refetch()}>
              Search
            </Button>
          </form>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <Card className="h-fit">
          <CardContent className="space-y-6 pt-6">
            <div>
              <Label className="mb-2 block">Job Type</Label>
              <div className="space-y-2">
                {jobTypes.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={types.includes(t)}
                      onChange={() =>
                        setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
                      }
                      className="rounded border-[var(--border)]"
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Experience focus</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="radio"
                    name="exp"
                    checked={experience === ''}
                    onChange={() => setExperience('')}
                    className="border-[var(--border)]"
                  />
                  Tous
                </label>
                {experiences.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="exp"
                      checked={experience === t}
                      onChange={() => setExperience(t)}
                      className="border-[var(--border)]"
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={salaryFilterActive}
                  onChange={(e) => setSalaryFilterActive(e.target.checked)}
                  className="rounded border-[var(--border)]"
                />
                Filtrer par salaire min. (TND)
              </label>
              <Slider
                min={1000}
                max={12000}
                step={100}
                value={[salaryMin]}
                onValueChange={(v) => {
                  setSalaryMin(v[0] ?? 3000)
                  setSalaryFilterActive(true)
                }}
                disabled={!salaryFilterActive}
                className={cn(!salaryFilterActive && 'opacity-50')}
              />
              <div className="mt-1 text-xs text-[var(--gray)]">
                {salaryFilterActive ? `${salaryMin.toLocaleString()} TND minimum` : 'Aucun seuil — toutes les offres visibles côté API'}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">AI Score min</Label>
              <Slider min={0} max={100} step={1} value={[aiMin]} onValueChange={(v) => setAiMin(v[0] ?? 0)} />
              <div className="mt-1 text-xs text-[var(--gray)]">{aiMin}</div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full rounded-full"
              onClick={() => {
                setTypes([])
                setExperience('')
                setAiMin(0)
                setSalaryFilterActive(false)
              }}
            >
              Réinitialiser filtres (colonne)
            </Button>
          </CardContent>
        </Card>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-semibold text-[var(--gray)]">
              {jobs.length} results {q.data?.total != null ? `(of ${q.data.total} total)` : ''}
            </p>
            <select
              className="h-10 rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold"
              value={sort}
              onChange={(e) => setSort(e.target.value as 'newest' | 'salary')}
            >
              <option value="newest">Sort: Newest</option>
              <option value="salary">Sort: Salary</option>
            </select>
          </div>

          {applyFlash && (
            <div
              className={cn(
                'mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold',
                applyFlash.tone === 'ok' ? 'border-[var(--mint)] bg-[var(--mint)]/15 text-black' : 'border-red-200 bg-red-50 text-red-800',
              )}
              role="status"
            >
              {applyFlash.text}
            </div>
          )}

          <div className="mt-6 space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className={cn(
                  'flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 transition-all',
                  'hover:border-black hover:shadow-md',
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--bg)] text-lg font-bold">
                      {job.employer.companyName.slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-heading text-lg font-extrabold">{job.title}</div>
                      <div className="text-sm font-semibold text-[var(--mint)]">{job.employer.companyName}</div>
                      <div className="text-xs text-[var(--gray)]">
                        {job.type} · {job.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-bold">
                      {job.salaryMin != null && job.salaryMax != null
                        ? `${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()} TND`
                        : '—'}
                    </span>
                    <span className="rounded-full bg-[var(--mint)] px-3 py-1 text-xs font-bold">AI {aiScore(job.id)}</span>
                    {!user ? (
                      <Button variant="outline" size="sm" className="rounded-full" asChild>
                        <Link to={`/login?next=${encodeURIComponent('/jobs')}`}>Se connecter</Link>
                      </Button>
                    ) : user.role === 'EMPLOYER' ? (
                      <span className="text-xs font-medium text-[var(--gray)]">Compte recruteur</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        type="button"
                        disabled={applyMut.isPending}
                        onClick={() => {
                          setApplyFlash(null)
                          applyMut.mutate(job.id)
                        }}
                      >
                        {applyMut.isPending ? 'Envoi…' : 'Postuler'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {q.isLoading && <p>Loading…</p>}
            {!q.isLoading && jobs.length === 0 && (
              <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/50 p-4 text-sm">
                <p className="text-[var(--gray)]">
                  {hiddenBySidebarFilters
                    ? `${apiJobs.length} offre(s) trouvée(s) par le serveur, mais aucune ne passe les filtres de la colonne de gauche (type, expérience, score IA).`
                    : 'Aucune offre ne correspond aux critères (recherche, lieu, type, salaire).'}
                </p>
                {hiddenBySidebarFilters && (
                  <Button
                    type="button"
                    variant="yellow"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      setTypes([])
                      setExperience('')
                      setAiMin(0)
                      setSalaryFilterActive(false)
                    }}
                  >
                    Effacer les filtres colonne
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
