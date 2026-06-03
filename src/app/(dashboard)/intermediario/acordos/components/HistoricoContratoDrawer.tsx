'use client'

import { useState } from 'react'
import Drawer from '@/components/ui/Drawer'
import type { HistoricoTermos } from '../page'

interface Props {
  nome: string
  subtitulo: string
  historicoList: HistoricoTermos[]
  onClose: () => void
}

export default function HistoricoContratoDrawer({ nome, subtitulo, historicoList, onClose }: Props) {
  const [isOpen, setIsOpen] = useState(true)

  const title = (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-sm font-bold text-[var(--color-on-surface)] truncate">
        Histórico — {nome}
      </span>
      <span className="text-xs text-[var(--color-on-surface-variant)] truncate">{subtitulo}</span>
    </div>
  )

  const footer = (
    <div className="px-6 py-4">
      <button
        onClick={() => setIsOpen(false)}
        className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-highest)] transition-colors"
      >
        Fechar
      </button>
    </div>
  )

  return (
    <Drawer open={isOpen} onClose={onClose} title={title} footer={footer} size="sm">
      <div className="px-6 py-6 flex flex-col gap-3">
        {historicoList.length === 0 ? (
          <p className="text-sm text-center text-[var(--color-on-surface-variant)] opacity-60 py-8">
            Nenhum histórico encontrado.
          </p>
        ) : (
          <div className="relative">
            {/* vertical line */}
            <div
              className="absolute left-[11px] top-4 bottom-4"
              style={{ width: 2, background: 'var(--color-outline-variant)' }}
            />
            <div className="flex flex-col gap-4">
              {historicoList.map((h, i) => {
                const isAtivo = h.data_fim === null
                const dataInicio = new Date(h.data_inicio).toLocaleDateString('pt-BR')
                const dataFim = h.data_fim ? new Date(h.data_fim).toLocaleDateString('pt-BR') : null
                return (
                  <div key={h.id} className="flex gap-4 items-start">
                    {/* dot */}
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                      style={{
                        background: isAtivo ? 'var(--color-primary)' : 'var(--color-surface-container-highest)',
                        border: `2px solid ${isAtivo ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`,
                      }}
                    >
                      {isAtivo && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>

                    {/* card */}
                    <div
                      className="flex-1 rounded-xl p-4 flex flex-col gap-3 mb-1"
                      style={{
                        background: isAtivo ? 'var(--color-primary-container, rgba(2,117,243,0.06))' : 'var(--color-surface-container-low)',
                        border: `1px solid ${isAtivo ? 'var(--color-outline)' : 'var(--color-outline-variant)'}`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-md"
                            style={{
                              background: isAtivo ? 'var(--color-primary-container, rgba(2,117,243,0.12))' : 'var(--color-surface-container-highest)',
                              color: isAtivo ? 'var(--color-primary)' : 'var(--color-on-surface)',
                            }}
                          >
                            {dataInicio}
                          </span>
                          <span className="text-xs text-[var(--color-on-surface-variant)]">→</span>
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-md"
                            style={{
                              background: isAtivo ? 'rgba(34,211,165,0.1)' : 'var(--color-surface-container-highest)',
                              color: isAtivo ? '#22D3A5' : 'var(--color-on-surface-variant)',
                            }}
                          >
                            {dataFim ?? 'atual'}
                          </span>
                        </div>
                        {isAtivo && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ background: 'var(--color-primary-container, rgba(2,117,243,0.15))', color: 'var(--color-primary)' }}
                          >
                            Ativo
                          </span>
                        )}
                        {i === 0 && !isAtivo && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ background: 'rgba(148,163,184,0.1)', color: 'rgba(148,163,184,0.7)' }}
                          >
                            Encerrado
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">CPA</span>
                          <p className="text-base font-bold mt-0.5 text-[var(--color-on-surface)]">
                            {h.cpa_bruto != null ? `R$ ${h.cpa_bruto.toFixed(2)}` : '—'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">RevShare</span>
                          <p className="text-base font-bold mt-0.5 text-[var(--color-on-surface)]">
                            {h.revshare_percentual != null ? `${h.revshare_percentual}%` : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
}
