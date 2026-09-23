'use client'

import { useState, useCallback, useRef } from 'react'
import type { ChatMessage } from '@/components/dzpharm/types'

/**
 * P1-06 — Client-side SSE streaming hook for the Copilot.
 * Additive parallel path to the batch postChat() client. Gated on
 * NEXT_PUBLIC_FEATURE_COPILOT_STREAM — when off, the copilot-view falls back
 * to the batch useMutation path.
 *
 * Usage:
 *   const { send, isStreaming, stop, error } = useChatStream()
 *   await send(messages, mode)  // streams tokens via onDelta callback
 *
 * The hook does NOT own message state — the caller does (so it composes with
 * the P1-10 Zustand persist slice). The caller passes an onDelta callback
 * that appends each token to the assistant message bubble.
 */
export function useChatStream() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setIsStreaming(false)
  }, [])

  const send = useCallback(
    async (
      messages: ChatMessage[],
      mode: 'pro' | 'patient' | 'enfant',
      onDelta: (delta: string) => void,
      onDone?: (fullText: string) => void,
      onError?: (message: string) => void,
    ) => {
      setError(null)
      setIsStreaming(true)
      const controller = new AbortController()
      abortRef.current = controller
      let fullText = ''

      try {
        const res = await fetch('/api/ai/chat-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, mode }),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) {
          throw new Error(`Streaming indisponible (${res.status})`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const jsonStr = trimmed.slice(5).trim()
            if (!jsonStr) continue
            try {
              const chunk = JSON.parse(jsonStr)
              if (chunk.delta) {
                fullText += chunk.delta
                onDelta(chunk.delta)
              } else if (chunk.done) {
                onDone?.(fullText)
              } else if (chunk.error) {
                throw new Error(chunk.error)
              }
            } catch (e) {
              // Partial JSON — skip; the next chunk completes it.
              // But if it's a real error (not JSON), rethrow.
              if (e instanceof SyntaxError) continue
              throw e
            }
          }
        }
        onDone?.(fullText)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // User pressed stop — not an error.
          onDone?.(fullText)
        } else {
          const message =
            err instanceof Error ? err.message : 'Streaming échoué'
          setError(message)
          onError?.(message)
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [],
  )

  return { send, isStreaming, error, stop }
}
