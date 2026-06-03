'use client'

import { useState } from 'react'
import Drawer from '@/components/ui/Drawer'
import { Casa, EntidadeOption } from '../types'
import { initials, fmtDateLong, Spinner, Field, Select, InfoRow } from '../utils'
import CasaDrawerContent from './CasaDrawerContent'

type FormData = {
  nome_exibicao: string
  razao_social: string
  icone_url: string
  id_entidade: string
}

function toForm(c: Casa): FormData {
  return {
    nome_exibicao: c.nome_exibicao,
    razao_social: c.razao_social,
    icone_url: c.icone_url ?? '',
    id_entidade: c.id_entidade ?? '',
  }
}

function CasaCard({ casa, onClick }: { casa: Casa; onClick: () => void }) {
  const semEntidade = !casa.entidades?.nome && !casa.id_entidade

  return (
    <button
      onClick={onClick}
      className="group relative rounded-xl flex flex-col text-left w-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]"
      style={{
        background: 'var(--color-surface-container)',
        border: '1px solid var(--color-outline-variant)',
        opacity: casa.ativo ? 1 : 0.6,
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <div className="p-5 flex flex-col gap-4 flex-1 w-full z-10 relative">
        {/* Header: Icon & Badge */}
        <div className="flex items-start justify-between gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 shadow-md transition-shadow"
            style={{
              background: casa.icone_url ? 'transparent' : 'var(--color-surface-container-highest)',
              color: 'var(--color-on-surface-variant)',
              overflow: 'hidden',
            }}
          >
            {casa.icone_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={casa.icone_url || undefined} alt={casa.nome_exibicao} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span>{initials(casa.nome_exibicao)}</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1"
              style={{
                background: casa.ativo ? 'rgba(34,211,165,0.12)' : 'rgba(239,68,68,0.12)',
                color: casa.ativo ? '#22D3A5' : '#f87171',
                border: `1px solid ${casa.ativo ? 'rgba(34,211,165,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: casa.ativo ? '#22D3A5' : '#f87171', boxShadow: `0 0 6px ${casa.ativo ? '#22D3A5' : '#f87171'}` }} />
              {casa.ativo ? 'Ativo' : 'Inativo'}
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
              <path d="M6 3l5 5-5 5" />
            </svg>
          </div>
        </div>
        
        {/* Title */}
        <div className="min-w-0 mt-1">
          <p className="font-bold text-[17px] leading-tight truncate" style={{ color: 'var(--color-on-surface)' }}>
            {casa.nome_exibicao}
          </p>
        </div>
        
        {/* Footer: Entidade */}
        <div
          className="flex flex-col gap-2 pt-4 mt-auto"
          style={{ borderTop: '1px solid var(--color-outline-variant)' }}
        >
          {semEntidade ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
              <span className="material-symbols-outlined text-[14px]">warning</span>
              <span className="text-[11px] font-medium uppercase tracking-wider">Sem entidade</span>
            </div>
          ) : casa.entidades?.nome ? (
            <div className="flex items-center gap-2 w-full group-hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0" style={{ background: 'var(--color-surface-container-high)', border: '1px solid var(--color-outline-variant)' }}>
                <span className="material-symbols-outlined text-[12px]" style={{ color: 'var(--color-on-surface-variant)' }}>domain</span>
              </div>
              <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-on-surface-variant)' }}>
                {casa.entidades.nome}
              </span>
            </div>
          ) : null}

          {/* Regras e Materiais Row */}
          <div className="flex items-center gap-2 mt-1">
            {!casa.tem_regras && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-500">
                <span className="material-symbols-outlined text-[14px]">rule_folder</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Faltam regras</span>
              </div>
            )}
            {casa.materiais_count > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'rgba(2,117,243,0.1)', color: 'var(--color-primary)' }}>
                <span className="material-symbols-outlined text-[14px]">campaign</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">{casa.materiais_count} {casa.materiais_count === 1 ? 'material' : 'materiais'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function IntegracoesTab({ casas, entidades, setCasas }: { casas: Casa[], entidades: EntidadeOption[], setCasas: React.Dispatch<React.SetStateAction<Casa[]>> }) {
  const [selected, setSelected] = useState<Casa | null>(null)

  const ativas = casas.filter(c => c.ativo).length
  const inativas = casas.filter(c => !c.ativo).length

  const sortedCasas = [...casas].sort((a, b) => {
    if (a.ativo && !b.ativo) return -1
    if (!a.ativo && b.ativo) return 1
    return a.nome_exibicao.localeCompare(b.nome_exibicao)
  })

  function updateCasa(updated: Casa) {
    setSelected(updated)
    setCasas(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  function openDrawer(casa: Casa) {
    setSelected(casa)
  }
  function closeDrawer() {
    setSelected(null)
  }

  return (
    <div className="flex flex-col gap-4">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sortedCasas.map(casa => (
          <CasaCard key={casa.id} casa={casa} onClick={() => openDrawer(casa)} />
        ))}
      </div>

      <Drawer
        open={!!selected}
        onClose={closeDrawer}
        title={selected ? "Gerenciar Casa" : ""}
        size="md"
      >
        {selected && (
          <CasaDrawerContent 
            casa={selected} 
            entidades={entidades} 
            onUpdateCasa={updateCasa}
          />
        )}
      </Drawer>
    </div>
  )
}
