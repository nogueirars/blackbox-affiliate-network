'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import NewUsuarioDrawer from './NewUsuarioDrawer'
import EditUsuarioDrawer from './EditUsuarioDrawer'

interface UserRole {
  role: string
  ativo: boolean
}

interface AdminDetail {
  id: string
  nome_completo: string
  email: string
  telefone: string
  data_nascimento?: string | Date
  created_at: string | Date
  ativo: boolean
  status_aprovacao: string
  user_roles: UserRole[]
}

interface Props {
  admins: AdminDetail[]
  currentUserEmail: string
  q: string
}

export default function UsuariosTableClient({ admins, currentUserEmail, q }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<AdminDetail | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  function handleSearch() {
    const val = inputRef.current?.value ?? ''
    if (val) {
      router.push(`/admin/usuarios?q=${encodeURIComponent(val)}`)
    } else {
      router.push('/admin/usuarios')
    }
  }

  async function toggleStatus(admin: AdminDetail) {
    if (admin.email === currentUserEmail) return

    setLoadingId(admin.id)
    setErrorMessage('')

    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: admin.id, ativo: !admin.ativo }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.error ?? 'Erro ao alterar status do usuário.')
        return
      }

      router.refresh()
    } catch {
      setErrorMessage('Erro de conexão ao alterar status.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Search and Action Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] pointer-events-none" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>search</span>
          <input
            ref={inputRef}
            defaultValue={q}
            placeholder="Buscar por nome ou e-mail"
            className="w-full outline-none rounded-xl text-sm pl-9 pr-4 py-2.5 transition-all"
            style={{ background: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearch()
              }
            }}
          />
        </div>

        {/* Clear Search */}
        {q && (
          <button
            onClick={() => {
              if (inputRef.current) inputRef.current.value = ''
              router.push('/admin/usuarios')
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
            Limpar Busca
          </button>
        )}

        {/* Create Button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap ml-auto"
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
          }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Novo Administrador
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          className="p-4 rounded-xl text-sm font-medium border"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
        >
          {errorMessage}
        </div>
      )}

      {/* Admins Table */}
      <div className="glass-card rounded-xl overflow-x-auto">
        <table className="w-full">
          <thead
            style={{
              background: 'var(--color-surface-container-low)',
              borderBottom: '1px solid var(--color-outline-variant)',
            }}
          >
            <tr>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--color-on-surface-variant)' }}>
                Nome / E-mail
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--color-on-surface-variant)' }}>
                Telefone
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--color-on-surface-variant)' }}>
                Data de Criação
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--color-on-surface-variant)' }}>
                Status Cargo
              </th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--color-on-surface-variant)' }}>
                Ações
              </th>
              <th className="w-8 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-[36px] opacity-35" style={{ color: 'var(--color-on-surface-variant)' }}>
                      person_off
                    </span>
                    <p className="text-sm" style={{ color: 'var(--color-outline)' }}>
                      Nenhum administrador encontrado.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              admins.map((admin) => {
                const initials = (admin.nome_completo ?? admin.email)
                  .split(' ')
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()

                const isSelf = admin.email === currentUserEmail
                const isRoleActive = admin.user_roles.some(r => r.role === 'ADMIN' && r.ativo)

                return (
                  <tr
                    key={admin.id}
                    style={{ borderBottom: '1px solid var(--color-outline-variant)' }}
                    className="transition-colors hover:bg-[var(--color-surface-container-high)] cursor-pointer"
                    onClick={() => setEditingAdmin(admin)}
                  >
                    {/* Name / Email */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            background: isSelf ? 'rgba(34,211,165,0.15)' : 'rgba(2,117,243,0.15)',
                            border: isSelf ? '1px solid rgba(34,211,165,0.2)' : '1px solid rgba(2,117,243,0.2)',
                            color: isSelf ? '#22D3A5' : 'var(--color-primary)',
                          }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-on-surface)' }}>
                            {admin.nome_completo} {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-1" style={{ background: 'rgba(34,211,165,0.12)', color: '#22D3A5' }}>Você</span>}
                          </p>
                          <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--color-outline)' }}>
                            {admin.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--color-on-surface-variant)' }}>
                      {admin.telefone || '—'}
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-on-surface-variant)' }}>
                      {new Date(admin.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Cargo Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5"
                        style={{
                          background: isRoleActive ? 'rgba(2,117,243,0.12)' : 'rgba(148,163,184,0.12)',
                          color: isRoleActive ? 'var(--color-primary)' : '#94a3b8',
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: isRoleActive ? 'var(--color-primary)' : '#94a3b8' }} />
                        {isRoleActive ? 'Admin Ativo' : 'Sem Acesso'}
                      </span>
                    </td>

                    {/* Access & Edit Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingAdmin(admin) }}
                          disabled={loadingId === admin.id}
                          className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          Editar
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStatus(admin) }}
                          disabled={isSelf || loadingId === admin.id}
                          className={`inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${isSelf
                            ? 'opacity-40 cursor-not-allowed border-transparent bg-transparent text-[var(--color-outline)]'
                            : admin.ativo
                              ? 'bg-[rgba(239,68,68,0.08)] hover:bg-[rgba(239,68,68,0.15)] text-[#ef4444] border-[rgba(239,68,68,0.2)]'
                              : 'bg-[rgba(34,211,165,0.08)] hover:bg-[rgba(34,211,165,0.15)] text-[#22D3A5] border-[rgba(34,211,165,0.2)]'
                            }`}
                        >
                          {loadingId === admin.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }} />
                          ) : (
                            <span className="material-symbols-outlined text-[14px]">
                              {admin.ativo ? 'block' : 'check'}
                            </span>
                          )}
                          {admin.ativo ? 'Desativar' : 'Reativar'}
                        </button>
                      </div>
                    </td>

                    {/* Chevron */}
                    <td className="pr-4">
                      <div className="flex justify-end">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
                          <path d="M6 3l5 5-5 5" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <NewUsuarioDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => {
          setDrawerOpen(false)
          router.refresh()
        }}
      />

      <EditUsuarioDrawer
        open={!!editingAdmin}
        admin={editingAdmin}
        onClose={() => setEditingAdmin(null)}
        onUpdated={() => {
          setEditingAdmin(null)
          router.refresh()
        }}
      />
    </div>
  )
}
