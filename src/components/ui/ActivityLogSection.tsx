'use client'

import { useEffect, useState } from 'react'

interface ActivityLog {
  id: string
  actor_name: string | null
  actor_email: string | null
  action: string
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
  SAQUE_MANUAL:         { label: 'Aprovado (manual)',         color: '#F59E0B', icon: 'hand_gesture' },
  SAQUE_CORRECAO_NF:    { label: 'Correção de NF solicitada', color: '#F97316', icon: 'receipt_long' },
  SAQUE_REPROCESSADO:   { label: 'Reprocessado',              color: '#60A5FA', icon: 'refresh' },
  CONTRATO_CRIADO:      { label: 'Contrato criado',           color: '#60A5FA', icon: 'description' },
  CONTRATO_ATUALIZADO:  { label: 'Contrato atualizado',       color: '#60A5FA', icon: 'edit_document' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  entityType: string
  entityId: string
}

export default function ActivityLogSection({ entityType, entityId }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!entityId) return
    setLoading(true)
    fetch(`/api/admin/activity-log?entityType=${entityType}&entityId=${entityId}&limit=20`)
      .then(r => r.json())
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [entityType, entityId])

  return (
    <div className="px-6 py-5">
      <p className="text-[10px] font-bold text-[var(--color-outline)] uppercase tracking-widest mb-4">
        Histórico de Ações
      </p>

      {loading ? (
        <div className="flex items-center gap-2 py-4" style={{ color: 'var(--color-on-surface-variant)' }}>
          <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
          <span className="text-xs">Carregando…</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex items-center gap-2 py-3 px-3 rounded-xl" style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)' }}>
          <span className="material-symbols-outlined text-[16px] opacity-40">history</span>
          <span className="text-xs opacity-50">Nenhuma ação registrada ainda</span>
        </div>
      ) : (
        <div className="flex flex-col gap-0">
          {logs.map((log, i) => {
            const meta  = ACTION_META[log.action]
            const color = meta?.color ?? 'var(--color-primary)'
            const icon  = meta?.icon  ?? 'radio_button_checked'
            const label = meta?.label ?? log.action.replace(/_/g, ' ')
            const isLast = i === logs.length - 1

            return (
              <div key={log.id} className="flex gap-3">
                {/* Timeline line */}
                <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                    style={{ background: `${color}18`, border: `1.5px solid ${color}50` }}
                  >
                    <span className="material-symbols-outlined text-[11px]" style={{ color }}>{icon}</span>
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 my-1" style={{ background: 'var(--color-outline-variant)', minHeight: 12 }} />
                  )}
                </div>

                {/* Content */}
                <div className={`flex flex-col gap-0.5 pb-4 min-w-0 flex-1 ${isLast ? '' : ''}`}>
                  <span className="text-xs font-semibold leading-tight" style={{ color: 'var(--color-on-surface)' }}>
                    {label}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>
                    por <strong style={{ color: 'var(--color-on-surface)' }}>{log.actor_name ?? log.actor_email ?? 'Sistema'}</strong>
                    {' · '}{formatDate(log.created_at)}
                  </span>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(log.details)
                        .filter(([k, v]) => v && !['afiliado_nome', 'afiliado_email', 'id_usuario'].includes(k))
                        .slice(0, 4)
                        .map(([k, v]) => {
                          const display = Array.isArray(v) ? v.join(', ') : String(v)
                          if (!display || display === 'null') return null
                          return (
                            <span
                              key={k}
                              className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-on-surface-variant)', border: '1px solid var(--color-outline-variant)' }}
                            >
                              {k.replace(/_/g, ' ')}: {display.length > 30 ? display.slice(0, 30) + '…' : display}
                            </span>
                          )
                        })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
