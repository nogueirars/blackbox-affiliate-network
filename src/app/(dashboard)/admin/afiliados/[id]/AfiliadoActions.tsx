'use client'

import { useState } from 'react'

const ROLES = [
  { value: 'AFILIADO',    label: 'Afiliado' },
  { value: 'GERENTE',       label: 'Gerente' },
  { value: 'INTERMEDIARIO', label: 'Intermediário' },
  { value: 'ADMIN',         label: 'Admin' },
]

const STATUS_CONFIG = {
  APROVADO:                  { label: 'Aprovado',       color: '#22D3A5', bg: 'rgba(34,211,165,0.12)',  border: 'rgba(34,211,165,0.25)'  },
  PENDENTE:                  { label: 'Pendente',       color: '#facc15', bg: 'rgba(250,204,21,0.12)',  border: 'rgba(250,204,21,0.25)'  },
  REPROVADO:                 { label: 'Reprovado',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)'   },
  BLOQUEADO:                 { label: 'Bloqueado',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)'   },
  BLOQUEADO_TEMPORARIAMENTE: { label: 'Bloq. temp.',    color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.25)'  },
}

type ApprovalStatus = keyof typeof STATUS_CONFIG

export default function AfiliadoActions({
  afiliadoId,
  currentRole,
  currentStatus,
}: {
  afiliadoId: string
  currentRole: string
  currentStatus: ApprovalStatus
}) {
  const [role, setRole] = useState(currentRole)
  const [roleLoading, setRoleLoading] = useState(false)
  const [roleSaved, setRoleSaved] = useState(false)
  const [roleError, setRoleError] = useState('')

  const [status, setStatus] = useState<ApprovalStatus>(currentStatus)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')

  const isDirty = role !== currentRole

  async function handleRoleChange() {
    if (!isDirty) return
    setRoleLoading(true)
    setRoleError('')
    setRoleSaved(false)
    try {
      const res = await fetch(`/api/admin/afiliados/${afiliadoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await res.json()
      if (!res.ok) { setRoleError(data.error ?? 'Erro ao salvar'); return }
      setRoleSaved(true)
      setTimeout(() => setRoleSaved(false), 3000)
    } catch {
      setRoleError('Erro de conexão')
    } finally {
      setRoleLoading(false)
    }
  }

  async function handleStatusChange(newStatus: ApprovalStatus) {
    setStatusLoading(true)
    setStatusError('')
    try {
      const res = await fetch(`/api/admin/afiliados/${afiliadoId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) { setStatusError(data.error ?? 'Erro ao atualizar status'); return }
      setStatus(newStatus)
    } catch {
      setStatusError('Erro de conexão')
    } finally {
      setStatusLoading(false)
    }
  }

  const statusInfo = STATUS_CONFIG[status]

  return (
    <div className="flex flex-col gap-3 flex-shrink-0" style={{ minWidth: '200px' }}>

      {/* Role panel */}
      <div
        className="flex flex-col gap-3 p-4 rounded-xl border"
        style={{ background: 'var(--color-surface-container-high)', borderColor: 'var(--color-outline-variant)' }}
      >
        <p className="text-label-md text-[var(--color-on-surface-variant)] uppercase tracking-wider text-xs">
          Alterar perfil
        </p>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setRoleSaved(false) }}
          disabled={roleLoading}
          className="w-full rounded-lg px-3 py-2 text-sm border outline-none transition-colors"
          style={{
            background: 'var(--color-surface-container-highest)',
            borderColor: isDirty ? 'var(--color-primary)' : 'var(--color-outline-variant)',
            color: 'var(--color-on-surface)',
            cursor: 'pointer',
          }}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <button
          onClick={handleRoleChange}
          disabled={roleLoading || !isDirty}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
          style={{
            background: isDirty ? 'var(--color-primary)' : 'var(--color-surface-container-highest)',
            color: isDirty ? 'var(--color-on-primary)' : 'var(--color-on-surface-variant)',
            opacity: roleLoading ? 0.7 : 1,
            cursor: isDirty ? 'pointer' : 'default',
            border: '1px solid transparent',
          }}
        >
          {roleLoading ? (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" className="animate-spin" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="17 9" />
              </svg>
              Salvando…
            </>
          ) : roleSaved ? (
            <>
              <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--color-on-primary)' }}>check_circle</span>
              Salvo!
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">save</span>
              Salvar
            </>
          )}
        </button>
        {roleSaved && <p className="text-xs text-center" style={{ color: '#22D3A5' }}>Role atualizado com sucesso</p>}
        {roleError && <p className="text-xs text-center" style={{ color: 'var(--color-error)' }}>{roleError}</p>}
      </div>

      {/* Status panel */}
      <div
        className="flex flex-col gap-3 p-4 rounded-xl border"
        style={{ background: 'var(--color-surface-container-high)', borderColor: 'var(--color-outline-variant)' }}
      >
        <p className="text-label-md text-[var(--color-on-surface-variant)] uppercase tracking-wider text-xs">
          Status de aprovação
        </p>

        {/* Current status badge */}
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: statusInfo.bg, border: `1px solid ${statusInfo.border}` }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusInfo.color }} />
          <span className="text-sm font-semibold" style={{ color: statusInfo.color }}>
            {statusInfo.label}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {status !== 'APROVADO' && (
            <StatusButton
              loading={statusLoading}
              color="#22D3A5"
              bg="rgba(34,211,165,0.1)"
              border="rgba(34,211,165,0.25)"
              icon="check_circle"
              label="Aprovar"
              onClick={() => handleStatusChange('APROVADO')}
            />
          )}
          {status !== 'REPROVADO' && (
            <StatusButton
              loading={statusLoading}
              color="#ef4444"
              bg="rgba(239,68,68,0.1)"
              border="rgba(239,68,68,0.25)"
              icon="cancel"
              label="Reprovar"
              onClick={() => handleStatusChange('REPROVADO')}
            />
          )}
          {status !== 'BLOQUEADO' && (
            <StatusButton
              loading={statusLoading}
              color="#f97316"
              bg="rgba(249,115,22,0.1)"
              border="rgba(249,115,22,0.25)"
              icon="block"
              label="Bloquear"
              onClick={() => handleStatusChange('BLOQUEADO')}
            />
          )}
        </div>

        {statusError && <p className="text-xs text-center" style={{ color: 'var(--color-error)' }}>{statusError}</p>}
      </div>
    </div>
  )
}

function StatusButton({
  loading, color, bg, border, icon, label, onClick,
}: {
  loading: boolean; color: string; bg: string; border: string; icon: string; label: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer"
      style={{ background: bg, border: `1px solid ${border}`, color, opacity: loading ? 0.6 : 1 }}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {label}
    </button>
  )
}
