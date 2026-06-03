'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NovoContratoAfiliadoDrawer from './NovoContratoAfiliadoDrawer'
import NovaFaixaModal from './NovaFaixaModal'

interface Historico {
  id: string
  data_inicio: string
  data_fim: string | null
  cpa_bruto: number | null
  aliquota_imposto: number | null
  revshare_percentual: number | null
  revshare_repasse: number | null
  ativo: boolean
}

interface Contrato {
  id: string
  afp: string
  tipo_contrato: string
  ativo: boolean
  link_afiliacao: string | null
  casas_aposta: { id: string; nome_exibicao: string; icone_url: string | null }
  historico_contratos: Historico[]
}

interface UserRole {
  id: string
  role: string
  ref_code: string | null
}

interface Casa { id: string; nome_exibicao: string }

interface Props {
  contratos: Contrato[]
  userRoles: UserRole[]
  casas: Casa[]
  afiliadoId: string
}

const roleBadge: Record<string, string> = {
  AFILIADO: 'badge-gray',
  GERENTE: 'badge-blue',
  INTERMEDIARIO: 'badge-orange',
  ADMIN: 'badge-red',
}
const roleLabel: Record<string, string> = {
  AFILIADO: 'Afiliado',
  GERENTE: 'Gerente',
  INTERMEDIARIO: 'Intermediário',
  ADMIN: 'Admin',
}

const TIPO_COLOR: Record<string, string> = {
  CPA:      '#f59e0b',
  REVSHARE: '#06b6d4',
  MISTO:    '#8b5cf6',
}

