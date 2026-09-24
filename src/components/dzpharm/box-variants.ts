/**
 * D-04 — 12 Box Variants (Design Universe Section 5.1).
 * Du standard au glassmorphism, ces variantes structurent toutes les fiches,
 * alertes, héros et panneaux de la plateforme DzPharm.
 */

export const BOX_VARIANTS = {
  /** 1. Standard Card — Cartes de tableau de bord, sections de détail, messages */
  standard: 'bg-card text-card-foreground border border-border/80 shadow-xs rounded-xl',

  /** 2. Accent Card — Médicament actif, mode sélectionné, résultat mis en avant */
  accent: 'bg-card text-card-foreground border border-border/80 border-l-[3.5px] border-l-primary shadow-xs rounded-xl',

  /** 3. Glow Card — Logo, section d'accueil, réponse de l'assistant IA */
  glow: 'bg-card text-card-foreground border border-primary/30 shadow-[0_0_24px_-4px_rgba(14,165,233,0.22)] dark:shadow-[0_0_28px_-4px_rgba(14,165,233,0.32)] rounded-xl',

  /** 4. Glassmorphism Card — Barre de commandes Cmd+K, modales rapides, notifications */
  glass: 'bg-card/65 dark:bg-card/45 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg rounded-2xl',

  /** 5. Neumorphism Card — Interrupteurs tactiles, commutateur de nuancier, pastilles */
  neumorphism: 'bg-background border border-border/40 shadow-[4px_4px_12px_rgba(0,0,0,0.06),-4px_-4px_12px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_14px_rgba(0,0,0,0.35),-4px_-4px_14px_rgba(255,255,255,0.02)] rounded-xl',

  /** 6. Outline Card — Cartes d'appel à l'action, tutoriels, invites */
  outline: 'bg-transparent border-2 border-primary/60 text-foreground shadow-xs rounded-xl',

  /** 7. Danger Card — Alertes d'interactions contre-indiquées, retraits de marché */
  danger: 'bg-destructive/5 text-card-foreground border border-destructive/30 border-l-[3.5px] border-l-destructive shadow-xs rounded-xl',

  /** 8. Success Card — Fiche validée, aucune interaction, disponibilité confirmée */
  success: 'bg-emerald-500/5 text-card-foreground border border-emerald-500/30 border-l-[3.5px] border-l-emerald-600 dark:border-l-emerald-400 shadow-xs rounded-xl',

  /** 9. Warning Card — Vigilance modérée, rupture partielle, expiration imminente */
  warning: 'bg-amber-500/5 text-card-foreground border border-amber-500/30 border-l-[3.5px] border-l-amber-500 shadow-xs rounded-xl',

  /** 10. Info Card — Recommandations cliniques, conseils d'usage, astuces */
  info: 'bg-sky-500/5 text-card-foreground border border-sky-500/30 border-l-[3.5px] border-l-sky-500 shadow-xs rounded-xl',

  /** 11. Minimal Card — Listes denses, lignes de résultats, historique épuré */
  minimal: 'bg-transparent border-0 border-b border-border/70 rounded-none shadow-none p-3',

  /** 12. Hero Card — Bannière principale, bienvenue copilote, synthèse */
  hero: 'bg-gradient-to-br from-primary/10 via-chifa/5 to-transparent border border-primary/25 shadow-md rounded-2xl',
} as const

export type BoxVariant = keyof typeof BOX_VARIANTS
