'use client'

import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  GitCompareArrows,
  Info,
  Plus,
  Scale,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { fetchDrugDetail } from './api'
import type { DrugDetail } from './types'
import { ListeBadge, StatusBadge, countryCode, formatDate, isLocal } from './status-badge'
import { SearchAutocomplete } from './search-autocomplete'
import { useDzPharm } from './store'

const MAX_COMPARE = 3

interface CompareItem {
  id: number
  brand: string
  dci: string
}

interface Row {
  key: string
  label: string
  render: (d: DrugDetail) => React.ReactNode
  /** La ligne met en évidence les différences de statut/réglementaire. */
  critical?: boolean
}

const ROWS: Row[] = [
  {
    key: 'status',
    label: 'Statut',
    critical: true,
    render: (d) => <StatusBadge status={d.status} />,
  },
  {
    key: 'dci',
    label: 'DCI',
    render: (d) => <span className="font-medium">{d.dci || '—'}</span>,
  },
  { key: 'form', label: 'Forme', render: (d) => d.form || '—' },
  {
    key: 'dosage',
    label: 'Dosage',
    render: (d) => <span className="font-semibold">{d.dosage || '—'}</span>,
  },
  { key: 'packaging', label: 'Conditionnement', render: (d) => d.packaging || '—' },
  { key: 'lab', label: 'Laboratoire', render: (d) => d.lab || '—' },
  {
    key: 'country',
    label: 'Origine',
    critical: true,
    render: (d) => (
      <span className="flex items-center gap-1.5">
        {countryCode(d.country) ? (
          <span
            className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground"
            aria-hidden
          >
            {countryCode(d.country)}
          </span>
        ) : null}
        {d.country || '—'}
        {d.country ? (
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-semibold',
              isLocal(d.country) ? 'bg-state-safe/10 text-state-safe' : 'bg-chifa/10 text-chifa'
            )}
          >
            {isLocal(d.country) ? 'Local' : 'Importé'}
          </span>
        ) : null}
      </span>
    ),
  },
  {
    key: 'liste',
    label: 'Liste / Tableau',
    critical: true,
    render: (d) => (d.liste ? <ListeBadge liste={d.liste} /> : '—'),
  },
  { key: 'type', label: 'Type', render: (d) => d.type || '—' },
  {
    key: 'reg',
    label: 'N° AMM',
    render: (d) => <span className="font-mono text-xs">{d.regNumber || '—'}</span>,
  },
  {
    key: 'p1p2',
    label: 'Circuit P1/P2',
    render: (d) => [d.p1, d.p2].filter(Boolean).join(' / ') || '—',
  },
  {
    key: 'dateInitial',
    label: 'Enregistré le',
    render: (d) => formatDate(d.regDateInitial) || '—',
  },
  {
    key: 'dateFinal',
    label: 'Validité AMM',
    render: (d) => formatDate(d.regDateFinal) || '—',
  },
  { key: 'stability', label: 'Stabilité', render: (d) => d.stability || '—' },
  {
    key: 'domain',
    label: 'Domaines',
    render: (d) => (d.domains.length > 0 ? d.domains.join(', ') : '—'),
  },
]

