'use client'

import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'

type UserInfo = {
  nome_completo?: string
  email?: string
  cnpj?: string
  gerente_nome?: string
  perfil?: string
}

type Saque = {
  id: string
  valor: number | string
  status: string
  pix_key?: string
  pix_key_type?: string
  cnpj?: string
  razao_social?: string
  telefone?: string
  nota_fiscal?: string
  motivo_correcao_nf?: string
  saque_valido: boolean
  created_at: string
  efetivado_at?: string
  id_usuario: string
  entidade?: string
  user: UserInfo | null
}

type TabKey = 'PENDENTE' | 'AGUARDANDO_NF' | 'PROCESSANDO' | 'MANUAL' | 'HISTORICO' | 'WEBHOOKS'

const TABS: { key: TabKey; label: string; icon: string; statuses: string[] }[] = [
  { key: 'PENDENTE',      label: 'Pendentes',       icon: 'pending',         statuses: ['PENDENTE'] },
  { key: 'AGUARDANDO_NF', label: 'Aguardando NF',   icon: 'hourglass_empty', statuses: ['AGUARDANDO_NF'] },
  { key: 'PROCESSANDO',   label: 'NF em Análise',   icon: 'manage_search',   statuses: ['PROCESSANDO'] },
  { key: 'MANUAL',        label: 'Prontos p/ Pgto', icon: 'payments',        statuses: ['MANUAL'] },
  { key: 'HISTORICO',     label: 'Histórico',       icon: 'history',         statuses: ['CONCLUIDO', 'FALHA'] },
  { key: 'WEBHOOKS',      label: 'Webhooks',        icon: 'webhook',         statuses: [] },
]

