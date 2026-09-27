"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Pill, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirectTo");
  const redirectTo = rawRedirect && rawRedirect.startsWith("/") ? rawRedirect : "/";

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("dzpharm_session", "active");
      // Immediate direct redirect to destination
      window.location.replace(redirectTo);
    }
  }, [redirectTo]);

  const handleEnter = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("dzpharm_session", "active");
      window.location.replace(redirectTo);
    }
  };

  return (
    <main
      id="main-content"
      className="relative min-h-screen flex flex-col items-center justify-center bg-background px-4 overflow-hidden selection:bg-primary/20"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_50%_at_50%_25%,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_75%)]"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md space-y-7 text-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative flex items-center justify-center size-16 rounded-3xl bg-gradient-to-br from-primary via-sky-600 to-primary/80 shadow-xl shadow-primary/25 ring-8 ring-primary/10">
            <Pill className="size-8 text-primary-foreground" aria-hidden="true" />
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-state-safe text-[9px] font-bold text-white shadow-xs">
              <ShieldCheck className="size-2.5" aria-hidden="true" />
            </span>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-[11px] font-semibold text-primary">
              <Sparkles className="size-3" aria-hidden="true" />
              <span>Accès Libre · DzPharm</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Dz<span className="bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">Pharm</span>
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              Redirection en cours vers la plateforme…
            </p>
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleEnter}
            className="w-full h-12 text-sm font-semibold rounded-2xl gap-2 shadow-lg shadow-primary/20"
          >
            <span>Accéder directement à DzPharm</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
          Chargement…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
