export function initials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function fmtDateLong(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="animate-spin" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="17 9" />
    </svg>
  )
}

export function Field({ label, value, onChange, placeholder, required, mono, type = 'text', hint }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; required?: boolean; mono?: boolean; type?: string; hint?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.7 }}>
        {label}{required && <span style={{ color: 'var(--color-error)' }}> *</span>}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg px-3 py-2 text-sm border outline-none transition-colors focus:border-[var(--color-primary)] ${mono ? 'font-mono' : ''}`}
        style={{ background: 'var(--color-surface-container)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
      />
      {hint && <p className="text-[10px] opacity-50" style={{ color: 'var(--color-on-surface-variant)' }}>{hint}</p>}
    </div>
  )
}

export function Select({ label, value, onChange, options, required }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.7 }}>
        {label}{required && <span style={{ color: 'var(--color-error)' }}> *</span>}
      </label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm border outline-none transition-colors focus:border-[var(--color-primary)]"
        style={{ background: 'var(--color-surface-container)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
      >
        <option value="">— Selecione —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] uppercase tracking-wider opacity-60"
        style={{ color: 'var(--color-on-surface-variant)' }}>{label}</p>
      <p className={`text-sm font-medium ${mono ? 'font-mono text-xs' : ''}`}
        style={{ color: 'var(--color-on-surface)' }}>{value || '—'}</p>
    </div>
  )
}