function fmt(v: number | null | undefined) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtPct(v: number | null | undefined) {
  if (v == null) return '—'
  return `${Number(v).toFixed(1)}%`
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
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

export default function ContratosSection({ contratos: initialContratos, userRoles, casas, afiliadoId }: Props) {
  const router = useRouter()
  const [contratos, setContratos] = useState(initialContratos)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [novaFaixaId, setNovaFaixaId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  void afiliadoId

  // Group by casa
  const casasMap = new Map<string, { id: string; nome_exibicao: string; icone_url: string | null }>()
  const contratosPorCasa = new Map<string, Contrato[]>()
  for (const c of contratos) {
    const casaId = c.casas_aposta.id
    if (!casasMap.has(casaId)) {
      casasMap.set(casaId, c.casas_aposta)
      contratosPorCasa.set(casaId, [])
    }
    contratosPorCasa.get(casaId)!.push(c)
  }
  const casasList = Array.from(casasMap.values())

  const [activeTab, setActiveTab] = useState<string | null>(casasList[0]?.id ?? null)
  const activeCasa = activeTab ? casasMap.get(activeTab) : null
  const activeContratos = activeTab ? (contratosPorCasa.get(activeTab) ?? []) : []

  async function toggleAtivo(contrato: Contrato) {
    setTogglingId(contrato.id)
    try {
      const res = await fetch('/api/admin/contratos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: contrato.id, ativo: !contrato.ativo }),
      })
      if (res.ok) {
        setContratos(prev => prev.map(c => c.id === contrato.id ? { ...c, ativo: !c.ativo } : c))
      }
    } finally {
      setTogglingId(null)
    }
  }

  function handleCreated() {
    setDrawerOpen(false)
    router.refresh()
  }

  function handleFaixaSaved() {
    setNovaFaixaId(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-headline-md text-[var(--color-on-surface)]">Contratos</h2>
            <span
              className="text-label-md px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)' }}
            >
              {contratos.length}
            </span>
            <div className="flex items-center gap-2">
              {userRoles.map(ur => (
                <div key={ur.id} className="flex items-center gap-1.5">
                  <span className={`badge ${roleBadge[ur.role] ?? 'badge-gray'}`}>
                    {roleLabel[ur.role] ?? ur.role}
                  </span>
                  {ur.ref_code && (
                    <span className="font-mono text-xs text-[var(--color-on-surface-variant)] opacity-60">
                      {ur.ref_code}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Novo Contrato
          </button>
        </div>

        {contratos.length === 0 ? (
          <div
            className="glass-card rounded-xl py-20 flex flex-col items-center gap-3"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            <span className="material-symbols-outlined text-[48px] opacity-25">description</span>
            <p className="text-sm font-medium opacity-50">Nenhum contrato registrado</p>
            <button
              onClick={() => setDrawerOpen(true)}
              className="mt-1 text-xs font-medium px-4 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-primary)', border: '1px solid var(--color-primary)', background: 'transparent' }}
            >
              Criar primeiro contrato
            </button>
          </div>
        ) : (
          <>
            {/* Casa tabs */}
            <div className="glass-card rounded-xl p-1.5 flex gap-1 overflow-x-auto">
              {casasList.map(casa => {
                const active = casa.id === activeTab
                const count = contratosPorCasa.get(casa.id)?.length ?? 0
                return (
                  <button
                    key={casa.id}
                    onClick={() => setActiveTab(casa.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0"
                    style={{
                      background: active ? 'var(--color-primary)' : 'transparent',
                      color: active ? '#ffffff' : 'var(--color-on-surface-variant)',
                      border: active ? '1px solid transparent' : '1px solid var(--color-outline-variant)',
                    }}
                  >
                    {casa.icone_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={casa.icone_url} alt="" className="w-4 h-4 rounded object-contain flex-shrink-0" />
                    ) : (
                      <span className="material-symbols-outlined text-[16px] flex-shrink-0">casino</span>
                    )}
                    {casa.nome_exibicao}
                    {count > 1 && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: active ? 'rgba(255,255,255,0.25)' : 'var(--color-surface-container-high)', color: active ? '#ffffff' : 'var(--color-on-surface-variant)' }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Active casa contracts */}
            {activeCasa && activeContratos.length > 0 && (
              <div className="animate-fade-in flex flex-col gap-4">
                {activeContratos.map((contrato, index) => {
                  const histAtivo = contrato.historico_contratos.find(h => h.ativo) ?? contrato.historico_contratos[0]
                  const tipoColor = TIPO_COLOR[contrato.tipo_contrato] ?? 'var(--color-primary)'

                  return (
                    <div
                      key={contrato.id}
                      className="glass-card rounded-xl overflow-hidden flex flex-col shadow-sm"
                      style={{ border: '1px solid var(--color-outline-variant)', opacity: contrato.ativo ? 1 : 0.65 }}
                    >
                      {/* Contract header */}
                      <div
                        className="px-5 py-4 flex items-center justify-between gap-3 border-b flex-wrap"
                        style={{ borderColor: 'var(--color-outline-variant)' }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">assignment</span>
                          <div>
                            <h3 className="text-sm font-bold text-[var(--color-on-surface)] flex items-center gap-2">
                              Acordo — {activeCasa.nome_exibicao}
                              {activeContratos.length > 1 && ` (Contrato ${index + 1})`}
                            </h3>
                            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5 flex items-center gap-2">
                              AFP: <span className="font-mono font-semibold">{contrato.afp ?? '—'}</span>
                              {contrato.link_afiliacao && (
                                <a
                                  href={contrato.link_afiliacao}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-0.5 hover:opacity-80 transition-opacity"
                                  style={{ color: 'var(--color-primary)' }}
                                >
                                  <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                  Link
                                </a>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Status encerrado badge */}
                          {!contrato.ativo && (
                            <span className="badge badge-gray">
                              <span className="status-dot status-dot-gray" />
                              Encerrado
                            </span>
                          )}

                          {/* Tipo badge */}
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ color: tipoColor, background: `${tipoColor}18`, border: `1px solid ${tipoColor}33` }}
                          >
                            {contrato.tipo_contrato}
                          </span>

                          {/* Actions */}
                          <button
                            onClick={() => setNovaFaixaId(contrato.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors hover:bg-[var(--color-surface-container-highest)]"
                            style={{ borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface-variant)' }}
                          >
                            <span className="material-symbols-outlined text-[13px]">history</span>
                            Nova Faixa
                          </button>
                          <button
                            onClick={() => toggleAtivo(contrato)}
                            disabled={togglingId === contrato.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors hover:bg-[var(--color-surface-container-highest)] disabled:opacity-50"
                            style={{
                              borderColor: 'var(--color-outline-variant)',
                              color: contrato.ativo ? 'var(--color-error, #f87171)' : 'var(--color-on-surface-variant)',
                            }}
                          >
                            {togglingId === contrato.id
                              ? <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                              : <span className="material-symbols-outlined text-[13px]">{contrato.ativo ? 'block' : 'check_circle'}</span>
                            }
                            {contrato.ativo ? 'Inativar' : 'Ativar'}
                          </button>
                        </div>
                      </div>

                      {/* Current rates */}
                      {histAtivo ? (
                        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[var(--color-surface-container)]">
                          <Stat label="CPA Bruto"   value={fmt(histAtivo.cpa_bruto)}            color="#f59e0b" icon="payments" />
                          <Stat label="RevShare"    value={fmtPct(histAtivo.revshare_percentual)} color="#06b6d4" icon="percent" />
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

                      {/* Histórico de versões */}
                      {contrato.historico_contratos.length > 0 && (
                        <details className="group [&_summary::-webkit-details-marker]:hidden border-t" style={{ borderColor: 'var(--color-outline-variant)' }}>
                          <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--color-surface-container-low)] transition-colors select-none">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)]">history</span>
                              <span className="text-sm font-bold text-[var(--color-on-surface)]">Histórico de versões</span>
                              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]">
                                {contrato.historico_contratos.length} versão{contrato.historico_contratos.length !== 1 ? 'ões' : ''}
                              </span>
                            </div>
                            <span className="material-symbols-outlined text-[20px] text-[var(--color-on-surface-variant)] transition-transform group-open:rotate-180">
                              expand_more
                            </span>
                          </summary>

                          <div className="divide-y border-t" style={{ borderColor: 'var(--color-outline-variant)' }}>
                            {contrato.historico_contratos.map(h => (
                              <div
                                key={h.id}
                                className="px-5 py-3 flex flex-wrap gap-x-6 gap-y-2 items-center text-sm"
                                style={{ background: h.ativo ? 'rgba(34,211,165,0.04)' : 'var(--color-surface-container)' }}
                              >
                                <span className="text-xs text-[var(--color-on-surface-variant)] w-36 flex-shrink-0">
                                  {fmtDate(h.data_inicio)}
                                  {' → '}
                                  {h.data_fim
                                    ? fmtDate(h.data_fim)
                                    : <span style={{ color: '#22D3A5' }}>atual</span>
                                  }
                                </span>
                                <span className="tabular-nums" style={{ color: '#f59e0b' }}>
                                  CPA: <b>{fmt(h.cpa_bruto)}</b>
                                </span>
                                <span className="tabular-nums" style={{ color: '#06b6d4' }}>
                                  Rev: <b>{fmtPct(h.revshare_percentual)}</b>
                                </span>
                                <span className="tabular-nums" style={{ color: '#F43F5E' }}>
                                  IR: <b>{fmtPct(h.aliquota_imposto)}</b>
                                </span>
                                {h.ativo && (
                                  <span
                                    className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                    style={{ color: '#22D3A5', background: 'rgba(34,211,165,0.12)' }}
                                  >
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
                })}
              </div>
            )}
          </>
        )}
      </div>

      <NovoContratoAfiliadoDrawer
        open={drawerOpen}
        casas={casas}
        userRoles={userRoles}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
      />

      <NovaFaixaModal
        open={!!novaFaixaId}
        contratoId={novaFaixaId ?? ''}
        onClose={() => setNovaFaixaId(null)}
        onSaved={handleFaixaSaved}
      />
    </>
  )
}
