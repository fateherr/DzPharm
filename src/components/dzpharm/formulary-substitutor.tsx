'use client'

import React, { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  Coins,
  Download,
  FileSpreadsheet,
  FileText,
  GitCompareArrows,
  Loader2,
  PackageX,
  Pill,
  Printer,
  RotateCcw,
  Sparkles,
  UploadCloud,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatNumber, formatPrice, StatusBadge } from './status-badge'
import { useDzPharm } from './store'
import { cn } from '@/lib/utils'

interface Substitute {
  id: number
  brand: string
  lab: string
  form: string
  dosage: string
  country: string
  ppa: number | null
  refundable: boolean
  cnasId: string | null
}

interface MatchedDrug {
  id: number
  brand: string
  dci: string
  dosage: string
  form: string
  status: string
  lab: string
  country: string
  ppa: number | null
  refundable: boolean
}

interface FormularyResultItem {
  inputName: string
  stockStatus: string
  found: boolean
  matchedDrug: MatchedDrug | null
  alert: string | null
  substitutes: Substitute[]
}

const PRESET_FORMULARIES = [
  {
    title: 'Ruptures fréquentes en officine',
    content: `Augmentin 1g (rupture)
Daonil 5mg (rupture)
Lovenox 4000 (tension)
Ventoline spray (rupture)
Amoclan 1g (disponible)`,
  },
  {
    title: 'Livret Urgences / Pédiatrie',
    content: `Doliprane sirop 2.4% (disponible)
Celestene gouttes (rupture)
Flagyl sirop (tension)
Augmentin nourrisson (rupture)`,
  },
]

/**
 * F-04 — Livret Thérapeutique d'Officine & Substitutions Intelligentes.
 * Importe un livret ou stock officinal/hospitalier, identifie les tensions et ruptures,
 * et propose des alternatives génériques bioéquivalentes conformes au référentiel MSPRH.
 */
