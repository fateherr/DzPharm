"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Pill, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.replace("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Mot de passe incorrect");
      }
    } catch {
      setError("Erreur de connexion. Vérifiez votre réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background px-4 overflow-hidden selection:bg-primary/20">
      {/* Ambient background mesh glow */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_50%_at_50%_25%,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_75%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_35%_at_80%_80%,color-mix(in_srgb,var(--chifa)_8%,transparent),transparent_75%)]"
        aria-hidden
      />

      <div className="relative w-full max-w-md space-y-7">
        {/* Brand Icon & Platform Badge */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative flex items-center justify-center size-16 rounded-3xl bg-gradient-to-br from-primary via-sky-600 to-primary/80 shadow-xl shadow-primary/25 ring-8 ring-primary/10">
            <Pill className="size-8 text-primary-foreground" />
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-state-safe text-[9px] font-bold text-white shadow-xs">
              <ShieldCheck className="size-2.5" />
            </span>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-[11px] font-semibold text-primary">
              <Sparkles className="size-3" />
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
        <div className="glass-panel rounded-3xl p-7 shadow-2xl shadow-black/10 sm:p-8">
          <div className="mb-6 flex items-center gap-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Lock className="size-3.5 text-primary" />
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
                  type={show ? "text" : "password"}
                  placeholder="Entrez votre mot de passe…"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  autoComplete="current-password"
                  className="h-12 rounded-xl bg-background/80 pr-11 text-sm font-medium transition-all focus-visible:ring-primary/25"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-foreground transition-colors p-1 rounded-md"
                  tabIndex={-1}
                  aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-center text-xs font-semibold text-destructive animate-in fade-in-50"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25 hover:bg-primary/90 transition-all active:scale-[0.99]"
              disabled={loading || !password}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  <span>Vérification sécurisée…</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="size-4" />
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
        </div>

        {/* Security assurance note */}
        <p className="text-center text-xs text-muted-foreground/80">
          En cas d&apos;oubli du mot de passe, contactez l&apos;administrateur de l&apos;officine ou du service.
        </p>
      </div>
    </div>
  );
}
