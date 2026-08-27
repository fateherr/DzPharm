'use client'

import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Ban,
  Building2,
  CalendarClock,
  CalendarX2,
  FlaskConical,
  Info,
  Package,
  Pill,
  ShieldPlus,
  Syringe,
  Timer,
  Type,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { fetchDrugDetail } from './api'
import {
  ListeBadge,
  StatusBadge,
  countryCode,
  formatDate,
  formatNumber,
  isLocal,
} from './status-badge'
import { useDzPharm } from './store'

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon?: typeof Pill
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {Icon ? <Icon className="size-3" aria-hidden /> : null}
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold break-words text-foreground">{value || '—'}</p>
    </div>
  )
}

export function DrugSheet() {
  const sheetDrugId = useDzPharm((s) => s.sheetDrugId)
  const closeDrug = useDzPharm((s) => s.closeDrug)
  const openDrug = useDzPharm((s) => s.openDrug)
  const addToBasket = useDzPharm((s) => s.addToBasket)
  const setView = useDzPharm((s) => s.setView)
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['drug', sheetDrugId],
    queryFn: ({ signal }) => fetchDrugDetail(sheetDrugId as number, signal),
    enabled: sheetDrugId !== null,
  })

  const drug = data?.drug
  const equivalents = data?.equivalents ?? []

  function handleAddToBasket() {
    if (!drug) return
    const result = addToBasket({
      id: drug.id,
      brand: drug.brand,
      dci: drug.dci,
      status: drug.status,
    })
    if (result === 'added') {
      toast({
        title: 'Ajouté au contrôle d\u2019interactions',
        description: `${drug.brand} (${drug.dci}) — retrouvez-le dans l\u2019onglet Interactions.`,
      })
      closeDrug()
      setView('interactions')
    } else if (result === 'duplicate') {
      toast({ title: 'Déjà présent', description: 'Ce médicament est déjà dans le panier d\u2019interactions.' })
    } else {
      toast({ title: 'Panier complet', description: 'Le contrôle d\u2019interactions est limité à 10 médicaments.' })
    }
  }

  return (
    <Sheet open={sheetDrugId !== null} onOpenChange={(o) => !o && closeDrug()}>
      <SheetContent
        side="right"
        className="scroll-thin w-full gap-0 overflow-y-auto border-border bg-background p-0 sm:max-w-md md:max-w-lg"
      >
        {isLoading || !drug ? (
          <div className="space-y-4 p-6">
            <SheetTitle className="sr-only">Chargement de la fiche médicament</SheetTitle>
            <SheetDescription className="sr-only">
              Les données du médicament sont en cours de chargement.
            </SheetDescription>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <div className="grid grid-cols-2 gap-3 pt-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <SheetHeader className="space-y-3 border-b border-border/70 bg-card/50 p-5">
              <div>
                <SheetTitle className="text-2xl leading-tight font-bold tracking-tight text-foreground">
                  {drug.brand}
                </SheetTitle>
                <SheetDescription className="mt-1 text-sm font-medium text-muted-foreground">
                  {drug.dci}
                </SheetDescription>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={drug.status} />
                {drug.domains.slice(0, 2).map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    {d}
                  </span>
                ))}
                <ListeBadge liste={drug.liste} />
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
                    isLocal(drug.country)
                      ? 'border-state-safe/30 bg-state-safe/10 text-state-safe'
                      : 'border-chifa/30 bg-chifa/10 text-chifa'
                  )}
                >
                  {isLocal(drug.country) ? 'Produit local' : 'Importé'}
                </span>
              </div>
            </SheetHeader>

            <div className="space-y-6 p-5">
              {/* Alertes statut */}
              {drug.status === 'RETRIE' && (
                <div className="rounded-lg border border-state-danger/40 bg-state-danger/10 p-4" role="alert">
                  <p className="flex items-center gap-2 text-sm font-semibold text-state-danger">
                    <Ban className="size-4" aria-hidden />
                    Médicament retiré du marché
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-foreground/90">
                    {drug.withdrawDate ? (
                      <p>
                        <span className="text-muted-foreground">Date de retrait : </span>
                        {formatDate(drug.withdrawDate)}
                      </p>
                    ) : null}
                    {drug.withdrawReason ? (
                      <p>
                        <span className="text-muted-foreground">Motif : </span>
                        {drug.withdrawReason}
                      </p>
                    ) : null}
                    {!drug.withdrawDate && !drug.withdrawReason ? (
                      <p className="text-muted-foreground">
                        Ce produit figure sur la liste des retraits de la nomenclature.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
              {drug.status === 'NON_RENOUVELE' && (
                <div className="rounded-lg border border-state-warning/40 bg-state-warning/10 p-4" role="alert">
                  <p className="flex items-center gap-2 text-sm font-semibold text-state-warning">
                    <AlertTriangle className="size-4" aria-hidden />
                    Enregistrement non renouvelé
                  </p>
                  <p className="mt-1.5 text-sm text-foreground/90">
                    L&apos;AMM de ce produit n&apos;a pas été renouvelée
                    {drug.regDateFinal ? ` (expiration : ${formatDate(drug.regDateFinal)})` : ''}.
                    Vérifiez son statut commercial avant toute dispensation.
                  </p>
                </div>
              )}

              {/* Métriques */}
              <section aria-label="Caractéristiques du médicament">
                <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Caractéristiques
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <Metric label="N° AMM" value={drug.regNumber} icon={ShieldPlus} />
                  <Metric label="Forme" value={drug.form} icon={Pill} />
                  <Metric label="Dosage" value={drug.dosage} icon={FlaskConical} />
                  <Metric label="Conditionnement" value={drug.packaging} icon={Package} />
                  <Metric label="Laboratoire" value={drug.lab} icon={Building2} />
                  <Metric
                    label="Pays"
                    value={
                      drug.country ? (
                        <span className="flex items-center gap-1.5">
                          {countryCode(drug.country) ? (
                            <span
                              className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground"
                              aria-hidden
                            >
                              {countryCode(drug.country)}
                            </span>
                          ) : null}
                          {drug.country}
                        </span>
                      ) : null
                    }
                  />
                  <Metric label="Type" value={drug.type} icon={Type} />
                  <Metric label="Stabilité" value={drug.stability} icon={Timer} />
                  <Metric
                    label="Tarification P1/P2"
                    value={[drug.p1, drug.p2].filter(Boolean).join(' / ')}
                    icon={Syringe}
                  />
                  <Metric label="Enregistré le" value={formatDate(drug.regDateInitial)} icon={CalendarClock} />
                  <Metric label="Expire le" value={formatDate(drug.regDateFinal)} icon={CalendarX2} />
                </div>
                {drug.obs ? (
                  <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground/90">
                    <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <p>{drug.obs}</p>
                  </div>
                ) : null}
              </section>

              {/* Équivalents */}
              {equivalents.length > 0 && (
                <section aria-label="Équivalents même DCI">
                  <h3 className="mb-3 flex items-center justify-between text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    <span>Équivalents même DCI</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                      {formatNumber(equivalents.length)}
                    </span>
                  </h3>
                  <div className="scroll-thin max-h-72 overflow-y-auto rounded-lg border border-border/70">
                    <table className="w-full text-sm">
                      <tbody>
                        {equivalents.map((eq) => (
                          <tr
                            key={eq.id}
                            className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent"
                            onClick={() => openDrug(eq.id)}
                          >
                            <td className="px-3 py-2.5">
                              <span className="block font-semibold text-foreground">{eq.brand}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {eq.lab}
                                {eq.dosage ? ` · ${eq.dosage}` : ''}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <StatusBadge status={eq.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <Separator />

              <Button
                onClick={handleAddToBasket}
                className="h-11 w-full text-sm font-semibold"
                size="lg"
              >
                <ShieldPlus className="size-4" aria-hidden />
                Ajouter au contrôle d&apos;interactions
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
