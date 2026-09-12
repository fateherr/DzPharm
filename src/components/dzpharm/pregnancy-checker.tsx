'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Baby,
  Ban,
  BookOpen,
  CircleCheck,
  CircleHelp,
  Loader2,
  Milk,
  Search,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { checkPregnancy } from './api'
import type { PregnancyRisk } from './types'
import { StatusBadge } from './status-badge'

/* ------------------------------------------------------------------ */
/* Niveaux de risque                                                   */
/* ------------------------------------------------------------------ */

const RISK_META: Record<
  PregnancyRisk,
  { label: string; short: string; icon: typeof ShieldCheck; cls: string; chip: string }
> = {
  SURE: {
    label: 'Compatible grossesse',
    short: 'Sûr',
    icon: ShieldCheck,
    cls: 'border-state-safe/40 bg-state-safe/10 text-state-safe',
    chip: 'bg-state-safe/15 text-state-safe border-state-safe/30',
  },
  NEUTRE: {
    label: 'Données insuffisantes',
    short: 'À évaluer',
    icon: CircleHelp,
    cls: 'border-border bg-muted text-muted-foreground',
    chip: 'bg-muted text-muted-foreground border-border',
  },
  PRUDENCE: {
    label: 'Prudence — avis médical',
    short: 'Prudence',
    icon: TriangleAlert,
    cls: 'border-state-warning/40 bg-state-warning/10 text-state-warning',
    chip: 'bg-state-warning/15 text-state-warning border-state-warning/30',
  },
  DECONSEILLE: {
    label: 'Déconseillé pendant la grossesse',
    short: 'Déconseillé',
    icon: TriangleAlert,
    cls: 'border-chifa/40 bg-chifa/10 text-chifa',
    chip: 'bg-chifa/15 text-chifa border-chifa/30',
  },
  CONTRE_INDIQUE: {
    label: 'Contre-indiqué pendant la grossesse',
    short: 'Contre-indiqué',
    icon: Ban,
    cls: 'border-state-danger/40 bg-state-danger/10 text-state-danger',
    chip: 'bg-state-danger/15 text-state-danger border-state-danger/30',
  },
}

const TRIMESTER_LABELS: { key: 't1' | 't2' | 't3'; label: string; range: string }[] = [
  { key: 't1', label: 'T1', range: '1er trimestre' },
  { key: 't2', label: 'T2', range: '2e trimestre' },
  { key: 't3', label: 'T3', range: '3e trimestre' },
]

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

const EXAMPLES = ['DOLIPRANE', 'BRUFEN', 'LOPRIL', 'CURACNE', 'GLUCOPHAGE', 'AUGMENTIN']

