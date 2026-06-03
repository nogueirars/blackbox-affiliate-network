'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard error boundary]', error)
  }, [error])

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
      style={{ padding: '2rem', textAlign: 'center' }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 48, color: 'var(--color-error)', opacity: 0.7 }}
      >
        error_outline
      </span>
      <div>
        <h2
          className="font-semibold mb-2"
          style={{ fontSize: '1.25rem', color: 'var(--color-on-surface)' }}
        >
          Erro ao carregar a página
        </h2>
        <p
          style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', maxWidth: 360 }}
        >
          Ocorreu um erro inesperado. Tente recarregar — se persistir, entre em contato com o suporte.
        </p>
        {error?.digest && (
          <p style={{ fontSize: '11px', color: 'var(--color-outline)', marginTop: 8 }}>
            Código: {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="cursor-pointer"
        style={{
          background: 'var(--color-primary-container)',
          color: 'var(--color-on-primary)',
          border: 'none',
          borderRadius: 10,
          padding: '10px 24px',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        Tentar novamente
      </button>
    </div>
  )
}
