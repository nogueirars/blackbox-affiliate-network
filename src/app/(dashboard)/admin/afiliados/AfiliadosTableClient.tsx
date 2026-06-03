'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AfiliadoDetailDrawer from './AfiliadoDetailDrawer'

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
  auth_id: string
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

interface ProdData {
  ftds: number
  cpas: number
  receita: number
  lastDate: string | null
  contratosCount: number
}

interface Props {
  users: UserDetail[]
  userProdObj: Record<string, ProdData>
}

const ROLE_LABEL: Record<string, string> = {
  AFILIADO: 'Afiliado',
  INTERMEDIARIO: 'Intermediário',
  GERENTE: 'Gerente',
  ADMIN: 'Admin',
}

const ROLE_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  AFILIADO: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
  GERENTE: { bg: 'rgba(2,117,243,0.12)', color: '#0275F3' },
  INTERMEDIARIO: { bg: 'rgba(251,146,60,0.12)', color: '#fb923c' },
  ADMIN: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
}

const STATUS_STYLE: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  APROVADO: { bg: 'rgba(34,211,165,0.12)', color: '#22D3A5', dot: '#22D3A5', label: 'Aprovado' },
  PENDENTE: { bg: 'rgba(250,204,21,0.12)', color: '#facc15', dot: '#facc15', label: 'Pendente' },
  REPROVADO: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', dot: '#ef4444', label: 'Reprovado' },
  BLOQUEADO: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', dot: '#ef4444', label: 'Bloqueado' },
  BLOQUEADO_TEMPORARIAMENTE: { bg: 'rgba(249,115,22,0.12)', color: '#f97316', dot: '#f97316', label: 'Bloq. temp.' },
}

function relativeTime(dateStr: string | null | undefined, updatedAtStr: string | Date, createdAtStr: string | Date): string {
  const finalDate = dateStr ? new Date(dateStr) : new Date(updatedAtStr || createdAtStr)
  const diffMs = Date.now() - finalDate.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) return 'hoje'
  if (diffDays === 1) return 'há 1 dia'
  if (diffDays < 30) return `há ${diffDays} dias`
  const months = Math.floor(diffDays / 30)
  if (months === 1) return 'há 1 mês'
  if (months < 12) return `há ${months} meses`
  return `há ${Math.floor(months / 12)} ano(s)`
}

function fmtBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AfiliadosTableClient({ users, userProdObj }: Props) {
  const router = useRouter()
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)

  // Sync drawer info if backend data refreshes
  useEffect(() => {
    if (selectedUser) {
      const updated = users.find((u) => u.id === selectedUser.id)
      if (updated) {
        setSelectedUser(updated)
      }
    }
  }, [users])

  function handleUpdate() {
    router.refresh()
  }

  const selectedProd = selectedUser
    ? userProdObj[selectedUser.id] ?? { ftds: 0, cpas: 0, receita: 0, lastDate: null }
    : { ftds: 0, cpas: 0, receita: 0, lastDate: null }

  return (
    <>
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full table-fixed">
          <thead
            style={{
              background: 'var(--color-surface-container-low)',
              borderBottom: '1px solid var(--color-outline-variant)',
            }}
          >
            <tr>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-[35%]" style={{ color: 'var(--color-on-surface-variant)' }}>
                Nome
              </th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider w-[12%]" style={{ color: 'var(--color-on-surface-variant)' }}>
                Status
              </th>
              <th className="text-right px-3 py-3 text-[11px] font-semibold uppercase tracking-wider w-[7%]" style={{ color: 'var(--color-on-surface-variant)' }}>
                FTDs
              </th>
              <th className="text-right px-3 py-3 text-[11px] font-semibold uppercase tracking-wider w-[7%]" style={{ color: '#22d3ea' }}>
                CPAs
              </th>
              <th className="text-right px-3 py-3 text-[11px] font-semibold uppercase tracking-wider w-[8%]" style={{ color: 'var(--color-on-surface-variant)' }}>
                Contr.
              </th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider w-[11%]" style={{ color: 'var(--color-on-surface-variant)' }}>
                Atividade
              </th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider w-[16%]" style={{ color: 'var(--color-on-surface-variant)' }}>
                Função
              </th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((p) => {
              const initials = (p.nome_completo ?? p.email ?? 'U')
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase()
              const statusInfo = STATUS_STYLE[p.status_aprovacao] ?? STATUS_STYLE.PENDENTE
              const parentGerente = p.users_users_id_gerenteTousers?.nome_completo
              const parentInter = p.users_users_id_intermediarioTousers?.nome_completo
              const parentName = parentGerente ?? parentInter ?? null

              const prod = userProdObj[p.id] ?? { ftds: 0, cpas: 0, receita: 0, lastDate: null }
              const lastActivity = prod.lastDate

              return (
                <tr
                  key={p.id}
                  onClick={() => setSelectedUser(p)}
                  style={{ borderBottom: '1px solid var(--color-outline-variant)' }}
                  className="transition-colors hover:bg-[var(--color-surface-container-high)] cursor-pointer"
                >
                  {/* Nome */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                        style={{
                          background: 'rgba(2,117,243,0.15)',
                          border: '1px solid rgba(2,117,243,0.2)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-on-surface)' }}>
                          {p.nome_completo || '—'}
                        </p>
                        <p className="text-[10px] truncate" style={{ color: 'var(--color-outline)' }}>
                          {p.email}
                        </p>
                        {parentName && (
                          <p className="text-[10px] truncate" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.7 }}>
                            {parentGerente ? 'Ger.:' : 'Int.:'} {parentName}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2.5">
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap"
                      style={{ background: statusInfo.bg, color: statusInfo.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusInfo.dot }} />
                      {statusInfo.label}
                    </span>
                  </td>

                  {/* FTDs */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--color-on-surface)' }}>
                      {prod.ftds.toLocaleString('pt-BR')}
                    </span>
                  </td>

                  {/* CPAs */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs font-semibold tabular-nums" style={{ color: '#22d3ea' }}>
                      {prod.cpas.toLocaleString('pt-BR')}
                    </span>
                  </td>

                  {/* Contratos */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--color-on-surface)' }}>
                      {prod.contratosCount}
                    </span>
                  </td>

                  {/* Atividade */}
                  <td className="px-3 py-2.5">
                    <span className="text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>
                      {relativeTime(lastActivity, p.created_at, p.created_at)}
                    </span>
                  </td>

                  {/* Função */}
                  <td className="px-3 py-2.5">
                    {p.user_roles.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {p.user_roles.map((ur, i) => {
                          const s = ROLE_BADGE_STYLE[ur.role] ?? { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' }
                          return (
                            <span
                              key={i}
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                              style={{ background: s.bg, color: s.color }}
                            >
                              {ROLE_LABEL[ur.role] ?? ur.role}
                            </span>
                          )
                        })}
                        {p.premium && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}
                          >
                            ★
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px]" style={{ color: 'var(--color-outline)' }}>—</span>
                    )}
                  </td>
                  <td className="pr-3 py-2.5">
                    <div className="flex justify-end">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
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

      <AfiliadoDetailDrawer
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        prod={selectedProd}
        onUpdate={handleUpdate}
      />
    </>
  )
}
