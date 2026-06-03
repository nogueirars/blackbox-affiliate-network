'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatCard } from '@/components/ui/StatCard'

interface Row {
  id: string
  nome: string
  email: string
  pix_key: string | null
  pix_key_type: string | null
  afiliados: number
  saques: number
  pendente: number
  pago: number
}

interface Props {
  rows: Row[]
  totalPendente: number
  totalPago: number
  totalAfiliados: number
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default function IntermediariosClient({ rows, totalPendente, totalPago, totalAfiliados }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = search
    ? rows.filter(r =>
        r.nome.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase())
      )
    : rows

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Pagamentos — Intermediários</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-0.5">
          Volume de saques por intermediário
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="A Liberar"  value={fmt(totalPendente)} sub="Saques pendentes"  icon="schedule"             accent="#F59E0B" />
        <StatCard label="Total Pago" value={fmt(totalPago)}     sub="Saques concluídos" icon="check_circle"         accent="#22D3A5" />
        <StatCard label="Afiliados"  value={String(totalAfiliados)} sub={`${rows.length} intermediário${rows.length !== 1 ? 's' : ''}`} icon="group" accent="#0275F3" />
      </div>

      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] pointer-events-none" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>search</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar intermediário por nome ou e-mail..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
          style={{ background: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 && rows.length === 0 ? (
        <div className="glass-card rounded-xl py-16 flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[48px] opacity-25" style={{ color: 'var(--color-on-surface-variant)' }}>account_tree</span>
          <p className="text-sm font-medium" style={{ color: 'var(--color-outline)' }}>Nenhum intermediário cadastrado</p>
        </div>
      ) : (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: 'var(--color-surface-container-low)', borderBottom: '1px solid var(--color-outline-variant)' }}>
            <tr>
              {['Intermediário', 'Afiliados', 'Saques', 'Pendente', 'Pago', 'Chave PIX'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>
                  {h}
                </th>
              ))}
              <th className="w-8 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Nenhum resultado para a busca
                </td>
              </tr>
            ) : filtered.map(r => (
              <tr
                key={r.id}
                style={{ borderBottom: '1px solid var(--color-outline-variant)' }}
                className="hover:bg-[var(--color-surface-container-high)] transition-colors cursor-pointer"
                onClick={() => router.push(`/admin/afiliados/${r.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-[var(--color-on-surface)]">{r.nome}</div>
                  <div className="text-xs text-[var(--color-on-surface-variant)]">{r.email}</div>
                </td>
                <td className="px-4 py-3 text-center text-[var(--color-on-surface)]">{r.afiliados}</td>
                <td className="px-4 py-3 text-center text-[var(--color-on-surface-variant)]">{r.saques}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold" style={{ color: r.pendente > 0 ? '#f59e0b' : 'var(--color-on-surface-variant)' }}>
                    {fmt(r.pendente)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold" style={{ color: r.pago > 0 ? '#22c55e' : 'var(--color-on-surface-variant)' }}>
                    {fmt(r.pago)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-[var(--color-on-surface-variant)]">
                  {r.pix_key ? `${r.pix_key_type ?? ''} · ${r.pix_key}` : '—'}
                </td>
                <td className="pr-4">
                  <div className="flex justify-end">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
                      <path d="M6 3l5 5-5 5" />
                    </svg>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      )}
    </div>
  )
}

