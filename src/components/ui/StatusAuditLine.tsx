'use client'

import { useEffect, useState } from 'react'

// Mapeia status do usuário → ações relevantes (mais recente vence)
const STATUS_ACTIONS: Record<string, string[]> = {
  APROVADO:                  ['APROVACAO_CADASTRO', 'DESBLOQUEIO_USUARIO'],
  REPROVADO:                 ['REPROVACAO_CADASTRO'],
  BLOQUEADO:                 ['BLOQUEIO_USUARIO'],
  BLOQUEADO_TEMPORARIAMENTE: ['BLOQUEIO_TEMPORARIO'],
  PENDENTE:                  [],
}

const ACTION_VERB: Record<string, string> = {
  APROVACAO_CADASTRO:   'Aprovado',
  REPROVACAO_CADASTRO:  'Reprovado',
  BLOQUEIO_USUARIO:     'Bloqueado',
  BLOQUEIO_TEMPORARIO:  'Bloqueado temporariamente',
  DESBLOQUEIO_USUARIO:  'Desbloqueado',
  RESET_SENHA:          'Senha resetada',
  ALTERACAO_ROLES:      'Perfis alterados',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  userId: string
  currentStatus: string
}

export default function StatusAuditLine({ userId, currentStatus }: Props) {
  const [line, setLine] = useState<{ verb: string; actor: string; at: string } | null>(null)

  useEffect(() => {
    const relevantActions = STATUS_ACTIONS[currentStatus] ?? []
    if (!relevantActions.length) return

    fetch(`/api/admin/activity-log?entityType=usuario&entityId=${userId}&limit=50`)
      .then(r => r.json())
      .then((logs: Array<{ action: string; actor_name: string | null; actor_email: string | null; created_at: string }>) => {
        if (!Array.isArray(logs)) return
        // Pega o log mais recente que corresponde ao status atual
        const match = logs.find(l => relevantActions.includes(l.action))
        if (!match) return
        setLine({
          verb:  ACTION_VERB[match.action] ?? match.action,
          actor: match.actor_name ?? match.actor_email ?? 'Admin',
          at:    formatDateTime(match.created_at),
        })
      })
      .catch(() => {/* silencioso */})
  }, [userId, currentStatus])

  if (!line) return null

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full mt-1"
      style={{
        background: 'rgba(255,255,255,0.05)',
        color: 'var(--color-on-surface-variant)',
        border: '1px solid var(--color-outline-variant)',
      }}
    >
      <span className="material-symbols-outlined text-[10px] opacity-60">history</span>
      {line.verb} por <strong className="font-semibold mx-0.5" style={{ color: 'var(--color-on-surface)' }}>{line.actor}</strong> · {line.at}
    </span>
  )
}
