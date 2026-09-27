'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { healthEvents, HealthEvent } from '@/lib/health-calendar-data'
import { SafetyNote } from './safety-note'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  CalendarHeart,
  Ribbon,
  Microscope,
  Activity,
  Syringe,
  Dna,
  Cross,
  Droplets,
  Eye,
  HeartPulse,
  Bug,
  ShieldCheck,
  Wind,
  Ban,
  Sun,
  Baby,
  Brain,
  Heart,
  Pill,
  User,
  ShieldAlert,
  Moon,
  Accessibility
} from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

const IconMap: Record<string, React.ElementType> = {
  Ribbon, Microscope, Activity, Syringe, Dna, Cross, Droplets, Eye, HeartPulse,
  Bug, ShieldCheck, Wind, Ban, Sun, Baby, Brain, Heart, Pill, User, ShieldAlert,
  Moon, Accessibility
}

const CategoryColors: Record<string, string> = {
  prevention: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  depistage: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  vaccination: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  sensibilisation: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  securite: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
}

const months = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

export function HealthCalendar() {
  const currentMonthIndex = new Date().getMonth() + 1
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIndex)
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({})

  // Upcoming events
  const upcomingEvents = useMemo(() => {
    const today = new Date()
    const currentM = today.getMonth() + 1
    const currentD = today.getDate()

    return [...healthEvents]
      .filter(e => {
        if (e.month > currentM) return true
        if (e.month === currentM && e.dayStart >= currentD) return true
        return false
      })
      .sort((a, b) => {
        if (a.month !== b.month) return a.month - b.month
        return a.dayStart - b.dayStart
      })
      .slice(0, 3)
  }, [])

  const currentEvents = useMemo(() => {
    return healthEvents.filter(e => e.month === selectedMonth)
  }, [selectedMonth])

  const toggleCard = (id: string) => {
    setOpenCards(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Heatmap data
  const monthCounts = useMemo(() => {
    const counts = new Array(12).fill(0)
    healthEvents.forEach(e => {
      if (e.month >= 1 && e.month <= 12) {
        counts[e.month - 1]++
      }
    })
    return counts
  }, [])

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CalendarHeart className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Calendrier de Sensibilisation</h2>
          <p className="text-sm text-muted-foreground">
            Événements de santé publique et rôle du pharmacien d'officine en Algérie
          </p>
        </div>
      </div>

      <SafetyNote>
        Calendrier informatif — consultez le programme national de santé publique du Ministère de la Santé pour les campagnes officielles en cours.
      </SafetyNote>

      {/* Upcoming Section */}
      {upcomingEvents.length > 0 && (
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarHeart className="size-4 text-primary" />
              Prochainement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {upcomingEvents.map(event => {
                const Icon = IconMap[event.icon] || HeartPulse
                return (
                  <div key={`upcoming-${event.id}`} className="flex flex-col rounded-md border bg-card p-3 shadow-sm">
                    <div className="flex items-start gap-2 mb-2">
                      <Icon className="size-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm font-medium leading-tight">{event.title}</span>
                    </div>
                    <Badge variant="secondary" className="w-fit text-xs mt-auto">
                      {event.date}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Annual Overview Heatmap */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Aperçu annuel</h3>
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {months.map((m, i) => {
            const count = monthCounts[i]
            const intensity = count === 0 ? 'bg-secondary/50' :
                              count === 1 ? 'bg-primary/30' :
                              count === 2 ? 'bg-primary/60' : 'bg-primary'
            return (
              <div 
                key={m}
                onClick={() => setSelectedMonth(i + 1)}
                className={cn(
                  "flex-1 min-w-[3rem] h-10 rounded-md flex items-center justify-center cursor-pointer transition-all hover:ring-2 ring-primary/30 ring-offset-1 ring-offset-background",
                  intensity,
                  selectedMonth === i + 1 && "ring-2 ring-primary ring-offset-2"
                )}
                title={`${m}: ${count} événement(s)`}
              >
                <span className={cn(
                  "text-xs font-semibold",
                  count === 0 ? "text-muted-foreground" : count >= 2 ? "text-primary-foreground" : "text-foreground"
                )}>
                  {m.substring(0, 3)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Month Navigation Tabs */}
      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div className="flex w-max space-x-2">
          {months.map((month, index) => {
            const monthNum = index + 1
            const isSelected = selectedMonth === monthNum
            return (
              <Button
                key={month}
                variant={isSelected ? "default" : "outline"}
                onClick={() => setSelectedMonth(monthNum)}
                className="rounded-full px-4"
              >
                {month}
              </Button>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>

      {/* Event Cards */}
      <div aria-live="polite" className="sr-only">
        {currentEvents.length} événements pour le mois de {months[selectedMonth - 1]}
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {currentEvents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="col-span-full py-12 text-center text-muted-foreground"
            >
              Aucun événement recensé pour ce mois.
            </motion.div>
          ) : (
            currentEvents.map((event) => {
              const Icon = IconMap[event.icon] || HeartPulse
              const isOpen = openCards[event.id]
              return (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="h-full flex flex-col overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-full",
                            CategoryColors[event.category]
                          )}>
                            <Icon className="size-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base leading-tight">{event.title}</CardTitle>
                            <CardDescription className="mt-1 font-medium">{event.date}</CardDescription>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <Badge variant="outline" className={cn("border-transparent font-normal", CategoryColors[event.category])}>
                          {event.category}
                        </Badge>
                        {event.algeriaSpecific && (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400">
                            Spécifique Algérie
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">{event.source}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1 pb-4">
                      <p className="text-sm text-muted-foreground mb-4">{event.description}</p>
                      
                      {event.relatedDci.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs font-semibold text-muted-foreground mb-2">DCI associées :</div>
                          <div className="flex flex-wrap gap-1">
                            {event.relatedDci.map(dci => (
                              <Badge key={dci} variant="secondary" className="text-[10px] font-mono cursor-pointer hover:bg-secondary/80">
                                {dci}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-auto pt-2">
                        <Collapsible open={isOpen} onOpenChange={() => toggleCard(event.id)}>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full flex justify-between px-2 text-sm text-primary hover:bg-primary/5">
                              Rôle du pharmacien
                              <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2">
                            <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                              {event.pharmacistRole.map((role, i) => (
                                <li key={i}>{role}</li>
                              ))}
                            </ul>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
