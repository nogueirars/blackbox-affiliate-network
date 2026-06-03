'use client'

import { useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { StatCard } from '@/components/ui/StatCard'

type Periodo = 'mes_atual' | 'acumulado' | 'por_periodo'

interface Influencer {
  id: string
  nome: string
  email: string
  tipo: string | null
  producaoTotal: number
  comissaoLiberada: number
  comissaoPaga: number
  saldo: number
}

interface Casa { id: string; nome_exibicao: string }

interface Props {
  periodo: Periodo
  fromStr: string
  toStr: string
  countInfluencer: number
  countIntermediario: number
  countGerente: number
  cadastros: number
  ftds: number
  cpas: number
  ngr: number
  receitaBruta: number
  receitaCpa: number
  receitaRev: number
  receitaAtivos: number
  receitaInativos: number
  totalPendente: number
  totalPago: number
  influencers: Influencer[]
  casas: Casa[]
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtPct = (v: number) =>
  isNaN(v) || !isFinite(v) ? '0%' : `${v.toFixed(1)}%`

const TIPO_LABEL: Record<string, string> = {
  CPA: 'CPA',
  REVSHARE: 'RevShare',
  MISTO: 'Misto',
}

export default function FinanceiroVisaoGeralClient(props: Props) {
  const {
    periodo, fromStr, toStr,
    countInfluencer, countIntermediario, countGerente,
    cadastros, ftds, cpas, ngr,
    receitaBruta, receitaCpa, receitaRev, receitaAtivos, receitaInativos,
    totalPendente, totalPago,
    influencers, casas,
  } = props

  const router  = useRouter()
  const pathname = usePathname()
  const [customFrom, setCustomFrom] = useState(fromStr)
  const [customTo, setCustomTo]     = useState(toStr)
  const [search, setSearch] = useState('')

  const [casaFiltro,    setCasaFiltro]    = useState('')
  const [perfilFiltro,  setPerfilFiltro]  = useState('')
  const [baseData,      setBaseData]      = useState('producao')
  const [porCasaDe,     setPorCasaDe]     = useState('')
  const [porCasaAte,    setPorCasaAte]    = useState('')
  const [porCasaRows,   setPorCasaRows]   = useState<null | unknown[]>(null)
  const [loadingCasa,   setLoadingCasa]   = useState(false)

  function navigate(p: Periodo, from?: string, to?: string) {
    const qs = new URLSearchParams({ periodo: p })
    if (from) qs.set('from', from)
    if (to)   qs.set('to', to)
    router.push(`${pathname}?${qs}`)
  }

  const impostos      = receitaBruta * 0.145
  const comissoesPagas = totalPago
  const resultadoBruto = receitaBruta - impostos - comissoesPagas
  const margemBruta   = receitaBruta > 0 ? ((receitaBruta - comissoesPagas) / receitaBruta * 100) : 0
  const margemLiquida = receitaBruta > 0 ? (resultadoBruto / receitaBruta * 100) : 0

  const filteredInfluencers = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return influencers
    return influencers.filter(u =>
      u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [search, influencers])

  async function handleFiltrarPorCasa() {
    setLoadingCasa(true)
    try {
      const qs = new URLSearchParams()
      if (casaFiltro)   qs.set('casa_id', casaFiltro)
      if (perfilFiltro) qs.set('perfil', perfilFiltro)
      if (porCasaDe)    qs.set('from', porCasaDe)
      if (porCasaAte)   qs.set('to', porCasaAte)
      const res = await fetch(`/api/admin/financeiro/por-casa?${qs}`)
      const data = await res.json()
      setPorCasaRows(data.rows ?? [])
    } catch {
      setPorCasaRows([])
    } finally {
      setLoadingCasa(false)
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: active ? 'var(--color-primary)' : 'transparent',
    color: active ? '#fff' : 'var(--color-on-surface-variant)',
    transition: 'all 0.15s',
  })

  return (
    <div className="animate-fade-in flex flex-col gap-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display-lg text-[var(--color-on-surface)]">Financeiro BLACKBOX</h1>
          <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
            Visão completa do resultado financeiro e gestão de pagamentos
          </p>
        </div>
        <div
          className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: 'var(--color-surface-container-high)', border: '1px solid var(--color-outline-variant)' }}
        >
          <button style={tabStyle(periodo === 'mes_atual')}  onClick={() => navigate('mes_atual')}>Mês Atual</button>
          <button style={tabStyle(periodo === 'acumulado')}  onClick={() => navigate('acumulado')}>Acumulado</button>
          <button style={tabStyle(periodo === 'por_periodo')} onClick={() => navigate('por_periodo', customFrom, customTo)}>Por Período</button>
        </div>
      </div>

      {periodo === 'por_periodo' && (
        <div className="flex items-center gap-3 flex-wrap glass-card rounded-xl p-4">
          <span className="text-sm text-[var(--color-on-surface-variant)]">De</span>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            className="bg-transparent border border-[var(--color-outline-variant)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-on-surface)] outline-none" />
          <span className="text-sm text-[var(--color-on-surface-variant)]">Até</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            className="bg-transparent border border-[var(--color-outline-variant)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-on-surface)] outline-none" />
          <button
            onClick={() => navigate('por_periodo', customFrom, customTo)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            Filtrar
          </button>
        </div>
      )}

      {/* ── Rede de Afiliados ─────────────────────────────────────────── */}
      <Section icon="👥" title="Rede de Afiliados">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Afiliados Diretos" value={countInfluencer.toLocaleString('pt-BR')}   icon="person" accent="#0275F3" />
          <StatCard label="Sub-Afiliados"     value={countIntermediario.toLocaleString('pt-BR')} icon="group"  accent="#8B5CF6" />
          <StatCard label="Gerentes"                value={countGerente.toLocaleString('pt-BR')}      icon="manage_accounts" accent="#8B5CF6"
            extra={
              <Link href="/admin/financeiro/gerentes" className="text-xs font-semibold mt-1" style={{ color: 'var(--color-primary)' }}>
                Ver Pagamentos Gerentes →
              </Link>
            }
          />
        </div>
      </Section>

      {/* ── Produção da Rede ────────────────────────────────────────────────── */}
      <Section icon="🎯" title="Produção da Rede">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Cadastros" value={cadastros.toLocaleString('pt-BR')} icon="person_add"  accent="#0275F3" />
          <StatCard label="Total FTDs"      value={ftds.toLocaleString('pt-BR')}      icon="trending_up" accent="#22D3A5" />
          <StatCard label="Total CPAs"      value={cpas.toLocaleString('pt-BR')}      icon="target"      accent="#8B5CF6" />
          <StatCard label="NGR Total"       value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ngr)} icon="payments" accent="#22D3A5" />
        </div>
      </Section>

      {/* ── Resultado Financeiro ────────────────────────────────────────────── */}
      <Section icon="📋" title="Resultado Financeiro BLACKBOX">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Demonstrativo */}
          <div className="md:col-span-2 glass-card rounded-xl p-5 flex flex-col gap-0">
            <p className="text-sm font-semibold text-[var(--color-on-surface)] mb-4 flex items-center gap-2">
              <span style={{ fontSize: '16px' }}>📋</span> Demonstrativo
            </p>

            <DemoRow
              icon="⬇️" iconBg="#16a34a22" iconColor="#22c55e"
              label="Receita Bruta (Casas)"
              sub={`CPA: ${fmtBRL(receitaCpa)}   RevShare: ${fmtBRL(receitaRev)}`}
              extra={
                <span className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                  <span style={{ color: '#22c55e' }}>● Ativos: {fmtBRL(receitaAtivos)}</span>
                  {'  '}
                  <span style={{ color: '#f59e0b' }}>● Inativos: {fmtBRL(receitaInativos)}</span>
                </span>
              }
              value={fmtBRL(receitaBruta)}
              valueColor="#22c55e"
            />
            <DemoRow
              icon="📄" iconBg="#ef444422" iconColor="#ef4444"
              label="Impostos (14,5%)"
              sub="Sobre receita bruta"
              value={`- ${fmtBRL(impostos)}`}
              valueColor="#ef4444"
            />
            <DemoRow
              icon="👥" iconBg="#8b5cf622" iconColor="#8b5cf6"
              label="Comissões BLACKBOX Pagas"
              sub="Diretos + Subs + Lucro Gerentes"
              value={`- ${fmtBRL(comissoesPagas)}`}
              valueColor="#ef4444"
              last
            />
          </div>

          {/* Summary cards */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl p-5 flex flex-col gap-2" style={{ background: '#3b0764', border: '1px solid #7c3aed44' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#7c3aed33' }}>
                  <span style={{ fontSize: '20px' }}>🕐</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Saldo a Pagar (Afiliados)</p>
                  <p className="text-2xl font-bold text-white">{fmtBRL(totalPendente)}</p>
                  <p className="text-xs text-purple-300">Comissão − Já Pago</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl p-5 flex flex-col gap-2" style={{ background: '#052e16', border: '1px solid #16a34a44' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#16a34a33' }}>
                  <span style={{ fontSize: '20px' }}>✅</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-400 uppercase tracking-wider">Total Já Pago</p>
                  <p className="text-2xl font-bold text-white">{fmtBRL(totalPago)}</p>
                  <p className="text-xs text-green-400">Pagamentos realizados</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--color-on-surface-variant)]">Margem Bruta</span>
                <span className="text-sm font-semibold" style={{ color: margemBruta >= 0 ? '#22c55e' : '#ef4444' }}>
                  {fmtPct(margemBruta)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--color-on-surface-variant)]">Margem Líquida</span>
                <span className="text-sm font-semibold" style={{ color: margemLiquida >= 0 ? '#22c55e' : '#ef4444' }}>
                  {fmtPct(margemLiquida)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Saldos dos Afiliados ──────────────────────────────────────── */}
      <Section icon="$" title="Saldos dos Afiliados"
        sub="Gerencie pagamentos para afiliados diretos e sub-afiliados">
        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-4"
          style={{ background: '#3b0764', border: '1px solid #7c3aed44' }}>
          <span style={{ fontSize: '16px' }}>👑</span>
          <p className="text-sm text-purple-200">
            <span className="font-semibold">Pagamentos de Gerentes:</span>{' '}
            Os gerentes são gerenciados em{' '}
            <Link href="/admin/financeiro/gerentes" style={{ color: '#a78bfa', textDecoration: 'underline' }}>
              Pagamentos Gerentes
            </Link>
            , onde o lucro líquido é calculado corretamente.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] pointer-events-none" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar afiliado por nome ou e-mail..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
          />
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--color-surface-container-low)', borderBottom: '1px solid var(--color-outline-variant)' }}>
              <tr>
                {['Afiliado', 'Tipo', 'Total Comissão Liberada', 'Total Comissão Paga', 'Saldo', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredInfluencers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--color-on-surface-variant)]">
                    {influencers.length === 0 ? 'Nenhum afiliado cadastrado' : 'Nenhum resultado'}
                  </td>
                </tr>
              ) : filteredInfluencers.map(inf => (
                <tr key={inf.id}
                  style={{ borderBottom: '1px solid var(--color-outline-variant)' }}
                  className="hover:bg-[var(--color-surface-container-high)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--color-on-surface)]">{inf.nome}</div>
                    <div className="text-xs text-[var(--color-on-surface-variant)]">{inf.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {inf.tipo ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: '#3b82f622', color: '#60a5fa' }}>
                        {TIPO_LABEL[inf.tipo] ?? inf.tipo}
                      </span>
                    ) : <span className="text-[var(--color-on-surface-variant)]">—</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--color-on-surface)]">{fmtBRL(inf.comissaoLiberada)}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: '#22c55e' }}>{fmtBRL(inf.comissaoPaga)}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: inf.saldo > 0 ? '#f59e0b' : 'var(--color-on-surface-variant)' }}>
                    {fmtBRL(inf.saldo)}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/afiliados/${inf.id}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)', border: '1px solid var(--color-outline-variant)' }}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </Section>

      {/* ── Pagamentos a Pagar por Casa ─────────────────────────────────────── */}
      <Section icon="📋" title="Pagamentos a Pagar por Casa"
        sub="Identifique quem ainda não recebeu pela produção de uma casa em determinado período. Pagamentos manuais já efetuados são deduzidos automaticamente por FIFO.">
        <div className="flex flex-wrap gap-3 mb-4">
          <FilterSelect label="Casa" value={casaFiltro} onChange={setCasaFiltro}>
            <option value="">Todas as casas</option>
            {casas.map(c => <option key={c.id} value={c.id}>{c.nome_exibicao}</option>)}
          </FilterSelect>
          <FilterSelect label="Perfil" value={perfilFiltro} onChange={setPerfilFiltro}>
            <option value="">Todos os perfis</option>
            <option value="CPA">CPA</option>
            <option value="REVSHARE">RevShare</option>
            <option value="MISTO">Misto</option>
          </FilterSelect>
          <FilterSelect label="Base de data" value={baseData} onChange={setBaseData}>
            <option value="producao">Por produção</option>
            <option value="saque">Por saque</option>
          </FilterSelect>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-on-surface-variant)]">De</span>
            <input type="date" value={porCasaDe} onChange={e => setPorCasaDe(e.target.value)}
              className="bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-lg px-3 py-2 text-sm text-[var(--color-on-surface)] outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-on-surface-variant)]">Até</span>
            <input type="date" value={porCasaAte} onChange={e => setPorCasaAte(e.target.value)}
              className="bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-lg px-3 py-2 text-sm text-[var(--color-on-surface)] outline-none" />
          </div>
          <button
            onClick={handleFiltrarPorCasa}
            disabled={loadingCasa}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-primary)', opacity: loadingCasa ? 0.6 : 1 }}
          >
            🔽 {loadingCasa ? 'Filtrando…' : 'Filtrar'}
          </button>
        </div>

        {porCasaRows === null ? (
          <div className="glass-card rounded-xl p-8 text-center text-sm text-[var(--color-on-surface-variant)]">
            Defina os filtros desejados e clique em <strong>Filtrar</strong> para listar quem ainda tem valores a receber.
          </div>
        ) : porCasaRows.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-sm text-[var(--color-on-surface-variant)]">
            Nenhum resultado encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--color-surface-container-low)', borderBottom: '1px solid var(--color-outline-variant)' }}>
                <tr>
                  {['Afiliado', 'Casa', 'Produção (R$)', 'Já Pago (R$)', 'A Receber (R$)'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(porCasaRows as PorCasaRow[]).map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-outline-variant)' }}
                    className="hover:bg-[var(--color-surface-container-high)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--color-on-surface)]">{r.nome}</div>
                      <div className="text-xs text-[var(--color-on-surface-variant)]">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-on-surface-variant)]">{r.casa}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--color-on-surface)]">{fmtBRL(r.receita)}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#22c55e' }}>{fmtBRL(r.pago)}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: r.aReceber > 0 ? '#f59e0b' : '#22c55e' }}>
                      {fmtBRL(r.aReceber)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}

