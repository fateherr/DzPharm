'use client'

import { useState } from 'react'
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  FileCheck2,
  FileText,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export interface CitationData {
  token: string
  title: string
  organization: string
  section: string
  text: string
  url?: string
}

interface CitationDrawerProps {
  citation: CitationData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CitationDrawer({ citation, open, onOpenChange }: CitationDrawerProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  if (!citation) return null

  const handleCopy = () => {
    const citationText = `[${citation.organization}] ${citation.title} — ${citation.section}\n« ${citation.text} »`
    void navigator.clipboard.writeText(citationText)
    setCopied(true)
    toast({
      title: 'Référence copiée',
      description: 'La citation officielle est dans le presse-papier.',
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col justify-between">
        <div>
          <SheetHeader className="p-6 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs font-semibold px-2 py-0.5">
                <ShieldCheck className="size-3 mr-1 inline" />
                Référentiel Clinique Officiel
              </Badge>
              <span className="text-xs text-muted-foreground font-mono font-medium">
                {citation.organization}
              </span>
            </div>
            <SheetTitle className="text-base font-bold text-foreground leading-snug">
              {citation.title}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
              <FileText className="size-3.5 text-primary" />
              <span>{citation.section}</span>
            </SheetDescription>
          </SheetHeader>

          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-primary">
                <span className="flex items-center gap-1.5">
                  <FileCheck2 className="size-4" />
                  Extrait vérifié de la monographie
                </span>
                <span className="font-mono text-[10px] bg-background/80 px-1.5 py-0.5 rounded border border-border/50">
                  {citation.token}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-foreground/90 italic border-l-2 border-primary/40 pl-3 py-1 font-serif">
                « {citation.text} »
              </p>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Garantie d’impartialité & traçabilité :</p>
              <ul className="space-y-1.5 list-disc pl-4">
                <li>Cette donnée est extraite directement des RCP validés par l&apos;ANPP ou des recommandations de consensus international.</li>
                <li>Le copilote n&apos;invente aucune règle posologique : chaque recommandation est vérifiée par les monographies réglementaires.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border/60 bg-muted/10 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-1 text-xs gap-1.5"
          >
            {copied ? <Check className="size-3.5 text-state-safe" /> : <Copy className="size-3.5" />}
            <span>{copied ? 'Copié !' : 'Copier la référence'}</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs px-4"
          >
            Fermer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
