const S = 'animate-pulse rounded-lg bg-[var(--color-surface-container-high,#252535)]'

function Bar({ w = 'w-full', h = 'h-4', className = '' }: { w?: string; h?: string; className?: string }) {
  return <div className={`${S} ${w} ${h} ${className}`} />
}

function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* thead */}
      <div className="flex gap-6 px-6 py-3" style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Bar key={i} w="w-24" h="h-3" />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-6 py-4" style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
          <Bar w="w-32" h="h-4" />
          <Bar w="w-40" h="h-4" />
          <Bar w="w-20" h="h-4" />
          {cols > 3 && <Bar w="w-24" h="h-4" />}
          {cols > 4 && <Bar w="w-16" h="h-6 rounded-full" />}
        </div>
      ))}
    </div>
  )
}

function KpiCards({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-4 grid-cols-2 md:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-5 flex flex-col gap-3">
          <Bar w="w-24" h="h-3" />
          <Bar w="w-16" h="h-7" />
          <Bar w="w-32" h="h-3" />
        </div>
      ))}
    </div>
  )
}

function PageHeader({ hasButton = true, wide = false }: { hasButton?: boolean; wide?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Bar w={wide ? 'w-64' : 'w-40'} h="h-8" />
        <Bar w="w-48" h="h-4" />
      </div>
      {hasButton && <Bar w="w-36" h="h-10" className="rounded-xl" />}
    </div>
  )
}

// ── Exports ───────────────────────────────────────────────────────────────────

export function TablePageSkeleton({ rows = 8, cols = 6, kpis = 0 }: { rows?: number; cols?: number; kpis?: number }) {
  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <PageHeader />
      {kpis > 0 && <KpiCards count={kpis} />}
      <TableSkeleton rows={rows} cols={cols} />
    </div>
  )
}

export function DetailPageSkeleton() {
  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <PageHeader wide />
      <KpiCards count={4} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="glass-card rounded-xl p-6 flex flex-col gap-4">
            <Bar w="w-32" h="h-5" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex justify-between">
                <Bar w="w-28" h="h-4" />
                <Bar w="w-24" h="h-4" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <TableSkeleton rows={5} cols={5} />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <PageHeader hasButton={false} wide />
      <KpiCards count={4} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-6 flex flex-col gap-3">
          <Bar w="w-32" h="h-5" />
          <Bar w="w-full" h="h-40" />
        </div>
        <div className="glass-card rounded-xl p-6 flex flex-col gap-3">
          <Bar w="w-32" h="h-5" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Bar w="w-36" h="h-4" />
              <Bar w="w-20" h="h-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProducaoSkeleton() {
  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <PageHeader />
      {/* filters bar */}
      <div className="glass-card rounded-xl p-4 flex gap-3 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bar key={i} w="w-32" h="h-9" className="rounded-lg" />
        ))}
      </div>
      {/* tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Bar key={i} w="w-36" h="h-10" className="rounded-lg" />
        ))}
      </div>
      <div className="glass-card rounded-xl p-6 flex items-center justify-center" style={{ height: '300px' }}>
        <Bar w="w-48" h="h-6" />
      </div>
    </div>
  )
}

export function SimpleCardSkeleton() {
  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <PageHeader hasButton={false} />
      <div className="glass-card rounded-xl p-6 flex flex-col gap-4 max-w-2xl">
        <Bar w="w-48" h="h-5" />
        <Bar w="w-full" h="h-4" />
        <Bar w="w-3/4" h="h-4" />
        <Bar w="w-36" h="h-10" className="rounded-xl mt-2" />
      </div>
    </div>
  )
}
