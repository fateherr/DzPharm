'use client'

import { useMemo } from 'react'
import { CheckCircle2, AlertTriangle, HelpCircle, Info } from 'lucide-react'
import { verifyDose, type VerificationStatus } from '@/lib/dose-engine'
import { cn } from '@/lib/utils'

/**
 * P0-05 — Dose verification badge.
 * Renders after every assistant Copilot response. Runs the deterministic
 * dose-engine.ts verifier against (question, response) and shows:
 *   ✓ Vérifié      (engine agrees with Copilot within 5 %)
 *   ⚠️ MISMATCH    (engine disagrees by >5 % — manual check required)
 *   ⚠️ UNPARSEABLE (engine can't read weight/age/dose — manual check required)
 *   ℹ️ N/A         (no mg/kg arithmetic to verify — band-based or unknown drug)
 *
 * The badge is NON-SUPPRESSIBLE (clinical-safety invariant). The Copilot's
 * word is never the sole source of a dose calculation.
 *
 * @see src/lib/dose-engine.ts
 */
const STATUS_STYLE: Record<VerificationStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  VERIFIED: { icon: CheckCircle2, className: 'border-state-safe/40 bg-state-safe/10 text-state-safe', label: 'Vérifié' },
  MISMATCH: { icon: AlertTriangle, className: 'border-state-danger/50 bg-state-danger/10 text-state-danger', label: 'Vérification requise' },
  UNPARSEABLE: { icon: AlertTriangle, className: 'border-state-warning/50 bg-state-warning/10 text-state-warning', label: 'Vérification manuelle' },
  NOT_APPLICABLE: { icon: Info, className: 'border-border bg-muted/40 text-muted-foreground', label: 'Info' },
};

export function DoseVerificationBadge({
  question,
  response,
}: {
  question: string;
  response: string;
}) {
  // Pure deterministic computation — safe to memoize client-side. No LLM call.
  const verification = useMemo(
    () => verifyDose(question, response),
    [question, response],
  );

  const style = STATUS_STYLE[verification.status];
  const Icon = style.icon;

  return (
    <aside
      role="status"
      aria-live="polite"
      className={cn(
        'mt-2.5 flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] leading-snug',
        style.className,
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {style.label}
          {verification.drug ? ` — ${verification.drug.dci}` : null}
        </p>
        <p className="mt-0.5 text-[10.5px] opacity-90">{verification.message}</p>
      </div>
    </aside>
  );
}

/** Re-export for tests / other consumers. */
export { verifyDose } from '@/lib/dose-engine';
