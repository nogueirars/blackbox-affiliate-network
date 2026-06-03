'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Drawer from '@/components/ui/Drawer'
import ActivityLogSection from '@/components/ui/ActivityLogSection'
import StatusAuditLine from '@/components/ui/StatusAuditLine'
import ContratosResumoSection from '@/components/ui/ContratosResumoSection'
import { startImpersonation } from '@/app/actions/impersonation'

interface UserSocials {
  instagram?: string | null
  tiktok?: string | null
  facebook?: string | null
  telegram_canal?: string | null
  whatsapp_canal?: string | null
}

interface UserRole {
  role: string
  ref_code?: string | null
}

interface UserDetail {
  id: string
  auth_id: string | null
  nome_completo: string
  email: string
  status_aprovacao: string
  created_at: string | Date
  telefone: string
  premium: boolean
  socials?: UserSocials | null
  user_roles: UserRole[]
  users_users_id_gerenteTousers?: { nome_completo: string } | null
  users_users_id_intermediarioTousers?: { nome_completo: string } | null
}

interface Props {
  user: UserDetail | null
  open: boolean
  onClose: () => void
  prod: { ftds: number; cpas: number; receita: number }
  onUpdate: () => void
}

const ROLE_OPTIONS = [
  {
    value: 'AFILIADO',
    label: 'Afiliado(a)',
    description: 'Acesso ao painel de afiliado(a) com produção própria',
  },
  {
    value: 'GERENTE',
    label: 'Gerente',
    description: 'Gerencia sua própria rede de afiliados(as)',
  },
  {
    value: 'INTERMEDIARIO',
    label: 'Intermediário',
    description: 'Indica Gerentes e recebe comissão da BLACKBOX',
  },
  {
    value: 'ADMIN',
    label: 'Administrador',
    description: 'Acesso completo ao painel de gestão',
  },
]

const STATUS_STYLE: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  APROVADO: { bg: 'rgba(34,211,165,0.12)', color: '#22D3A5', dot: '#22D3A5', label: 'Aprovado' },
  PENDENTE: { bg: 'rgba(250,204,21,0.12)', color: '#facc15', dot: '#facc15', label: 'Pendente' },
  REPROVADO: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', dot: '#ef4444', label: 'Reprovado' },
  BLOQUEADO: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', dot: '#ef4444', label: 'Bloqueado' },
  BLOQUEADO_TEMPORARIAMENTE: { bg: 'rgba(249,115,22,0.12)', color: '#f97316', dot: '#f97316', label: 'Bloq. temp.' },
}

