'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Info, Send, Sparkles, Stethoscope, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { postChat } from './api'
import type { ChatMessage } from './types'

type ChatMode = 'pro' | 'patient'

const SUGGESTIONS = [
  'Quels antibiotiques pour angine en Algérie ?',
  'Différence Liste I / Liste II ?',
  'دوا تاع السكر؟',
  'Posologie paracétamol enfant 20 kg',
]

const markdownComponents: Components = {
  h1: (props) => <h2 className="mt-4 mb-2 text-base font-bold text-foreground" {...props} />,
  h2: (props) => <h3 className="mt-4 mb-2 text-sm font-bold text-foreground" {...props} />,
  h3: (props) => <h4 className="mt-3 mb-1.5 text-sm font-semibold text-foreground" {...props} />,
  p: (props) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0" {...props} />,
  ul: (props) => <ul className="my-2 list-disc space-y-1 pl-5" {...props} />,
  ol: (props) => <ol className="my-2 list-decimal space-y-1 pl-5" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-2 border-l-2 border-primary/50 pl-3 text-muted-foreground italic"
      {...props}
    />
  ),
  hr: () => <hr className="my-4 border-border" />,
  a: (props) => <a className="font-medium text-primary underline underline-offset-2" {...props} />,
  code: (props) => (
    <code
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground"
      {...props}
    />
  ),
  table: (props) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th
      className="border-b border-border bg-muted/60 px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      {...props}
    />
  ),
  td: (props) => <td className="border-b border-border/50 px-3 py-2 align-top" {...props} />,
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1.5" role="status" aria-label="Le copilote rédige une réponse">
      <span className="typing-dot size-2 rounded-full bg-primary" />
      <span className="typing-dot size-2 rounded-full bg-primary" />
      <span className="typing-dot size-2 rounded-full bg-primary" />
    </span>
  )
}

export function CopilotView() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<ChatMode>('pro')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: (allMessages: ChatMessage[]) => postChat(allMessages, mode),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }])
    },
    onError: () => {
      // Message persistant dans le fil + toast : l'utilisateur garde une trace
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '**Service IA momentanément indisponible.**\n\nVotre question a bien été enregistrée — réessayez dans quelques instants.\n\nEn attendant, ces outils restent **entièrement fonctionnels hors IA** :\n- **Contrôle d\u2019interactions** — moteur local de règles instantané\n- **Posologies pédiatriques** — calculateur pondéral\n- **Simulateur Chifa** — reste à charge\n- **Répertoire** — recherche sur les 9 555 AMM',
        },
      ])
      toast({
        title: 'Le copilote est indisponible',
        description: 'Le service IA est momentanément inaccessible. Consultez les outils locaux.',
        variant: 'destructive',
      })
    },
  })

  // Défilement automatique vers le bas
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, mutation.isPending])

  function send(text: string) {
    const content = text.trim()
    if (!content || mutation.isPending) return
    const next: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    mutation.mutate(next.slice(-16))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const empty = messages.length === 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Copilote IA</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Votre assistant pharmaceutique, ancré sur la nomenclature algérienne.
          </p>
        </div>

        {/* Sélecteur de mode */}
        <TooltipProvider delayDuration={200}>
          <div
            className="flex items-center rounded-full border border-border bg-muted p-1"
            role="radiogroup"
            aria-label="Mode du copilote"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === 'pro'}
                  onClick={() => setMode('pro')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                    mode === 'pro'
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Stethoscope className="size-3.5" aria-hidden />
                  Mode professionnel
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-56 text-center">
                Réponses techniques : DCI, posologies, interactions, RCP — pour les
                professionnels de santé.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === 'patient'}
                  onClick={() => setMode('patient')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                    mode === 'patient'
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <User className="size-3.5" aria-hidden />
                  Mode patient
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-56 text-center">
                Réponses vulgarisées, en français simple ou en darija, pour le grand
                public.
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Zone de conversation */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div
          ref={scrollRef}
          className="scroll-thin h-[52vh] min-h-[380px] overflow-y-auto p-4 sm:p-6"
          aria-live="polite"
          aria-label="Conversation avec le copilote"
        >
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span
                className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/50 shadow-lg shadow-primary/20"
                aria-hidden
              >
                <Sparkles className="size-7 text-primary-foreground" />
              </span>
              <p className="mt-5 text-lg font-semibold text-foreground">
                Posez votre question pharmaceutique
              </p>
              <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
                Posologies, équivalents, disponibilité en Algérie, conseils de
                dispensation — le copilote s&apos;appuie sur le référentiel national.
              </p>
              <div className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-border bg-background px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    dir="auto"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex w-full gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <span
                      className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/50"
                      aria-hidden
                    >
                      <Sparkles className="size-4 text-primary-foreground" />
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'rounded-br-md bg-primary text-primary-foreground'
                        : 'rounded-bl-md border border-border bg-background text-foreground/90'
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <div className="min-w-0">
                        <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {message.content}
                        </Markdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap" dir="auto">
                        {message.content}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {mutation.isPending ? (
                <div className="flex gap-3">
                  <span
                    className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/50"
                    aria-hidden
                  >
                    <Sparkles className="size-4 text-primary-foreground" />
                  </span>
                  <div className="rounded-2xl rounded-bl-md border border-border bg-background px-4">
                    <TypingDots />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Saisie */}
        <div className="border-t border-border bg-background p-3 sm:p-4">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'pro'
                  ? 'Votre question pharmaceutique… (Entrée pour envoyer, Maj+Entrée pour un saut de ligne)'
                  : 'Votre question, en français ou en darija…'
              }
              aria-label="Message pour le copilote"
              rows={2}
              dir="auto"
              className="max-h-36 min-h-11 resize-none"
            />
            <Button
              onClick={() => send(input)}
              disabled={!input.trim() || mutation.isPending}
              className="h-11 shrink-0 gap-1.5 font-semibold"
              aria-label="Envoyer le message"
            >
              <Send className="size-4" aria-hidden />
              <span className="hidden sm:inline">Envoyer</span>
            </Button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Info className="size-3 shrink-0" aria-hidden />
            Le copilote est un outil d&apos;aide — ne remplace pas l&apos;avis d&apos;un
            professionnel de santé.
          </p>
        </div>
      </div>
    </div>
  )
}
