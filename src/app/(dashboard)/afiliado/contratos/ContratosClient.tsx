'use client'

import React, { useState, useCallback } from 'react'

function fmt(v: number | string | null | undefined) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtPct(v: number | string | null | undefined) {
  if (v === null || v === undefined) return '—'
  return `${Number(v).toFixed(1)}%`
}

const TIPO_COLOR: Record<string, string> = {
  CPA:      '#f59e0b',
  REVSHARE: '#06b6d4',
  MISTO:    '#8b5cf6',
}

export type ContratoDetalhe = {
  id: string
  id_casa: string | null
  afp: string | null
  link_afiliacao: string | null
  tipo_contrato: string | null
  created_at: string
  casas_aposta: { id: string, nome_exibicao: string, icone_url: string | null, affiliate_url: string | null }
  historico_contratos: {
    id: string
    data_inicio: string
    data_fim: string | null
    cpa_bruto: number | string | null
    aliquota_imposto: number | string | null
    revshare_percentual: number | string | null
    revshare_repasse: number | string | null
    ativo: boolean
  }[]
}

/* ── Copy hook with fallback ─────────────────────────────────────── */
function useCopy(text: string | null) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])
  return { copied, copy }
}

export function ContratosClient({ contratos }: { contratos: ContratoDetalhe[] }) {
  const casasUnicasMap = new Map<string, { id: string, nome_exibicao: string, icone_url: string | null }>()
  const contratosPorCasa = new Map<string, ContratoDetalhe[]>()

  for (const c of contratos) {
    if (!c.casas_aposta?.id) continue
    const casaId = c.casas_aposta.id
    if (!casasUnicasMap.has(casaId)) {
      casasUnicasMap.set(casaId, c.casas_aposta)
      contratosPorCasa.set(casaId, [])
    }
    contratosPorCasa.get(casaId)!.push(c)
  }

  const casas = Array.from(casasUnicasMap.values())
  const [activeTab, setActiveTab] = useState(casas.length > 0 ? casas[0].id : null)

  const activeCasa = activeTab ? casasUnicasMap.get(activeTab) : null
  const activeContratos = activeTab ? (contratosPorCasa.get(activeTab) ?? []) : []

  if (casas.length === 0) {
    return (
      <div className="glass-card rounded-xl py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
        <span className="material-symbols-outlined text-[48px] opacity-30">description</span>
        <p className="text-sm font-medium opacity-60">Nenhum contrato ativo</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Casa Tabs ─────────────────────────────────────────────────── */}
      <div className="glass-card rounded-xl p-1.5 flex gap-1 overflow-x-auto">
        {casas.map(casa => {
          const active = casa.id === activeTab
          return (
            <button
              key={casa.id}
              onClick={() => setActiveTab(casa.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: active ? 'rgba(173, 198, 255, 0.12)' : 'transparent',
                color: active ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                border: active ? '1px solid rgba(173, 198, 255, 0.2)' : '1px solid transparent',
              }}
            >
              {casa.icone_url ? (
                <img src={casa.icone_url} alt="" className="w-4 h-4 rounded object-contain flex-shrink-0" />
              ) : (
                <span className="material-symbols-outlined text-[16px] flex-shrink-0">casino</span>
              )}
              {casa.nome_exibicao}
            </button>
          )
        })}
      </div>

      {activeCasa && activeContratos.length > 0 && (
        <div className="animate-fade-in flex flex-col gap-6">
          {activeContratos.map((contrato, index) => {
            const histAtivo = contrato.historico_contratos.find(h => h.ativo) ?? contrato.historico_contratos[0]
            const tipoColor = TIPO_COLOR[contrato.tipo_contrato ?? ''] ?? 'var(--color-primary)'
            return (
              <ContratoCard
                key={contrato.id}
                contrato={contrato}
                casaNome={activeCasa.nome_exibicao}
                index={index}
                total={activeContratos.length}
                histAtivo={histAtivo}
                tipoColor={tipoColor}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Card individual do contrato ──────────────────────────────────── */
function ContratoCard({
  contrato, casaNome, index, total, histAtivo, tipoColor,
}: {
  contrato: ContratoDetalhe
  casaNome: string
  index: number
  total: number
  histAtivo: ContratoDetalhe['historico_contratos'][0] | undefined
  tipoColor: string
}) {
  const divulgacaoUrl = contrato.link_afiliacao
    ?? (contrato.casas_aposta.affiliate_url && contrato.afp
        ? contrato.casas_aposta.affiliate_url.replace(/\[afp\]/i, contrato.afp)
        : null)

  const { copied, copy } = useCopy(divulgacaoUrl)

  return (
    <div className="glass-card rounded-xl overflow-hidden flex flex-col gap-0 shadow-sm border border-[var(--color-outline-variant)]">

      {/* ── Cabeçalho ─────────────────────────────────────────────── */}
      <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-[var(--color-outline-variant)]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)] flex-shrink-0">assignment</span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[var(--color-on-surface)]">
              Acordo — {casaNome}{total > 1 ? ` (Contrato ${index + 1})` : ''}
            </h3>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
              AFP: <span className="font-mono font-semibold">{contrato.afp ?? '—'}</span>
            </p>
          </div>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0"
          style={{ color: tipoColor, background: `${tipoColor}18`, border: `1px solid ${tipoColor}33` }}
        >
          {contrato.tipo_contrato ?? '—'}
        </span>
      </div>

      {/* ── Link de divulgação ─────────────────────────────────────── */}
      {divulgacaoUrl ? (
        <div
          className="px-5 py-3 flex items-center gap-3 border-b border-[var(--color-outline-variant)]"
          style={{ background: 'rgba(2,117,243,0.04)' }}
        >
          <span
            className="material-symbols-outlined text-[16px] flex-shrink-0"
            style={{ color: 'var(--color-primary)' }}
          >
            link
          </span>
          <span
            className="flex-1 text-xs font-mono truncate min-w-0"
            style={{ color: 'var(--color-on-surface-variant)' }}
            title={divulgacaoUrl}
          >
            {divulgacaoUrl}
          </span>
          <button
            onClick={copy}
            aria-label={copied ? 'Link copiado' : 'Copiar link de divulgação'}
            className="flex items-center gap-1.5 px-3 rounded-lg font-semibold transition-all cursor-pointer flex-shrink-0"
            style={{
              height: 44,
              fontSize: '0.75rem',
              background: copied ? 'rgba(34,211,165,0.12)' : 'var(--color-primary-container)',
              color: copied ? '#22D3A5' : 'var(--color-on-primary)',
              border: copied ? '1px solid rgba(34,211,165,0.25)' : '1px solid transparent',
              transition: 'all 200ms ease-out',
            }}
          >
            <span className="material-symbols-outlined text-[15px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      ) : null}

      {/* ── Stats vigentes ─────────────────────────────────────────── */}
      {histAtivo ? (
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[var(--color-surface-container)]">
          <Stat label="CPA Bruto"   value={fmt(histAtivo.cpa_bruto)}              color="#f59e0b" icon="payments"      />
          <Stat label="RevShare"    value={fmtPct(histAtivo.revshare_percentual)} color="#06b6d4" icon="percent"       />
          <Stat label="Repasse Rev" value={fmtPct(histAtivo.revshare_repasse)}    color="#06b6d4" icon="swap_horiz"    />
          <div
            className="flex flex-col gap-1.5 p-4 rounded-xl border"
            style={{ background: 'var(--color-surface-container-low)', borderColor: 'var(--color-outline-variant)' }}
          >
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--color-on-surface)' }}>calendar_today</span>
              <span className="text-[10px] font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Vigência</span>
            </div>
            <span className="text-sm font-bold text-[var(--color-on-surface)]">
              Desde {new Date(histAtivo.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-5 text-sm text-[var(--color-on-surface-variant)] opacity-60 bg-[var(--color-surface-container)]">
          Sem regras configuradas para este contrato.
        </div>
      )}

      {/* ── Histórico ──────────────────────────────────────────────── */}
      {contrato.historico_contratos.length > 0 && (
        <details className="group [&_summary::-webkit-details-marker]:hidden border-t border-[var(--color-outline-variant)]">
          <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--color-surface-container-low)] transition-colors select-none">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)]">history</span>
              <span className="text-sm font-bold text-[var(--color-on-surface)]">Histórico de versões</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]">
                {contrato.historico_contratos.length} versão{contrato.historico_contratos.length > 1 ? 'ões' : ''}
              </span>
            </div>
            <span className="material-symbols-outlined text-[20px] text-[var(--color-on-surface-variant)] transition-transform group-open:rotate-180">
              expand_more
            </span>
          </summary>
          <div className="divide-y border-t" style={{ borderColor: 'var(--color-outline-variant)' }}>
            {contrato.historico_contratos.map((h) => (
              <div
                key={h.id}
                className="px-5 py-3 flex flex-wrap gap-x-6 gap-y-2 items-center text-sm"
                style={{ background: h.ativo ? 'rgba(34,211,165,0.04)' : 'var(--color-surface-container)' }}
              >
                <span className="text-xs text-[var(--color-on-surface-variant)] w-36 flex-shrink-0">
                  {new Date(h.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  {' → '}
                  {h.data_fim
                    ? new Date(h.data_fim).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
                    : <span style={{ color: '#22D3A5' }}>atual</span>}
                </span>
                <span className="tabular-nums" style={{ color: '#f59e0b' }}>CPA: <b>{fmt(h.cpa_bruto)}</b></span>
                <span className="tabular-nums" style={{ color: '#06b6d4' }}>Rev: <b>{fmtPct(h.revshare_percentual)}</b></span>
                <span className="tabular-nums" style={{ color: '#06b6d4' }}>Rep: <b>{fmtPct(h.revshare_repasse)}</b></span>
                <span className="tabular-nums" style={{ color: '#F43F5E' }}>IR: <b>{fmtPct(h.aliquota_imposto)}</b></span>
                {h.ativo && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ color: '#22D3A5', background: 'rgba(34,211,165,0.12)' }}>
                    atual
                  </span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function Stat({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div
      className="flex flex-col gap-1.5 p-4 rounded-xl border"
      style={{ background: 'var(--color-surface-container-low)', borderColor: 'var(--color-outline-variant)' }}
    >
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[14px]" style={{ color }}>{icon}</span>
        <span className="text-[10px] font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-xl font-bold" style={{ color }}>{value}</span>
    </div>
  )
}
