"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Pill, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirectTo");
  const redirectTo = rawRedirect && rawRedirect.startsWith("/") ? rawRedirect : "/";

  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // P2-21 — Redirection immédiate si déjà authentifié
  useEffect(() => {
    async function checkExistingSession() {
      try {
        const res = await fetch("/api/auth/verify");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            if (typeof window !== "undefined") {
              sessionStorage.setItem("dzpharm_session", "active");
            }
            router.replace(redirectTo);
          }
        }
      } catch {
        // En cas d'erreur réseau, rester sur la page de connexion
      }
    }
    void checkExistingSession();
  }, [router, redirectTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setError("Veuillez saisir votre mot de passe d'accès.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Active la session dans sessionStorage pour la durée de vie de l'onglet
        if (typeof window !== "undefined") {
          sessionStorage.setItem("dzpharm_session", "active");
        }
        router.replace(redirectTo);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Mot de passe incorrect. Veuillez réessayer.");
      }
    } catch {
      setError("Erreur de connexion. Vérifiez votre réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      id="main-content"
      className="relative min-h-screen flex flex-col items-center justify-center bg-background px-4 overflow-hidden selection:bg-primary/20"
    >
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-foreground"
      >
        Aller au contenu principal
      </a>

      {/* Ambient background mesh glow */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_50%_at_50%_25%,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_75%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_35%_at_80%_80%,color-mix(in_srgb,var(--chifa)_8%,transparent),transparent_75%)]"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md space-y-7">
        {/* Brand Icon & Platform Badge */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative flex items-center justify-center size-16 rounded-3xl bg-gradient-to-br from-primary via-sky-600 to-primary/80 shadow-xl shadow-primary/25 ring-8 ring-primary/10">
            <Pill className="size-8 text-primary-foreground" aria-hidden="true" />
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-state-safe text-[9px] font-bold text-white shadow-xs">
              <ShieldCheck className="size-2.5" aria-hidden="true" />
            </span>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-[11px] font-semibold text-primary">
              <Sparkles className="size-3" aria-hidden="true" />
              <span>Portail Professionnel Sécurisé</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Dz<span className="bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">Pharm</span>
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              Référentiel Pharmaceutique Algérien
            </p>
          </div>
        </div>

        {/* Executive Vault Card */}
        <section
          aria-labelledby="auth-card-title"
          className="glass-panel rounded-3xl p-7 shadow-2xl shadow-black/10 sm:p-8"
        >
          <div
            id="auth-card-title"
            className="mb-6 flex items-center gap-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            <Lock className="size-3.5 text-primary" aria-hidden="true" />
            <span>Authentification du poste</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4.5">
            <div className="space-y-1.5">
              <label
                htmlFor="access-password"
                className="block text-xs font-medium text-foreground/90"
              >
                Mot de passe d&apos;accès
              </label>
              <div className="relative">
                <Input
                  id="access-password"
                  name="password"
                  type={show ? "text" : "password"}
                  placeholder="Entrez votre mot de passe…"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  autoFocus
                  autoComplete="current-password"
                  enterKeyHint="go"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "pw-error" : undefined}
                  className="h-12 rounded-xl bg-background/80 pe-11 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute end-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-foreground transition-colors p-1 rounded-md"
                  tabIndex={-1}
                  aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {error ? (
              <p
                role="alert"
                id="pw-error"
                aria-live="assertive"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-center text-xs font-semibold text-destructive animate-in fade-in-50"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              title={password ? "Accéder à la plateforme" : "Saisissez votre mot de passe pour continuer"}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25 hover:bg-primary/90 transition-all active:scale-[0.99] disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  <span>Vérification sécurisée…</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="size-4" aria-hidden="true" />
                  <span>Accéder à la plateforme</span>
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-border/60 text-center">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              9&nbsp;555 médicaments officiels · Base de données chiffrée · Nomenclature Juin 2026
            </p>
          </div>
        </section>

        {/* Security assurance note */}
        <p className="text-center text-xs text-muted-foreground/80">
          En cas d&apos;oubli du mot de passe, contactez l&apos;administrateur de l&apos;officine ou du service.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
          Chargement de l&apos;accès sécurisé…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
