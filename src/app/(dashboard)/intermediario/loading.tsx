export default function IntermediarioLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-[var(--color-surface-container-high)]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-5 rounded-2xl h-24 bg-[var(--color-surface-container-high)]" />
        ))}
      </div>
      <div className="glass-card rounded-2xl h-64 bg-[var(--color-surface-container-high)]" />
    </div>
  )
}
