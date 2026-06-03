'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Casa { id: string; nome_exibicao: string }

interface UsuarioResult {
  id_user_role:  string
  id_usuario:    string
  nome_completo: string | null
  email:         string | null
  cpf:           string | null
}

interface Props {
  casas:     Casa[]
  onClose:   () => void
  onCreated: () => void
}

type RoleKey = 'INFLUENCER' | 'INTERMEDIARIO' | 'GERENTE'
type TipoContrato = 'CPA' | 'REVSHARE' | 'MISTO'

const ROLE_LABELS: Record<RoleKey, string> = {
  INFLUENCER:    'Influenciador',
  INTERMEDIARIO: 'Intermediário',
  GERENTE:       'Gerente',
}

const TIPOS: TipoContrato[] = ['CPA', 'REVSHARE', 'MISTO']

function tipoBadgeStyle(tipo: string, selected: boolean) {
  if (!selected) return {
    background: 'var(--color-surface-container-high)',
    color: 'var(--color-on-surface-variant)',
    border: '1px solid var(--color-outline-variant)',
  }
  switch (tipo) {
    case 'CPA':      return { background: 'rgba(34,211,165,0.15)', color: '#22D3A5', border: '1px solid rgba(34,211,165,0.4)' }
    case 'REVSHARE': return { background: 'var(--color-primary-container, rgba(2,117,243,0.12))', color: 'var(--color-primary)', border: '1px solid var(--color-outline)' }
    case 'MISTO':    return { background: 'rgba(192,132,252,0.15)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.4)' }
    default:         return {}
  }
}

const inputCls = 'w-full rounded-xl px-3 py-2 text-sm bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] focus:outline-none focus:border-[var(--color-primary)] transition-colors'
const labelCls = 'text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]'

