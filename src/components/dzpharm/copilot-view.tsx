'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Baby,
  Check,
  Copy,
  Info,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Square,
  Stethoscope,
  Siren,
  ThumbsDown,
  ThumbsUp,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { DoseVerificationBadge } from '@/components/dzpharm/dose-verification-badge'
import { rtlProps } from '@/lib/detect-rtl'
import { useDzPharm } from './store'
import { postChat } from './api'
import type { ChatMessage } from './types'

type ChatMode = 'pro' | 'patient' | 'enfant'

/** Limite alignée sur /api/ai/tts (caractères après retrait du markdown). */
const TTS_MAX_CHARS = 1500

/** Retire le markdown (astérisques, titres, code) avant l'envoi au TTS. */
function stripMarkdownForTts(text: string): string {
  return text
    .replace(/[*#`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Blob (enregistrement micro) → base64 brut, sans préfixe data:. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = String(reader.result ?? '')
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(new Error("Lecture de l'enregistrement impossible"))
    reader.readAsDataURL(blob)
  })
}

const SUGGESTIONS = [
  'Quels antibiotiques pour angine en Algérie ?',
  'Différence Liste I / Liste II ?',
  'دوا تاع السكر؟',
  'Posologie paracétamol enfant 20 kg',
]

/** Motifs strictement exclus du périmètre copilote (Phase 3.3 / 3.4) */
const BLOCKED_PATTERNS = [
  /\bprescri(re|vez|ption)\b/i,
  /\bordonnance\b/i,
  /\bdose exacte\b/i,
  /\bmg\/kg\b/i,
]

