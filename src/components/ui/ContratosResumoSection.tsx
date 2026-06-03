'use client'

import { useEffect, useState } from 'react'

interface Contrato {
  id: string
  afp: string | null
  tipo_contrato: string
  ativo: boolean
  id_casa: string
  casas_aposta?: { nome_exibicao: string } | null
}

interface Props {
  userId: string
}

const TIPO_STYLE: Record<string, { bg: string; color: string }> = {
  CPA:      { bg: 'rgba(34,211,165,0.12)',  color: '#22D3A5' },
  REVSHARE: { bg: 'rgba(2,117,243,0.12)',   color: '#0275F3' },
  MISTO:    { bg: 'rgba(192,132,252,0.12)', color: '#c084fc' },
}

export default function ContratosResumoSection({ userId }: Props) {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [casaNames, setCasaNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    fetch(`/api/admin/afiliados/${userId}`)
      .then(r => r.json())
      .then(data => {
        const list: Contrato[] = data.contratos ?? []
        setContratos(list)

        const names: Record<string, string> = {}
        for (const c of list) {
          if (c.casas_aposta?.nome_exibicao) {
            names[c.id_casa] = c.casas_aposta.nome_exibicao
          }
        }
        setCasaNames(names)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const ativos     = contratos.filter(c => c.ativo)
  const encerrados = contratos.filter(c => !c.ativo)

  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold text-[var(--color-outline)] uppercase tracking-widest">
          Contratos
        </p>
        {contratos.length > 0 && (
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(34,211,165,0.12)', color: '#22D3A5' }}
            >
              {ativos.length} ativo{ativos.length !== 1 ? 's' : ''}
            </span>
            {encerrados.length > 0 && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-on-surface-variant)', border: '1px solid var(--color-outline-variant)' }}
              >
                {encerrados.length} encerrado{encerrados.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3" style={{ color: 'var(--color-on-surface-variant)' }}>
          <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
          <span className="text-xs">Carregando…</span>
        </div>
      ) : contratos.length === 0 ? (
        <div
          className="flex items-center gap-2 py-3 px-3 rounded-xl"
          style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)' }}
        >
          <span className="material-symbols-outlined text-[16px] opacity-40">description</span>
          <span className="text-xs opacity-50">Nenhum contrato registrado</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {contratos.map(c => {
            const tipoStyle = TIPO_STYLE[c.tipo_contrato] ?? { bg: 'rgba(120,120,120,0.12)', color: '#888' }
            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                style={{
                  background: 'var(--color-surface-container-low)',
                  border: '1px solid var(--color-outline-variant)',
                  opacity: c.ativo ? 1 : 0.55,
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="material-symbols-outlined text-[16px] flex-shrink-0"
                    style={{ color: c.ativo ? '#22D3A5' : 'var(--color-outline)' }}
                  >
                    {c.ativo ? 'task_alt' : 'cancel'}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span
                      className="font-mono text-xs font-semibold truncate"
                      style={{ color: 'var(--color-on-surface)' }}
                    >
                      {c.afp ?? c.id.slice(0, 10) + '…'}
                    </span>
                    {casaNames[c.id_casa] && (
                      <span className="text-[10px] truncate" style={{ color: 'var(--color-on-surface-variant)' }}>
                        {casaNames[c.id_casa]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={tipoStyle}
                  >
                    {c.tipo_contrato}
                  </span>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{
                      background: c.ativo ? 'rgba(34,211,165,0.08)' : 'rgba(255,255,255,0.04)',
                      color: c.ativo ? '#22D3A5' : 'var(--color-outline)',
                    }}
                  >
                    {c.ativo ? 'Ativo' : 'Encerrado'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
