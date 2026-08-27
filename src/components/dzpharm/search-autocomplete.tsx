'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchDrugs } from './api'
import type { Drug } from './types'
import { StatusBadge } from './status-badge'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

interface SearchAutocompleteProps {
  onSelect: (drug: Drug) => void
  /** Appelé sur Entrée sans suggestion active (ex : aller au répertoire). */
  onSubmitQuery?: (query: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  autoFocus?: boolean
  size?: 'default' | 'hero'
  inputRef?: React.RefObject<HTMLInputElement | null>
  id?: string
  ariaLabel?: string
  /** Contenu à droite de l'input (ex : hint clavier). */
  rightHint?: React.ReactNode
}

export function SearchAutocomplete({
  onSelect,
  onSubmitQuery,
  placeholder = 'Rechercher un médicament, une DCI, un laboratoire…',
  className,
  inputClassName,
  autoFocus = false,
  size = 'default',
  inputRef,
  id,
  ariaLabel = 'Rechercher un médicament',
  rightHint,
}: SearchAutocompleteProps) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const internalRef = useRef<HTMLInputElement>(null)
  const debounced = useDebounce(value, 300)
  const trimmed = debounced.trim()

  const { data, isFetching } = useQuery({
    queryKey: ['drugs', 'autocomplete', trimmed],
    queryFn: ({ signal }) =>
      fetchDrugs({ q: trimmed, pageSize: 8, sort: 'relevance' }, signal),
    enabled: trimmed.length >= 2,
    placeholderData: keepPreviousData,
  })

  const results = useMemo(() => data?.drugs ?? [], [data])

  // Fermeture au clic extérieur
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const isOpen = open && trimmed.length >= 2

  function select(drug: Drug) {
    onSelect(drug)
    setValue('')
    setOpen(false)
    internalRef.current?.blur()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp' && results.length > 0) {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (isOpen && activeIndex >= 0 && results[activeIndex]) {
        select(results[activeIndex])
      } else if (onSubmitQuery && value.trim()) {
        onSubmitQuery(value.trim())
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const hero = size === 'hero'

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-card text-foreground shadow-sm transition-colors',
          'border-border focus-within:border-primary/60 focus-within:ring-primary/20 focus-within:ring-4',
          hero ? 'h-14 px-4' : 'h-11 px-3.5'
        )}
      >
        <Search
          className={cn('shrink-0 text-muted-foreground', hero ? 'size-5' : 'size-4')}
          aria-hidden
        />
        <input
          id={id}
          ref={inputRef ?? internalRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={id ? `${id}-listbox` : undefined}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setActiveIndex(-1)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'w-full bg-transparent outline-none placeholder:text-muted-foreground/70',
            hero ? 'text-base md:text-lg' : 'text-sm'
          )}
        />
        {isFetching && isOpen ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          rightHint
        )}
      </div>

      {isOpen && (
        <div
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="scroll-thin absolute inset-x-0 top-full z-50 mt-2 max-h-[22rem] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl shadow-black/10"
        >
          {results.length === 0 && !isFetching ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Aucun médicament trouvé pour «&nbsp;{trimmed}&nbsp;»
            </p>
          ) : (
            results.map((drug, i) => (
              <button
                key={drug.id}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onClick={() => select(drug)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  i === activeIndex ? 'bg-primary/10' : 'hover:bg-accent'
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {drug.brand}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {drug.dci}
                    {drug.dosage ? ` · ${drug.dosage}` : ''}
                  </span>
                </span>
                <StatusBadge status={drug.status} className="shrink-0" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
