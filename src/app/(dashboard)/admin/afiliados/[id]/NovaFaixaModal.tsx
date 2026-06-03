'use client'

import { useState } from 'react'
import Drawer from '@/components/ui/Drawer'

interface Props {
  open: boolean
  contratoId: string
  onClose: () => void
  onSaved: () => void
}

const inputCls = 'w-full rounded-xl px-3 py-2 text-sm bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] focus:outline-none focus:border-[var(--color-primary)] transition-colors'
const labelCls = 'text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]'

export default function NovaFaixaModal({ open, contratoId, onClose, onSaved }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [dataInicio, setDataInicio] = useState(today)
  const [dataFimIndefinido, setDataFimIndefinido] = useState(true)
  const [dataFim, setDataFim] = useState('')
  const [cpaBruto, setCpaBruto] = useState('')
  const [aliquota, setAliquota] = useState('14.5')
  const [revsharePerc, setRevsharePerc] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/contratos/${contratoId}/historico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_inicio: dataInicio,
          data_fim: dataFimIndefinido ? null : (dataFim || null),
          cpa_bruto: cpaBruto !== '' ? cpaBruto : null,
          aliquota_imposto: aliquota !== '' ? aliquota : null,
          revshare_percentual: revsharePerc !== '' ? revsharePerc : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro ao salvar faixa'); return }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div>
          <p className="font-bold text-base text-[var(--color-on-surface)]">Nova Faixa de Histórico</p>
          <p className="text-xs text-[var(--color-on-surface-variant)] opacity-60 mt-0.5">
            Adiciona nova condição financeira ao contrato
          </p>
        </div>
      }
      size="md"
    >
      <form onSubmit={submit} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">

          {error && (
            <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Período */}
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">date_range</span>
              Período
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Data de Início <span className="text-red-400">*</span></label>
                <input
                  type="date" className={inputCls} style={{ colorScheme: 'dark' }}
                  value={dataInicio} onChange={e => setDataInicio(e.target.value)} required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Data de Fim</label>
                {dataFimIndefinido ? (
                  <div className="flex items-center h-9 px-3 rounded-xl text-xs text-[var(--color-on-surface-variant)] opacity-60 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">
                    Indefinido
                  </div>
                ) : (
                  <input
                    type="date" className={inputCls} style={{ colorScheme: 'dark' }}
                    value={dataFim} onChange={e => setDataFim(e.target.value)} min={dataInicio}
                  />
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)] cursor-pointer select-none -mt-1">
              <input
                type="checkbox" checked={dataFimIndefinido}
                onChange={e => setDataFimIndefinido(e.target.checked)} className="rounded"
              />
              Sem data de fim definida
            </label>
          </section>

          <hr className="border-[var(--color-outline-variant)]" />

          {/* Valores */}
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">payments</span>
              Condições Financeiras
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>CPA Bruto (R$)</label>
                <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00"
                  value={cpaBruto} onChange={e => setCpaBruto(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Alíquota Imposto (%)</label>
                <input type="number" min="0" max="100" step="0.01" className={inputCls} placeholder="14.5"
                  value={aliquota} onChange={e => setAliquota(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>RevShare (%)</label>
                <input type="number" min="0" max="100" step="0.01" className={inputCls} placeholder="0.00"
                  value={revsharePerc} onChange={e => setRevsharePerc(e.target.value)} />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-6 py-4 border-t flex items-center justify-between gap-3"
          style={{ borderColor: 'var(--color-outline-variant)', background: 'var(--color-surface-container-high)' }}
        >
          <button
            type="button" onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-highest)] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit" disabled={!dataInicio || saving}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary)' }}
          >
            {saving
              ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>Salvando…</>
              : <><span className="material-symbols-outlined text-[16px]">add</span>Salvar Faixa</>
            }
          </button>
        </div>
      </form>
    </Drawer>
  )
}
