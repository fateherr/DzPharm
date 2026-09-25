'use client'

import React, { useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Languages,
  Loader2,
  Pill,
  Printer,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { TAMAZIGHT_LEXICON, translateLineToTamazight } from '@/lib/clinical/tamazight-lexicon'

interface TranslatedLine {
  original: string
  arabicMedName: string
  arabicInstructions: string
  timing: string
  precaution: string
}

interface TranslationResponse {
  success: boolean
  source: string
  fullArabic: string
  fullDarija: string
  lines: TranslatedLine[]
}

const PRESETS = [
  {
    title: 'Infection ORL (Angine)',
    text: `1. Amoxicilline 500 mg : 1 gélule 3 fois par jour après les repas pendant 6 jours.
2. Paracétamol 1 g : 1 comprimé en cas de douleur ou fièvre, espacer d'au moins 6 heures (max 3/jour).
3. Célestène 2 mg : 3 comprimés le matin au petit-déjeuner pendant 3 jours.`,
  },
  {
    title: 'Diabète & Hypertension',
    text: `1. Metformine 850 mg : 1 comprimé 2 fois par jour au milieu des repas (matin et soir).
2. Amlodipine 5 mg : 1 comprimé par jour le matin au réveil.
3. Kardégic 75 mg : 1 sachet par jour au déjeuner dans un verre d'eau.`,
  },
  {
    title: 'Gastro / Reflux gastrique',
    text: `1. Oméprazole 20 mg : 1 gélule le matin à jeun 30 minutes avant le petit-déjeuner pendant 4 semaines.
2. Gaviscon suspension : 1 sachet après les 3 principaux repas et au coucher si brûlures.`,
  },
]

/**
 * F-05 — Traduction d'Ordonnance Médicale FR → Arabe & Darija assistée par IA.
 * Génère des explications posologiques claires, fiables et imprimables pour le patient algérien.
 */
export function PrescriptionTranslator() {
  const { toast } = useToast()
  const [inputText, setInputText] = useState(PRESETS[0].text)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TranslationResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      toast({
        title: 'Ordonnance vide',
        description: 'Veuillez saisir ou coller le texte de l\'ordonnance à traduire.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/ai/translate-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      })

      if (!res.ok) {
        throw new Error('Erreur lors de la traduction')
      }

      const data: TranslationResponse = await res.json()
      setResult(data)
      toast({
        title: 'Traduction terminée',
        description: 'L\'ordonnance a été traduite avec succès en arabe clinique et conseils de comptoir.',
      })
    } catch (err) {
      toast({
        title: 'Échec de traduction',
        description: err instanceof Error ? err.message : 'Une erreur est survenue.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({ title: 'Copié dans le presse-papier' })
    } catch {
      toast({ title: 'Copie impossible', variant: 'destructive' })
    }
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Languages className="size-4.5" />
            </span>
            Traduction d&apos;Ordonnance FR → Arabe &amp; Darija (F-05)
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Traduisez instantanément la posologie et les consignes médicales pour les patients en arabe littéraire et conseils oraux en Darija.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Arabe Médical · Règle R4 conforme
          </span>
        </div>
      </div>

      {/* Zone de saisie et présélections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border shadow-xs">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Ordonnance originale (Français)
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Saisissez les lignes de prescription ou chargez un exemple usuel :
            </CardDescription>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(p.text)}
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
              placeholder="Ex : Amoxicilline 500 mg : 1 gélule 3 fois par jour après les repas..."
              rows={8}
              className="text-xs sm:text-sm font-mono border-border bg-background/80 leading-relaxed"
            />

            <Button
              onClick={handleTranslate}
              disabled={loading || !inputText.trim()}
              className="w-full gap-2 font-semibold shadow-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Traduction clinique en cours…</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>Traduire l&apos;ordonnance en Arabe</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Zone de résultat */}
        <Card className="border-border shadow-xs flex flex-col">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Languages className="size-4 text-emerald-600 dark:text-emerald-400" />
                Traduction &amp; Fiche Posologique Patient
              </CardTitle>
              {result && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(result.fullArabic)}
                    className="h-7 text-xs gap-1 cursor-pointer"
                    title="Copier le texte"
                  >
                    {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                    <span>Copier</span>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handlePrint}
                    className="h-7 text-xs gap-1 cursor-pointer bg-primary"
                    title="Imprimer l'étiquette posologique"
                  >
                    <Printer className="size-3" />
                    <span>Imprimer Étiquette</span>
                  </Button>
                </div>
              )}
            </div>
            <CardDescription className="text-xs">
              Affichage adapté au patient avec typographie Noto Sans Arabic (RTL).
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 pt-1 flex-1 flex flex-col">
            {result ? (
              <Tabs defaultValue="lines" className="flex-1 flex flex-col">
                <TabsList className="grid grid-cols-3 h-8 text-xs mb-3">
                  <TabsTrigger value="lines">Fiche Ligne par Ligne</TabsTrigger>
                  <TabsTrigger value="darija">Conseils Comptoir (الدارجة)</TabsTrigger>
                  <TabsTrigger value="tamazight">ⵜⴰⵎⴰⵣⵉⵖⵜ Tamazight</TabsTrigger>
                </TabsList>

                {/* Vue Ligne par Ligne (Fiche patient) */}
                <TabsContent value="lines" className="space-y-3 flex-1 overflow-y-auto max-h-[420px] scroll-thin pr-1">
                  {result.lines.map((line, idx) => (
                    <div
                      key={idx}
                      dir="rtl"
                      className="rounded-xl border border-border/80 bg-background/90 p-3.5 space-y-2 text-right shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                        <span className="font-bold text-base text-primary">
                          {line.arabicMedName}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground ltr" dir="ltr">
                          Ligne #{idx + 1}
                        </span>
                      </div>

                      <div className="text-xs leading-relaxed text-foreground font-semibold flex items-start gap-1.5">
                        <Pill className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{line.arabicInstructions}</span>
                      </div>

                      {line.timing && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Clock className="size-3 text-primary shrink-0" />
                          <span>التوقيت : {line.timing}</span>
                        </div>
                      )}

                      {line.precaution && (
                        <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-md p-1.5 flex items-start gap-1.5 border border-amber-500/20">
                          <AlertCircle className="size-3 shrink-0 mt-0.5" />
                          <span>نصيحة هامة : {line.precaution}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </TabsContent>

                {/* Vue Conseils en Darija */}
                <TabsContent value="darija" className="flex-1 space-y-3">
                  <div
                    dir="rtl"
                    className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-right space-y-2"
                  >
                    <p className="text-xs font-bold text-primary mb-2">
                      🗣 إرشادات مبسطة بالدارجة الجزائرية للشرح المباشر في الصيدلية :
                    </p>
                    <p className="text-sm leading-relaxed text-foreground font-medium whitespace-pre-line">
                      {result.fullDarija}
                    </p>
                  </div>
                </TabsContent>

                {/* W8-03: Vue Tamazight / Tifinagh — Clinical Terminology Pilot */}
                <TabsContent value="tamazight" className="flex-1 space-y-3 overflow-y-auto max-h-[420px] scroll-thin pr-1">
                  {/* Explanatory header */}
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                      <span className="text-base">ⵣ</span>
                      Terminologie clinique — Tamazight (Kabyle · Chaoui · Mozabite · Touareg)
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Posologie traduite en termes amazighs courants avec transcription Tifinagh et phonétique latine.
                      Destinée aux patients amazighophones de régions rurales (Kabylie, Aurès, Mzab, Hoggar).
                    </p>
                  </div>

                  {/* Per-line Tamazight translation */}
                  {result.lines.map((line, idx) => {
                    const tamazightLine = translateLineToTamazight(line)
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-border/80 bg-background/90 p-3.5 space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                          <span className="font-bold text-sm text-primary" dir="ltr">
                            {line.original.split(/[:\-]/)[0]?.trim() || line.original}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            Ligne #{idx + 1}
                          </span>
                        </div>

                        {/* Tifinagh script */}
                        <div className="flex items-start gap-2">
                          <span className="text-base text-emerald-600 dark:text-emerald-400 font-bold shrink-0">ⵜ</span>
                          <p className="text-sm font-semibold text-foreground leading-relaxed">
                            {tamazightLine.tifinagh}
                          </p>
                        </div>

                        {/* Latin transcription */}
                        <div className="flex items-start gap-2">
                          <span className="text-[11px] text-primary font-bold shrink-0 uppercase tracking-wider mt-0.5">LAT</span>
                          <p className="text-xs text-muted-foreground italic leading-relaxed">
                            {tamazightLine.latin}
                          </p>
                        </div>

                        {/* Phonetic guide */}
                        <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-2 border border-border/50">
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold shrink-0 mt-0.5">🔊</span>
                          <p className="text-[11px] text-foreground font-medium leading-relaxed">
                            {tamazightLine.phonetic}
                          </p>
                        </div>
                      </div>
                    )
                  })}

                  {/* Lexicon reference table */}
                  <div className="rounded-xl border border-border/80 bg-card p-3.5">
                    <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                      <BookOpen className="size-3.5 text-primary" />
                      Lexique Posologique Tamazight — Termes Essentiels
                    </p>
                    <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[11px]">
                      <span className="font-bold text-muted-foreground">Français</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">ⵜⵉⴼⵉⵏⴰⵖ</span>
                      <span className="font-bold text-primary italic">Phonétique</span>

                      {TAMAZIGHT_LEXICON.map((entry, i) => (
                        <React.Fragment key={i}>
                          <span className="text-foreground">{entry.fr}</span>
                          <span className="text-emerald-700 dark:text-emerald-300 font-medium">{entry.tifinagh}</span>
                          <span className="text-muted-foreground italic">{entry.latin}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border rounded-xl">
                <Languages className="size-10 text-muted-foreground/40 mb-3" />
                <p className="text-xs font-semibold text-foreground">
                  En attente de traduction
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                  Saisissez l&apos;ordonnance à gauche et cliquez sur &quot;Traduire&quot; pour générer la fiche patient en arabe.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