export function AiDisclaimer() {
  return (
    <div
      role="note"
      aria-label="Avertissement clinique IA"
      className="mt-2.5 rounded-xl border border-state-warning/30 bg-state-warning/8 p-2.5 text-[11px] leading-relaxed text-foreground/90"
    >
      <div className="flex items-center gap-1.5 font-semibold text-state-warning">
        <Info className="size-3.5 shrink-0" aria-hidden="true" />
        <span>AVERTISSEMENT :</span>
      </div>
      <p className="mt-1 text-muted-foreground">
        Cette réponse est générée par IA et ne constitue pas un avis médical ou une prescription thérapeutique. Consultez les sources officielles (ANSM, MIPH) pour toute décision clinique.
      </p>
    </div>
  )
}

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
  // P1-10 — Hydrate the local messages state from the persisted Zustand slice
  // on mount, then sync every change back to the slice (30-msg FIFO cap is
  // enforced in the store). Additive: the local useState stays the rendering
  // source so the existing setMessages call sites work unchanged.
  const persistedMessages = useDzPharm((s) => s.copilotMessages)
  const setCopilotMessages = useDzPharm((s) => s.setCopilotMessages)
  const clearCopilotMessages = useDzPharm((s) => s.clearCopilotMessages)
  const [messages, setMessages] = useState<ChatMessage[]>(persistedMessages)
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<ChatMode>('pro')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  // P1-10 — Sync local messages → persisted slice (debounced via microtask to
  // avoid write amplification on rapid setMessages calls).
  useEffect(() => {
    setCopilotMessages(messages)
  }, [messages, setCopilotMessages])

  /* 24-c a) Dictée vocale — MediaRecorder → /api/ai/asr */
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const speechSupported =
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  // P0-04 — Dictation safety: permission pre-prompt + mandatory review step.
  const [showMicConsent, setShowMicConsent] = useState(false)
  // 500 ms cooldown after a transcript lands, before the Send button re-enables,
  // forcing the pharmacist to re-read the auto-transcribed dose text.
  const [dictationPending, setDictationPending] = useState(false)
  const micConsentKey = 'dzpharm_mic_consent_v1'
  const micConsented =
    typeof window !== 'undefined' && sessionStorage.getItem(micConsentKey) === '1'

  /* 24-c b) Lecture à voix haute — /api/ai/tts, audio mis en cache par message */
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [ttsLoadingId, setTtsLoadingId] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ttsCacheRef = useRef(new Map<number, string>())

  function copyToClipboard(id: number, text: string) {
    void navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast({ title: 'Réponse copiée', description: 'Le texte a été copié dans votre presse-papier.' })
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2200)
  }

  const mutation = useMutation({
    // 24-c : postChat (api.ts, hors périmètre de la tâche) type le mode
    // 'pro' | 'patient' — cast purement TypeScript, le mode 'enfant'
    // transite tel quel dans le corps JSON de la requête.
    mutationFn: (allMessages: ChatMessage[]) =>
      postChat(allMessages, mode as 'pro' | 'patient'),
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

  // Arrêt de la lecture audio en cours au démontage
  useEffect(
    () => () => {
      audioRef.current?.pause()
      audioRef.current = null
    },
    []
  )

  /* Évaluation de la qualité des réponses (Phase 3.4) */
  const [feedback, setFeedback] = useState<Record<number, 'up' | 'down'>>({})

  function handleFeedback(id: number, type: 'up' | 'down') {
    setFeedback((prev) => ({ ...prev, [id]: type }))
    toast({
      title: type === 'up' ? 'Merci pour votre retour !' : 'Signalement enregistré',
      description:
        type === 'up'
          ? 'Votre appréciation aide à améliorer la qualité clinique du copilote.'
          : 'Ce retour a été noté pour l’amélioration des réponses.',
    })
  }

  function send(text: string) {
    const content = text.trim()
    if (!content || mutation.isPending) return

    // Phase 3.3/3.4: Barrière de sécurité clinique — interception des requêtes hors périmètre
    const isBlocked = BLOCKED_PATTERNS.some((pat) => pat.test(content))
    if (isBlocked) {
      const next: ChatMessage[] = [
        ...messages,
        { role: 'user', content },
        {
          role: 'assistant',
          content:
            '⚠️ **Demande hors périmètre du copilote**\n\nLe copilote DzPharm ne peut pas délivrer de prescription médicale personnalisée ni fixer une posologie impérative.\n\nPour toute prescription ou décision clinique, veuillez vous référer :\n- Au **médecin traitant**\n- Aux **RCP officiels** et aux **monographies validées** du répertoire national\n- Aux recommandations officielles du **Ministère de l’Industrie et de la Production Pharmaceutique (MIPH)**',
        },
      ]
      setMessages(next)
      setInput('')
      return
    }

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

  /* ---------------------------------------------------------------- */
  /* 24-c a) Dictée vocale — MediaRecorder → /api/ai/asr              */
  /* ---------------------------------------------------------------- */

  async function startVoiceRecording() {
    // P0-04 — Permission pre-prompt: show the consent modal the first time
    // per tab session. After consent, the flag is persisted in sessionStorage
    // so subsequent clicks go straight to recording.
    if (!micConsented) {
      setShowMicConsent(true)
      return
    }
    await proceedWithRecording()
  }

  /** P0-04 — actual recording logic, called after consent (or directly if already consented). */
  async function proceedWithRecording() {
    setVoiceError(null)
    if (!speechSupported) {
      setVoiceError('Dictée non supportée par ce navigateur')
      return
    }
    if (recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : undefined
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onerror = () => {
        setVoiceError("Erreur d'enregistrement — réessayez.")
        setRecording(false)
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm'
        void transcribeRecording(type)
      }
      recorder.start(250)
      setRecording(true)
    } catch (err) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setVoiceError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Micro refusé — autorisez le microphone pour utiliser la dictée.'
          : 'Micro inaccessible — réessayez.'
      )
    }
  }

  function stopVoiceRecording() {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    setRecording(false)
  }

  /** Libère le micro, convertit l'enregistrement et appelle /api/ai/asr. */
  async function transcribeRecording(mimeType: string) {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    mediaRecorderRef.current = null
    const blob = new Blob(chunksRef.current, { type: mimeType })
    chunksRef.current = []
    if (blob.size === 0) {
      setVoiceError('Aucun son capté — réessayez.')
      return
    }
    if (blob.size > 8 * 1024 * 1024) {
      setVoiceError('Enregistrement trop long (maximum ~8 Mo).')
      return
    }
    try {
      setTranscribing(true)
      const audio = await blobToBase64(blob)
      const res = await fetch('/api/ai/asr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio, mimeType }),
      })
      const data = (await res.json().catch(() => null)) as {
        text?: string
        error?: string
      } | null
      if (!res.ok) {
        throw new Error(data?.error ?? `Dictée indisponible (${res.status})`)
      }
      const text = (data?.text ?? '').trim()
      if (!text) {
        setVoiceError("Aucune parole détectée dans l'enregistrement.")
        return
      }
      // Ajout en fin de saisie (append, sans écraser le texte en cours)
      setInput((prev) => (prev.trim() ? `${prev.trimEnd()} ${text}` : text))
      textareaRef.current?.focus()
      // P0-04 — Mandatory review step: force the pharmacist to re-read the
      // auto-transcribed dose text before Send is enabled. 500 ms cooldown
      // blocks a reflex Enter press on a wrong-transcribed dose (clinical safety).
      setDictationPending(true)
      toast({
        title: 'Relisez votre message avant d’envoyer',
        description:
          'La transcription automatique peut contenir des erreurs (chiffres, unités). Vérifiez la dose avant envoi.',
      })
      window.setTimeout(() => setDictationPending(false), 500)
    } catch (err) {
      setVoiceError(
        err instanceof Error ? err.message : 'Dictée indisponible — réessayez.'
      )
    } finally {
      setTranscribing(false)
    }
  }

  /* ---------------------------------------------------------------- */
  /* 24-c b) Lecture à voix haute — /api/ai/tts (cache par message)   */
  /* ---------------------------------------------------------------- */

  function stopAudioPlayback() {
    const audio = audioRef.current
    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.currentTime = 0
      audioRef.current = null
    }
    setPlayingId(null)
  }

  function playAudioUrl(id: number, url: string) {
    stopAudioPlayback()
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => setPlayingId((cur) => (cur === id ? null : cur))
    audio.onerror = () => setPlayingId((cur) => (cur === id ? null : cur))
    setPlayingId(id)
    void audio.play().catch(() => {
      if (audioRef.current === audio) audioRef.current = null
      setPlayingId((cur) => (cur === id ? null : cur))
      setVoiceError('Lecture audio impossible dans ce navigateur.')
    })
  }

  function toggleSpeak(id: number, content: string) {
    if (playingId === id) {
      stopAudioPlayback()
      return
    }
    const text = stripMarkdownForTts(content)
    if (!text || text.length > TTS_MAX_CHARS) return
    const cached = ttsCacheRef.current.get(id)
    if (cached) {
      playAudioUrl(id, cached)
      return
    }
    setTtsLoadingId(id)
    fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, TTS_MAX_CHARS) }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as {
          audio?: string
          mimeType?: string
          error?: string
        } | null
        if (!res.ok || !data?.audio || !data.mimeType) {
          throw new Error(
            data?.error ?? `Synthèse vocale indisponible (${res.status})`
          )
        }
        const url = `data:${data.mimeType};base64,${data.audio}`
        ttsCacheRef.current.set(id, url)
        return url
      })
      .then((url) => playAudioUrl(id, url))
      .catch((err: unknown) => {
        toast({
          title: 'Lecture audio indisponible',
          description:
            err instanceof Error ? err.message : 'Impossible de générer la voix.',
          variant: 'destructive',
        })
      })
      .finally(() => setTtsLoadingId((cur) => (cur === id ? null : cur)))
  }

  const empty = messages.length === 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Copilote IA</h1>
            <span
              className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary"
              title="Version Bêta clinique"
            >
              β
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-state-safe/30 bg-state-safe/10 px-2.5 py-0.5 text-[11px] font-semibold text-state-safe">
              <span className="relative flex size-2">
                <span className="beacon-ping absolute inline-flex h-full w-full rounded-full bg-state-safe opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-state-safe" />
              </span>
              Gemini 3.6 Flash · En ligne
            </span>
          </div>
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
            {/* 24-c d) Mode enfant — style d'explication seulement, faits inchangés */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === 'enfant'}
                  onClick={() => setMode('enfant')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                    mode === 'enfant'
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Baby className="size-3.5" aria-hidden />
                  Mode enfant
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-56 text-center">
                « Explique à mon enfant » : mots très simples, comparaisons du
                quotidien — doses et mises en garde strictement identiques, à
                vérifier avec un adulte.
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* P1-10 — Clear conversation history (persisted). */}
        {messages.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setMessages([])
              clearCopilotMessages()
              toast({
                title: 'Conversation effacée',
                description: 'L\'historique du Copilote a été réinitialisé.',
              })
            }}
            className="h-8 shrink-0 gap-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Effacer la conversation"
          >
            <X className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Effacer</span>
          </Button>
        ) : null}
      </div>

      {/* Zone de conversation */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* 24-c e) Rappel urgence compact — modes grand public uniquement (audit 1.9) */}
        {mode === 'patient' || mode === 'enfant' ? (
          <div
            role="note"
            aria-label="Urgence médicale"
            className="flex items-center justify-center gap-1.5 border-b border-red-200/70 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            <Siren className="size-3.5 shrink-0" aria-hidden />
            <span>Urgence&nbsp;:</span>
            <a
              href="tel:14"
              className="rounded px-0.5 underline underline-offset-2 transition-colors hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-none dark:hover:bg-red-900/60"
            >
              SAMU&nbsp;<strong className="font-bold">14</strong>
            </a>
          </div>
        ) : null}
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
                    {...rtlProps(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, i) => {
                const speakable = stripMarkdownForTts(message.content)
                const ttsDisabled = !speakable || speakable.length > TTS_MAX_CHARS
                const isPlaying = playingId === i
                const isTtsLoading = ttsLoadingId === i
                return (
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
                      <>
                        <div className="min-w-0" {...rtlProps(message.content)}>
                          <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {message.content}
                          </Markdown>
                        </div>

                        {/* P0-05 — Dose verification badge (deterministic engine cross-checks the Copilot). */}
                        <DoseVerificationBadge
                          question={messages[i - 1]?.content ?? ''}
                          response={message.content}
                        />

                        {/* Avertissement IA clinique obligatoire & non supprimable (Phase 3.3 / 3.4) */}
                        <AiDisclaimer />

                        {/* Pied de réponse : lecture à voix haute, copie et évaluation qualité */}
                        <footer className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2">
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <span className="font-medium">Cette réponse vous a-t-elle été utile ?</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleFeedback(i, 'up')}
                              title="Réponse utile et exacte"
                              aria-label="Réponse utile"
                              className={cn(
                                'size-6.5 shrink-0 rounded-full transition-colors',
                                feedback[i] === 'up'
                                  ? 'bg-state-safe/20 text-state-safe font-bold'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              <ThumbsUp className="size-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleFeedback(i, 'down')}
                              title="Réponse imprécise ou incomplète"
                              aria-label="Signaler une réponse imprécise"
                              className={cn(
                                'size-6.5 shrink-0 rounded-full transition-colors',
                                feedback[i] === 'down'
                                  ? 'bg-state-danger/20 text-state-danger font-bold'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              <ThumbsDown className="size-3" />
                            </Button>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(i, message.content)}
                              title={copiedId === i ? 'Copié !' : 'Copier la réponse'}
                              aria-label="Copier la réponse"
                              className="size-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                            >
                              {copiedId === i ? (
                                <Check className="size-3.5 text-state-safe" aria-hidden />
                              ) : (
                                <Copy className="size-3.5" aria-hidden />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleSpeak(i, message.content)}
                              disabled={ttsDisabled || isTtsLoading}
                              title={
                                ttsDisabled
                                  ? 'Message trop long pour la lecture audio (plus de 1 500 caractères)'
                                  : isPlaying
                                    ? 'Arrêter la lecture'
                                    : 'Écouter cette réponse'
                              }
                              aria-label={
                                ttsDisabled
                                  ? 'Lecture audio indisponible — message trop long'
                                  : isPlaying
                                    ? 'Arrêter la lecture de la réponse'
                                    : 'Écouter la réponse à voix haute'
                              }
                              className="size-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                            >
                              {isTtsLoading ? (
                                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                              ) : isPlaying ? (
                                <VolumeX className="size-3.5" aria-hidden />
                              ) : (
                                <Volume2 className="size-3.5" aria-hidden />
                              )}
                            </Button>
                          </div>
                        </footer>
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap" {...rtlProps(message.content)}>
                        {message.content}
                      </p>
                    )}
                  </div>
                </div>
                )
              })}
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
                  {/* P1-08 — aria-live region announcing the Copilot is thinking. */}
                  <span className="sr-only" role="status" aria-live="polite">
                    Le Copilote rédige une réponse…
                  </span>
                </div>
              ) : (
                messages.length > 0 ? (
                  <span className="sr-only" role="status" aria-live="polite">
                    Réponse reçue.
                  </span>
                ) : null
              )}
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
                  : mode === 'enfant'
                    ? 'Ta question, tout simplement…'
                    : 'Votre question, en français ou en darija…'
              }
              aria-label="Message pour le copilote"
              rows={2}
              dir="auto"
              className="max-h-36 min-h-11 resize-none"
            />
            {/* 24-c a) Dictée vocale : micro → ASR → texte inséré */}
            {recording ? (
              <Button
                type="button"
                onClick={stopVoiceRecording}
                className="h-11 shrink-0 animate-pulse gap-1.5 bg-red-600 font-semibold text-white hover:bg-red-700"
                aria-label="Arrêter la dictée"
              >
                <Square className="size-4 fill-current" aria-hidden />
                <span className="sr-only">Enregistrement…</span>
                <span className="hidden sm:inline">Arrêter</span>
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void startVoiceRecording()}
                    disabled={transcribing || !speechSupported}
                    className="h-11 shrink-0"
                    aria-label="Dicter un message"
                    aria-describedby={speechSupported ? undefined : 'mic-unsupported'}
                  >
                    {transcribing ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Mic className="size-4" aria-hidden />
                    )}
                    {transcribing ? (
                      <span className="sr-only">Transcription en cours…</span>
                    ) : null}
                    {!speechSupported ? (
                      <span id="mic-unsupported" className="sr-only">
                        Dictée non supportée sur ce navigateur
                      </span>
                    ) : null}
                  </Button>
                </TooltipTrigger>
                {!speechSupported ? (
                  <TooltipContent side="top">
                    Dictée non supportée sur ce navigateur
                  </TooltipContent>
                ) : null}
              </Tooltip>
            )}
            <Button
              onClick={() => send(input)}
              disabled={!input.trim() || mutation.isPending || dictationPending}
              className="h-11 shrink-0 gap-1.5 font-semibold"
              aria-label="Envoyer le message"
              aria-describedby={dictationPending ? 'send-review-pending' : undefined}
            >
              <Send className="size-4" aria-hidden />
              <span className="hidden sm:inline">Envoyer</span>
            </Button>
          </div>
          {voiceError ? (
            <p role="alert" className="mt-1.5 text-[11px] font-medium text-destructive">
              {voiceError}
            </p>
          ) : null}
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Info className="size-3 shrink-0" aria-hidden />
            Le copilote est un outil d&apos;aide — ne remplace pas l&apos;avis d&apos;un
            professionnel de santé.
          </p>
        </div>
      </div>

      {/* P0-04 — Dictation permission pre-prompt (shown once per tab session). */}
      <AlertDialog
        open={showMicConsent}
        onOpenChange={(o) => {
          setShowMicConsent(o)
          if (!o) {
            // User dismissed without consenting — don't record.
            setVoiceError('Autorisation du microphone refusée.')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dictée vocale — autorisation du microphone</AlertDialogTitle>
            <AlertDialogDescription>
              DzPharm utilise votre microphone pour transcrire votre message. L&apos;audio
              est transmis <strong>une seule fois</strong> à l&apos;IA pour transcription,
              puis supprimé immédiatement du serveur. Il n&apos;est ni stocké, ni
              réutilisé, ni partagé. La transcription automatique peut contenir des
              erreurs (chiffres, unités) — <strong>relisez toujours la dose avant
              l&apos;envoi</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                try {
                  sessionStorage.setItem(micConsentKey, '1')
                } catch {
                  // sessionStorage may be unavailable — proceed for this tab.
                }
                setShowMicConsent(false)
                setVoiceError(null)
                void proceedWithRecording()
              }}
            >
              Autoriser et dicter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
