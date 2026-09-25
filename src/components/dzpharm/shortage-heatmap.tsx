'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  Flame,
  Info,
  Layers,
  MapPin,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { WILAYAS } from '@/lib/wilayas'

interface ShortageReportSummary {
  id: number
  brand: string
  wilaya: string | null
  status: string
}

export interface ShortageHeatmapProps {
  reports: ShortageReportSummary[]
  selectedWilaya: string | null
  onSelectWilaya: (wilaya: string | null) => void
}

interface WilayaTension {
  name: string
  code: string
  count: number
  level: 'normal' | 'moderate' | 'critical'
  topDrugs: string[]
}

// Découpage géographique usuel en Algérie
const REGIONS: Record<string, string[]> = {
  Centre: [
    'Alger',
    'Blida',
    'Tipaza',
    'Boumerdès',
    'Bouira',
    'Médéa',
    'Tizi Ouzou',
    'Aïn Defla',
    'Chlef',
  ],
  Est: [
    'Constantine',
    'Annaba',
    'Sétif',
    'Batna',
    'Béjaïa',
    'Skikda',
    'Jijel',
    'Guelma',
    'Tébessa',
    'Oum El Bouaghi',
    'Bordj Bou Arréridj',
    'Souk Ahras',
    'El Tarf',
    'Khenchela',
    'Mila',
  ],
  Ouest: [
    'Oran',
    'Tlemcen',
    'Sidi Bel Abbès',
    'Mostaganem',
    'Mascara',
    'Tiaret',
    'Saïda',
    'Relizane',
    'Aïn Témouchent',
  ],
  Sud: [
    'Adrar',
    'Laghouat',
    'Biskra',
    'Béchar',
    'Tamanrasset',
    'Djelfa',
    "M'Sila",
    'Ouargla',
    'El Bayadh',
    'Illizi',
    'Tindouf',
    'Tissemsilt',
    'El Oued',
    'Naâma',
    'Ghardaïa',
    'Timimoun',
    'Bordj Badji Mokhtar',
    'Ouled Djellal',
    'Béni Abbès',
    'In Salah',
    'In Guezzam',
    'Touggourt',
    'Djanet',
    "El M'Ghair",
    'El Meniaa',
  ],
}

export function ShortageHeatmap({
  reports,
  selectedWilaya,
  onSelectWilaya,
}: ShortageHeatmapProps) {
  const [activeRegion, setActiveRegion] = useState<string>('Toutes')

  // Calcul des tensions par wilaya
  const wilayaData = useMemo(() => {
    const map = new Map<string, { count: number; drugs: Set<string> }>()

    for (const w of WILAYAS) {
      map.set(w, { count: 0, drugs: new Set() })
    }

    for (const r of reports) {
      if (r.status !== 'RESOLUE' && r.wilaya && map.has(r.wilaya)) {
        const item = map.get(r.wilaya)!
        item.count += 1
        item.drugs.add(r.brand)
      }
    }

    const list: WilayaTension[] = []
    let index = 1
    for (const w of WILAYAS) {
      const code = index.toString().padStart(2, '0')
      const data = map.get(w) ?? { count: 0, drugs: new Set() }
      const count = data.count
      const level: WilayaTension['level'] =
        count >= 3 ? 'critical' : count >= 1 ? 'moderate' : 'normal'

      list.push({
        name: w,
        code,
        count,
        level,
        topDrugs: Array.from(data.drugs).slice(0, 3),
      })
      index += 1
    }

    return list
  }, [reports])

  // Statistiques nationales
  const stats = useMemo(() => {
    const underTension = wilayaData.filter((w) => w.count > 0).length
    const critical = wilayaData.filter((w) => w.level === 'critical').length
    const percentage = Math.round((underTension / 58) * 100)
    return { underTension, critical, percentage }
  }, [wilayaData])

  // Filtrage par région
  const displayedWilayas = useMemo(() => {
    if (activeRegion === 'Toutes') return wilayaData
    const allowed = REGIONS[activeRegion] || []
    return wilayaData.filter((w) => allowed.includes(w.name))
  }, [wilayaData, activeRegion])

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Flame className="size-5 text-state-danger" aria-hidden />
              Cartographie Interactive des Tensions d&apos;Approvisionnement (58 Wilayas)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Visualisation en temps réel de la pression sur les stocks officinaux par région et wilaya.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Région :</span>
            {['Toutes', 'Centre', 'Est', 'Ouest', 'Sud'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setActiveRegion(r)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                  activeRegion === r
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Ticker de synthèse nationale */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-border/50 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>{stats.underTension} wilayas</strong> sous tension ({stats.percentage} %)
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-rose-800 dark:text-rose-300">
            <Flame className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>
              <strong>{stats.critical} wilayas</strong> en tension critique (&ge; 3 ruptures)
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-card border border-border px-3 py-2 text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px]">
                <span className="size-2 rounded-full bg-emerald-500" /> Normal
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <span className="size-2 rounded-full bg-amber-500" /> Modéré
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <span className="size-2 rounded-full bg-rose-500" /> Critique
              </span>
            </div>
            {selectedWilaya && (
              <button
                type="button"
                onClick={() => onSelectWilaya(null)}
                className="text-xs text-primary font-semibold hover:underline cursor-pointer"
              >
                Effacer filtre
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-1 sm:p-6 sm:pt-1">
        {/* Grille thermique des 58 Wilayas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-2">
          {displayedWilayas.map((w) => {
            const isSelected = selectedWilaya === w.name
            return (
              <motion.button
                key={w.code}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectWilaya(isSelected ? null : w.name)}
                className={cn(
                  'flex flex-col text-left p-2.5 rounded-xl border transition-all cursor-pointer relative',
                  isSelected
                    ? 'ring-2 ring-primary border-primary bg-primary/10 shadow-xs'
                    : w.level === 'critical'
                    ? 'border-rose-500/40 bg-rose-500/10 hover:border-rose-500/60'
                    : w.level === 'moderate'
                    ? 'border-amber-500/40 bg-amber-500/10 hover:border-amber-500/60'
                    : 'border-border/60 bg-card hover:border-border hover:bg-muted/30'
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-mono font-bold text-muted-foreground">
                    {w.code}
                  </span>
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      w.level === 'critical'
                        ? 'bg-rose-500 animate-pulse'
                        : w.level === 'moderate'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500/60'
                    )}
                  />
                </div>

                <span className="text-xs font-semibold text-foreground truncate mt-1">
                  {w.name}
                </span>

                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span
                    className={cn(
                      'font-bold tabular-nums',
                      w.count > 0 ? 'text-foreground' : 'text-muted-foreground/60'
                    )}
                  >
                    {w.count} signalement{w.count > 1 ? 's' : ''}
                  </span>
                </div>

                {w.topDrugs.length > 0 && (
                  <p className="mt-1 truncate text-[10px] text-muted-foreground/80 italic">
                    {w.topDrugs.join(', ')}
                  </p>
                )}
              </motion.button>
            )
          })}
        </div>

        {selectedWilaya && (
          <div className="mt-4 p-3 rounded-lg border border-primary/30 bg-primary/5 flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              Filtre actif : Wilaya de {selectedWilaya} ({wilayaData.find((w) => w.name === selectedWilaya)?.count ?? 0} tension(s))
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelectWilaya(null)}
              className="h-7 text-xs text-primary font-semibold"
            >
              Afficher toute l&apos;Algérie
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