export default function AfiliadoDetailDrawer({ user, open, onClose, prod, onUpdate }: Props) {
  const router = useRouter()
  const [statusLoading, setStatusLoading] = useState(false)
  const [actionFeedback, setActionFeedback] = useState<{ success: boolean; message: string } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [saveRolesLoading, setSaveRolesLoading] = useState(false)
  const [saveRolesError, setSaveRolesError] = useState('')
  const [isEditingRoles, setIsEditingRoles] = useState(false)
  const [isConfirmingImpersonation, setIsConfirmingImpersonation] = useState(false)

  useEffect(() => {
    if (user && isEditingRoles) {
      setSelectedRoles(user.user_roles.map(r => r.role))
    }
  }, [isEditingRoles, user])

  const toggleRole = (roleVal: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleVal)
        ? prev.filter(r => r !== roleVal)
        : [...prev, roleVal]
    )
  }

  async function handleSaveRoles() {
    if (!user) return
    setSaveRolesLoading(true)
    setSaveRolesError('')
    try {
      const res = await fetch(`/api/admin/afiliados/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: selectedRoles }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveRolesError(data.error ?? 'Erro ao salvar perfis')
        return
      }
      setIsEditingRoles(false)
      onUpdate()
    } catch {
      setSaveRolesError('Erro de conexão ao salvar perfis')
    } finally {
      setSaveRolesLoading(false)
    }
  }

  function handleCopy(text: string, fieldId: string) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(fieldId)
    setTimeout(() => setCopiedField(null), 2000)
  }

  if (!user) return null

  const statusInfo = STATUS_STYLE[user.status_aprovacao] ?? STATUS_STYLE.PENDENTE
  const currentRole = user.user_roles[0]?.role ?? 'AFILIADO'
  const apiId = user.user_roles[0]?.ref_code ?? '—'
  const parentGerente = user.users_users_id_gerenteTousers?.nome_completo
  const parentInter = user.users_users_id_intermediarioTousers?.nome_completo
  const parentName = parentGerente ?? parentInter ?? '-'
  const cadastroData = new Date(user.created_at).toLocaleDateString('pt-BR')

  const formattedComissao = prod.receita.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  function formatPhone(raw: string): string {
    const d = raw.replace(/\D/g, '')
    if (d.length === 11) return `(${d.slice(0,2)}) ${d[2]} ${d.slice(3,7)}-${d.slice(7)}`
    if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
    return raw
  }

  function telegramHref(val: string): string {
    if (val.startsWith('http')) return val
    return `https://t.me/${val.replace('@', '')}`
  }

  function whatsappGroupHref(val: string): string {
    if (val.startsWith('http')) return val
    return `https://wa.me/${val.replace(/\D/g, '')}`
  }

  const titleNode = isEditingRoles ? (
    <div className="flex items-center gap-3 animate-fade-in">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: 'var(--color-primary-container)',
          color: 'var(--color-on-primary-container)',
        }}
      >
        <span className="material-symbols-outlined text-[18px]">shield</span>
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-[var(--color-on-surface)] leading-none">Gerenciar Perfis</h2>
        <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-1.5 leading-relaxed">
          Selecione os perfis de {user.nome_completo || '—'} no sistema. O usuário poderá alternar entre os dashboards correspondentes.
        </p>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: 'var(--color-primary-container)',
          color: 'var(--color-on-primary-container)',
        }}
      >
        <span className="material-symbols-outlined text-[18px]">visibility</span>
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-[var(--color-on-surface)] leading-none">Detalhes do Afiliado</h2>
        <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-1 truncate max-w-[250px] sm:max-w-[400px]">
          Informações de {user.nome_completo || '—'}
        </p>
      </div>
    </div>
  )



  async function handleBloquearTemp() {
    if (!user) return
    setStatusLoading(true)
    setActionFeedback(null)
    try {
      const res = await fetch(`/api/admin/afiliados/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'BLOQUEADO_TEMPORARIAMENTE' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionFeedback({ success: false, message: data.error ?? 'Erro ao bloquear usuário' })
        return
      }
      setActionFeedback({ success: true, message: 'Usuário bloqueado temporariamente!' })
      onUpdate()
    } catch {
      setActionFeedback({ success: false, message: 'Erro de conexão ao bloquear usuário' })
    } finally {
      setStatusLoading(false)
    }
  }

  async function handleAprovar() {
    if (!user) return
    setStatusLoading(true)
    setActionFeedback(null)
    try {
      const res = await fetch(`/api/admin/afiliados/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APROVADO' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionFeedback({ success: false, message: data.error ?? 'Erro ao aprovar usuário' })
        return
      }
      setActionFeedback({ success: true, message: 'Usuário aprovado com sucesso!' })
      onUpdate()
    } catch {
      setActionFeedback({ success: false, message: 'Erro de conexão ao aprovar usuário' })
    } finally {
      setStatusLoading(false)
    }
  }

  async function handleRecusar() {
    if (!user) return
    setStatusLoading(true)
    setActionFeedback(null)
    try {
      const res = await fetch(`/api/admin/afiliados/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REPROVADO' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionFeedback({ success: false, message: data.error ?? 'Erro ao recusar usuário' })
        return
      }
      setActionFeedback({ success: true, message: 'Usuário recusado.' })
      onUpdate()
    } catch {
      setActionFeedback({ success: false, message: 'Erro de conexão ao recusar usuário' })
    } finally {
      setStatusLoading(false)
    }
  }

  async function handleDesbloquear() {
    if (!user) return
    setStatusLoading(true)
    setActionFeedback(null)
    try {
      const res = await fetch(`/api/admin/afiliados/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APROVADO' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionFeedback({ success: false, message: data.error ?? 'Erro ao desbloquear usuário' })
        return
      }
      setActionFeedback({ success: true, message: 'Usuário desbloqueado com sucesso!' })
      onUpdate()
    } catch {
      setActionFeedback({ success: false, message: 'Erro de conexão ao desbloquear usuário' })
    } finally {
      setStatusLoading(false)
    }
  }

  const isPendente = user.status_aprovacao === 'PENDENTE'

  const footerNode = !isEditingRoles ? (
    <div className="p-5">
      {isPendente ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleAprovar}
            disabled={statusLoading}
            className="w-full flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 rounded-xl disabled:opacity-50 transition-opacity cursor-pointer hover:opacity-85"
            style={{ background: '#22D3A5', color: '#0a1a14', border: 'none' }}
          >
            <span className="material-symbols-outlined text-[17px]">check_circle</span>
            {statusLoading ? 'Aprovando...' : 'Aprovar Cadastro'}
          </button>
          <button
            onClick={handleRecusar}
            disabled={statusLoading}
            className="w-full flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 rounded-xl disabled:opacity-50 transition-all cursor-pointer"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <span className="material-symbols-outlined text-[17px]">cancel</span>
            {statusLoading ? 'Recusando...' : 'Recusar Cadastro'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setIsConfirmingImpersonation(true)}
            disabled={!user.auth_id}
            className="col-span-2 flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 rounded-xl transition-opacity border-none disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary)', color: 'white', cursor: user.auth_id ? 'pointer' : 'not-allowed' }}
          >
            <span className="material-symbols-outlined text-[17px]">{user.auth_id ? 'login' : 'no_accounts'}</span>
            Acessar Painel
          </button>
          {!user.auth_id && (
            <p className="col-span-2 flex items-center gap-1.5 text-xs px-1" style={{ color: 'var(--color-on-surface-variant)' }}>
              <span className="material-symbols-outlined text-[14px]">info</span>
              Usuário sem conta de autenticação — acesso indisponível.
            </p>
          )}

          <Link
            href={`/admin/afiliados/${user.id}`}
            onClick={onClose}
            className="col-span-2 flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--color-on-surface)', border: '1px solid rgba(173,198,255,0.1)' }}
          >
            <span className="material-symbols-outlined text-[15px]">person</span>
            Ver Perfil
          </Link>

          {user.status_aprovacao === 'BLOQUEADO' || user.status_aprovacao === 'BLOQUEADO_TEMPORARIAMENTE' ? (
            <button
              onClick={handleDesbloquear}
              disabled={statusLoading}
              className="col-span-2 flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50 transition-all cursor-pointer"
              style={{ background: 'rgba(34,211,165,0.12)', color: '#22D3A5', border: '1px solid rgba(34,211,165,0.2)' }}
            >
              <span className="material-symbols-outlined text-[15px]">lock_open</span>
              {statusLoading ? 'Desbloqueando...' : 'Desbloquear Usuário'}
            </button>
          ) : (
            <button
              onClick={handleBloquearTemp}
              disabled={statusLoading}
              className="col-span-2 flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50 transition-all cursor-pointer"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <span className="material-symbols-outlined text-[15px]">warning</span>
              {statusLoading ? 'Bloqueando...' : 'Bloquear Temporariamente'}
            </button>
          )}
        </div>
      )}

      {actionFeedback && (
        <p className="text-xs text-center mt-3 font-semibold" style={{ color: actionFeedback.success ? '#22D3A5' : '#EF4444' }}>
          {actionFeedback.message}
        </p>
      )}
    </div>
  ) : undefined

  return (
    <Drawer
      open={open}
      onClose={() => {
        setIsEditingRoles(false)
        setIsConfirmingImpersonation(false)
        onClose()
      }}
      title={titleNode}
      size="sm"
      footer={footerNode}
    >
      {isConfirmingImpersonation && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-[448px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border" style={{ background: 'var(--color-surface-container-high)', borderColor: 'var(--color-outline-variant)' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4">
              <span className="material-symbols-outlined text-[var(--color-primary)] text-[22px]">shield</span>
              <h3 className="text-base font-bold text-[var(--color-on-surface)]">Acessar Painel como Admin</h3>
            </div>
            {/* Body */}
            <div className="px-6 pb-5 flex flex-col gap-3">
              <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                Você vai acessar o painel de <strong className="text-[var(--color-on-surface)]">{user.nome_completo}</strong> ({user.email}) como ADMIN.
              </p>
              <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                Você verá exatamente o que este usuário vê, mas esta ação será registrada para auditoria.
              </p>
            </div>
            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--color-outline-variant)', background: 'var(--color-surface-container)' }}>
              <button
                onClick={() => setIsConfirmingImpersonation(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer"
                style={{ background: 'var(--color-surface-container)', color: 'var(--color-on-surface-variant)', borderColor: 'var(--color-outline-variant)' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setIsConfirmingImpersonation(false)
                  onClose()
                  startImpersonation(user.auth_id, user.email, user.nome_completo)
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer shadow-md hover:opacity-90 transition-opacity"
                style={{ background: 'var(--color-primary)' }}
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                Acessar Painel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <div className="flex flex-col">
        {isEditingRoles ? (
          <div className="p-6 flex flex-col gap-5 animate-fade-in">
            <div className="flex flex-col gap-3">
              {ROLE_OPTIONS.map((option) => {
                const isChecked = selectedRoles.includes(option.value)
                return (
                  <div
                    key={option.value}
                    onClick={() => toggleRole(option.value)}
                    className="p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4"
                    style={{
                      border: isChecked ? '1px solid rgba(2,117,243,0.5)' : '1px solid var(--color-outline-variant)',
                      background: isChecked ? 'rgba(2,117,243,0.08)' : 'var(--color-surface-container-low)',
                      boxShadow: 'none',
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all flex-shrink-0"
                      style={{
                        borderColor: isChecked ? 'var(--color-primary)' : 'var(--color-outline)',
                        background: isChecked ? 'var(--color-primary)' : 'transparent',
                        color: 'white',
                      }}
                    >
                      {isChecked && <span className="material-symbols-outlined text-[11px]">check</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--color-on-surface)] leading-tight">{option.label}</p>
                      <p className="text-xs text-[var(--color-on-surface-variant)] mt-1 leading-normal opacity-70">{option.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-2 mt-1" style={{ color: 'var(--color-primary)' }}>
              <span className="material-symbols-outlined text-[16px]">group</span>
              <span className="text-xs font-semibold">
                {selectedRoles.length} {selectedRoles.length === 1 ? 'perfil selecionado' : 'perfis selecionados'}
              </span>
            </div>

            {saveRolesError && (
              <p className="text-xs text-center font-medium" style={{ color: '#EF4444' }}>{saveRolesError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsEditingRoles(false)}
                disabled={saveRolesLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                style={{ border: '1px solid var(--color-outline-variant)', background: 'var(--color-surface-container)', color: 'var(--color-on-surface-variant)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRoles}
                disabled={saveRolesLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: 'var(--color-primary)', color: 'white', border: 'none' }}
              >
                {saveRolesLoading ? 'Salvando...' : 'Salvar Perfis'}
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* User Hero */}
            <div
              className="px-6 py-6 flex items-center gap-4"
              style={{
                background: 'linear-gradient(135deg, rgba(2,117,243,0.06) 0%, rgba(99,102,241,0.04) 100%)',
                borderBottom: '1px solid var(--color-outline-variant)',
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(2,117,243,0.2), rgba(99,102,241,0.2))',
                  border: '1px solid rgba(2,117,243,0.25)',
                  color: 'var(--color-primary)',
                }}
              >
                {user.nome_completo?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[var(--color-on-surface)] text-base leading-tight truncate">{user.nome_completo || '—'}</p>
                </div>
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5 truncate opacity-70">{user.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1"
                    style={{ background: statusInfo.bg, color: statusInfo.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusInfo.dot }} />
                    {statusInfo.label}
                  </span>
                  <span
                    className="inline-flex items-center text-[11px] font-semibold rounded-full px-2.5 py-1"
                    style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}
                  >
                    {currentRole.charAt(0) + currentRole.slice(1).toLowerCase()}
                  </span>
                  {user.premium && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1"
                      style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}
                    >
                      <span className="material-symbols-outlined text-[12px]">star</span>
                      Premium
                    </span>
                  )}
                </div>
                <StatusAuditLine userId={user.id} currentStatus={user.status_aprovacao} />
              </div>
            </div>

            {/* Info Grid */}
            <div className="px-6 py-5">
              <p className="text-[10px] font-bold text-[var(--color-outline)] uppercase tracking-widest mb-4">Informações</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Master', value: parentName },
                  { label: 'Cadastro', value: cadastroData },
                  { label: 'ID API', value: apiId, mono: true },
                  { label: 'Produção (FTDs)', value: String(prod.ftds) },
                  { label: 'CPAs', value: String(prod.cpas) },
                  { label: 'Receita', value: formattedComissao },
                ].map(({ label, value, mono }) => (
                  <div
                    key={label}
                    className="rounded-xl p-3 flex flex-col gap-1"
                    style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)' }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-outline)' }}>{label}</span>
                    <span className={`text-sm font-semibold text-[var(--color-on-surface)] truncate ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--color-outline-variant)', margin: '0 24px' }} />

            {/* Contratos */}
            <div style={{ height: 1, background: 'var(--color-outline-variant)', margin: '0 24px' }} />
            <ContratosResumoSection userId={user.id} />

            {/* Histórico de Ações */}
            <div style={{ height: 1, background: 'var(--color-outline-variant)', margin: '0 24px' }} />
            <ActivityLogSection entityType="usuario" entityId={user.id} />

            {/* Redes Sociais */}
            <div className="px-6 py-5">
              <p className="text-[10px] font-bold text-[var(--color-outline)] uppercase tracking-widest mb-4">Redes & Contato</p>
              <div className="flex flex-col gap-2">
                {([
                  {
                    id: 'instagram',
                    label: 'Instagram',
                    rawValue: user.socials?.instagram ?? null,
                    display: user.socials?.instagram ? (user.socials.instagram.startsWith('@') ? user.socials.instagram : `@${user.socials.instagram}`) : null,
                    color: '#E1306C',
                    icon: <InstagramIcon />,
                    href: user.socials?.instagram ? `https://instagram.com/${user.socials.instagram.replace('@', '')}` : null,
                  },
                  {
                    id: 'telegram',
                    label: 'Telegram',
                    rawValue: user.socials?.telegram_canal ?? null,
                    display: user.socials?.telegram_canal ?? null,
                    color: '#0088CC',
                    icon: <TelegramIcon />,
                    href: user.socials?.telegram_canal ? telegramHref(user.socials.telegram_canal) : null,
                  },
                  {
                    id: 'whatsapp',
                    label: 'Grupo WhatsApp',
                    rawValue: user.socials?.whatsapp_canal ?? null,
                    display: user.socials?.whatsapp_canal ?? null,
                    color: '#25D366',
                    icon: <WhatsAppIcon />,
                    href: user.socials?.whatsapp_canal ? whatsappGroupHref(user.socials.whatsapp_canal) : null,
                  },
                  {
                    id: 'telefone',
                    label: 'Telefone',
                    rawValue: user.telefone ?? null,
                    display: user.telefone ? formatPhone(user.telefone) : null,
                    color: '#22D3A5',
                    icon: <PhoneIcon />,
                    href: user.telefone ? `https://wa.me/${user.telefone.replace(/\D/g, '')}` : null,
                  },
                ] as const).map(({ id, label, display, rawValue, color, icon, href }) => {
                  const RowTag = href ? 'a' : 'div'
                  const rowProps = href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {}
                  return (
                    <RowTag
                      key={id}
                      {...(rowProps as Record<string, string>)}
                      className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-all ${href ? 'cursor-pointer hover:opacity-80' : ''}`}
                      style={{ background: 'var(--color-surface-container-low)', border: `1px solid ${display ? `${color}30` : 'var(--color-outline-variant)'}`, textDecoration: 'none' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${color}18`, color }}
                        >
                          {icon}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: 'var(--color-outline)' }}>{label}</span>
                          {display && <span className="text-xs font-medium truncate block" style={{ color: 'var(--color-on-surface)' }}>{display}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {display ? (
                          <>
                            {href && (
                              <span className="material-symbols-outlined text-[15px]" style={{ color }}>open_in_new</span>
                            )}
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopy(rawValue ?? '', id) }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                              style={{
                                background: copiedField === id ? 'rgba(34,211,165,0.15)' : 'var(--color-surface-container)',
                                border: `1px solid ${copiedField === id ? 'rgba(34,211,165,0.3)' : 'var(--color-outline-variant)'}`,
                                color: copiedField === id ? '#22D3A5' : 'var(--color-on-surface-variant)',
                              }}
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {copiedField === id ? 'check' : 'content_copy'}
                              </span>
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium" style={{ background: 'var(--color-surface-container)', color: 'var(--color-outline)', border: '1px solid var(--color-outline-variant)' }}>
                            Não informado
                          </span>
                        )}
                      </div>
                    </RowTag>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
}

/* ── Brand Icons ── */

function InstagramIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
}

function TelegramIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" /></svg>
}

function WhatsAppIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
}

function PhoneIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
}
