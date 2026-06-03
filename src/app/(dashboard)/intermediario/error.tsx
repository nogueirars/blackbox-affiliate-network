'use client'

export default function IntermediarioError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-[var(--color-on-surface-variant)]">
      <span className="material-symbols-outlined text-[48px] opacity-40">error</span>
      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--color-on-surface)] mb-1">Erro ao carregar a página</p>
        <p className="text-xs opacity-60">{error.message || 'Ocorreu um erro inesperado.'}</p>
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/20 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  )
}
