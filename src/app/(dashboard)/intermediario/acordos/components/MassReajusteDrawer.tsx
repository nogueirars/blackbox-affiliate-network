'use client'

import React, { useState, useMemo } from 'react'
import Drawer from '@/components/ui/Drawer'
import type { Acordo, Influencer } from '../page'

interface Props {
  acordo: Acordo
  influencers: Influencer[]
  onClose: () => void
  onSuccess: () => void
}

const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] focus:outline-none focus:border-[var(--color-primary)] transition-colors'
const labelCls = 'text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]'

export default function MassReajusteDrawer({ acordo, influencers, onClose, onSuccess }: Props) {
  const afetaveis = useMemo(
    () => influencers.filter(inf => !!inf.subContratos[acordo.id]),
    [influencers, acordo.id],
  )

  const [isOpen, setIsOpen] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [novoCpa, setNovoCpa] = useState('')
  const [novoRevshare, setNovoRevshare] = useState('')
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const [dataVigencia, setDataVigencia] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Stats do acordo ────────────────────────────────────────────────
  const cpaGerente = acordo.historico?.cpa_bruto ?? null
  const revGerente = acordo.historico?.revshare_percentual ?? null

  const repasses = afetaveis.map(inf => inf.subContratos[acordo.id]?.historico)
  const avgCpaRepasse = repasses.length
    ? repasses.reduce((s, h) => s + (h?.cpa_bruto ?? 0), 0) / repasses.length
    : null
  const avgRevRepasse = repasses.length
    ? repasses.reduce((s, h) => s + (h?.revshare_percentual ?? 0), 0) / repasses.length
    : null

  // ── Seleção ────────────────────────────────────────────────────────
  const allSelected = afetaveis.length > 0 && selected.size === afetaveis.length

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(afetaveis.map(inf => inf.subContratos[acordo.id].id)))
    }
  }

  function toggleOne(subId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(subId) ? next.delete(subId) : next.add(subId)
      return next
    })
  }

  // ── Validação ──────────────────────────────────────────────────────
  const hasValue = novoCpa !== '' || novoRevshare !== ''
  const canSubmit = selected.size > 0 && hasValue && !!dataVigencia && !saving

  const validationHint = !canSubmit && (
    selected.size === 0 ? 'Selecione pelo menos 1 gerente' :
    !hasValue ? 'Preencha pelo menos 1 valor (CPA ou RevShare)' :
    !dataVigencia ? 'Defina a data de vigência' : null
  )

  // ── Submit ─────────────────────────────────────────────────────────
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/intermediario/acordos/${acordo.id}/reajuste-massa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_inicio: dataVigencia,
          cpa_bruto: novoCpa !== '' ? parseFloat(novoCpa) : null,
          revshare_percentual: novoRevshare !== '' ? parseFloat(novoRevshare) : null,
          sub_contrato_ids: [...selected],
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro ao aplicar reajuste'); return }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSaving(false)
    }
  }

  const title = (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-sm font-bold text-[var(--color-on-surface)]">
        Alterar Comissões — {acordo.casa.nome_exibicao}
      </span>
      <span className="text-xs text-[var(--color-on-surface-variant)]">
        Selecione os sub-afiliados e defina os novos valores.
      </span>
    </div>
  )

  const footer = (
    <div className="px-6 py-4 flex flex-col gap-2">
      {validationHint && (
        <p className="text-[10px] text-center uppercase tracking-wider text-[var(--color-on-surface-variant)] opacity-60">
          {validationHint}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-highest)] transition-colors"
        >
          Cancelar
        </button>
        <button
          form="mass-reajuste-form"
          type="submit"
          disabled={!canSubmit}
          className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--color-primary)' }}
        >
          {saving
            ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Aplicando…</>
            : <><span className="material-symbols-outlined text-[16px]">check_circle</span> Revisar e Confirmar</>
          }
        </button>
      </div>
    </div>
  )

  return (
    <Drawer open={isOpen} onClose={onClose} title={title} footer={footer} size="sm">
      <form id="mass-reajuste-form" onSubmit={submit} className="px-6 py-6 flex flex-col gap-6">

        {/* ── Resumo do Acordo ──────────────────────────────────────── */}
        <div
          className="rounded-xl p-4 flex flex-col gap-4"
          style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)' }}
        >
          <p className="text-xs font-bold text-[var(--color-on-surface)]">Seu Acordo — {acordo.casa.nome_exibicao}</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <StatMini label="Você recebe (Bruto)" value={cpaGerente != null ? `R$ ${cpaGerente.toFixed(2)}` : '—'} />
            <StatMini
              label="Repasse médio atual"
              value={avgCpaRepasse != null ? `R$ ${avgCpaRepasse.toFixed(2)}` : '—'}
              accent
            />
            <StatMini
              label="Seu lucro médio"
              value={cpaGerente != null && avgCpaRepasse != null ? `R$ ${(cpaGerente - avgCpaRepasse).toFixed(2)}` : '—'}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <StatMini label="Seu RevShare" value={revGerente != null ? `${revGerente}%` : '—'} />
            <StatMini
              label="Repasse médio atual"
              value={avgRevRepasse != null ? `${avgRevRepasse.toFixed(1)}%` : '—'}
              accent
            />
            <StatMini
              label="Seu lucro médio"
              value={revGerente != null && avgRevRepasse != null ? `${(revGerente - avgRevRepasse).toFixed(1)}%` : '—'}
            />
          </div>
        </div>

        {/* ── Lista de influencers ──────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className={labelCls}>Sub-Afiliados</span>
            {afetaveis.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-semibold transition-colors"
                style={{ color: 'var(--color-primary)' }}
              >
                {allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            )}
          </div>

          {afetaveis.length === 0 ? (
            <div className="rounded-xl p-4 text-sm text-center text-[var(--color-on-surface-variant)] opacity-60"
              style={{ border: '1px solid var(--color-outline-variant)' }}>
              Nenhum gerente tem contrato neste acordo ainda.
            </div>
          ) : (
            <div
              className="rounded-xl overflow-hidden divide-y"
              style={{ border: '1px solid var(--color-outline-variant)' }}
            >
              {afetaveis.map(inf => {
                const sub = inf.subContratos[acordo.id]
                const isSelected = selected.has(sub.id)
                return (
                  <button
                    key={inf.id}
                    type="button"
                    onClick={() => toggleOne(sub.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors"
                    style={{
                      background: isSelected ? 'var(--color-primary-container, rgba(2,117,243,0.06))' : 'transparent',
                      borderBottom: '1px solid var(--color-outline-variant)',
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-outline-variant)',
                        background: isSelected ? 'var(--color-primary)' : 'transparent',
                      }}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-[12px] text-white">check</span>
                      )}
                    </div>

                    {/* Nome */}
                    <span className="text-sm font-medium text-[var(--color-on-surface)] flex-1 truncate">
                      {inf.nome_completo}
                    </span>

                    {/* Pills com valores atuais */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {sub.historico?.cpa_bruto != null && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                          style={{ background: 'rgba(34,211,165,0.12)', color: '#22D3A5' }}
                        >
                          CPA R$ {sub.historico.cpa_bruto.toFixed(0)}
                        </span>
                      )}
                      {sub.historico?.revshare_percentual != null && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                          style={{ background: 'var(--color-primary-container, rgba(2,117,243,0.12))', color: 'var(--color-primary)' }}
                        >
                          Rev {sub.historico.revshare_percentual}%
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {afetaveis.length > 0 && (
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              {selected.size} de {afetaveis.length} selecionado{selected.size !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* ── Novos valores ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Novo CPA</label>
            <input
              type="number"
              min="0"
              max={cpaGerente ?? undefined}
              step="0.01"
              className={inputCls}
              placeholder={cpaGerente != null ? `Máx R$ ${cpaGerente.toFixed(2)}` : '0.00'}
              value={novoCpa}
              onChange={e => setNovoCpa(e.target.value)}
            />
            <span className="text-[10px] text-[var(--color-on-surface-variant)]">
              Deixe em branco para manter o valor atual
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Novo RevShare (%)</label>
            <input
              type="number"
              min="0"
              max={revGerente ?? undefined}
              step="0.01"
              className={inputCls}
              placeholder={revGerente != null ? `Máx ${revGerente}%` : '0.00'}
              value={novoRevshare}
              onChange={e => setNovoRevshare(e.target.value)}
            />
            <span className="text-[10px] text-[var(--color-on-surface-variant)]">
              Deixe em branco para manter o valor atual
            </span>
          </div>
        </div>

        {/* ── Data de Vigência ──────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>
            Data de Vigência <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            className={inputCls}
            style={{ colorScheme: 'dark' }}
            min={tomorrow}
            value={dataVigencia}
            onChange={e => setDataVigencia(e.target.value)}
            required
          />
          <span className="text-[10px] text-[var(--color-on-surface-variant)]">
            A partir desta data o novo valor passa a valer
          </span>
        </div>

      </form>
    </Drawer>
  )
}

function StatMini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-[var(--color-on-surface-variant)]">{label}</span>
      <span
        className="text-sm font-bold"
        style={{ color: accent ? 'var(--color-primary)' : 'var(--color-on-surface)' }}
      >
        {value}
      </span>
    </div>
  )
}
