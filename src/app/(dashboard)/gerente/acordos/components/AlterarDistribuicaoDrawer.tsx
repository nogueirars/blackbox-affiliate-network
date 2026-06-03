'use client'

import React, { useState } from 'react'
import Drawer from '@/components/ui/Drawer'
import type { Acordo, Influencer, SubContrato } from '../page'

interface Props {
  influencer: Influencer
  acordo: Acordo
  subContrato: SubContrato
  onClose: () => void
  onSuccess: () => void
}

const inputCls = 'w-full rounded-xl px-3 py-2 text-sm bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] focus:outline-none focus:border-[var(--color-primary)] transition-colors'
const labelCls = 'text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]'

export default function AlterarDistribuicaoDrawer({ influencer, acordo, subContrato, onClose, onSuccess }: Props) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const [isOpen, setIsOpen] = useState(true)
  const [dataInicio, setDataInicio] = useState(tomorrow)
  const [cpa, setCpa] = useState(subContrato.historico?.cpa_bruto?.toString() ?? '')
  const [revshare, setRevshare] = useState(subContrato.historico?.revshare_percentual?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/gerente/contratos/${subContrato.id}/historico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpa_bruto: cpa !== '' ? parseFloat(cpa) : null,
          revshare_percentual: revshare !== '' ? parseFloat(revshare) : null,
          data_inicio: dataInicio,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Erro ao salvar distribuição')
        return
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSaving(false)
    }
  }

  const title = (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-sm font-bold text-[var(--color-on-surface)] truncate">
        Alterar Distribuição — {influencer.nome_completo}
      </span>
      <span className="text-xs text-[var(--color-on-surface-variant)] truncate">
        Acordo: {acordo.casa.nome_exibicao}
      </span>
    </div>
  )

  const footer = (
    <div className="px-6 py-4 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-highest)] transition-colors"
      >
        Cancelar
      </button>
      <button
        form="alterar-distribuicao-form"
        type="submit"
        disabled={saving || !dataInicio}
        className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'var(--color-primary)' }}
      >
        {saving
          ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Salvando…</>
          : <><span className="material-symbols-outlined text-[16px]">save</span> Salvar</>
        }
      </button>
    </div>
  )

  return (
    <Drawer open={isOpen} onClose={onClose} title={title} footer={footer} size="sm">
      <form id="alterar-distribuicao-form" onSubmit={submit} className="px-6 py-6 flex flex-col gap-5">
        {error && (
          <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Data de Início do Novo Período <span className="text-red-400">*</span></label>
          <input
            type="date"
            className={inputCls}
            style={{ colorScheme: 'dark' }}
            min={tomorrow}
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>CPA Repasse (R$)</label>
          <input
            type="number"
            min="0"
            max={acordo.historico?.cpa_bruto ?? undefined}
            step="0.01"
            className={inputCls}
            placeholder="0.00"
            value={cpa}
            onChange={e => setCpa(e.target.value)}
          />
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            Teto: R$ {acordo.historico?.cpa_bruto?.toFixed(2) ?? '—'}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>RevShare Repasse (%)</label>
          <input
            type="number"
            min="0"
            max={acordo.historico?.revshare_percentual ?? undefined}
            step="0.01"
            className={inputCls}
            placeholder="0.00"
            value={revshare}
            onChange={e => setRevshare(e.target.value)}
          />
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            Teto: {acordo.historico?.revshare_percentual ?? '—'}%
          </span>
        </div>
      </form>
    </Drawer>
  )
}
