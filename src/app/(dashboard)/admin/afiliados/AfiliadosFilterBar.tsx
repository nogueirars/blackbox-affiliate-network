'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  q: string
  role: string
  status: string
  origem: string
}

const ROLES = [
  { value: '', label: 'Todas Funções' },
  { value: 'AFILIADO', label: 'Afiliado' },
  { value: 'GERENTE', label: 'Gerente' },
  { value: 'INTERMEDIARIO', label: 'Intermediário' },
]

const STATUSES = [
  { value: 'TODOS', label: 'Todos Status' },
  { value: 'APROVADOS', label: 'Aprovados' },
  { value: 'PENDENTES_D', label: 'Pendentes (diretos)' },
  { value: 'PENDENTES_S', label: 'Pendentes (subs)' },
  { value: 'BLOQUEADOS', label: 'Bloqueados' },
]

function buildHref(params: { q: string; role: string; status: string; origem: string; page: string }) {
  const entries: string[] = []
  if (params.status && params.status !== 'TODOS') entries.push(`status=${params.status}`)
  if (params.origem && params.origem !== 'TODOS') entries.push(`origem=${params.origem}`)
  if (params.role) entries.push(`role=${params.role}`)
  if (params.q) entries.push(`q=${encodeURIComponent(params.q)}`)
  if (params.page !== '1') entries.push(`page=${params.page}`)
  return `/admin/afiliados${entries.length ? '?' + entries.join('&') : ''}`
}

export default function AfiliadosFilterBar({ q, role, status, origem }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)

  function search(newQ: string, newRole: string, newStatus: string) {
    router.push(buildHref({ q: newQ, role: newRole, status: newStatus, origem, page: '1' }))
  }

  function handleExportCSV() {
    setExporting(true)
    // Build current query params for CSV export
    const qs = new URLSearchParams()
    if (status && status !== 'TODOS') qs.set('status', status)
    if (origem && origem !== 'TODOS') qs.set('origem', origem)
    if (role) qs.set('role', role)
    if (q) qs.set('q', q)
    qs.set('format', 'csv')
    // Trigger download — endpoint can be added later
    const link = document.createElement('a')
    link.href = `/api/admin/afiliados/export?${qs.toString()}`
    link.download = 'afiliados.csv'
    link.click()
    setTimeout(() => setExporting(false), 1500)
  }

  const hasFilters = !!(q || role || (status && status !== 'TODOS'))

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search input */}
      <div className="relative flex-1 min-w-[220px]">
        <span
          className="material-symbols-outlined absolute text-[17px] pointer-events-none"
          style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)' }}
        >
          search
        </span>
        <input
          ref={inputRef}
          defaultValue={q}
          placeholder="Buscar por nome, email ou ID API"
          className="w-full outline-none bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-xl text-sm px-4 py-2.5 pl-10 text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:border-[var(--color-primary)] transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              search(inputRef.current?.value ?? q, role, status)
            }
          }}
        />
      </div>

      {/* Status dropdown */}
      <div className="relative">
        <select
          value={status}
          onChange={(e) => search(inputRef.current?.value ?? q, role, e.target.value)}
          className="appearance-none outline-none bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-xl text-sm px-4 py-2.5 pr-9 text-[var(--color-on-surface)] cursor-pointer focus:border-[var(--color-primary)] transition-colors"
          style={{ minWidth: '160px' }}
        >
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <span
          className="material-symbols-outlined absolute pointer-events-none text-[16px]"
          style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)' }}
        >
          expand_more
        </span>
      </div>

      {/* Função dropdown */}
      <div className="relative">
        <select
          value={role}
          onChange={(e) => search(inputRef.current?.value ?? q, e.target.value, status)}
          className="appearance-none outline-none bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-xl text-sm px-4 py-2.5 pr-9 text-[var(--color-on-surface)] cursor-pointer focus:border-[var(--color-primary)] transition-colors"
          style={{ minWidth: '150px' }}
        >
          {ROLES.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <span
          className="material-symbols-outlined absolute pointer-events-none text-[16px]"
          style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)' }}
        >
          expand_more
        </span>
      </div>

      {/* Limpar */}
      {hasFilters && (
        <button
          onClick={() => {
            if (inputRef.current) inputRef.current.value = ''
            search('', '', 'TODOS')
          }}
          className="px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <span className="material-symbols-outlined text-[14px]">close</span>
          Limpar
        </button>
      )}

      {/* Exportar CSV */}
      <button
        onClick={handleExportCSV}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ml-auto"
        style={{
          background: 'var(--color-surface-container-high)',
          color: 'var(--color-on-surface)',
          border: '1px solid var(--color-outline-variant)',
          opacity: exporting ? 0.7 : 1,
        }}
      >
        <span className="material-symbols-outlined text-[16px]">download</span>
        Exportar CSV
      </button>
    </div>
  )
}
