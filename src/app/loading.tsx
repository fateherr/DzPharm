import { CapsuleLoader } from '@/components/dzpharm/capsule-loader'

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center p-8">
      <CapsuleLoader
        size="lg"
        label="Chargement de DzPharm…"
        sublabel="Interrogation du référentiel pharmaceutique national (9 555 spécialités)"
      />
    </div>
  )
}
