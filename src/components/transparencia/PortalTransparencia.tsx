'use client'

import React, { useState } from 'react'

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

type Resumo = {
  comissao_bruta: number
  lucro_rede: number
  repasse_pago: number
  recebido: number
  a_receber: number
}

type CasaProps = {
  casa: { id: string; nome_exibicao: string; icone_url: string | null }
  resumo: Resumo
  vigencias: any[]
}

type Props = {
  profile: 'afiliado' | 'gerente' | 'intermediario'
  data: CasaProps[]
}

export function PortalTransparencia({ profile, data }: Props) {
  const totalComissao = data.reduce((acc, c) => acc + c.resumo.comissao_bruta, 0)
  const totalRecebido = data.reduce((acc, c) => acc + c.resumo.recebido, 0)
  const totalAReceber = data.reduce((acc, c) => acc + c.resumo.a_receber, 0)
  const totalEstornado = 0
  const pctRecebido = totalComissao > 0 ? (totalRecebido / totalComissao) * 100 : 0

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
               style={{ background: 'rgba(185,112,255,0.12)', boxShadow: '0 0 24px rgba(185,112,255,0.15)', border: '1px solid rgba(185,112,255,0.25)' }}>
            <span className="material-symbols-outlined text-[28px]" style={{ color: '#B970FF' }}>shield</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-on-surface)]">
              Portal de Transparência
            </h1>
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5">
              Histórico completo de comissões e repasses
            </p>
          </div>
        </div>

      </div>

      {/* ── Resumo Global ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon="payments"
          label="Total Comissão"
          value={totalComissao}
          accent="#B970FF"
          accentBg="#1A1124"
          glowColor="rgba(185,112,255,0.15)"
        />
        <StatCard
          icon="warning_amber"
          label="Total Estornado"
          value={totalEstornado}
          accent="#FF5252"
          accentBg="#241113"
          glowColor="rgba(255,82,82,0.12)"
        />
        <StatCard
          icon="account_balance_wallet"
          label="Total Recebido"
          value={totalRecebido}
          accent="#4CAF50"
          accentBg="#112415"
          glowColor="rgba(76,175,80,0.12)"
          sub={totalComissao > 0 ? `${pctRecebido.toFixed(0)}% do total` : undefined}
        />
        <StatCard
          icon="hourglass_top"
          label="A Receber"
          value={totalAReceber}
          accent="#FFC107"
          accentBg="#241E11"
          glowColor="rgba(255,193,7,0.12)"
        />
      </div>

      {/* Barra de progresso global */}
      {totalComissao > 0 && (
        <div className="rounded-xl p-4 border border-[var(--color-outline-variant)]" style={{ background: 'var(--color-surface-container-lowest)' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">Progresso de Liberação</span>
            <span className="text-xs font-bold" style={{ color: '#4CAF50' }}>{pctRecebido.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-container-high)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(pctRecebido, 100)}%`,
                background: 'linear-gradient(90deg, #4CAF50, #81C784)',
                boxShadow: '0 0 8px rgba(76,175,80,0.5)'
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-[var(--color-on-surface-variant)]">{brl(totalRecebido)} liberado</span>
            <span className="text-[11px] text-[var(--color-on-surface-variant)]">{brl(totalAReceber)} pendente</span>
          </div>
        </div>
      )}

      {/* ── Visão da Rede (gerente/intermediario) ─────────────────────── */}
      {profile !== 'afiliado' && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(185,112,255,0.3)', background: 'var(--color-surface-container-low)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(185,112,255,0.2)' }}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]" style={{ color: '#B970FF' }}>account_tree</span>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#B970FF' }}>Visão da Rede</span>
            </div>
          </div>
          <div className="p-5 grid grid-cols-2 gap-6">
            <div>
              <div className="text-[11px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1">Repasse Devido à Rede</div>
              <div className="text-xl font-bold text-[var(--color-on-surface)]">
                {brl(data.reduce((acc, c) => acc + c.resumo.repasse_pago, 0))}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1">Seu Lucro Líquido</div>
              <div className="text-xl font-bold" style={{ color: '#4CAF50' }}>
                {brl(data.reduce((acc, c) => acc + c.resumo.lucro_rede, 0))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Detalhamento por Casa ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-[16px] text-[var(--color-on-surface-variant)]">corporate_fare</span>
          <h2 className="text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest">
            Casas de Aposta
          </h2>
          <div className="ml-auto px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)' }}>
            {data.length}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {data.length === 0 ? (
            <div className="rounded-2xl py-16 flex flex-col items-center justify-center gap-3 border border-dashed border-[var(--color-outline-variant)]">
              <span className="material-symbols-outlined text-[40px] opacity-20">receipt_long</span>
              <p className="text-sm text-[var(--color-on-surface-variant)]">Nenhum dado de produção encontrado.</p>
            </div>
          ) : (
            data.map(item => (
              <CasaDetailCard key={item.casa.id} data={item} profile={profile} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ── StatCard ──────────────────────────────────────────────────────────── */
function StatCard({
  icon, label, value, accent, accentBg, glowColor, sub
}: {
  icon: string; label: string; value: number
  accent: string; accentBg: string; glowColor: string; sub?: string
}) {
  return (
    <div
      className="rounded-2xl p-4 border border-[var(--color-outline-variant)] flex flex-col gap-2"
      style={{ background: 'var(--color-surface-container)', boxShadow: `0 4px 20px ${glowColor}` }}
    >
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px]" style={{ color: accent }}>{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: accent, opacity: 0.8 }}>{label}</span>
      </div>
      <div className="text-xl sm:text-2xl font-bold leading-none" style={{ color: accent }}>
        {brl(value)}
      </div>
      {sub && <div className="text-[11px]" style={{ color: accent, opacity: 0.6 }}>{sub}</div>}
    </div>
  )
}

/* ── CasaDetailCard ────────────────────────────────────────────────────── */
function CasaDetailCard({ data, profile }: { data: CasaProps; profile: string }) {
  const [expanded, setExpanded] = useState(false)
  const pct = data.resumo.comissao_bruta > 0
    ? Math.min((data.resumo.recebido / data.resumo.comissao_bruta) * 100, 100)
    : 0

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-200"
      style={{ borderColor: expanded ? 'rgba(185,112,255,0.4)' : 'var(--color-outline-variant)', background: 'var(--color-surface-container-lowest)' }}
    >
      {/* Header do card */}
      <div
        className="p-4 sm:p-5 flex items-center gap-4 cursor-pointer select-none transition-colors duration-150"
        style={{ background: expanded ? 'rgba(185,112,255,0.04)' : 'transparent' }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden shrink-0 text-sm font-bold"
          style={{ background: 'var(--color-surface-container-high)', border: '1px solid var(--color-outline-variant)' }}
        >
          {data.casa.icone_url ? (
            <img src={data.casa.icone_url} alt={data.casa.nome_exibicao} className="w-full h-full object-cover" />
          ) : (
            <span style={{ color: '#B970FF' }}>{data.casa.nome_exibicao.charAt(0)}</span>
          )}
        </div>

        {/* Nome + mini-progress */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--color-on-surface)] text-sm">{data.casa.nome_exibicao}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-container-high)', maxWidth: 80 }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #4CAF50, #81C784)' }}
              />
            </div>
            <span className="text-[10px] text-[var(--color-on-surface-variant)]">{pct.toFixed(0)}% liberado</span>
          </div>
        </div>

        {/* Valor + toggle */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-base font-bold" style={{ color: '#B970FF' }}>
              {brl(data.resumo.comissao_bruta)}
            </div>
            <div className="text-[10px] text-[var(--color-on-surface-variant)] uppercase mt-0.5">Comissão total</div>
          </div>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ background: expanded ? 'rgba(185,112,255,0.15)' : 'var(--color-surface-container)' }}
          >
            <span
              className="material-symbols-outlined text-[18px] transition-transform duration-200"
              style={{ color: expanded ? '#B970FF' : 'var(--color-on-surface-variant)', transform: expanded ? 'rotate(180deg)' : 'none' }}
            >
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className="border-t animate-fade-in" style={{ borderColor: 'var(--color-outline-variant)' }}>
          {/* Métricas rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0" style={{ borderColor: 'var(--color-outline-variant)' }}>
            <MiniStat label="Comissão" value={brl(data.resumo.comissao_bruta)} accent="#B970FF" />
            <MiniStat label="Estornado" value={brl(0)} accent="#FF5252" />
            <MiniStat label="Recebido" value={brl(data.resumo.recebido)} accent="#4CAF50" />
            <MiniStat label="A Receber" value={brl(data.resumo.a_receber)} accent="#FFC107" />
          </div>

          {/* Vigências */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[14px] text-[var(--color-on-surface-variant)]">timeline</span>
              <h4 className="text-[11px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest">
                Contratos & Produção
              </h4>
            </div>

            {data.vigencias.length === 0 ? (
              <p className="text-sm text-[var(--color-on-surface-variant)] py-4 text-center">
                Nenhuma produção registrada.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.vigencias.map((vig, idx) => (
                  <VigenciaCard key={idx} vig={vig} profile={profile} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── MiniStat ──────────────────────────────────────────────────────────── */
function MiniStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="px-4 py-3 flex flex-col gap-0.5" style={{ borderColor: 'var(--color-outline-variant)' }}>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">{label}</div>
      <div className="text-sm font-bold" style={{ color: accent }}>{value}</div>
    </div>
  )
}

/* ── VigenciaCard ──────────────────────────────────────────────────────── */
function VigenciaCard({ vig, profile }: { vig: any; profile: string }) {
  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{ borderColor: 'var(--color-outline-variant)', background: 'var(--color-surface-container-low)' }}
    >
      {/* Topo da vigência */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-outline-variant)' }}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-[var(--color-on-surface-variant)]">date_range</span>
          <span
            className="text-xs font-medium px-2.5 py-0.5 rounded-full"
            style={{ background: 'rgba(185,112,255,0.1)', color: '#B970FF', border: '1px solid rgba(185,112,255,0.15)' }}
          >
            {new Date(vig.data_inicio).toLocaleDateString('pt-BR')} → {new Date(vig.data_fim).toLocaleDateString('pt-BR')}
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-[var(--color-on-surface)]">{brl(vig.total_comissao)}</div>
          <div className="text-[10px] text-[var(--color-on-surface-variant)]">no período</div>
        </div>
      </div>

      {/* Métricas da vigência */}
      <div className={`grid gap-0 divide-x ${profile !== 'afiliado' ? 'grid-cols-4' : 'grid-cols-2'}`}
           style={{ borderColor: 'var(--color-outline-variant)' }}>
        <VigMetric label="Dias ativos" value={String(vig.dias_count)} />
        <VigMetric label="CPAs" value={String(vig.total_cpas)} />
        {profile !== 'afiliado' && (
          <>
            <VigMetric label="Lucro Rede" value={brl(vig.lucro_rede)} accent="#4CAF50" />
            <VigMetric label="Repasse" value={brl(vig.repasse_rede)} />
          </>
        )}
      </div>
    </div>
  )
}

function VigMetric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="px-3 py-2.5 flex flex-col gap-0.5" style={{ borderColor: 'var(--color-outline-variant)' }}>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">{label}</div>
      <div className="text-sm font-semibold" style={{ color: accent ?? 'var(--color-on-surface)' }}>{value}</div>
    </div>
  )
}