export function FormularySubstitutor() {
  const openDrug = useDzPharm((s) => s.openDrug)
  const { toast } = useToast()
  const [inputText, setInputText] = useState(PRESET_FORMULARIES[0].content)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<FormularyResultItem[] | null>(null)
  const [exporting, setExporting] = useState(false)

  const handleAnalyze = async () => {
    const rawLines = inputText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (rawLines.length === 0) {
      toast({
        title: 'Livret vide',
        description: 'Veuillez saisir ou coller des noms de médicaments.',
        variant: 'destructive',
      })
      return
    }

    const items = rawLines.map((line) => {
      let status: 'disponible' | 'rupture' | 'tension' = 'rupture'
      if (line.includes('(disponible)')) status = 'disponible'
      else if (line.includes('(tension)')) status = 'tension'

      const cleanName = line.replace(/\((disponible|rupture|tension)\)/gi, '').trim()
      return { name: cleanName, stockStatus: status }
    })

    setLoading(true)
    try {
      const res = await fetch('/api/formulary/substitution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })

      if (!res.ok) {
        throw new Error('Erreur de traitement du livret')
      }

      const data = await res.json()
      setResults(data.results || [])
      toast({
        title: 'Analyse terminée',
        description: `${data.results?.length || 0} médicaments analysés contre les 9 555 AMM.`,
      })
    } catch (err) {
      toast({
        title: 'Échec de l\'analyse',
        description: err instanceof Error ? err.message : 'Une erreur est survenue.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExportCsv = () => {
    if (!results || results.length === 0) return
    setExporting(true)
    try {
      const headers = [
        'Produit Demandé',
        'Statut Stock',
        'Statut AMM',
        'DCI',
        'Substitut Recommandé',
        'Labo Substitut',
        'PPA Substitut (DA)',
        'Remboursable Chifa',
      ]

      const rows = results.map((r) => {
        const topSub = r.substitutes[0]
        return [
          r.inputName,
          r.stockStatus,
          r.matchedDrug?.status || 'Non répertorié',
          r.matchedDrug?.dci || '',
          topSub?.brand || 'Aucun substitut actif trouvé',
          topSub?.lab || '',
          topSub?.ppa != null ? topSub.ppa : '',
          topSub?.refundable ? 'Oui' : 'Non',
        ]
      })

      const csvContent =
        '\uFEFF' +
        [headers, ...rows]
          .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
          .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dzpharm-substitutions-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast({ title: 'Export CSV généré avec succès' })
    } catch {
      toast({ title: 'Erreur lors de l\'export', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <FileSpreadsheet className="size-4.5" />
            </span>
            Livret Thérapeutique &amp; Substitutions Intelligentes (F-04)
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Chargez votre livret ou liste de ruptures pour générer des alternatives bioéquivalentes immédiates parmi les 9 555 AMM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {results && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={exporting}
              className="gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Exporter Rapport CSV</span>
            </Button>
          )}
        </div>
      </div>

      {/* Saisie & Préréglages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border shadow-xs lg:col-span-1">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <UploadCloud className="size-4 text-primary" />
              Importation du Livret / Ruptures
            </CardTitle>
            <CardDescription className="text-xs">
              Une ligne par médicament avec statut optionnel (rupture / tension / disponible) :
            </CardDescription>

            {/* Présélections */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {PRESET_FORMULARIES.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(p.content)}
                  className="rounded-full bg-secondary/80 hover:bg-secondary border border-border/60 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors cursor-pointer"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 pt-1 space-y-4">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Augmentin 1g (rupture)&#10;Daonil 5mg (rupture)&#10;Lovenox 4000..."
              rows={10}
              className="text-xs font-mono border-border bg-background/80 leading-relaxed"
            />

            <Button
              onClick={handleAnalyze}
              disabled={loading || !inputText.trim()}
              className="w-full gap-2 font-semibold shadow-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Analyse et recherche des génériques…</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>Analyser le livret &amp; Substituts</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Tableau des Substitutions */}
        <Card className="border-border shadow-xs lg:col-span-2 flex flex-col">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <GitCompareArrows className="size-4 text-primary" />
                Matrice des Substitutions Bioéquivalentes
              </CardTitle>
              {results && (
                <Badge variant="outline" className="text-xs font-semibold">
                  {results.length} produits analysés
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Alternatives bioéquivalentes de même DCI, forme et dosage actuellement actives à la nomenclature.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 pt-1 flex-1">
            {results ? (
              <div className="space-y-4 overflow-y-auto max-h-[560px] scroll-thin pr-1">
                {results.map((res, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/80 bg-background/90 p-4 shadow-2xs space-y-3"
                  >
                    {/* Ligne produit d'origine */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-foreground text-sm">
                          {res.inputName}
                        </span>
                        {res.matchedDrug && (
                          <span className="text-xs text-muted-foreground">
                            ({res.matchedDrug.dci})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {res.stockStatus === 'rupture' ? (
                          <span className="rounded bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            En Rupture
                          </span>
                        ) : res.stockStatus === 'tension' ? (
                          <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            Tension Stock
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            Disponible
                          </span>
                        )}
                        {res.matchedDrug && <StatusBadge status={res.matchedDrug.status} />}
                      </div>
                    </div>

                    {/* Alerte réglementaire si présente */}
                    {res.alert && (
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 p-2 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-medium">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        <span>{res.alert}</span>
                      </div>
                    )}

                    {/* Substituts proposés */}
                    {res.substitutes.length > 0 ? (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="size-3 text-emerald-500" />
                          Substituts génériques actifs recommandés :
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {res.substitutes.map((sub) => (
                            <div
                              key={sub.id}
                              className="rounded-lg border border-border/70 bg-card p-2.5 flex items-center justify-between gap-2 hover:border-primary/40 transition-colors"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-xs text-foreground block truncate">
                                  {sub.brand}
                                </span>
                                <span className="text-[10px] text-muted-foreground block truncate">
                                  {sub.lab} · {sub.country}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {sub.ppa != null ? (
                                  <div className="text-right">
                                    <span className="font-bold text-chifa text-xs block tabular-nums">
                                      {formatPrice(sub.ppa)}
                                    </span>
                                    {sub.refundable && (
                                      <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                                        Chifa
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">Tarif non pub.</span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDrug(sub.id)}
                                  className="size-7 rounded cursor-pointer"
                                  title={`Voir la fiche de ${sub.brand}`}
                                >
                                  <ChevronRight className="size-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        {res.found
                          ? 'Aucun substitut générique actif supplémentaire répertorié pour cette molécule.'
                          : 'Médicament non retrouvé dans la nomenclature officielle.'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-xl">
                <FileSpreadsheet className="size-10 text-muted-foreground/40 mb-3" />
                <p className="text-xs font-semibold text-foreground">
                  Aucun livret analysé
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                  Collez votre liste de médicaments ou choisissez un exemple à gauche, puis cliquez sur &quot;Analyser&quot;.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
