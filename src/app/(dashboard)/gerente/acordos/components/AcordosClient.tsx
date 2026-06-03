'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Acordo, Influencer, SubContrato } from '../page'
import CriarContratoInfluencerDrawer from './CriarContratoInfluencerDrawer'
import AlterarDistribuicaoDrawer from './AlterarDistribuicaoDrawer'
import MassReajusteDrawer from './MassReajusteDrawer'
import HistoricoContratoDrawer from './HistoricoContratoDrawer'

interface Props {
  acordos: Acordo[]
  influencers: Influencer[]
}

type DrawerState =
  | null
  | { type: 'criar'; influencer: Influencer; acordo: Acordo }
  | { type: 'alterar'; influencer: Influencer; acordo: Acordo; subContrato: SubContrato }
  | { type: 'massa'; acordo: Acordo }
  | { type: 'historico'; nome: string; subtitulo: string; historicoList: import('../page').HistoricoTermos[] }

export default function AcordosClient({ acordos, influencers }: Props) {
  const router = useRouter()
  const casas = acordos.map(a => a.casa).filter(
    (c, i, arr) => arr.findIndex(x => x.id === c.id) === i
  )
  const [activeTab, setActiveTab] = useState(casas.length > 0 ? casas[0].id : null)
  const [activeAcordoId, setActiveAcordoId] = useState<string | null>(
    acordos.length > 0 ? acordos[0].id : null
  )
  const [drawerState, setDrawerState] = useState<DrawerState>(null)

  const activeCasa = casas.find(c => c.id === activeTab)
  const acordosDaCasa = acordos.filter(a => a.casa.id === activeTab)
  const activeAcordo = acordosDaCasa.find(a => a.id === activeAcordoId) ?? acordosDaCasa[0] ?? null

  const handleSuccess = useCallback(() => {
    setDrawerState(null)
    router.refresh()
  }, [router])

  if (casas.length === 0) {
    return (
      <div className="glass-card rounded-xl py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
        <span className="material-symbols-outlined text-[48px] opacity-30">handshake</span>
        <p className="text-sm font-medium opacity-60">Nenhuma casa ativa</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-6">

        {/* ── Casa Tabs ─────────────────────────────────────────────────── */}
        <div className="glass-card rounded-xl p-1.5 flex gap-1 overflow-x-auto">
          {casas.map(casa => {
            const active = casa.id === activeTab
            return (
              <button
                key={casa.id}
                onClick={() => {
                  setActiveTab(casa.id)
                  const primeiro = acordos.find(a => a.casa.id === casa.id)
                  setActiveAcordoId(primeiro?.id ?? null)
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  background: active ? 'rgba(173, 198, 255, 0.12)' : 'transparent',
                  color: active ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  border: active ? '1px solid rgba(173, 198, 255, 0.2)' : '1px solid transparent',
                }}
              >
                {casa.icone_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={casa.icone_url} alt="" className="w-4 h-4 rounded object-contain flex-shrink-0" />
                ) : (
                  <span className="material-symbols-outlined text-[16px] flex-shrink-0">casino</span>
                )}
                {casa.nome_exibicao}
              </button>
            )
          })}
        </div>

        {activeCasa && (
          <div className="animate-fade-in flex flex-col gap-5">

            {/* ── Seu Acordo ───────────────────────────────────────────────── */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-3 border-b border-[var(--color-outline-variant)]">
                <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">assignment</span>
                <h3 className="text-sm font-bold text-[var(--color-on-surface)] flex-1">
                  Seu Acordo — {activeCasa.nome_exibicao}
                </h3>
                {activeAcordo && (
                  <button
                    onClick={() => setDrawerState({
                      type: 'historico',
                      nome: activeCasa.nome_exibicao,
                      subtitulo: 'Histórico do seu acordo',
                      historicoList: activeAcordo.historicoList,
                    })}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--color-surface-container-highest)]"
                    title="Ver histórico do acordo"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)]">history</span>
                  </button>
                )}
              </div>

              {acordosDaCasa.length > 1 ? (
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {acordosDaCasa.map(ac => {
                    const sel = ac.id === activeAcordo?.id
                    return (
                      <button
                        key={ac.id}
                        onClick={() => setActiveAcordoId(ac.id)}
                        className="text-left rounded-xl p-4 transition-all flex flex-col gap-3"
                        style={{
                          background: sel ? 'var(--color-primary-container, rgba(2,117,243,0.08))' : 'var(--color-surface-container-low)',
                          border: sel ? '1px solid var(--color-outline)' : '1px solid var(--color-outline-variant)',
                          outline: 'none',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <TipoBadge tipo={ac.tipo_contrato} />
                          <span className="text-xs text-[var(--color-on-surface-variant)]">
                            {ac.historico?.data_inicio
                              ? `desde ${new Date(ac.historico.data_inicio).toLocaleDateString('pt-BR')}`
                              : '—'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">CPA</span>
                            <p className="text-base font-bold mt-0.5" style={{ color: sel ? 'var(--color-primary)' : 'var(--color-on-surface)' }}>
                              {ac.historico?.cpa_bruto != null ? `R$ ${ac.historico.cpa_bruto.toFixed(2)}` : '—'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">RevShare</span>
                            <p className="text-base font-bold mt-0.5" style={{ color: sel ? 'var(--color-primary)' : 'var(--color-on-surface)' }}>
                              {ac.historico?.revshare_percentual != null ? `${ac.historico.revshare_percentual}%` : '—'}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="p-5 grid grid-cols-3 gap-4">
                  <Stat label="CPA" value={activeAcordo?.historico?.cpa_bruto != null ? `R$ ${activeAcordo.historico.cpa_bruto.toFixed(2)}` : '—'} color="var(--color-primary)" />
                  <Stat label="RevShare" value={activeAcordo?.historico?.revshare_percentual != null ? `${activeAcordo.historico.revshare_percentual}%` : '—'} color="var(--color-primary)" />
                  <Stat label="Vigente desde" value={activeAcordo?.historico?.data_inicio ? new Date(activeAcordo.historico.data_inicio).toLocaleDateString('pt-BR') : '—'} color="var(--color-on-surface)" />
                </div>
              )}
            </div>

            {/* ── Regras da Casa ───────────────────────────────────────────── */}
            <details className="glass-card rounded-xl overflow-hidden group [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--color-surface-container-low)] transition-colors select-none">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">menu_book</span>
                  <span className="text-sm font-bold text-[var(--color-on-surface)]">Regras da Casa</span>
                </div>
                <span className="material-symbols-outlined text-[20px] text-[var(--color-on-surface-variant)] transition-transform group-open:rotate-180">
                  expand_more
                </span>
              </summary>
              <div className="px-5 pb-5 pt-3 border-t border-[var(--color-outline-variant)] text-sm text-[var(--color-on-surface-variant)]">
                Nenhuma regra cadastrada para esta casa.
              </div>
            </details>

            {/* ── Distribuição da Rede ─────────────────────────────────────── */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-outline-variant)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">group</span>
                    <h3 className="text-sm font-bold text-[var(--color-on-surface)]">
                      Distribuição — {activeCasa.nome_exibicao}
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-1 ml-7">
                    Seu CPA: <strong className="text-[var(--color-on-surface)]">{activeAcordo?.historico?.cpa_bruto != null ? `R$ ${activeAcordo.historico.cpa_bruto.toFixed(2)}` : '—'}</strong>
                    {' · '}
                    RevShare: <strong className="text-[var(--color-on-surface)]">{activeAcordo?.historico?.revshare_percentual != null ? `${activeAcordo.historico.revshare_percentual}%` : '—'}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-[var(--color-on-surface-variant)]">search</span>
                    <input
                      type="text"
                      placeholder="Buscar..."
                      className="bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] transition-colors w-40"
                    />
                  </div>
                  <button
                    onClick={() => activeAcordo && setDrawerState({ type: 'massa', acordo: activeAcordo })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-opacity hover:opacity-80"
                    style={{
                      background: 'rgba(192,132,252,0.12)',
                      border: '1px solid rgba(192,132,252,0.3)',
                      color: '#c084fc',
                    }}
                  >
                    <span className="material-symbols-outlined text-[14px]">tune</span>
                    Reajuste em Massa
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-outline-variant)', background: 'var(--color-surface-container-low)' }}>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Afiliado</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider min-w-[200px]">Repasse (CPA)</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider min-w-[200px]">Repasse (RevShare)</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Ações</th>
                      <th className="w-8 pr-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {influencers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-sm text-[var(--color-on-surface-variant)] opacity-60">
                          Nenhum afiliado na rede
                        </td>
                      </tr>
                    ) : influencers.map(inf => {
                      const sub = activeAcordo ? (inf.subContratos[activeAcordo.id] ?? null) : null
                      const gerenteCpa = activeAcordo?.historico?.cpa_bruto ?? null
                      const gerenteRevshare = activeAcordo?.historico?.revshare_percentual ?? null
                      const subCpa = sub?.historico?.cpa_bruto ?? null
                      const subRevshare = sub?.historico?.revshare_percentual ?? null
                      const cpaPct = gerenteCpa && subCpa ? Math.round((subCpa / gerenteCpa) * 100) : 0
                      const revPct = gerenteRevshare && subRevshare ? Math.round((subRevshare / gerenteRevshare) * 100) : 0
                      return (
                        <tr
                          key={inf.id}
                          className="group hover:bg-[var(--color-surface-container-high)] transition-colors"
                          style={{ borderBottom: '1px solid var(--color-outline-variant)' }}
                        >
                          <td className="px-5 py-3">
                            <div className="font-medium text-[var(--color-on-surface)]">{inf.nome_completo}</div>
                            <div className="text-xs text-[var(--color-on-surface-variant)]">{inf.email}</div>
                          </td>
                          <td className="px-5 py-3">
                            {subCpa != null && gerenteCpa != null ? (
                              <BarCell
                                value={`R$ ${subCpa.toFixed(2)}`}
                                pct={cpaPct}
                                retidoLabel={`Sua margem: R$ ${(gerenteCpa - subCpa).toFixed(2)}`}
                              />
                            ) : <span className="text-[var(--color-on-surface-variant)] text-xs">—</span>}
                          </td>
                          <td className="px-5 py-3">
                            {subRevshare != null && gerenteRevshare != null ? (
                              <BarCell
                                value={`${subRevshare}%`}
                                pct={revPct}
                                retidoLabel={`Sua margem: ${(gerenteRevshare - subRevshare).toFixed(2)}%`}
                              />
                            ) : <span className="text-[var(--color-on-surface-variant)] text-xs">—</span>}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {sub == null ? (
                                <button
                                  onClick={() => activeAcordo && setDrawerState({ type: 'criar', influencer: inf, acordo: activeAcordo })}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                  style={{ background: 'var(--color-primary)', color: 'white' }}
                                  title="Criar Contrato"
                                >
                                  <span className="material-symbols-outlined text-[16px]">add_task</span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => activeAcordo && setDrawerState({ type: 'alterar', influencer: inf, acordo: activeAcordo, subContrato: sub })}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ background: 'var(--color-surface-container-high)', border: '1px solid var(--color-outline-variant)' }}
                                    title="Alterar"
                                  >
                                    <span className="material-symbols-outlined text-[16px] text-[var(--color-on-surface-variant)]">edit</span>
                                  </button>
                                  <button
                                    onClick={() => setDrawerState({
                                      type: 'historico',
                                      nome: inf.nome_completo,
                                      subtitulo: activeAcordo?.casa.nome_exibicao ?? '',
                                      historicoList: sub.historicoList,
                                    })}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ background: 'var(--color-surface-container-high)', border: '1px solid var(--color-outline-variant)' }}
                                    title="Ver histórico"
                                  >
                                    <span className="material-symbols-outlined text-[16px] text-[var(--color-on-surface-variant)]">history</span>
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
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

      {drawerState?.type === 'criar' && (
        <CriarContratoInfluencerDrawer
          influencer={drawerState.influencer}
          acordo={drawerState.acordo}
          onClose={() => setDrawerState(null)}
          onSuccess={handleSuccess}
        />
      )}

      {drawerState?.type === 'alterar' && (
        <AlterarDistribuicaoDrawer
          influencer={drawerState.influencer}
          acordo={drawerState.acordo}
          subContrato={drawerState.subContrato}
          onClose={() => setDrawerState(null)}
          onSuccess={handleSuccess}
        />
      )}

      {drawerState?.type === 'massa' && (
        <MassReajusteDrawer
          acordo={drawerState.acordo}
          influencers={influencers}
          onClose={() => setDrawerState(null)}
          onSuccess={handleSuccess}
        />
      )}

      {drawerState?.type === 'historico' && (
        <HistoricoContratoDrawer
          nome={drawerState.nome}
          subtitulo={drawerState.subtitulo}
          historicoList={drawerState.historicoList}
          onClose={() => setDrawerState(null)}
        />
      )}
    </>
  )
}

const TIPO_STYLE: Record<string, { bg: string; color: string }> = {
  CPA:      { bg: 'rgba(34,211,165,0.12)',  color: '#22D3A5' },
  REVSHARE: { bg: 'var(--color-primary-container, rgba(2,117,243,0.12))', color: 'var(--color-primary)' },
  MISTO:    { bg: 'rgba(192,132,252,0.12)', color: '#c084fc' },
}

function TipoBadge({ tipo }: { tipo: string }) {
  const s = TIPO_STYLE[tipo] ?? { bg: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)' }
  return (
    <span
      className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
      style={{ background: s.bg, color: s.color }}
    >
      {tipo}
    </span>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="flex flex-col gap-1 p-4 rounded-xl"
      style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)' }}
    >
      <span className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">{label}</span>
      <span className="text-xl font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

function BarCell({ value, pct, retidoLabel }: { value: string; pct: number; retidoLabel: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-[var(--color-on-surface)]">{value}</span>
      <div className="w-full rounded-full h-1.5 overflow-hidden flex" style={{ background: 'var(--color-surface-container-highest)' }}>
        <div className="h-full" style={{ width: `${pct}%`, background: 'rgba(148,163,184,0.5)' }} />
        <div className="h-full" style={{ width: `${100 - pct}%`, background: '#22D3A5' }} />
      </div>
      <span className="text-xs flex gap-2 flex-wrap" style={{ color: 'var(--color-on-surface-variant)' }}>
        <span style={{ color: 'rgba(148,163,184,0.9)' }}>{pct}% repassado</span>
        <span>·</span>
        <span style={{ color: '#22D3A5' }}>{retidoLabel}</span>
      </span>
    </div>
  )
}