export default function NovoContratoDrawerContent({ casas, onClose, onCreated }: Props) {
  // ── Role + usuário ──────────────────────────────────────────────
  const [role, setRole]                     = useState<RoleKey | null>(null)
  const [search, setSearch]                 = useState('')
  const [usuarios, setUsuarios]             = useState<UsuarioResult[]>([])
  const [loadingUsers, setLoadingUsers]     = useState(false)
  const [selectedUser, setSelectedUser]     = useState<UsuarioResult | null>(null)

  // ── AFP ─────────────────────────────────────────────────────────
  const [definirAfp, setDefinirAfp]         = useState(false)
  const [afp, setAfp]                       = useState('')
  const [afpStatus, setAfpStatus]           = useState<'idle' | 'loading' | 'ok' | 'taken'>('idle')

  // ── Contrato ────────────────────────────────────────────────────
  const [idCasa, setIdCasa]                 = useState('')
  const [tipo, setTipo]                     = useState<TipoContrato>('CPA')

  // ── Histórico ───────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const [dataInicio, setDataInicio]         = useState(today)
  const [dataFimIndefinido, setDataFimIndefinido] = useState(true)
  const [dataFim, setDataFim]               = useState('')
  const [cpaBruto, setCpaBruto]             = useState('')
  const [aliquota, setAliquota]             = useState('14.5')
  const [revsharePerc, setRevsharePerc]     = useState('')
  const [revshareRep, setRevshareRep]       = useState('')

  // ── Submit ──────────────────────────────────────────────────────
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  const searchTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const afpCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)



  // ── Busca usuários por role ──────────────────────────────────────
  useEffect(() => {
    if (!role) { setUsuarios([]); return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setLoadingUsers(true)
      try {
        const url = `/api/admin/contratos/usuarios?role=${role}&search=${encodeURIComponent(search)}`
        const res  = await fetch(url)
        const json = await res.json()
        setUsuarios(res.ok ? json.usuarios : [])
      } finally {
        setLoadingUsers(false)
      }
    }, 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [role, search])

  // ── Valida AFP ──────────────────────────────────────────────────
  useEffect(() => {
    if (!definirAfp || !afp || !/^[A-Z0-9]{8}$/.test(afp)) { 
      setAfpStatus('idle'); 
      return 
    }
    setAfpStatus('loading')
    if (afpCheckTimer.current) clearTimeout(afpCheckTimer.current)
    afpCheckTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/admin/contratos/check-afp?afp=${encodeURIComponent(afp)}`)
        const json = await res.json()
        setAfpStatus(json.exists ? 'taken' : 'ok')
      } catch {
        setAfpStatus('idle')
      }
    }, 400)
    return () => { if (afpCheckTimer.current) clearTimeout(afpCheckTimer.current) }
  }, [afp])

  // ── Submit ──────────────────────────────────────────────────────
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser || !idCasa || (afp && afpStatus !== 'ok')) return
    setSaving(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_user_role:        selectedUser.id_user_role,
          id_casa:             idCasa,
          afp:                 (definirAfp && afp) ? afp : null,
          tipo_contrato:       tipo,
          data_inicio:         dataInicio,
          data_fim:            dataFimIndefinido ? null : (dataFim || null),
          cpa_bruto:           cpaBruto    !== '' ? cpaBruto    : null,
          aliquota_imposto:    aliquota    !== '' ? aliquota    : null,
          revshare_percentual: revsharePerc !== '' ? revsharePerc : null,
          revshare_repasse:    revshareRep !== '' ? revshareRep  : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro ao criar contrato'); return }
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSaving(false)
    }
  }

  const isValidAfp = definirAfp ? (afp && /^[A-Z0-9]{8}$/.test(afp) && afpStatus === 'ok') : true
  const canSubmit = !!selectedUser && !!idCasa && isValidAfp && !!dataInicio && !saving

  return (
    <form onSubmit={submit} className="flex flex-col h-full">
      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-7">

        {error && (
          <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Seção 1: Usuário ── */}
        <section className="flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">person</span>
            Usuário
          </h3>

          {/* Role toggle */}
          <div className="flex gap-2">
            {(Object.keys(ROLE_LABELS) as RoleKey[]).map(r => (
              <button
                key={r} type="button"
                onClick={() => { setRole(r); setSelectedUser(null); setSearch('') }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                style={
                  role === r
                    ? { background: 'var(--color-primary)', color: 'var(--color-on-primary)' }
                    : { background: 'var(--color-surface-container)', color: 'var(--color-on-surface-variant)', border: '1px solid var(--color-outline-variant)' }
                }
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>

          {role && !selectedUser && (
            <>
              <input
                type="text"
                className={inputCls}
                placeholder="Buscar por nome, e-mail ou CPF…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto rounded-xl border border-[var(--color-outline-variant)]">
                {loadingUsers && (
                  <p className="px-3 py-2 text-xs text-[var(--color-on-surface-variant)] opacity-60">Buscando…</p>
                )}
                {!loadingUsers && usuarios.length === 0 && (
                  <p className="px-3 py-2 text-xs text-[var(--color-on-surface-variant)] opacity-60">Nenhum usuário encontrado</p>
                )}
                {usuarios.map(u => (
                  <button
                    key={u.id_user_role} type="button"
                    onClick={() => setSelectedUser(u)}
                    className="flex flex-col px-3 py-2.5 text-left hover:bg-[var(--color-surface-container-highest)] transition-colors"
                  >
                    <span className="text-sm font-medium text-[var(--color-on-surface)]">
                      {u.nome_completo ?? u.email ?? u.id_usuario.slice(0, 8)}
                    </span>
                    <span className="text-xs text-[var(--color-on-surface-variant)] opacity-70">
                      {[u.email, u.cpf].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {selectedUser && (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-[var(--color-on-surface)] truncate">
                  {selectedUser.nome_completo ?? selectedUser.email}
                </span>
                <span className="text-xs text-[var(--color-on-surface-variant)] opacity-70">
                  {ROLE_LABELS[role!]} · {selectedUser.email}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="ml-3 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-container-highest)] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M1 1l10 10M11 1L1 11" />
                </svg>
              </button>
            </div>
          )}
        </section>

        <hr className="border-[var(--color-outline-variant)]" />

        {/* ── Seção 2: Contrato ── */}
        <section className="flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">contract</span>
            Contrato
          </h3>

          {/* Casa */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Casa de Aposta <span className="text-red-400">*</span></label>
            <select
              className={inputCls + ' cursor-pointer colorScheme-dark'}
              style={{ colorScheme: 'dark' }}
              value={idCasa}
              onChange={e => setIdCasa(e.target.value)}
              required
            >
              <option value="">Selecionar casa…</option>
              {casas.map(c => <option key={c.id} value={c.id}>{c.nome_exibicao}</option>)}
            </select>
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Tipo de Contrato <span className="text-red-400">*</span></label>
            <div className="flex gap-2">
              {TIPOS.map(t => (
                <button
                  key={t} type="button"
                  onClick={() => setTipo(t)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={tipoBadgeStyle(t, tipo === t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* AFP */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={definirAfp}
                onChange={e => {
                  setDefinirAfp(e.target.checked)
                  if (!e.target.checked) {
                    setAfp('')
                    setAfpStatus('idle')
                  }
                }}
                className="rounded"
              />
              Definir AFP desse contrato
            </label>

            {definirAfp && (
              <>
                <input
                  type="text"
                  className={inputCls}
                  value={afp}
                  onChange={e => setAfp(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                  maxLength={8}
                  placeholder="Ex: XXXX1234"
                />

                {/* AFP status */}
                {afpStatus === 'loading' && (
                  <p className="text-xs text-[var(--color-on-surface-variant)] opacity-60">Verificando disponibilidade…</p>
                )}
                {afpStatus === 'ok' && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    AFP disponível
                  </p>
                )}
                {afpStatus === 'taken' && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                    AFP já existe na plataforma
                  </p>
                )}
                {afp.length > 0 && afp.length < 8 && (
                  <p className="text-xs text-amber-400 flex items-center gap-1">
                    O código AFP deve ter exatamente 8 caracteres.
                  </p>
                )}
              </>
            )}
          </div>

        </section>

        <hr className="border-[var(--color-outline-variant)]" />

        {/* ── Seção 3: Histórico ── */}
        <section className="flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">history</span>
            Condições Financeiras
          </h3>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Data de Início <span className="text-red-400">*</span></label>
              <input
                type="date"
                className={inputCls}
                style={{ colorScheme: 'dark' }}
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Data de Fim</label>
              {dataFimIndefinido ? (
                <div
                  className="flex items-center h-9 px-3 rounded-xl text-xs text-[var(--color-on-surface-variant)] opacity-60 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]"
                >
                  Indefinido
                </div>
              ) : (
                <input
                  type="date"
                  className={inputCls}
                  style={{ colorScheme: 'dark' }}
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                  min={dataInicio}
                />
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)] cursor-pointer select-none -mt-1">
            <input
              type="checkbox"
              checked={dataFimIndefinido}
              onChange={e => setDataFimIndefinido(e.target.checked)}
              className="rounded"
            />
            Contrato sem data de fim definida
          </label>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>CPA Bruto (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                placeholder="0.00"
                value={cpaBruto}
                onChange={e => setCpaBruto(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Alíquota Imposto (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className={inputCls}
                placeholder="14.5"
                value={aliquota}
                onChange={e => setAliquota(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>RevShare (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className={inputCls}
                placeholder="0.00"
                value={revsharePerc}
                onChange={e => setRevsharePerc(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>RevShare Repasse (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className={inputCls}
                placeholder="0.00"
                value={revshareRep}
                onChange={e => setRevshareRep(e.target.value)}
              />
            </div>
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-highest)] transition-colors"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--color-primary)' }}
        >
          {saving
            ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Criando…</>
            : <><span className="material-symbols-outlined text-[16px]">add_task</span> Criar Contrato</>
          }
        </button>
      </div>
    </form>
  )
}
