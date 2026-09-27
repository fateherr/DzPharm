'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Info,
  ChevronDown,
  ChevronUp,
  TriangleAlert,
  AlertCircle,
  FileWarning,
  FileText,
  Beaker,
  Lock,
  CheckCircle2,
  Clock,
  Archive,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SafetyNote } from './safety-note'
import {
  PSYCHOTROPES_DATA,
  SCHEDULE_META,
  ScheduleLevel,
} from '@/lib/psychotropes-data'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const ICON_MAP = {
  TriangleAlert,
  AlertCircle,
  FileWarning,
  FileText,
  Beaker,
}

const normalizeString = (str: string) =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

type FilterCategory =
  | 'ALL'
  | 'STUPEFIANTS'
  | 'PSYCHOTROPES'
  | 'LISTE_I'
  | 'LISTE_II'
  | 'PRECURSEURS'

export function PsychotropesCoffre() {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL')
  const [isInfoExpanded, setIsInfoExpanded] = useState(false)

  const filteredData = useMemo(() => {
    let result = PSYCHOTROPES_DATA

    // Filter by category
    if (activeFilter !== 'ALL') {
      if (activeFilter === 'PSYCHOTROPES') {
        result = result.filter((item) =>
          item.schedule.startsWith('PSYCHOTROPES')
        )
      } else {
        result = result.filter((item) => item.schedule === activeFilter)
      }
    }

    // Filter by search
    if (debouncedSearch) {
      const normalizedSearch = normalizeString(debouncedSearch)
      result = result.filter((item) => {
        const matchDCI = normalizeString(item.dci).includes(normalizedSearch)
        const matchBrands = item.brands.some((brand) =>
          normalizeString(brand).includes(normalizedSearch)
        )
        return matchDCI || matchBrands
      })
    }

    return result
  }, [debouncedSearch, activeFilter])

  const counts = useMemo(() => {
    const c = {
      ALL: PSYCHOTROPES_DATA.length,
      STUPEFIANTS: 0,
      PSYCHOTROPES: 0,
      LISTE_I: 0,
      LISTE_II: 0,
      PRECURSEURS: 0,
    }
    PSYCHOTROPES_DATA.forEach((item) => {
      if (item.schedule === 'STUPEFIANTS') c.STUPEFIANTS++
      else if (item.schedule.startsWith('PSYCHOTROPES')) c.PSYCHOTROPES++
      else if (item.schedule === 'LISTE_I') c.LISTE_I++
      else if (item.schedule === 'LISTE_II') c.LISTE_II++
      else if (item.schedule === 'PRECURSEURS') c.PRECURSEURS++
    })
    return c
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
          <Input
            placeholder="Rechercher par DCI (ex: Morphine) ou marque (ex: Skenan)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant={activeFilter === 'ALL' ? 'default' : 'secondary'}
            className="cursor-pointer text-sm py-1.5"
            onClick={() => setActiveFilter('ALL')}
          >
            Tous ({counts.ALL})
          </Badge>
          <Badge
            variant={activeFilter === 'STUPEFIANTS' ? 'default' : 'outline'}
            className="cursor-pointer text-sm py-1.5 border-destructive/30 hover:bg-destructive/10"
            onClick={() => setActiveFilter('STUPEFIANTS')}
          >
            Stupéfiants ({counts.STUPEFIANTS})
          </Badge>
          <Badge
            variant={activeFilter === 'PSYCHOTROPES' ? 'default' : 'outline'}
            className="cursor-pointer text-sm py-1.5 border-rose-500/30 hover:bg-rose-500/10"
            onClick={() => setActiveFilter('PSYCHOTROPES')}
          >
            Psychotropes ({counts.PSYCHOTROPES})
          </Badge>
          <Badge
            variant={activeFilter === 'LISTE_I' ? 'default' : 'outline'}
            className="cursor-pointer text-sm py-1.5 border-amber-500/30 hover:bg-amber-500/10"
            onClick={() => setActiveFilter('LISTE_I')}
          >
            Liste I ({counts.LISTE_I})
          </Badge>
          <Badge
            variant={activeFilter === 'LISTE_II' ? 'default' : 'outline'}
            className="cursor-pointer text-sm py-1.5 border-yellow-500/30 hover:bg-yellow-500/10"
            onClick={() => setActiveFilter('LISTE_II')}
          >
            Liste II ({counts.LISTE_II})
          </Badge>
          <Badge
            variant={activeFilter === 'PRECURSEURS' ? 'default' : 'outline'}
            className="cursor-pointer text-sm py-1.5 border-violet-500/30 hover:bg-violet-500/10"
            onClick={() => setActiveFilter('PRECURSEURS')}
          >
            Précurseurs ({counts.PRECURSEURS})
          </Badge>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="py-4">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
          >
            <div className="flex items-center gap-2 text-primary font-medium">
              <Info className="size-5" />
              <span>Rappel de la Réglementation (Tableaux & Listes)</span>
            </div>
            {isInfoExpanded ? (
              <ChevronUp className="size-5 text-primary" />
            ) : (
              <ChevronDown className="size-5 text-primary" />
            )}
          </div>
        </CardHeader>
        <AnimatePresence>
          {isInfoExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 grid gap-4 sm:grid-cols-2">
                {Object.entries(SCHEDULE_META).map(([key, meta]) => {
                  const Icon =
                    ICON_MAP[meta.icon as keyof typeof ICON_MAP] || Info
                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-lg border ${meta.color} bg-background/50`}
                    >
                      <div className="flex items-center gap-2 font-semibold mb-2">
                        <Icon className="size-4" />
                        {meta.label}
                      </div>
                      <ul className="text-sm space-y-1 list-disc pl-4">
                        {meta.rules.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <div aria-live="polite" className="text-sm text-muted-foreground font-medium">
        {filteredData.length} résultat{filteredData.length > 1 ? 's' : ''} trouvé{filteredData.length > 1 ? 's' : ''}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredData.map((item) => {
            const meta = SCHEDULE_META[item.schedule]
            return (
              <motion.div
                key={item.dci}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full flex flex-col hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg font-bold">
                        {item.dci}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={`text-xs text-center leading-tight ${meta.color}`}
                      >
                        {meta.label}
                      </Badge>
                    </div>
                    {item.brands.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.brands.map((brand) => (
                          <Badge
                            key={brand}
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            {brand}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4 flex-1 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-muted/30 p-2 rounded-md">
                        <div className="text-muted-foreground text-xs font-semibold flex items-center gap-1 mb-1">
                          <FileText className="size-3" />
                          Ordonnance
                        </div>
                        <span className="font-medium">
                          {item.prescriptionType}
                        </span>
                      </div>
                      <div className="bg-muted/30 p-2 rounded-md">
                        <div className="text-muted-foreground text-xs font-semibold flex items-center gap-1 mb-1">
                          <Clock className="size-3" />
                          Durée Max
                        </div>
                        <span className="font-medium">{item.maxDuration}</span>
                      </div>
                      <div className="bg-muted/30 p-2 rounded-md">
                        <div className="text-muted-foreground text-xs font-semibold flex items-center gap-1 mb-1">
                          <CheckCircle2 className="size-3" />
                          Renouvellement
                        </div>
                        <span className="font-medium">{item.renewability}</span>
                      </div>
                      <div className="bg-muted/30 p-2 rounded-md">
                        <div className="text-muted-foreground text-xs font-semibold flex items-center gap-1 mb-1">
                          <Archive className="size-3" />
                          Stockage
                        </div>
                        <span className="font-medium">{item.storage}</span>
                      </div>
                    </div>

                    {item.dispensingRules.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                          <Lock className="size-4 text-primary" />
                          Règles de délivrance
                        </h4>
                        <ul className="text-sm space-y-1.5">
                          {item.dispensingRules.map((rule, idx) => (
                            <li key={idx} className="flex gap-2 items-start">
                              <div className="mt-1 size-1.5 rounded-full bg-primary/60 shrink-0" />
                              <span className="text-foreground/90 leading-tight">
                                {rule}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.notes.length > 0 && (
                      <div className="mt-auto pt-4 border-t border-border/50">
                        {item.notes.map((note, idx) => (
                          <p
                            key={idx}
                            className="text-xs text-muted-foreground italic"
                          >
                            * {note}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <SafetyNote>
        Référentiel indicatif de dispensation — vérifiez toujours la réglementation
        en vigueur auprès de l'Ordre des Pharmaciens ou du Ministère de la Santé.
      </SafetyNote>
    </div>
  )
}
