'use client'

import { useState } from 'react'

type Saque = {
  id: string
  valor: number
  status: string
  pix_key?: string
  nota_fiscal?: string
  created_at: string
  efetivado_at?: string
  id_usuario: string
  profiles?: { nome?: string; email?: string } | null
}

const STATUS_ACTIONS: Record<string, { label: string; next: string; variant: 'primary' | 'danger'; needsReason?: boolean }[]> = {
  AGUARDANDO_NF: [
    { label: 'Processar', next: 'PROCESSANDO', variant: 'primary' },
    { label: 'Rejeitar',  next: 'FALHA',       variant: 'danger', needsReason: true },
  ],
  PROCESSANDO: [
    { label: 'Concluir', next: 'CONCLUIDO', variant: 'primary' },
    { label: 'Falha',    next: 'FALHA',     variant: 'danger',  needsReason: true },
    { label: 'Manual',   next: 'MANUAL',    variant: 'primary' },
  ],
  FALHA: [
    { label: 'Reprocessar', next: 'AGUARDANDO_NF', variant: 'primary' },
  ],
  MANUAL: [
    { label: 'Concluir', next: 'CONCLUIDO', variant: 'primary' },
  ],
}

const STATUS_BADGE: Record<string, string> = {
  AGUARDANDO_NF: 'badge-yellow',
  PROCESSANDO:   'badge-blue',
  CONCLUIDO:     'badge-green',
  FALHA:         'badge-red',
  MANUAL:        'badge-gray',
}
const STATUS_DOT: Record<string, string> = {
  AGUARDANDO_NF: 'status-dot-yellow',
  PROCESSANDO:   'status-dot-green',
  CONCLUIDO:     'status-dot-green',
  FALHA:         'status-dot-red',
  MANUAL:        'status-dot-gray',
}
const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_NF: 'Aguardando NF',
  PROCESSANDO:   'Processando',
  CONCLUIDO:     'Concluído',
  FALHA:         'Falha',
  MANUAL:        'Manual',
}

type RejectModal = { saqueId: string; motivo: string } | null

