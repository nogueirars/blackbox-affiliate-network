export default function Loading() {
  return (
    <div className="animate-fade-in flex flex-col gap-5">
      {/* Header matching page.tsx */}
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Casas de Aposta</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          Gerencie as integrações e regras das casas de aposta
        </p>
      </div>

      <div className="flex flex-col gap-5 mt-1">
        {/* Toolbar Skeleton matching CasasClient.tsx */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-64 bg-[var(--color-surface-container-high)] rounded animate-pulse" />
          <div className="h-10 w-32 bg-[var(--color-surface-container-high)] rounded-xl animate-pulse" />
        </div>

        {/* Grid Skeleton matching IntegracoesTab.tsx */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl flex flex-col min-h-[200px] p-5 gap-4" style={{ background: 'var(--color-surface-container)', border: '1px solid var(--color-outline-variant)' }}>
              <div className="flex items-start justify-between gap-3">
                 <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-container-highest)] animate-pulse" />
                 <div className="w-16 h-6 rounded-full bg-[var(--color-surface-container-highest)] animate-pulse" />
              </div>
              <div className="h-5 w-3/4 rounded bg-[var(--color-surface-container-highest)] animate-pulse mt-1" />
              
              <div className="flex flex-col gap-2 pt-4 mt-auto border-t border-[var(--color-outline-variant)]">
                 <div className="h-4 w-1/2 rounded bg-[var(--color-surface-container-highest)] animate-pulse" />
                 <div className="flex gap-2 mt-1">
                   <div className="h-6 w-20 rounded-md bg-[var(--color-surface-container-highest)] animate-pulse" />
                   <div className="h-6 w-20 rounded-md bg-[var(--color-surface-container-highest)] animate-pulse" />
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
