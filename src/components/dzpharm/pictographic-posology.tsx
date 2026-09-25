'use client'

import React, { useState } from 'react'
import {
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Utensils,
  GlassWater,
  Clock,
  Printer,
  Plus,
  Trash2,
  Pill,
  Sparkles,
  Info,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDzPharm } from './store'

export interface PictogramDrug {
  id: string
  name: string
  dci?: string
  formType: 'comprime' | 'gelule' | 'sirop' | 'sachet' | 'gouttes' | 'pommade' | 'inhalateur'
  morning: number // 0, 0.5, 1, 2, 3
  noon: number
  evening: number
  bedtime: number
  mealRelation: 'during' | 'before' | 'after' | 'none'
  waterGlass: boolean
  durationText: string
  arabicNotes?: string
  frenchNotes?: string
}

const DEFAULT_PRESETS: PictogramDrug[] = [
  {
    id: '1',
    name: 'Amoxicilline 1g',
    dci: 'Amoxicilline',
    formType: 'comprime',
    morning: 1,
    noon: 0,
    evening: 1,
    bedtime: 0,
    mealRelation: 'during',
    waterGlass: true,
    durationText: '6 jours',
    frenchNotes: 'À prendre au début du repas. Ne pas interrompre avant 6 jours.',
    arabicNotes: 'يؤخذ في بداية الأكل. لا توقف الدواء قبل 6 أيام.',
  },
  {
    id: '2',
    name: 'Paracétamol 1000mg',
    dci: 'Paracétamol',
    formType: 'comprime',
    morning: 1,
    noon: 1,
    evening: 1,
    bedtime: 0,
    mealRelation: 'none',
    waterGlass: true,
    durationText: 'Si douleur / fièvre',
    frenchNotes: 'Espacer les prises de 6 heures minimum. Max 3g par jour.',
    arabicNotes: 'بين كل جرعة 6 ساعات على الأقل. عند الألم أو الحمى فقط.',
  },
  {
    id: '3',
    name: 'Oméprazole 20mg',
    dci: 'Oméprazole',
    formType: 'gelule',
    morning: 1,
    noon: 0,
    evening: 0,
    bedtime: 0,
    mealRelation: 'before',
    waterGlass: true,
    durationText: '28 jours',
    frenchNotes: 'À jeun 30 minutes avant le petit-déjeuner.',
    arabicNotes: 'على الريق قبل فطور الصباح بنصف ساعة.',
  },
]