interface PorCasaRow { nome: string; email: string; casa: string; receita: number; pago: number; aReceber: number }

/* ── Sub-components ───────────────────────────────────────────────────────── */

function Section({ icon, title, sub, children }: {
  icon: string; title: string; sub?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--color-on-surface)] flex items-center gap-2">
          <span>{icon}</span> {title}
        </h2>
        {sub && <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}


function DemoRow({
  icon, iconBg, iconColor, label, sub, extra, value, valueColor, last,
}: {
  icon: string; iconBg: string; iconColor: string
  label: string; sub: string; extra?: React.ReactNode
  value: string; valueColor: string; last?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-4"
      style={{ borderBottom: last ? 'none' : '1px solid var(--color-outline-variant)' }}>
      <div className="flex items-start gap-3 flex-1">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: iconBg, color: iconColor }}>
          <span style={{ fontSize: '16px' }}>{icon}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--color-on-surface)]">{label}</span>
          <span className="text-xs text-[var(--color-on-surface-variant)]">{sub}</span>
          {extra}
        </div>
      </div>
      <span className="text-base font-bold ml-4 whitespace-nowrap" style={{ color: valueColor }}>{value}</span>
    </div>
  )
}

function FilterSelect({
  label, value, onChange, children,
}: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[var(--color-on-surface-variant)]">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-lg px-3 py-2 text-sm text-[var(--color-on-surface)] outline-none"
        style={{ minWidth: '140px' }}
      >
        {children}
      </select>
    </div>
  )
}