export function DrugComparator() {
  const openDrug = useDzPharm((s) => s.openDrug)
  const { toast } = useToast()
  const [items, setItems] = useState<CompareItem[]>([])

  function handleSelect(drug: { id: number; brand: string; dci: string }) {
    if (items.some((i) => i.id === drug.id)) {
      toast({ title: 'Déjà en comparaison', description: `${drug.brand} est déjà sélectionné.` })
      return
    }
    if (items.length >= MAX_COMPARE) {
      toast({
        title: 'Comparateur complet',
        description: `La comparaison est limitée à ${MAX_COMPARE} médicaments.`,
        variant: 'destructive',
      })
      return
    }
    setItems((prev) => [...prev, { id: drug.id, brand: drug.brand, dci: drug.dci }])
  }

  const details = useQueries({
    queries: items.map((item) => ({
      queryKey: ['drug', item.id],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchDrugDetail(item.id, signal),
      staleTime: 5 * 60 * 1000,
    })),
  })

  const drugs = useMemo(
    () => details.map((d) => d.data?.drug).filter((d): d is DrugDetail => Boolean(d)),
    [details]
  )

  const loading = details.some((d) => d.isLoading) && drugs.length < items.length

  const sameDci =
    drugs.length >= 2 && drugs.every((d) => d.dciKey === drugs[0].dciKey) && drugs[0].dciKey

  const sameDosageForm =
    sameDci &&
    drugs.length >= 2 &&
    drugs.every(
      (d) =>
        (d.dosage || '').toLowerCase() === (drugs[0].dosage || '').toLowerCase() &&
        (d.form || '').toLowerCase() === (drugs[0].form || '').toLowerCase()
    )

  const anyWithdrawn = drugs.some((d) => d.status !== 'ACTIF')

  return (
    <div className="space-y-6">
      {/* Sélecteur */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Scale className="size-4 text-primary" aria-hidden />
              Médicaments à comparer
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
              {items.length}/{MAX_COMPARE}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length < MAX_COMPARE ? (
            <SearchAutocomplete
              placeholder="Ajouter un médicament à la comparaison…"
              ariaLabel="Ajouter un médicament au comparateur"
              onSelect={handleSelect}
              rightHint={<Plus className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />}
            />
          ) : null}

          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Sélectionnez 2 à 3 médicaments — idéalement des génériques et leur référent — pour
              comparer leurs caractéristiques réglementaires côte à côte.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <span
                  key={item.id}
                  className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-secondary/60 py-1.5 pr-1.5 pl-3 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => openDrug(item.id)}
                    className="min-w-0 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    title="Ouvrir la fiche du médicament"
                  >
                    <span className="block truncate font-medium text-foreground">{item.brand}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{item.dci}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                    aria-label={`Retirer ${item.brand} de la comparaison`}
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-state-danger/10 hover:text-state-danger focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analyses rapides */}
      {sameDci && drugs.length >= 2 ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-state-safe/40 bg-state-safe/5 p-4">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-state-safe" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold text-foreground">Même DCI — équivalents thérapeutiques</p>
                <p className="mt-0.5 leading-relaxed text-muted-foreground">
                  Ces produits partagent la même substance active ({drugs[0].dci}). La
                  substitution reste à l&apos;appréciation du pharmacien selon le référentiel en
                  vigueur.
                </p>
              </div>
            </div>
            <div
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4',
                sameDosageForm
                  ? 'border-state-safe/40 bg-state-safe/5'
                  : 'border-state-warning/40 bg-state-warning/10'
              )}
            >
              {sameDosageForm ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-state-safe" aria-hidden />
              ) : (
                <Info className="mt-0.5 size-5 shrink-0 text-state-warning" aria-hidden />
              )}
              <div className="text-sm">
                <p className="font-semibold text-foreground">
                  {sameDosageForm ? 'Dosage et forme identiques' : 'Dosage ou forme différents'}
                </p>
                <p className="mt-0.5 leading-relaxed text-muted-foreground">
                  {sameDosageForm
                    ? 'Même galénique et même dosage — substitution directe possible sauf liste restrictive.'
                    : 'Vérifiez l\u2019équivalence posologique avant toute substitution (dosage ou forme différents).'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}

      {anyWithdrawn ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-state-danger/40 bg-state-danger/10 p-4 text-sm"
          role="alert"
        >
          <Info className="mt-0.5 size-5 shrink-0 text-state-danger" aria-hidden />
          <p className="leading-relaxed text-foreground/90">
            Au moins un produit comparé est{' '}
            <strong className="font-semibold text-state-danger">retiré du marché ou non renouvelé</strong>{' '}
            — vérifiez les alternatives actives avant toute dispensation.
          </p>
        </div>
      ) : null}

      {/* Tableau comparatif */}
      {items.length >= 2 ? (
        loading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full rounded-xl" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : drugs.length >= 2 ? (
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <GitCompareArrows className="size-4 text-primary" aria-hidden />
                Comparaison réglementaire
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th scope="col" className="w-44 px-4 py-3 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Caractéristique
                      </th>
                      {items.map((item) => (
                        <th key={item.id} scope="col" className="min-w-40 px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => openDrug(item.id)}
                            className="text-left font-bold text-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            title="Ouvrir la fiche"
                          >
                            {item.brand}
                          </button>
                          <span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground">
                            {item.dci}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((row) => (
                      <tr
                        key={row.key}
                        className={cn(
                          'border-b border-border/50 transition-colors last:border-0 hover:bg-accent/40',
                          row.critical && 'bg-muted/20'
                        )}
                      >
                        <th scope="row" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                          {row.label}
                        </th>
                        {drugs.map((d) => (
                          <td key={d.id} className="px-4 py-3 align-top text-foreground/90">
                            {row.render(d)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null
      ) : (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center">
          <GitCompareArrows className="size-10 text-muted-foreground/40" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-foreground">
            Ajoutez au moins 2 médicaments
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Le tableau compare 15 caractéristiques réglementaires : statut, dosage, forme,
            laboratoire, origine, liste, validité AMM…
          </p>
        </div>
      )}

      {items.length >= 2 ? (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setItems([])}
            className="gap-1.5 text-muted-foreground hover:text-state-danger"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Réinitialiser la comparaison
          </Button>
        </div>
      ) : null}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Comparaison établie à partir de la nomenclature officielle (Juin 2026). La décision de
        substitution relève du pharmacien selon la réglementation en vigueur.
      </p>
    </div>
  )
}
