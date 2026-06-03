'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Drawer from '@/components/ui/Drawer'
import NovoContratoDrawerContent from './NovoContratoDrawerContent'
import ContratoDetailDrawer from './ContratoDetailDrawer'

interface Casa    { id: string; nome_exibicao: string }

interface Contrato {
  id: string
  id_user_role: string
  id_casa: string
  afp: string
  tipo_contrato: string
  ativo: boolean
  created_at: string
}

interface Props {
  contratos: Contrato[]
  casas: Casa[]
  userMap: Record<string, string>
  casaMap: Record<string, string>
  roleToUserMap: Record<string, string>
  filter: string
  count: number
  page: number
  totalPages: number
  currentCasa?: string
  currentRole?: string
  currentQ?: string
}

function tipoBadgeStyle(tipo: string) {
  switch (tipo) {
    case 'CPA':      return { background: 'rgba(34,211,165,0.12)', color: '#22D3A5' }
    case 'REVSHARE': return { background: 'var(--color-primary-container, rgba(2,117,243,0.12))', color: 'var(--color-primary)' }
    case 'MISTO':    return { background: 'rgba(192,132,252,0.12)', color: '#c084fc' }
    default:         return { background: 'rgba(120,120,120,0.12)', color: '#888' }
  }
}

export default function ContratosClient({
  contratos, casas, userMap, casaMap, roleToUserMap, filter, count, page, totalPages, currentCasa, currentRole, currentQ,
}: Props) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null)
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState(currentQ ?? '')

  const pushSearch = useCallback((val: string) => {
    const url = new URL(window.location.href)
    if (val) url.searchParams.set('q', val)
    else url.searchParams.delete('q')
    url.searchParams.set('page', '1')
    router.push(url.toString())
  }, [router])

  function handleCreated() {
    setDrawerOpen(false)
    startTransition(() => router.refresh())
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <ContratoDetailDrawer
        contrato={selectedContrato}
        open={!!selectedContrato}
        onClose={() => setSelectedContrato(null)}
        userMap={userMap}
        casaMap={casaMap}
        roleToUserMap={roleToUserMap}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          <div>
            <p className="font-bold text-base text-[var(--color-on-surface)]">Novo Contrato</p>
            <p className="text-xs text-[var(--color-on-surface-variant)] opacity-60 mt-0.5">
              Vincula usuário a casa de aposta
            </p>
          </div>
        }
        size="md"
      >
        <NovoContratoDrawerContent
          casas={casas}
          onClose={() => setDrawerOpen(false)}
          onCreated={handleCreated}
        />
      </Drawer>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-lg text-[var(--color-on-surface)]">Contratos</h1>
          <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
            {count.toLocaleString('pt-BR')} contrato(s) · {filter === 'ativo' ? 'ativos' : 'encerrados'}
          </p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 transition-opacity hover:opacity-85 cursor-pointer border-none"
          style={{
            background: 'var(--color-primary)',
            color: '#ffffff',
          }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Novo Contrato
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] pointer-events-none" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>search</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') pushSearch(search) }}
          placeholder="Buscar por usuário, AFP, email..."
          className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all"
          style={{ background: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
        />
        {search && (
          <button
            onClick={() => { setSearch(''); pushSearch('') }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
          >
            <span className="material-symbols-outlined text-[17px]">close</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
          {/* Status */}
          <div className="flex gap-1 p-1 bg-[var(--color-surface-container)] rounded-xl border border-[var(--color-outline-variant)]">
            {([
              { key: 'ativo', label: 'Ativos' },
              { key: 'encerrado', label: 'Encerrados' },
            ] as const).map(t => (
              <a
                key={t.key}
                href={`/admin/contratos?filter=${t.key}&casa=${currentCasa || ''}&role=${currentRole || ''}`}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === t.key
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-on-surface)]'
                }`}
              >
                {t.label}
              </a>
            ))}
          </div>

          {/* Role Filter */}
          <div className="flex gap-1 p-1 bg-[var(--color-surface-container)] rounded-xl border border-[var(--color-outline-variant)]">
            {([
              { key: '', label: 'Todos os tipos' },
              { key: 'INFLUENCER', label: 'Influenciador' },
              { key: 'INTERMEDIARIO', label: 'Intermediário' },
              { key: 'GERENTE', label: 'Gerente' },
            ] as const).map(r => {
              const isSelected = (currentRole || '') === r.key
              return (
                <a
                  key={r.key}
                  href={`/admin/contratos?filter=${filter}&casa=${currentCasa || ''}${r.key ? `&role=${r.key}` : ''}`}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-[var(--color-primary)] text-white shadow-md'
                      : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-on-surface)]'
                  }`}
                >
                  {r.label}
                </a>
              )
            })}
          </div>

          {/* Casa Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-on-surface-variant)]">Casa:</span>
            <select
              className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] text-sm rounded-xl px-3 py-2 outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer max-w-[200px]"
              value={currentCasa || ''}
              onChange={(e) => {
                const newUrl = new URL(window.location.href)
                if (e.target.value) newUrl.searchParams.set('casa', e.target.value)
                else newUrl.searchParams.delete('casa')
                newUrl.searchParams.set('page', '1')
                router.push(newUrl.toString())
              }}
            >
              <option value="">Todas as casas</option>
              {casas.map(c => (
                <option key={c.id} value={c.id}>{c.nome_exibicao}</option>
              ))}
            </select>
          </div>

      </div>

      {/* Table or empty */}
      {contratos.length === 0 ? (
        <div className="glass-card rounded-xl py-16 flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[48px] opacity-25" style={{ color: 'var(--color-on-surface-variant)' }}>description</span>
          <p className="text-sm font-medium" style={{ color: 'var(--color-outline)' }}>Nenhum contrato encontrado</p>
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2 mt-2 transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-primary)', color: '#ffffff' }}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Criar primeiro contrato
          </button>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="orbit-table w-full">
              <thead style={{ background: 'var(--color-surface-container-low)', borderBottom: '1px solid var(--color-outline-variant)' }}>
                <tr>
                  {['Usuário', 'Casa', 'AFP', 'Tipo', 'Status', 'Cadastro'].map(h => (
                    <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider ${h === 'Ações' ? 'text-right' : 'text-left'}`} style={{ color: 'var(--color-on-surface-variant)' }}>{h}</th>
                  ))}
                  <th className="w-8 pr-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-outline-variant)' }}>
                {contratos.map(c => (
                  <tr
                    key={c.id}
                    className="hover:bg-[var(--color-surface-container-high)] transition-colors cursor-pointer"
                    onClick={() => setSelectedContrato(c)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-[var(--color-on-surface)]">
                      {userMap[c.id_user_role] ?? c.id_user_role.slice(0, 10) + '…'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface-variant)]">
                      {casaMap[c.id_casa] ?? c.id_casa.slice(0, 10) + '…'}
                    </td>
                    <td className="px-4 py-3">
                      {c.afp ? (
                        <span
                          className="font-mono text-xs px-2 py-0.5 rounded"
                          style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}
                        >
                          {c.afp}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-on-surface-variant)] opacity-60">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        style={tipoBadgeStyle(c.tipo_contrato)}
                      >
                        {c.tipo_contrato}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1"
                        style={{
                          background: c.ativo ? 'rgba(34,211,165,0.12)' : 'rgba(239,68,68,0.12)',
                          color: c.ativo ? '#22D3A5' : '#ef4444',
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.ativo ? '#22D3A5' : '#ef4444' }} />
                        {c.ativo ? 'Ativo' : 'Encerrado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-on-surface-variant)] whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString('pt-BR')}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-label-md text-[var(--color-on-surface-variant)]">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={`/admin/contratos?filter=${filter}&casa=${currentCasa || ''}&role=${currentRole || ''}&page=${page - 1}`}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-label-md transition-colors"
                style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)', border: '1px solid var(--color-outline-variant)' }}>
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Anterior
              </a>
            )}
            {page < totalPages && (
              <a href={`/admin/contratos?filter=${filter}&casa=${currentCasa || ''}&role=${currentRole || ''}&page=${page + 1}`}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-label-md transition-colors"
                style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)', border: '1px solid var(--color-outline-variant)' }}>
                Próxima
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