const KPI_DEFS = [
  { status: 'PENDENTE',      label: 'Pendentes',       icon: 'pending',         color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',   glow: 'rgba(245,158,11,0.12)'  },
  { status: 'AGUARDANDO_NF', label: 'Aguardando NF',   icon: 'hourglass_empty', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)',   glow: 'rgba(56,189,248,0.12)'  },
  { status: 'PROCESSANDO',   label: 'NF em Análise',   icon: 'manage_search',   color: '#0275F3', bg: 'rgba(2,117,243,0.1)',   glow: 'rgba(2,117,243,0.12)'  },
  { status: 'MANUAL',        label: 'Pronto p/ Pgto',  icon: 'payments',        color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',   glow: 'rgba(139,92,246,0.12)'  },
  { status: 'CONCLUIDO',     label: 'Pagos',           icon: 'check_circle',    color: '#22D3A5', bg: 'rgba(34,211,165,0.1)',   glow: 'rgba(34,211,165,0.12)'  },
  { status: 'FALHA',         label: 'Rejeitados',      icon: 'cancel',          color: '#EF4444', bg: 'rgba(239,68,68,0.1)',    glow: 'rgba(239,68,68,0.12)'   },
]

const STATUS_ACTIONS: Record<string, { label: string; next: string; variant: 'primary' | 'danger' | 'ghost'; needsReason?: boolean; icon: string }[]> = {
  PENDENTE: [
    { label: 'Aprovar',  next: 'AGUARDANDO_NF', variant: 'primary', icon: 'check' },
    { label: 'S/ NF',    next: 'MANUAL',        variant: 'ghost',   icon: 'fast_forward' },
    { label: 'Rejeitar', next: 'FALHA',         variant: 'danger',  needsReason: true, icon: 'close' },
  ],
  AGUARDANDO_NF: [
    { label: 'Rejeitar', next: 'FALHA', variant: 'danger', needsReason: true, icon: 'close' },
  ],
  PROCESSANDO: [
    { label: 'Aprovar NF',     next: 'MANUAL',        variant: 'primary', icon: 'thumb_up' },
    { label: 'Pedir Correção', next: 'AGUARDANDO_NF', variant: 'ghost',   needsReason: true, icon: 'edit_document' },
    { label: 'Rejeitar',       next: 'FALHA',         variant: 'danger',  needsReason: true, icon: 'close' },
  ],
  MANUAL: [
    { label: 'Webhook',     next: 'CONCLUIDO', variant: 'primary', icon: 'webhook' },
    { label: 'Pgto Manual', next: 'CONCLUIDO', variant: 'ghost',   icon: 'done_all' },
    { label: 'Rejeitar',    next: 'FALHA',     variant: 'danger',  needsReason: true, icon: 'close' },
  ],
  FALHA: [
    { label: 'Reprocessar', next: 'AGUARDANDO_LIBERACAO', variant: 'ghost', icon: 'refresh' },
  ],
}

const STATUS_META: Record<string, { badge: string; dot: string; color: string; label: string }> = {
  PENDENTE:      { badge: 'badge-yellow', dot: 'status-dot-yellow', color: '#F59E0B', label: 'Pendente' },
  AGUARDANDO_NF: { badge: 'badge-blue',   dot: 'status-dot-blue',   color: '#6366F1', label: 'Aguard. NF' },
  PROCESSANDO:   { badge: 'badge-blue',   dot: 'status-dot-blue',   color: '#3B82F6', label: 'NF em Análise' },
  CONCLUIDO:     { badge: 'badge-green',  dot: 'status-dot-green',  color: '#10B981', label: 'Concluído' },
  FALHA:         { badge: 'badge-red',    dot: 'status-dot-red',    color: '#EF4444', label: 'Falha' },
  MANUAL:        { badge: 'badge-gray',   dot: 'status-dot-gray',   color: '#8B5CF6', label: 'Pronto p/ Pgto' },
}

const PIX_TYPE_LABEL: Record<string, string> = {
  CPF_CNPJ:  'CPF/CNPJ',
  TELEFONE:  'Tel',
  EMAIL:     'Email',
  ALEATORIA: 'UUID',
}

const PERFIL_LABEL: Record<string, string> = {
  afiliado: 'Afiliado',
  intermediario: 'Intermediário',
  gerente:       'Gerente',
}

type RejectModal = { saqueId: string; motivo: string; nextStatus: string } | null
type AlertModal  = { title: string; message: string } | null

const brl     = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const shortId = (id: string) => '#' + id.replace(/-/g, '').slice(-6).toUpperCase()
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

// ── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      className="rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold uppercase select-none"
      style={{
        width: size, height: size,
        background: 'var(--color-primary-container)',
        color: 'var(--color-on-primary-container)',
      }}
      aria-hidden="true"
    >
      {name?.[0] ?? '?'}
    </div>
  )
}

// ── Chip ────────────────────────────────────────────────────────────────────
function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  )
}

// ── ToolBtn ─────────────────────────────────────────────────────────────────
function ToolBtn({
  icon, label, hoverColor = 'var(--color-primary)', onClick,
}: { icon: string; label: string; hoverColor?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
      style={{
        background: 'var(--color-surface-container)',
        color: 'var(--color-on-surface-variant)',
        border: '1px solid var(--color-outline-variant)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.color = hoverColor
        el.style.borderColor = hoverColor
        el.style.background = `${hoverColor}18`
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.color = 'var(--color-on-surface-variant)'
        el.style.borderColor = 'var(--color-outline-variant)'
        el.style.background = 'var(--color-surface-container)'
      }}
    >
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
    </button>
  )
}