export default function SaquesTable({ data, page, totalPages, status }: {
  data: Saque[]; page: number; totalPages: number; status: string
}) {
  const [rows, setRows] = useState(data)
  const [loading, setLoading] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<RejectModal>(null)

  async function updateStatus(saqueId: string, nextStatus: string, motivo?: string) {
    setLoading(saqueId)
    const res = await fetch(`/api/admin/saques/${saqueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus, motivo_rejeicao: motivo }),
    })
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== saqueId))
    } else {
      const err = await res.json()
      alert(err.error ?? 'Erro ao atualizar')
    }
    setLoading(null)
    setRejectModal(null)
  }

  function handleAction(saqueId: string, next: string, needsReason?: boolean) {
    if (needsReason) {
      setRejectModal({ saqueId, motivo: '' })
    } else {
      updateStatus(saqueId, next)
    }
  }

  const actions = STATUS_ACTIONS[status] ?? []

  if (rows.length === 0) {
    return (
      <div className="glass-card rounded-xl py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
        <span className="material-symbols-outlined text-[48px] opacity-30">payments</span>
        <p className="text-sm opacity-60">Nenhum saque com status &quot;{STATUS_LABEL[status] ?? status}&quot;</p>
      </div>
    )
  }

  return (
    <>
      {/* Rejection modal */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}
        >
          <div className="glass-card rounded-xl p-6 w-full max-w-md mx-4 animate-fade-in">
            <h3 className="text-headline-md text-[var(--color-on-surface)] mb-1">Rejeitar saque</h3>
            <p className="text-body-md text-[var(--color-on-surface-variant)] mb-4">Informe o motivo da rejeição (opcional)</p>
            <textarea
              className="w-full resize-none rounded-lg px-3 py-2 text-sm"
              style={{
                background: 'var(--color-surface-container-high)',
                border: '1px solid var(--color-outline-variant)',
                color: 'var(--color-on-surface)',
                fontFamily: 'inherit',
                outline: 'none',
              }}
              rows={4}
              placeholder="Ex: Documentação incompleta, chave PIX inválida…"
              value={rejectModal.motivo}
              onChange={(e) => setRejectModal((m) => m ? { ...m, motivo: e.target.value } : null)}
            />
            <div className="flex gap-2 mt-4">
              <button
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-label-md font-medium transition-colors"
                style={{ background: '#F43F5E', color: '#fff', border: 'none' }}
                disabled={loading === rejectModal.saqueId}
                onClick={() => updateStatus(rejectModal.saqueId, 'FALHA', rejectModal.motivo || undefined)}
              >
                {loading === rejectModal.saqueId
                  ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Aguarde…</>
                  : 'Confirmar rejeição'
                }
              </button>
              <button
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-label-md transition-colors"
                style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)', border: '1px solid var(--color-outline-variant)' }}
                onClick={() => setRejectModal(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="orbit-table w-full">
            <thead style={{ background: 'var(--color-surface-container-low)', borderBottom: '1px solid var(--color-outline-variant)' }}>
              <tr>
                <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)]">Usuário</th>
                <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)]">Valor</th>
                <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)]">Chave PIX</th>
                <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)]">NF</th>
                <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)]">Data</th>
                <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)]">Status</th>
                {actions.length > 0 && (
                  <th className="text-right px-6 py-3 text-label-md text-[var(--color-on-surface-variant)]">Ações</th>
                )}
                <th className="w-8 pr-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-outline-variant)' }}>
              {rows.map((s) => {
                const bc = STATUS_BADGE[s.status] ?? 'badge-gray'
                const dc = STATUS_DOT[s.status] ?? 'status-dot-gray'
                const sl = STATUS_LABEL[s.status] ?? s.status
                const isLoading = loading === s.id
                const displayName = s.profiles?.nome ?? s.profiles?.email ?? s.id_usuario
                return (
                  <tr key={s.id} className="hover:bg-[var(--color-surface-container-high)] transition-colors">
                    <td className="px-6 py-4">
                      <a href={`/admin/afiliados/${s.id_usuario}`} className="flex items-center gap-3 group">
                        <div
                          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold"
                          style={{ background: 'var(--color-primary)', color: '#ffffff' }}
                        >
                          {displayName[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors truncate">
                            {s.profiles?.nome ?? '—'}
                          </p>
                          <p className="text-xs text-[var(--color-on-surface-variant)] truncate">
                            {s.profiles?.email ?? s.id_usuario.slice(0, 12) + '…'}
                          </p>
                        </div>
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold tabular-nums text-[var(--color-on-surface)]">
                        {Number(s.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-[var(--color-on-surface-variant)] max-w-[160px] truncate">
                      {s.pix_key || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {s.nota_fiscal
                        ? (
                          <a
                            href={s.nota_fiscal}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-label-md"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            Ver NF
                          </a>
                        )
                        : <span className="text-xs text-[var(--color-on-surface-variant)] opacity-50">—</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--color-on-surface-variant)] whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${bc}`}>
                        <span className={`status-dot ${dc}`} />
                        {sl}
                      </span>
                    </td>
                    {actions.length > 0 && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {actions.map((a) => (
                            <button
                              key={a.next}
                              onClick={() => handleAction(s.id, a.next, a.needsReason)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-label-md font-medium transition-colors disabled:opacity-50"
                              style={a.variant === 'primary'
                                ? { background: 'var(--color-primary)', color: '#ffffff', border: '1px solid transparent' }
                                : { background: 'rgba(244,63,94,0.1)', color: '#F43F5E', border: '1px solid rgba(244,63,94,0.2)' }
                              }
                            >
                              {isLoading
                                ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                                : a.label
                              }
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                    <td className="pr-4">
                      <div className="flex justify-end">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
                          <path d="M6 3l5 5-5 5" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-label-md text-[var(--color-on-surface-variant)]">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`/admin/saques?status=${status}&page=${page - 1}`}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-label-md transition-colors"
                style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)', border: '1px solid var(--color-outline-variant)' }}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Anterior
              </a>
            )}
            {page < totalPages && (
              <a
                href={`/admin/saques?status=${status}&page=${page + 1}`}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-label-md transition-colors"
                style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)', border: '1px solid var(--color-outline-variant)' }}
              >
                Próxima
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
            )}
          </div>
        </div>
      )}
    </>
  )
}
