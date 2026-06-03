'use client'

import { useEffect, useState } from 'react'

interface ActivityLog {
  id: string
  actor_id: string | null
  actor_name: string | null
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string
  details: Record<string, unknown>
  created_at: string
}

const ACTION_META: Record<string, { label: string; color: string; icon: string }> = {
  APROVACAO_CADASTRO:   { label: 'Cadastro aprovado',         color: '#22D3A5', icon: 'check_circle' },
  REPROVACAO_CADASTRO:  { label: 'Cadastro reprovado',        color: '#EF4444', icon: 'cancel' },
  BLOQUEIO_USUARIO:     { label: 'Usuário bloqueado',         color: '#EF4444', icon: 'block' },
  BLOQUEIO_TEMPORARIO:  { label: 'Bloqueio temporário',       color: '#F97316', icon: 'schedule' },
  DESBLOQUEIO_USUARIO:  { label: 'Usuário desbloqueado',      color: '#22D3A5', icon: 'lock_open' },
  RESET_SENHA:          { label: 'Reset de senha',            color: '#A78BFA', icon: 'key' },
  ALTERACAO_ROLES:      { label: 'Perfis alterados',          color: '#60A5FA', icon: 'manage_accounts' },
  SAQUE_LIBERADO:       { label: 'Saque liberado',            color: '#22D3A5', icon: 'payments' },
  SAQUE_APROVADO:       { label: 'Saque aprovado',            color: '#22D3A5', icon: 'task_alt' },
  SAQUE_FALHA:          { label: 'Saque recusado',            color: '#EF4444', icon: 'money_off' },
  SAQUE_MANUAL:         { label: 'Saque aprovado (manual)',   color: '#F59E0B', icon: 'hand_gesture' },
  SAQUE_CORRECAO_NF:    { label: 'Correção de NF solicitada', color: '#F97316', icon: 'receipt_long' },
  SAQUE_REPROCESSADO:   { label: 'Saque reprocessado',       color: '#60A5FA', icon: 'refresh' },
  CONTRATO_CRIADO:      { label: 'Contrato criado',           color: '#60A5FA', icon: 'description' },
  CONTRATO_ATUALIZADO:  { label: 'Contrato atualizado',       color: '#60A5FA', icon: 'edit_document' },
}

const ENTITY_LABEL: Record<string, string> = {
  usuario:  'Usuário',
  saque:    'Saque',
  contrato: 'Contrato',
  casa:     'Casa',
  entidade: 'Entidade',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function DetailsCell({ details }: { details: Record<string, unknown> }) {
  const items = Object.entries(details).filter(([, v]) => v !== null && v !== undefined && v !== '')
  if (!items.length) return <span className="opacity-40">—</span>

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([k, v]) => {
        const display = Array.isArray(v) ? v.join(', ') : String(v)
        if (!display || display === 'null') return null
        return (
          <span
            key={k}
            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-on-surface-variant)', border: '1px solid var(--color-outline-variant)' }}
          >
            <span className="opacity-50">{k.replace(/_/g, ' ')}:</span> {display.length > 40 ? display.slice(0, 40) + '…' : display}
          </span>
        )
      })}
    </div>
  )
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')

  useEffect(() => {
    const params = new URLSearchParams({ limit: '100' })
    if (filterAction) params.set('action', filterAction)
    if (filterEntity) params.set('entityType', filterEntity)

    setLoading(true)
    fetch(`/api/admin/activity-log?${params}`)
      .then(r => r.json())
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [filterAction, filterEntity])

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display-lg text-[var(--color-on-surface)]">Logs de Auditoria</h1>
          <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
            Todas as ações realizadas por admins no sistema
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterEntity}
            onChange={e => setFilterEntity(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border outline-none"
            style={{ background: 'var(--color-surface-container)', color: 'var(--color-on-surface)', borderColor: 'var(--color-outline-variant)' }}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border outline-none"
            style={{ background: 'var(--color-surface-container)', color: 'var(--color-on-surface)', borderColor: 'var(--color-outline-variant)' }}
          >
            <option value="">Todas as ações</option>
            {Object.entries(ACTION_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="glass-card rounded-xl py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
          <span className="material-symbols-outlined text-[40px] opacity-30 animate-spin">refresh</span>
          <p className="text-sm opacity-60">Carregando logs…</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-card rounded-xl py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
          <span className="material-symbols-outlined text-[48px] opacity-30">terminal</span>
          <p className="text-sm opacity-60">Nenhum log encontrado</p>
          <p className="text-xs opacity-40">Execute a migration SQL para criar a tabela activity_log</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: 'var(--color-outline-variant)', background: 'var(--color-surface-container-low)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-on-surface-variant)' }}>
              {logs.length} registro{logs.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="orbit-table w-full">
              <thead style={{ background: 'var(--color-surface-container-low)', borderBottom: '1px solid var(--color-outline-variant)' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Data / Hora</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Ação</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Tipo</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Detalhes</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Realizado por</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-outline-variant)' }}>
                {logs.map((log) => {
                  const meta = ACTION_META[log.action]
                  const color = meta?.color ?? 'var(--color-primary)'
                  const icon  = meta?.icon  ?? 'radio_button_checked'
                  const label = meta?.label ?? log.action.replace(/_/g, ' ')

                  return (
                    <tr key={log.id} className="hover:bg-[var(--color-surface-container-high)] transition-colors">
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-on-surface-variant)' }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[15px]" style={{ color }}>{icon}</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--color-on-surface)' }}>{label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-on-surface-variant)', border: '1px solid var(--color-outline-variant)' }}
                        >
                          {ENTITY_LABEL[log.entity_type] ?? log.entity_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <DetailsCell details={log.details as Record<string, unknown>} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium" style={{ color: 'var(--color-on-surface)' }}>
                            {log.actor_name ?? '—'}
                          </span>
                          {log.actor_email && (
                            <span className="text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>
                              {log.actor_email}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
