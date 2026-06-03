'use client'

import React, { useState, useTransition } from 'react'
import { aceitarAfiliado, recusarAfiliado } from '../actions'

type Contrato = {
  id: string
  tipo_contrato: string
  afp: string
  casas_aposta: { nome_exibicao: string }
}

type SubAfiliado = {
  id: string
  nome_completo: string
  email: string
  status_aprovacao: string
  created_at: Date
  premium: boolean
  user_roles: { contratos: Contrato[] }[]
}

interface Props {
  subAfiliados: SubAfiliado[]
  refCode: string | null
}

export default function SubAfiliadosClient({ subAfiliados, refCode }: Props) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('Todos')
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  function handleAceitar(id: string) {
    setPendingId(id)
    startTransition(async () => {
      await aceitarAfiliado(id)
      setPendingId(null)
    })
  }

  function handleRecusar(id: string) {
    setPendingId(id)
    startTransition(async () => {
      await recusarAfiliado(id)
      setPendingId(null)
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aff.blackboxinfluencers.com'
  const inviteLink = refCode ? `${appUrl}/auth?ref=${refCode}` : null

  async function handleCopy() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
    } catch {
      const el = document.createElement('textarea')
      el.value = inviteLink
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const stats = {
    total: subAfiliados.length,
    pendentes: subAfiliados.filter(s => s.status_aprovacao === 'PENDENTE').length,
    aprovados: subAfiliados.filter(s => s.status_aprovacao === 'APROVADO').length,
    bloqueados: subAfiliados.filter(s => s.status_aprovacao === 'BLOQUEADO').length, // Assumindo que exista ou REPROVADO
  }

  const tabs = [
    { id: 'Todos', label: `Todos (${stats.total})` },
    { id: 'Pendentes', label: `Pendentes (${stats.pendentes})` },
    { id: 'Aprovados', label: `Aprovados (${stats.aprovados})` },
    { id: 'Bloqueados', label: `Bloqueados (${stats.bloqueados})` },
    { id: 'Premium', label: '⭐ Premium' },
    { id: 'Qualificados', label: '📈 Qualificados' },
  ]

  const filtered = subAfiliados.filter(sub => {
    if (activeTab === 'Pendentes' && sub.status_aprovacao !== 'PENDENTE') return false
    if (activeTab === 'Aprovados' && sub.status_aprovacao !== 'APROVADO') return false
    if (activeTab === 'Bloqueados' && sub.status_aprovacao !== 'BLOQUEADO') return false
    if (activeTab === 'Premium' && !sub.premium) return false
    
    if (search) {
      const s = search.toLowerCase()
      if (!sub.nome_completo.toLowerCase().includes(s) && !sub.email.toLowerCase().includes(s)) {
        return false
      }
    }
    return true
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Link de Convite */}
      <div className="glass-card rounded-xl p-4 flex flex-col gap-3 border border-[var(--color-outline-variant)]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--color-primary)]">link</span>
          <h3 className="text-label-lg font-semibold text-[var(--color-on-surface)]">Link de Convite</h3>
        </div>
        <p className="text-body-sm text-[var(--color-on-surface-variant)]">
          Compartilhe este link para convidar novos afiliados à sua rede.
        </p>
        {inviteLink ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-lg px-3 py-2 text-sm text-[var(--color-on-surface-variant)] font-mono truncate select-all">
              {inviteLink}
            </div>
            <button
              onClick={handleCopy}
              title={copied ? 'Copiado!' : 'Copiar link'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
              style={{
                background: copied ? 'var(--color-success-container, rgba(0,200,83,0.15))' : 'var(--color-primary-container)',
                color: copied ? 'var(--color-success, #00c853)' : 'var(--color-on-primary)',
                border: 'none',
              }}
            >
              <span className="material-symbols-outlined text-[18px]">{copied ? 'check' : 'content_copy'}</span>
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        ) : (
          <p className="text-xs text-[var(--color-error)]">
            Nenhum código de convite encontrado para o seu perfil de Gerente.
          </p>
        )}
      </div>

      {/* Busca e Tabs */}
      <div className="flex flex-col gap-4">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] text-[20px]">search</span>
          <input 
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>

        <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-[var(--color-surface-container-highest)] text-[var(--color-primary)] border border-[var(--color-primary)]/30' 
                  : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-on-surface)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="glass-card rounded-xl border border-[var(--color-outline-variant)] overflow-hidden flex-1">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)] custom-scrollbar">
          <table className="orbit-table w-full relative">
            <thead className="bg-[var(--color-surface-container-low)] border-b border-[var(--color-outline-variant)] sticky top-0 z-10">
              <tr>
                <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)] uppercase bg-[var(--color-surface-container-low)] whitespace-nowrap">Nome</th>
                <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)] uppercase bg-[var(--color-surface-container-low)] whitespace-nowrap">Email</th>
                <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)] uppercase bg-[var(--color-surface-container-low)] whitespace-nowrap">Status</th>
                <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)] uppercase bg-[var(--color-surface-container-low)] whitespace-nowrap">Cadastro</th>
                <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)] uppercase bg-[var(--color-surface-container-low)] whitespace-nowrap">Contrato</th>
                <th className="text-center px-6 py-3 text-label-md text-[var(--color-on-surface-variant)] uppercase bg-[var(--color-surface-container-low)] whitespace-nowrap">Ações</th>
                <th className="w-8 pr-3 bg-[var(--color-surface-container-low)]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-outline-variant)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[var(--color-on-surface-variant)]">
                    Nenhum afiliado encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map(sub => (
                  <tr key={sub.id} className="hover:bg-[var(--color-surface-container-high)] transition-colors group cursor-pointer">
                    <td className="px-6 py-4 font-medium text-[var(--color-on-surface)]">{sub.nome_completo}</td>
                    <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">{sub.email}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${
                        sub.status_aprovacao === 'APROVADO' ? 'badge-green' :
                        sub.status_aprovacao === 'PENDENTE' ? 'badge-yellow' :
                        'badge-red'
                      }`}>
                        {sub.status_aprovacao}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">
                      {new Date(sub.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">
                      {(() => {
                        const count = sub.user_roles.flatMap(r => r.contratos).length
                        if (count === 0) return 'Sem contrato'
                        return `${count} ${count === 1 ? 'contrato' : 'contratos'}`
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {sub.status_aprovacao === 'PENDENTE' ? (
                          <>
                            <button
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                              style={{ background: 'rgba(34,211,165,0.12)', color: '#22D3A5' }}
                              title="Aceitar afiliado"
                              disabled={isPending && pendingId === sub.id}
                              onClick={() => handleAceitar(sub.id)}
                            >
                              <span className="material-symbols-outlined text-[16px]">check</span>
                              Aceitar
                            </button>
                            <button
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                              style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
                              title="Recusar afiliado"
                              disabled={isPending && pendingId === sub.id}
                              onClick={() => handleRecusar(sub.id)}
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                              Recusar
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="icon-btn hover:bg-[var(--color-surface-container-highest)]" title="Gerenciar Contrato">
                              <span className="material-symbols-outlined text-[18px]">description</span>
                            </button>
                            <button className="icon-btn hover:bg-[var(--color-surface-container-highest)]" title="Alterar Comissão">
                              <span className="material-symbols-outlined text-[18px]">trending_up</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="pr-4 text-right">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
                        <path d="M6 3l5 5-5 5" />
                      </svg>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