export function PictographicPosologyGenerator() {
  const [drugs, setDrugs] = useState<PictogramDrug[]>(DEFAULT_PRESETS)
  const [patientName, setPatientName] = useState('')
  const pinnedPatient = useDzPharm((s) => s.pinnedPatient)

  // Initialiser avec le patient épinglé si disponible
  React.useEffect(() => {
    if (pinnedPatient?.name && !patientName) {
      setPatientName(pinnedPatient.name)
    }
  }, [pinnedPatient, patientName])

  function addDrug() {
    const newDrug: PictogramDrug = {
      id: Math.random().toString(36).substring(2, 9),
      name: 'Nouveau Médicament',
      formType: 'comprime',
      morning: 1,
      noon: 0,
      evening: 1,
      bedtime: 0,
      mealRelation: 'during',
      waterGlass: true,
      durationText: '7 jours',
      frenchNotes: '',
      arabicNotes: '',
    }
    setDrugs([...drugs, newDrug])
  }

  function updateDrug(id: string, patch: Partial<PictogramDrug>) {
    setDrugs(drugs.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  function removeDrug(id: string) {
    setDrugs(drugs.filter((d) => d.id !== id))
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Styles d'impression paysage pour affichage patient */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #pictographic-posology-sheet,
          #pictographic-posology-sheet * {
            visibility: visible;
          }
          #pictographic-posology-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 10mm !important;
            background: #fff !important;
            color: #000 !important;
          }
          .picto-no-print {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
        }
      `}</style>

      {/* En-tête de configuration (masqué à l'impression) */}
      <Card className="border-border/60 picto-no-print">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sun className="size-5 text-amber-500" />
                Générateur Posologique Pictographique Universel
              </CardTitle>
              <CardDescription>
                Fiche visuelle simplifiée pour patients âgés, analphabètes ou pédiatriques (Français + Arabe)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDrug}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                Ajouter un médicament
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handlePrint}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Printer className="size-4" />
                Imprimer la fiche patient
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-64">
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Nom du Patient :
              </label>
              <Input
                placeholder="Ex: Hadj Mohamed / Enfant Amine"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            {pinnedPatient && (
              <Badge variant="outline" className="h-8 px-2.5 text-xs gap-1.5 bg-primary/5 text-primary border-primary/20">
                <CheckCircle2 className="size-3.5" />
                Patient épinglé actif : {pinnedPatient.name || 'Profil session'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rendu imprimable de la fiche posologique */}
      <div
        id="pictographic-posology-sheet"
        className="bg-card text-card-foreground border border-border/80 rounded-xl p-6 shadow-sm space-y-6"
      >
        {/* En-tête de la fiche */}
        <div className="flex justify-between items-start border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-primary">DzPharm Officine</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                GUIDE POSOLOGIQUE VISUEL · دليل تناول الدواء
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consultez attentivement les symboles ci-dessous pour chaque moment de la journée
            </p>
          </div>

          <div className="text-right">
            <div className="font-bold text-sm">
              {patientName ? `Patient: ${patientName}` : 'Patient Officine'}
            </div>
            <div className="text-xs text-muted-foreground">
              Date: {new Date().toLocaleDateString('fr-DZ')}
            </div>
          </div>
        </div>

        {/* Légende visuelle universelle */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-muted/30 p-3 rounded-lg border border-border/40 text-center text-xs">
          <div className="flex flex-col items-center gap-1 p-1">
            <Sunrise className="size-5 text-amber-500" />
            <span className="font-bold text-[11px]">Matin</span>
            <span className="text-[10px] text-muted-foreground font-arabic" dir="rtl">الصباح</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-1">
            <Sun className="size-5 text-yellow-500" />
            <span className="font-bold text-[11px]">Midi</span>
            <span className="text-[10px] text-muted-foreground font-arabic" dir="rtl">منتصف النهار</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-1">
            <Sunset className="size-5 text-orange-500" />
            <span className="font-bold text-[11px]">Soir</span>
            <span className="text-[10px] text-muted-foreground font-arabic" dir="rtl">المساء</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-1">
            <Moon className="size-5 text-indigo-500" />
            <span className="font-bold text-[11px]">Coucher</span>
            <span className="text-[10px] text-muted-foreground font-arabic" dir="rtl">عند النوم</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-1">
            <Utensils className="size-5 text-emerald-600" />
            <span className="font-bold text-[11px]">Avec repas</span>
            <span className="text-[10px] text-muted-foreground font-arabic" dir="rtl">مع الأكل</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-1">
            <Clock className="size-5 text-rose-500" />
            <span className="font-bold text-[11px]">À jeun</span>
            <span className="text-[10px] text-muted-foreground font-arabic" dir="rtl">على الريق</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-1">
            <GlassWater className="size-5 text-sky-500" />
            <span className="font-bold text-[11px]">Grand verre</span>
            <span className="text-[10px] text-muted-foreground font-arabic" dir="rtl">كأس ماء</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-1">
            <Calendar className="size-5 text-purple-500" />
            <span className="font-bold text-[11px]">Durée</span>
            <span className="text-[10px] text-muted-foreground font-arabic" dir="rtl">مدة العلاج</span>
          </div>
        </div>

        {/* Tableau pictographique des médicaments */}
        <div className="space-y-4">
          {drugs.map((drug, index) => (
            <div
              key={drug.id}
              className="border border-border/70 rounded-xl p-4 bg-background relative transition-all hover:border-primary/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="size-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <Input
                      value={drug.name}
                      onChange={(e) => updateDrug(drug.id, { name: e.target.value })}
                      className="font-bold text-base h-8 px-2 w-64 picto-no-print border-dashed"
                      placeholder="Nom du médicament"
                    />
                    <div className="hidden print:block font-bold text-base">
                      {drug.name}
                    </div>
                    {drug.dci && (
                      <span className="text-xs text-muted-foreground">{drug.dci}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Durée de traitement */}
                  <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-md text-xs font-semibold">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <Input
                      value={drug.durationText}
                      onChange={(e) => updateDrug(drug.id, { durationText: e.target.value })}
                      className="h-6 w-28 text-xs px-1 picto-no-print border-none bg-transparent"
                      placeholder="Durée (ex: 7j)"
                    />
                    <span className="hidden print:inline">{drug.durationText}</span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDrug(drug.id)}
                    className="size-7 text-muted-foreground hover:text-destructive picto-no-print"
                    aria-label="Supprimer médicament"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* 4 Périodes Visuelles : Matin, Midi, Soir, Nuit */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center my-3">
                {/* Matin */}
                <div
                  className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                    drug.morning > 0
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200'
                      : 'bg-muted/10 border-border/30 opacity-40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Sunrise className="size-4 text-amber-500" />
                    <span>Matin · الصباح</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    {drug.morning > 0 ? (
                      <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                        {drug.morning === 0.5 ? '½' : drug.morning}
                      </span>
                    ) : (
                      <span className="text-xl text-muted-foreground font-light">—</span>
                    )}
                    <Pill className="size-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  {/* Sélecteur de dose en mode édition */}
                  <div className="flex gap-1 picto-no-print pt-1">
                    {[0, 0.5, 1, 2].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateDrug(drug.id, { morning: v })}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          drug.morning === v ? 'bg-amber-500 text-white font-bold' : 'bg-muted/40'
                        }`}
                      >
                        {v === 0.5 ? '½' : v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Midi */}
                <div
                  className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                    drug.noon > 0
                      ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-950 dark:text-yellow-200'
                      : 'bg-muted/10 border-border/30 opacity-40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Sun className="size-4 text-yellow-500" />
                    <span>Midi · الظهر</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    {drug.noon > 0 ? (
                      <span className="text-2xl font-black text-yellow-600 dark:text-yellow-400">
                        {drug.noon === 0.5 ? '½' : drug.noon}
                      </span>
                    ) : (
                      <span className="text-xl text-muted-foreground font-light">—</span>
                    )}
                    <Pill className="size-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex gap-1 picto-no-print pt-1">
                    {[0, 0.5, 1, 2].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateDrug(drug.id, { noon: v })}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          drug.noon === v ? 'bg-yellow-500 text-white font-bold' : 'bg-muted/40'
                        }`}
                      >
                        {v === 0.5 ? '½' : v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Soir */}
                <div
                  className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                    drug.evening > 0
                      ? 'bg-orange-500/10 border-orange-500/40 text-orange-950 dark:text-orange-200'
                      : 'bg-muted/10 border-border/30 opacity-40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Sunset className="size-4 text-orange-500" />
                    <span>Soir · المساء</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    {drug.evening > 0 ? (
                      <span className="text-2xl font-black text-orange-600 dark:text-orange-400">
                        {drug.evening === 0.5 ? '½' : drug.evening}
                      </span>
                    ) : (
                      <span className="text-xl text-muted-foreground font-light">—</span>
                    )}
                    <Pill className="size-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex gap-1 picto-no-print pt-1">
                    {[0, 0.5, 1, 2].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateDrug(drug.id, { evening: v })}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          drug.evening === v ? 'bg-orange-500 text-white font-bold' : 'bg-muted/40'
                        }`}
                      >
                        {v === 0.5 ? '½' : v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coucher */}
                <div
                  className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                    drug.bedtime > 0
                      ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-950 dark:text-indigo-200'
                      : 'bg-muted/10 border-border/30 opacity-40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Moon className="size-4 text-indigo-500" />
                    <span>Coucher · عند النوم</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    {drug.bedtime > 0 ? (
                      <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {drug.bedtime === 0.5 ? '½' : drug.bedtime}
                      </span>
                    ) : (
                      <span className="text-xl text-muted-foreground font-light">—</span>
                    )}
                    <Pill className="size-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex gap-1 picto-no-print pt-1">
                    {[0, 0.5, 1, 2].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateDrug(drug.id, { bedtime: v })}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          drug.bedtime === v ? 'bg-indigo-500 text-white font-bold' : 'bg-muted/40'
                        }`}
                      >
                        {v === 0.5 ? '½' : v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conditions de prise (Repas & Eau) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40 text-xs">
                <div className="flex items-center gap-4">
                  {/* Relation Repas */}
                  <div className="flex items-center gap-1.5 font-medium">
                    {drug.mealRelation === 'during' && (
                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <Utensils className="size-4" />
                        Pendant le repas · مع الأكل
                      </span>
                    )}
                    {drug.mealRelation === 'before' && (
                      <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold">
                        <Clock className="size-4" />
                        À jeun (30 min avant) · على الريق
                      </span>
                    )}
                    {drug.mealRelation === 'after' && (
                      <span className="flex items-center gap-1 text-sky-700 dark:text-sky-400 font-semibold">
                        <Utensils className="size-4" />
                        Juste après le repas · بعد الأكل
                      </span>
                    )}
                    {drug.mealRelation === 'none' && (
                      <span className="text-muted-foreground">
                        Peu importe le repas · في أي وقت
                      </span>
                    )}
                  </div>

                  {/* Grand verre d'eau */}
                  {drug.waterGlass && (
                    <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                      <GlassWater className="size-4" />
                      Grand verre d&apos;eau · كأس ماء كبير
                    </span>
                  )}
                </div>

                {/* Sélecteurs de relation repas en mode édition */}
                <div className="flex items-center gap-2 picto-no-print">
                  <Select
                    value={drug.mealRelation}
                    onValueChange={(v: PictogramDrug['mealRelation']) =>
                      updateDrug(drug.id, { mealRelation: v })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs w-44">
                      <SelectValue placeholder="Relation repas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="during">🍽️ Pendant le repas</SelectItem>
                      <SelectItem value="before">⏳ À jeun / Avant</SelectItem>
                      <SelectItem value="after">☕ Après le repas</SelectItem>
                      <SelectItem value="none">Indifférent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Instructions textuelles bilingues */}
              {(drug.frenchNotes || drug.arabicNotes) && (
                <div className="mt-2.5 pt-2 border-t border-dotted border-border/50 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {drug.frenchNotes && (
                    <div className="text-muted-foreground italic bg-muted/20 p-2 rounded">
                      <span className="font-semibold text-foreground not-italic">Conseil : </span>
                      {drug.frenchNotes}
                    </div>
                  )}
                  {drug.arabicNotes && (
                    <div
                      className="text-muted-foreground italic bg-muted/20 p-2 rounded text-right font-arabic"
                      dir="rtl"
                    >
                      <span className="font-semibold text-foreground not-italic">إرشاد : </span>
                      {drug.arabicNotes}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pied de page d'urgence de la fiche */}
        <div className="border-t border-border/70 pt-4 flex flex-wrap justify-between items-center text-xs text-muted-foreground">
          <div>
            <span>En cas de doute ou d&apos;effet indésirable : contactez votre pharmacien.</span>
            <div className="font-arabic" dir="rtl">في حال الشك أو ظهور أعراض غير مرغوبة: استشر صيدليك.</div>
          </div>
          <div className="font-bold text-foreground">
            SAMU : 14 · CENTRE ANTI-POISON D&apos;ALGER : 021 97 98 98
          </div>
        </div>
      </div>
    </div>
  )
}