export function PregnancyChecker() {
  const [q, setQ] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['pregnancy', submitted],
    queryFn: ({ signal }) => checkPregnancy(submitted, signal),
    enabled: submitted.length >= 2,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const submit = (value: string) => {
    const v = value.trim()
    if (v.length < 2) {
      setError('Saisissez au moins 2 caractères')
      return
    }
    setError(null)
    setSubmitted(v)
  }

  const risk = data?.riskLevel ?? null
  const riskMeta = risk ? RISK_META[risk] : null

  return (
    <div className="space-y-6">
      {/* En-tête pédagogique */}
      <div className="rounded-2xl border border-pink-200/60 bg-gradient-to-br from-pink-50 via-card to-card p-5 dark:border-pink-500/20 dark:from-pink-950/20">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/15 text-pink-600 dark:text-pink-400">
            <Baby className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Grossesse &amp; Allaitement
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Vérifiez la compatibilité d&apos;un médicament avec la grossesse et
              l&apos;allaitement — classification CRAT/ANSM croisée avec les monographies
              des 24 livres techniques.
            </p>
          </div>
        </div>
      </div>

      {/* Recherche */}
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          submit(q)
        }}
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Marque ou DCI (ex. Doliprane, ibuprofène, captopril…)"
            className="h-11 rounded-xl pl-10"
            aria-label="Médicament à vérifier pendant la grossesse"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ShieldCheck className="size-4" aria-hidden />
          )}
          Vérifier
        </button>
      </form>

      {/* Exemples */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Exemples :</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setQ(ex)
              submit(ex)
            }}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              submitted === ex
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
            )}
          >
            {ex}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm font-medium text-state-danger" role="alert">
          {error}
        </p>
      )}

      {/* Résultat */}
      {isLoading && (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && data && !data.found && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <CircleHelp className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-medium text-foreground">{data.message}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Essayez la DCI (nom générique) ou vérifiez l&apos;orthographe de la marque.
          </p>
        </div>
      )}

      {!isLoading && data?.found && data.drug && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          {/* Carte verdict principal */}
          <div
            className={cn(
              'rounded-2xl border-2 p-5',
              riskMeta ? riskMeta.cls : RISK_META.NEUTRE.cls,
              isFetching && 'opacity-60'
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-wide uppercase opacity-70">
                  Médicament vérifié
                </p>
                <h3 className="mt-0.5 text-xl font-bold tracking-tight">
                  {data.drug.brand}
                </h3>
                <p className="mt-0.5 text-sm opacity-80">
                  {data.drug.dci} · {data.drug.form} {data.drug.dosage}
                </p>
              </div>
              {riskMeta && (
                <span className="flex items-center gap-2 rounded-xl border bg-background/60 px-3.5 py-2 text-sm font-semibold">
                  <riskMeta.icon className="size-5" aria-hidden />
                  {riskMeta.label}
                </span>
              )}
            </div>

            {/* Par trimestre si disponible */}
            {data.rule?.trimesters && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {TRIMESTER_LABELS.map((t) => {
                  const level = data.rule?.trimesters?.[t.key] ?? risk
                  const meta = level ? RISK_META[level] : RISK_META.NEUTRE
                  return (
                    <div
                      key={t.key}
                      className="rounded-xl border border-border/50 bg-background/70 p-2.5 text-center"
                      title={t.range}
                    >
                      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {t.label}
                      </p>
                      <p
                        className={cn(
                          'mt-1 flex items-center justify-center gap-1 text-xs font-bold',
                          level === 'CONTRE_INDIQUE' && 'text-state-danger',
                          level === 'DECONSEILLE' && 'text-chifa',
                          level === 'PRUDENCE' && 'text-state-warning',
                          level === 'SURE' && 'text-state-safe',
                          (!level || level === 'NEUTRE') && 'text-muted-foreground'
                        )}
                      >
                        <meta.icon className="size-3.5" aria-hidden />
                        {meta.short}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Allaitement */}
            {data.breastfeedingLevel && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/70 px-3.5 py-2.5">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Milk className="size-4 text-primary" aria-hidden />
                  Allaitement
                </span>
                <span
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold',
                    RISK_META[data.breastfeedingLevel].chip
                  )}
                >
                  {(() => {
                    const BfIcon = RISK_META[data.breastfeedingLevel].icon
                    return <BfIcon className="size-3.5" aria-hidden />
                  })()}
                  {RISK_META[data.breastfeedingLevel].short}
                </span>
              </div>
            )}
          </div>

          {/* Synthèse règle CRAT */}
          {data.rule && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Baby className="size-4 text-pink-500" aria-hidden />
                  Grossesse
                </h4>
                <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">
                  {data.rule.pregnancyNote}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Milk className="size-4 text-primary" aria-hidden />
                  Allaitement
                </h4>
                <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">
                  {data.rule.breastfeedingNote}
                </p>
              </div>
            </div>
          )}

          {/* Alternatives */}
          {data.rule && data.rule.alternatives.length > 0 && (
            <div className="rounded-xl border border-state-safe/30 bg-state-safe/5 p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-state-safe">
                <CircleCheck className="size-4" aria-hidden />
                Alternatives préférentielles
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.rule.alternatives.map((alt) => (
                  <Badge
                    key={alt}
                    variant="outline"
                    className="border-state-safe/40 bg-state-safe/10 text-state-safe"
                  >
                    {alt}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Détail des livres techniques */}
          {data.book && (
            <div className="rounded-xl border border-border/70 bg-card p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <BookOpen className="size-4 text-primary" aria-hidden />
                Référence du livre technique — {data.book.dci}
                <span className="ml-auto text-[10px] font-medium text-muted-foreground">
                  {data.book.domain}
                </span>
              </h4>
              <div className="mt-3 space-y-4">
                {data.book.pregnancyItems.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-bold tracking-wide text-pink-600 uppercase dark:text-pink-400">
                      Grossesse
                    </p>
                    <ul className="space-y-2">
                      {data.book.pregnancyItems.map((it, i) => (
                        <li key={i} className="text-[13px] leading-relaxed text-foreground/90">
                          {it.label && (
                            <span className="mr-1.5 font-semibold text-foreground">
                              {it.label} :
                            </span>
                          )}
                          {it.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.book.breastfeedingItems.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-bold tracking-wide text-primary uppercase">
                      Allaitement
                    </p>
                    <ul className="space-y-2">
                      {data.book.breastfeedingItems.map((it, i) => (
                        <li key={i} className="text-[13px] leading-relaxed text-foreground/90">
                          {it.label && (
                            <span className="mr-1.5 font-semibold text-foreground">
                              {it.label} :
                            </span>
                          )}
                          {it.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.book.detailItems.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                      Précisions
                    </p>
                    <ul className="space-y-2">
                      {data.book.detailItems.map((it, i) => (
                        <li key={i} className="text-[13px] leading-relaxed text-foreground/90">
                          {it.label && (
                            <span className="mr-1.5 font-semibold text-foreground">
                              {it.label} :
                            </span>
                          )}
                          {it.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Métadonnées source */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldAlert className="size-3.5" aria-hidden />
              Sources :
            </span>
            {data.source?.includes('RULE') && (
              <Badge variant="outline" className="text-[10px]">
                Base CRAT locale
              </Badge>
            )}
            {data.source?.includes('BOOK') && (
              <Badge variant="outline" className="text-[10px]">
                Livre technique
              </Badge>
            )}
            {data.drug.activesCount > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {data.drug.activesCount} spécialités actives
              </Badge>
            )}
            <StatusBadge status={data.drug.status} />
          </div>
        </motion.div>
      )}

      {/* Avertissement */}
      <p className="rounded-xl border border-border/60 bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
        Cet outil est une aide à la décision destinée aux professionnels de santé. La
        décision finale relève toujours du prescripteur, au cas par cas. En cas
        d&apos;exposition accidentelle pendant la grossesse, orienter vers un centre de
        pharmacovigilance (CHU) pour évaluation du risque.
      </p>
    </div>
  )
}