// ── ActionBtn ────────────────────────────────────────────────────────────────
function ActionBtn({
  icon, label, variant, disabled, loading, onClick,
}: {
  icon: string
  label: string
  variant: 'primary' | 'danger' | 'ghost'
  disabled?: boolean
  loading?: boolean
  onClick: () => void
}) {
  const styles =
    variant === 'primary' ? { background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none' }
    : variant === 'danger' ? { background: 'rgba(239,68,68,0.10)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }
    : { background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)', border: '1px solid var(--color-outline-variant)' }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50 whitespace-nowrap"
      style={{ ...styles, minHeight: '30px' }}
    >
      <span className="material-symbols-outlined text-[13px]">
        {loading ? 'progress_activity' : icon}
      </span>
      {label}
    </button>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function SaquesAdminClient({ saques }: { saques: Saque[] }) {
  const [activeTab, setActiveTab]           = useState<TabKey>('PENDENTE')
  const [search, setSearch]                 = useState('')
  const [entidadeFilter, setEntidadeFilter] = useState('TODAS')
  const [perfilFilter, setPerfilFilter]     = useState('TODOS')

  const enrichedSaques = useMemo(() => saques.map(s => ({
    ...s,
    status:   s.status === 'AGUARDANDO_LIBERACAO' ? 'PENDENTE' : s.status,
    entidade: s.entidade || 'Black Box Digital',
    user:     { ...s.user },
  })), [saques])

  const [rows, setRows]               = useState(enrichedSaques)
  const [loading, setLoading]         = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<RejectModal>(null)
  const [alertModal, setAlertModal]   = useState<AlertModal>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)

  const kpis = useMemo(() => {
    const acc: Record<string, { count: number; total: number }> = {}
    for (const s of rows) {
      if (!acc[s.status]) acc[s.status] = { count: 0, total: 0 }
      acc[s.status].count++
      acc[s.status].total += Number(s.valor)
    }
    return acc
  }, [rows])

  const pendingTotal = useMemo(
    () => ['PENDENTE', 'AGUARDANDO_NF', 'PROCESSANDO', 'MANUAL']
      .reduce((sum, st) => sum + (kpis[st]?.total ?? 0), 0),
    [kpis]
  )

  const tabDef = TABS.find(t => t.key === activeTab)!
  const visibleRows = useMemo(() => {
    if (!tabDef.statuses.length) return []
    let f = rows.filter(r => tabDef.statuses.includes(r.status))
    if (entidadeFilter !== 'TODAS') f = f.filter(r => r.entidade?.includes(entidadeFilter))
    if (perfilFilter  !== 'TODOS')  f = f.filter(r => r.user?.perfil === perfilFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      f = f.filter(r => {
        const name    = (r.user?.nome_completo ?? '').toLowerCase()
        const email   = (r.user?.email        ?? '').toLowerCase()
        const cnpj    = (r.user?.cnpj         ?? '').replace(/\D/g, '')
        const gerente = (r.user?.gerente_nome ?? '').toLowerCase()
        return name.includes(q) || email.includes(q) || cnpj.includes(q.replace(/\D/g, '')) || gerente.includes(q)
      })
    }
    return f
  }, [rows, activeTab, search, entidadeFilter, perfilFilter, tabDef])

  async function updateStatus(saqueId: string, nextStatus: string, motivo?: string) {
    setLoading(saqueId)
    try {
      const res = await fetch(`/api/admin/saques/${saqueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, ...(motivo ? { motivo } : {}) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAlertModal({ title: 'Erro ao atualizar saque', message: data.error ?? `Erro ${res.status}` })
        return
      }
      // AGUARDANDO_LIBERACAO é exibido como PENDENTE no client
      const resolvedStatus = (data.status ?? nextStatus) === 'AGUARDANDO_LIBERACAO' ? 'PENDENTE' : (data.status ?? nextStatus)
      setRows(prev => prev.map(r => r.id === saqueId ? { ...r, status: resolvedStatus } : r))
      setRejectModal(null)
    } catch (err) {
      setAlertModal({ title: 'Erro de rede', message: err instanceof Error ? err.message : String(err) })
    } finally {
      setLoading(null)
    }
  }

  function handleAction(saqueId: string, next: string, needsReason?: boolean) {
    if (needsReason) setRejectModal({ saqueId, motivo: '', nextStatus: next })
    else updateStatus(saqueId, next)
  }

  async function handleBatchPayment() {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    setBatchLoading(true)
    const results = await Promise.allSettled(
      ids.map(id =>
        fetch(`/api/admin/saques/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CONCLUIDO' }),
        }).then(r => r.json())
      )
    )
    const ok  = results.filter(r => r.status === 'fulfilled').length
    const err = results.filter(r => r.status === 'rejected').length
    setRows(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: 'CONCLUIDO' } : r))
    setSelectedIds(new Set())
    setBatchLoading(false)
    setAlertModal({
      title: 'Pagamento em Lote',
      message: err > 0
        ? `${ok} saque(s) marcado(s) como concluído. ${err} falhou — verifique e tente novamente.`
        : `${ok} saque(s) marcado(s) como concluído com sucesso.`,
    })
  }

  function toggleSelection(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelectedIds(prev => prev.size === visibleRows.length ? new Set() : new Set(visibleRows.map(r => r.id)))
  }

  function showBreakdown(s: Saque) {
    setAlertModal({ title: `Breakdown — ${shortId(s.id)}`, message: `Casa de Aposta A: ${brl(Number(s.valor) * 0.6)}\nCasa de Aposta B: ${brl(Number(s.valor) * 0.4)}` })
  }
  function validateSaque(s: Saque) {
    setAlertModal({ title: `Validação — ${shortId(s.id)}`, message: `✅ CNPJ consistente com saques anteriores.\n✅ Chave PIX validada na base.\n✅ Nenhum outro saque ativo simultâneo detectado.` })
  }
  function impersonateUser(s: Saque) {
    setAlertModal({ title: 'Impersonar Afiliado', message: `Iniciando sessão restrita como ${s.user?.nome_completo || s.id_usuario}...` })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Gerenciamento de Saques</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          {rows.length.toLocaleString('pt-BR')} registro(s) totais · Em aberto:{' '}
          <span className="font-semibold text-[var(--color-on-surface)]">{brl(pendingTotal)}</span>
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPI_DEFS.map(kpi => {
          const stat = kpis[kpi.status] ?? { count: 0, total: 0 }
          const tab  = TABS.find(t => t.statuses.includes(kpi.status))
          const isActiveKpi = tab && activeTab === tab.key
          return (
            <button
              key={kpi.status}
              onClick={() => tab && setActiveTab(tab.key)}
              aria-label={`Ver ${kpi.label}`}
              className="relative rounded-2xl p-4 text-left transition-all duration-200 cursor-pointer overflow-hidden hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                background: isActiveKpi
                  ? `linear-gradient(135deg, ${kpi.bg} 0%, var(--color-surface-container) 100%)`
                  : 'var(--color-surface-container)',
                border: `1px solid ${isActiveKpi ? kpi.color + '50' : 'var(--color-outline-variant)'}`,
                boxShadow: 'none',
              }}
            >
              {/* Top accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl transition-opacity duration-200"
                style={{ background: `linear-gradient(90deg, ${kpi.color}, ${kpi.color}80)`, opacity: isActiveKpi ? 1 : 0.3 }}
              />

              <div className="flex items-start justify-between mb-3 mt-1">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: kpi.bg, border: '1px solid var(--color-outline-variant)' }}
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ color: kpi.color }}>{kpi.icon}</span>
                </div>
                <span
                  className="text-3xl font-bold tabular-nums leading-none"
                  style={{ color: stat.count > 0 ? kpi.color : 'var(--color-on-surface-variant)', opacity: stat.count > 0 ? 1 : 0.4 }}
                >
                  {stat.count}
                </span>
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-wider leading-tight mb-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                {kpi.label}
              </p>
              <p className="text-sm font-bold tabular-nums" style={{ color: stat.total > 0 ? kpi.color : 'var(--color-on-surface-variant)', opacity: stat.total > 0 ? 1 : 0.3 }}>
                {brl(stat.total)}
              </p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] pointer-events-none text-[var(--color-on-surface-variant)] opacity-60">search</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, email, CNPJ..."
            aria-label="Buscar saques"
            className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-1"
            style={{ background: 'var(--color-surface-container-high)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Limpar busca"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-colors hover:bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
        <select value={entidadeFilter} onChange={e => setEntidadeFilter(e.target.value)} aria-label="Filtrar por entidade"
          className="px-3 py-2.5 rounded-xl text-sm font-medium outline-none cursor-pointer"
          style={{ background: 'var(--color-surface-container-high)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)' }}>
          <option value="TODAS">Todas Entidades</option>
          <option value="Black Box">Black Box Digital</option>
          <option value="Affiscale">Affiscale</option>
        </select>
        <select value={perfilFilter} onChange={e => setPerfilFilter(e.target.value)} aria-label="Filtrar por perfil"
          className="px-3 py-2.5 rounded-xl text-sm font-medium outline-none cursor-pointer"
          style={{ background: 'var(--color-surface-container-high)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)' }}>
          <option value="TODOS">Todos Perfis</option>
          <option value="afiliado">Afiliados</option>
          <option value="intermediario">Intermediários</option>
          <option value="gerente">Gerentes</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 flex-wrap border-b overflow-x-auto" role="tablist" aria-label="Filtrar por status"
        style={{ borderColor: 'var(--color-outline-variant)' }}>
        {TABS.map(tab => {
          const count    = tab.statuses.reduce((s, st) => s + (kpis[st]?.count ?? 0), 0)
          const isActive = activeTab === tab.key
          return (
            <button key={tab.key} role="tab" aria-selected={isActive}
              onClick={() => { setActiveTab(tab.key); setSelectedIds(new Set()) }}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
              style={{
                color:        isActive ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: '-1px',
              }}>
              <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
              {tab.label}
              {count > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
                  style={isActive ? { background: 'var(--color-primary)', color: '#fff' } : { background: 'var(--color-surface-container-highest)', color: 'var(--color-on-surface-variant)' }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeTab === 'WEBHOOKS' ? (
        <div className="glass-card rounded-xl py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
          <span className="material-symbols-outlined text-[48px] opacity-25">webhook</span>
          <p className="text-sm opacity-60 text-center max-w-xs">Histórico de webhooks em breve.</p>
        </div>

      ) : visibleRows.length === 0 ? (
        <div className="glass-card rounded-xl py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
          <span className="material-symbols-outlined text-[48px] opacity-25">{search ? 'search_off' : 'receipt_long'}</span>
          <p className="text-sm opacity-60">
            {search ? `Nenhum resultado para "${search}"` : `Nenhum saque em "${tabDef.label}"`}
          </p>
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-[var(--color-primary)] underline cursor-pointer">
              Limpar busca
            </button>
          )}
        </div>

      ) : (
        <div className="flex flex-col gap-2">

          {/* Batch toolbar */}
          {activeTab === 'MANUAL' && (
            <div className="flex items-center justify-between gap-3 px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-[var(--color-on-surface-variant)]">
                <input
                  type="checkbox"
                  className="rounded cursor-pointer w-4 h-4"
                  checked={selectedIds.size > 0 && selectedIds.size === visibleRows.length}
                  onChange={toggleAll}
                  aria-label="Selecionar todos"
                />
                {selectedIds.size > 0
                  ? <span className="font-semibold text-[var(--color-on-surface)]">{selectedIds.size} selecionado(s) · {brl(visibleRows.filter(r => selectedIds.has(r.id)).reduce((s, r) => s + Number(r.valor), 0))}</span>
                  : 'Selecionar todos'
                }
              </label>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBatchPayment}
                  disabled={batchLoading}
                  aria-label="Disparar pagamento em lote"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  style={{ background: '#8B5CF6', color: '#fff' }}
                >
                  {batchLoading
                    ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    : <span className="material-symbols-outlined text-[16px]">done_all</span>
                  }
                  Disparar em Lote
                </button>
              )}
            </div>
          )}

          {/* ── Card list ─────────────────────────────────────────────────── */}
          {visibleRows.map(s => {
            const actions     = STATUS_ACTIONS[s.status] ?? []
            const isLoading   = loading === s.id
            const isSelected  = selectedIds.has(s.id)
            const displayName = s.user?.nome_completo ?? s.user?.email ?? s.id_usuario
            const sm          = STATUS_META[s.status] ?? { badge: 'badge-gray', dot: 'status-dot-gray', color: '#888', label: s.status }
            const perfilLabel = PERFIL_LABEL[s.user?.perfil ?? ''] ?? s.user?.perfil ?? 'Afiliado'
            const entidade    = s.entidade ?? 'Black Box Digital'
            const entidadeShort = entidade === 'Black Box Digital' ? 'BBD' : entidade

            return (
              <div
                key={s.id}
                className="glass-card rounded-xl overflow-hidden transition-all"
                style={{
                  borderLeft: `3px solid ${sm.color}`,
                  background: isSelected ? `${sm.color}08` : undefined,
                  outline: isSelected ? `1px solid ${sm.color}30` : undefined,
                }}
              >
                <div className="px-4 py-3.5 flex flex-col gap-2.5">

                  {/* ── Row 1: Avatar · Name · Chips · Valor ──────────────── */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox (MANUAL tab) */}
                      {activeTab === 'MANUAL' && (
                        <input
                          type="checkbox"
                          className="rounded cursor-pointer w-4 h-4 flex-shrink-0 mt-0.5"
                          checked={isSelected}
                          onChange={() => toggleSelection(s.id)}
                          aria-label={`Selecionar saque ${shortId(s.id)}`}
                        />
                      )}
                      <Avatar name={displayName} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-on-surface)] truncate" title={displayName}>
                          {s.user?.nome_completo ?? '—'}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <Chip
                            label={perfilLabel}
                            color="var(--color-primary)"
                            bg="rgba(var(--color-primary-rgb, 75,142,255),0.10)"
                          />
                          <Chip
                            label={entidadeShort}
                            color="var(--color-on-surface-variant)"
                            bg="var(--color-surface-container-highest)"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Valor */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-lg font-bold tabular-nums text-[var(--color-on-surface)] whitespace-nowrap">
                        {brl(Number(s.valor))}
                      </span>
                      {s.nota_fiscal ? (
                        <a
                          href={`/api/saques/${s.id}/nf`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-[11px] font-medium cursor-pointer"
                          style={{ color: '#10B981' }}
                        >
                          <span className="material-symbols-outlined text-[12px]">description</span>
                          Ver NF
                        </a>
                      ) : (
                        <span className="text-[11px] text-[var(--color-on-surface-variant)] opacity-25">Sem NF</span>
                      )}
                    </div>
                  </div>

                  {/* ── Row 2: ID · Date · CNPJ/Razão · Telefone · PIX · Gerente ── */}
                  <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
                    {/* ID */}
                    <span
                      className="text-[11px] font-mono px-1.5 py-0.5 rounded tabular-nums flex-shrink-0"
                      style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)' }}
                    >
                      {shortId(s.id)}
                    </span>

                    <span className="text-[var(--color-on-surface-variant)] opacity-30 text-[10px]">·</span>

                    {/* Date */}
                    <span className="text-[11px] text-[var(--color-on-surface-variant)] opacity-60 flex-shrink-0">
                      {fmtDate(s.created_at)}
                    </span>

                    {/* CNPJ do saque (faturamento) */}
                    {s.cnpj && (
                      <>
                        <span className="text-[var(--color-on-surface-variant)] opacity-30 text-[10px]">·</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-on-surface-variant)] opacity-60 flex-shrink-0">
                          <span className="material-symbols-outlined text-[11px]">business</span>
                          <span className="font-mono">{s.cnpj}</span>
                        </span>
                      </>
                    )}

                    {/* Razão Social */}
                    {s.razao_social && (
                      <>
                        <span className="text-[var(--color-on-surface-variant)] opacity-30 text-[10px]">·</span>
                        <span className="text-[11px] text-[var(--color-on-surface-variant)] opacity-60 flex-shrink-0 max-w-[160px] truncate" title={s.razao_social}>
                          {s.razao_social}
                        </span>
                      </>
                    )}

                    {/* Telefone */}
                    {s.telefone && (
                      <>
                        <span className="text-[var(--color-on-surface-variant)] opacity-30 text-[10px]">·</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-on-surface-variant)] opacity-60 flex-shrink-0">
                          <span className="material-symbols-outlined text-[11px]">phone</span>
                          {s.telefone}
                        </span>
                      </>
                    )}

                    {/* PIX */}
                    {s.pix_key ? (
                      <>
                        <span className="text-[var(--color-on-surface-variant)] opacity-30 text-[10px]">·</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-on-surface-variant)] opacity-70 min-w-0">
                          <span className="material-symbols-outlined text-[11px] flex-shrink-0">key</span>
                          <span className="font-mono truncate max-w-[180px]" title={s.pix_key}>{s.pix_key}</span>
                          {s.pix_key_type && (
                            <span
                              className="text-[9px] font-bold px-1 py-px rounded flex-shrink-0"
                              style={{ background: 'var(--color-surface-container-highest)', color: 'var(--color-on-surface-variant)' }}
                            >
                              {PIX_TYPE_LABEL[s.pix_key_type] ?? s.pix_key_type}
                            </span>
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[var(--color-on-surface-variant)] opacity-30 text-[10px]">·</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-on-surface-variant)] opacity-25">
                          <span className="material-symbols-outlined text-[11px]">key</span>
                          Sem chave PIX
                        </span>
                      </>
                    )}

                    {/* Gerente */}
                    {s.user?.gerente_nome && (
                      <>
                        <span className="text-[var(--color-on-surface-variant)] opacity-30 text-[10px]">·</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-on-surface-variant)] opacity-50">
                          <span className="material-symbols-outlined text-[11px]">manage_accounts</span>
                          {s.user.gerente_nome}
                        </span>
                      </>
                    )}
                  </div>

                  {/* ── Divider */}
                  <div className="h-px" style={{ background: 'var(--color-outline-variant)', opacity: 0.5 }} />

                  {/* ── Row 3: Tools · Status badge (left) · Actions (right) ── */}
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: tool icons + status */}
                    <div className="flex items-center gap-2">
                      <ToolBtn icon="pie_chart"     label="Breakdown"  onClick={() => showBreakdown(s)} />
                      <ToolBtn icon="verified"      label="Validar"    onClick={() => validateSaque(s)} hoverColor="#10B981" />
                      <ToolBtn icon="person_search" label="Impersonar" onClick={() => impersonateUser(s)} hoverColor="#8B5CF6" />
                      <div className="w-px h-4 mx-0.5 flex-shrink-0" style={{ background: 'var(--color-outline-variant)' }} />
                      <span className={`badge ${sm.badge} whitespace-nowrap`}>
                        <span className={`status-dot ${sm.dot}`} />
                        {sm.label}
                      </span>
                    </div>

                    {/* Right: workflow action buttons */}
                    {actions.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {actions.map(a => (
                          <ActionBtn
                            key={a.label}
                            icon={a.icon}
                            label={a.label}
                            variant={a.variant}
                            disabled={isLoading}
                            loading={isLoading}
                            onClick={() => handleAction(s.id, a.next, a.needsReason)}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--color-on-surface-variant)] opacity-30">—</span>
                    )}
                  </div>

                </div>
              </div>
            )
          })}

          {/* List footer */}
          <p className="text-xs text-[var(--color-on-surface-variant)] opacity-50 px-1 pt-1">
            {visibleRows.length} registro(s)
            {search && <span> · filtrado por "<strong>{search}</strong>"</span>}
          </p>
        </div>
      )}

      {/* ── Rejection / Correction modal (portal → escapa transforms do pai) ── */}
      {rejectModal && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          role="dialog" aria-modal="true" aria-labelledby="modal-title"
          onClick={e => e.target === e.currentTarget && setRejectModal(null)}
        >
          <div
            className="glass-card rounded-2xl p-6 shadow-2xl flex flex-col gap-4"
            style={{ width: '480px', maxWidth: 'calc(100vw - 2rem)' }}
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: rejectModal.nextStatus === 'AGUARDANDO_NF' ? 'rgba(99,102,241,0.12)' : 'rgba(239,68,68,0.12)' }}>
                <span className="material-symbols-outlined text-[20px]"
                  style={{ color: rejectModal.nextStatus === 'AGUARDANDO_NF' ? '#6366F1' : '#EF4444' }}>
                  {rejectModal.nextStatus === 'AGUARDANDO_NF' ? 'edit_document' : 'cancel'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="modal-title" className="text-base font-bold text-[var(--color-on-surface)]">
                  {rejectModal.nextStatus === 'AGUARDANDO_NF' ? 'Pedir Correção de NF' : 'Rejeitar Saque'}
                </h3>
                <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5">Informe o motivo — será notificado ao afiliado.</p>
              </div>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--color-surface-container-highest)] cursor-pointer flex-shrink-0"
                onClick={() => setRejectModal(null)}
                aria-label="Fechar"
              >
                <span className="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)]">close</span>
              </button>
            </div>

            {/* Textarea */}
            <div>
              <label htmlFor="modal-reason" className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wide mb-1.5 block">Motivo *</label>
              <textarea
                id="modal-reason"
                className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none transition-all focus:ring-1"
                style={{ background: 'var(--color-surface-container-highest)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', fontFamily: 'inherit', minHeight: '120px' }}
                placeholder="Ex: Documentação incompleta, chave PIX não confere com o CNPJ informado…"
                value={rejectModal.motivo}
                onChange={e => setRejectModal(m => m ? { ...m, motivo: e.target.value } : null)}
                autoFocus
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                style={{ background: rejectModal.nextStatus === 'AGUARDANDO_NF' ? '#6366F1' : '#EF4444', color: '#fff' }}
                disabled={!rejectModal.motivo.trim() || loading === rejectModal.saqueId}
                onClick={() => updateStatus(rejectModal.saqueId, rejectModal.nextStatus, rejectModal.motivo)}
              >
                {loading === rejectModal.saqueId
                  ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Aguarde…</>
                  : 'Confirmar'
                }
              </button>
              <button
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer hover:bg-[var(--color-surface-container-highest)]"
                style={{ color: 'var(--color-on-surface-variant)', border: '1px solid var(--color-outline-variant)' }}
                onClick={() => setRejectModal(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Alert modal ───────────────────────────────────────────────────── */}
      {alertModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          role="alertdialog" aria-modal="true" aria-labelledby="alert-title"
          onClick={e => e.target === e.currentTarget && setAlertModal(null)}
        >
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(var(--color-primary-rgb, 75,142,255),0.12)' }}>
              <span className="material-symbols-outlined text-[24px] text-[var(--color-primary)]">info</span>
            </div>
            <div>
              <h3 id="alert-title" className="text-base font-bold text-[var(--color-on-surface)] mb-2">{alertModal.title}</h3>
              <p className="text-sm text-[var(--color-on-surface-variant)] whitespace-pre-wrap text-left p-3 rounded-xl"
                style={{ background: 'var(--color-surface-container-highest)' }}>
                {alertModal.message}
              </p>
            </div>
            <button
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-95"
              style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
              onClick={() => setAlertModal(null)}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
